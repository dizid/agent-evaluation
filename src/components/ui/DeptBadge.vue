<script setup>
import { computed } from 'vue'
import { getDeptColor } from '@/services/scoring'
import {
  CodeBracketIcon,
  MegaphoneIcon,
  CogIcon,
  WrenchScrewdriverIcon,
  ChartBarIcon
} from '@heroicons/vue/20/solid'

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

const fullName = computed(() => {
  switch (props.department) {
    case 'development': return 'Development'
    case 'marketing': return 'Marketing'
    case 'operations': return 'Operations'
    case 'tools': return 'Tools'
    case 'trading': return 'Trading'
    default: return props.department
  }
})

const iconComponent = computed(() => {
  switch (props.department) {
    case 'development': return CodeBracketIcon
    case 'marketing': return MegaphoneIcon
    case 'operations': return CogIcon
    case 'tools': return WrenchScrewdriverIcon
    case 'trading': return ChartBarIcon
    default: return null
  }
})

const tooltipText = computed(() => `Department: ${fullName.value}`)
</script>

<template>
  <span
    :class="[colorClass, bgClass]"
    class="badge-tooltip inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium"
    :data-tooltip="tooltipText"
    role="status"
    :aria-label="`Department: ${fullName}`"
  >
    <component :is="iconComponent" v-if="iconComponent" class="w-3 h-3" />
    {{ label }}
  </span>
</template>
