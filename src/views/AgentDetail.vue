<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { getAgent, getAgentEvaluations } from '@/services/api'
import { getRatingLabel, getConfidence } from '@/services/scoring'
import ScoreBadge from '@/components/ui/ScoreBadge.vue'
import RatingLabel from '@/components/ui/RatingLabel.vue'
import DeptBadge from '@/components/ui/DeptBadge.vue'
import ConfidenceBadge from '@/components/ui/ConfidenceBadge.vue'
import ScoreBreakdown from '@/components/agents/ScoreBreakdown.vue'
import EvaluationCard from '@/components/evaluations/EvaluationCard.vue'

const route = useRoute()
const agent = ref(null)
const latestEvaluation = ref(null)
const evaluations = ref([])
const loading = ref(true)
const error = ref(null)
const showPersona = ref(false)

onMounted(async () => {
  try {
    const [agentData, evalData] = await Promise.all([
      getAgent(route.params.id),
      getAgentEvaluations(route.params.id)
    ])

    // API returns { agent, latest_evaluation }
    agent.value = agentData.agent || agentData
    latestEvaluation.value = agentData.latest_evaluation || null
    evaluations.value = Array.isArray(evalData) ? evalData : evalData.evaluations || []
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
})

const ratingLabel = computed(() =>
  agent.value?.rating_label || getRatingLabel(agent.value?.overall_score)
)

const confidence = computed(() =>
  agent.value?.confidence || getConfidence(agent.value?.eval_count || 0)
)

// Trend is stored as string ('up', 'down', 'stable')
const trendArrow = computed(() => {
  const t = agent.value?.trend
  if (!t || t === 'stable') return null
  if (t === 'up') return { symbol: '\u2191', color: 'text-score-elite' }
  if (t === 'down') return { symbol: '\u2193', color: 'text-score-failing' }
  return null
})

// Latest evaluation's action item
const latestAction = computed(() => {
  if (latestEvaluation.value?.action_item) return latestEvaluation.value.action_item
  if (evaluations.value.length === 0) return null
  return evaluations.value[0]?.action_item || null
})

// KPI definitions are stored as JSON array of strings: ["code_quality", "first_pass_success", ...]
const kpiNames = computed(() => {
  const defs = agent.value?.kpi_definitions
  if (!defs || !Array.isArray(defs)) return []
  return defs.map(k => typeof k === 'string' ? k : (k.key || k.name || k))
})

// Scores from the latest evaluation
const latestScores = computed(() => {
  if (latestEvaluation.value?.scores) return latestEvaluation.value.scores
  if (evaluations.value.length > 0) return evaluations.value[0]?.scores || {}
  return null
})
</script>

<template>
  <div>
    <!-- Loading -->
    <div v-if="loading" class="text-text-muted text-center py-12">Loading agent...</div>

    <!-- Error -->
    <div v-else-if="error" class="text-score-failing text-center py-12">{{ error }}</div>

    <template v-else-if="agent">
      <!-- Header -->
      <div class="space-y-4 mb-8">
        <div class="flex items-start justify-between gap-4">
          <div class="min-w-0">
            <h1 class="text-2xl font-bold text-text-primary">{{ agent.name }}</h1>
            <p class="text-text-muted text-sm mt-0.5">{{ agent.role }}</p>
          </div>
          <ScoreBadge :score="agent.overall_score" size="lg" />
        </div>

        <!-- Badges row -->
        <div class="flex items-center gap-2 flex-wrap">
          <DeptBadge :department="agent.department" />
          <RatingLabel :label="ratingLabel" />
          <ConfidenceBadge :confidence="confidence" />
          <span v-if="trendArrow" :class="trendArrow.color" class="text-sm font-medium ml-1">
            {{ trendArrow.symbol }}
          </span>
        </div>

        <!-- Eval count -->
        <p class="text-text-muted text-xs">
          {{ agent.eval_count || 0 }} evaluations
        </p>
      </div>

      <!-- Latest action item -->
      <div v-if="latestAction" class="glass-card p-4 mb-6 border-accent/30">
        <div class="text-accent text-xs font-medium uppercase tracking-wider mb-1">Current Action Item</div>
        <p class="text-text-primary text-sm">{{ latestAction }}</p>
      </div>

      <!-- Persona (collapsible) -->
      <div v-if="agent.persona" class="mb-6">
        <button
          @click="showPersona = !showPersona"
          class="text-text-muted text-sm hover:text-text-secondary transition-colors"
        >
          {{ showPersona ? 'Hide persona' : 'Show persona' }}
        </button>
        <div v-if="showPersona" class="glass-card p-4 mt-2">
          <p class="text-text-secondary text-sm whitespace-pre-line">{{ agent.persona }}</p>
        </div>
      </div>

      <!-- Score Breakdown (from latest evaluation) -->
      <section v-if="latestScores" class="mb-8">
        <h2 class="text-lg font-semibold text-text-primary mb-4">Latest Score Breakdown</h2>
        <div class="glass-card p-4">
          <ScoreBreakdown :scores="latestScores" :kpi-names="kpiNames" />
        </div>
      </section>

      <!-- Evaluate CTA -->
      <div class="mb-8">
        <RouterLink
          :to="`/evaluate?agent=${agent.id}`"
          class="inline-flex px-5 py-2.5 bg-accent hover:bg-accent-hover rounded-lg text-white font-medium transition-colors"
        >
          Evaluate this agent
        </RouterLink>
      </div>

      <!-- Evaluation History -->
      <section>
        <h2 class="text-lg font-semibold text-text-primary mb-4">
          Evaluation History
          <span class="text-text-muted text-sm font-normal">({{ evaluations.length }})</span>
        </h2>

        <div v-if="evaluations.length === 0" class="text-text-muted text-sm py-4">
          No evaluations yet. Be the first to evaluate this agent.
        </div>

        <div v-else class="space-y-3">
          <EvaluationCard
            v-for="(evaluation, idx) in evaluations"
            :key="evaluation.id || idx"
            :evaluation="evaluation"
          />
        </div>
      </section>
    </template>
  </div>
</template>
