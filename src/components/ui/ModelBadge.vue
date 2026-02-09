<script setup>
import { computed } from 'vue'

const props = defineProps({
  model: { type: String, default: null }
})

const colorClass = computed(() => {
  switch (props.model) {
    case 'opus': return 'text-purple-400 bg-purple-400/10 border-purple-400/20'
    case 'sonnet': return 'text-blue-400 bg-blue-400/10 border-blue-400/20'
    case 'haiku': return 'text-teal-400 bg-teal-400/10 border-teal-400/20'
    default: return 'text-gray-400 bg-gray-400/10 border-gray-400/20'
  }
})

const modelFullName = computed(() => {
  switch (props.model) {
    case 'opus': return 'claude-opus-4-6'
    case 'sonnet': return 'claude-sonnet-4-5'
    case 'haiku': return 'claude-haiku-4-5'
    default: return props.model || 'unknown'
  }
})

const tooltipText = computed(() => `AI Model: ${props.model || 'unknown'} (${modelFullName.value})`)
</script>

<template>
  <span
    v-if="model"
    :class="colorClass"
    class="badge-tooltip inline-flex items-center text-xs px-2 py-0.5 rounded-full border font-medium capitalize"
    :data-tooltip="tooltipText"
    role="status"
    :aria-label="tooltipText"
  >
    {{ model }}
  </span>
</template>
