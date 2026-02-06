<script setup>
import { computed } from 'vue'
import { getScoreColor, getScoreBgColor } from '@/services/scoring'

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
  props.score != null ? props.score.toFixed(1) : '--'
)
</script>

<template>
  <span
    :class="[colorClass, bgClass, sizeClasses]"
    class="inline-flex items-center justify-center tabular-nums"
  >
    {{ displayScore }}
  </span>
</template>
