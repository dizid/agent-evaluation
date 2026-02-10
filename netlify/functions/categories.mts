import type { Config } from '@netlify/functions'
import { sql } from './utils/database.ts'
import { json, error, cors } from './utils/response.ts'
import { authenticate } from './utils/auth.ts'

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return cors()

  const ctx = await authenticate(req)
  if (ctx instanceof Response) return ctx

  try {
    const categories = await sql`
      SELECT
        department AS name,
        COUNT(*)::int AS count,
        ROUND(AVG(overall_score), 1) AS avg_score
      FROM agents
      WHERE org_id = ${ctx.orgId}
        AND (status = 'active' OR status IS NULL)
      GROUP BY department
      ORDER BY department
    `

    return json(
      { categories },
      200,
      { 'Cache-Control': 'public, max-age=300' }
    )
  } catch (err) {
    console.error('categories error:', err)
    return error('Failed to fetch categories', 500)
  }
}

export const config: Config = {
  path: '/api/categories'
}
