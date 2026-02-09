<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getAgents } from '@/services/api'
import AgentCard from '@/components/agents/AgentCard.vue'
import SkeletonLoader from '@/components/ui/SkeletonLoader.vue'
import { MagnifyingGlassIcon, FunnelIcon, XMarkIcon } from '@heroicons/vue/24/outline'

const route = useRoute()
const router = useRouter()
const agents = ref([])
const loading = ref(true)
const error = ref(null)

const searchQuery = ref('')
const deptFilter = ref('all')
const sortBy = ref('score-desc')

const departments = [
  { value: 'all', label: 'All' },
  { value: 'development', label: 'Development' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'operations', label: 'Operations' },
  { value: 'tools', label: 'Tools' },
  { value: 'trading', label: 'Trading' }
]

const sortOptions = [
  { value: 'score-desc', label: 'Score (High to Low)' },
  { value: 'score-asc', label: 'Score (Low to High)' },
  { value: 'name-asc', label: 'Name (A-Z)' },
  { value: 'name-desc', label: 'Name (Z-A)' },
  { value: 'evals', label: 'Most Evaluated' },
  { value: 'trending', label: 'Trending' }
]

// Read URL params on mount
onMounted(async () => {
  if (route.query.dept) deptFilter.value = route.query.dept
  if (route.query.sort) sortBy.value = route.query.sort
  if (route.query.q) searchQuery.value = route.query.q

  try {
    const data = await getAgents()
    agents.value = Array.isArray(data) ? data : data.agents || []
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
})

// Two-way URL sync: update URL when filters change
watch([deptFilter, sortBy, searchQuery], () => {
  const query = {}
  if (deptFilter.value !== 'all') query.dept = deptFilter.value
  if (sortBy.value !== 'score-desc') query.sort = sortBy.value
  if (searchQuery.value.trim()) query.q = searchQuery.value.trim()
  router.replace({ query })
})

// Simple fuzzy match: check if all characters appear in order
function fuzzyMatch(text, query) {
  const lower = text.toLowerCase()
  const q = query.toLowerCase()
  let qi = 0
  for (let i = 0; i < lower.length && qi < q.length; i++) {
    if (lower[i] === q[qi]) qi++
  }
  return qi === q.length
}

const filteredAgents = computed(() => {
  let result = [...agents.value]

  // Search filter
  const q = searchQuery.value.trim()
  if (q) {
    result = result.filter(a =>
      fuzzyMatch(a.name || '', q) || fuzzyMatch(a.role || '', q)
    )
  }

  // Department filter
  if (deptFilter.value !== 'all') {
    result = result.filter(a => a.department === deptFilter.value)
  }

  // Sort
  switch (sortBy.value) {
    case 'score-desc':
      result.sort((a, b) => Number(b.overall_score || 0) - Number(a.overall_score || 0))
      break
    case 'score-asc':
      result.sort((a, b) => Number(a.overall_score || 0) - Number(b.overall_score || 0))
      break
    case 'name-asc':
      result.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      break
    case 'name-desc':
      result.sort((a, b) => (b.name || '').localeCompare(a.name || ''))
      break
    case 'evals':
      result.sort((a, b) => (b.eval_count || 0) - (a.eval_count || 0))
      break
    case 'trending': {
      const trendOrder = { up: 0, stable: 1, down: 2 }
      result.sort((a, b) => {
        const ta = trendOrder[a.trend] ?? 1
        const tb = trendOrder[b.trend] ?? 1
        if (ta !== tb) return ta - tb
        return Number(b.overall_score || 0) - Number(a.overall_score || 0)
      })
      break
    }
  }

  return result
})

const hasActiveFilters = computed(() =>
  deptFilter.value !== 'all' || searchQuery.value.trim() || sortBy.value !== 'score-desc'
)

function clearFilters() {
  deptFilter.value = 'all'
  sortBy.value = 'score-desc'
  searchQuery.value = ''
}
</script>

<template>
  <div class="space-y-6">
    <h1 class="text-2xl font-bold text-text-primary">Browse Agents</h1>

    <!-- Search bar -->
    <div class="relative">
      <MagnifyingGlassIcon class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted pointer-events-none" />
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Search by name or role..."
        class="w-full bg-eval-surface border border-eval-border rounded-lg pl-10 pr-10 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
      />
      <button
        v-if="searchQuery"
        @click="searchQuery = ''"
        class="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
      >
        <XMarkIcon class="w-4 h-4" />
      </button>
    </div>

    <!-- Filter bar -->
    <div class="flex flex-col sm:flex-row sm:items-center gap-3">
      <!-- Department tabs -->
      <div class="flex gap-1 bg-eval-surface rounded-lg p-1 overflow-x-auto">
        <button
          v-for="dept in departments"
          :key="dept.value"
          @click="deptFilter = dept.value"
          :class="[
            'px-3 py-1.5 text-sm rounded-md transition-colors whitespace-nowrap',
            deptFilter === dept.value
              ? 'bg-accent text-white'
              : 'text-text-muted hover:text-text-secondary'
          ]"
        >
          {{ dept.label }}
        </button>
      </div>

      <!-- Sort dropdown -->
      <div class="flex items-center gap-2 sm:ml-auto">
        <FunnelIcon class="w-4 h-4 text-text-muted shrink-0" />
        <select
          v-model="sortBy"
          class="bg-eval-surface text-text-secondary text-sm rounded-lg border border-eval-border px-3 py-1.5 focus:outline-none focus:border-accent"
        >
          <option v-for="opt in sortOptions" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>
      </div>
    </div>

    <!-- Result count -->
    <p v-if="!loading && !error" class="text-xs text-text-muted">
      Showing {{ filteredAgents.length }} of {{ agents.length }} agents
    </p>

    <!-- Skeleton loading -->
    <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      <div v-for="i in 6" :key="i" class="glass-card p-4">
        <div class="flex items-start gap-3 mb-3">
          <SkeletonLoader variant="badge" width="3.5rem" height="2rem" />
          <div class="flex-1 space-y-2">
            <SkeletonLoader variant="text" width="70%" />
            <SkeletonLoader variant="text" width="50%" height="0.75rem" />
          </div>
        </div>
        <div class="flex gap-2 mb-3">
          <SkeletonLoader variant="badge" />
          <SkeletonLoader variant="badge" />
        </div>
        <SkeletonLoader variant="text" width="40%" height="0.75rem" />
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="text-score-failing text-center py-12">{{ error }}</div>

    <!-- Empty state -->
    <div v-else-if="filteredAgents.length === 0" class="text-center py-16">
      <MagnifyingGlassIcon class="w-12 h-12 text-text-muted mx-auto mb-3" />
      <p class="text-text-secondary mb-1">No agents match your filters</p>
      <p class="text-text-muted text-sm mb-4">Try adjusting your search or department filter</p>
      <button
        v-if="hasActiveFilters"
        @click="clearFilters"
        class="text-accent hover:text-accent-hover text-sm font-medium underline underline-offset-2"
      >
        Clear all filters
      </button>
    </div>

    <!-- Grid -->
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      <AgentCard
        v-for="agent in filteredAgents"
        :key="agent.id"
        :agent="agent"
      />
    </div>
  </div>
</template>
