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
</script>

<template>
  <span
    v-if="model"
    :class="colorClass"
    class="inline-flex items-center text-xs px-2 py-0.5 rounded-full border font-medium capitalize"
  >
    {{ model }}
  </span>
</template>
