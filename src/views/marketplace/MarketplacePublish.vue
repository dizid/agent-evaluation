<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { getAgent, publishTemplate } from '@/services/api'
import { useToast } from '@/composables/useToast'
import { useOrgContext } from '@/composables/useOrgContext'
import {
  GlobeAltIcon,
  ArrowLeftIcon,
  TagIcon,
  XMarkIcon,
  ChevronDownIcon
} from '@heroicons/vue/24/outline'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const { canAdmin } = useOrgContext()

// Data
const agent = ref(null)
const loading = ref(true)
const publishing = ref(false)
const error = ref(null)

// Form fields
const templateId = ref('')
const templateName = ref('')
const description = ref('')
const tags = ref([])
const tagInput = ref('')
const isPublic = ref(true)

// Persona preview state
const showFullPersona = ref(false)

onMounted(async () => {
  try {
    const data = await getAgent(route.params.id)
    agent.value = data.agent || data

    // Pre-fill form from agent data
    templateId.value = agent.value.id || ''
    templateName.value = agent.value.name || ''
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
})

// Validate template ID format: lowercase alphanumeric + hyphens, 2-50 chars
const validateId = computed(() => {
  const id = templateId.value
  if (!id) return { valid: false, message: 'Template ID is required' }
  if (id.length < 2 || id.length > 50) return { valid: false, message: 'ID must be 2-50 characters' }
  if (!/^[a-z0-9-]+$/.test(id)) return { valid: false, message: 'Lowercase alphanumeric + hyphens only' }
  return { valid: true, message: null }
})

const canPublish = computed(() => {
  return validateId.value.valid && templateName.value.trim().length > 0
})

// Tag management
function addTag() {
  const raw = tagInput.value.trim().replace(/,$/, '').trim()
  if (!raw) return
  if (tags.value.length >= 10) {
    toast.error('Maximum 10 tags allowed')
    return
  }
  const tag = raw.slice(0, 50)
  if (!tags.value.includes(tag)) {
    tags.value.push(tag)
  }
  tagInput.value = ''
}

function onTagKeydown(e) {
  // Add tag on Enter or comma
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault()
    addTag()
  }
}

function removeTag(idx) {
  tags.value.splice(idx, 1)
}

// Persona preview helpers
const personaPreview = computed(() => {
  const raw = agent.value?.persona
  if (!raw) return ''
  return raw.slice(0, 200)
})

const hasMorePersona = computed(() => {
  return (agent.value?.persona || '').length > 200
})

const kpiList = computed(() => {
  const defs = agent.value?.kpi_definitions
  if (!defs || !Array.isArray(defs)) return []
  return defs.map(k => (typeof k === 'string' ? k : k.key || k.name || String(k)))
})

async function handlePublish() {
  if (!canPublish.value) return

  publishing.value = true
  try {
    const result = await publishTemplate({
      agent_id: agent.value.id,
      template_id: templateId.value,
      name: templateName.value.trim(),
      description: description.value.trim() || undefined,
      tags: tags.value,
      is_public: isPublic.value
    })

    toast.success('Agent published to marketplace!')
    const published = result.template
    router.push(`/marketplace/${published.id}`)
  } catch (e) {
    if (e.message.toLowerCase().includes('already exists') || e.message.includes('409')) {
      toast.error('That template ID already exists in the marketplace. Choose a different ID.')
    } else {
      toast.error('Failed to publish: ' + e.message)
    }
  } finally {
    publishing.value = false
  }
}
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
      <RouterLink to="/browse" class="text-accent hover:text-accent-hover transition-colors">
        Back to Browse
      </RouterLink>
    </div>

    <!-- Main content -->
    <template v-else-if="agent">
      <!-- Back navigation -->
      <RouterLink
        :to="`/agent/${agent.id}`"
        class="inline-flex items-center gap-1.5 text-text-muted hover:text-text-secondary transition-colors text-sm mb-6"
      >
        <ArrowLeftIcon class="w-4 h-4" />
        Back to Agent
      </RouterLink>

      <!-- Page header -->
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-text-primary flex items-center gap-2">
          <GlobeAltIcon class="w-6 h-6 text-accent" />
          Publish to Marketplace
        </h1>
        <p class="text-text-secondary text-sm mt-1">
          Share this agent as a reusable template that other organizations can install.
        </p>
      </div>

      <!-- Agent summary card (read-only) -->
      <div class="glass-card p-5 mb-6">
        <div class="flex items-start justify-between gap-4">
          <div class="min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <span class="text-text-primary font-semibold">{{ agent.name }}</span>
              <span v-if="agent.overall_score" class="px-2 py-0.5 rounded text-xs font-bold bg-eval-surface text-text-primary">
                {{ Number(agent.overall_score).toFixed(1) }}
              </span>
            </div>
            <p class="text-text-secondary text-sm">{{ agent.role }}</p>
            <div class="flex items-center gap-2 mt-2 flex-wrap">
              <span
                v-if="agent.department"
                class="inline-flex items-center text-xs px-2 py-0.5 bg-eval-surface border border-eval-border rounded-full text-text-secondary"
              >
                {{ agent.department }}
              </span>
              <span class="inline-flex items-center text-xs px-2 py-0.5 bg-eval-surface border border-eval-border rounded-full text-text-muted">
                {{ agent.source_type || 'manual' }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Publish form -->
      <div class="glass-card p-6 mb-6 space-y-5">
        <h2 class="text-base font-semibold text-text-primary">Template Details</h2>

        <!-- Template ID -->
        <div>
          <label for="templateId" class="block text-text-secondary text-sm font-medium mb-1.5">
            Template ID
          </label>
          <input
            id="templateId"
            v-model="templateId"
            type="text"
            placeholder="my-agent-template"
            class="w-full px-3 py-2 bg-eval-surface border border-eval-border rounded-lg text-text-primary placeholder-text-muted focus:border-accent focus:outline-none transition-colors"
          />
          <p
            v-if="templateId && !validateId.valid"
            class="text-score-failing text-xs mt-1"
          >
            {{ validateId.message }}
          </p>
          <p v-else class="text-text-muted text-xs mt-1">
            Unique ID in the marketplace. Lowercase alphanumeric + hyphens (2-50 chars).
          </p>
        </div>

        <!-- Display Name -->
        <div>
          <label for="templateName" class="block text-text-secondary text-sm font-medium mb-1.5">
            Display Name
          </label>
          <input
            id="templateName"
            v-model="templateName"
            type="text"
            placeholder="My Agent Template"
            class="w-full px-3 py-2 bg-eval-surface border border-eval-border rounded-lg text-text-primary placeholder-text-muted focus:border-accent focus:outline-none transition-colors"
          />
        </div>

        <!-- Description -->
        <div>
          <label for="description" class="block text-text-secondary text-sm font-medium mb-1.5">
            Description
            <span class="text-text-muted font-normal">(optional)</span>
          </label>
          <textarea
            id="description"
            v-model="description"
            rows="4"
            maxlength="2000"
            placeholder="Describe what this agent does, its strengths, and when to use it..."
            class="w-full px-3 py-2 bg-eval-surface border border-eval-border rounded-lg text-text-primary placeholder-text-muted focus:border-accent focus:outline-none resize-y transition-colors"
          ></textarea>
          <p class="text-text-muted text-xs mt-1 text-right">{{ description.length }}/2000</p>
        </div>

        <!-- Tags -->
        <div>
          <label class="block text-text-secondary text-sm font-medium mb-1.5">
            <span class="flex items-center gap-1.5">
              <TagIcon class="w-4 h-4" />
              Tags
              <span class="text-text-muted font-normal">(optional, max 10)</span>
            </span>
          </label>

          <!-- Tag chips -->
          <div
            v-if="tags.length > 0"
            class="flex flex-wrap gap-1.5 mb-2"
          >
            <span
              v-for="(tag, idx) in tags"
              :key="idx"
              class="inline-flex items-center gap-1 px-2.5 py-1 bg-accent/10 border border-accent/30 text-accent text-xs rounded-full"
            >
              {{ tag }}
              <button
                @click="removeTag(idx)"
                type="button"
                class="hover:text-white transition-colors"
                :aria-label="`Remove tag ${tag}`"
              >
                <XMarkIcon class="w-3 h-3" />
              </button>
            </span>
          </div>

          <input
            v-model="tagInput"
            type="text"
            placeholder="Type a tag and press Enter or comma"
            class="w-full px-3 py-2 bg-eval-surface border border-eval-border rounded-lg text-text-primary placeholder-text-muted focus:border-accent focus:outline-none transition-colors"
            @keydown="onTagKeydown"
            @blur="addTag"
            :disabled="tags.length >= 10"
          />
          <p class="text-text-muted text-xs mt-1">{{ tags.length }}/10 tags</p>
        </div>

        <!-- Public toggle -->
        <div class="flex items-center justify-between py-3 border-t border-eval-border">
          <div>
            <p class="text-text-primary text-sm font-medium">Public listing</p>
            <p class="text-text-muted text-xs mt-0.5">
              Public templates appear in the marketplace for anyone to browse and install.
            </p>
          </div>
          <label class="relative inline-flex items-center cursor-pointer ml-4 shrink-0">
            <input
              type="checkbox"
              v-model="isPublic"
              class="sr-only peer"
            />
            <div class="w-11 h-6 bg-eval-surface border border-eval-border rounded-full peer peer-checked:bg-accent peer-checked:border-accent transition-colors">
              <div
                class="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
                :class="{ 'translate-x-5': isPublic }"
              ></div>
            </div>
          </label>
        </div>
      </div>

      <!-- Persona preview (collapsible) -->
      <div v-if="agent.persona" class="glass-card p-5 mb-6">
        <button
          @click="showFullPersona = !showFullPersona"
          :aria-expanded="showFullPersona"
          class="flex items-center justify-between w-full text-left"
        >
          <h2 class="text-sm font-semibold text-text-primary">Persona Preview</h2>
          <ChevronDownIcon
            class="w-5 h-5 text-text-muted transition-transform duration-200"
            :class="{ 'rotate-180': showFullPersona }"
          />
        </button>

        <div class="mt-3 p-4 bg-eval-surface rounded-lg">
          <p class="text-text-secondary text-sm leading-relaxed whitespace-pre-wrap">
            {{ showFullPersona ? agent.persona : personaPreview }}
          </p>
          <button
            v-if="hasMorePersona"
            @click="showFullPersona = !showFullPersona"
            class="mt-2 text-accent hover:text-accent-hover text-xs transition-colors"
          >
            {{ showFullPersona ? 'Show less' : 'Show more...' }}
          </button>
        </div>
      </div>

      <!-- KPI list (read-only) -->
      <div v-if="kpiList.length > 0" class="glass-card p-5 mb-6">
        <h2 class="text-sm font-semibold text-text-primary mb-3">Role KPIs</h2>
        <div class="flex flex-wrap gap-2">
          <span
            v-for="(kpi, idx) in kpiList"
            :key="idx"
            class="px-3 py-1 bg-eval-surface border border-eval-border text-text-secondary text-xs rounded-full"
          >
            {{ kpi }}
          </span>
        </div>
      </div>

      <!-- Action button -->
      <div class="flex flex-col sm:flex-row gap-3">
        <button
          @click="handlePublish"
          :disabled="!canPublish || publishing"
          :class="[
            canPublish && !publishing
              ? 'bg-accent hover:bg-accent-hover text-white'
              : 'bg-eval-surface text-text-muted cursor-not-allowed opacity-60'
          ]"
          class="inline-flex items-center justify-center gap-2 w-full sm:flex-1 px-6 py-3 rounded-lg font-medium transition-colors"
        >
          <div v-if="publishing" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          <GlobeAltIcon v-else class="w-4 h-4" />
          {{ publishing ? 'Publishing...' : 'Publish to Marketplace' }}
        </button>
        <RouterLink
          :to="`/agent/${agent.id}`"
          class="inline-flex items-center justify-center px-6 py-3 bg-eval-card hover:bg-eval-surface border border-eval-border rounded-lg text-text-secondary hover:text-text-primary transition-colors font-medium"
        >
          Cancel
        </RouterLink>
      </div>
    </template>
  </div>
</template>
