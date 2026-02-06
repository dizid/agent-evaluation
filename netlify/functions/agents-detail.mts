import type { Config } from '@netlify/functions'
import { sql } from './utils/database.ts'
import { json, error, cors } from './utils/response.ts'

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return cors()

  try {
    // Extract agent ID from URL path
    const url = new URL(req.url)
    const segments = url.pathname.split('/')
    const id = segments[segments.length - 1]

    if (!id) {
      return error('Agent ID is required', 400)
    }

    // Fetch agent
    const agents = await sql`SELECT * FROM agents WHERE id = ${id}`
    if (agents.length === 0) {
      return error('Agent not found', 404)
    }

    // Fetch latest evaluation
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
  } catch (err) {
    console.error('agents-detail error:', err)
    return error('Failed to fetch agent', 500)
  }
}

export const config: Config = {
  path: '/api/agents/:id'
}
