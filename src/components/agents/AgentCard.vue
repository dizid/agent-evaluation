<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import ScoreBadge from '@/components/ui/ScoreBadge.vue'
import RatingLabel from '@/components/ui/RatingLabel.vue'
import DeptBadge from '@/components/ui/DeptBadge.vue'
import ConfidenceBadge from '@/components/ui/ConfidenceBadge.vue'

const props = defineProps({
  agent: { type: Object, required: true }
})

// Trend stored as string: 'up', 'down', 'stable'
const trendArrow = computed(() => {
  const t = props.agent.trend
  if (t === 'up') return '\u2191'
  if (t === 'down') return '\u2193'
  if (t === 'stable') return '\u2192'
  return ''
})

const trendColor = computed(() => {
  const t = props.agent.trend
  if (t === 'up') return 'text-score-elite'
  if (t === 'down') return 'text-score-failing'
  return 'text-text-muted'
})
</script>

<template>
  <RouterLink
    :to="`/agent/${agent.id}`"
    class="glass-card block p-4 min-h-[120px] active:scale-[0.98] transition-transform"
  >
    <!-- Header: name + department -->
    <div class="flex items-start justify-between gap-2 mb-3">
      <div class="min-w-0">
        <h3 class="text-text-primary font-semibold truncate">{{ agent.name }}</h3>
        <p class="text-text-muted text-xs mt-0.5 truncate">{{ agent.role }}</p>
      </div>
      <ScoreBadge :score="agent.overall_score" size="md" />
    </div>

    <!-- Badges row -->
    <div class="flex items-center gap-2 flex-wrap mb-3">
      <DeptBadge :department="agent.department" />
      <RatingLabel :label="agent.rating_label" size="sm" />
      <ConfidenceBadge :confidence="agent.confidence" />
    </div>

    <!-- Footer: eval count + trend -->
    <div class="flex items-center justify-between text-xs text-text-muted">
      <span>{{ agent.eval_count || 0 }} evaluations</span>
      <span v-if="trendArrow" :class="trendColor" class="font-medium">
        {{ trendArrow }}
      </span>
    </div>
  </RouterLink>
</template>
