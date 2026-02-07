import type { Config } from '@netlify/functions'
import { sql } from './utils/database.ts'
import { json, error, cors } from './utils/response.ts'

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return cors()

  try {
    // Extract agent ID from URL path
    // path: /api/agents/:id/action-items -> segments[-2] = id
    const url = new URL(req.url)
    const segments = url.pathname.split('/')
    const id = segments[segments.length - 2]

    if (!id) return error('Agent ID is required', 400)

    // Verify agent exists
    const existing = await sql`SELECT id FROM agents WHERE id = ${id}`
    if (existing.length === 0) return error('Agent not found', 404)

    // Fetch all evaluations with action items for this agent
    const items = await sql`
      SELECT id AS evaluation_id, action_item, overall, top_weakness, created_at
      FROM evaluations
      WHERE agent_id = ${id} AND action_item IS NOT NULL
      ORDER BY created_at DESC
    `

    return json({ action_items: items })
  } catch (err) {
    console.error('action-items error:', err)
    return error('Failed to fetch action items', 500)
  }
}

export const config: Config = {
  path: '/api/agents/:id/action-items'
}
