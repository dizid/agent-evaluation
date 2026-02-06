<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { getAgents } from '@/services/api'
import AgentCard from '@/components/agents/AgentCard.vue'

const route = useRoute()
const agents = ref([])
const loading = ref(true)
const error = ref(null)

const deptFilter = ref('all')
const sortBy = ref('score')

const departments = [
  { value: 'all', label: 'All' },
  { value: 'development', label: 'Development' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'operations', label: 'Operations' }
]

onMounted(async () => {
  // Check URL for dept filter
  if (route.query.dept) {
    deptFilter.value = route.query.dept
  }

  try {
    const data = await getAgents()
    agents.value = Array.isArray(data) ? data : data.agents || []
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
})

const filteredAgents = computed(() => {
  let result = [...agents.value]

  // Department filter
  if (deptFilter.value !== 'all') {
    result = result.filter(a => a.department === deptFilter.value)
  }

  // Sort
  if (sortBy.value === 'score') {
    result.sort((a, b) => Number(b.overall_score || 0) - Number(a.overall_score || 0))
  } else if (sortBy.value === 'name') {
    result.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
  }

  return result
})
</script>

<template>
  <div class="space-y-6">
    <h1 class="text-2xl font-bold text-text-primary">Browse Agents</h1>

    <!-- Filter bar -->
    <div class="flex flex-wrap items-center gap-3">
      <!-- Department tabs -->
      <div class="flex gap-1 bg-eval-surface rounded-lg p-1">
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

      <!-- Sort dropdown -->
      <select
        v-model="sortBy"
        class="bg-eval-surface text-text-secondary text-sm rounded-lg border border-eval-border px-3 py-1.5 ml-auto"
      >
        <option value="score">Sort by Score</option>
        <option value="name">Sort by Name</option>
      </select>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-text-muted text-center py-12">Loading agents...</div>

    <!-- Error -->
    <div v-else-if="error" class="text-score-failing text-center py-12">{{ error }}</div>

    <!-- Empty -->
    <div v-else-if="filteredAgents.length === 0" class="text-text-muted text-center py-12">
      No agents found for this filter.
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
