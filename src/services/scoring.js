// Scoring formula from FRAMEWORK.md
// Overall = (Universal Avg × 0.6) + (Role KPI Avg × 0.4)

const UNIVERSAL_WEIGHT = 0.6
const ROLE_WEIGHT = 0.4

// Universal criteria names
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

// Calculate average of numeric values, ignoring null/undefined
function avg(values) {
  const valid = values.filter(v => v != null && !isNaN(v))
  if (valid.length === 0) return null
  return valid.reduce((sum, v) => sum + v, 0) / valid.length
}

// Calculate overall score from evaluation scores object
// scores: { task_completion: 9, accuracy: 8, ..., code_quality: 7, ... }
// kpiNames: ['code_quality', 'first_pass_success', 'tool_usage', 'debugging_speed']
export function calculateOverall(scores, kpiNames = []) {
  const universalScores = UNIVERSAL_CRITERIA.map(k => scores[k]).filter(v => v != null)
  const roleScores = kpiNames.map(k => scores[k]).filter(v => v != null)

  const universalAvg = avg(universalScores)
  const roleAvg = avg(roleScores)

  if (universalAvg == null) return null

  // If no role KPIs, use universal only
  if (roleAvg == null) return universalAvg

  return Number(((universalAvg * UNIVERSAL_WEIGHT) + (roleAvg * ROLE_WEIGHT)).toFixed(1))
}

// Bayesian smoothing: pulls scores toward midpoint until enough data
// v = number of evaluations, m = minimum for full weight, R = raw avg, C = prior
export function bayesianScore(v, R, m = 5, C = 6.0) {
  return Number((((v / (v + m)) * R) + ((m / (v + m)) * C)).toFixed(1))
}

// Rating label from score
export function getRatingLabel(score) {
  if (score == null) return null
  if (score >= 9) return 'Elite'
  if (score >= 7) return 'Strong'
  if (score >= 5) return 'Adequate'
  if (score >= 3) return 'Weak'
  return 'Failing'
}

// Confidence badge from evaluation count
export function getConfidence(evalCount) {
  if (evalCount >= 10) return 'Established'
  if (evalCount >= 3) return 'Early'
  if (evalCount >= 1) return 'New'
  return null
}

// Score color class (Tailwind)
export function getScoreColor(score) {
  if (score == null) return 'text-text-muted'
  if (score >= 9) return 'text-score-elite'
  if (score >= 7) return 'text-score-strong'
  if (score >= 5) return 'text-score-adequate'
  if (score >= 3) return 'text-score-weak'
  return 'text-score-failing'
}

// Score background color class
export function getScoreBgColor(score) {
  if (score == null) return 'bg-eval-card'
  if (score >= 9) return 'bg-score-elite/10'
  if (score >= 7) return 'bg-score-strong/10'
  if (score >= 5) return 'bg-score-adequate/10'
  if (score >= 3) return 'bg-score-weak/10'
  return 'bg-score-failing/10'
}

// Department color class
export function getDeptColor(department) {
  switch (department) {
    case 'development': return 'text-dept-dev'
    case 'marketing': return 'text-dept-marketing'
    case 'operations': return 'text-dept-ops'
    case 'tools': return 'text-dept-tools'
    case 'trading': return 'text-dept-trading'
    default: return 'text-text-secondary'
  }
}

// Anti-gaming: check if scores are suspiciously uniform (within 1 point)
export function isLowEffort(scores) {
  const values = Object.values(scores).filter(v => v != null && !isNaN(v))
  if (values.length < 3) return false
  const min = Math.min(...values)
  const max = Math.max(...values)
  return (max - min) <= 1
}

// Anti-gaming: check if extreme scores (9-10 or 1-3) have notes
export function needsJustification(score) {
  return score >= 9 || score <= 3
}
