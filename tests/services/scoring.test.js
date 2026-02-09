import { describe, it, expect } from 'vitest'
import {
  calculateOverall,
  bayesianScore,
  getRatingLabel,
  getConfidence,
  getScoreColor,
  getScoreBgColor,
  getDeptColor,
  isLowEffort,
  needsJustification,
  UNIVERSAL_CRITERIA
} from '@/services/scoring'

// ─── calculateOverall ────────────────────────────────────────────────

describe('calculateOverall', () => {
  it('calculates weighted average with 8 universal + 3 KPI scores', () => {
    const scores = {
      task_completion: 8, accuracy: 7, efficiency: 6, judgment: 7,
      communication: 8, domain_expertise: 9, autonomy: 7, safety: 8,
      code_quality: 9, first_pass_success: 8, tool_usage: 7
    }
    const kpis = ['code_quality', 'first_pass_success', 'tool_usage']

    // Universal avg = (8+7+6+7+8+9+7+8)/8 = 60/8 = 7.5
    // KPI avg = (9+8+7)/3 = 24/3 = 8.0
    // Overall = 7.5*0.6 + 8.0*0.4 = 4.5 + 3.2 = 7.7
    const result = calculateOverall(scores, kpis)
    expect(result).toBe(7.7)
  })

  it('uses only universal score when no KPIs provided', () => {
    const scores = {
      task_completion: 8, accuracy: 8, efficiency: 8, judgment: 8,
      communication: 8, domain_expertise: 8, autonomy: 8, safety: 8
    }

    // Universal avg = 8.0, no KPIs → returns 8.0
    const result = calculateOverall(scores)
    expect(result).toBe(8)
  })

  it('uses only universal score when KPI array is empty', () => {
    const scores = {
      task_completion: 6, accuracy: 7, efficiency: 5, judgment: 6,
      communication: 7, domain_expertise: 8, autonomy: 5, safety: 6
    }

    // avg = (6+7+5+6+7+8+5+6)/8 = 50/8 = 6.25
    const result = calculateOverall(scores, [])
    expect(result).toBe(6.25)
  })

  it('returns null with empty scores object', () => {
    expect(calculateOverall({})).toBeNull()
    expect(calculateOverall({}, ['code_quality'])).toBeNull()
  })

  it('ignores missing criteria scores in universal average', () => {
    // Only 4 universal scores provided
    const scores = {
      task_completion: 10, accuracy: 10, efficiency: 10, judgment: 10
    }
    // avg of available = 10.0
    const result = calculateOverall(scores)
    expect(result).toBe(10)
  })

  it('handles KPIs with missing scores', () => {
    const scores = {
      task_completion: 8, accuracy: 8, efficiency: 8, judgment: 8,
      communication: 8, domain_expertise: 8, autonomy: 8, safety: 8,
      code_quality: 10
    }
    // KPI list has 3, but only 1 has a score
    const kpis = ['code_quality', 'missing_kpi_1', 'missing_kpi_2']

    // Universal avg = 8.0, KPI avg = 10.0
    // 8.0*0.6 + 10.0*0.4 = 4.8 + 4.0 = 8.8
    const result = calculateOverall(scores, kpis)
    expect(result).toBe(8.8)
  })

  it('returns universal-only when all KPI names have no scores', () => {
    const scores = {
      task_completion: 5, accuracy: 5, efficiency: 5, judgment: 5,
      communication: 5, domain_expertise: 5, autonomy: 5, safety: 5
    }
    const kpis = ['nonexistent_a', 'nonexistent_b']

    // No KPI scores found → returns universal avg = 5.0
    expect(calculateOverall(scores, kpis)).toBe(5)
  })

  it('rounds to one decimal place', () => {
    const scores = {
      task_completion: 7, accuracy: 8, efficiency: 6, judgment: 7,
      communication: 9, domain_expertise: 8, autonomy: 6, safety: 7,
      kpi_a: 8, kpi_b: 9
    }
    // Universal avg = (7+8+6+7+9+8+6+7)/8 = 58/8 = 7.25
    // KPI avg = (8+9)/2 = 8.5
    // Overall = 7.25*0.6 + 8.5*0.4 = 4.35 + 3.4 = 7.75
    const result = calculateOverall(scores, ['kpi_a', 'kpi_b'])
    expect(result).toBe(7.8) // toFixed(1) rounds 7.75 → 7.8
  })
})

// ─── bayesianScore ───────────────────────────────────────────────────

describe('bayesianScore', () => {
  it('returns prior (6.0) when 0 evaluations', () => {
    expect(bayesianScore(0, 9.0)).toBe(6.0)
  })

  it('returns midpoint between raw and prior at m evaluations', () => {
    // v=5, m=5: (5/10)*R + (5/10)*6.0 = 0.5*R + 3.0
    // R=8.0 → 4.0 + 3.0 = 7.0
    expect(bayesianScore(5, 8.0)).toBe(7.0)
  })

  it('converges toward raw score with many evaluations', () => {
    // v=100, m=5: (100/105)*9.0 + (5/105)*6.0 ≈ 8.571 + 0.286 ≈ 8.9
    const result = bayesianScore(100, 9.0)
    expect(result).toBeGreaterThan(8.5)
    expect(result).toBeLessThanOrEqual(9.0)
  })

  it('returns prior when raw score equals prior', () => {
    expect(bayesianScore(0, 6.0)).toBe(6.0)
    expect(bayesianScore(5, 6.0)).toBe(6.0)
    expect(bayesianScore(100, 6.0)).toBe(6.0)
  })

  it('pulls low scores up toward prior', () => {
    // v=1, m=5: (1/6)*2.0 + (5/6)*6.0 = 0.333 + 5.0 = 5.3
    const result = bayesianScore(1, 2.0)
    expect(result).toBeGreaterThan(2.0)
    expect(result).toBeLessThan(6.0)
  })

  it('pulls high scores down toward prior', () => {
    // v=1, m=5: (1/6)*10.0 + (5/6)*6.0 = 1.667 + 5.0 = 6.7
    const result = bayesianScore(1, 10.0)
    expect(result).toBeLessThan(10.0)
    expect(result).toBeGreaterThan(6.0)
  })

  it('accepts custom m and C parameters', () => {
    // m=10, C=5.0, v=10, R=8.0
    // (10/20)*8.0 + (10/20)*5.0 = 4.0 + 2.5 = 6.5
    expect(bayesianScore(10, 8.0, 10, 5.0)).toBe(6.5)
  })

  it('rounds to one decimal place', () => {
    // v=3, m=5: (3/8)*7.0 + (5/8)*6.0 = 2.625 + 3.75 = 6.375 → 6.4
    expect(bayesianScore(3, 7.0)).toBe(6.4)
  })
})

// ─── getRatingLabel ──────────────────────────────────────────────────

describe('getRatingLabel', () => {
  it('returns Elite for scores 9.0+', () => {
    expect(getRatingLabel(9.0)).toBe('Elite')
    expect(getRatingLabel(9.5)).toBe('Elite')
    expect(getRatingLabel(10.0)).toBe('Elite')
  })

  it('returns Strong for scores 7.0-8.9', () => {
    expect(getRatingLabel(7.0)).toBe('Strong')
    expect(getRatingLabel(8.0)).toBe('Strong')
    expect(getRatingLabel(8.9)).toBe('Strong')
  })

  it('returns Adequate for scores 5.0-6.9', () => {
    expect(getRatingLabel(5.0)).toBe('Adequate')
    expect(getRatingLabel(6.0)).toBe('Adequate')
    expect(getRatingLabel(6.9)).toBe('Adequate')
  })

  it('returns Weak for scores 3.0-4.9', () => {
    expect(getRatingLabel(3.0)).toBe('Weak')
    expect(getRatingLabel(4.0)).toBe('Weak')
    expect(getRatingLabel(4.9)).toBe('Weak')
  })

  it('returns Failing for scores below 3.0', () => {
    expect(getRatingLabel(2.9)).toBe('Failing')
    expect(getRatingLabel(1.0)).toBe('Failing')
    expect(getRatingLabel(0)).toBe('Failing')
  })

  it('returns null for null/undefined', () => {
    expect(getRatingLabel(null)).toBeNull()
    expect(getRatingLabel(undefined)).toBeNull()
  })

  // Boundary tests
  it('handles exact boundary at 9.0 (Elite)', () => {
    expect(getRatingLabel(9.0)).toBe('Elite')
    expect(getRatingLabel(8.99)).toBe('Strong')
  })

  it('handles exact boundary at 7.0 (Strong)', () => {
    expect(getRatingLabel(7.0)).toBe('Strong')
    expect(getRatingLabel(6.99)).toBe('Adequate')
  })

  it('handles exact boundary at 5.0 (Adequate)', () => {
    expect(getRatingLabel(5.0)).toBe('Adequate')
    expect(getRatingLabel(4.99)).toBe('Weak')
  })

  it('handles exact boundary at 3.0 (Weak)', () => {
    expect(getRatingLabel(3.0)).toBe('Weak')
    expect(getRatingLabel(2.99)).toBe('Failing')
  })
})

// ─── getScoreColor ───────────────────────────────────────────────────

describe('getScoreColor', () => {
  it('returns text-score-elite for 9.0+', () => {
    expect(getScoreColor(9.0)).toBe('text-score-elite')
    expect(getScoreColor(10)).toBe('text-score-elite')
  })

  it('returns text-score-strong for 7.0-8.9', () => {
    expect(getScoreColor(7.0)).toBe('text-score-strong')
    expect(getScoreColor(8.5)).toBe('text-score-strong')
  })

  it('returns text-score-adequate for 5.0-6.9', () => {
    expect(getScoreColor(5.0)).toBe('text-score-adequate')
    expect(getScoreColor(6.5)).toBe('text-score-adequate')
  })

  it('returns text-score-weak for 3.0-4.9', () => {
    expect(getScoreColor(3.0)).toBe('text-score-weak')
    expect(getScoreColor(4.0)).toBe('text-score-weak')
  })

  it('returns text-score-failing for below 3.0', () => {
    expect(getScoreColor(2.9)).toBe('text-score-failing')
    expect(getScoreColor(1.0)).toBe('text-score-failing')
  })

  it('returns text-text-muted for null/undefined', () => {
    expect(getScoreColor(null)).toBe('text-text-muted')
    expect(getScoreColor(undefined)).toBe('text-text-muted')
  })
})

// ─── getScoreBgColor ─────────────────────────────────────────────────

describe('getScoreBgColor', () => {
  it('returns correct bg class for each tier', () => {
    expect(getScoreBgColor(9.5)).toBe('bg-score-elite/10')
    expect(getScoreBgColor(7.5)).toBe('bg-score-strong/10')
    expect(getScoreBgColor(5.5)).toBe('bg-score-adequate/10')
    expect(getScoreBgColor(3.5)).toBe('bg-score-weak/10')
    expect(getScoreBgColor(1.5)).toBe('bg-score-failing/10')
  })

  it('returns bg-eval-card for null', () => {
    expect(getScoreBgColor(null)).toBe('bg-eval-card')
  })
})

// ─── getDeptColor ────────────────────────────────────────────────────

describe('getDeptColor', () => {
  it('returns correct color for each department', () => {
    expect(getDeptColor('development')).toBe('text-dept-dev')
    expect(getDeptColor('marketing')).toBe('text-dept-marketing')
    expect(getDeptColor('operations')).toBe('text-dept-ops')
    expect(getDeptColor('tools')).toBe('text-dept-tools')
    expect(getDeptColor('trading')).toBe('text-dept-trading')
  })

  it('returns text-text-secondary for unknown department', () => {
    expect(getDeptColor('unknown')).toBe('text-text-secondary')
    expect(getDeptColor('')).toBe('text-text-secondary')
    expect(getDeptColor(undefined)).toBe('text-text-secondary')
  })
})

// ─── getConfidence ───────────────────────────────────────────────────

describe('getConfidence', () => {
  it('returns null for 0 evaluations', () => {
    expect(getConfidence(0)).toBeNull()
  })

  it('returns New for 1-2 evaluations', () => {
    expect(getConfidence(1)).toBe('New')
    expect(getConfidence(2)).toBe('New')
  })

  it('returns Early for 3-9 evaluations', () => {
    expect(getConfidence(3)).toBe('Early')
    expect(getConfidence(5)).toBe('Early')
    expect(getConfidence(9)).toBe('Early')
  })

  it('returns Established for 10+ evaluations', () => {
    expect(getConfidence(10)).toBe('Established')
    expect(getConfidence(50)).toBe('Established')
  })
})

// ─── isLowEffort ─────────────────────────────────────────────────────

describe('isLowEffort', () => {
  it('returns true when all scores are identical', () => {
    expect(isLowEffort({
      task_completion: 7, accuracy: 7, efficiency: 7,
      judgment: 7, communication: 7
    })).toBe(true)
  })

  it('returns true when scores differ by exactly 1', () => {
    expect(isLowEffort({
      task_completion: 7, accuracy: 8, efficiency: 7,
      judgment: 8, communication: 7
    })).toBe(true)
  })

  it('returns false when scores vary by more than 1', () => {
    expect(isLowEffort({
      task_completion: 9, accuracy: 7, efficiency: 6,
      judgment: 8, communication: 5
    })).toBe(false)
  })

  it('returns false with fewer than 3 valid scores', () => {
    expect(isLowEffort({ task_completion: 7, accuracy: 7 })).toBe(false)
    expect(isLowEffort({ task_completion: 7 })).toBe(false)
    expect(isLowEffort({})).toBe(false)
  })

  it('ignores null/undefined values in scores', () => {
    expect(isLowEffort({
      task_completion: 7, accuracy: 7, efficiency: 7,
      judgment: null, communication: undefined
    })).toBe(true)
  })

  it('returns false when spread is just over 1', () => {
    expect(isLowEffort({
      task_completion: 7, accuracy: 7, efficiency: 7,
      judgment: 7, communication: 8.1
    })).toBe(false)
  })
})

// ─── needsJustification ─────────────────────────────────────────────

describe('needsJustification', () => {
  it('returns true for extreme high scores (9-10)', () => {
    expect(needsJustification(9)).toBe(true)
    expect(needsJustification(10)).toBe(true)
  })

  it('returns true for extreme low scores (1-3)', () => {
    expect(needsJustification(1)).toBe(true)
    expect(needsJustification(2)).toBe(true)
    expect(needsJustification(3)).toBe(true)
  })

  it('returns false for mid-range scores', () => {
    expect(needsJustification(4)).toBe(false)
    expect(needsJustification(5)).toBe(false)
    expect(needsJustification(7)).toBe(false)
    expect(needsJustification(8)).toBe(false)
    expect(needsJustification(8.9)).toBe(false)
  })

  it('returns false at boundary 3.1', () => {
    expect(needsJustification(3.1)).toBe(false)
  })

  it('returns true at boundary 8.99 → false, 9.0 → true', () => {
    expect(needsJustification(8.99)).toBe(false)
    expect(needsJustification(9.0)).toBe(true)
  })
})

// ─── UNIVERSAL_CRITERIA constant ─────────────────────────────────────

describe('UNIVERSAL_CRITERIA', () => {
  it('contains exactly 8 criteria', () => {
    expect(UNIVERSAL_CRITERIA).toHaveLength(8)
  })

  it('contains the expected criteria names', () => {
    expect(UNIVERSAL_CRITERIA).toEqual([
      'task_completion', 'accuracy', 'efficiency', 'judgment',
      'communication', 'domain_expertise', 'autonomy', 'safety'
    ])
  })
})
