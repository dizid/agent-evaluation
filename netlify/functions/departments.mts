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
    const url = new URL(req.url)
    const segments = url.pathname.split('/').filter(Boolean)
    // segments: ['api', 'departments'] or ['api', 'departments', ':id']
    const deptIndex = segments.indexOf('departments')
    const id = deptIndex >= 0 && segments.length > deptIndex + 1 ? segments[deptIndex + 1] : null

    // Route: PUT /api/departments/:id — update department
    if (req.method === 'PUT' && id) {
      return handleUpdate(ctx, id, req)
    }

    // Route: DELETE /api/departments/:id — delete department
    if (req.method === 'DELETE' && id) {
      return handleDelete(ctx, id)
    }

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

// PUT /api/departments/:id — update department
async function handleUpdate(ctx: { orgId: string; userRole: string }, id: string, req: Request) {
  // Check permission (admin+)
  if (!authorize(ctx as any, 'admin')) {
    return error('Forbidden: admin role required', 403)
  }

  // Validate ID format
  if (!/^[a-f0-9-]{36}$/.test(id)) {
    return error('Invalid department ID format', 400)
  }

  // Verify department belongs to current org
  const existing = await sql`
    SELECT * FROM departments
    WHERE id = ${id} AND org_id = ${ctx.orgId}
  `
  if (existing.length === 0) {
    return error('Department not found', 404)
  }

  const body = await req.json()
  const dept = existing[0]

  // Validate field lengths
  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || body.name.length > 100) {
      return error('name must be a string of max 100 characters', 400)
    }
  }
  if (body.slug !== undefined) {
    if (typeof body.slug !== 'string' || !/^[a-z0-9-]{2,50}$/.test(body.slug)) {
      return error('slug must be 2-50 characters, lowercase letters, numbers, and hyphens only', 400)
    }
  }
  if (body.color !== undefined) {
    if (typeof body.color !== 'string') {
      return error('color must be a string', 400)
    }
  }

  // Check slug uniqueness if changing
  if (body.slug && body.slug !== dept.slug) {
    const duplicate = await sql`
      SELECT id FROM departments
      WHERE org_id = ${ctx.orgId} AND slug = ${body.slug} AND id != ${id}
    `
    if (duplicate.length > 0) {
      return error('A department with this slug already exists in your organization', 409)
    }
  }

  // Strip HTML from inputs
  const name = body.name !== undefined ? stripHtml(body.name.trim()) : dept.name
  const slug = body.slug !== undefined ? body.slug.toLowerCase().trim() : dept.slug
  const color = body.color !== undefined ? stripHtml(body.color.trim()) : dept.color

  const result = await sql`
    UPDATE departments SET
      name = ${name},
      slug = ${slug},
      color = ${color}
    WHERE id = ${id}
    RETURNING *
  `

  return json({ department: result[0] })
}

// DELETE /api/departments/:id — delete department
async function handleDelete(ctx: { orgId: string; userRole: string }, id: string) {
  // Check permission (admin+)
  if (!authorize(ctx as any, 'admin')) {
    return error('Forbidden: admin role required', 403)
  }

  // Validate ID format
  if (!/^[a-f0-9-]{36}$/.test(id)) {
    return error('Invalid department ID format', 400)
  }

  // Verify department belongs to current org
  const existing = await sql`
    SELECT id FROM departments
    WHERE id = ${id} AND org_id = ${ctx.orgId}
  `
  if (existing.length === 0) {
    return error('Department not found', 404)
  }

  // Delete (agents with this dept_id will have department_id set to NULL due to ON DELETE SET NULL)
  await sql`DELETE FROM departments WHERE id = ${id}`

  return json({ message: 'Department deleted' })
}

export const config: Config = {
  path: '/api/departments/*'
}
