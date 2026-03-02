import type { Config } from '@netlify/functions'
import { sql } from './utils/database.ts'
import { json, error, cors } from './utils/response.ts'
import { authenticate, authorize } from './utils/auth.ts'

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return cors()

  try {
    if (req.method === 'GET') return handleList(req)
    if (req.method === 'POST') return handleCreate(req)

    return error('Method not allowed', 405)
  } catch (err) {
    console.error('marketplace-list error:', err)
    return error('Failed to process request', 500)
  }
}

// POST /api/marketplace — Publish an agent as a marketplace template (requires admin+)
async function handleCreate(req: Request): Promise<Response> {
  const ctx = await authenticate(req)
  if (ctx instanceof Response) return ctx
  if (!authorize(ctx, 'admin')) return error('Forbidden: admin role required', 403)

  try {
    const body = await req.json()
    const { agent_id, description, tags, template_id, name, is_public } = body

    // Validate required fields
    if (!agent_id) {
      return error('agent_id is required', 400)
    }

    if (!/^[a-z0-9-]{2,50}$/.test(agent_id)) {
      return error('agent_id must be 2-50 lowercase alphanumeric characters or hyphens', 400)
    }

    // Look up the agent in the user's org
    const agents = await sql`
      SELECT id, name, department, role, persona, kpi_definitions
      FROM agents
      WHERE id = ${agent_id} AND org_id = ${ctx.orgId}
    `
    if (agents.length === 0) {
      return error('Agent not found in your organization', 404)
    }
    const agent = agents[0]

    // Determine and validate template_id
    const templateId = template_id || agent_id
    if (!/^[a-z0-9-]{2,50}$/.test(templateId)) {
      return error('template_id must be 2-50 lowercase alphanumeric characters or hyphens', 400)
    }

    // Check template_id uniqueness in marketplace
    const existing = await sql`SELECT id FROM agent_templates WHERE id = ${templateId}`
    if (existing.length > 0) {
      return error('Template ID already exists in the marketplace', 409)
    }

    // Sanitize optional fields
    const sanitizedDescription = description
      ? String(description).slice(0, 2000)
      : null

    let sanitizedTags: string[] = []
    if (Array.isArray(tags)) {
      sanitizedTags = tags
        .slice(0, 10)
        .map(t => String(t).slice(0, 50).trim())
        .filter(t => t.length > 0)
    }

    const templateName = name || agent.name
    const category = agent.department || 'custom'
    const isPublic = is_public !== false // default true

    // Insert the new template
    const result = await sql`
      INSERT INTO agent_templates (
        id, name, category, role, persona, kpi_definitions,
        description, tags, author_org_id, is_official, is_public,
        install_count, avg_rating
      ) VALUES (
        ${templateId},
        ${templateName},
        ${category},
        ${agent.role},
        ${agent.persona},
        ${JSON.stringify(agent.kpi_definitions || [])},
        ${sanitizedDescription},
        ${JSON.stringify(sanitizedTags)},
        ${ctx.orgId},
        false,
        ${isPublic},
        0,
        null
      )
      RETURNING *
    `

    return json({ template: result[0], message: 'Agent published to marketplace' }, 201)
  } catch (err) {
    console.error('marketplace-create error:', err)
    return error('Failed to publish agent', 500)
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
