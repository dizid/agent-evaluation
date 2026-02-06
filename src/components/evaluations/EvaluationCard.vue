<script setup>
import { ref, computed } from 'vue'
import ScoreBadge from '@/components/ui/ScoreBadge.vue'
import RatingLabel from '@/components/ui/RatingLabel.vue'
import ScoreBreakdown from '@/components/agents/ScoreBreakdown.vue'
import { getRatingLabel, UNIVERSAL_CRITERIA, getScoreColor } from '@/services/scoring'

const props = defineProps({
  evaluation: { type: Object, required: true }
})

const expanded = ref(false)

const ratingLabel = computed(() =>
  props.evaluation.rating_label || getRatingLabel(props.evaluation.overall)
)

const formattedDate = computed(() => {
  if (!props.evaluation.created_at) return ''
  const d = new Date(props.evaluation.created_at)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
})

const evaluatorLabel = computed(() =>
  props.evaluation.evaluator_type === 'self' ? 'Self-eval' : 'Community'
)

// Find top strength (highest scoring criterion)
const topStrength = computed(() => {
  if (props.evaluation.top_strength) return props.evaluation.top_strength
  if (!props.evaluation.scores) return null
  let best = null
  let bestScore = 0
  for (const [key, val] of Object.entries(props.evaluation.scores)) {
    if (val > bestScore) {
      bestScore = val
      best = key
    }
  }
  return best ? formatLabel(best) : null
})

// Find top weakness (lowest scoring criterion)
const topWeakness = computed(() => {
  if (props.evaluation.top_weakness) return props.evaluation.top_weakness
  if (!props.evaluation.scores) return null
  let worst = null
  let worstScore = 11
  for (const [key, val] of Object.entries(props.evaluation.scores)) {
    if (val < worstScore) {
      worstScore = val
      worst = key
    }
  }
  return worst ? formatLabel(worst) : null
})

function formatLabel(key) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

// Determine KPI names from scores (keys not in UNIVERSAL_CRITERIA)
const kpiNames = computed(() => {
  if (!props.evaluation.scores) return []
  return Object.keys(props.evaluation.scores).filter(k => !UNIVERSAL_CRITERIA.includes(k))
})
</script>

<template>
  <div class="glass-card p-4">
    <!-- Header -->
    <div class="flex items-start justify-between gap-3 mb-3">
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-2 flex-wrap">
          <ScoreBadge :score="evaluation.overall" size="sm" />
          <RatingLabel :label="ratingLabel" size="sm" />
          <span class="text-text-muted text-xs">{{ evaluatorLabel }}</span>
        </div>
        <p v-if="evaluation.task_description" class="text-text-secondary text-sm mt-1.5 line-clamp-2">
          {{ evaluation.task_description }}
        </p>
      </div>
      <span class="text-text-muted text-xs shrink-0">{{ formattedDate }}</span>
    </div>

    <!-- Quick insights -->
    <div class="flex flex-col gap-1.5 text-xs mb-3">
      <div v-if="topStrength" class="flex items-center gap-2">
        <span class="text-score-elite">Strength:</span>
        <span class="text-text-secondary">{{ topStrength }}</span>
      </div>
      <div v-if="topWeakness" class="flex items-center gap-2">
        <span class="text-score-weak">Weakness:</span>
        <span class="text-text-secondary">{{ topWeakness }}</span>
      </div>
      <div v-if="evaluation.action_item" class="flex items-start gap-2">
        <span class="text-accent shrink-0">Action:</span>
        <span class="text-text-secondary">{{ evaluation.action_item }}</span>
      </div>
    </div>

    <!-- Expand toggle -->
    <button
      v-if="evaluation.scores"
      @click="expanded = !expanded"
      class="text-xs text-text-muted hover:text-text-secondary transition-colors py-1"
    >
      {{ expanded ? 'Hide details' : 'Show score breakdown' }}
    </button>

    <!-- Expanded breakdown -->
    <div v-if="expanded && evaluation.scores" class="mt-3 pt-3 border-t border-eval-border">
      <ScoreBreakdown :scores="evaluation.scores" :kpi-names="kpiNames" />
    </div>
  </div>
</template>
