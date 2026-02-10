import type { Config } from '@netlify/functions'
import { sql } from './utils/database.ts'
import { json, error, cors } from './utils/response.ts'
import { authenticate, authorize } from './utils/auth.ts'

// Strip HTML tags from a string to prevent XSS
function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, '')
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return cors()

  const ctx = await authenticate(req)
  if (ctx instanceof Response) return ctx

  try {
    // Route: POST /api/departments — create department
    if (req.method === 'POST') {
      return handleCreate(ctx, req)
    }

    // Route: GET /api/departments — list departments
    if (req.method === 'GET') {
      return handleList(ctx)
    }

    return error('Method not allowed', 405)
  } catch (err) {
    console.error('departments error:', err)
    return error('Failed to process request', 500)
  }
}

// GET /api/departments — list departments for current org
async function handleList(ctx: { orgId: string }) {
  const departments = await sql`
    SELECT * FROM departments
    WHERE org_id = ${ctx.orgId}
    ORDER BY sort_order ASC, name ASC
  `

  return json({ departments })
}

// POST /api/departments — create department
async function handleCreate(ctx: { orgId: string; userRole: string }, req: Request) {
  // Check permission (admin+)
  if (!authorize(ctx as any, 'admin')) {
    return error('Forbidden: admin role required', 403)
  }

  const body = await req.json()
  const { name, slug, color } = body

  // Validate required fields
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return error('name is required and must be a non-empty string', 400)
  }
  if (!slug || typeof slug !== 'string' || slug.trim().length === 0) {
    return error('slug is required and must be a non-empty string', 400)
  }

  // Validate name length
  if (name.length > 100) {
    return error('name must be at most 100 characters', 400)
  }

  // Validate slug format: lowercase alphanumeric + hyphens
  if (!/^[a-z0-9-]{2,50}$/.test(slug)) {
    return error('slug must be 2-50 characters, lowercase letters, numbers, and hyphens only', 400)
  }

  // Check slug uniqueness within org
  const existing = await sql`
    SELECT id FROM departments
    WHERE org_id = ${ctx.orgId} AND slug = ${slug}
  `
  if (existing.length > 0) {
    return error('A department with this slug already exists in your organization', 409)
  }

  // Strip HTML from name
  const cleanName = stripHtml(name.trim())
  const cleanSlug = slug.toLowerCase().trim()
  const cleanColor = color && typeof color === 'string' ? stripHtml(color.trim()) : '#64748b'

  // Insert department
  const result = await sql`
    INSERT INTO departments (org_id, name, slug, color)
    VALUES (${ctx.orgId}, ${cleanName}, ${cleanSlug}, ${cleanColor})
    RETURNING *
  `

  if (result.length === 0) {
    return error('Failed to create department', 500)
  }

  return json({ department: result[0] }, 201)
}

export const config: Config = {
  path: '/api/departments'
}
