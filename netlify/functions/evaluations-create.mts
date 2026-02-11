import type { Config } from '@netlify/functions'
import { sql } from './utils/database.ts'
import { json, error, cors } from './utils/response.ts'
import { authenticate, authorize } from './utils/auth.ts'
import {
  UNIVERSAL_CRITERIA,
  calculateOverall,
  calculateAverages,
  getRatingLabel,
  getConfidence,
  isLowEffort,
  needsJustification,
  calculateTrend,
  bayesianScore
} from './utils/scoring.ts'

function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, '')
}

function validateTextField(value: unknown, fieldName: string, maxLength: number): { valid: boolean; sanitized: string | null; error?: string } {
  if (value === undefined || value === null || value === '') return { valid: true, sanitized: null }
  if (typeof value !== 'string') return { valid: false, sanitized: null, error: `${fieldName} must be a string` }
  if (value.length > maxLength) return { valid: false, sanitized: null, error: `${fieldName} must be max ${maxLength} characters` }
  return { valid: true, sanitized: stripHtml(value) }
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return cors()
  if (req.method !== 'POST') return error('Method not allowed', 405)

  // Require auth + evaluator role
  const ctx = await authenticate(req)
  if (ctx instanceof Response) return ctx
  if (!authorize(ctx, 'evaluator')) return error('Forbidden: evaluator role required', 403)

  try {
    let body
    try {
      body = await req.json()
    } catch {
      return error('Request body must be valid JSON', 400)
    }

    const { agent_id, scores, task_description, top_strength, top_weakness, action_item, is_self_eval, project } = body
    if (!agent_id || !scores) {
      return error('agent_id and scores are required', 400)
    }

    if (typeof agent_id !== 'string' || !/^[a-z0-9-]{2,50}$/.test(agent_id)) {
      return error('agent_id must be 2-50 lowercase alphanumeric characters or hyphens', 400)
    }

    // Derive evaluator_type server-side to prevent weight spoofing
    const isServiceKey = ctx.clerkUserId === 'service'
    const evaluator_type = isServiceKey ? 'auto' : (is_self_eval === true ? 'self' : 'manual')

    const taskDescResult = validateTextField(task_description, 'task_description', 2000)
    if (!taskDescResult.valid) return error(taskDescResult.error!, 400)

    const actionItemResult = validateTextField(action_item, 'action_item', 500)
    if (!actionItemResult.valid) return error(actionItemResult.error!, 400)

    const topStrengthResult = validateTextField(top_strength, 'top_strength', 500)
    if (!topStrengthResult.valid) return error(topStrengthResult.error!, 400)

    const topWeaknessResult = validateTextField(top_weakness, 'top_weakness', 500)
    if (!topWeaknessResult.valid) return error(topWeaknessResult.error!, 400)

    let sanitizedProject: string | null = null
    if (project !== undefined && project !== null && project !== '') {
      if (typeof project !== 'string' || project.length > 100) {
        return error('project must be a string of max 100 characters', 400)
      }
      if (!/^[a-zA-Z0-9._-]+$/.test(project)) {
        return error('project must contain only alphanumeric characters, dots, hyphens, and underscores', 400)
      }
      sanitizedProject = project
    }

    if (typeof scores !== 'object' || scores === null || Array.isArray(scores)) {
      return error('scores must be an object', 400)
    }
    const scoreEntries = Object.entries(scores)
    if (scoreEntries.length === 0) return error('At least one score is required', 400)
    if (scoreEntries.length > 20) return error('Too many score entries (max 20)', 400)

    for (const [key, value] of scoreEntries) {
      if (typeof value !== 'number' || value < 1 || value > 10 || !Number.isInteger(value)) {
        return error(`Score "${key}" must be an integer between 1 and 10`, 400)
      }
    }

    // Verify agent exists in caller's org
    const agents = await sql`SELECT * FROM agents WHERE id = ${agent_id} AND org_id = ${ctx.orgId}`
    if (agents.length === 0) {
      return error('Agent not found in your organization', 404)
    }
    const agent = agents[0]
    const kpiNames: string[] = agent.kpi_definitions || []

    // --- Anti-gaming pipeline ---
    const selfEval = is_self_eval === true || evaluator_type === 'self'
    const autoEval = evaluator_type === 'auto'
    let weight = 1.0
    if (isLowEffort(scores)) weight = 0.5
    else if (autoEval) weight = 0.7
    else if (selfEval) weight = 0.8

    const adjustedScores = { ...scores }
    const notes: Record<string, string> = body.notes || {}
    for (const [key, value] of Object.entries(adjustedScores)) {
      if (typeof value !== 'number') continue
      if (needsJustification(value as number) && !notes[key]) {
        if ((value as number) >= 9) adjustedScores[key] = 8
        else if ((value as number) <= 3) adjustedScores[key] = 4
      }
    }

    const { universalAvg, roleAvg } = calculateAverages(adjustedScores, kpiNames)
    const overall = calculateOverall(adjustedScores, kpiNames)
    const ratingLabel = getRatingLabel(overall)

    // Store evaluation with org_id + evaluator_user_id
    const evalResult = await sql`
      INSERT INTO evaluations (
        agent_id, org_id, evaluator_user_id, evaluator_type, task_description, scores,
        universal_avg, role_avg, overall, rating_label,
        top_strength, top_weakness, action_item,
        is_self_eval, weight, project
      ) VALUES (
        ${agent_id}, ${ctx.orgId}, ${ctx.userId},
        ${evaluator_type || 'manual'},
        ${taskDescResult.sanitized},
        ${JSON.stringify(adjustedScores)},
        ${universalAvg}, ${roleAvg}, ${overall}, ${ratingLabel},
        ${topStrengthResult.sanitized}, ${topWeaknessResult.sanitized},
        ${actionItemResult.sanitized},
        ${selfEval}, ${weight}, ${sanitizedProject}
      )
      RETURNING *
    `
    const evaluation = evalResult[0]

    // Recalculate agent's overall score (scoped to org)
    const allEvals = await sql`
      SELECT overall, weight FROM evaluations
      WHERE agent_id = ${agent_id} AND org_id = ${ctx.orgId} AND overall IS NOT NULL
      ORDER BY created_at DESC
    `

    let rawAvg = overall ?? 0
    if (allEvals.length > 0) {
      const totalWeight = allEvals.reduce((sum: number, e: any) => sum + (parseFloat(e.weight) || 1), 0)
      const weightedSum = allEvals.reduce((sum: number, e: any) => sum + (parseFloat(e.overall) * (parseFloat(e.weight) || 1)), 0)
      rawAvg = weightedSum / totalWeight
    }

    const evalCount = allEvals.length
    const smoothedScore = bayesianScore(evalCount, rawAvg, 5, 6.0)
    const agentRatingLabel = getRatingLabel(smoothedScore)
    const confidence = getConfidence(evalCount)

    const previousScore = agent.overall_score ? parseFloat(agent.overall_score) : null
    const trend = calculateTrend(smoothedScore, previousScore)

    await sql`
      UPDATE agents SET
        overall_score = ${smoothedScore}, rating_label = ${agentRatingLabel},
        eval_count = ${evalCount}, confidence = ${confidence}, trend = ${trend}
      WHERE id = ${agent_id} AND org_id = ${ctx.orgId}
    `

    return json({
      evaluation,
      agent_score_updated: true,
      agent_summary: {
        overall_score: smoothedScore,
        rating_label: agentRatingLabel,
        eval_count: evalCount,
        confidence,
        trend
      }
    }, 201, { 'Cache-Control': 'no-cache' })
  } catch (err) {
    console.error('evaluations-create error:', err)
    return error('Failed to create evaluation', 500)
  }
}

export const config: Config = {
  path: '/api/evaluations'
}
