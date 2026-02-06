<script setup>
import { computed } from 'vue'

const props = defineProps({
  label: { type: String, default: null },
  size: { type: String, default: 'md', validator: v => ['sm', 'md'].includes(v) }
})

const colorClass = computed(() => {
  switch (props.label) {
    case 'Elite': return 'text-score-elite'
    case 'Strong': return 'text-score-strong'
    case 'Adequate': return 'text-score-adequate'
    case 'Weak': return 'text-score-weak'
    case 'Failing': return 'text-score-failing'
    default: return 'text-text-muted'
  }
})

const sizeClass = computed(() =>
  props.size === 'sm' ? 'text-xs' : 'text-sm'
)
</script>

<template>
  <span :class="[colorClass, sizeClass]" class="font-medium uppercase tracking-wide">
    {{ label || 'Unrated' }}
  </span>
</template>
