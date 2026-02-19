<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useOrgContext } from '@/composables/useOrgContext.js'
import { useToast } from '@/composables/useToast.js'
import { getDashboardStats } from '@/services/api.js'
import ScoreBadge from '@/components/ui/ScoreBadge.vue'
import DeptBadge from '@/components/ui/DeptBadge.vue'
import {
  ExclamationTriangleIcon,
  ShieldExclamationIcon,
  ClockIcon,
  XMarkIcon
} from '@heroicons/vue/24/outline'

const router = useRouter()
const { currentOrg } = useOrgContext()
const toast = useToast()

const loading = ref(true)
const dashData = ref(null)
const dismissedAlerts = ref(new Set())

const stats = computed(() => dashData.value?.stats || {})
const deptPerformance = computed(() => dashData.value?.department_performance || [])
const topAgents = computed(() => dashData.value?.top_agents || [])
const pendingActions = computed(() => dashData.value?.pending_action_items || 0)

const alerts = computed(() => {
  const raw = dashData.value?.alerts || []
  return raw.filter(a => !dismissedAlerts.value.has(a.agent_id + a.type))
})

const criticalAlerts = computed(() => alerts.value.filter(a => a.severity === 'critical'))
const warningAlerts = computed(() => alerts.value.filter(a => a.severity === 'warning'))
const infoAlerts = computed(() => alerts.value.filter(a => a.severity === 'info'))

function dismissAlert(alert) {
  dismissedAlerts.value = new Set([...dismissedAlerts.value, alert.agent_id + alert.type])
}

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

function alertIcon(type) {
  if (type === 'low_safety') return ShieldExclamationIcon
  if (type === 'stale') return ClockIcon
  return ExclamationTriangleIcon
}

async function loadData() {
  loading.value = true
  try {
    dashData.value = await getDashboardStats()
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
      <!-- Alert banners -->
      <div v-if="alerts.length > 0" class="space-y-2">
        <!-- Critical alerts (red) -->
        <div
          v-for="alert in criticalAlerts"
          :key="alert.agent_id + alert.type"
          class="flex items-center gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20"
        >
          <component :is="alertIcon(alert.type)" class="w-5 h-5 text-red-400 shrink-0" />
          <div class="flex-1 min-w-0">
            <span
              class="text-red-300 font-medium text-sm cursor-pointer hover:underline"
              @click="router.push(`/agent/${alert.agent_id}`)"
            >{{ alert.agent_name }}</span>
            <span class="text-red-400/70 text-sm ml-2">{{ alert.message }}</span>
          </div>
          <button @click="dismissAlert(alert)" class="text-red-400/50 hover:text-red-400 shrink-0">
            <XMarkIcon class="w-4 h-4" />
          </button>
        </div>

        <!-- Warning alerts (amber) -->
        <div
          v-for="alert in warningAlerts"
          :key="alert.agent_id + alert.type"
          class="flex items-center gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20"
        >
          <component :is="alertIcon(alert.type)" class="w-5 h-5 text-amber-400 shrink-0" />
          <div class="flex-1 min-w-0">
            <span
              class="text-amber-300 font-medium text-sm cursor-pointer hover:underline"
              @click="router.push(`/agent/${alert.agent_id}`)"
            >{{ alert.agent_name }}</span>
            <span class="text-amber-400/70 text-sm ml-2">{{ alert.message }}</span>
          </div>
          <button @click="dismissAlert(alert)" class="text-amber-400/50 hover:text-amber-400 shrink-0">
            <XMarkIcon class="w-4 h-4" />
          </button>
        </div>

        <!-- Info alerts (blue/muted) -->
        <div
          v-for="alert in infoAlerts"
          :key="alert.agent_id + alert.type"
          class="flex items-center gap-3 p-3 rounded-lg bg-sky-500/10 border border-sky-500/20"
        >
          <component :is="alertIcon(alert.type)" class="w-5 h-5 text-sky-400 shrink-0" />
          <div class="flex-1 min-w-0">
            <span
              class="text-sky-300 font-medium text-sm cursor-pointer hover:underline"
              @click="router.push(`/agent/${alert.agent_id}`)"
            >{{ alert.agent_name }}</span>
            <span class="text-sky-400/70 text-sm ml-2">{{ alert.message }}</span>
          </div>
          <button @click="dismissAlert(alert)" class="text-sky-400/50 hover:text-sky-400 shrink-0">
            <XMarkIcon class="w-4 h-4" />
          </button>
        </div>
      </div>

      <!-- Stat cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="glass-card p-6">
          <div class="text-text-muted text-sm mb-2">Active Agents</div>
          <div class="text-3xl font-bold text-text-primary">{{ stats.active_agents || 0 }}</div>
        </div>

        <div class="glass-card p-6">
          <div class="text-text-muted text-sm mb-2">Average Score</div>
          <div class="flex items-center space-x-2">
            <div class="text-3xl font-bold text-text-primary">{{ stats.avg_score || '—' }}</div>
            <ScoreBadge v-if="stats.avg_score" :score="Number(stats.avg_score)" size="sm" />
          </div>
        </div>

        <div class="glass-card p-6">
          <div class="text-text-muted text-sm mb-2">Total Evaluations</div>
          <div class="text-3xl font-bold text-text-primary">{{ stats.total_evaluations || 0 }}</div>
        </div>

        <div class="glass-card p-6">
          <div class="text-text-muted text-sm mb-2">Pending Actions</div>
          <div class="text-3xl font-bold" :class="pendingActions > 0 ? 'text-accent' : 'text-text-primary'">
            {{ pendingActions }}
          </div>
        </div>
      </div>

      <!-- Department breakdown -->
      <div class="glass-card p-6">
        <h2 class="text-xl font-bold text-text-primary mb-4">Departments</h2>
        <div class="space-y-4">
          <div
            v-for="dept in deptPerformance"
            :key="dept.department"
            class="flex items-center space-x-4"
          >
            <div class="flex-1">
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center space-x-2">
                  <DeptBadge :department="dept.department" />
                  <span class="text-text-muted text-sm">{{ dept.agent_count }} agents</span>
                  <span v-if="dept.trending_up > 0" class="text-score-elite text-xs">{{ dept.trending_up }} trending up</span>
                  <span v-if="dept.trending_down > 0" class="text-score-failing text-xs">{{ dept.trending_down }} trending down</span>
                </div>
                <ScoreBadge :score="Number(dept.avg_score)" size="sm" />
              </div>
              <div class="w-full bg-eval-surface rounded-full h-2 overflow-hidden">
                <div
                  class="h-full rounded-full transition-all duration-500"
                  :style="{
                    width: `${(Number(dept.avg_score) / 10) * 100}%`,
                    backgroundColor: getDeptColor(dept.department)
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
                <div class="flex items-center gap-2">
                  <DeptBadge :department="agent.department" size="sm" />
                  <span v-if="agent.trend === 'up'" class="text-score-elite text-xs">&#8593;</span>
                  <span v-if="agent.trend === 'down'" class="text-score-failing text-xs">&#8595;</span>
                </div>
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
