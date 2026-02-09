<script setup>
import { computed, ref } from 'vue'
import { UNIVERSAL_CRITERIA, getScoreColor } from '@/services/scoring'
import { formatLabel } from '@/utils/format'
import {
  CheckCircleIcon,
  ShieldCheckIcon,
  BoltIcon,
  ScaleIcon,
  ChatBubbleLeftRightIcon,
  AcademicCapIcon,
  CogIcon,
  LockClosedIcon
} from '@heroicons/vue/24/outline'

const props = defineProps({
  scores: { type: Object, default: () => ({}) },
  kpiNames: { type: Array, default: () => [] }
})

// Map criteria keys to heroicons
const criteriaIcons = {
  task_completion: CheckCircleIcon,
  accuracy: ShieldCheckIcon,
  efficiency: BoltIcon,
  judgment: ScaleIcon,
  communication: ChatBubbleLeftRightIcon,
  domain_expertise: AcademicCapIcon,
  autonomy: CogIcon,
  safety: LockClosedIcon
}

// Get bar width as percentage (1-10 scale mapped to 10-100%)
function barWidth(score) {
  if (score == null) return '0%'
  return `${(score / 10) * 100}%`
}

// Get bar color class from score
function barColor(score) {
  if (score == null) return 'bg-eval-border'
  if (score >= 9) return 'bg-score-elite'
  if (score >= 7) return 'bg-score-strong'
  if (score >= 5) return 'bg-score-adequate'
  if (score >= 3) return 'bg-score-weak'
  return 'bg-score-failing'
}

const universalRows = computed(() =>
  UNIVERSAL_CRITERIA.map(key => ({
    key,
    label: formatLabel(key),
    score: props.scores[key] ?? null,
    icon: criteriaIcons[key] || null
  }))
)

const kpiRows = computed(() =>
  props.kpiNames.map(key => ({
    key,
    label: formatLabel(key),
    score: props.scores[key] ?? null
  }))
)

// Tooltip state
const hoveredKey = ref(null)
</script>

<template>
  <div class="space-y-5">
    <!-- Universal Criteria -->
    <div>
      <h4 class="text-text-secondary text-xs uppercase tracking-wider mb-3">Universal Criteria</h4>
      <div class="space-y-2.5">
        <div
          v-for="row in universalRows"
          :key="row.key"
          class="group flex items-center gap-2.5"
          @mouseenter="hoveredKey = row.key"
          @mouseleave="hoveredKey = null"
        >
          <!-- Icon -->
          <component
            :is="row.icon"
            v-if="row.icon"
            class="w-4 h-4 text-text-muted shrink-0 group-hover:text-text-secondary transition-colors"
          />
          <div v-else class="w-4 shrink-0" />

          <!-- Label -->
          <span class="text-text-secondary text-sm w-28 shrink-0 truncate">{{ row.label }}</span>

          <!-- Bar -->
          <div class="relative flex-1 h-2.5 bg-eval-surface rounded-full overflow-hidden">
            <div
              class="score-bar h-full rounded-full"
              :class="barColor(row.score)"
              :style="{ width: barWidth(row.score) }"
            />
            <!-- Tooltip on hover -->
            <div
              v-if="hoveredKey === row.key && row.score != null"
              class="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-eval-card border border-eval-border rounded text-xs text-text-primary whitespace-nowrap pointer-events-none z-10"
            >
              {{ row.label }}: {{ row.score }}/10
            </div>
          </div>

          <!-- Score value -->
          <span
            :class="getScoreColor(row.score)"
            class="text-sm font-medium w-8 text-right tabular-nums"
          >
            {{ row.score != null ? row.score : '--' }}
          </span>
        </div>
      </div>
    </div>

    <!-- Divider -->
    <div v-if="kpiRows.length > 0" class="border-t border-eval-border" />

    <!-- Role KPIs -->
    <div v-if="kpiRows.length > 0">
      <h4 class="text-text-secondary text-xs uppercase tracking-wider mb-3">Role KPIs</h4>
      <div class="space-y-2.5">
        <div
          v-for="row in kpiRows"
          :key="row.key"
          class="group flex items-center gap-2.5"
          @mouseenter="hoveredKey = row.key"
          @mouseleave="hoveredKey = null"
        >
          <!-- Spacer to align with universal rows that have icons -->
          <div class="w-4 shrink-0" />

          <!-- Label -->
          <span class="text-text-secondary text-sm w-28 shrink-0 truncate">{{ row.label }}</span>

          <!-- Bar -->
          <div class="relative flex-1 h-2.5 bg-eval-surface rounded-full overflow-hidden">
            <div
              class="score-bar h-full rounded-full"
              :class="barColor(row.score)"
              :style="{ width: barWidth(row.score) }"
            />
            <!-- Tooltip on hover -->
            <div
              v-if="hoveredKey === row.key && row.score != null"
              class="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-eval-card border border-eval-border rounded text-xs text-text-primary whitespace-nowrap pointer-events-none z-10"
            >
              {{ row.label }}: {{ row.score }}/10
            </div>
          </div>

          <!-- Score value -->
          <span
            :class="getScoreColor(row.score)"
            class="text-sm font-medium w-8 text-right tabular-nums"
          >
            {{ row.score != null ? row.score : '--' }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
