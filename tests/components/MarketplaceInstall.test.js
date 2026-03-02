/**
 * MarketplaceInstall.test.js
 *
 * Tests for the MarketplaceInstall.vue multi-step install wizard.
 * New flow: Customize (1) → Confirm (2) → Complete (3)
 * Covers loading state, template rendering, agent ID validation, and error handling.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

// --- Mock heroicons before importing the component ---
vi.mock('@heroicons/vue/24/outline', () => {
  const stub = { template: '<span />' }
  return {
    ArrowLeftIcon: stub,
    CheckIcon: stub,
    ArrowRightIcon: stub,
    ArrowDownTrayIcon: stub,
    ChevronDownIcon: stub
  }
})

// --- Mock vue-router ---
const mockPush = vi.fn()
vi.mock('vue-router', () => ({
  useRoute: vi.fn(() => ({ params: { id: 'test-template' } })),
  useRouter: vi.fn(() => ({ push: mockPush })),
  RouterLink: { template: '<a><slot /></a>' }
}))

// --- Mock API service ---
const mockGetMarketplaceTemplate = vi.fn()
const mockInstallTemplate = vi.fn()
const mockGetDepartments = vi.fn()

vi.mock('@/services/api', () => ({
  getMarketplaceTemplate: (...args) => mockGetMarketplaceTemplate(...args),
  installTemplate: (...args) => mockInstallTemplate(...args),
  getDepartments: (...args) => mockGetDepartments(...args)
}))

// --- Mock composables ---
const mockToastSuccess = vi.fn()
const mockToastError = vi.fn()
vi.mock('@/composables/useToast', () => ({
  useToast: () => ({
    success: mockToastSuccess,
    error: mockToastError
  })
}))

vi.mock('@/composables/useOrgContext', () => ({
  useOrgContext: () => ({
    currentOrg: { name: 'Test Organization', slug: 'test-org' },
    orgSlug: { value: 'test-org' }
  })
}))

vi.mock('@/composables/useOnboardingChecklist', () => ({
  useOnboardingChecklist: () => ({
    completeStep: vi.fn(),
    checklistState: {},
    isChecklistVisible: false,
    dismissChecklist: vi.fn()
  })
}))

import MarketplaceInstall from '@/views/marketplace/MarketplaceInstall.vue'

// ─── Test fixtures ───────────────────────────────────────────────────────────

const MOCK_TEMPLATE = {
  id: 'test-template',
  name: 'Test Agent Template',
  role: 'Test specialist agent',
  description: 'A great template for testing workflows.',
  category: 'development',
  persona: 'You are a test agent. You specialize in writing tests.',
  kpi_definitions: ['test_coverage', 'bug_detection'],
  install_count: 42,
  avg_rating: 4.5
}

const MOCK_DEPARTMENTS = [
  { id: 'dept-uuid-1', name: 'Development', slug: 'development' },
  { id: 'dept-uuid-2', name: 'Marketing', slug: 'marketing' }
]

const MOCK_INSTALLED_AGENT = {
  id: 'test-template',
  name: 'Test Agent Template',
  role: 'Test specialist agent',
  persona: 'You are a test agent. You specialize in writing tests.',
  status: 'active',
  source_type: 'template',
  template_id: 'test-template'
}

/**
 * Mount the component with happy-path API mocks already resolved.
 * Returns the wrapper after onMounted has settled.
 */
async function mountAndLoad(templateOverride = {}, deptOverride = null) {
  mockGetMarketplaceTemplate.mockResolvedValue({
    template: { ...MOCK_TEMPLATE, ...templateOverride }
  })
  mockGetDepartments.mockResolvedValue({
    departments: deptOverride ?? MOCK_DEPARTMENTS
  })

  const wrapper = mount(MarketplaceInstall, {
    global: {
      stubs: {
        RouterLink: { template: '<a><slot /></a>' }
      }
    }
  })

  await flushPromises()
  return wrapper
}

/**
 * Helper: advance from step 1 (Customize) to step 2 (Confirm).
 * Step 1 has pre-filled valid inputs, so Next should work.
 */
async function advanceToConfirm(wrapper) {
  const nextBtn = wrapper.findAll('button').find(b => b.text().includes('Next'))
  await nextBtn.trigger('click')
  return wrapper
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('MarketplaceInstall', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ─── Loading state ────────────────────────────────────────────────────────

  describe('loading state', () => {
    it('renders a loading skeleton while data is fetching', () => {
      // Return a promise that never resolves so we stay in loading state
      mockGetMarketplaceTemplate.mockReturnValue(new Promise(() => {}))
      mockGetDepartments.mockReturnValue(new Promise(() => {}))

      const wrapper = mount(MarketplaceInstall, {
        global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } }
      })

      // The loading skeleton has animate-pulse class
      const skeletonEl = wrapper.find('.animate-pulse')
      expect(skeletonEl.exists()).toBe(true)
    })

    it('hides the loading skeleton after data loads', async () => {
      const wrapper = await mountAndLoad()

      const skeletonEl = wrapper.find('.animate-pulse')
      expect(skeletonEl.exists()).toBe(false)
    })
  })

  // ─── Template name rendering (step 1 = Customize, shows template summary) ─

  describe('template info on step 1', () => {
    it('displays the template name in step 1', async () => {
      const wrapper = await mountAndLoad()

      expect(wrapper.text()).toContain('Test Agent Template')
    })

    it('displays the template role description', async () => {
      const wrapper = await mountAndLoad()

      expect(wrapper.text()).toContain('Test specialist agent')
    })

    it('displays the install count', async () => {
      const wrapper = await mountAndLoad()

      expect(wrapper.text()).toContain('42')
    })
  })

  // ─── Agent ID pre-fill (inputs are on step 1 now) ─────────────────────────

  describe('agent ID pre-fill', () => {
    it('pre-fills agentId input from the template ID', async () => {
      const wrapper = await mountAndLoad()

      // Step 1 shows inputs directly — no need to click Next
      const agentIdInput = wrapper.find('#agentId')
      expect(agentIdInput.element.value).toBe('test-template')
    })

    it('pre-fills display name from the template name', async () => {
      const wrapper = await mountAndLoad()

      const displayNameInput = wrapper.find('#displayName')
      expect(displayNameInput.element.value).toBe('Test Agent Template')
    })

    it('pre-fills persona from the template persona', async () => {
      const wrapper = await mountAndLoad()

      const personaTextarea = wrapper.find('#persona')
      expect(personaTextarea.element.value).toContain('You are a test agent')
    })

    it('pre-selects department matching template category slug', async () => {
      const wrapper = await mountAndLoad()

      // The template category is 'development' — should match dept-uuid-1
      expect(wrapper.vm.selectedDepartment).toBe('dept-uuid-1')
    })

    it('falls back to first department when no category match', async () => {
      const wrapper = await mountAndLoad({ category: 'unknown-category' })

      // No match → first dept
      expect(wrapper.vm.selectedDepartment).toBe('dept-uuid-1')
    })
  })

  // ─── Agent ID validation (inputs on step 1) ───────────────────────────────

  describe('agent ID validation', () => {
    it('accepts lowercase alphanumeric with hyphens as valid', async () => {
      const wrapper = await mountAndLoad()

      const input = wrapper.find('#agentId')
      await input.setValue('my-valid-agent-1')

      expect(wrapper.vm.validateAgentId.valid).toBe(true)
      expect(wrapper.vm.validateAgentId.error).toBeNull()
    })

    it('rejects uppercase letters in agent ID', async () => {
      const wrapper = await mountAndLoad()

      const input = wrapper.find('#agentId')
      await input.setValue('MyAgent')

      expect(wrapper.vm.validateAgentId.valid).toBe(false)
      expect(wrapper.vm.validateAgentId.error).toMatch(/lowercase/i)
    })

    it('rejects agent ID with special characters', async () => {
      const wrapper = await mountAndLoad()

      const input = wrapper.find('#agentId')
      await input.setValue('my_agent!')

      expect(wrapper.vm.validateAgentId.valid).toBe(false)
      expect(wrapper.vm.validateAgentId.error).toMatch(/lowercase/i)
    })

    it('shows validation error message in the template when ID is invalid', async () => {
      const wrapper = await mountAndLoad()

      const input = wrapper.find('#agentId')
      await input.setValue('BAD_ID')

      // The error paragraph is conditionally rendered when id is invalid + non-empty
      const errorPara = wrapper.findAll('p').find(p => p.text().includes('lowercase'))
      expect(errorPara).toBeTruthy()
    })

    it('rejects agent ID shorter than 2 characters', async () => {
      const wrapper = await mountAndLoad()

      const input = wrapper.find('#agentId')
      await input.setValue('a')

      expect(wrapper.vm.validateAgentId.valid).toBe(false)
      expect(wrapper.vm.validateAgentId.error).toMatch(/2-50/i)
    })

    it('rejects agent ID longer than 50 characters', async () => {
      const wrapper = await mountAndLoad()

      const input = wrapper.find('#agentId')
      await input.setValue('a'.repeat(51))

      expect(wrapper.vm.validateAgentId.valid).toBe(false)
      expect(wrapper.vm.validateAgentId.error).toMatch(/2-50/i)
    })

    it('accepts agent ID of exactly 2 characters', async () => {
      const wrapper = await mountAndLoad()

      const input = wrapper.find('#agentId')
      await input.setValue('ab')

      expect(wrapper.vm.validateAgentId.valid).toBe(true)
    })

    it('accepts agent ID of exactly 50 characters', async () => {
      const wrapper = await mountAndLoad()

      const input = wrapper.find('#agentId')
      await input.setValue('a'.repeat(50))

      expect(wrapper.vm.validateAgentId.valid).toBe(true)
    })

    it('returns invalid with "required" error for empty string', async () => {
      const wrapper = await mountAndLoad()

      const input = wrapper.find('#agentId')
      await input.setValue('')

      expect(wrapper.vm.validateAgentId.valid).toBe(false)
      expect(wrapper.vm.validateAgentId.error).toMatch(/required/i)
    })
  })

  // ─── 409 duplicate error handling ────────────────────────────────────────

  describe('409 duplicate agent error', () => {
    it('shows toast error when install returns 409', async () => {
      const wrapper = await mountAndLoad()

      // The API throws an error that contains "409"
      mockInstallTemplate.mockRejectedValue(
        new Error('409: An agent with this ID already exists in your organization')
      )

      // Advance to step 2 (Confirm & Install)
      await advanceToConfirm(wrapper)

      // Trigger install
      const installBtn = wrapper.findAll('button').find(b => b.text().includes('Install Agent'))
      await installBtn.trigger('click')
      await flushPromises()

      expect(mockToastError).toHaveBeenCalledWith(
        expect.stringMatching(/already exists/i)
      )
    })

    it('shows toast error when install error message contains "already exists"', async () => {
      const wrapper = await mountAndLoad()

      mockInstallTemplate.mockRejectedValue(
        new Error('An agent already exists with that ID')
      )

      await advanceToConfirm(wrapper)

      const installBtn = wrapper.findAll('button').find(b => b.text().includes('Install Agent'))
      await installBtn.trigger('click')
      await flushPromises()

      expect(mockToastError).toHaveBeenCalledWith(
        expect.stringMatching(/already exists/i)
      )
    })

    it('shows generic error message for non-409 failures', async () => {
      const wrapper = await mountAndLoad()

      mockInstallTemplate.mockRejectedValue(new Error('Network error'))

      await advanceToConfirm(wrapper)

      const installBtn = wrapper.findAll('button').find(b => b.text().includes('Install Agent'))
      await installBtn.trigger('click')
      await flushPromises()

      expect(mockToastError).toHaveBeenCalledWith(
        expect.stringContaining('Failed to install template')
      )
    })
  })

  // ─── Successful install flow ──────────────────────────────────────────────

  describe('successful install flow', () => {
    it('advances to step 3 (Complete) after successful install', async () => {
      const wrapper = await mountAndLoad()

      mockInstallTemplate.mockResolvedValue({ agent: MOCK_INSTALLED_AGENT })

      // Advance to step 2 (Confirm)
      await advanceToConfirm(wrapper)

      const installBtn = wrapper.findAll('button').find(b => b.text().includes('Install Agent'))
      await installBtn.trigger('click')
      await flushPromises()

      expect(wrapper.vm.step).toBe(3)
    })

    it('shows success toast after install', async () => {
      const wrapper = await mountAndLoad()

      mockInstallTemplate.mockResolvedValue({ agent: MOCK_INSTALLED_AGENT })

      await advanceToConfirm(wrapper)

      const installBtn = wrapper.findAll('button').find(b => b.text().includes('Install Agent'))
      await installBtn.trigger('click')
      await flushPromises()

      expect(mockToastSuccess).toHaveBeenCalledWith('Agent installed successfully!')
    })

    it('shows "Installation Complete!" heading on step 3', async () => {
      const wrapper = await mountAndLoad()

      mockInstallTemplate.mockResolvedValue({ agent: MOCK_INSTALLED_AGENT })

      await advanceToConfirm(wrapper)

      const installBtn = wrapper.findAll('button').find(b => b.text().includes('Install Agent'))
      await installBtn.trigger('click')
      await flushPromises()

      expect(wrapper.text()).toContain('Installation Complete!')
    })
  })

  // ─── Step navigation ──────────────────────────────────────────────────────

  describe('step navigation', () => {
    it('starts on step 1', async () => {
      const wrapper = await mountAndLoad()
      expect(wrapper.vm.step).toBe(1)
    })

    it('advances to step 2 on Next click', async () => {
      const wrapper = await mountAndLoad()

      const nextBtn = wrapper.findAll('button').find(b => b.text().includes('Next'))
      await nextBtn.trigger('click')

      expect(wrapper.vm.step).toBe(2)
    })

    it('goes back to step 1 from step 2 on Back click', async () => {
      const wrapper = await mountAndLoad()

      // Go forward
      const nextBtn = wrapper.findAll('button').find(b => b.text().includes('Next'))
      await nextBtn.trigger('click')

      expect(wrapper.vm.step).toBe(2)

      // Go back
      const backBtn = wrapper.findAll('button').find(b => b.text() === 'Back')
      await backBtn.trigger('click')

      expect(wrapper.vm.step).toBe(1)
    })

    it('step indicator shows correct number of steps (3)', async () => {
      const wrapper = await mountAndLoad()

      const steps = wrapper.vm.stepIndicator
      expect(steps).toHaveLength(3)
      expect(steps.map(s => s.label)).toEqual(['Customize', 'Confirm', 'Complete'])
    })

    it('marks step 1 as active on initial load', async () => {
      const wrapper = await mountAndLoad()

      const steps = wrapper.vm.stepIndicator
      expect(steps[0].active).toBe(true)
      expect(steps[1].active).toBe(false)
    })
  })

  // ─── Error state from API ─────────────────────────────────────────────────

  describe('API fetch error', () => {
    it('shows error message when template fetch fails', async () => {
      mockGetMarketplaceTemplate.mockRejectedValue(new Error('Template not found'))
      mockGetDepartments.mockResolvedValue({ departments: MOCK_DEPARTMENTS })

      const wrapper = mount(MarketplaceInstall, {
        global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } }
      })
      await flushPromises()

      expect(wrapper.text()).toContain('Template not found')
    })

    it('hides loading skeleton after a fetch error', async () => {
      mockGetMarketplaceTemplate.mockRejectedValue(new Error('Network error'))
      mockGetDepartments.mockResolvedValue({ departments: MOCK_DEPARTMENTS })

      const wrapper = mount(MarketplaceInstall, {
        global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } }
      })
      await flushPromises()

      expect(wrapper.vm.loading).toBe(false)
    })
  })

  // ─── canProceed computed ─────────────────────────────────────────────────

  describe('canProceed computed', () => {
    it('is truthy on step 1 when pre-filled values are valid', async () => {
      const wrapper = await mountAndLoad()

      // Step 1 has pre-filled valid agentId, displayName, and department
      expect(wrapper.vm.step).toBe(1)
      expect(wrapper.vm.canProceed).toBeTruthy()
    })

    it('is false on step 1 when agentId is empty', async () => {
      const wrapper = await mountAndLoad()

      await wrapper.find('#agentId').setValue('')
      expect(wrapper.vm.canProceed).toBe(false)
    })

    it('is false on step 1 when agentId is invalid format', async () => {
      const wrapper = await mountAndLoad()

      await wrapper.find('#agentId').setValue('INVALID_ID')
      expect(wrapper.vm.canProceed).toBe(false)
    })

    it('is truthy on step 1 when all fields are valid', async () => {
      const wrapper = await mountAndLoad()

      // Pre-filled from template — should already be valid
      expect(wrapper.vm.agentId).toBe('test-template')
      expect(wrapper.vm.displayName).toBe('Test Agent Template')
      expect(wrapper.vm.selectedDepartment).toBe('dept-uuid-1')
      expect(wrapper.vm.canProceed).toBeTruthy()
    })
  })
})
