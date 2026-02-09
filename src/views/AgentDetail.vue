<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { getAgent, getAgentEvaluations } from '@/services/api'
import { getRatingLabel, getConfidence, getScoreColor } from '@/services/scoring'
import { useToast } from '@/composables/useToast'
import ScoreBadge from '@/components/ui/ScoreBadge.vue'
import RatingLabel from '@/components/ui/RatingLabel.vue'
import DeptBadge from '@/components/ui/DeptBadge.vue'
import ConfidenceBadge from '@/components/ui/ConfidenceBadge.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import ModelBadge from '@/components/ui/ModelBadge.vue'
import SkeletonLoader from '@/components/ui/SkeletonLoader.vue'
import ScoreBreakdown from '@/components/agents/ScoreBreakdown.vue'
import TrendChart from '@/components/charts/TrendChart.vue'
import EvaluationCard from '@/components/evaluations/EvaluationCard.vue'
import {
  ArrowLeftIcon,
  LightBulbIcon,
  ChartBarIcon,
  ClockIcon,
  ChevronDownIcon,
  PencilSquareIcon
} from '@heroicons/vue/24/outline'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const agent = ref(null)
const latestEvaluation = ref(null)
const evaluations = ref([])
const loading = ref(true)
const error = ref(null)
const showPersona = ref(false)

// Handle success redirect from evaluation submission
if (route.query.submitted === '1') {
  toast.success('Evaluation submitted successfully!')
  router.replace({ path: route.path, query: {} })
}

onMounted(async () => {
  try {
    const [agentData, evalData] = await Promise.all([
      getAgent(route.params.id),
      getAgentEvaluations(route.params.id)
    ])

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

const trendArrow = computed(() => {
  const t = agent.value?.trend
  if (!t || t === 'stable') return null
  if (t === 'up') return { symbol: '\u2191', color: 'text-score-elite', label: 'Trending up' }
  if (t === 'down') return { symbol: '\u2193', color: 'text-score-failing', label: 'Trending down' }
  return null
})

const latestAction = computed(() => {
  if (latestEvaluation.value?.action_item) return latestEvaluation.value.action_item
  if (evaluations.value.length === 0) return null
  return evaluations.value[0]?.action_item || null
})

const kpiNames = computed(() => {
  const defs = agent.value?.kpi_definitions
  if (!defs || !Array.isArray(defs)) return []
  return defs.map(k => typeof k === 'string' ? k : (k.key || k.name || k))
})

const latestScores = computed(() => {
  if (latestEvaluation.value?.scores) return latestEvaluation.value.scores
  if (evaluations.value.length > 0) return evaluations.value[0]?.scores || {}
  return null
})

// Show chart only when there are 2+ evaluations with scores
const showChart = computed(() =>
  evaluations.value.filter(e => e.overall != null).length >= 2
)

const scoreColor = computed(() => getScoreColor(Number(agent.value?.overall_score)))
</script>

<template>
  <div class="max-w-4xl mx-auto">
    <!-- Skeleton loading state -->
    <div v-if="loading" class="space-y-6">
      <!-- Back link skeleton -->
      <SkeletonLoader variant="text" width="6rem" />

      <!-- Header skeleton -->
      <div class="glass-card p-6">
        <div class="flex items-start justify-between gap-4 mb-4">
          <div class="flex-1 space-y-3">
            <SkeletonLoader variant="text" width="60%" height="1.75rem" />
            <SkeletonLoader variant="text" width="40%" />
            <div class="flex gap-2">
              <SkeletonLoader variant="badge" />
              <SkeletonLoader variant="badge" />
              <SkeletonLoader variant="badge" />
            </div>
          </div>
          <SkeletonLoader variant="circle" height="4rem" />
        </div>
      </div>

      <!-- Action item skeleton -->
      <SkeletonLoader variant="card" height="5rem" />

      <!-- Chart skeleton -->
      <SkeletonLoader variant="chart" />

      <!-- Score breakdown skeleton -->
      <SkeletonLoader variant="card" />
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="text-center py-16">
      <p class="text-score-failing text-lg mb-4">{{ error }}</p>
      <RouterLink to="/browse" class="text-accent hover:text-accent-hover transition-colors">
        Back to Browse
      </RouterLink>
    </div>

    <!-- Main content -->
    <template v-else-if="agent">
      <!-- Back navigation -->
      <RouterLink
        to="/browse"
        class="inline-flex items-center gap-1.5 text-text-muted hover:text-text-secondary transition-colors text-sm mb-6"
      >
        <ArrowLeftIcon class="w-4 h-4" />
        Back to Browse
      </RouterLink>

      <!-- Agent header card -->
      <div class="glass-card p-6 mb-6">
        <div class="flex items-start justify-between gap-4 mb-4">
          <div class="min-w-0 flex-1">
            <h1 class="text-2xl font-bold text-text-primary mb-1">{{ agent.name }}</h1>
            <p class="text-text-secondary text-sm">{{ agent.role }}</p>
          </div>

          <!-- Score display -->
          <div class="text-right shrink-0">
            <ScoreBadge :score="agent.overall_score" size="lg" />
            <div v-if="trendArrow" :class="trendArrow.color" class="text-sm font-medium mt-1" :title="trendArrow.label">
              {{ trendArrow.symbol }} {{ trendArrow.label }}
            </div>
          </div>
        </div>

        <!-- Badges row -->
        <div class="flex items-center gap-2 flex-wrap mb-4">
          <DeptBadge :department="agent.department" />
          <RatingLabel :label="ratingLabel" />
          <ConfidenceBadge :confidence="confidence" />
          <StatusBadge v-if="agent.status && agent.status !== 'active'" :status="agent.status" />
          <ModelBadge :model="agent.model" />
        </div>

        <!-- Metadata row -->
        <div class="flex items-center gap-4 text-text-muted text-xs">
          <span class="flex items-center gap-1">
            <ChartBarIcon class="w-3.5 h-3.5" />
            {{ agent.eval_count || 0 }} evaluations
          </span>
          <span v-if="agent.source_type" class="flex items-center gap-1">
            Source: {{ agent.source_type }}
          </span>
        </div>

        <!-- Persona (collapsible) -->
        <div v-if="agent.persona" class="mt-4 pt-4 border-t border-eval-border">
          <button
            @click="showPersona = !showPersona"
            :aria-expanded="showPersona"
            class="flex items-center gap-1.5 text-text-muted text-sm hover:text-text-secondary transition-colors"
          >
            <ChevronDownIcon
              class="w-4 h-4 transition-transform duration-200"
              :class="{ 'rotate-180': showPersona }"
            />
            {{ showPersona ? 'Hide persona' : 'Show persona' }}
          </button>
          <div v-if="showPersona" class="mt-3 p-4 bg-eval-surface rounded-lg">
            <p class="text-text-secondary text-sm whitespace-pre-line leading-relaxed">{{ agent.persona }}</p>
          </div>
        </div>
      </div>

      <!-- Action item -->
      <div v-if="latestAction" class="glass-card p-5 mb-6 border-l-2 border-l-accent">
        <div class="flex items-start gap-3">
          <LightBulbIcon class="w-5 h-5 text-accent shrink-0 mt-0.5" />
          <div>
            <div class="text-accent text-xs font-medium uppercase tracking-wider mb-1.5">Current Action Item</div>
            <p class="text-text-primary text-sm leading-relaxed">{{ latestAction }}</p>
          </div>
        </div>
      </div>

      <!-- Evaluate CTA -->
      <div class="flex gap-3 mb-6">
        <RouterLink
          :to="`/evaluate?agent=${agent.id}`"
          class="inline-flex items-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent-hover rounded-lg text-white font-medium transition-colors"
        >
          <PencilSquareIcon class="w-4 h-4" />
          Evaluate this agent
        </RouterLink>
        <RouterLink
          v-if="agent.status === 'active'"
          :to="`/agent/${agent.id}/edit`"
          class="inline-flex items-center gap-2 px-5 py-2.5 bg-eval-card hover:bg-eval-surface border border-eval-border rounded-lg text-text-secondary hover:text-text-primary transition-colors"
        >
          Edit
        </RouterLink>
      </div>

      <!-- Score trend chart -->
      <section v-if="showChart" class="glass-card p-5 mb-6">
        <h2 class="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
          <ChartBarIcon class="w-4 h-4 text-accent" />
          Score Trend
        </h2>
        <TrendChart :evaluations="evaluations" :height="200" />
      </section>

      <!-- Score Breakdown -->
      <section v-if="latestScores" class="mb-6">
        <h2 class="text-sm font-semibold text-text-primary mb-3">Latest Score Breakdown</h2>
        <div class="glass-card p-5">
          <ScoreBreakdown :scores="latestScores" :kpi-names="kpiNames" />
        </div>
      </section>

      <!-- Evaluation History -->
      <section>
        <h2 class="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
          <ClockIcon class="w-4 h-4 text-text-muted" />
          Evaluation History
          <span class="text-text-muted text-xs font-normal">({{ evaluations.length }})</span>
        </h2>

        <div v-if="evaluations.length === 0" class="glass-card p-8 text-center">
          <p class="text-text-muted text-sm mb-3">No evaluations yet.</p>
          <RouterLink
            :to="`/evaluate?agent=${agent.id}`"
            class="text-accent hover:text-accent-hover text-sm transition-colors"
          >
            Be the first to evaluate this agent
          </RouterLink>
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
