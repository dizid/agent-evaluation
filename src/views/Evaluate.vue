<script setup>
import { ref, reactive, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
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
import ScoreSlider from '@/components/evaluations/ScoreSlider.vue'
import ScoreBadge from '@/components/ui/ScoreBadge.vue'
import RatingLabel from '@/components/ui/RatingLabel.vue'

const route = useRoute()
const router = useRouter()

// Data
const agents = ref([])
const criteriaInfo = ref({})
const loading = ref(true)
const submitting = ref(false)
const error = ref(null)
const submitError = ref(null)

// Form state
const selectedAgentId = ref('')
const taskDescription = ref('')
const isSelfEval = ref(false)
const topStrength = ref('')
const topWeakness = ref('')
const actionItem = ref('')

// Scores: keyed by criterion name
const scores = reactive({})

// Initialize universal criteria scores to 5
UNIVERSAL_CRITERIA.forEach(key => {
  scores[key] = 5
})

onMounted(async () => {
  try {
    const [agentData, criteriaData] = await Promise.all([
      getAgents(),
      getCriteria().catch(() => null)
    ])
    agents.value = Array.isArray(agentData) ? agentData : agentData.agents || []

    // Build criteria info map indexed by id (e.g., 'task_completion', 'code_quality')
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
    error.value = e.message
  } finally {
    loading.value = false
  }
})

// Selected agent object
const selectedAgent = computed(() =>
  agents.value.find(a => String(a.id) === String(selectedAgentId.value)) || null
)

// KPI definitions for selected agent, enriched with criteria descriptions
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

// KPI names for scoring
const kpiNames = computed(() => kpiDefs.value.map(k => k.key))

// Live overall score
const overallScore = computed(() =>
  calculateOverall(scores, kpiNames.value)
)

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

// Universal criteria with descriptions
const universalWithInfo = computed(() =>
  UNIVERSAL_CRITERIA.map(key => ({
    key,
    label: formatLabel(key),
    description: criteriaInfo.value[key]?.description || ''
  }))
)

// Can submit
const canSubmit = computed(() =>
  selectedAgentId.value && taskDescription.value.trim().length > 0
)

async function handleSubmit() {
  if (!canSubmit.value || submitting.value) return

  submitting.value = true
  submitError.value = null

  try {
    await submitEvaluation({
      agent_id: selectedAgentId.value,
      scores: { ...scores },
      task_description: taskDescription.value.trim(),
      evaluator_type: isSelfEval.value ? 'self' : 'community',
      top_strength: topStrength.value.trim() || null,
      top_weakness: topWeakness.value.trim() || null,
      action_item: actionItem.value.trim() || null
    })
    router.push(`/agent/${selectedAgentId.value}?submitted=1`)
  } catch (e) {
    submitError.value = e.message
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="max-w-2xl mx-auto space-y-8">
    <h1 class="text-2xl font-bold text-text-primary">Evaluate Agent</h1>

    <!-- Loading -->
    <div v-if="loading" class="text-text-muted text-center py-12">Loading...</div>

    <!-- Error -->
    <div v-else-if="error" class="text-score-failing text-center py-12">{{ error }}</div>

    <template v-else>
      <!-- Step 1: Select Agent -->
      <section class="space-y-3">
        <label for="agent-select" class="text-text-secondary text-sm uppercase tracking-wider block">1. Select Agent</label>
        <select
          id="agent-select"
          v-model="selectedAgentId"
          class="w-full bg-eval-surface text-text-primary border border-eval-border rounded-lg px-4 py-3 text-sm"
        >
          <option value="" disabled>Choose an agent...</option>
          <option v-for="agent in agents" :key="agent.id" :value="agent.id">
            {{ agent.name }} ({{ agent.department }})
          </option>
        </select>
      </section>

      <!-- Step 2: Task Context -->
      <section class="space-y-3">
        <label for="task-description" class="text-text-secondary text-sm uppercase tracking-wider block">2. Task Context</label>
        <textarea
          id="task-description"
          v-model="taskDescription"
          placeholder="What task did this agent perform?"
          rows="3"
          class="w-full bg-eval-surface text-text-primary border border-eval-border rounded-lg px-4 py-3 text-sm placeholder:text-text-muted resize-none"
        />
        <label class="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
          <input type="checkbox" v-model="isSelfEval" class="rounded border-eval-border" />
          This is a self-evaluation
        </label>
      </section>

      <!-- Step 3: Universal Criteria -->
      <section class="space-y-3">
        <h2 class="text-text-secondary text-sm uppercase tracking-wider">3. Universal Criteria</h2>
        <div class="space-y-2">
          <ScoreSlider
            v-for="criterion in universalWithInfo"
            :key="criterion.key"
            v-model="scores[criterion.key]"
            :label="criterion.label"
            :description="criterion.description"
          />
        </div>
      </section>

      <!-- Step 4: Role KPIs -->
      <section v-if="kpiDefs.length > 0" class="space-y-3">
        <h2 class="text-text-secondary text-sm uppercase tracking-wider">4. Role KPIs</h2>
        <div class="space-y-2">
          <ScoreSlider
            v-for="kpi in kpiDefs"
            :key="kpi.key"
            v-model="scores[kpi.key]"
            :label="kpi.name"
            :description="kpi.description"
          />
        </div>
      </section>

      <!-- Step 5: Summary -->
      <section class="space-y-3">
        <h2 class="text-text-secondary text-sm uppercase tracking-wider">
          {{ kpiDefs.length > 0 ? '5' : '4' }}. Summary
        </h2>

        <input
          v-model="topStrength"
          type="text"
          placeholder="Top strength"
          aria-label="Top strength"
          class="w-full bg-eval-surface text-text-primary border border-eval-border rounded-lg px-4 py-3 text-sm placeholder:text-text-muted"
        />
        <input
          v-model="topWeakness"
          type="text"
          placeholder="Top weakness"
          aria-label="Top weakness"
          class="w-full bg-eval-surface text-text-primary border border-eval-border rounded-lg px-4 py-3 text-sm placeholder:text-text-muted"
        />
        <input
          v-model="actionItem"
          type="text"
          placeholder="Action item for improvement"
          aria-label="Action item for improvement"
          class="w-full bg-eval-surface text-text-primary border border-eval-border rounded-lg px-4 py-3 text-sm placeholder:text-text-muted"
        />
      </section>

      <!-- Anti-gaming warnings -->
      <div v-if="lowEffortWarning" class="glass-card p-4 border-score-adequate/30">
        <p class="text-score-adequate text-sm">
          Your scores are very similar. Varied scores help improve agents.
        </p>
      </div>

      <div v-if="needsJustificationScores.length > 0 && !topStrength && !topWeakness" class="glass-card p-4 border-score-adequate/30">
        <p class="text-score-adequate text-sm">
          Scores of 9+ or 3- need a brief explanation. Please fill in top strength or weakness.
        </p>
      </div>

      <!-- Live score preview -->
      <div class="glass-card p-4 flex items-center justify-between">
        <span class="text-text-secondary text-sm">Overall Score</span>
        <div class="flex items-center gap-3">
          <RatingLabel :label="overallLabel" />
          <ScoreBadge :score="overallScore" size="lg" />
        </div>
      </div>

      <!-- Submit -->
      <div class="space-y-3">
        <div v-if="submitError" class="text-score-failing text-sm">{{ submitError }}</div>
        <button
          @click="handleSubmit"
          :disabled="!canSubmit || submitting"
          :class="[
            'w-full py-3 rounded-lg font-medium text-white transition-colors',
            canSubmit && !submitting
              ? 'bg-accent hover:bg-accent-hover'
              : 'bg-eval-surface text-text-muted cursor-not-allowed'
          ]"
        >
          {{ submitting ? 'Submitting...' : 'Submit Evaluation' }}
        </button>
      </div>
    </template>
  </div>
</template>
