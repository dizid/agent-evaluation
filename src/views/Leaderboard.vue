<script setup>
import { ref, onMounted, computed } from 'vue'
import { RouterLink } from 'vue-router'
import { getLeaderboard } from '@/services/api'
import { getScoreColor, getDeptColor } from '@/services/scoring'
import ScoreBadge from '@/components/ui/ScoreBadge.vue'
import RatingLabel from '@/components/ui/RatingLabel.vue'
import DeptBadge from '@/components/ui/DeptBadge.vue'

const agents = ref([])
const loading = ref(true)
const error = ref(null)
const deptFilter = ref('all')

const departments = [
  { value: 'all', label: 'All' },
  { value: 'development', label: 'Dev' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'operations', label: 'Ops' }
]

onMounted(async () => {
  try {
    const data = await getLeaderboard()
    agents.value = Array.isArray(data) ? data : data.agents || data.leaderboard || []
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
})

const filtered = computed(() => {
  let result = [...agents.value]
  if (deptFilter.value !== 'all') {
    result = result.filter(a => a.department === deptFilter.value)
  }
  // Already sorted by score from API, but ensure
  result.sort((a, b) => (b.overall_score || 0) - (a.overall_score || 0))
  return result
})

// Trend stored as string: 'up', 'down', 'stable'
function trendArrow(agent) {
  if (agent.trend === 'up') return '\u2191'
  if (agent.trend === 'down') return '\u2193'
  if (agent.trend === 'stable') return '\u2192'
  return ''
}

function trendColor(agent) {
  if (agent.trend === 'up') return 'text-score-elite'
  if (agent.trend === 'down') return 'text-score-failing'
  return 'text-text-muted'
}

function rankStyle(index) {
  if (index === 0) return 'text-score-elite font-bold'
  if (index === 1) return 'text-score-strong font-bold'
  if (index === 2) return 'text-score-adequate font-bold'
  return 'text-text-muted'
}
</script>

<template>
  <div class="space-y-6">
    <h1 class="text-2xl font-bold text-text-primary">Agent Leaderboard</h1>

    <!-- Department filter tabs -->
    <div class="flex gap-1 bg-eval-surface rounded-lg p-1 w-fit">
      <button
        v-for="dept in departments"
        :key="dept.value"
        @click="deptFilter = dept.value"
        :class="[
          'px-3 py-1.5 text-sm rounded-md transition-colors',
          deptFilter === dept.value
            ? 'bg-accent text-white'
            : 'text-text-muted hover:text-text-secondary'
        ]"
      >
        {{ dept.label }}
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-text-muted text-center py-12">Loading leaderboard...</div>

    <!-- Error -->
    <div v-else-if="error" class="text-score-failing text-center py-12">{{ error }}</div>

    <!-- Empty -->
    <div v-else-if="filtered.length === 0" class="text-text-muted text-center py-12">
      No agents found.
    </div>

    <!-- Table: desktop -->
    <div v-else class="hidden sm:block">
      <div class="glass-card overflow-hidden">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-eval-border text-text-muted text-xs uppercase tracking-wider">
              <th class="text-left p-3 w-12">#</th>
              <th class="text-left p-3">Agent</th>
              <th class="text-left p-3">Department</th>
              <th class="text-left p-3">Score</th>
              <th class="text-left p-3">Rating</th>
              <th class="text-right p-3">Evals</th>
              <th class="text-right p-3">Trend</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(agent, idx) in filtered"
              :key="agent.id"
              class="border-b border-eval-border/50 last:border-0 hover:bg-white/[0.02] transition-colors"
            >
              <td class="p-3">
                <span :class="rankStyle(idx)" class="tabular-nums">{{ idx + 1 }}</span>
              </td>
              <td class="p-3">
                <RouterLink
                  :to="`/agent/${agent.id}`"
                  class="text-text-primary hover:text-accent transition-colors font-medium"
                >
                  {{ agent.name }}
                </RouterLink>
              </td>
              <td class="p-3">
                <DeptBadge :department="agent.department" />
              </td>
              <td class="p-3">
                <ScoreBadge :score="agent.overall_score" size="sm" />
              </td>
              <td class="p-3">
                <RatingLabel :label="agent.rating_label" size="sm" />
              </td>
              <td class="p-3 text-right text-text-muted tabular-nums">
                {{ agent.eval_count || 0 }}
              </td>
              <td class="p-3 text-right">
                <span :class="trendColor(agent)" class="font-medium">
                  {{ trendArrow(agent) }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Mobile card list -->
    <div v-if="!loading && !error && filtered.length > 0" class="sm:hidden space-y-2">
      <RouterLink
        v-for="(agent, idx) in filtered"
        :key="agent.id"
        :to="`/agent/${agent.id}`"
        class="glass-card flex items-center gap-3 p-3"
      >
        <!-- Rank -->
        <span :class="rankStyle(idx)" class="w-6 text-center tabular-nums text-sm">
          {{ idx + 1 }}
        </span>

        <!-- Info -->
        <div class="flex-1 min-w-0">
          <div class="text-text-primary font-medium text-sm truncate">{{ agent.name }}</div>
          <div class="flex items-center gap-2 mt-0.5">
            <DeptBadge :department="agent.department" />
            <RatingLabel :label="agent.rating_label" size="sm" />
          </div>
        </div>

        <!-- Score -->
        <ScoreBadge :score="agent.overall_score" size="sm" />
      </RouterLink>
    </div>
  </div>
</template>
