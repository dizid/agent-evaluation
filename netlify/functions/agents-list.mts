import type { Config } from '@netlify/functions'
import { sql } from './utils/database.ts'
import { json, error, cors } from './utils/response.ts'
import { authenticate, authorize } from './utils/auth.ts'

const VALID_SORTS = ['name', 'score', 'department', 'eval_count']

// POST /api/agents — Create a new agent (requires admin+)
async function handleCreate(req: Request): Promise<Response> {
  const ctx = await authenticate(req)
  if (ctx instanceof Response) return ctx
  if (!authorize(ctx, 'admin')) return error('Forbidden: admin role required', 403)

  try {
    const body = await req.json()
    const { id, name, department, role, persona, kpi_definitions, source_type, source_path, model } = body

    if (!id || !name || !role) {
      return error('id, name, and role are required', 400)
    }

    if (!/^[a-z0-9-]{2,50}$/.test(id)) {
      return error('id must be 2-50 lowercase alphanumeric characters or hyphens', 400)
    }

    // Check for duplicate within org
    const existing = await sql`SELECT id FROM agents WHERE id = ${id} AND org_id = ${ctx.orgId}`
    if (existing.length > 0) {
      return error('Agent ID already exists in your organization', 409)
    }

    // Resolve department_id if department slug provided
    let departmentId = null
    if (department) {
      const depts = await sql`SELECT id FROM departments WHERE org_id = ${ctx.orgId} AND slug = ${department}`
      if (depts.length > 0) departmentId = depts[0].id
    }

    const result = await sql`
      INSERT INTO agents (id, org_id, name, department, department_id, role, persona, kpi_definitions, source_type, source_path, model, status)
      VALUES (${id}, ${ctx.orgId}, ${name}, ${department || null}, ${departmentId}, ${role}, ${persona || null}, ${JSON.stringify(kpi_definitions || [])}, ${source_type || 'manual'}, ${source_path || null}, ${model || null}, 'active')
      RETURNING *
    `

    return json({ agent: result[0] }, 201)
  } catch (err) {
    console.error('agents-create error:', err)
    return error('Failed to create agent', 500)
  }
}

// GET /api/agents — List agents scoped to org
async function handleList(req: Request): Promise<Response> {
  const ctx = await authenticate(req)
  if (ctx instanceof Response) return ctx

  try {
    const url = new URL(req.url)
    const department = url.searchParams.get('department')
    const minScore = url.searchParams.get('min_score')
    const sort = url.searchParams.get('sort') || 'name'
    const status = url.searchParams.get('status')

    if (!VALID_SORTS.includes(sort)) {
      return error(`sort must be one of: ${VALID_SORTS.join(', ')}`, 400)
    }

    if (minScore) {
      const parsed = parseFloat(minScore)
      if (isNaN(parsed)) return error('min_score must be a valid number', 400)
    }

    const orgId = ctx.orgId
    let agents

    if (status === 'all') {
      if (department) {
        if (sort === 'score') agents = await sql`SELECT * FROM agents WHERE org_id = ${orgId} AND department = ${department} ORDER BY overall_score DESC NULLS LAST`
        else if (sort === 'eval_count') agents = await sql`SELECT * FROM agents WHERE org_id = ${orgId} AND department = ${department} ORDER BY eval_count DESC NULLS LAST`
        else agents = await sql`SELECT * FROM agents WHERE org_id = ${orgId} AND department = ${department} ORDER BY name`
      } else {
        if (sort === 'score') agents = await sql`SELECT * FROM agents WHERE org_id = ${orgId} ORDER BY overall_score DESC NULLS LAST`
        else if (sort === 'eval_count') agents = await sql`SELECT * FROM agents WHERE org_id = ${orgId} ORDER BY eval_count DESC NULLS LAST`
        else if (sort === 'department') agents = await sql`SELECT * FROM agents WHERE org_id = ${orgId} ORDER BY department, name`
        else agents = await sql`SELECT * FROM agents WHERE org_id = ${orgId} ORDER BY name`
      }
    } else if (department) {
      if (sort === 'score') agents = await sql`SELECT * FROM agents WHERE org_id = ${orgId} AND (status = 'active' OR status IS NULL) AND department = ${department} ORDER BY overall_score DESC NULLS LAST`
      else if (sort === 'eval_count') agents = await sql`SELECT * FROM agents WHERE org_id = ${orgId} AND (status = 'active' OR status IS NULL) AND department = ${department} ORDER BY eval_count DESC NULLS LAST`
      else agents = await sql`SELECT * FROM agents WHERE org_id = ${orgId} AND (status = 'active' OR status IS NULL) AND department = ${department} ORDER BY name`
    } else if (minScore) {
      if (sort === 'score') agents = await sql`SELECT * FROM agents WHERE org_id = ${orgId} AND (status = 'active' OR status IS NULL) AND overall_score >= ${parseFloat(minScore)} ORDER BY overall_score DESC NULLS LAST`
      else agents = await sql`SELECT * FROM agents WHERE org_id = ${orgId} AND (status = 'active' OR status IS NULL) AND overall_score >= ${parseFloat(minScore)} ORDER BY name`
    } else {
      if (sort === 'score') agents = await sql`SELECT * FROM agents WHERE org_id = ${orgId} AND (status = 'active' OR status IS NULL) ORDER BY overall_score DESC NULLS LAST`
      else if (sort === 'eval_count') agents = await sql`SELECT * FROM agents WHERE org_id = ${orgId} AND (status = 'active' OR status IS NULL) ORDER BY eval_count DESC NULLS LAST`
      else if (sort === 'department') agents = await sql`SELECT * FROM agents WHERE org_id = ${orgId} AND (status = 'active' OR status IS NULL) ORDER BY department, name`
      else agents = await sql`SELECT * FROM agents WHERE org_id = ${orgId} AND (status = 'active' OR status IS NULL) ORDER BY name`
    }

    return json(
      { agents, total: agents.length },
      200,
      { 'Cache-Control': 'public, max-age=60' }
    )
  } catch (err) {
    console.error('agents-list error:', err)
    return error('Failed to fetch agents', 500)
  }
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return cors()
  if (req.method === 'POST') return handleCreate(req)
  return handleList(req)
}

export const config: Config = {
  path: '/api/agents'
}
