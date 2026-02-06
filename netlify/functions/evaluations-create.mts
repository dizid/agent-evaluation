import type { Config } from '@netlify/functions'
import { sql } from './utils/database.ts'
import { json, error, cors } from './utils/response.ts'
import {
  UNIVERSAL_CRITERIA,
  calculateOverall,
  calculateAverages,
  bayesianScore,
  getRatingLabel,
  getConfidence,
  isLowEffort,
  needsJustification,
  calculateTrend
} from './utils/scoring.ts'

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return cors()
  if (req.method !== 'POST') return error('Method not allowed', 405)

  try {
    const body = await req.json()

    // Validate required fields
    const { agent_id, scores, evaluator_type, task_description, top_strength, top_weakness, action_item, is_self_eval } = body
    if (!agent_id || !scores) {
      return error('agent_id and scores are required', 400)
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

    // 2. Check variance — all scores within 1 point = low effort, weight 0.5
    let weight = selfEval ? 0.8 : 1.0
    if (isLowEffort(scores)) {
      weight = 0.5
    }

    // 3. Check extreme scores without notes — cap/floor them
    const adjustedScores = { ...scores }
    const notes: Record<string, string> = body.notes || {}
    for (const [key, value] of Object.entries(adjustedScores)) {
      if (typeof value !== 'number') continue
      if (needsJustification(value as number) && !notes[key]) {
        // Cap high scores to 8, floor low scores to 4 when no justification given
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

    // 5. Store evaluation
    const evalResult = await sql`
      INSERT INTO evaluations (
        agent_id, evaluator_type, task_description, scores,
        universal_avg, role_avg, overall, rating_label,
        top_strength, top_weakness, action_item,
        is_self_eval, weight
      ) VALUES (
        ${agent_id},
        ${evaluator_type || 'manual'},
        ${task_description || null},
        ${JSON.stringify(adjustedScores)},
        ${universalAvg},
        ${roleAvg},
        ${overall},
        ${ratingLabel},
        ${top_strength || null},
        ${top_weakness || null},
        ${action_item || null},
        ${selfEval},
        ${weight}
      )
      RETURNING *
    `
    const evaluation = evalResult[0]

    // 6. Recalculate agent's overall score using Bayesian smoothing
    // Get all evaluations for this agent (weighted average)
    const allEvals = await sql`
      SELECT overall, weight FROM evaluations
      WHERE agent_id = ${agent_id} AND overall IS NOT NULL
      ORDER BY created_at DESC
    `

    let rawAvg = overall || 0
    if (allEvals.length > 0) {
      const totalWeight = allEvals.reduce((sum: number, e: any) => sum + (parseFloat(e.weight) || 1), 0)
      const weightedSum = allEvals.reduce((sum: number, e: any) => sum + (parseFloat(e.overall) * (parseFloat(e.weight) || 1)), 0)
      rawAvg = weightedSum / totalWeight
    }

    const evalCount = allEvals.length
    const smoothedScore = bayesianScore(evalCount, rawAvg)
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
    }, 201)
  } catch (err) {
    console.error('evaluations-create error:', err)
    return error('Failed to create evaluation', 500)
  }
}

export const config: Config = {
  path: '/api/evaluations'
}
