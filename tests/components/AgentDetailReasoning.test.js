import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref, nextTick } from 'vue'

// Mock the API and router before importing the component
vi.mock('@/services/api', () => ({
  getAgent: vi.fn(),
  getAgentEvaluations: vi.fn()
}))

vi.mock('vue-router', () => ({
  useRoute: () => ({
    params: { id: 'fullstack' },
    path: '/agent/fullstack',
    query: {}
  }),
  useRouter: () => ({
    replace: vi.fn()
  }),
  RouterLink: {
    template: '<a><slot /></a>',
    props: ['to']
  }
}))

vi.mock('@/composables/useToast', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn()
  })
}))

// Mock heroicons — include all icons used by AgentDetail + child components (ScoreBreakdown, RatingLabel)
vi.mock('@heroicons/vue/24/outline', () => {
  const stub = { template: '<span />' }
  return {
    ArrowLeftIcon: stub,
    LightBulbIcon: stub,
    ChartBarIcon: stub,
    ClockIcon: stub,
    ChevronDownIcon: { template: '<span class="chevron" />' },
    PencilSquareIcon: stub,
    GlobeAltIcon: stub,
    CheckCircleIcon: stub,
    ShieldCheckIcon: stub,
    BoltIcon: stub,
    ScaleIcon: stub,
    ChatBubbleLeftRightIcon: stub,
    AcademicCapIcon: stub,
    CogIcon: stub,
    LockClosedIcon: stub
  }
})

// Stub all heroicons/20/solid using importOriginal (many icons across child components)
vi.mock(import('@heroicons/vue/20/solid'), async (importOriginal) => {
  const actual = await importOriginal()
  const stub = { template: '<span />' }
  const stubs = {}
  for (const key of Object.keys(actual)) {
    stubs[key] = stub
  }
  return stubs
})

// Mock vue-chartjs (TrendChart uses it, needs canvas context unavailable in happy-dom)
vi.mock('vue-chartjs', () => ({
  Line: { template: '<canvas />', props: ['data', 'options'] }
}))

// Mock chart.js registrations
vi.mock('chart.js', () => ({
  Chart: { register: vi.fn() },
  CategoryScale: {},
  LinearScale: {},
  PointElement: {},
  LineElement: {},
  Title: {},
  Tooltip: {},
  Legend: {},
  Filler: {}
}))

import AgentDetail from '@/views/AgentDetail.vue'
import { getAgent, getAgentEvaluations } from '@/services/api'

// Factory for agent data
function makeAgent(overrides = {}) {
  return {
    id: 'fullstack',
    name: 'FullStack',
    role: 'Full-stack developer',
    department: 'development',
    persona: 'Who: Full-stack developer',
    overall_score: '7.2',
    rating_label: 'Strong',
    eval_count: 5,
    confidence: 'Early',
    trend: 'up',
    status: 'active',
    source_type: 'dizid',
    kpi_definitions: ['code_quality', 'first_pass_success', 'error_recovery'],
    ...overrides
  }
}

// Factory for evaluation data
function makeEvaluation(overrides = {}) {
  return {
    id: 1,
    overall: 7.5,
    rating_label: 'Strong',
    evaluator_type: 'auto',
    created_at: '2026-02-15T10:30:00Z',
    scores: {
      task_completion: 8, accuracy: 7, efficiency: 7, judgment: 7,
      communication: 7, domain_expertise: 8, autonomy: 7, safety: 8,
      code_quality: 8, first_pass_success: 7, error_recovery: 7
    },
    task_description: 'Built a login form',
    top_strength: 'Clean architecture',
    top_weakness: 'Missing validation',
    action_item: 'Add input validation',
    reasoning: null,
    ...overrides
  }
}

describe('AgentDetail — Reasoning Section', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ─── latestReasoning computed ─────────────────────────────────

  describe('reasoning from latest evaluation', () => {
    it('shows reasoning when latest_evaluation has reasoning', async () => {
      const reasoningText = 'Task: Built a login form.\nOutcome: Completed successfully.\nEvidence: task_completion scored 8.'

      getAgent.mockResolvedValue({
        agent: makeAgent(),
        latest_evaluation: makeEvaluation({ reasoning: reasoningText })
      })
      getAgentEvaluations.mockResolvedValue([
        makeEvaluation({ reasoning: reasoningText })
      ])

      const wrapper = mount(AgentDetail)
      await flushPromises()

      // Should have a "Show AI reasoning" button
      const btn = wrapper.findAll('button').find(b => b.text().includes('AI reasoning'))
      expect(btn).toBeTruthy()
    })

    it('hides reasoning section when reasoning is null', async () => {
      getAgent.mockResolvedValue({
        agent: makeAgent(),
        latest_evaluation: makeEvaluation({ reasoning: null })
      })
      getAgentEvaluations.mockResolvedValue([
        makeEvaluation({ reasoning: null })
      ])

      const wrapper = mount(AgentDetail)
      await flushPromises()

      // Should NOT have a reasoning toggle button
      const btn = wrapper.findAll('button').find(b => b.text().includes('AI reasoning'))
      expect(btn).toBeUndefined()
    })

    it('falls back to first evaluation reasoning when latest has none', async () => {
      const reasoningText = 'Fallback reasoning from first eval'

      getAgent.mockResolvedValue({
        agent: makeAgent(),
        latest_evaluation: makeEvaluation({ reasoning: null })
      })
      getAgentEvaluations.mockResolvedValue([
        makeEvaluation({ id: 2, reasoning: reasoningText }),
        makeEvaluation({ id: 1, reasoning: null })
      ])

      const wrapper = mount(AgentDetail)
      await flushPromises()

      const btn = wrapper.findAll('button').find(b => b.text().includes('AI reasoning'))
      expect(btn).toBeTruthy()
    })

    it('hides reasoning when no evaluations at all', async () => {
      getAgent.mockResolvedValue({
        agent: makeAgent(),
        latest_evaluation: null
      })
      getAgentEvaluations.mockResolvedValue([])

      const wrapper = mount(AgentDetail)
      await flushPromises()

      const btn = wrapper.findAll('button').find(b => b.text().includes('AI reasoning'))
      expect(btn).toBeUndefined()
    })
  })

  // ─── Toggle behavior ──────────────────────────────────────────

  describe('reasoning toggle behavior', () => {
    it('expands and collapses reasoning on click', async () => {
      const reasoningText = 'Detailed reasoning trace here'

      getAgent.mockResolvedValue({
        agent: makeAgent(),
        latest_evaluation: makeEvaluation({ reasoning: reasoningText })
      })
      getAgentEvaluations.mockResolvedValue([
        makeEvaluation({ reasoning: reasoningText })
      ])

      const wrapper = mount(AgentDetail)
      await flushPromises()

      // Initially collapsed — no pre element
      expect(wrapper.findAll('pre').filter(p => p.text().includes(reasoningText)).length).toBe(0)

      // Click to expand
      const btn = wrapper.findAll('button').find(b => b.text().includes('Show AI reasoning'))
      await btn.trigger('click')
      await nextTick()

      // Now visible
      const pre = wrapper.findAll('pre').find(p => p.text().includes(reasoningText))
      expect(pre).toBeTruthy()
      expect(pre.classes()).toContain('whitespace-pre-wrap')

      // Button text changed
      expect(btn.text()).toContain('Hide AI reasoning')

      // Click to collapse
      await btn.trigger('click')
      await nextTick()

      expect(wrapper.findAll('pre').filter(p => p.text().includes(reasoningText)).length).toBe(0)
    })

    it('has correct aria-expanded attribute', async () => {
      const reasoningText = 'Test reasoning'

      getAgent.mockResolvedValue({
        agent: makeAgent(),
        latest_evaluation: makeEvaluation({ reasoning: reasoningText })
      })
      getAgentEvaluations.mockResolvedValue([
        makeEvaluation({ reasoning: reasoningText })
      ])

      const wrapper = mount(AgentDetail)
      await flushPromises()

      const btn = wrapper.findAll('button').find(b => b.text().includes('AI reasoning'))
      expect(btn.attributes('aria-expanded')).toBe('false')

      await btn.trigger('click')
      await nextTick()
      expect(btn.attributes('aria-expanded')).toBe('true')
    })
  })

  // ─── Backward compatibility ───────────────────────────────────

  describe('backward compatibility', () => {
    it('renders correctly with old evaluations (no reasoning field)', async () => {
      const oldEval = makeEvaluation()
      delete oldEval.reasoning

      getAgent.mockResolvedValue({
        agent: makeAgent(),
        latest_evaluation: oldEval
      })
      getAgentEvaluations.mockResolvedValue([oldEval])

      const wrapper = mount(AgentDetail)
      await flushPromises()

      // Should still render the score breakdown without errors
      expect(wrapper.text()).toContain('Latest Score Breakdown')

      // No reasoning toggle
      const btn = wrapper.findAll('button').find(b => b.text().includes('AI reasoning'))
      expect(btn).toBeUndefined()
    })
  })
})
