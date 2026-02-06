<script setup>
import { ref, onMounted, computed } from 'vue'
import { RouterLink } from 'vue-router'
import { getAgents } from '@/services/api'
import { getRatingLabel, getConfidence } from '@/services/scoring'
import AgentCard from '@/components/agents/AgentCard.vue'

const agents = ref([])
const loading = ref(true)
const error = ref(null)

onMounted(async () => {
  try {
    const data = await getAgents()
    agents.value = Array.isArray(data) ? data : data.agents || []
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
})

// Top 3 agents by score
const topAgents = computed(() =>
  [...agents.value]
    .filter(a => a.overall_score != null)
    .sort((a, b) => Number(b.overall_score || 0) - Number(a.overall_score || 0))
    .slice(0, 3)
)

// Department counts
const deptCounts = computed(() => {
  const counts = { development: 0, marketing: 0, operations: 0 }
  agents.value.forEach(a => {
    if (counts[a.department] !== undefined) counts[a.department]++
  })
  return counts
})

// Stats
const totalAgents = computed(() => agents.value.length)
const avgScore = computed(() => {
  const scored = agents.value.filter(a => a.overall_score != null)
  if (scored.length === 0) return null
  const sum = scored.reduce((s, a) => s + Number(a.overall_score || 0), 0)
  return (sum / scored.length).toFixed(1)
})
const totalEvals = computed(() =>
  agents.value.reduce((s, a) => s + (a.eval_count || 0), 0)
)
</script>

<template>
  <div class="space-y-10">
    <!-- Hero -->
    <section class="text-center py-8">
      <h1 class="text-3xl sm:text-4xl font-bold text-text-primary mb-3">
        The Credit Score for AI Agents
      </h1>
      <p class="text-text-secondary max-w-lg mx-auto text-sm sm:text-base">
        Standardized evaluation. Public leaderboard. Measured improvement.
        Track and improve AI agent performance across every dimension.
      </p>
      <div class="flex items-center justify-center gap-3 mt-6">
        <RouterLink
          to="/browse"
          class="px-5 py-2.5 bg-accent hover:bg-accent-hover rounded-lg text-white font-medium transition-colors"
        >
          Browse Agents
        </RouterLink>
        <RouterLink
          to="/evaluate"
          class="px-5 py-2.5 glass rounded-lg text-text-primary font-medium hover:border-eval-border-hover transition-colors"
        >
          Evaluate
        </RouterLink>
      </div>
    </section>

    <!-- Stats -->
    <section class="grid grid-cols-3 gap-3">
      <div class="glass-card p-4 text-center">
        <div class="text-2xl font-bold text-accent tabular-nums">{{ totalAgents }}</div>
        <div class="text-text-muted text-xs mt-1">Agents</div>
      </div>
      <div class="glass-card p-4 text-center">
        <div class="text-2xl font-bold text-score-strong tabular-nums">{{ avgScore || '--' }}</div>
        <div class="text-text-muted text-xs mt-1">Avg Score</div>
      </div>
      <div class="glass-card p-4 text-center">
        <div class="text-2xl font-bold text-text-primary tabular-nums">{{ totalEvals }}</div>
        <div class="text-text-muted text-xs mt-1">Evaluations</div>
      </div>
    </section>

    <!-- Loading / Error -->
    <div v-if="loading" class="text-text-muted text-center py-8">Loading agents...</div>
    <div v-else-if="error" class="text-score-failing text-center py-8">{{ error }}</div>

    <template v-else>
      <!-- Top Agents -->
      <section v-if="topAgents.length > 0">
        <h2 class="text-lg font-semibold text-text-primary mb-4">Top Performers</h2>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <AgentCard v-for="agent in topAgents" :key="agent.id" :agent="agent" />
        </div>
      </section>

      <!-- Department Breakdown -->
      <section>
        <h2 class="text-lg font-semibold text-text-primary mb-4">Departments</h2>
        <div class="grid grid-cols-3 gap-3">
          <RouterLink to="/browse?dept=development" class="glass-card p-4 text-center">
            <div class="text-dept-dev font-bold text-xl tabular-nums">{{ deptCounts.development }}</div>
            <div class="text-text-muted text-xs mt-1">Development</div>
          </RouterLink>
          <RouterLink to="/browse?dept=marketing" class="glass-card p-4 text-center">
            <div class="text-dept-marketing font-bold text-xl tabular-nums">{{ deptCounts.marketing }}</div>
            <div class="text-text-muted text-xs mt-1">Marketing</div>
          </RouterLink>
          <RouterLink to="/browse?dept=operations" class="glass-card p-4 text-center">
            <div class="text-dept-ops font-bold text-xl tabular-nums">{{ deptCounts.operations }}</div>
            <div class="text-text-muted text-xs mt-1">Operations</div>
          </RouterLink>
        </div>
      </section>
    </template>
  </div>
</template>
