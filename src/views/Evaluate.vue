<script setup>
import { ref, reactive, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import { getAgents, getCriteria, submitEvaluation } from '@/services/api'
import {
  UNIVERSAL_CRITERIA,
  calculateOverall,
  getRatingLabel,
  getScoreColor,
  getScoreBgColor,
  isLowEffort,
  needsJustification
} from '@/services/scoring'
import { formatLabel } from '@/utils/format'
import { useToast } from '@/composables/useToast'
import ScoreSlider from '@/components/evaluations/ScoreSlider.vue'
import ScoreBadge from '@/components/ui/ScoreBadge.vue'
import RatingLabel from '@/components/ui/RatingLabel.vue'
import DeptBadge from '@/components/ui/DeptBadge.vue'
import {
  CheckIcon,
  ExclamationTriangleIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/vue/24/outline'

const route = useRoute()
const router = useRouter()
const toast = useToast()

// --- Data ---
const agents = ref([])
const criteriaInfo = ref({})
const loading = ref(true)
const loadError = ref(null)
const submitting = ref(false)
const submitError = ref(null)
const formTouched = ref(false)
const submitted = ref(false)

// --- Wizard state ---
const currentStep = ref(1)
const TOTAL_STEPS = 5
const stepValidationError = ref('')

const STEP_LABELS = ['Agent', 'Context', 'Universal', 'Role KPIs', 'Review']

// --- Form state ---
const selectedAgentId = ref('')
const taskDescription = ref('')
const isSelfEval = ref(false)
const projectName = ref('')
const topStrength = ref('')
const topWeakness = ref('')
const actionItem = ref('')

// Scores: keyed by criterion id
const scores = reactive({})

// Initialize universal criteria scores to 5
UNIVERSAL_CRITERIA.forEach(key => {
  scores[key] = 5
})

// --- Lifecycle ---
onMounted(async () => {
  try {
    const [agentData, criteriaData] = await Promise.all([
      getAgents(),
      getCriteria().catch(() => null)
    ])
    agents.value = Array.isArray(agentData) ? agentData : agentData.agents || []

    // Build criteria info map indexed by id
    if (criteriaData) {
      const list = Array.isArray(criteriaData) ? criteriaData : criteriaData.criteria || []
      list.forEach(c => {
        criteriaInfo.value[c.id] = c
      })
    }

    // Pre-select agent from URL
    if (route.query.agent) {
      selectedAgentId.value = route.query.agent
    }
  } catch (e) {
    loadError.value = e.message
  } finally {
    loading.value = false
  }
})

// Warn on navigation away if form partially filled
onBeforeRouteLeave((to, from) => {
  if (formTouched.value && !submitted.value) {
    const answer = window.confirm('You have unsaved evaluation data. Leave anyway?')
    if (!answer) return false
  }
})

// Mark form as touched when anything changes
watch([selectedAgentId, taskDescription, topStrength, topWeakness, actionItem], () => {
  if (selectedAgentId.value || taskDescription.value) {
    formTouched.value = true
  }
})

// --- Computed ---
const selectedAgent = computed(() =>
  agents.value.find(a => String(a.id) === String(selectedAgentId.value)) || null
)

// KPI definitions for selected agent
const kpiDefs = computed(() => {
  if (!selectedAgent.value?.kpi_definitions) return []
  return selectedAgent.value.kpi_definitions.map(k => {
    const key = typeof k === 'string' ? k : (k.key || k.name || k)
    const info = criteriaInfo.value[key]
    return {
      key,
      name: info?.name || formatLabel(key),
      description: info?.description || ''
    }
  })
})

// Initialize KPI scores when agent changes
watch(kpiDefs, (defs) => {
  defs.forEach(kpi => {
    if (scores[kpi.key] === undefined) {
      scores[kpi.key] = 5
    }
  })
})

const kpiNames = computed(() => kpiDefs.value.map(k => k.key))

// Live overall score
const overallScore = computed(() => calculateOverall(scores, kpiNames.value))
const overallLabel = computed(() => getRatingLabel(overallScore.value))

// Anti-gaming warnings
const lowEffortWarning = computed(() => isLowEffort(scores))

const needsJustificationScores = computed(() => {
  const result = []
  for (const [key, val] of Object.entries(scores)) {
    if (needsJustification(val)) {
      result.push(key)
    }
  }
  return result
})

const hasJustificationWarning = computed(() =>
  needsJustificationScores.value.length > 0 && !topStrength.value && !topWeakness.value
)

// Universal criteria with descriptions
const universalWithInfo = computed(() =>
  UNIVERSAL_CRITERIA.map(key => ({
    key,
    label: formatLabel(key),
    description: criteriaInfo.value[key]?.description || ''
  }))
)

// Show score preview from step 3 onward
const showScorePreview = computed(() => currentStep.value >= 3)

// Has any qualitative feedback
const hasQualitative = computed(() =>
  topStrength.value.trim() || topWeakness.value.trim() || actionItem.value.trim()
)

// --- Step validation ---
function validateStep(step) {
  switch (step) {
    case 1:
      if (!selectedAgentId.value) return 'Please select an agent to evaluate.'
      return ''
    case 2:
      if (taskDescription.value.trim().length < 10) return 'Task description must be at least 10 characters.'
      return ''
    case 3:
      // All universal scores default to 5, always valid
      return ''
    case 4:
      // All KPI scores default to 5, always valid
      return ''
    case 5:
      if (!hasQualitative.value) return 'Please provide at least one of: strength, weakness, or action item.'
      return ''
    default:
      return ''
  }
}

function goNext() {
  const err = validateStep(currentStep.value)
  if (err) {
    stepValidationError.value = err
    return
  }
  stepValidationError.value = ''
  if (currentStep.value < TOTAL_STEPS) {
    currentStep.value++
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

function goBack() {
  stepValidationError.value = ''
  if (currentStep.value > 1) {
    currentStep.value--
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

function goToStep(step) {
  // Only allow going to completed steps or the current step
  if (step < currentStep.value) {
    stepValidationError.value = ''
    currentStep.value = step
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

// Keyboard: Enter advances (except on textareas)
function onKeydown(event) {
  if (event.key === 'Enter' && event.target.tagName !== 'TEXTAREA') {
    event.preventDefault()
    goNext()
  }
}

// --- Submit ---
async function handleSubmit() {
  // Validate all steps before submit
  for (let s = 1; s <= TOTAL_STEPS; s++) {
    const err = validateStep(s)
    if (err) {
      stepValidationError.value = err
      currentStep.value = s
      return
    }
  }

  submitting.value = true
  submitError.value = null

  try {
    await submitEvaluation({
      agent_id: selectedAgentId.value,
      scores: { ...scores },
      task_description: taskDescription.value.trim(),
      evaluator_type: isSelfEval.value ? 'self' : 'community',
      project: projectName.value.trim() || null,
      top_strength: topStrength.value.trim() || null,
      top_weakness: topWeakness.value.trim() || null,
      action_item: actionItem.value.trim() || null
    })
    submitted.value = true
    toast.success(`Evaluation submitted for ${selectedAgent.value?.name || 'agent'}`)
    router.push(`/agent/${selectedAgentId.value}`)
  } catch (e) {
    submitError.value = e.message
  } finally {
    submitting.value = false
  }
}

// --- Review helpers ---
function getUniversalScoreSummary() {
  return UNIVERSAL_CRITERIA.map(key => ({
    key,
    label: formatLabel(key),
    score: scores[key]
  }))
}

function getKpiScoreSummary() {
  return kpiDefs.value.map(kpi => ({
    key: kpi.key,
    label: kpi.name,
    score: scores[kpi.key]
  }))
}
</script>

<template>
  <div class="max-w-2xl mx-auto pb-32" @keydown="onKeydown">
    <h1 class="text-2xl font-bold text-text-primary mb-6">Evaluate Agent</h1>

    <!-- Loading -->
    <div v-if="loading" class="text-text-muted text-center py-12">Loading...</div>

    <!-- Error -->
    <div v-else-if="loadError" class="text-score-failing text-center py-12">{{ loadError }}</div>

    <template v-else>
      <!-- Progress Bar -->
      <nav class="mb-8" aria-label="Evaluation progress">
        <ol class="flex items-center w-full">
          <li
            v-for="(label, idx) in STEP_LABELS"
            :key="idx"
            class="flex items-center flex-1 last:flex-initial"
          >
            <!-- Step circle + label -->
            <button
              @click="goToStep(idx + 1)"
              :disabled="idx + 1 > currentStep"
              class="flex flex-col items-center gap-1 group"
              :aria-current="idx + 1 === currentStep ? 'step' : undefined"
              :aria-label="`Step ${idx + 1}: ${label}`"
            >
              <span
                :class="[
                  'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200',
                  idx + 1 < currentStep
                    ? 'bg-accent text-white'
                    : idx + 1 === currentStep
                      ? 'bg-accent text-white ring-2 ring-accent/40 ring-offset-2 ring-offset-eval-bg'
                      : 'bg-eval-surface text-text-muted border border-eval-border'
                ]"
              >
                <CheckIcon v-if="idx + 1 < currentStep" class="w-4 h-4" />
                <span v-else>{{ idx + 1 }}</span>
              </span>
              <span
                :class="[
                  'text-[10px] sm:text-xs font-medium transition-colors',
                  idx + 1 <= currentStep ? 'text-text-secondary' : 'text-text-muted'
                ]"
              >
                {{ label }}
              </span>
            </button>

            <!-- Connector line (not after last) -->
            <div
              v-if="idx < STEP_LABELS.length - 1"
              :class="[
                'flex-1 h-px mx-1 sm:mx-2 transition-colors',
                idx + 1 < currentStep ? 'bg-accent' : 'bg-eval-border'
              ]"
            />
          </li>
        </ol>
      </nav>

      <!-- Validation error -->
      <div
        v-if="stepValidationError"
        class="glass-card p-3 mb-4 border-score-adequate/30 flex items-center gap-2"
      >
        <ExclamationTriangleIcon class="w-5 h-5 text-score-adequate shrink-0" />
        <span class="text-score-adequate text-sm">{{ stepValidationError }}</span>
      </div>

      <!-- Step 1: Select Agent -->
      <section v-if="currentStep === 1" class="space-y-4">
        <h2 class="text-text-secondary text-sm uppercase tracking-wider">Select Agent</h2>

        <select
          id="agent-select"
          v-model="selectedAgentId"
          aria-label="Select agent to evaluate"
          class="w-full bg-eval-surface text-text-primary border border-eval-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
        >
          <option value="" disabled>Choose an agent...</option>
          <option v-for="agent in agents" :key="agent.id" :value="agent.id">
            {{ agent.name }} ({{ agent.department }})
          </option>
        </select>

        <!-- Selected agent preview -->
        <div v-if="selectedAgent" class="glass-card p-4 flex items-center gap-3">
          <div class="flex-1 min-w-0">
            <div class="text-text-primary font-medium">{{ selectedAgent.name }}</div>
            <div class="text-text-muted text-sm">{{ selectedAgent.role }}</div>
          </div>
          <DeptBadge :department="selectedAgent.department" />
        </div>

        <label class="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
          <input type="checkbox" v-model="isSelfEval" class="rounded border-eval-border accent-accent" />
          This is a self-evaluation
        </label>
        <span v-if="isSelfEval" class="text-text-muted text-xs ml-6 flex items-center gap-1">
          <ExclamationTriangleIcon class="w-3.5 h-3.5 text-score-adequate" />
          Self-evaluations are weighted at 0.8x
        </span>
      </section>

      <!-- Step 2: Task Context -->
      <section v-if="currentStep === 2" class="space-y-4">
        <h2 class="text-text-secondary text-sm uppercase tracking-wider">Task Context</h2>

        <div>
          <label for="task-description" class="text-text-secondary text-xs mb-1 block">
            What task did this agent perform? <span class="text-score-adequate">*</span>
          </label>
          <textarea
            id="task-description"
            v-model="taskDescription"
            placeholder="Describe the task, context, and expected outcome..."
            rows="4"
            class="w-full bg-eval-surface text-text-primary border border-eval-border rounded-lg px-4 py-3 text-sm placeholder:text-text-muted resize-none focus:outline-none focus:ring-2 focus:ring-accent/50"
          />
          <div class="text-text-muted text-xs mt-1">
            {{ taskDescription.trim().length }}/10 characters minimum
          </div>
        </div>

        <div>
          <label for="project-name" class="text-text-secondary text-xs mb-1 block">
            Project name (optional)
          </label>
          <input
            id="project-name"
            v-model="projectName"
            type="text"
            placeholder="e.g., LaunchPilot, Site Improver"
            aria-label="Project name"
            class="w-full bg-eval-surface text-text-primary border border-eval-border rounded-lg px-4 py-3 text-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/50"
          />
        </div>
      </section>

      <!-- Step 3: Universal Criteria -->
      <section v-if="currentStep === 3" class="space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-text-secondary text-sm uppercase tracking-wider">Universal Criteria</h2>
          <span class="text-text-muted text-xs">8 criteria &middot; 60% of overall</span>
        </div>
        <div class="space-y-2">
          <ScoreSlider
            v-for="criterion in universalWithInfo"
            :key="criterion.key"
            v-model="scores[criterion.key]"
            :label="criterion.label"
            :description="criterion.description"
          />
        </div>

        <!-- Anti-gaming: low effort -->
        <div v-if="lowEffortWarning" class="glass-card p-3 border-score-adequate/30 flex items-center gap-2">
          <ExclamationTriangleIcon class="w-5 h-5 text-score-adequate shrink-0" />
          <span class="text-score-adequate text-sm">
            Your scores are very similar. Varied scores produce more useful evaluations.
          </span>
        </div>

        <!-- Extreme score warning (inline) -->
        <div v-if="needsJustificationScores.length > 0" class="glass-card p-3 border-score-adequate/30 flex items-center gap-2">
          <ExclamationTriangleIcon class="w-5 h-5 text-score-adequate shrink-0" />
          <span class="text-score-adequate text-sm">
            Extreme scores (9+ or 3-) will be adjusted unless you provide justification in the review step.
          </span>
        </div>
      </section>

      <!-- Step 4: Role KPIs -->
      <section v-if="currentStep === 4" class="space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-text-secondary text-sm uppercase tracking-wider">Role KPIs</h2>
          <span class="text-text-muted text-xs">{{ kpiDefs.length }} criteria &middot; 40% of overall</span>
        </div>

        <div v-if="kpiDefs.length === 0" class="glass-card p-6 text-center">
          <p class="text-text-muted text-sm">
            No role-specific KPIs defined for this agent. The overall score will use universal criteria only.
          </p>
        </div>

        <div v-else class="space-y-2">
          <ScoreSlider
            v-for="kpi in kpiDefs"
            :key="kpi.key"
            v-model="scores[kpi.key]"
            :label="kpi.name"
            :description="kpi.description"
          />
        </div>

        <!-- Anti-gaming: low effort (also check here since KPIs can flatten it) -->
        <div v-if="lowEffortWarning" class="glass-card p-3 border-score-adequate/30 flex items-center gap-2">
          <ExclamationTriangleIcon class="w-5 h-5 text-score-adequate shrink-0" />
          <span class="text-score-adequate text-sm">
            Your scores are very similar. Varied scores produce more useful evaluations.
          </span>
        </div>

        <!-- Extreme score warning (inline) -->
        <div v-if="needsJustificationScores.length > 0" class="glass-card p-3 border-score-adequate/30 flex items-center gap-2">
          <ExclamationTriangleIcon class="w-5 h-5 text-score-adequate shrink-0" />
          <span class="text-score-adequate text-sm">
            Extreme scores (9+ or 3-) will be adjusted unless you provide justification in the review step.
          </span>
        </div>
      </section>

      <!-- Step 5: Review & Submit -->
      <section v-if="currentStep === 5" class="space-y-6">
        <h2 class="text-text-secondary text-sm uppercase tracking-wider">Review & Submit</h2>

        <!-- Qualitative inputs -->
        <div class="space-y-3">
          <div>
            <label for="top-strength" class="text-text-secondary text-xs mb-1 block">Top Strength</label>
            <input
              id="top-strength"
              v-model="topStrength"
              type="text"
              placeholder="What did this agent do best?"
              class="w-full bg-eval-surface text-text-primary border border-eval-border rounded-lg px-4 py-3 text-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/50"
            />
          </div>
          <div>
            <label for="top-weakness" class="text-text-secondary text-xs mb-1 block">Top Weakness</label>
            <input
              id="top-weakness"
              v-model="topWeakness"
              type="text"
              placeholder="Where did this agent fall short?"
              class="w-full bg-eval-surface text-text-primary border border-eval-border rounded-lg px-4 py-3 text-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/50"
            />
          </div>
          <div>
            <label for="action-item" class="text-text-secondary text-xs mb-1 block">Action Item</label>
            <input
              id="action-item"
              v-model="actionItem"
              type="text"
              placeholder="One specific, testable improvement"
              class="w-full bg-eval-surface text-text-primary border border-eval-border rounded-lg px-4 py-3 text-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/50"
            />
          </div>
          <p class="text-text-muted text-xs">
            At least one field above is required. <span class="text-score-adequate">*</span>
          </p>
        </div>

        <!-- Anti-gaming: justification needed -->
        <div v-if="hasJustificationWarning" class="glass-card p-3 border-score-adequate/30 flex items-center gap-2">
          <ExclamationTriangleIcon class="w-5 h-5 text-score-adequate shrink-0" />
          <span class="text-score-adequate text-sm">
            Scores of 9+ or 3 and below benefit from a brief explanation via strength/weakness.
          </span>
        </div>

        <!-- Score Summary -->
        <div class="glass-card p-4 space-y-3">
          <h3 class="text-text-secondary text-xs uppercase tracking-wider font-medium">Score Summary</h3>

          <!-- Agent info -->
          <div class="flex items-center gap-3 pb-3 border-b border-eval-border">
            <div class="flex-1">
              <span class="text-text-primary font-medium">{{ selectedAgent?.name }}</span>
              <span class="text-text-muted text-sm ml-2">{{ taskDescription.trim().substring(0, 60) }}{{ taskDescription.trim().length > 60 ? '...' : '' }}</span>
            </div>
            <DeptBadge v-if="selectedAgent" :department="selectedAgent.department" />
          </div>

          <!-- Universal scores grid -->
          <div>
            <div class="text-text-muted text-xs mb-2">Universal Criteria (60%)</div>
            <div class="grid grid-cols-2 gap-x-4 gap-y-1">
              <div
                v-for="item in getUniversalScoreSummary()"
                :key="item.key"
                class="flex items-center justify-between text-sm"
              >
                <span class="text-text-secondary truncate">{{ item.label }}</span>
                <span :class="getScoreColor(item.score)" class="font-medium tabular-nums ml-2">{{ item.score }}</span>
              </div>
            </div>
          </div>

          <!-- KPI scores grid -->
          <div v-if="kpiDefs.length > 0">
            <div class="text-text-muted text-xs mb-2">Role KPIs (40%)</div>
            <div class="grid grid-cols-2 gap-x-4 gap-y-1">
              <div
                v-for="item in getKpiScoreSummary()"
                :key="item.key"
                class="flex items-center justify-between text-sm"
              >
                <span class="text-text-secondary truncate">{{ item.label }}</span>
                <span :class="getScoreColor(item.score)" class="font-medium tabular-nums ml-2">{{ item.score }}</span>
              </div>
            </div>
          </div>

          <!-- Qualitative summary -->
          <div v-if="hasQualitative" class="pt-2 border-t border-eval-border space-y-1">
            <div v-if="topStrength.trim()" class="text-sm">
              <span class="text-score-strong">Strength:</span>
              <span class="text-text-secondary ml-1">{{ topStrength.trim() }}</span>
            </div>
            <div v-if="topWeakness.trim()" class="text-sm">
              <span class="text-score-weak">Weakness:</span>
              <span class="text-text-secondary ml-1">{{ topWeakness.trim() }}</span>
            </div>
            <div v-if="actionItem.trim()" class="text-sm">
              <span class="text-accent">Action:</span>
              <span class="text-text-secondary ml-1">{{ actionItem.trim() }}</span>
            </div>
          </div>

          <!-- Self-eval / project tags -->
          <div class="flex items-center gap-2 text-xs pt-2 border-t border-eval-border">
            <span v-if="isSelfEval" class="bg-score-adequate/15 text-score-adequate px-2 py-0.5 rounded-full">
              Self-eval (0.8x weight)
            </span>
            <span v-if="projectName.trim()" class="bg-accent-soft text-accent px-2 py-0.5 rounded-full">
              {{ projectName.trim() }}
            </span>
          </div>
        </div>

        <!-- Submit error -->
        <div v-if="submitError" class="glass-card p-3 border-score-failing/30 flex items-center gap-2">
          <ExclamationTriangleIcon class="w-5 h-5 text-score-failing shrink-0" />
          <span class="text-score-failing text-sm">{{ submitError }}</span>
        </div>

        <!-- Submit button -->
        <button
          @click="handleSubmit"
          :disabled="submitting"
          :class="[
            'w-full py-3 rounded-lg font-medium text-white transition-all duration-200',
            submitting
              ? 'bg-eval-surface text-text-muted cursor-not-allowed'
              : 'bg-accent hover:bg-accent-hover active:scale-[0.98]'
          ]"
        >
          {{ submitting ? 'Submitting...' : 'Submit Evaluation' }}
        </button>
      </section>

      <!-- Navigation Buttons -->
      <div class="flex items-center justify-between mt-8 gap-4">
        <button
          v-if="currentStep > 1"
          @click="goBack"
          class="flex items-center gap-1 text-text-secondary hover:text-text-primary text-sm transition-colors px-4 py-2 rounded-lg hover:bg-eval-surface"
        >
          <ChevronLeftIcon class="w-4 h-4" />
          Back
        </button>
        <div v-else />

        <button
          v-if="currentStep < TOTAL_STEPS"
          @click="goNext"
          class="flex items-center gap-1 bg-accent hover:bg-accent-hover text-white text-sm font-medium px-6 py-2 rounded-lg transition-all duration-200 active:scale-[0.98] ml-auto"
        >
          Next
          <ChevronRightIcon class="w-4 h-4" />
        </button>
      </div>

      <!-- Floating Score Preview (visible from step 3+) -->
      <Transition
        enter-active-class="transition-all duration-300 ease-out"
        enter-from-class="translate-y-4 opacity-0"
        enter-to-class="translate-y-0 opacity-100"
        leave-active-class="transition-all duration-200 ease-in"
        leave-from-class="translate-y-0 opacity-100"
        leave-to-class="translate-y-4 opacity-0"
      >
        <div
          v-if="showScorePreview && currentStep < 5"
          class="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-xl z-40"
        >
          <div class="glass-card p-3 flex items-center justify-between shadow-xl shadow-black/30">
            <div class="flex items-center gap-2">
              <span class="text-text-secondary text-sm">Overall</span>
              <RatingLabel :label="overallLabel" size="sm" />
            </div>
            <ScoreBadge :score="overallScore" size="lg" />
          </div>
        </div>
      </Transition>
    </template>
  </div>
</template>
