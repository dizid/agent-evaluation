// Server-side scoring utilities — mirrors src/services/scoring.js

const UNIVERSAL_WEIGHT = 0.6
const ROLE_WEIGHT = 0.4

export const UNIVERSAL_CRITERIA = [
  'task_completion',
  'accuracy',
  'efficiency',
  'judgment',
  'communication',
  'domain_expertise',
  'autonomy',
  'safety'
]

// Average of numeric values, ignoring null/undefined
function avg(values: (number | null | undefined)[]): number | null {
  const valid = values.filter((v): v is number => v != null && !isNaN(v))
  if (valid.length === 0) return null
  return valid.reduce((sum, v) => sum + v, 0) / valid.length
}

// Calculate overall score from evaluation scores
// scores: { task_completion: 9, accuracy: 8, ..., code_quality: 7, ... }
// kpiNames: ['code_quality', 'first_pass_success', ...]
export function calculateOverall(
  scores: Record<string, number>,
  kpiNames: string[] = []
): number | null {
  const universalScores = UNIVERSAL_CRITERIA.map(k => scores[k]).filter(v => v != null)
  const roleScores = kpiNames.map(k => scores[k]).filter(v => v != null)

  const universalAvg = avg(universalScores)
  const roleAvg = avg(roleScores)

  if (universalAvg == null) return null
  if (roleAvg == null) return universalAvg

  return Number(((universalAvg * UNIVERSAL_WEIGHT) + (roleAvg * ROLE_WEIGHT)).toFixed(1))
}

// Calculate universal and role averages separately
export function calculateAverages(
  scores: Record<string, number>,
  kpiNames: string[] = []
): { universalAvg: number | null; roleAvg: number | null } {
  const universalScores = UNIVERSAL_CRITERIA.map(k => scores[k]).filter(v => v != null)
  const roleScores = kpiNames.map(k => scores[k]).filter(v => v != null)
  return {
    universalAvg: avg(universalScores),
    roleAvg: avg(roleScores)
  }
}

// Bayesian smoothing: pulls scores toward midpoint (6.0) until enough evaluations
// v = number of evals, R = raw average, m = min evals for full weight, C = prior
export function bayesianScore(v: number, R: number, m = 5, C = 6.0): number {
  return Number((((v / (v + m)) * R) + ((m / (v + m)) * C)).toFixed(1))
}

// Rating label from score
export function getRatingLabel(score: number | null): string | null {
  if (score == null) return null
  if (score >= 9) return 'Elite'
  if (score >= 7) return 'Strong'
  if (score >= 5) return 'Adequate'
  if (score >= 3) return 'Weak'
  return 'Failing'
}

// Confidence badge from evaluation count
export function getConfidence(evalCount: number): string | null {
  if (evalCount >= 10) return 'Established'
  if (evalCount >= 3) return 'Early'
  if (evalCount >= 1) return 'New'
  return null
}

// Anti-gaming: check if scores are suspiciously uniform (all within 1 point)
export function isLowEffort(scores: Record<string, number>): boolean {
  const values = Object.values(scores).filter((v): v is number => v != null && !isNaN(v))
  if (values.length < 3) return false
  const min = Math.min(...values)
  const max = Math.max(...values)
  return (max - min) <= 1
}

// Anti-gaming: extreme scores (9-10 or 1-3) need justification notes
export function needsJustification(score: number): boolean {
  return score >= 9 || score <= 3
}

// Determine trend by comparing new score to previous overall
export function calculateTrend(newScore: number, previousScore: number | null): string {
  if (previousScore == null) return 'stable'
  const diff = newScore - previousScore
  if (diff >= 0.5) return 'up'
  if (diff <= -0.5) return 'down'
  return 'stable'
}
