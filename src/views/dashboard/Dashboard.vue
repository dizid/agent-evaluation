<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useOrgContext } from '@/composables/useOrgContext.js'
import { useToast } from '@/composables/useToast.js'
import { getAgents, getLeaderboard, getCategories } from '@/services/api.js'
import ScoreBadge from '@/components/ui/ScoreBadge.vue'
import DeptBadge from '@/components/ui/DeptBadge.vue'

const router = useRouter()
const { currentOrg } = useOrgContext()
const toast = useToast()

const loading = ref(true)
const agents = ref([])
const leaderboard = ref([])
const categories = ref([])

const stats = computed(() => {
  const activeAgents = agents.value.filter(a => a.status === 'active')
  const totalEvaluations = activeAgents.reduce((sum, a) => sum + (a.eval_count || 0), 0)

  // Calculate average score from leaderboard dept averages
  const avgScore = leaderboard.value.length > 0
    ? leaderboard.value.reduce((sum, item) => sum + Number(item.overall_score), 0) / leaderboard.value.length
    : 0

  // Top performer
  const topPerformer = leaderboard.value[0] || null

  return {
    activeCount: activeAgents.length,
    avgScore: avgScore.toFixed(1),
    totalEvaluations,
    topPerformer
  }
})

const deptStats = computed(() => {
  return categories.value.map(cat => {
    const deptAgents = agents.value.filter(a => a.department === cat.department && a.status === 'active')
    const avgScore = deptAgents.length > 0
      ? deptAgents.reduce((sum, a) => sum + Number(a.overall_score || 0), 0) / deptAgents.length
      : 0

    return {
      name: cat.department,
      count: deptAgents.length,
      avgScore: avgScore.toFixed(1),
      color: getDeptColor(cat.department)
    }
  }).filter(d => d.count > 0)
})

const topAgents = computed(() => leaderboard.value.slice(0, 5))

function getDeptColor(dept) {
  const colors = {
    'Development': '#7c3aed',
    'Marketing': '#f59e0b',
    'Operations': '#06b6d4',
    'Tools': '#10b981',
    'Trading': '#f43f5e'
  }
  return colors[dept] || '#8b5cf6'
}

async function loadData() {
  loading.value = true
  try {
    const [agentsRes, leaderboardRes, categoriesRes] = await Promise.all([
      getAgents(),
      getLeaderboard(),
      getCategories()
    ])

    agents.value = agentsRes.agents || []
    leaderboard.value = leaderboardRes.agents || []
    categories.value = categoriesRes.categories || []
  } catch (err) {
    toast.error('Failed to load dashboard data')
    console.error(err)
  } finally {
    loading.value = false
  }
}

onMounted(loadData)
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 py-8">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-text-primary mb-2">Dashboard</h1>
      <p class="text-text-secondary">
        {{ currentOrg?.name || 'Your Organization' }}
      </p>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div v-for="i in 4" :key="i" class="glass-card p-6 h-32 animate-pulse"></div>
      </div>
    </div>

    <!-- Content -->
    <div v-else class="space-y-6">
      <!-- Stat cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="glass-card p-6">
          <div class="text-text-muted text-sm mb-2">Active Agents</div>
          <div class="text-3xl font-bold text-text-primary">{{ stats.activeCount }}</div>
        </div>

        <div class="glass-card p-6">
          <div class="text-text-muted text-sm mb-2">Average Score</div>
          <div class="flex items-center space-x-2">
            <div class="text-3xl font-bold text-text-primary">{{ stats.avgScore }}</div>
            <ScoreBadge :score="Number(stats.avgScore)" size="sm" />
          </div>
        </div>

        <div class="glass-card p-6">
          <div class="text-text-muted text-sm mb-2">Total Evaluations</div>
          <div class="text-3xl font-bold text-text-primary">{{ stats.totalEvaluations }}</div>
        </div>

        <div class="glass-card p-6">
          <div class="text-text-muted text-sm mb-2">Top Performer</div>
          <div v-if="stats.topPerformer" class="flex items-center justify-between">
            <div class="text-lg font-semibold text-text-primary truncate mr-2">
              {{ stats.topPerformer.name }}
            </div>
            <ScoreBadge :score="Number(stats.topPerformer.overall_score)" size="sm" />
          </div>
          <div v-else class="text-text-muted text-sm">No data yet</div>
        </div>
      </div>

      <!-- Department breakdown -->
      <div class="glass-card p-6">
        <h2 class="text-xl font-bold text-text-primary mb-4">Departments</h2>
        <div class="space-y-4">
          <div
            v-for="dept in deptStats"
            :key="dept.name"
            class="flex items-center space-x-4"
          >
            <div class="flex-1">
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center space-x-2">
                  <DeptBadge :department="dept.name" />
                  <span class="text-text-muted text-sm">{{ dept.count }} agents</span>
                </div>
                <ScoreBadge :score="Number(dept.avgScore)" size="sm" />
              </div>
              <div class="w-full bg-eval-surface rounded-full h-2 overflow-hidden">
                <div
                  class="h-full rounded-full transition-all duration-500"
                  :style="{
                    width: `${(Number(dept.avgScore) / 10) * 100}%`,
                    backgroundColor: dept.color
                  }"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Top 5 agents -->
      <div class="glass-card p-6">
        <h2 class="text-xl font-bold text-text-primary mb-4">Top Performers</h2>
        <div class="space-y-3">
          <div
            v-for="(agent, index) in topAgents"
            :key="agent.id"
            class="flex items-center justify-between p-3 bg-eval-surface rounded-lg hover:bg-eval-card transition-colors cursor-pointer"
            @click="router.push(`/agent/${agent.id}`)"
          >
            <div class="flex items-center space-x-3">
              <div
                class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                :class="{
                  'bg-yellow-500 text-white': index === 0,
                  'bg-gray-400 text-white': index === 1,
                  'bg-orange-600 text-white': index === 2,
                  'bg-eval-card text-text-muted': index > 2
                }"
              >
                {{ index + 1 }}
              </div>
              <div>
                <div class="text-text-primary font-medium">{{ agent.name }}</div>
                <DeptBadge :department="agent.department" size="sm" />
              </div>
            </div>
            <ScoreBadge :score="Number(agent.overall_score)" />
          </div>
        </div>
      </div>

      <!-- Quick actions -->
      <div class="glass-card p-6">
        <h2 class="text-xl font-bold text-text-primary mb-4">Quick Actions</h2>
        <div class="flex flex-wrap gap-3">
          <button
            @click="router.push('/evaluate')"
            class="px-4 py-2 bg-accent hover:bg-accent-hover rounded-lg text-white font-semibold transition-colors"
          >
            Evaluate Agent
          </button>
          <button
            @click="router.push('/browse')"
            class="px-4 py-2 bg-eval-surface hover:bg-eval-card border border-eval-border rounded-lg text-text-primary transition-colors"
          >
            Browse Agents
          </button>
          <button
            @click="router.push('/marketplace')"
            class="px-4 py-2 bg-eval-surface hover:bg-eval-card border border-eval-border rounded-lg text-text-primary transition-colors"
          >
            Marketplace
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
