<script setup>
import { computed } from 'vue'
import { StarIcon, CheckCircleIcon, MinusCircleIcon, ExclamationCircleIcon, XCircleIcon } from '@heroicons/vue/20/solid'

const props = defineProps({
  label: { type: String, default: null },
  size: { type: String, default: 'md', validator: v => ['sm', 'md'].includes(v) }
})

const colorClass = computed(() => {
  switch (props.label) {
    case 'Elite': return 'text-score-elite'
    case 'Advanced': return 'text-score-advanced'
    case 'Strong': return 'text-score-strong'
    case 'Solid': return 'text-score-solid'
    case 'Adequate': return 'text-score-adequate'
    case 'Weak': return 'text-score-weak'
    case 'Failing': return 'text-score-failing'
    default: return 'text-text-muted'
  }
})

const sizeClass = computed(() =>
  props.size === 'sm' ? 'text-xs' : 'text-sm'
)

const iconComponent = computed(() => {
  switch (props.label) {
    case 'Elite': return StarIcon
    case 'Advanced': return CheckCircleIcon
    case 'Strong': return CheckCircleIcon
    case 'Solid': return MinusCircleIcon
    case 'Adequate': return MinusCircleIcon
    case 'Weak': return ExclamationCircleIcon
    case 'Failing': return XCircleIcon
    default: return null
  }
})

const iconSize = computed(() =>
  props.size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'
)

const tooltipText = computed(() => {
  switch (props.label) {
    case 'Elite': return 'Rating: Elite \u2014 scores 9.0-10.0'
    case 'Advanced': return 'Rating: Advanced \u2014 scores 8.0-8.9'
    case 'Strong': return 'Rating: Strong \u2014 scores 7.0-7.9'
    case 'Solid': return 'Rating: Solid \u2014 scores 6.0-6.9'
    case 'Adequate': return 'Rating: Adequate \u2014 scores 5.0-5.9'
    case 'Weak': return 'Rating: Weak \u2014 scores 3.0-4.9'
    case 'Failing': return 'Rating: Failing \u2014 scores below 3.0'
    default: return 'Not yet rated'
  }
})

const displayLabel = computed(() => props.label || 'Unrated')
</script>

<template>
  <span
    :class="[colorClass, sizeClass]"
    class="badge-tooltip inline-flex items-center gap-1 font-medium uppercase tracking-wide"
    :data-tooltip="tooltipText"
    role="status"
    :aria-label="`Rating: ${displayLabel}`"
  >
    <component :is="iconComponent" v-if="iconComponent" :class="iconSize" />
    {{ displayLabel }}
  </span>
</template>
