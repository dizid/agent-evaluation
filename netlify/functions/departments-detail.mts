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
    const deptIndex = segments.indexOf('departments')
    const id = deptIndex >= 0 && segments.length > deptIndex + 1 ? segments[deptIndex + 1] : null

    if (!id) return error('Department ID is required', 400)

    // Validate ID format (UUID)
    if (!/^[a-f0-9-]{36}$/.test(id)) {
      return error('Invalid department ID format', 400)
    }

    if (req.method === 'PUT') {
      return handleUpdate(ctx, id, req)
    }

    if (req.method === 'DELETE') {
      return handleDelete(ctx, id)
    }

    return error('Method not allowed', 405)
  } catch (err) {
    console.error('departments-detail error:', err)
    return error('Failed to process request', 500)
  }
}

// PUT /api/departments/:id — update department
async function handleUpdate(ctx: { orgId: string; userRole: string }, id: string, req: Request) {
  if (!authorize(ctx as any, 'admin')) {
    return error('Forbidden: admin role required', 403)
  }

  const existing = await sql`
    SELECT * FROM departments
    WHERE id = ${id} AND org_id = ${ctx.orgId}
  `
  if (existing.length === 0) {
    return error('Department not found', 404)
  }

  const body = await req.json()
  const dept = existing[0]

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

  if (body.slug && body.slug !== dept.slug) {
    const duplicate = await sql`
      SELECT id FROM departments
      WHERE org_id = ${ctx.orgId} AND slug = ${body.slug} AND id != ${id}
    `
    if (duplicate.length > 0) {
      return error('A department with this slug already exists in your organization', 409)
    }
  }

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
  if (!authorize(ctx as any, 'admin')) {
    return error('Forbidden: admin role required', 403)
  }

  const existing = await sql`
    SELECT id FROM departments
    WHERE id = ${id} AND org_id = ${ctx.orgId}
  `
  if (existing.length === 0) {
    return error('Department not found', 404)
  }

  // Check for agents still assigned to this department
  const agentCount = await sql`
    SELECT COUNT(*)::int as count FROM agents
    WHERE department_id = ${id} AND org_id = ${ctx.orgId} AND status = 'active'
  `
  if (agentCount[0].count > 0) {
    return error(`Cannot delete department with ${agentCount[0].count} active agent(s). Reassign them first.`, 409)
  }

  await sql`DELETE FROM departments WHERE id = ${id}`

  return json({ message: 'Department deleted' })
}

export const config: Config = {
  path: '/api/departments/:id'
}
