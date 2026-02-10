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
    // Route: POST /api/organizations — create new organization
    if (req.method === 'POST') {
      return handleCreate(ctx, req)
    }

    // Route: GET /api/organizations — list user's orgs
    if (req.method === 'GET') {
      return handleList(ctx)
    }

    return error('Method not allowed', 405)
  } catch (err) {
    console.error('orgs error:', err)
    return error('Failed to process request', 500)
  }
}

// GET /api/organizations — list all orgs the current user is a member of
async function handleList(ctx: { userId: string }) {
  const orgs = await sql`
    SELECT o.*, om.role
    FROM organizations o
    JOIN org_members om ON om.org_id = o.id
    WHERE om.user_id = ${ctx.userId}
    ORDER BY om.joined_at ASC
  `

  return json({ organizations: orgs })
}

// POST /api/organizations — create new organization
async function handleCreate(ctx: { userId: string }, req: Request) {
  const body = await req.json()
  const { name, slug } = body

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

  // Validate slug format: lowercase alphanumeric + hyphens, 3-40 chars
  if (!/^[a-z0-9-]{3,40}$/.test(slug)) {
    return error('slug must be 3-40 characters, lowercase letters, numbers, and hyphens only', 400)
  }

  // Check if slug is unique
  const existing = await sql`
    SELECT id FROM organizations WHERE slug = ${slug}
  `
  if (existing.length > 0) {
    return error('An organization with this slug already exists', 409)
  }

  // Strip HTML from name
  const cleanName = stripHtml(name.trim())

  // Insert organization
  const orgResult = await sql`
    INSERT INTO organizations (slug, name, owner_id)
    VALUES (${slug.toLowerCase()}, ${cleanName}, ${ctx.userId})
    RETURNING *
  `

  if (orgResult.length === 0) {
    return error('Failed to create organization', 500)
  }

  const newOrg = orgResult[0]

  // Insert owner membership
  await sql`
    INSERT INTO org_members (org_id, user_id, role)
    VALUES (${newOrg.id}, ${ctx.userId}, 'owner')
  `

  // Create 3 default departments
  const departments = [
    { name: 'Development', slug: 'development', color: '#3b82f6', sort_order: 1 },
    { name: 'Marketing', slug: 'marketing', color: '#8b5cf6', sort_order: 2 },
    { name: 'Operations', slug: 'operations', color: '#10b981', sort_order: 3 }
  ]

  for (const dept of departments) {
    await sql`
      INSERT INTO departments (org_id, name, slug, color, sort_order)
      VALUES (${newOrg.id}, ${dept.name}, ${dept.slug}, ${dept.color}, ${dept.sort_order})
    `
  }

  return json({ organization: newOrg }, 201)
}

export const config: Config = {
  path: '/api/organizations'
}
