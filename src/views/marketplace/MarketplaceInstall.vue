<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { getMarketplaceTemplate, installTemplate, getDepartments } from '@/services/api'
import { useToast } from '@/composables/useToast'
import { useOrgContext } from '@/composables/useOrgContext'
import {
  ArrowLeftIcon,
  CheckIcon,
  ArrowRightIcon,
  ArrowDownTrayIcon
} from '@heroicons/vue/24/outline'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const { currentOrg } = useOrgContext()

const template = ref(null)
const departments = ref([])
const loading = ref(true)
const error = ref(null)
const installing = ref(false)

const step = ref(1) // 1: Preview, 2: Customize, 3: Confirm, 4: Download
const installedAgent = ref(null)

// Customization form
const agentId = ref('')
const displayName = ref('')
const selectedDepartment = ref('')
const customPersona = ref('')

onMounted(async () => {
  try {
    const [templateData, deptData] = await Promise.all([
      getMarketplaceTemplate(route.params.id),
      getDepartments()
    ])

    template.value = templateData.template || templateData
    departments.value = Array.isArray(deptData) ? deptData : deptData.departments || []

    // Pre-fill form
    agentId.value = template.value.id || ''
    displayName.value = template.value.name || ''
    // Match template category (slug) to a department UUID, fallback to first dept
    const matchedDept = departments.value.find(d => d.slug === template.value.category)
    selectedDepartment.value = matchedDept?.id || departments.value[0]?.id || ''
    customPersona.value = template.value.persona || ''
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
})

const validateAgentId = computed(() => {
  const id = agentId.value
  if (!id) return { valid: false, error: 'Agent ID is required' }
  if (id.length < 2 || id.length > 50) return { valid: false, error: 'ID must be 2-50 characters' }
  if (!/^[a-z0-9-]+$/.test(id)) return { valid: false, error: 'ID must be lowercase alphanumeric + hyphens only' }
  return { valid: true, error: null }
})

const canProceed = computed(() => {
  if (step.value === 1) return true
  if (step.value === 2) {
    return validateAgentId.value.valid && displayName.value.trim() && selectedDepartment.value
  }
  if (step.value === 3) return true
  return false
})

const nextStep = () => {
  if (!canProceed.value) return
  step.value++
}

const prevStep = () => {
  if (step.value > 1) step.value--
}

const handleInstall = async () => {
  if (!canProceed.value) return

  installing.value = true
  try {
    const customization = {
      agent_id: agentId.value,
      name: displayName.value,
      department_id: selectedDepartment.value,
      persona: customPersona.value
    }

    const result = await installTemplate(route.params.id, customization)
    installedAgent.value = result.agent || result

    toast.success('Agent installed successfully!')
    step.value = 4 // Go to download step
  } catch (e) {
    if (e.message.includes('409') || e.message.toLowerCase().includes('already exists')) {
      toast.error('An agent with this ID already exists in your organization')
    } else {
      toast.error('Failed to install template: ' + e.message)
    }
  } finally {
    installing.value = false
  }
}

const generateMarkdownFile = (agent) => {
  const frontmatter = `---
name: ${agent.id}
description: "${agent.role || ''}"
model: ${agent.model || 'sonnet'}
---`

  return `${frontmatter}\n\n# @${agent.name} — ${agent.role || ''}\n\n${agent.persona || ''}`
}

const downloadFile = () => {
  if (!installedAgent.value) return

  const content = generateMarkdownFile(installedAgent.value)
  const filename = `${installedAgent.value.id}.md`

  const blob = new Blob([content], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)

  toast.success('File downloaded!')
}

const goToAgent = () => {
  if (!installedAgent.value) return
  router.push(`/agent/${installedAgent.value.id}`)
}

const stepIndicator = computed(() => {
  const steps = ['Preview', 'Customize', 'Confirm', 'Download']
  return steps.map((label, idx) => ({
    number: idx + 1,
    label,
    active: step.value === idx + 1,
    completed: step.value > idx + 1
  }))
})
</script>

<template>
  <div class="max-w-3xl mx-auto">
    <!-- Loading skeleton -->
    <div v-if="loading" class="space-y-6">
      <div class="h-4 bg-eval-surface rounded w-32 animate-pulse"></div>
      <div class="glass-card p-6 animate-pulse">
        <div class="h-6 bg-eval-surface rounded w-2/3 mb-4"></div>
        <div class="h-4 bg-eval-surface rounded w-full mb-2"></div>
        <div class="h-4 bg-eval-surface rounded w-5/6"></div>
      </div>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="text-center py-16">
      <p class="text-score-failing text-lg mb-4">{{ error }}</p>
      <RouterLink to="/marketplace" class="text-accent hover:text-accent-hover transition-colors">
        Back to Marketplace
      </RouterLink>
    </div>

    <!-- Main content -->
    <template v-else-if="template">
      <!-- Back navigation -->
      <RouterLink
        :to="`/marketplace/${route.params.id}`"
        class="inline-flex items-center gap-1.5 text-text-muted hover:text-text-secondary transition-colors text-sm mb-6"
      >
        <ArrowLeftIcon class="w-4 h-4" />
        Back to Template
      </RouterLink>

      <!-- Step indicator -->
      <div class="glass-card p-5 mb-6">
        <div class="flex items-center justify-between">
          <div
            v-for="(s, idx) in stepIndicator"
            :key="s.number"
            class="flex items-center"
            :class="{ 'flex-1': idx < stepIndicator.length - 1 }"
          >
            <div class="flex items-center gap-2">
              <div
                :class="[
                  s.active ? 'bg-accent text-white' : s.completed ? 'bg-accent/20 text-accent' : 'bg-eval-surface text-text-muted',
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold'
                ]"
              >
                <CheckIcon v-if="s.completed" class="w-4 h-4" />
                <span v-else>{{ s.number }}</span>
              </div>
              <span
                :class="[
                  s.active ? 'text-text-primary' : 'text-text-muted',
                  'text-sm font-medium hidden sm:inline'
                ]"
              >
                {{ s.label }}
              </span>
            </div>
            <div
              v-if="idx < stepIndicator.length - 1"
              class="flex-1 h-0.5 bg-eval-border mx-2"
              :class="{ 'bg-accent/30': s.completed }"
            ></div>
          </div>
        </div>
      </div>

      <!-- Step 1: Preview -->
      <div v-if="step === 1" class="space-y-6">
        <div class="glass-card p-6">
          <h2 class="text-xl font-bold text-text-primary mb-2">{{ template.name }}</h2>
          <p class="text-text-secondary text-sm mb-4">{{ template.role }}</p>
          <p class="text-text-secondary text-sm leading-relaxed mb-4">{{ template.description }}</p>

          <div class="flex items-center gap-2 text-text-muted text-xs">
            <span>{{ template.install_count || 0 }} installs</span>
            <span v-if="template.avg_rating">{{ template.avg_rating.toFixed(1) }} rating</span>
          </div>
        </div>

        <div class="flex justify-end">
          <button
            @click="nextStep"
            class="inline-flex items-center gap-2 px-6 py-2.5 bg-accent hover:bg-accent-hover rounded-lg text-white font-medium transition-colors"
          >
            Next
            <ArrowRightIcon class="w-4 h-4" />
          </button>
        </div>
      </div>

      <!-- Step 2: Customize -->
      <div v-if="step === 2" class="space-y-6">
        <div class="glass-card p-6">
          <h2 class="text-lg font-bold text-text-primary mb-4">Customize Agent</h2>

          <div class="space-y-4">
            <!-- Agent ID -->
            <div>
              <label for="agentId" class="block text-text-secondary text-sm font-medium mb-1.5">
                Agent ID
              </label>
              <input
                id="agentId"
                v-model="agentId"
                type="text"
                placeholder="my-agent-id"
                class="w-full px-3 py-2 bg-eval-surface border border-eval-border rounded-lg text-text-primary placeholder-text-muted focus:border-accent focus:outline-none"
              />
              <p v-if="!validateAgentId.valid && agentId" class="text-score-failing text-xs mt-1">
                {{ validateAgentId.error }}
              </p>
              <p v-else class="text-text-muted text-xs mt-1">
                Lowercase alphanumeric + hyphens only (2-50 chars)
              </p>
            </div>

            <!-- Display Name -->
            <div>
              <label for="displayName" class="block text-text-secondary text-sm font-medium mb-1.5">
                Display Name
              </label>
              <input
                id="displayName"
                v-model="displayName"
                type="text"
                placeholder="My Agent"
                class="w-full px-3 py-2 bg-eval-surface border border-eval-border rounded-lg text-text-primary placeholder-text-muted focus:border-accent focus:outline-none"
              />
            </div>

            <!-- Department -->
            <div>
              <label for="department" class="block text-text-secondary text-sm font-medium mb-1.5">
                Department
              </label>
              <select
                id="department"
                v-model="selectedDepartment"
                class="w-full px-3 py-2 bg-eval-surface border border-eval-border rounded-lg text-text-primary focus:border-accent focus:outline-none"
              >
                <option v-for="dept in departments" :key="dept.id" :value="dept.id">
                  {{ dept.name }}
                </option>
              </select>
            </div>

            <!-- Persona -->
            <div>
              <label for="persona" class="block text-text-secondary text-sm font-medium mb-1.5">
                Persona (optional customization)
              </label>
              <textarea
                id="persona"
                v-model="customPersona"
                rows="8"
                class="w-full px-3 py-2 bg-eval-surface border border-eval-border rounded-lg text-text-primary placeholder-text-muted focus:border-accent focus:outline-none resize-y"
              ></textarea>
            </div>
          </div>
        </div>

        <div class="flex justify-between">
          <button
            @click="prevStep"
            class="px-6 py-2.5 bg-eval-card hover:bg-eval-surface border border-eval-border rounded-lg text-text-secondary hover:text-text-primary transition-colors font-medium"
          >
            Back
          </button>
          <button
            @click="nextStep"
            :disabled="!canProceed"
            :class="[
              canProceed
                ? 'bg-accent hover:bg-accent-hover text-white'
                : 'bg-eval-surface text-text-muted cursor-not-allowed'
            ]"
            class="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-colors"
          >
            Next
            <ArrowRightIcon class="w-4 h-4" />
          </button>
        </div>
      </div>

      <!-- Step 3: Confirm & Install -->
      <div v-if="step === 3" class="space-y-6">
        <div class="glass-card p-6">
          <h2 class="text-lg font-bold text-text-primary mb-4">Confirm Installation</h2>

          <div class="space-y-3 mb-6">
            <div class="flex justify-between py-2 border-b border-eval-border">
              <span class="text-text-muted text-sm">Agent ID</span>
              <span class="text-text-primary text-sm font-medium">{{ agentId }}</span>
            </div>
            <div class="flex justify-between py-2 border-b border-eval-border">
              <span class="text-text-muted text-sm">Display Name</span>
              <span class="text-text-primary text-sm font-medium">{{ displayName }}</span>
            </div>
            <div class="flex justify-between py-2 border-b border-eval-border">
              <span class="text-text-muted text-sm">Department</span>
              <span class="text-text-primary text-sm font-medium">
                {{ departments.find(d => d.id === selectedDepartment)?.name || selectedDepartment }}
              </span>
            </div>
            <div class="flex justify-between py-2">
              <span class="text-text-muted text-sm">Organization</span>
              <span class="text-text-primary text-sm font-medium">{{ currentOrg?.name || 'Your Company' }}</span>
            </div>
          </div>

          <div class="bg-accent/10 border border-accent/30 rounded-lg p-4 text-sm text-text-secondary">
            <p class="mb-2">This will create a new agent in your organization. You'll be able to:</p>
            <ul class="space-y-1 pl-4">
              <li class="flex gap-2">
                <span class="text-accent">&#8226;</span>
                <span>Evaluate and track performance</span>
              </li>
              <li class="flex gap-2">
                <span class="text-accent">&#8226;</span>
                <span>Download the .md file for Claude Code</span>
              </li>
              <li class="flex gap-2">
                <span class="text-accent">&#8226;</span>
                <span>Edit and customize the persona later</span>
              </li>
            </ul>
          </div>
        </div>

        <div class="flex justify-between">
          <button
            @click="prevStep"
            :disabled="installing"
            class="px-6 py-2.5 bg-eval-card hover:bg-eval-surface border border-eval-border rounded-lg text-text-secondary hover:text-text-primary transition-colors font-medium disabled:opacity-50"
          >
            Back
          </button>
          <button
            @click="handleInstall"
            :disabled="installing"
            class="inline-flex items-center gap-2 px-6 py-2.5 bg-accent hover:bg-accent-hover rounded-lg text-white font-medium transition-colors disabled:opacity-50"
          >
            <div v-if="installing" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            <span>{{ installing ? 'Installing...' : 'Install Agent' }}</span>
          </button>
        </div>
      </div>

      <!-- Step 4: Download -->
      <div v-if="step === 4 && installedAgent" class="space-y-6">
        <div class="glass-card p-6">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-12 h-12 bg-accent/20 text-accent rounded-full flex items-center justify-center">
              <CheckIcon class="w-6 h-6" />
            </div>
            <div>
              <h2 class="text-lg font-bold text-text-primary">Installation Complete!</h2>
              <p class="text-text-secondary text-sm">Agent installed successfully</p>
            </div>
          </div>
        </div>

        <!-- Download section -->
        <div class="glass-card p-6">
          <h3 class="text-sm font-semibold text-text-primary mb-3">Download Agent File</h3>
          <p class="text-text-secondary text-sm mb-4 leading-relaxed">
            Download the .md file and save it to <code class="px-1.5 py-0.5 bg-eval-surface rounded text-accent text-xs">~/.claude/agents/</code> to use this agent in Claude Code.
          </p>

          <div class="bg-eval-surface border border-eval-border rounded-lg p-4 mb-4 max-h-64 overflow-y-auto">
            <pre class="text-text-secondary text-xs font-mono whitespace-pre-wrap">{{ generateMarkdownFile(installedAgent) }}</pre>
          </div>

          <button
            @click="downloadFile"
            class="inline-flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover rounded-lg text-white font-medium transition-colors"
          >
            <ArrowDownTrayIcon class="w-4 h-4" />
            Download .md file
          </button>
        </div>

        <!-- Next steps -->
        <div class="flex gap-3">
          <button
            @click="goToAgent"
            class="flex-1 px-6 py-2.5 bg-accent hover:bg-accent-hover rounded-lg text-white font-medium transition-colors"
          >
            Go to Agent
          </button>
          <RouterLink
            to="/marketplace"
            class="flex-1 px-6 py-2.5 bg-eval-card hover:bg-eval-surface border border-eval-border rounded-lg text-text-secondary hover:text-text-primary transition-colors font-medium text-center"
          >
            Browse More Templates
          </RouterLink>
        </div>
      </div>
    </template>
  </div>
</template>
