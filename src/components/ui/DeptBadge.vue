<script setup>
import { computed } from 'vue'
import { getDeptColor } from '@/services/scoring'

const props = defineProps({
  department: { type: String, required: true }
})

const colorClass = computed(() => getDeptColor(props.department))

const bgClass = computed(() => {
  switch (props.department) {
    case 'development': return 'bg-dept-dev/10 border-dept-dev/20'
    case 'marketing': return 'bg-dept-marketing/10 border-dept-marketing/20'
    case 'operations': return 'bg-dept-ops/10 border-dept-ops/20'
    case 'tools': return 'bg-dept-tools/10 border-dept-tools/20'
    case 'trading': return 'bg-dept-trading/10 border-dept-trading/20'
    default: return 'bg-white/5 border-eval-border'
  }
})

const label = computed(() => {
  switch (props.department) {
    case 'development': return 'Dev'
    case 'marketing': return 'Marketing'
    case 'operations': return 'Ops'
    case 'tools': return 'Tools'
    case 'trading': return 'Trading'
    default: return props.department
  }
})
</script>

<template>
  <span
    :class="[colorClass, bgClass]"
    class="inline-flex items-center text-xs px-2 py-0.5 rounded-full border font-medium"
  >
    {{ label }}
  </span>
</template>
