<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { getMarketplaceTemplate } from '@/services/api'
import { useToast } from '@/composables/useToast'
import {
  ArrowLeftIcon,
  CheckBadgeIcon,
  StarIcon,
  ArrowDownTrayIcon,
  ChevronDownIcon
} from '@heroicons/vue/24/outline'
import { StarIcon as StarSolidIcon } from '@heroicons/vue/24/solid'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const template = ref(null)
const loading = ref(true)
const error = ref(null)
const showPersona = ref(false)

onMounted(async () => {
  try {
    const data = await getMarketplaceTemplate(route.params.id)
    template.value = data.template || data
  } catch (e) {
    error.value = e.message
    if (e.message.includes('404') || e.message.includes('not found')) {
      error.value = 'Template not found'
    }
  } finally {
    loading.value = false
  }
})

const getCategoryColor = (cat) => {
  switch (cat) {
    case 'development': return 'text-dept-dev'
    case 'marketing': return 'text-dept-marketing'
    case 'operations': return 'text-dept-ops'
    case 'sales': return 'text-accent'
    case 'custom': return 'text-text-muted'
    default: return 'text-text-secondary'
  }
}

const getCategoryBgColor = (cat) => {
  switch (cat) {
    case 'development': return 'bg-dept-dev/10 border-dept-dev/20'
    case 'marketing': return 'bg-dept-marketing/10 border-dept-marketing/20'
    case 'operations': return 'bg-dept-ops/10 border-dept-ops/20'
    case 'sales': return 'bg-accent/10 border-accent/20'
    case 'custom': return 'bg-white/5 border-eval-border'
    default: return 'bg-white/5 border-eval-border'
  }
}

// Parse structured persona text into labeled sections (same as AgentDetail.vue)
const personaSections = computed(() => {
  const raw = template.value?.persona
  if (!raw) return []

  const sectionLabels = ['Who:', 'Handles:', 'Tech:', 'Voice:', 'Behavior Rules:']
  const sections = []
  let remaining = raw.trim()

  for (let i = 0; i < sectionLabels.length; i++) {
    const label = sectionLabels[i]
    const idx = remaining.indexOf(label)
    if (idx === -1) continue

    // Find end: next section start or end of string
    let end = remaining.length
    for (let j = i + 1; j < sectionLabels.length; j++) {
      const nextIdx = remaining.indexOf(sectionLabels[j], idx + label.length)
      if (nextIdx !== -1) { end = nextIdx; break }
    }

    const content = remaining.substring(idx + label.length, end).trim()
    if (content) {
      const key = label.replace(':', '')
      const isList = key === 'Behavior Rules'
      const items = isList
        ? content.split('\n').map(l => l.replace(/^-\s*/, '').trim()).filter(Boolean)
        : null
      sections.push({ label: key, content, isList, items })
    }
  }

  // Fallback: if no sections parsed, show raw text
  if (sections.length === 0 && raw.trim()) {
    sections.push({ label: null, content: raw.trim(), isList: false, items: null })
  }

  return sections
})

const kpiList = computed(() => {
  const defs = template.value?.kpi_definitions
  if (!defs || !Array.isArray(defs)) return []
  return defs.map(k => typeof k === 'string' ? k : (k.key || k.name || k))
})

const handleInstall = () => {
  router.push(`/marketplace/${route.params.id}/install`)
}
</script>

<template>
  <div class="max-w-4xl mx-auto">
    <!-- Loading skeleton -->
    <div v-if="loading" class="space-y-6">
      <div class="h-4 bg-eval-surface rounded w-32 animate-pulse"></div>
      <div class="glass-card p-6 animate-pulse">
        <div class="h-6 bg-eval-surface rounded w-2/3 mb-2"></div>
        <div class="h-4 bg-eval-surface rounded w-1/2 mb-4"></div>
        <div class="flex gap-2 mb-4">
          <div class="h-6 bg-eval-surface rounded w-20"></div>
          <div class="h-6 bg-eval-surface rounded w-20"></div>
        </div>
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
        to="/marketplace"
        class="inline-flex items-center gap-1.5 text-text-muted hover:text-text-secondary transition-colors text-sm mb-6"
      >
        <ArrowLeftIcon class="w-4 h-4" />
        Back to Marketplace
      </RouterLink>

      <!-- Template header -->
      <div class="glass-card p-6 mb-6">
        <div class="flex items-start justify-between gap-4 mb-4">
          <div class="min-w-0 flex-1">
            <h1 class="text-2xl font-bold text-text-primary mb-1">{{ template.name }}</h1>
            <p class="text-text-secondary text-sm">{{ template.role }}</p>
          </div>
          <CheckBadgeIcon
            v-if="template.is_official"
            class="w-8 h-8 text-accent shrink-0"
            title="Official template"
          />
        </div>

        <!-- Badges -->
        <div class="flex items-center gap-2 flex-wrap mb-4">
          <span
            :class="[getCategoryColor(template.category), getCategoryBgColor(template.category)]"
            class="inline-flex items-center text-xs px-2 py-0.5 rounded-full border font-medium"
          >
            {{ template.category }}
          </span>
          <span v-if="template.is_official" class="px-2 py-0.5 bg-accent/20 text-accent text-xs rounded-full border border-accent/30 font-medium">
            Official
          </span>
        </div>

        <!-- Stats row -->
        <div class="flex items-center gap-4 text-text-muted text-sm mb-4">
          <span class="flex items-center gap-1.5">
            <ArrowDownTrayIcon class="w-4 h-4" />
            {{ template.install_count || 0 }} installs
          </span>
          <span v-if="template.avg_rating" class="flex items-center gap-1">
            <StarSolidIcon class="w-4 h-4 text-accent" />
            {{ template.avg_rating.toFixed(1) }} rating
          </span>
          <span v-if="template.review_count">
            ({{ template.review_count }} {{ template.review_count === 1 ? 'review' : 'reviews' }})
          </span>
        </div>

        <!-- Install CTA -->
        <button
          @click="handleInstall"
          class="w-full md:w-auto px-6 py-2.5 bg-accent hover:bg-accent-hover rounded-lg text-white font-medium transition-colors"
        >
          Install to Your Company
        </button>
      </div>

      <!-- Description -->
      <section v-if="template.description" class="glass-card p-5 mb-6">
        <h2 class="text-sm font-semibold text-text-primary mb-3">Description</h2>
        <p class="text-text-secondary text-sm leading-relaxed">{{ template.description }}</p>
      </section>

      <!-- Persona preview -->
      <section v-if="template.persona" class="glass-card p-5 mb-6">
        <button
          @click="showPersona = !showPersona"
          :aria-expanded="showPersona"
          class="flex items-center justify-between w-full text-left"
        >
          <h2 class="text-sm font-semibold text-text-primary">Persona Preview</h2>
          <ChevronDownIcon
            class="w-5 h-5 text-text-muted transition-transform duration-200"
            :class="{ 'rotate-180': showPersona }"
          />
        </button>

        <div v-if="showPersona" class="mt-4 p-4 bg-eval-surface rounded-lg space-y-4">
          <div v-for="(section, idx) in personaSections" :key="idx">
            <!-- Section label -->
            <div v-if="section.label" class="text-[11px] font-semibold uppercase tracking-wider text-accent mb-1.5">
              {{ section.label }}
            </div>

            <!-- Bullet list for behavior rules -->
            <ul v-if="section.isList" class="space-y-1.5 pl-0">
              <li
                v-for="(item, i) in section.items"
                :key="i"
                class="text-text-secondary text-sm leading-relaxed flex gap-2"
              >
                <span class="text-accent shrink-0 mt-0.5">&#8226;</span>
                <span>{{ item }}</span>
              </li>
            </ul>

            <!-- Inline text for other sections -->
            <p v-else class="text-text-secondary text-sm leading-relaxed">{{ section.content }}</p>
          </div>
        </div>
      </section>

      <!-- KPI definitions -->
      <section v-if="kpiList.length > 0" class="glass-card p-5 mb-6">
        <h2 class="text-sm font-semibold text-text-primary mb-3">Role KPIs</h2>
        <ul class="space-y-2">
          <li
            v-for="(kpi, idx) in kpiList"
            :key="idx"
            class="text-text-secondary text-sm flex gap-2"
          >
            <span class="text-accent shrink-0 mt-0.5">&#8226;</span>
            <span>{{ kpi }}</span>
          </li>
        </ul>
      </section>

      <!-- Tags -->
      <section v-if="template.tags?.length" class="glass-card p-5 mb-6">
        <h2 class="text-sm font-semibold text-text-primary mb-3">Tags</h2>
        <div class="flex flex-wrap gap-2">
          <span
            v-for="tag in template.tags"
            :key="tag"
            class="px-3 py-1 bg-eval-surface text-text-secondary text-sm rounded-full border border-eval-border"
          >
            {{ tag }}
          </span>
        </div>
      </section>

      <!-- Reviews section (placeholder) -->
      <section v-if="template.review_count > 0" class="glass-card p-5">
        <h2 class="text-sm font-semibold text-text-primary mb-3">
          Reviews ({{ template.review_count }})
        </h2>
        <div class="text-text-muted text-sm py-8 text-center">
          Reviews coming soon
        </div>
      </section>
    </template>
  </div>
</template>
