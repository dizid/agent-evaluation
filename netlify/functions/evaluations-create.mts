import type { Config } from '@netlify/functions'
import { sql } from './utils/database.ts'
import { json, error, cors } from './utils/response.ts'
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

// Strip HTML tags from a string to prevent XSS
function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, '')
}

// Validate and sanitize an optional text field
function validateTextField(value: unknown, fieldName: string, maxLength: number): { valid: boolean; sanitized: string | null; error?: string } {
  if (value === undefined || value === null || value === '') return { valid: true, sanitized: null }
  if (typeof value !== 'string') return { valid: false, sanitized: null, error: `${fieldName} must be a string` }
  if (value.length > maxLength) return { valid: false, sanitized: null, error: `${fieldName} must be max ${maxLength} characters` }
  return { valid: true, sanitized: stripHtml(value) }
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return cors()
  if (req.method !== 'POST') return error('Method not allowed', 405)

  try {
    let body
    try {
      body = await req.json()
    } catch {
      return error('Request body must be valid JSON', 400)
    }

    // Validate required fields
    const { agent_id, scores, evaluator_type, task_description, top_strength, top_weakness, action_item, is_self_eval, project } = body
    if (!agent_id || !scores) {
      return error('agent_id and scores are required', 400)
    }

    // Validate agent_id format
    if (typeof agent_id !== 'string' || !/^[a-z0-9-]{2,50}$/.test(agent_id)) {
      return error('agent_id must be 2-50 lowercase alphanumeric characters or hyphens', 400)
    }

    // Validate evaluator_type
    const validEvaluatorTypes = ['self', 'auto', 'manual', 'community']
    if (evaluator_type && !validEvaluatorTypes.includes(evaluator_type)) {
      return error(`evaluator_type must be one of: ${validEvaluatorTypes.join(', ')}`, 400)
    }

    // Validate text field lengths and strip HTML
    const taskDescResult = validateTextField(task_description, 'task_description', 2000)
    if (!taskDescResult.valid) return error(taskDescResult.error!, 400)

    const actionItemResult = validateTextField(action_item, 'action_item', 500)
    if (!actionItemResult.valid) return error(actionItemResult.error!, 400)

    const topStrengthResult = validateTextField(top_strength, 'top_strength', 500)
    if (!topStrengthResult.valid) return error(topStrengthResult.error!, 400)

    const topWeaknessResult = validateTextField(top_weakness, 'top_weakness', 500)
    if (!topWeaknessResult.valid) return error(topWeaknessResult.error!, 400)

    // Validate project field: alphanumeric + dots + hyphens + underscores, max 100 chars (or empty)
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

    // Validate scores: must be integers 1-10, at least one required, max 20 entries
    if (typeof scores !== 'object' || scores === null || Array.isArray(scores)) {
      return error('scores must be an object', 400)
    }
    const scoreEntries = Object.entries(scores)
    if (scoreEntries.length === 0) {
      return error('At least one score is required', 400)
    }
    if (scoreEntries.length > 20) {
      return error('Too many score entries (max 20)', 400)
    }
    for (const [key, value] of scoreEntries) {
      if (typeof value !== 'number' || value < 1 || value > 10 || !Number.isInteger(value)) {
        return error(`Score "${key}" must be an integer between 1 and 10`, 400)
      }
    }

    // Verify agent exists and get KPI definitions
    const agents = await sql`SELECT * FROM agents WHERE id = ${agent_id}`
    if (agents.length === 0) {
      return error('Agent not found', 404)
    }
    const agent = agents[0]
    const kpiNames: string[] = agent.kpi_definitions || []

    // --- Anti-gaming pipeline ---

    // 1. Tag self-eval (frontend sends evaluator_type='self' or is_self_eval=true)
    const selfEval = is_self_eval === true || evaluator_type === 'self'

    // 2. Determine weight — lowest applicable wins
    // Hierarchy: low-effort 0.5 < auto 0.7 < self 0.8 < manual/community 1.0
    const autoEval = evaluator_type === 'auto'
    let weight = 1.0
    if (isLowEffort(scores)) weight = 0.5
    else if (autoEval) weight = 0.7
    else if (selfEval) weight = 0.8

    // 3. Check extreme scores without per-criterion justification — cap/floor them
    // Each extreme score (9+ or 3-) needs its own notes[key] entry to stay uncapped
    const adjustedScores = { ...scores }
    const notes: Record<string, string> = body.notes || {}
    for (const [key, value] of Object.entries(adjustedScores)) {
      if (typeof value !== 'number') continue
      if (needsJustification(value as number) && !notes[key]) {
        if ((value as number) >= 9) {
          adjustedScores[key] = 8
        } else if ((value as number) <= 3) {
          adjustedScores[key] = 4
        }
      }
    }

    // 4. Calculate averages and overall score
    const { universalAvg, roleAvg } = calculateAverages(adjustedScores, kpiNames)
    const overall = calculateOverall(adjustedScores, kpiNames)
    const ratingLabel = getRatingLabel(overall)

    // 5. Store evaluation (use sanitized text fields)
    const evalResult = await sql`
      INSERT INTO evaluations (
        agent_id, evaluator_type, task_description, scores,
        universal_avg, role_avg, overall, rating_label,
        top_strength, top_weakness, action_item,
        is_self_eval, weight, project
      ) VALUES (
        ${agent_id},
        ${evaluator_type || 'manual'},
        ${taskDescResult.sanitized},
        ${JSON.stringify(adjustedScores)},
        ${universalAvg},
        ${roleAvg},
        ${overall},
        ${ratingLabel},
        ${topStrengthResult.sanitized},
        ${topWeaknessResult.sanitized},
        ${actionItemResult.sanitized},
        ${selfEval},
        ${weight},
        ${sanitizedProject}
      )
      RETURNING *
    `
    const evaluation = evalResult[0]

    // 6. Recalculate agent's overall score (weighted average)
    const allEvals = await sql`
      SELECT overall, weight FROM evaluations
      WHERE agent_id = ${agent_id} AND overall IS NOT NULL
      ORDER BY created_at DESC
    `

    let rawAvg = overall ?? 0
    if (allEvals.length > 0) {
      const totalWeight = allEvals.reduce((sum: number, e: any) => sum + (parseFloat(e.weight) || 1), 0)
      const weightedSum = allEvals.reduce((sum: number, e: any) => sum + (parseFloat(e.overall) * (parseFloat(e.weight) || 1)), 0)
      rawAvg = weightedSum / totalWeight
    }

    const evalCount = allEvals.length
    // Apply Bayesian smoothing: pulls toward 6.0 midpoint until enough evaluations (m=5)
    const smoothedScore = bayesianScore(evalCount, rawAvg, 5, 6.0)
    const agentRatingLabel = getRatingLabel(smoothedScore)
    const confidence = getConfidence(evalCount)

    // 7. Determine trend
    const previousScore = agent.overall_score ? parseFloat(agent.overall_score) : null
    const trend = calculateTrend(smoothedScore, previousScore)

    // Update agent record
    await sql`
      UPDATE agents SET
        overall_score = ${smoothedScore},
        rating_label = ${agentRatingLabel},
        eval_count = ${evalCount},
        confidence = ${confidence},
        trend = ${trend}
      WHERE id = ${agent_id}
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
