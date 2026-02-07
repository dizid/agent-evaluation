<script setup>
import { computed } from 'vue'

const props = defineProps({
  status: { type: String, required: true }
})

const colorClass = computed(() => {
  switch (props.status) {
    case 'active': return 'text-green-400 bg-green-400/10 border-green-400/20'
    case 'archived': return 'text-gray-400 bg-gray-400/10 border-gray-400/20'
    case 'fired': return 'text-red-400 bg-red-400/10 border-red-400/20'
    default: return 'text-gray-400 bg-gray-400/10 border-gray-400/20'
  }
})

const label = computed(() => {
  switch (props.status) {
    case 'active': return 'Active'
    case 'archived': return 'Archived'
    case 'fired': return 'Fired'
    default: return props.status
  }
})
</script>

<template>
  <span
    :class="colorClass"
    class="inline-flex items-center text-xs px-2 py-0.5 rounded-full border font-medium"
  >
    {{ label }}
  </span>
</template>
