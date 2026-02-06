import type { Config } from '@netlify/functions'
import { sql } from './utils/database.ts'
import { json, error, cors } from './utils/response.ts'

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return cors()

  try {
    const url = new URL(req.url)
    const department = url.searchParams.get('department')
    const minScore = url.searchParams.get('min_score')
    const sort = url.searchParams.get('sort') || 'name'

    // Build query with optional filters
    let query = 'SELECT * FROM agents WHERE 1=1'
    const params: unknown[] = []
    let paramIndex = 1

    if (department) {
      query += ` AND department = $${paramIndex++}`
      params.push(department)
    }

    if (minScore) {
      query += ` AND overall_score >= $${paramIndex++}`
      params.push(parseFloat(minScore))
    }

    // Sort options
    switch (sort) {
      case 'score':
        query += ' ORDER BY overall_score DESC NULLS LAST'
        break
      case 'department':
        query += ' ORDER BY department, name'
        break
      case 'name':
      default:
        query += ' ORDER BY name'
        break
    }

    const agents = await sql(query, params)

    return json({ agents, total: agents.length })
  } catch (err) {
    console.error('agents-list error:', err)
    return error('Failed to fetch agents', 500)
  }
}

export const config: Config = {
  path: '/api/agents'
}
