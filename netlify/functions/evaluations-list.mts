import type { Config } from '@netlify/functions'
import { sql } from './utils/database.ts'
import { json, error, cors } from './utils/response.ts'

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return cors()

  try {
    // Extract agent ID from URL: /api/agents/:id/evaluations
    const url = new URL(req.url)
    const segments = url.pathname.split('/').filter(Boolean)
    // segments: ['api', 'agents', ':id', 'evaluations']
    const agentIndex = segments.indexOf('agents')
    const id = agentIndex >= 0 ? segments[agentIndex + 1] : null

    if (!id) {
      return error('Agent ID is required', 400)
    }

    // Verify agent exists
    const agents = await sql`SELECT id FROM agents WHERE id = ${id}`
    if (agents.length === 0) {
      return error('Agent not found', 404)
    }

    const evaluations = await sql`
      SELECT * FROM evaluations
      WHERE agent_id = ${id}
      ORDER BY created_at DESC
    `

    return json({ evaluations })
  } catch (err) {
    console.error('evaluations-list error:', err)
    return error('Failed to fetch evaluations', 500)
  }
}

export const config: Config = {
  path: '/api/agents/:id/evaluations'
}
