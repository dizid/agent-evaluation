import type { Config } from '@netlify/functions'
import { sql } from './utils/database.ts'
import { json, error, cors } from './utils/response.ts'

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return cors()

  try {
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
  const sort = url.searchParams.get('sort') || 'installs'
  const search = url.searchParams.get('search')
  const limitParam = url.searchParams.get('limit')
  const offsetParam = url.searchParams.get('offset')

  const limit = limitParam ? Math.min(Math.max(1, Number(limitParam)), 100) : 50
  const offset = offsetParam ? Math.max(0, Number(offsetParam)) : 0

  // Use tagged templates with conditional filtering
  // The Neon serverless driver only supports tagged template syntax
  let templates
  let countResult

  if (category && search) {
    const searchPattern = `%${search.trim()}%`
    if (sort === 'rating') {
      templates = await sql`
        SELECT * FROM agent_templates
        WHERE is_public = true AND category = ${category}
          AND (name ILIKE ${searchPattern} OR description ILIKE ${searchPattern})
        ORDER BY avg_rating DESC NULLS LAST, install_count DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    } else if (sort === 'recent') {
      templates = await sql`
        SELECT * FROM agent_templates
        WHERE is_public = true AND category = ${category}
          AND (name ILIKE ${searchPattern} OR description ILIKE ${searchPattern})
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    } else {
      templates = await sql`
        SELECT * FROM agent_templates
        WHERE is_public = true AND category = ${category}
          AND (name ILIKE ${searchPattern} OR description ILIKE ${searchPattern})
        ORDER BY install_count DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    }
    countResult = await sql`
      SELECT COUNT(*)::int AS total FROM agent_templates
      WHERE is_public = true AND category = ${category}
        AND (name ILIKE ${searchPattern} OR description ILIKE ${searchPattern})
    `
  } else if (category) {
    if (sort === 'rating') {
      templates = await sql`
        SELECT * FROM agent_templates
        WHERE is_public = true AND category = ${category}
        ORDER BY avg_rating DESC NULLS LAST, install_count DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    } else if (sort === 'recent') {
      templates = await sql`
        SELECT * FROM agent_templates
        WHERE is_public = true AND category = ${category}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    } else {
      templates = await sql`
        SELECT * FROM agent_templates
        WHERE is_public = true AND category = ${category}
        ORDER BY install_count DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    }
    countResult = await sql`
      SELECT COUNT(*)::int AS total FROM agent_templates
      WHERE is_public = true AND category = ${category}
    `
  } else if (search) {
    const searchPattern = `%${search.trim()}%`
    if (sort === 'rating') {
      templates = await sql`
        SELECT * FROM agent_templates
        WHERE is_public = true
          AND (name ILIKE ${searchPattern} OR description ILIKE ${searchPattern})
        ORDER BY avg_rating DESC NULLS LAST, install_count DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    } else if (sort === 'recent') {
      templates = await sql`
        SELECT * FROM agent_templates
        WHERE is_public = true
          AND (name ILIKE ${searchPattern} OR description ILIKE ${searchPattern})
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    } else {
      templates = await sql`
        SELECT * FROM agent_templates
        WHERE is_public = true
          AND (name ILIKE ${searchPattern} OR description ILIKE ${searchPattern})
        ORDER BY install_count DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    }
    countResult = await sql`
      SELECT COUNT(*)::int AS total FROM agent_templates
      WHERE is_public = true
        AND (name ILIKE ${searchPattern} OR description ILIKE ${searchPattern})
    `
  } else {
    // No filters — just sort
    if (sort === 'rating') {
      templates = await sql`
        SELECT * FROM agent_templates
        WHERE is_public = true
        ORDER BY avg_rating DESC NULLS LAST, install_count DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    } else if (sort === 'recent') {
      templates = await sql`
        SELECT * FROM agent_templates
        WHERE is_public = true
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    } else {
      templates = await sql`
        SELECT * FROM agent_templates
        WHERE is_public = true
        ORDER BY install_count DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    }
    countResult = await sql`
      SELECT COUNT(*)::int AS total FROM agent_templates
      WHERE is_public = true
    `
  }

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
