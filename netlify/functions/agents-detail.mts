import type { Config } from '@netlify/functions'
import { sql } from './utils/database.ts'
import { json, error, cors } from './utils/response.ts'
import { authenticate, authorize } from './utils/auth.ts'

function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, '')
}

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

    if (req.method === 'GET' && url.searchParams.get('include') === 'action_items') {
      return handleActionItems(id, ctx.orgId)
    }
    if (req.method === 'PUT' && url.searchParams.get('action') === 'apply_item') {
      if (!authorize(ctx, 'admin')) return error('Forbidden', 403)
      return handleApplyItem(id, url, ctx.orgId)
    }
    if (req.method === 'PUT' && url.searchParams.get('action') === 'unapply_item') {
      if (!authorize(ctx, 'admin')) return error('Forbidden', 403)
      return handleUnapplyItem(id, url, ctx.orgId)
    }
    if (req.method === 'PUT' && url.searchParams.get('action') === 'preview_edit') {
      if (!authorize(ctx, 'admin')) return error('Forbidden', 403)
      return handlePreviewEdit(id, url, ctx.orgId)
    }
    if (req.method === 'PUT' && url.searchParams.get('action') === 'apply_edit') {
      if (!authorize(ctx, 'admin')) return error('Forbidden', 403)
      return handleApplyEdit(id, req, url, ctx.orgId)
    }
    if (req.method === 'PUT') {
      if (!authorize(ctx, 'admin')) return error('Forbidden', 403)
      return handleUpdate(id, req, ctx.orgId)
    }
    if (req.method === 'PATCH') {
      if (!authorize(ctx, 'admin')) return error('Forbidden', 403)
      return handleStatus(id, req, ctx.orgId)
    }
    if (req.method === 'GET') {
      return handleDetail(id, ctx.orgId)
    }

    return error('Method not allowed', 405)
  } catch (err) {
    console.error('agents-detail error:', err)
    return error('Failed to process request', 500)
  }
}

async function handleDetail(id: string, orgId: string) {
  const agents = await sql`SELECT * FROM agents WHERE id = ${id} AND org_id = ${orgId}`
  if (agents.length === 0) return error('Agent not found', 404)

  const evaluations = await sql`
    SELECT * FROM evaluations
    WHERE agent_id = ${id} AND org_id = ${orgId}
    ORDER BY created_at DESC LIMIT 1
  `

  return json(
    { agent: agents[0], latest_evaluation: evaluations[0] || null },
    200,
    { 'Cache-Control': 'public, max-age=30' }
  )
}

async function handleUpdate(id: string, req: Request, orgId: string) {
  const existing = await sql`SELECT * FROM agents WHERE id = ${id} AND org_id = ${orgId}`
  if (existing.length === 0) return error('Agent not found', 404)

  const body = await req.json()
  const agent = existing[0]

  if (body.name !== undefined && (typeof body.name !== 'string' || body.name.length > 100)) {
    return error('name must be a string of max 100 characters', 400)
  }
  if (body.role !== undefined && (typeof body.role !== 'string' || body.role.length > 200)) {
    return error('role must be a string of max 200 characters', 400)
  }
  if (body.persona !== undefined && (typeof body.persona !== 'string' || body.persona.length > 5000)) {
    return error('persona must be a string of max 5000 characters', 400)
  }
  if (body.kpi_definitions && (!Array.isArray(body.kpi_definitions) || !body.kpi_definitions.every((k: any) => typeof k === 'string'))) {
    return error('kpi_definitions must be an array of strings', 400)
  }

  const name = stripHtml(body.name ?? agent.name)
  const department = body.department ?? agent.department
  const role = stripHtml(body.role ?? agent.role)
  const persona = stripHtml(body.persona ?? agent.persona)
  const kpi_definitions = body.kpi_definitions !== undefined
    ? JSON.stringify(body.kpi_definitions)
    : JSON.stringify(agent.kpi_definitions)
  const source_path = body.source_path ?? agent.source_path
  const model = body.model ?? agent.model

  const result = await sql`
    UPDATE agents SET
      name = ${name}, department = ${department}, role = ${role},
      persona = ${persona}, kpi_definitions = ${kpi_definitions},
      source_path = ${source_path}, model = ${model}, updated_at = NOW()
    WHERE id = ${id} AND org_id = ${orgId}
    RETURNING *
  `

  return json({ agent: result[0] })
}

async function handleStatus(id: string, req: Request, orgId: string) {
  const existing = await sql`SELECT id FROM agents WHERE id = ${id} AND org_id = ${orgId}`
  if (existing.length === 0) return error('Agent not found', 404)

  const body = await req.json()
  const { status } = body

  if (!['active', 'archived', 'fired'].includes(status)) {
    return error('Status must be active, archived, or fired', 400)
  }

  const result = await sql`
    UPDATE agents SET status = ${status}, status_changed_at = NOW()
    WHERE id = ${id} AND org_id = ${orgId}
    RETURNING *
  `

  const labels: Record<string, string> = { active: 'Agent reactivated', archived: 'Agent archived', fired: 'Agent fired' }
  return json({ agent: result[0], message: labels[status] })
}

async function handleActionItems(id: string, orgId: string) {
  const existing = await sql`SELECT id FROM agents WHERE id = ${id} AND org_id = ${orgId}`
  if (existing.length === 0) return error('Agent not found', 404)

  const items = await sql`
    SELECT id AS evaluation_id, action_item, overall, top_weakness, created_at,
           COALESCE(applied, false) AS applied, applied_at
    FROM evaluations
    WHERE agent_id = ${id} AND org_id = ${orgId} AND action_item IS NOT NULL
    ORDER BY applied ASC, created_at DESC
  `
  return json({ action_items: items })
}

async function handleApplyItem(agentId: string, url: URL, orgId: string) {
  const evalIdParam = url.searchParams.get('eval_id')
  if (!evalIdParam || isNaN(Number(evalIdParam))) {
    return error('eval_id query parameter is required and must be a number', 400)
  }
  const evalId = Number(evalIdParam)

  const evals = await sql`
    SELECT id, action_item, applied FROM evaluations
    WHERE id = ${evalId} AND agent_id = ${agentId} AND org_id = ${orgId} AND action_item IS NOT NULL
  `
  if (evals.length === 0) return error('Evaluation not found or has no action item', 404)
  if (evals[0].applied === true) return json({ message: 'Already applied', evaluation_id: evalId })

  const result = await sql`
    UPDATE evaluations SET applied = true, applied_at = NOW()
    WHERE id = ${evalId} RETURNING id, action_item, applied, applied_at
  `
  return json({ message: 'Action item marked as applied', evaluation: result[0] })
}

async function handleUnapplyItem(agentId: string, url: URL, orgId: string) {
  const evalIdParam = url.searchParams.get('eval_id')
  if (!evalIdParam || isNaN(Number(evalIdParam))) {
    return error('eval_id query parameter is required and must be a number', 400)
  }
  const evalId = Number(evalIdParam)

  const evals = await sql`
    SELECT id, action_item, applied FROM evaluations
    WHERE id = ${evalId} AND agent_id = ${agentId} AND org_id = ${orgId} AND action_item IS NOT NULL
  `
  if (evals.length === 0) return error('Evaluation not found or has no action item', 404)

  const result = await sql`
    UPDATE evaluations SET applied = false, applied_at = NULL
    WHERE id = ${evalId} RETURNING id, action_item, applied, applied_at
  `
  return json({ message: 'Action item marked as unapplied', evaluation: result[0] })
}

// --- One-Click Action Apply: AI-powered persona editing ---

async function callHaiku(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured')

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: userPrompt }]
    })
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Anthropic API ${res.status}: ${text}`)
  }

  const data = await res.json() as { content: Array<{ type: string; text?: string }> }
  const textBlock = data.content.find((b: any) => b.type === 'text')
  if (!textBlock?.text) throw new Error('Empty response from Anthropic API')

  // Strip markdown fences if Haiku wraps the output
  let result = textBlock.text.trim()
  if (result.startsWith('```')) {
    result = result.replace(/^```\w*\n?/, '').replace(/\n?```$/, '').trim()
  }
  return result
}

async function handlePreviewEdit(agentId: string, url: URL, orgId: string) {
  const evalIdParam = url.searchParams.get('eval_id')
  if (!evalIdParam || isNaN(Number(evalIdParam))) {
    return error('eval_id query parameter is required and must be a number', 400)
  }
  const evalId = Number(evalIdParam)

  // Fetch agent + evaluation in parallel
  const [agents, evals] = await Promise.all([
    sql`SELECT id, name, persona, role FROM agents WHERE id = ${agentId} AND org_id = ${orgId}`,
    sql`SELECT id, action_item, top_weakness, applied FROM evaluations
        WHERE id = ${evalId} AND agent_id = ${agentId} AND org_id = ${orgId} AND action_item IS NOT NULL`
  ])

  if (agents.length === 0) return error('Agent not found', 404)
  if (evals.length === 0) return error('Evaluation not found or has no action item', 404)

  const agent = agents[0]
  const evaluation = evals[0]

  if (!agent.persona) {
    return error('Agent has no persona text to edit', 400)
  }

  const systemPrompt = `You edit AI agent persona files. Given an action item from a performance evaluation, make the minimal targeted edit to improve the agent's behavior rules.

Rules:
- Return ONLY the complete updated persona text, nothing else
- Make the smallest change that addresses the action item
- Preserve existing formatting, structure, and content
- Add or modify specific behavior rules, not vague advice
- Do not remove existing rules unless they directly conflict`

  const userPrompt = `Agent: @${agent.name} (${agent.role})

Current persona:
${agent.persona}

Action item: ${evaluation.action_item}${evaluation.top_weakness ? `\nWeakness: ${evaluation.top_weakness}` : ''}`

  try {
    const suggested = await callHaiku(systemPrompt, userPrompt)

    return json({
      original: agent.persona,
      suggested,
      action_item: evaluation.action_item,
      top_weakness: evaluation.top_weakness,
      eval_id: evalId
    })
  } catch (err: any) {
    console.error('preview_edit error:', err)
    return error(`Failed to generate preview: ${err.message}`, 500)
  }
}

async function handleApplyEdit(agentId: string, req: Request, url: URL, orgId: string) {
  const evalIdParam = url.searchParams.get('eval_id')
  if (!evalIdParam || isNaN(Number(evalIdParam))) {
    return error('eval_id query parameter is required and must be a number', 400)
  }
  const evalId = Number(evalIdParam)

  let body: any
  try {
    body = await req.json()
  } catch {
    return error('Request body must be valid JSON', 400)
  }

  const { confirmed_persona } = body
  if (!confirmed_persona || typeof confirmed_persona !== 'string') {
    return error('confirmed_persona is required and must be a string', 400)
  }
  if (confirmed_persona.length > 10000) {
    return error('confirmed_persona must be max 10000 characters', 400)
  }

  // Verify agent + eval exist
  const [agents, evals] = await Promise.all([
    sql`SELECT id, name FROM agents WHERE id = ${agentId} AND org_id = ${orgId}`,
    sql`SELECT id, action_item FROM evaluations
        WHERE id = ${evalId} AND agent_id = ${agentId} AND org_id = ${orgId} AND action_item IS NOT NULL`
  ])

  if (agents.length === 0) return error('Agent not found', 404)
  if (evals.length === 0) return error('Evaluation not found or has no action item', 404)

  const sanitized = stripHtml(confirmed_persona)

  // Update persona + mark eval as applied in parallel
  const [agentResult] = await Promise.all([
    sql`UPDATE agents SET persona = ${sanitized}, updated_at = NOW()
        WHERE id = ${agentId} AND org_id = ${orgId} RETURNING *`,
    sql`UPDATE evaluations SET applied = true, applied_at = NOW()
        WHERE id = ${evalId}`
  ])

  return json({
    agent: agentResult[0],
    evaluation_id: evalId,
    message: 'Persona updated and action item marked as applied. Run /deploy-agents to sync agent files.'
  })
}

export const config: Config = {
  path: '/api/agents/:id'
}
