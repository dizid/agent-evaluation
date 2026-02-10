<script setup>
import { ref, onMounted, computed } from 'vue'
import { useOrgContext } from '@/composables/useOrgContext.js'
import { useToast } from '@/composables/useToast.js'
import { getDepartments, createDepartment, updateDepartment, deleteDepartment } from '@/services/api.js'

const { currentOrg, canManageAgents } = useOrgContext()
const toast = useToast()

const loading = ref(true)
const departments = ref([])
const showAddForm = ref(false)
const editingId = ref(null)

// Form state
const formName = ref('')
const formSlug = ref('')
const formColor = ref('#7c3aed')

const presetColors = [
  '#7c3aed', // purple
  '#f97316', // orange
  '#06b6d4', // cyan
  '#10b981', // green
  '#f43f5e', // red
  '#8b5cf6', // violet
  '#f59e0b', // amber
  '#3b82f6', // blue
  '#ec4899', // pink
  '#14b8a6'  // teal
]

const autoSlug = computed(() => {
  return formName.value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
})

async function loadDepartments() {
  loading.value = true
  try {
    const res = await getDepartments()
    departments.value = res.departments || []
  } catch (err) {
    toast.error('Failed to load departments')
    console.error(err)
  } finally {
    loading.value = false
  }
}

function openAddForm() {
  formName.value = ''
  formSlug.value = ''
  formColor.value = presetColors[0]
  editingId.value = null
  showAddForm.value = true
}

function openEditForm(dept) {
  formName.value = dept.name
  formSlug.value = dept.slug
  formColor.value = dept.color || presetColors[0]
  editingId.value = dept.id
  showAddForm.value = true
}

function cancelForm() {
  showAddForm.value = false
  editingId.value = null
  formName.value = ''
  formSlug.value = ''
  formColor.value = presetColors[0]
}

async function handleSave() {
  if (!formName.value.trim()) {
    toast.error('Department name is required')
    return
  }

  const data = {
    name: formName.value.trim(),
    slug: formSlug.value || autoSlug.value,
    color: formColor.value
  }

  try {
    if (editingId.value) {
      await updateDepartment(editingId.value, data)
      toast.success('Department updated')
    } else {
      await createDepartment(data)
      toast.success('Department created')
    }

    cancelForm()
    await loadDepartments()
  } catch (err) {
    toast.error(err.message || 'Failed to save department')
  }
}

async function handleDelete(id, name) {
  if (!confirm(`Delete department "${name}"? This cannot be undone.`)) return

  try {
    await deleteDepartment(id)
    toast.success('Department deleted')
    await loadDepartments()
  } catch (err) {
    toast.error(err.message || 'Failed to delete department')
  }
}

onMounted(loadDepartments)
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 py-8">
    <!-- Header -->
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-3xl font-bold text-text-primary mb-2">Departments</h1>
        <p class="text-text-secondary">{{ currentOrg?.name }}</p>
      </div>
      <button
        v-if="canManageAgents && !showAddForm"
        @click="openAddForm"
        class="px-4 py-2 bg-accent hover:bg-accent-hover rounded-lg text-white font-semibold transition-colors"
      >
        Add Department
      </button>
    </div>

    <!-- Add/Edit form -->
    <div v-if="showAddForm" class="glass-card p-6 mb-6">
      <h3 class="text-lg font-semibold text-text-primary mb-4">
        {{ editingId ? 'Edit Department' : 'Add Department' }}
      </h3>
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-text-secondary mb-2">Name</label>
          <input
            v-model="formName"
            type="text"
            placeholder="e.g., Development"
            class="w-full px-3 py-2 bg-eval-surface border border-eval-border rounded-lg text-text-primary placeholder-text-muted focus:border-accent focus:outline-none"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-text-secondary mb-2">Slug</label>
          <input
            v-model="formSlug"
            type="text"
            :placeholder="autoSlug || 'auto-generated'"
            class="w-full px-3 py-2 bg-eval-surface border border-eval-border rounded-lg text-text-primary placeholder-text-muted focus:border-accent focus:outline-none"
          />
          <p class="text-text-muted text-xs mt-1">
            Leave empty to auto-generate: {{ autoSlug }}
          </p>
        </div>
        <div>
          <label class="block text-sm font-medium text-text-secondary mb-2">Color</label>
          <div class="flex items-center space-x-2">
            <input
              v-model="formColor"
              type="color"
              class="w-12 h-12 rounded cursor-pointer"
            />
            <div class="flex flex-wrap gap-2">
              <button
                v-for="color in presetColors"
                :key="color"
                @click="formColor = color"
                class="w-8 h-8 rounded border-2 transition-all"
                :class="formColor === color ? 'border-white scale-110' : 'border-transparent'"
                :style="{ backgroundColor: color }"
              ></button>
            </div>
          </div>
        </div>
        <div class="flex space-x-3">
          <button
            @click="handleSave"
            class="flex-1 px-4 py-3 bg-accent hover:bg-accent-hover rounded-lg text-white font-semibold transition-colors"
          >
            {{ editingId ? 'Update' : 'Create' }}
          </button>
          <button
            @click="cancelForm"
            class="flex-1 px-4 py-3 bg-eval-surface hover:bg-eval-card border border-eval-border rounded-lg text-text-primary transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>

    <!-- Departments list -->
    <div v-if="loading" class="space-y-4">
      <div v-for="i in 3" :key="i" class="glass-card p-6 h-24 animate-pulse"></div>
    </div>

    <div v-else class="space-y-4">
      <div
        v-for="dept in departments"
        :key="dept.id"
        class="glass-card p-6"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4 flex-1">
            <div
              class="w-12 h-12 rounded-lg flex-shrink-0"
              :style="{ backgroundColor: dept.color }"
            ></div>
            <div class="flex-1">
              <div class="text-text-primary font-semibold text-lg mb-1">{{ dept.name }}</div>
              <div class="flex items-center space-x-3 text-sm">
                <span class="text-text-muted">{{ dept.slug }}</span>
                <span class="text-text-secondary">{{ dept.agent_count || 0 }} agents</span>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div v-if="canManageAgents" class="flex items-center space-x-3">
            <button
              @click="openEditForm(dept)"
              class="px-3 py-1 bg-eval-surface hover:bg-eval-card border border-eval-border rounded text-sm text-text-primary transition-colors"
            >
              Edit
            </button>
            <button
              @click="handleDelete(dept.id, dept.name)"
              class="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded text-sm font-medium transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      <div v-if="departments.length === 0" class="glass-card p-12 text-center">
        <p class="text-text-muted">No departments yet. Create one to organize your agents.</p>
      </div>
    </div>
  </div>
</template>
