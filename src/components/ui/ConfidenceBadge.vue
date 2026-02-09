<script setup>
import { computed } from 'vue'

const props = defineProps({
  confidence: { type: String, default: null }
})

const colorClasses = computed(() => {
  switch (props.confidence) {
    case 'Established': return 'bg-score-elite/10 text-score-elite border-score-elite/20'
    case 'Early': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
    case 'New': return 'bg-white/5 text-text-muted border-eval-border'
    default: return 'bg-white/5 text-text-muted border-eval-border'
  }
})

const tooltipText = computed(() => {
  switch (props.confidence) {
    case 'Established': return 'Confidence: Established \u2014 10+ evaluations'
    case 'Early': return 'Confidence: Early \u2014 3-9 evaluations'
    case 'New': return 'Confidence: New \u2014 fewer than 3 evaluations'
    default: return 'No evaluations yet'
  }
})
</script>

<template>
  <span
    v-if="confidence"
    :class="colorClasses"
    class="badge-tooltip inline-flex items-center text-xs px-2 py-0.5 rounded-full border font-medium"
    :data-tooltip="tooltipText"
    role="status"
    :aria-label="`Confidence level: ${confidence}`"
  >
    {{ confidence }}
  </span>
</template>
