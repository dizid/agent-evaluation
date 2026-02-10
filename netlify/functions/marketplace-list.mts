import type { Config } from '@netlify/functions'
import { sql } from './utils/database.ts'
import { json, error, cors } from './utils/response.ts'

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return cors()

  try {
    // Route: GET /api/marketplace — browse marketplace templates (public)
    if (req.method === 'GET') {
      return handleList(req)
    }

    return error('Method not allowed', 405)
  } catch (err) {
    console.error('marketplace-list error:', err)
    return error('Failed to process request', 500)
  }
}

// GET /api/marketplace — browse marketplace templates (public, no auth required)
async function handleList(req: Request) {
  const url = new URL(req.url)

  // Parse query params
  const category = url.searchParams.get('category')
  const sort = url.searchParams.get('sort') || 'installs' // installs|rating|recent
  const search = url.searchParams.get('search')
  const limitParam = url.searchParams.get('limit')
  const offsetParam = url.searchParams.get('offset')

  const limit = limitParam ? Math.min(Math.max(1, Number(limitParam)), 100) : 50
  const offset = offsetParam ? Math.max(0, Number(offsetParam)) : 0

  // Build WHERE clause
  const whereClauses: string[] = ['is_public = true']
  const params: any[] = []

  if (category) {
    whereClauses.push(`category = $${params.length + 1}`)
    params.push(category)
  }

  if (search && search.trim().length > 0) {
    const searchPattern = `%${search.trim()}%`
    whereClauses.push(`(name ILIKE $${params.length + 1} OR description ILIKE $${params.length + 2})`)
    params.push(searchPattern, searchPattern)
  }

  const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : ''

  // Build ORDER BY clause
  let orderBy = 'install_count DESC'
  if (sort === 'rating') {
    orderBy = 'avg_rating DESC NULLS LAST, install_count DESC'
  } else if (sort === 'recent') {
    orderBy = 'created_at DESC'
  }

  // Execute query with parameterized values
  const query = `
    SELECT * FROM agent_templates
    ${whereClause}
    ORDER BY ${orderBy}
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `
  params.push(limit, offset)

  const templates = await sql.unsafe(query, params)

  // Get total count for pagination
  const countQuery = `
    SELECT COUNT(*) as total FROM agent_templates
    ${whereClause}
  `
  const countParams = params.slice(0, -2) // Remove limit and offset
  const countResult = await sql.unsafe(countQuery, countParams)
  const total = Number(countResult[0]?.total || 0)

  return json(
    { templates, total },
    200,
    { 'Cache-Control': 'public, max-age=60' }
  )
}

export const config: Config = {
  path: '/api/marketplace'
}
