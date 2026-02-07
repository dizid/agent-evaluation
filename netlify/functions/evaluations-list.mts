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

    // Parse pagination params
    const limitParam = parseInt(url.searchParams.get('limit') || '20', 10)
    const offsetParam = parseInt(url.searchParams.get('offset') || '0', 10)
    const limit = Math.min(Math.max(1, isNaN(limitParam) ? 20 : limitParam), 100)
    const offset = Math.max(0, isNaN(offsetParam) ? 0 : offsetParam)

    // Verify agent exists
    const agents = await sql`SELECT id FROM agents WHERE id = ${id}`
    if (agents.length === 0) {
      return error('Agent not found', 404)
    }

    // Get total count and paginated evaluations
    const countResult = await sql`SELECT COUNT(*)::int as total FROM evaluations WHERE agent_id = ${id}`
    const total = countResult[0].total

    const evaluations = await sql`
      SELECT * FROM evaluations
      WHERE agent_id = ${id}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `

    return json({ evaluations, total, limit, offset })
  } catch (err) {
    console.error('evaluations-list error:', err)
    return error('Failed to fetch evaluations', 500)
  }
}

export const config: Config = {
  path: '/api/agents/:id/evaluations'
}
