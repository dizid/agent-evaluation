<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useOrgContext } from '@/composables/useOrgContext.js'
import { useToast } from '@/composables/useToast.js'
import { createOrganization, createDepartment } from '@/services/api.js'

const router = useRouter()
const { fetchOrgs } = useOrgContext()
const toast = useToast()

// Wizard state
const step = ref(1)
const loading = ref(false)

// Company data
const companyName = ref('')
const companySlug = computed(() => {
  return companyName.value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
})

// Departments
const departments = ref([
  { name: 'Development', slug: 'development', color: '#7c3aed' },
  { name: 'Marketing', slug: 'marketing', color: '#f97316' },
  { name: 'Operations', slug: 'operations', color: '#06b6d4' }
])

const newDeptName = ref('')

// Validation
const canProceedStep1 = computed(() => companyName.value.trim().length >= 2)

// Actions
function nextStep() {
  if (step.value === 1 && !canProceedStep1.value) {
    toast.error('Company name must be at least 2 characters')
    return
  }
  step.value++
}

function prevStep() {
  if (step.value > 1) step.value--
}

function addDepartment() {
  const name = newDeptName.value.trim()
  if (!name) return

  const slug = name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-')
  const colors = ['#10b981', '#f43f5e', '#8b5cf6', '#06b6d4', '#f59e0b', '#ef4444']
  const color = colors[departments.value.length % colors.length]

  departments.value.push({ name, slug, color })
  newDeptName.value = ''
}

function removeDepartment(index) {
  departments.value.splice(index, 1)
}

async function complete() {
  if (!canProceedStep1.value) {
    toast.error('Please complete all steps')
    return
  }

  loading.value = true
  try {
    // Create organization
    await createOrganization({
      name: companyName.value.trim(),
      slug: companySlug.value
    })

    // Create departments
    for (const dept of departments.value) {
      await createDepartment(dept)
    }

    toast.success('Onboarding complete! Welcome to AgentEval.')

    // Refresh org context
    await fetchOrgs()

    // Redirect to dashboard
    router.push('/dashboard')
  } catch (err) {
    toast.error(err.message || 'Onboarding failed')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="max-w-2xl mx-auto px-4 py-12">
    <!-- Progress indicator -->
    <div class="mb-8">
      <div class="flex items-center justify-center space-x-4 mb-4">
        <div
          v-for="i in 3"
          :key="i"
          class="flex items-center"
        >
          <div
            class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors"
            :class="
              step >= i
                ? 'bg-accent text-white'
                : 'bg-eval-surface text-text-muted border border-eval-border'
            "
          >
            {{ i }}
          </div>
          <div
            v-if="i < 3"
            class="w-16 h-0.5 transition-colors"
            :class="step > i ? 'bg-accent' : 'bg-eval-border'"
          ></div>
        </div>
      </div>
      <p class="text-center text-text-secondary text-sm">Step {{ step }} of 3</p>
    </div>

    <!-- Step 1: Welcome -->
    <div v-if="step === 1" class="glass-card p-8">
      <h1 class="text-3xl font-bold text-text-primary mb-4">Welcome to AgentEval</h1>
      <p class="text-text-secondary mb-6">
        The platform for evaluating, improving, and managing your AI agent workforce.
      </p>
      <ul class="space-y-2 mb-8">
        <li class="flex items-start">
          <span class="text-accent mr-2">✓</span>
          <span class="text-text-secondary">Standardized evaluation framework with 8 universal criteria</span>
        </li>
        <li class="flex items-start">
          <span class="text-accent mr-2">✓</span>
          <span class="text-text-secondary">Track performance trends across your entire agent roster</span>
        </li>
        <li class="flex items-start">
          <span class="text-accent mr-2">✓</span>
          <span class="text-text-secondary">Actionable improvement suggestions with write-back to agent definitions</span>
        </li>
        <li class="flex items-start">
          <span class="text-accent mr-2">✓</span>
          <span class="text-text-secondary">Role-based access control for team collaboration</span>
        </li>
      </ul>
      <button
        @click="nextStep"
        class="w-full px-4 py-3 bg-accent hover:bg-accent-hover rounded-lg text-white font-semibold transition-colors"
      >
        Get Started
      </button>
    </div>

    <!-- Step 2: Create Company -->
    <div v-if="step === 2" class="glass-card p-8">
      <h2 class="text-2xl font-bold text-text-primary mb-6">Create Your Organization</h2>
      <div class="space-y-4 mb-8">
        <div>
          <label class="block text-sm font-medium text-text-secondary mb-2">Company Name</label>
          <input
            v-model="companyName"
            type="text"
            placeholder="e.g., Acme Corp"
            class="w-full px-3 py-2 bg-eval-surface border border-eval-border rounded-lg text-text-primary placeholder-text-muted focus:border-accent focus:outline-none"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-text-secondary mb-2">URL Slug</label>
          <div class="flex items-center space-x-2">
            <span class="text-text-muted text-sm">agenteval.com/</span>
            <input
              :value="companySlug"
              disabled
              class="flex-1 px-3 py-2 bg-eval-card border border-eval-border rounded-lg text-text-muted"
            />
          </div>
        </div>
      </div>
      <div class="flex space-x-4">
        <button
          @click="prevStep"
          class="flex-1 px-4 py-3 bg-eval-surface hover:bg-eval-card border border-eval-border rounded-lg text-text-primary transition-colors"
        >
          Back
        </button>
        <button
          @click="nextStep"
          :disabled="!canProceedStep1"
          class="flex-1 px-4 py-3 bg-accent hover:bg-accent-hover rounded-lg text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>

    <!-- Step 3: Setup Departments -->
    <div v-if="step === 3" class="glass-card p-8">
      <h2 class="text-2xl font-bold text-text-primary mb-2">Setup Departments</h2>
      <p class="text-text-secondary mb-6">Organize your agents into departments. You can add more later.</p>

      <div class="space-y-3 mb-6">
        <div
          v-for="(dept, index) in departments"
          :key="index"
          class="flex items-center justify-between p-3 bg-eval-surface rounded-lg border border-eval-border"
        >
          <div class="flex items-center space-x-3">
            <div
              class="w-4 h-4 rounded-full"
              :style="{ backgroundColor: dept.color }"
            ></div>
            <span class="text-text-primary font-medium">{{ dept.name }}</span>
            <span class="text-text-muted text-sm">{{ dept.slug }}</span>
          </div>
          <button
            @click="removeDepartment(index)"
            class="text-text-muted hover:text-red-400 transition-colors"
          >
            ✕
          </button>
        </div>
      </div>

      <div class="flex space-x-2 mb-8">
        <input
          v-model="newDeptName"
          @keyup.enter="addDepartment"
          type="text"
          placeholder="Add another department"
          class="flex-1 px-3 py-2 bg-eval-surface border border-eval-border rounded-lg text-text-primary placeholder-text-muted focus:border-accent focus:outline-none"
        />
        <button
          @click="addDepartment"
          class="px-4 py-2 bg-eval-surface hover:bg-eval-card border border-eval-border rounded-lg text-text-primary transition-colors"
        >
          Add
        </button>
      </div>

      <div class="flex space-x-4">
        <button
          @click="prevStep"
          class="flex-1 px-4 py-3 bg-eval-surface hover:bg-eval-card border border-eval-border rounded-lg text-text-primary transition-colors"
        >
          Back
        </button>
        <button
          @click="complete"
          :disabled="loading"
          class="flex-1 px-4 py-3 bg-accent hover:bg-accent-hover rounded-lg text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ loading ? 'Creating...' : 'Complete Setup' }}
        </button>
      </div>
    </div>
  </div>
</template>
