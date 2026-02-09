<script setup>
import { ref, onMounted, computed } from 'vue'
import { getAgents, updateAgentStatus } from '@/services/api'
import { useToast } from '@/composables/useToast'
import ScoreBadge from '@/components/ui/ScoreBadge.vue'
import DeptBadge from '@/components/ui/DeptBadge.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import ModelBadge from '@/components/ui/ModelBadge.vue'
import RatingLabel from '@/components/ui/RatingLabel.vue'
import SkeletonLoader from '@/components/ui/SkeletonLoader.vue'
import {
  UserGroupIcon,
  CheckCircleIcon,
  ArchiveBoxIcon,
  XCircleIcon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
} from '@heroicons/vue/24/outline'

const toast = useToast()
const agents = ref([])
const loading = ref(true)
const loadError = ref(null)
const statusFilter = ref('all')
const searchQuery = ref('')
const actionLoading = ref(null)

// Confirm modal state
const confirmModal = ref({
  open: false,
  agentId: null,
  agentName: '',
  agentScore: null,
  action: '',   // 'fired' | 'archived'
})

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
    loadError.value = null
    const data = await getAgents({ status: 'all' })
    agents.value = Array.isArray(data) ? data : data.agents || []
  } catch (e) {
    loadError.value = e.message
  } finally {
    loading.value = false
  }
}

const filteredAgents = computed(() => {
  let result = [...agents.value]

  // Status filter
  if (statusFilter.value !== 'all') {
    result = result.filter(a => (a.status || 'active') === statusFilter.value)
  }

  // Search filter (name or role)
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim()
    result = result.filter(a =>
      (a.name || '').toLowerCase().includes(q) ||
      (a.role || '').toLowerCase().includes(q)
    )
  }

  return result.sort((a, b) => Number(b.overall_score || 0) - Number(a.overall_score || 0))
})

const stats = computed(() => ({
  total: agents.value.length,
  active: agents.value.filter(a => (a.status || 'active') === 'active').length,
  fired: agents.value.filter(a => a.status === 'fired').length,
  archived: agents.value.filter(a => a.status === 'archived').length
}))

function openConfirm(agentId, newStatus) {
  const agent = agents.value.find(a => a.id === agentId)
  if (!agent) return
  confirmModal.value = {
    open: true,
    agentId,
    agentName: agent.name,
    agentScore: agent.overall_score ? Number(agent.overall_score) : null,
    action: newStatus,
  }
}

function closeConfirm() {
  confirmModal.value.open = false
}

async function executeConfirm() {
  const { agentId, action } = confirmModal.value
  closeConfirm()
  await changeStatus(agentId, action)
}

async function changeStatus(agentId, newStatus) {
  // For destructive actions, open confirm modal instead
  if ((newStatus === 'fired' || newStatus === 'archived') && !confirmModal.value.open) {
    openConfirm(agentId, newStatus)
    return
  }

  actionLoading.value = agentId
  try {
    await updateAgentStatus(agentId, newStatus)
    await loadAgents()
    const labels = { fired: 'fired', archived: 'archived', active: 'reactivated' }
    toast.success(`Agent ${labels[newStatus] || 'updated'} successfully`)
  } catch (e) {
    toast.error('Failed: ' + e.message)
  } finally {
    actionLoading.value = null
  }
}

// Direct reactivate (no confirm needed)
async function reactivate(agentId) {
  actionLoading.value = agentId
  try {
    await updateAgentStatus(agentId, 'active')
    await loadAgents()
    toast.success('Agent reactivated successfully')
  } catch (e) {
    toast.error('Failed: ' + e.message)
  } finally {
    actionLoading.value = null
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-text-primary">Agent Management</h1>
      <RouterLink
        to="/evaluate"
        class="px-3 py-1.5 bg-accent hover:bg-accent-hover rounded-lg text-white text-sm transition-colors"
      >+ Evaluate</RouterLink>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div class="glass-card p-3 flex items-center gap-3">
        <div class="p-2 rounded-lg bg-accent-soft">
          <UserGroupIcon class="w-5 h-5 text-accent" />
        </div>
        <div>
          <div class="text-2xl font-bold text-text-primary">{{ stats.total }}</div>
          <div class="text-xs text-text-muted">Total</div>
        </div>
      </div>
      <div class="glass-card p-3 flex items-center gap-3">
        <div class="p-2 rounded-lg bg-green-500/15">
          <CheckCircleIcon class="w-5 h-5 text-green-400" />
        </div>
        <div>
          <div class="text-2xl font-bold text-green-400">{{ stats.active }}</div>
          <div class="text-xs text-text-muted">Active</div>
        </div>
      </div>
      <div class="glass-card p-3 flex items-center gap-3">
        <div class="p-2 rounded-lg bg-gray-500/15">
          <ArchiveBoxIcon class="w-5 h-5 text-gray-400" />
        </div>
        <div>
          <div class="text-2xl font-bold text-gray-400">{{ stats.archived }}</div>
          <div class="text-xs text-text-muted">Archived</div>
        </div>
      </div>
      <div class="glass-card p-3 flex items-center gap-3">
        <div class="p-2 rounded-lg bg-red-500/15">
          <XCircleIcon class="w-5 h-5 text-red-400" />
        </div>
        <div>
          <div class="text-2xl font-bold text-red-400">{{ stats.fired }}</div>
          <div class="text-xs text-text-muted">Fired</div>
        </div>
      </div>
    </div>

    <!-- Search + Status filter -->
    <div class="flex flex-col sm:flex-row gap-3">
      <div class="relative flex-1">
        <MagnifyingGlassIcon class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search by name or role..."
          class="w-full bg-eval-surface border border-eval-border rounded-lg pl-9 pr-3 py-2 text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
        />
      </div>
      <div class="flex gap-1 bg-eval-surface rounded-lg p-1 w-fit shrink-0">
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
    </div>

    <!-- Skeleton Loading -->
    <div v-if="loading" class="space-y-2">
      <div v-for="i in 6" :key="i" class="glass-card p-4">
        <div class="flex flex-col sm:flex-row sm:items-center gap-3">
          <div class="flex-1 space-y-2">
            <div class="flex items-center gap-2">
              <SkeletonLoader variant="text" width="8rem" />
              <SkeletonLoader variant="badge" />
              <SkeletonLoader variant="badge" />
            </div>
            <SkeletonLoader variant="text" width="14rem" />
          </div>
          <div class="flex items-center gap-3">
            <SkeletonLoader variant="badge" width="3rem" />
            <div class="flex gap-1">
              <SkeletonLoader variant="badge" width="3rem" />
              <SkeletonLoader variant="badge" width="3.5rem" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="loadError" class="text-score-failing text-center py-12">{{ loadError }}</div>

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
            >
              <span v-if="actionLoading === agent.id" class="inline-block w-3 h-3 border border-red-400 border-t-transparent rounded-full animate-spin" />
              <span v-else>Fire</span>
            </button>
            <button
              v-if="(agent.status || 'active') === 'active'"
              @click="changeStatus(agent.id, 'archived')"
              :disabled="actionLoading === agent.id"
              class="px-2 py-1 text-xs bg-gray-500/10 hover:bg-gray-500/20 rounded text-gray-400 transition-colors disabled:opacity-50"
            >
              <span v-if="actionLoading === agent.id" class="inline-block w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin" />
              <span v-else>Archive</span>
            </button>
            <button
              v-if="agent.status === 'fired' || agent.status === 'archived'"
              @click="reactivate(agent.id)"
              :disabled="actionLoading === agent.id"
              class="px-2 py-1 text-xs bg-green-500/10 hover:bg-green-500/20 rounded text-green-400 transition-colors disabled:opacity-50"
            >
              <span v-if="actionLoading === agent.id" class="inline-block w-3 h-3 border border-green-400 border-t-transparent rounded-full animate-spin" />
              <span v-else>Reactivate</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="!loading && filteredAgents.length === 0" class="text-text-muted text-center py-8">
      <template v-if="searchQuery.trim()">
        No agents match "{{ searchQuery }}".
      </template>
      <template v-else>
        No agents match this filter.
      </template>
    </div>

    <!-- Confirm Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="confirmModal.open"
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
          @click.self="closeConfirm"
        >
          <div class="fixed inset-0 bg-black/60 backdrop-blur-sm" @click="closeConfirm" />
          <div class="relative glass-card p-6 max-w-sm w-full space-y-4 z-10 border-eval-border-hover">
            <div class="flex items-center gap-3">
              <div class="p-2 rounded-full" :class="confirmModal.action === 'fired' ? 'bg-red-500/15' : 'bg-gray-500/15'">
                <ExclamationTriangleIcon class="w-6 h-6" :class="confirmModal.action === 'fired' ? 'text-red-400' : 'text-gray-400'" />
              </div>
              <h3 class="text-lg font-semibold text-text-primary">
                {{ confirmModal.action === 'fired' ? 'Fire' : 'Archive' }} Agent?
              </h3>
            </div>

            <div class="space-y-2">
              <p class="text-sm text-text-secondary">
                <span class="font-medium text-text-primary">{{ confirmModal.agentName }}</span>
                <span v-if="confirmModal.agentScore" class="text-text-muted">
                  ({{ confirmModal.agentScore.toFixed(1) }}/10)
                </span>
              </p>
              <p class="text-sm text-text-muted">
                <template v-if="confirmModal.action === 'fired'">
                  This agent will be hidden from Browse and Leaderboard. You can reactivate them later.
                </template>
                <template v-else>
                  This agent will be moved to the archive. You can reactivate them later.
                </template>
              </p>
            </div>

            <div class="flex gap-2 justify-end">
              <button
                @click="closeConfirm"
                class="px-4 py-2 text-sm text-text-secondary hover:text-text-primary bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
              >Cancel</button>
              <button
                @click="executeConfirm"
                :class="[
                  'px-4 py-2 text-sm text-white rounded-lg transition-colors',
                  confirmModal.action === 'fired'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-gray-600 hover:bg-gray-700'
                ]"
              >{{ confirmModal.action === 'fired' ? 'Fire Agent' : 'Archive Agent' }}</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
