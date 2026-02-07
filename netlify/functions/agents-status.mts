import type { Config } from '@netlify/functions'
import { sql } from './utils/database.ts'
import { json, error, cors } from './utils/response.ts'

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return cors()
  if (req.method !== 'PATCH' && req.method !== 'POST') return error('Method not allowed', 405)

  try {
    // Extract agent ID from URL path
    // path: /api/agents/:id/status -> segments[-2] = id
    const url = new URL(req.url)
    const segments = url.pathname.split('/')
    const id = segments[segments.length - 2]

    if (!id) return error('Agent ID is required', 400)

    // Verify agent exists
    const existing = await sql`SELECT id FROM agents WHERE id = ${id}`
    if (existing.length === 0) return error('Agent not found', 404)

    const body = await req.json()
    const { status } = body

    // Validate status value
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
  } catch (err) {
    console.error('agents-status error:', err)
    return error('Failed to update agent status', 500)
  }
}

export const config: Config = {
  path: '/api/agents/:id/status'
}
