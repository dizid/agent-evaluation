import type { Config } from '@netlify/functions'
import { sql } from './utils/database.ts'
import { json, error, cors } from './utils/response.ts'

const VALID_DEPARTMENTS = ['development', 'marketing', 'operations', 'tools', 'trading']
const VALID_SORTS = ['name', 'score', 'department', 'eval_count']

// POST /api/agents — Create a new agent
async function handleCreate(req: Request): Promise<Response> {
  try {
    const body = await req.json()
    const { id, name, department, role, persona, kpi_definitions, source_type, source_path, model } = body

    if (!id || !name || !department || !role) {
      return error('id, name, department, and role are required', 400)
    }

    // Validate id format (lowercase alphanumeric + hyphens)
    if (!/^[a-z0-9-]{2,50}$/.test(id)) {
      return error('id must be 2-50 lowercase alphanumeric characters or hyphens', 400)
    }

    // Validate department
    if (!VALID_DEPARTMENTS.includes(department)) {
      return error(`department must be one of: ${VALID_DEPARTMENTS.join(', ')}`, 400)
    }

    // Check for duplicate
    const existing = await sql`SELECT id FROM agents WHERE id = ${id}`
    if (existing.length > 0) {
      return error('Agent ID already exists', 409)
    }

    const result = await sql`
      INSERT INTO agents (id, name, department, role, persona, kpi_definitions, source_type, source_path, model, status)
      VALUES (${id}, ${name}, ${department}, ${role}, ${persona || null}, ${JSON.stringify(kpi_definitions || [])}, ${source_type || 'manual'}, ${source_path || null}, ${model || null}, 'active')
      RETURNING *
    `

    return json({ agent: result[0] }, 201)
  } catch (err) {
    console.error('agents-create error:', err)
    return error('Failed to create agent', 500)
  }
}

// GET /api/agents — List agents with optional filters
async function handleList(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url)
    const department = url.searchParams.get('department')
    const minScore = url.searchParams.get('min_score')
    const sort = url.searchParams.get('sort') || 'name'
    const status = url.searchParams.get('status') // 'all' shows everything, default = active only

    // Validate sort param
    if (!VALID_SORTS.includes(sort)) {
      return error(`sort must be one of: ${VALID_SORTS.join(', ')}`, 400)
    }

    // Validate department if provided
    if (department && !VALID_DEPARTMENTS.includes(department)) {
      return error(`department must be one of: ${VALID_DEPARTMENTS.join(', ')}`, 400)
    }

    // Validate min_score if provided
    if (minScore) {
      const parsed = parseFloat(minScore)
      if (isNaN(parsed)) return error('min_score must be a valid number', 400)
    }

    // Build SQL ORDER BY clause based on sort param
    // Neon tagged templates don't allow dynamic column names, so use separate queries
    let agents
    if (status === 'all') {
      // Show all agents including archived/fired (for Manage page)
      if (department) {
        if (sort === 'score') agents = await sql`SELECT * FROM agents WHERE department = ${department} ORDER BY overall_score DESC NULLS LAST`
        else if (sort === 'eval_count') agents = await sql`SELECT * FROM agents WHERE department = ${department} ORDER BY eval_count DESC NULLS LAST`
        else if (sort === 'department') agents = await sql`SELECT * FROM agents WHERE department = ${department} ORDER BY department, name`
        else agents = await sql`SELECT * FROM agents WHERE department = ${department} ORDER BY name`
      } else {
        if (sort === 'score') agents = await sql`SELECT * FROM agents ORDER BY overall_score DESC NULLS LAST`
        else if (sort === 'eval_count') agents = await sql`SELECT * FROM agents ORDER BY eval_count DESC NULLS LAST`
        else if (sort === 'department') agents = await sql`SELECT * FROM agents ORDER BY department, name`
        else agents = await sql`SELECT * FROM agents ORDER BY name`
      }
    } else if (department && minScore) {
      if (sort === 'score') agents = await sql`SELECT * FROM agents WHERE (status = 'active' OR status IS NULL) AND department = ${department} AND overall_score >= ${parseFloat(minScore)} ORDER BY overall_score DESC NULLS LAST`
      else if (sort === 'eval_count') agents = await sql`SELECT * FROM agents WHERE (status = 'active' OR status IS NULL) AND department = ${department} AND overall_score >= ${parseFloat(minScore)} ORDER BY eval_count DESC NULLS LAST`
      else if (sort === 'department') agents = await sql`SELECT * FROM agents WHERE (status = 'active' OR status IS NULL) AND department = ${department} AND overall_score >= ${parseFloat(minScore)} ORDER BY department, name`
      else agents = await sql`SELECT * FROM agents WHERE (status = 'active' OR status IS NULL) AND department = ${department} AND overall_score >= ${parseFloat(minScore)} ORDER BY name`
    } else if (department) {
      if (sort === 'score') agents = await sql`SELECT * FROM agents WHERE (status = 'active' OR status IS NULL) AND department = ${department} ORDER BY overall_score DESC NULLS LAST`
      else if (sort === 'eval_count') agents = await sql`SELECT * FROM agents WHERE (status = 'active' OR status IS NULL) AND department = ${department} ORDER BY eval_count DESC NULLS LAST`
      else if (sort === 'department') agents = await sql`SELECT * FROM agents WHERE (status = 'active' OR status IS NULL) AND department = ${department} ORDER BY department, name`
      else agents = await sql`SELECT * FROM agents WHERE (status = 'active' OR status IS NULL) AND department = ${department} ORDER BY name`
    } else if (minScore) {
      if (sort === 'score') agents = await sql`SELECT * FROM agents WHERE (status = 'active' OR status IS NULL) AND overall_score >= ${parseFloat(minScore)} ORDER BY overall_score DESC NULLS LAST`
      else if (sort === 'eval_count') agents = await sql`SELECT * FROM agents WHERE (status = 'active' OR status IS NULL) AND overall_score >= ${parseFloat(minScore)} ORDER BY eval_count DESC NULLS LAST`
      else if (sort === 'department') agents = await sql`SELECT * FROM agents WHERE (status = 'active' OR status IS NULL) AND overall_score >= ${parseFloat(minScore)} ORDER BY department, name`
      else agents = await sql`SELECT * FROM agents WHERE (status = 'active' OR status IS NULL) AND overall_score >= ${parseFloat(minScore)} ORDER BY name`
    } else {
      if (sort === 'score') agents = await sql`SELECT * FROM agents WHERE (status = 'active' OR status IS NULL) ORDER BY overall_score DESC NULLS LAST`
      else if (sort === 'eval_count') agents = await sql`SELECT * FROM agents WHERE (status = 'active' OR status IS NULL) ORDER BY eval_count DESC NULLS LAST`
      else if (sort === 'department') agents = await sql`SELECT * FROM agents WHERE (status = 'active' OR status IS NULL) ORDER BY department, name`
      else agents = await sql`SELECT * FROM agents WHERE (status = 'active' OR status IS NULL) ORDER BY name`
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
