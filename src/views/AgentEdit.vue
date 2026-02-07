<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getAgent, updateAgent, getActionItems } from '@/services/api'
import ScoreBadge from '@/components/ui/ScoreBadge.vue'
import DeptBadge from '@/components/ui/DeptBadge.vue'

const route = useRoute()
const router = useRouter()
const agent = ref(null)
const actionItems = ref([])
const loading = ref(true)
const saving = ref(false)
const error = ref(null)
const saveMessage = ref(null)
const copied = ref(null)

// Form fields
const form = ref({
  name: '',
  department: '',
  role: '',
  persona: '',
  model: '',
  kpi_definitions: ''
})

const departments = ['development', 'marketing', 'operations', 'tools', 'trading']

onMounted(async () => {
  try {
    const data = await getAgent(route.params.id)
    const a = data.agent || data
    agent.value = a
    form.value = {
      name: a.name || '',
      department: a.department || '',
      role: a.role || '',
      persona: a.persona || '',
      model: a.model || '',
      kpi_definitions: (a.kpi_definitions || []).join(', ')
    }

    // Load action items
    try {
      const aiData = await getActionItems(route.params.id)
      actionItems.value = aiData.action_items || []
    } catch (e) {
      // Action items endpoint might not exist yet, that's fine
    }
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
})

async function save() {
  saving.value = true
  saveMessage.value = null
  try {
    const kpis = form.value.kpi_definitions
      .split(',')
      .map(k => k.trim())
      .filter(Boolean)

    await updateAgent(route.params.id, {
      name: form.value.name,
      department: form.value.department,
      role: form.value.role,
      persona: form.value.persona,
      model: form.value.model || null,
      kpi_definitions: kpis
    })
    saveMessage.value = 'Saved successfully'
    setTimeout(() => saveMessage.value = null, 3000)
  } catch (e) {
    error.value = e.message
  } finally {
    saving.value = false
  }
}

function copyActionItem(item) {
  const text = `Improvement suggestion for ${agent.value?.name}:\n- Weakness: ${item.top_weakness || 'N/A'}\n- Action item: ${item.action_item}\n- From evaluation scored ${item.overall}/10 on ${new Date(item.created_at).toLocaleDateString()}`
  navigator.clipboard.writeText(text)
  copied.value = item.evaluation_id
  setTimeout(() => copied.value = null, 2000)
}
</script>

<template>
  <div class="space-y-6 max-w-2xl mx-auto">
    <!-- Header -->
    <div class="flex items-center gap-3">
      <button @click="router.back()" class="text-text-muted hover:text-text-primary transition-colors">&larr; Back</button>
      <h1 class="text-2xl font-bold text-text-primary">Edit Agent</h1>
    </div>

    <div v-if="loading" class="text-text-muted text-center py-12">Loading...</div>
    <div v-else-if="error" class="text-score-failing text-center py-12">{{ error }}</div>

    <template v-else>
      <!-- Agent header -->
      <div class="glass-card p-4 flex items-center gap-3">
        <ScoreBadge v-if="agent?.overall_score" :score="Number(agent.overall_score)" />
        <div>
          <div class="font-semibold text-text-primary">{{ agent?.name }}</div>
          <DeptBadge v-if="agent?.department" :department="agent.department" />
        </div>
      </div>

      <!-- Edit form -->
      <form @submit.prevent="save" class="glass-card p-4 space-y-4">
        <h2 class="text-lg font-semibold text-text-primary">Agent Details</h2>

        <div>
          <label class="block text-sm text-text-secondary mb-1">Name</label>
          <input v-model="form.name" type="text" class="w-full bg-eval-surface border border-eval-border rounded-lg px-3 py-2 text-text-primary text-sm" />
        </div>

        <div>
          <label class="block text-sm text-text-secondary mb-1">Department</label>
          <select v-model="form.department" class="w-full bg-eval-surface border border-eval-border rounded-lg px-3 py-2 text-text-primary text-sm">
            <option v-for="d in departments" :key="d" :value="d">{{ d }}</option>
          </select>
        </div>

        <div>
          <label class="block text-sm text-text-secondary mb-1">Role</label>
          <input v-model="form.role" type="text" class="w-full bg-eval-surface border border-eval-border rounded-lg px-3 py-2 text-text-primary text-sm" />
        </div>

        <div>
          <label class="block text-sm text-text-secondary mb-1">Model</label>
          <select v-model="form.model" class="w-full bg-eval-surface border border-eval-border rounded-lg px-3 py-2 text-text-primary text-sm">
            <option value="">None</option>
            <option value="opus">Opus</option>
            <option value="sonnet">Sonnet</option>
            <option value="haiku">Haiku</option>
          </select>
        </div>

        <div>
          <label class="block text-sm text-text-secondary mb-1">Persona</label>
          <textarea v-model="form.persona" rows="4" class="w-full bg-eval-surface border border-eval-border rounded-lg px-3 py-2 text-text-primary text-sm"></textarea>
        </div>

        <div>
          <label class="block text-sm text-text-secondary mb-1">KPI Definitions (comma-separated)</label>
          <input v-model="form.kpi_definitions" type="text" placeholder="code_quality, first_pass_success, ..." class="w-full bg-eval-surface border border-eval-border rounded-lg px-3 py-2 text-text-primary text-sm" />
        </div>

        <div class="flex items-center gap-3">
          <button
            type="submit"
            :disabled="saving"
            class="px-4 py-2 bg-accent hover:bg-accent-hover rounded-lg text-white text-sm transition-colors disabled:opacity-50"
          >{{ saving ? 'Saving...' : 'Save Changes' }}</button>
          <span v-if="saveMessage" class="text-green-400 text-sm">{{ saveMessage }}</span>
        </div>
      </form>

      <!-- Action Items / Write-back suggestions -->
      <div v-if="actionItems.length > 0" class="glass-card p-4 space-y-3">
        <h2 class="text-lg font-semibold text-text-primary">Improvement Suggestions</h2>
        <p class="text-sm text-text-muted">Action items from evaluations. Copy to apply as persona edits.</p>

        <div
          v-for="item in actionItems"
          :key="item.evaluation_id"
          class="bg-eval-surface rounded-lg p-3 space-y-1"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="text-sm text-text-primary">{{ item.action_item }}</div>
            <button
              @click="copyActionItem(item)"
              class="shrink-0 px-2 py-1 text-xs bg-white/5 hover:bg-white/10 rounded text-text-secondary transition-colors"
            >{{ copied === item.evaluation_id ? 'Copied!' : 'Copy' }}</button>
          </div>
          <div v-if="item.top_weakness" class="text-xs text-text-muted">Weakness: {{ item.top_weakness }}</div>
          <div class="text-xs text-text-muted">
            Score: {{ item.overall }}/10 · {{ new Date(item.created_at).toLocaleDateString() }}
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
