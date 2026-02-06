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

    // Query with tagged template literals (neon driver requirement)
    let agents
    if (department && minScore) {
      agents = await sql`
        SELECT * FROM agents
        WHERE department = ${department}
        AND overall_score >= ${parseFloat(minScore)}
      `
    } else if (department) {
      agents = await sql`
        SELECT * FROM agents WHERE department = ${department}
      `
    } else if (minScore) {
      agents = await sql`
        SELECT * FROM agents WHERE overall_score >= ${parseFloat(minScore)}
      `
    } else {
      agents = await sql`SELECT * FROM agents`
    }

    // Sort in JavaScript (simple and safe with 12 agents)
    const sorted = [...agents].sort((a: any, b: any) => {
      switch (sort) {
        case 'score':
          return (parseFloat(b.overall_score) || 0) - (parseFloat(a.overall_score) || 0)
        case 'department':
          return (a.department || '').localeCompare(b.department || '') ||
                 (a.name || '').localeCompare(b.name || '')
        case 'name':
        default:
          return (a.name || '').localeCompare(b.name || '')
      }
    })

    return json({ agents: sorted, total: sorted.length })
  } catch (err) {
    console.error('agents-list error:', err)
    return error('Failed to fetch agents', 500)
  }
}

export const config: Config = {
  path: '/api/agents'
}
