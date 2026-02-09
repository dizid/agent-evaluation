<script setup>
import { computed } from 'vue'
import { getScoreColor, getScoreBgColor, getRatingLabel } from '@/services/scoring'

const props = defineProps({
  score: { type: Number, default: null },
  size: { type: String, default: 'md', validator: v => ['sm', 'md', 'lg'].includes(v) }
})

const colorClass = computed(() => getScoreColor(props.score))
const bgClass = computed(() => getScoreBgColor(props.score))

const sizeClasses = computed(() => {
  switch (props.size) {
    case 'sm': return 'text-sm px-2 py-0.5 rounded-md'
    case 'lg': return 'text-2xl px-4 py-2 rounded-xl font-bold'
    default: return 'text-base px-3 py-1 rounded-lg font-semibold'
  }
})

const displayScore = computed(() =>
  props.score != null ? Number(props.score).toFixed(1) : '--'
)

const isElite = computed(() => props.score != null && props.score >= 9.0)

const tooltipText = computed(() => {
  if (props.score == null) return 'No score yet'
  const label = getRatingLabel(props.score) || ''
  return `Performance score: ${displayScore.value} / 10 (${label})`
})

const ariaText = computed(() => {
  if (props.score == null) return 'Score not available'
  return `Score ${displayScore.value} out of 10`
})
</script>

<template>
  <span
    :class="[colorClass, bgClass, sizeClasses, { 'animate-pulse-glow': isElite }]"
    class="badge-tooltip inline-flex items-center justify-center tabular-nums animate-fade-in"
    :data-tooltip="tooltipText"
    role="status"
    :aria-label="ariaText"
  >
    {{ displayScore }}
  </span>
</template>
