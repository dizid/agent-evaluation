<script setup>
import { computed } from 'vue'
import { CheckCircleIcon, ArchiveBoxIcon, XCircleIcon } from '@heroicons/vue/20/solid'

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

const iconComponent = computed(() => {
  switch (props.status) {
    case 'active': return CheckCircleIcon
    case 'archived': return ArchiveBoxIcon
    case 'fired': return XCircleIcon
    default: return null
  }
})

const tooltipText = computed(() => {
  switch (props.status) {
    case 'active': return 'Status: Active \u2014 visible in Browse and Leaderboard'
    case 'archived': return 'Status: Archived \u2014 hidden from active views'
    case 'fired': return 'Status: Fired \u2014 removed from active roster'
    default: return `Status: ${props.status}`
  }
})
</script>

<template>
  <span
    :class="colorClass"
    class="badge-tooltip inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium"
    :data-tooltip="tooltipText"
    role="status"
    :aria-label="tooltipText"
  >
    <component :is="iconComponent" v-if="iconComponent" class="w-3 h-3" />
    {{ label }}
  </span>
</template>
