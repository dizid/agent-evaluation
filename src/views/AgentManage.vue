<script setup>
import { ref, onMounted, computed } from 'vue'
import { getAgents, updateAgentStatus } from '@/services/api'
import ScoreBadge from '@/components/ui/ScoreBadge.vue'
import DeptBadge from '@/components/ui/DeptBadge.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import ModelBadge from '@/components/ui/ModelBadge.vue'
import RatingLabel from '@/components/ui/RatingLabel.vue'

const agents = ref([])
const loading = ref(true)
const error = ref(null)
const statusFilter = ref('all')
const actionLoading = ref(null)

const statusFilters = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
  { value: 'fired', label: 'Fired' }
]

onMounted(async () => {
  await loadAgents()
})

async function loadAgents() {
  try {
    loading.value = true
    const data = await getAgents({ status: 'all' })
    agents.value = Array.isArray(data) ? data : data.agents || []
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

const filteredAgents = computed(() => {
  let result = [...agents.value]
  if (statusFilter.value !== 'all') {
    result = result.filter(a => (a.status || 'active') === statusFilter.value)
  }
  return result.sort((a, b) => Number(b.overall_score || 0) - Number(a.overall_score || 0))
})

const stats = computed(() => ({
  total: agents.value.length,
  active: agents.value.filter(a => (a.status || 'active') === 'active').length,
  fired: agents.value.filter(a => a.status === 'fired').length,
  archived: agents.value.filter(a => a.status === 'archived').length
}))

async function changeStatus(agentId, newStatus) {
  if (newStatus === 'fired' && !confirm(`Fire this agent? It will be hidden from Browse and Leaderboard.`)) return
  actionLoading.value = agentId
  try {
    await updateAgentStatus(agentId, newStatus)
    await loadAgents()
  } catch (e) {
    alert('Failed: ' + e.message)
  } finally {
    actionLoading.value = null
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-text-primary">Agent Management</h1>
      <RouterLink
        to="/evaluate"
        class="px-3 py-1.5 bg-accent hover:bg-accent-hover rounded-lg text-white text-sm transition-colors"
      >+ Evaluate</RouterLink>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div class="glass-card p-3 text-center">
        <div class="text-2xl font-bold text-text-primary">{{ stats.total }}</div>
        <div class="text-xs text-text-muted">Total</div>
      </div>
      <div class="glass-card p-3 text-center">
        <div class="text-2xl font-bold text-green-400">{{ stats.active }}</div>
        <div class="text-xs text-text-muted">Active</div>
      </div>
      <div class="glass-card p-3 text-center">
        <div class="text-2xl font-bold text-gray-400">{{ stats.archived }}</div>
        <div class="text-xs text-text-muted">Archived</div>
      </div>
      <div class="glass-card p-3 text-center">
        <div class="text-2xl font-bold text-red-400">{{ stats.fired }}</div>
        <div class="text-xs text-text-muted">Fired</div>
      </div>
    </div>

    <!-- Status filter -->
    <div class="flex gap-1 bg-eval-surface rounded-lg p-1 w-fit">
      <button
        v-for="f in statusFilters"
        :key="f.value"
        @click="statusFilter = f.value"
        :class="[
          'px-3 py-1.5 text-sm rounded-md transition-colors',
          statusFilter === f.value
            ? 'bg-accent text-white'
            : 'text-text-muted hover:text-text-secondary'
        ]"
      >{{ f.label }}</button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-text-muted text-center py-12">Loading agents...</div>

    <!-- Error -->
    <div v-else-if="error" class="text-score-failing text-center py-12">{{ error }}</div>

    <!-- Agent list -->
    <div v-else class="space-y-2">
      <div
        v-for="agent in filteredAgents"
        :key="agent.id"
        :class="[
          'glass-card p-4 flex flex-col sm:flex-row sm:items-center gap-3',
          agent.status === 'fired' ? 'opacity-50' : ''
        ]"
      >
        <!-- Agent info -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <RouterLink :to="`/agent/${agent.id}`" class="font-semibold text-text-primary hover:text-accent transition-colors">
              {{ agent.name }}
            </RouterLink>
            <DeptBadge :department="agent.department" />
            <StatusBadge :status="agent.status || 'active'" />
            <ModelBadge :model="agent.model" />
          </div>
          <div class="text-sm text-text-muted mt-1">{{ agent.role }}</div>
          <div class="text-xs text-text-muted mt-0.5">
            {{ agent.source_type === 'claude-agent' ? 'Claude Agent' : agent.source_type === 'dizid' ? 'Dizid Persona' : 'Manual' }}
            <span v-if="agent.source_path" class="ml-1 text-text-muted/60">· {{ agent.source_path }}</span>
          </div>
        </div>

        <!-- Score -->
        <div class="flex items-center gap-3 shrink-0">
          <div class="text-right">
            <ScoreBadge v-if="agent.overall_score" :score="Number(agent.overall_score)" size="sm" />
            <span v-else class="text-text-muted text-sm">Unrated</span>
            <RatingLabel v-if="agent.rating_label" :label="agent.rating_label" size="sm" class="mt-1" />
          </div>

          <!-- Actions -->
          <div class="flex gap-1">
            <RouterLink
              :to="`/agent/${agent.id}/edit`"
              class="px-2 py-1 text-xs bg-white/5 hover:bg-white/10 rounded text-text-secondary transition-colors"
            >Edit</RouterLink>
            <button
              v-if="(agent.status || 'active') === 'active'"
              @click="changeStatus(agent.id, 'fired')"
              :disabled="actionLoading === agent.id"
              class="px-2 py-1 text-xs bg-red-500/10 hover:bg-red-500/20 rounded text-red-400 transition-colors disabled:opacity-50"
            >Fire</button>
            <button
              v-if="(agent.status || 'active') === 'active'"
              @click="changeStatus(agent.id, 'archived')"
              :disabled="actionLoading === agent.id"
              class="px-2 py-1 text-xs bg-gray-500/10 hover:bg-gray-500/20 rounded text-gray-400 transition-colors disabled:opacity-50"
            >Archive</button>
            <button
              v-if="agent.status === 'fired' || agent.status === 'archived'"
              @click="changeStatus(agent.id, 'active')"
              :disabled="actionLoading === agent.id"
              class="px-2 py-1 text-xs bg-green-500/10 hover:bg-green-500/20 rounded text-green-400 transition-colors disabled:opacity-50"
            >Reactivate</button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="!loading && filteredAgents.length === 0" class="text-text-muted text-center py-8">
      No agents match this filter.
    </div>
  </div>
</template>
