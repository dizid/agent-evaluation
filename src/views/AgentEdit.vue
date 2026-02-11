<script setup>
import { ref, reactive, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import { getAgent, updateAgent, getActionItems, markActionItemApplied, markActionItemUnapplied, getDepartments } from '@/services/api'
import { useToast } from '@/composables/useToast'
import ScoreBadge from '@/components/ui/ScoreBadge.vue'
import DeptBadge from '@/components/ui/DeptBadge.vue'
import SkeletonLoader from '@/components/ui/SkeletonLoader.vue'
import { XMarkIcon } from '@heroicons/vue/24/outline'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const agent = ref(null)
const actionItems = ref([])
const loading = ref(true)
const saving = ref(false)
const loadError = ref(null)
const copied = ref(null)
const applyingId = ref(null)
const confirmItem = ref(null)

// Form state
const form = reactive({
  name: '',
  department: '',
  role: '',
  persona: '',
  model: '',
  kpi_definitions: []
})
const kpiInput = ref('')

// Validation errors
const errors = reactive({
  name: '',
  role: '',
  kpi: ''
})

// Dirty tracking — snapshot of initial values
const initialSnapshot = ref('')
const isDirty = computed(() => {
  if (!agent.value) return false
  return JSON.stringify({
    name: form.name,
    department: form.department,
    role: form.role,
    persona: form.persona,
    model: form.model,
    kpi_definitions: form.kpi_definitions
  }) !== initialSnapshot.value
})

const departments = ref([])

onMounted(async () => {
  try {
    // Fetch departments from API instead of hardcoding
    try {
      const deptData = await getDepartments()
      departments.value = (deptData.departments || deptData || []).map(d => d.slug || d.name)
    } catch {
      departments.value = ['development', 'marketing', 'operations', 'tools', 'trading']
    }

    const data = await getAgent(route.params.id)
    const a = data.agent || data
    agent.value = a
    form.name = a.name || ''
    form.department = a.department || ''
    form.role = a.role || ''
    form.persona = a.persona || ''
    form.model = a.model || ''
    form.kpi_definitions = Array.isArray(a.kpi_definitions) ? [...a.kpi_definitions] : []

    // Snapshot for dirty tracking
    initialSnapshot.value = JSON.stringify({
      name: form.name,
      department: form.department,
      role: form.role,
      persona: form.persona,
      model: form.model,
      kpi_definitions: form.kpi_definitions
    })

    // Load action items
    try {
      const aiData = await getActionItems(route.params.id)
      actionItems.value = aiData.action_items || []
    } catch (e) {
      // Action items endpoint might not exist yet
    }
  } catch (e) {
    loadError.value = e.message
  } finally {
    loading.value = false
  }
})

// Unsaved changes warning on route leave
onBeforeRouteLeave((to, from, next) => {
  if (isDirty.value) {
    const answer = window.confirm('You have unsaved changes. Leave anyway?')
    next(answer)
  } else {
    next()
  }
})

function validate() {
  let valid = true
  errors.name = ''
  errors.role = ''

  if (form.name.trim().length < 2) {
    errors.name = 'Name must be at least 2 characters'
    valid = false
  }
  if (!form.role.trim()) {
    errors.role = 'Role is required'
    valid = false
  }
  return valid
}

// KPI chip management
const kpiPattern = /^[a-z0-9_]+$/

function addKpi() {
  errors.kpi = ''
  const val = kpiInput.value.trim().toLowerCase()
  if (!val) return

  if (!kpiPattern.test(val)) {
    errors.kpi = 'Only lowercase letters, numbers, and underscores'
    return
  }
  if (form.kpi_definitions.includes(val)) {
    errors.kpi = 'KPI already exists'
    return
  }
  form.kpi_definitions.push(val)
  kpiInput.value = ''
}

function removeKpi(index) {
  form.kpi_definitions.splice(index, 1)
}

function handleKpiKeydown(e) {
  if (e.key === 'Enter') {
    e.preventDefault()
    addKpi()
  }
  // Backspace on empty input removes last chip
  if (e.key === 'Backspace' && !kpiInput.value && form.kpi_definitions.length > 0) {
    form.kpi_definitions.pop()
  }
}

async function save() {
  if (!validate()) return

  saving.value = true
  try {
    await updateAgent(route.params.id, {
      name: form.name,
      department: form.department,
      role: form.role,
      persona: form.persona,
      model: form.model || null,
      kpi_definitions: form.kpi_definitions
    })

    // Update snapshot so form is no longer dirty
    initialSnapshot.value = JSON.stringify({
      name: form.name,
      department: form.department,
      role: form.role,
      persona: form.persona,
      model: form.model,
      kpi_definitions: form.kpi_definitions
    })

    toast.success('Agent updated successfully')
  } catch (e) {
    toast.error('Failed to save: ' + e.message)
  } finally {
    saving.value = false
  }
}

function cancel() {
  router.back()
}

function copyActionItem(item) {
  const text = `Improvement suggestion for ${agent.value?.name}:\n- Weakness: ${item.top_weakness || 'N/A'}\n- Action item: ${item.action_item}\n- From evaluation scored ${item.overall}/10 on ${new Date(item.created_at).toLocaleDateString()}`
  navigator.clipboard.writeText(text)
  copied.value = item.evaluation_id
  setTimeout(() => copied.value = null, 2000)
}

function startApply(item) {
  confirmItem.value = item
}

function cancelApply() {
  confirmItem.value = null
}

async function confirmApply() {
  const item = confirmItem.value
  if (!item) return

  confirmItem.value = null
  applyingId.value = item.evaluation_id

  try {
    await markActionItemApplied(route.params.id, item.evaluation_id)
    item.applied = true
    item.applied_at = new Date().toISOString()
    toast.success('Action item marked as applied')
  } catch (e) {
    toast.error('Failed to mark as applied: ' + e.message)
  } finally {
    applyingId.value = null
  }
}

async function handleUnapply(item) {
  applyingId.value = item.evaluation_id
  try {
    await markActionItemUnapplied(route.params.id, item.evaluation_id)
    item.applied = false
    item.applied_at = null
    toast.success('Action item marked as unapplied')
  } catch (e) {
    toast.error('Failed to unapply: ' + e.message)
  } finally {
    applyingId.value = null
  }
}
</script>

<template>
  <div class="space-y-6 max-w-2xl mx-auto">
    <!-- Header -->
    <div class="flex items-center gap-3">
      <button @click="cancel" class="text-text-muted hover:text-text-primary transition-colors">&larr; Back</button>
      <h1 class="text-2xl font-bold text-text-primary">Edit Agent</h1>
      <span v-if="isDirty" class="text-xs text-score-adequate px-2 py-0.5 bg-score-adequate/10 rounded-full">Unsaved</span>
    </div>

    <!-- Skeleton loading -->
    <template v-if="loading">
      <div class="glass-card p-4 flex items-center gap-3">
        <SkeletonLoader variant="circle" height="2.5rem" />
        <div class="space-y-2 flex-1">
          <SkeletonLoader variant="text" width="10rem" />
          <SkeletonLoader variant="badge" />
        </div>
      </div>
      <div class="glass-card p-4 space-y-4">
        <SkeletonLoader variant="text" width="8rem" />
        <SkeletonLoader variant="text" height="2.5rem" />
        <SkeletonLoader variant="text" height="2.5rem" />
        <SkeletonLoader variant="text" height="2.5rem" />
        <SkeletonLoader variant="text" height="6rem" />
        <SkeletonLoader variant="text" height="2.5rem" />
      </div>
    </template>

    <div v-else-if="loadError" class="text-score-failing text-center py-12">{{ loadError }}</div>

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

        <!-- Name -->
        <div>
          <label class="block text-sm text-text-secondary mb-1">Name <span class="text-red-400">*</span></label>
          <input
            v-model="form.name"
            type="text"
            :class="[
              'w-full bg-eval-surface border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none transition-colors',
              errors.name ? 'border-red-500 focus:border-red-400' : 'border-eval-border focus:border-accent'
            ]"
          />
          <p v-if="errors.name" class="text-red-400 text-xs mt-1">{{ errors.name }}</p>
        </div>

        <!-- Department -->
        <div>
          <label class="block text-sm text-text-secondary mb-1">Department</label>
          <select v-model="form.department" class="w-full bg-eval-surface border border-eval-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent transition-colors">
            <option v-for="d in departments" :key="d" :value="d">{{ d }}</option>
          </select>
        </div>

        <!-- Role -->
        <div>
          <label class="block text-sm text-text-secondary mb-1">Role <span class="text-red-400">*</span></label>
          <input
            v-model="form.role"
            type="text"
            :class="[
              'w-full bg-eval-surface border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none transition-colors',
              errors.role ? 'border-red-500 focus:border-red-400' : 'border-eval-border focus:border-accent'
            ]"
          />
          <p v-if="errors.role" class="text-red-400 text-xs mt-1">{{ errors.role }}</p>
        </div>

        <!-- Model -->
        <div>
          <label class="block text-sm text-text-secondary mb-1">Model</label>
          <select v-model="form.model" class="w-full bg-eval-surface border border-eval-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent transition-colors">
            <option value="">None</option>
            <option value="opus">Opus</option>
            <option value="sonnet">Sonnet</option>
            <option value="haiku">Haiku</option>
          </select>
        </div>

        <!-- Persona -->
        <div>
          <label class="block text-sm text-text-secondary mb-1">Persona</label>
          <textarea v-model="form.persona" rows="4" class="w-full bg-eval-surface border border-eval-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent transition-colors"></textarea>
        </div>

        <!-- KPI Definitions (tag chips) -->
        <div>
          <label class="block text-sm text-text-secondary mb-1">KPI Definitions</label>
          <div
            class="w-full bg-eval-surface border rounded-lg px-2 py-1.5 flex flex-wrap items-center gap-1.5 min-h-[2.5rem] focus-within:border-accent transition-colors"
            :class="errors.kpi ? 'border-red-500' : 'border-eval-border'"
          >
            <!-- Chips -->
            <span
              v-for="(kpi, idx) in form.kpi_definitions"
              :key="kpi"
              class="inline-flex items-center gap-1 bg-accent/20 text-accent text-xs px-2 py-1 rounded-full"
            >
              {{ kpi }}
              <button
                type="button"
                @click="removeKpi(idx)"
                class="hover:text-white transition-colors"
                aria-label="Remove KPI"
              >
                <XMarkIcon class="w-3 h-3" />
              </button>
            </span>
            <!-- Input -->
            <input
              v-model="kpiInput"
              type="text"
              @keydown="handleKpiKeydown"
              placeholder="Type and press Enter..."
              class="flex-1 min-w-[8rem] bg-transparent text-text-primary text-sm outline-none py-1 placeholder:text-text-muted"
            />
          </div>
          <p v-if="errors.kpi" class="text-red-400 text-xs mt-1">{{ errors.kpi }}</p>
          <p class="text-text-muted text-xs mt-1">Lowercase, alphanumeric, underscores. Press Enter to add, Backspace to remove last.</p>
        </div>

        <!-- Buttons -->
        <div class="flex items-center gap-3">
          <button
            type="submit"
            :disabled="saving"
            class="px-4 py-2 bg-accent hover:bg-accent-hover rounded-lg text-white text-sm transition-colors disabled:opacity-50"
          >{{ saving ? 'Saving...' : 'Save Changes' }}</button>
          <button
            type="button"
            @click="cancel"
            class="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-text-secondary text-sm transition-colors"
          >Cancel</button>
        </div>
      </form>

      <!-- Action Items / Write-back suggestions -->
      <div v-if="actionItems.length > 0" class="glass-card p-4 space-y-3">
        <h2 class="text-lg font-semibold text-text-primary">Improvement Suggestions</h2>
        <p class="text-sm text-text-muted">
          Action items from evaluations. Mark as applied after updating the agent's behavior rules
          via <code class="text-accent font-mono text-xs">/apply-action-items</code>.
        </p>

        <!-- Confirmation dialog -->
        <div v-if="confirmItem" class="bg-accent/10 border border-accent/30 rounded-lg p-3 space-y-2">
          <p class="text-sm text-text-primary">Mark this action item as applied?</p>
          <p class="text-xs text-text-secondary italic">"{{ confirmItem.action_item }}"</p>
          <div class="flex gap-2">
            <button
              @click="confirmApply"
              class="px-3 py-1.5 bg-accent hover:bg-accent-hover rounded text-white text-xs transition-colors"
            >Confirm</button>
            <button
              @click="cancelApply"
              class="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded text-text-secondary text-xs transition-colors"
            >Cancel</button>
          </div>
        </div>

        <div
          v-for="item in actionItems"
          :key="item.evaluation_id"
          class="bg-eval-surface rounded-lg p-3 space-y-1"
          :class="{ 'opacity-50': item.applied }"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="text-sm text-text-primary">
              <span v-if="item.applied" class="text-emerald-400 text-xs font-medium mr-1.5">Applied</span>
              {{ item.action_item }}
            </div>
            <div class="shrink-0 flex gap-1">
              <button
                v-if="!item.applied"
                @click="startApply(item)"
                :disabled="applyingId === item.evaluation_id"
                class="px-2 py-1 text-xs bg-accent/20 hover:bg-accent/30 rounded text-accent transition-colors disabled:opacity-50"
              >{{ applyingId === item.evaluation_id ? 'Applying...' : 'Apply' }}</button>
              <button
                v-if="!item.applied"
                @click="copyActionItem(item)"
                class="px-2 py-1 text-xs bg-white/5 hover:bg-white/10 rounded text-text-secondary transition-colors"
              >{{ copied === item.evaluation_id ? 'Copied!' : 'Copy' }}</button>
              <template v-if="item.applied">
                <button
                  @click="handleUnapply(item)"
                  :disabled="applyingId === item.evaluation_id"
                  class="px-2 py-1 text-xs bg-white/5 hover:bg-white/10 rounded text-text-secondary transition-colors disabled:opacity-50"
                >Unapply</button>
                <span class="text-xs text-text-muted">
                  {{ new Date(item.applied_at).toLocaleDateString() }}
                </span>
              </template>
            </div>
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
