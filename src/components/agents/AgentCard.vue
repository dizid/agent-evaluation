<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon, MinusIcon, ChartBarIcon } from '@heroicons/vue/24/outline'
import ScoreBadge from '@/components/ui/ScoreBadge.vue'
import RatingLabel from '@/components/ui/RatingLabel.vue'
import DeptBadge from '@/components/ui/DeptBadge.vue'
import ConfidenceBadge from '@/components/ui/ConfidenceBadge.vue'

const props = defineProps({
  agent: { type: Object, required: true }
})

const trendIcon = computed(() => {
  const t = props.agent.trend
  if (t === 'up') return ArrowTrendingUpIcon
  if (t === 'down') return ArrowTrendingDownIcon
  if (t === 'stable') return MinusIcon
  return null
})

const trendColor = computed(() => {
  const t = props.agent.trend
  if (t === 'up') return 'text-score-elite'
  if (t === 'down') return 'text-score-failing'
  return 'text-text-muted'
})

const trendLabel = computed(() => {
  const t = props.agent.trend
  if (t === 'up') return 'Trending up'
  if (t === 'down') return 'Trending down'
  if (t === 'stable') return 'Stable'
  return ''
})
</script>

<template>
  <RouterLink
    :to="`/agent/${agent.id}`"
    class="agent-card glass-card block p-4 min-h-[120px] active:scale-[0.98] transition-all duration-200"
  >
    <!-- Header: score badge + name -->
    <div class="flex items-start gap-3 mb-3">
      <ScoreBadge :score="agent.overall_score" size="md" />
      <div class="min-w-0 flex-1">
        <h3 class="text-text-primary font-semibold truncate">{{ agent.name }}</h3>
        <p class="text-text-muted text-xs mt-0.5 truncate">{{ agent.role }}</p>
      </div>
      <!-- Trend icon -->
      <component
        v-if="trendIcon"
        :is="trendIcon"
        :class="trendColor"
        class="w-5 h-5 shrink-0"
        :title="trendLabel"
      />
    </div>

    <!-- Badges row -->
    <div class="flex items-center gap-2 flex-wrap mb-3">
      <DeptBadge :department="agent.department" />
      <RatingLabel :label="agent.rating_label" size="sm" />
      <ConfidenceBadge :confidence="agent.confidence" />
    </div>

    <!-- Footer: eval count -->
    <div class="flex items-center gap-1.5 text-xs text-text-muted">
      <ChartBarIcon class="w-3.5 h-3.5" />
      <span>{{ agent.eval_count || 0 }} evaluations</span>
    </div>
  </RouterLink>
</template>

<style scoped>
.agent-card {
  transform: translateY(0);
}

.agent-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 0 20px rgba(124, 58, 237, 0.1);
}
</style>
