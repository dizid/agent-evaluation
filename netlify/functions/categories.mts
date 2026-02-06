import type { Config } from '@netlify/functions'
import { sql } from './utils/database.ts'
import { json, error, cors } from './utils/response.ts'

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return cors()

  try {
    const categories = await sql`
      SELECT
        department AS name,
        COUNT(*)::int AS count,
        ROUND(AVG(overall_score), 1) AS avg_score
      FROM agents
      GROUP BY department
      ORDER BY department
    `

    return json({ categories })
  } catch (err) {
    console.error('categories error:', err)
    return error('Failed to fetch categories', 500)
  }
}

export const config: Config = {
  path: '/api/categories'
}
