import type { Config } from '@netlify/functions'
import { sql } from './utils/database.ts'
import { json, error, cors } from './utils/response.ts'

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return cors()

  try {
    const url = new URL(req.url)
    const segments = url.pathname.split('/').filter(Boolean)
    // segments: ['api', 'agents', ':id'] or ['api', 'agents', ':id', 'action-items']
    const agentIndex = segments.indexOf('agents')
    const id = agentIndex >= 0 ? segments[agentIndex + 1] : null

    if (!id) return error('Agent ID is required', 400)

    // Route: GET /api/agents/:id?include=action_items
    if (req.method === 'GET' && url.searchParams.get('include') === 'action_items') {
      return handleActionItems(id)
    }

    // Route: PUT /api/agents/:id — update agent fields
    if (req.method === 'PUT') {
      return handleUpdate(id, req)
    }

    // Route: PATCH /api/agents/:id — update agent status
    if (req.method === 'PATCH') {
      return handleStatus(id, req)
    }

    // Route: GET /api/agents/:id — detail view
    if (req.method === 'GET') {
      return handleDetail(id)
    }

    return error('Method not allowed', 405)
  } catch (err) {
    console.error('agents-detail error:', err)
    return error('Failed to process request', 500)
  }
}

// GET /api/agents/:id — agent detail + latest evaluation
async function handleDetail(id: string) {
  const agents = await sql`SELECT * FROM agents WHERE id = ${id}`
  if (agents.length === 0) return error('Agent not found', 404)

  const evaluations = await sql`
    SELECT * FROM evaluations
    WHERE agent_id = ${id}
    ORDER BY created_at DESC
    LIMIT 1
  `

  return json({
    agent: agents[0],
    latest_evaluation: evaluations[0] || null
  })
}

// PUT /api/agents/:id — update agent fields
async function handleUpdate(id: string, req: Request) {
  const existing = await sql`SELECT * FROM agents WHERE id = ${id}`
  if (existing.length === 0) return error('Agent not found', 404)

  const body = await req.json()
  const agent = existing[0]

  // Validate department if provided
  const validDepartments = ['development', 'marketing', 'operations', 'tools', 'trading']
  if (body.department && !validDepartments.includes(body.department)) {
    return error(`department must be one of: ${validDepartments.join(', ')}`, 400)
  }

  // Validate kpi_definitions if provided
  if (body.kpi_definitions && (!Array.isArray(body.kpi_definitions) || !body.kpi_definitions.every((k: any) => typeof k === 'string'))) {
    return error('kpi_definitions must be an array of strings', 400)
  }

  const name = body.name ?? agent.name
  const department = body.department ?? agent.department
  const role = body.role ?? agent.role
  const persona = body.persona ?? agent.persona
  const kpi_definitions = body.kpi_definitions !== undefined
    ? JSON.stringify(body.kpi_definitions)
    : JSON.stringify(agent.kpi_definitions)
  const source_path = body.source_path ?? agent.source_path
  const model = body.model ?? agent.model

  const result = await sql`
    UPDATE agents SET
      name = ${name},
      department = ${department},
      role = ${role},
      persona = ${persona},
      kpi_definitions = ${kpi_definitions},
      source_path = ${source_path},
      model = ${model}
    WHERE id = ${id}
    RETURNING *
  `

  return json({ agent: result[0] })
}

// PATCH /api/agents/:id — update agent status (fire/archive/reactivate)
async function handleStatus(id: string, req: Request) {
  const existing = await sql`SELECT id FROM agents WHERE id = ${id}`
  if (existing.length === 0) return error('Agent not found', 404)

  const body = await req.json()
  const { status } = body

  if (!['active', 'archived', 'fired'].includes(status)) {
    return error('Status must be active, archived, or fired', 400)
  }

  const result = await sql`
    UPDATE agents SET
      status = ${status},
      status_changed_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `

  const labels: Record<string, string> = {
    active: 'Agent reactivated',
    archived: 'Agent archived',
    fired: 'Agent fired'
  }

  return json({ agent: result[0], message: labels[status] })
}

// GET /api/agents/:id/action-items — improvement suggestions from evaluations
async function handleActionItems(id: string) {
  const existing = await sql`SELECT id FROM agents WHERE id = ${id}`
  if (existing.length === 0) return error('Agent not found', 404)

  const items = await sql`
    SELECT id AS evaluation_id, action_item, overall, top_weakness, created_at
    FROM evaluations
    WHERE agent_id = ${id} AND action_item IS NOT NULL
    ORDER BY created_at DESC
  `

  return json({ action_items: items })
}

export const config: Config = {
  path: '/api/agents/:id'
}
