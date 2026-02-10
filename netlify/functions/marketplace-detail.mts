import type { Config } from '@netlify/functions'
import { sql } from './utils/database.ts'
import { json, error, cors } from './utils/response.ts'
import { authenticate, authorize } from './utils/auth.ts'

// Strip HTML tags from a string to prevent XSS
function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, '')
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return cors()

  try {
    const url = new URL(req.url)
    const segments = url.pathname.split('/').filter(Boolean)
    // segments: ['api', 'marketplace', ':id'] or ['api', 'marketplace', ':id', 'install']
    const marketplaceIndex = segments.indexOf('marketplace')
    const id = marketplaceIndex >= 0 && segments.length > marketplaceIndex + 1 ? segments[marketplaceIndex + 1] : null

    if (!id) return error('Template ID is required', 400)

    // Validate ID format
    if (!/^[a-z0-9-]{2,50}$/.test(id)) {
      return error('Invalid template ID format', 400)
    }

    // Check for sub-routes
    const hasInstall = segments.includes('install')
    const hasReviews = segments.includes('reviews')

    // Route: POST /api/marketplace/:id/install — install template
    if (req.method === 'POST' && hasInstall) {
      const ctx = await authenticate(req)
      if (ctx instanceof Response) return ctx
      return handleInstall(ctx, id, req)
    }

    // Route: POST /api/marketplace/:id/reviews — submit/update review
    if (req.method === 'POST' && hasReviews) {
      const ctx = await authenticate(req)
      if (ctx instanceof Response) return ctx
      return handleReview(ctx, id, req)
    }

    // Route: GET /api/marketplace/:id — template detail (public)
    if (req.method === 'GET') {
      return handleDetail(id)
    }

    return error('Method not allowed', 405)
  } catch (err) {
    console.error('marketplace-detail error:', err)
    return error('Failed to process request', 500)
  }
}

// GET /api/marketplace/:id — template detail + aggregate rating (public)
async function handleDetail(id: string) {
  const templates = await sql`
    SELECT * FROM agent_templates
    WHERE id = ${id} AND is_public = true
  `

  if (templates.length === 0) {
    return error('Template not found', 404)
  }

  const template = templates[0]

  // Fetch aggregate rating
  const ratings = await sql`
    SELECT AVG(rating) as avg_rating, COUNT(*) as review_count
    FROM template_ratings
    WHERE template_id = ${id}
  `

  const avg_rating = ratings[0]?.avg_rating ? Number(ratings[0].avg_rating) : null
  const review_count = Number(ratings[0]?.review_count || 0)

  return json(
    { template: { ...template, avg_rating, review_count } },
    200,
    { 'Cache-Control': 'public, max-age=60' }
  )
}

// POST /api/marketplace/:id/install — install template into user's org
async function handleInstall(ctx: { userId: string; orgId: string }, templateId: string, req: Request) {
  // Verify template exists and is public
  const templates = await sql`
    SELECT * FROM agent_templates
    WHERE id = ${templateId} AND is_public = true
  `
  if (templates.length === 0) {
    return error('Template not found', 404)
  }

  const template = templates[0]
  const body = await req.json().catch(() => ({}))

  // Extract customization options (all optional)
  const agentId = body.agent_id ? stripHtml(body.agent_id.trim()) : template.id
  const name = body.name ? stripHtml(body.name.trim()) : template.name
  const departmentSlug = body.department_slug ? stripHtml(body.department_slug.trim()) : null
  const persona = body.persona ? stripHtml(body.persona.trim()) : template.persona

  // Validate agent_id format
  if (!/^[a-z0-9-]{2,50}$/.test(agentId)) {
    return error('Invalid agent_id format', 400)
  }

  // Check agent_id doesn't already exist in org
  const existingAgent = await sql`
    SELECT id FROM agents
    WHERE org_id = ${ctx.orgId} AND id = ${agentId}
  `
  if (existingAgent.length > 0) {
    return error('An agent with this ID already exists in your organization', 409)
  }

  // Map department_slug to department_id
  let departmentId = null
  if (departmentSlug) {
    const depts = await sql`
      SELECT id FROM departments
      WHERE org_id = ${ctx.orgId} AND slug = ${departmentSlug}
    `
    if (depts.length > 0) {
      departmentId = depts[0].id
    }
  }

  // If no department found via slug, use first department
  if (!departmentId) {
    const firstDept = await sql`
      SELECT id FROM departments
      WHERE org_id = ${ctx.orgId}
      ORDER BY sort_order ASC, name ASC
      LIMIT 1
    `
    if (firstDept.length > 0) {
      departmentId = firstDept[0].id
    }
  }

  // Insert agent
  const agentResult = await sql`
    INSERT INTO agents (
      id, org_id, name, department_id, role, persona,
      kpi_definitions, source_type, template_id, status
    )
    VALUES (
      ${agentId}, ${ctx.orgId}, ${name}, ${departmentId}, ${template.role},
      ${persona}, ${JSON.stringify(template.kpi_definitions)},
      'template', ${templateId}, 'active'
    )
    RETURNING *
  `

  if (agentResult.length === 0) {
    return error('Failed to install agent', 500)
  }

  const newAgent = agentResult[0]

  // Record install
  await sql`
    INSERT INTO agent_installs (template_id, org_id, installed_by)
    VALUES (${templateId}, ${ctx.orgId}, ${ctx.userId})
  `

  // Increment install count
  await sql`
    UPDATE agent_templates
    SET install_count = install_count + 1
    WHERE id = ${templateId}
  `

  return json(
    { agent: newAgent, message: 'Agent installed successfully' },
    201
  )
}

// POST /api/marketplace/:id/reviews — submit/update review
async function handleReview(ctx: { userId: string }, templateId: string, req: Request) {
  const body = await req.json()
  const { rating, review_text } = body

  // Validate rating (required, 1-5)
  if (typeof rating !== 'number' || rating < 1 || rating > 5) {
    return error('rating is required and must be between 1 and 5', 400)
  }

  // Verify template exists and is public
  const templates = await sql`
    SELECT id FROM agent_templates
    WHERE id = ${templateId} AND is_public = true
  `
  if (templates.length === 0) {
    return error('Template not found', 404)
  }

  // Strip HTML from review text
  const cleanReviewText = review_text ? stripHtml(review_text.trim()) : null

  // Validate review text length
  if (cleanReviewText && cleanReviewText.length > 2000) {
    return error('review_text must be at most 2000 characters', 400)
  }

  // UPSERT review (one review per user per template)
  const result = await sql`
    INSERT INTO template_ratings (template_id, user_id, rating, review_text)
    VALUES (${templateId}, ${ctx.userId}, ${rating}, ${cleanReviewText})
    ON CONFLICT (template_id, user_id)
    DO UPDATE SET
      rating = EXCLUDED.rating,
      review_text = EXCLUDED.review_text,
      created_at = NOW()
    RETURNING *
  `

  if (result.length === 0) {
    return error('Failed to save review', 500)
  }

  const review = result[0]

  // Recalculate avg_rating on agent_templates
  const avgResult = await sql`
    SELECT AVG(rating) as avg_rating
    FROM template_ratings
    WHERE template_id = ${templateId}
  `
  const avgRating = avgResult[0]?.avg_rating ? Number(avgResult[0].avg_rating) : null

  await sql`
    UPDATE agent_templates
    SET avg_rating = ${avgRating}
    WHERE id = ${templateId}
  `

  return json({ review })
}

export const config: Config = {
  path: '/api/marketplace/:id'
}
