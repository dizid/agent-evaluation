<script setup>
import { computed } from 'vue'
import { UNIVERSAL_CRITERIA, getScoreColor } from '@/services/scoring'

const props = defineProps({
  scores: { type: Object, default: () => ({}) },
  kpiNames: { type: Array, default: () => [] }
})

// Format criterion key into readable label
function formatLabel(key) {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
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
    score: props.scores[key] ?? null
  }))
)

const kpiRows = computed(() =>
  props.kpiNames.map(key => ({
    key,
    label: formatLabel(key),
    score: props.scores[key] ?? null
  }))
)
</script>

<template>
  <div class="space-y-4">
    <!-- Universal Criteria -->
    <div>
      <h4 class="text-text-secondary text-xs uppercase tracking-wider mb-2">Universal Criteria</h4>
      <div class="space-y-2">
        <div v-for="row in universalRows" :key="row.key" class="flex items-center gap-3">
          <span class="text-text-secondary text-sm w-32 shrink-0 truncate">{{ row.label }}</span>
          <div class="flex-1 h-2 bg-eval-surface rounded-full overflow-hidden">
            <div
              class="score-bar h-full rounded-full"
              :class="barColor(row.score)"
              :style="{ width: barWidth(row.score) }"
            />
          </div>
          <span
            :class="getScoreColor(row.score)"
            class="text-sm font-medium w-8 text-right tabular-nums"
          >
            {{ row.score != null ? row.score : '--' }}
          </span>
        </div>
      </div>
    </div>

    <!-- Role KPIs -->
    <div v-if="kpiRows.length > 0">
      <h4 class="text-text-secondary text-xs uppercase tracking-wider mb-2">Role KPIs</h4>
      <div class="space-y-2">
        <div v-for="row in kpiRows" :key="row.key" class="flex items-center gap-3">
          <span class="text-text-secondary text-sm w-32 shrink-0 truncate">{{ row.label }}</span>
          <div class="flex-1 h-2 bg-eval-surface rounded-full overflow-hidden">
            <div
              class="score-bar h-full rounded-full"
              :class="barColor(row.score)"
              :style="{ width: barWidth(row.score) }"
            />
          </div>
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
