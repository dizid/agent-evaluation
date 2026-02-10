import type { Config } from '@netlify/functions'
import { sql } from './utils/database.ts'
import { json, error, cors } from './utils/response.ts'
import { authenticate } from './utils/auth.ts'

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return cors()

  const ctx = await authenticate(req)
  if (ctx instanceof Response) return ctx

  try {
    const url = new URL(req.url)
    const segments = url.pathname.split('/').filter(Boolean)
    const agentIndex = segments.indexOf('agents')
    const id = agentIndex >= 0 ? segments[agentIndex + 1] : null

    if (!id) return error('Agent ID is required', 400)
    if (!/^[a-z0-9-]{2,50}$/.test(id)) return error('Invalid agent ID format', 400)

    const limitRaw = url.searchParams.get('limit')
    const offsetRaw = url.searchParams.get('offset')

    if (limitRaw !== null && (!/^\d+$/.test(limitRaw) || parseInt(limitRaw, 10) < 1)) {
      return error('limit must be a positive integer', 400)
    }
    if (offsetRaw !== null && (!/^\d+$/.test(offsetRaw) || parseInt(offsetRaw, 10) < 0)) {
      return error('offset must be a non-negative integer', 400)
    }

    const limitParam = parseInt(limitRaw || '20', 10)
    const offsetParam = parseInt(offsetRaw || '0', 10)
    const limit = Math.min(Math.max(1, isNaN(limitParam) ? 20 : limitParam), 100)
    const offset = Math.max(0, isNaN(offsetParam) ? 0 : offsetParam)

    // Verify agent exists in caller's org
    const agents = await sql`SELECT id FROM agents WHERE id = ${id} AND org_id = ${ctx.orgId}`
    if (agents.length === 0) return error('Agent not found', 404)

    const countResult = await sql`SELECT COUNT(*)::int as total FROM evaluations WHERE agent_id = ${id} AND org_id = ${ctx.orgId}`
    const total = countResult[0].total

    const evaluations = await sql`
      SELECT * FROM evaluations
      WHERE agent_id = ${id} AND org_id = ${ctx.orgId}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `

    return json(
      { evaluations, total, limit, offset },
      200,
      { 'Cache-Control': 'public, max-age=30' }
    )
  } catch (err) {
    console.error('evaluations-list error:', err)
    return error('Failed to fetch evaluations', 500)
  }
}

export const config: Config = {
  path: '/api/agents/:id/evaluations'
}
