import type { Config } from '@netlify/functions'
import { sql } from './utils/database.ts'
import { json, error, cors } from './utils/response.ts'

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return cors()

  try {
    const url = new URL(req.url)
    const department = url.searchParams.get('department')

    let agents
    if (department) {
      agents = await sql`
        SELECT id, name, department, role, overall_score, rating_label,
               eval_count, confidence, trend
        FROM agents
        WHERE department = ${department}
        ORDER BY overall_score DESC NULLS LAST
      `
    } else {
      agents = await sql`
        SELECT id, name, department, role, overall_score, rating_label,
               eval_count, confidence, trend
        FROM agents
        ORDER BY overall_score DESC NULLS LAST
      `
    }

    // Department averages for summary cards
    const deptAvgs = await sql`
      SELECT department,
             ROUND(AVG(overall_score)::numeric, 1) as avg_score,
             COUNT(*) as agent_count,
             SUM(eval_count) as total_evals
      FROM agents
      WHERE overall_score IS NOT NULL
      GROUP BY department
      ORDER BY avg_score DESC
    `

    return json({ agents, department_averages: deptAvgs })
  } catch (err) {
    console.error('leaderboard error:', err)
    return error('Failed to fetch leaderboard', 500)
  }
}

export const config: Config = {
  path: '/api/leaderboard'
}
