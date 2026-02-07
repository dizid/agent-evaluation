import type { Config } from '@netlify/functions'
import { sql } from './utils/database.ts'
import { json, error, cors } from './utils/response.ts'

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return cors()
  if (req.method !== 'PUT') return error('Method not allowed', 405)

  try {
    // Extract agent ID from URL path
    // path: /api/agents/:id/update -> segments[-2] = id
    const url = new URL(req.url)
    const segments = url.pathname.split('/')
    const id = segments[segments.length - 2]

    if (!id) return error('Agent ID is required', 400)

    // Verify agent exists
    const existing = await sql`SELECT * FROM agents WHERE id = ${id}`
    if (existing.length === 0) return error('Agent not found', 404)

    const body = await req.json()
    const agent = existing[0]

    // Only update fields that are provided, fall back to existing values
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
  } catch (err) {
    console.error('agents-update error:', err)
    return error('Failed to update agent', 500)
  }
}

export const config: Config = {
  path: '/api/agents/:id/update'
}
