<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { getMarketplaceTemplates } from '@/services/api'
import { useToast } from '@/composables/useToast'
import {
  MagnifyingGlassIcon,
  ArrowDownIcon,
  CheckBadgeIcon,
  StarIcon
} from '@heroicons/vue/24/outline'
import { StarIcon as StarSolidIcon } from '@heroicons/vue/24/solid'

const router = useRouter()
const route = useRoute()
const toast = useToast()

const templates = ref([])
const loading = ref(false)
const total = ref(0)
const offset = ref(0)
const limit = 24

// Filters from URL query params
const search = ref(route.query.q || '')
const category = ref(route.query.category || 'all')
const sort = ref(route.query.sort || 'installs')

const categories = [
  { value: 'all', label: 'All' },
  { value: 'development', label: 'Development' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'operations', label: 'Operations' },
  { value: 'sales', label: 'Sales' },
  { value: 'custom', label: 'Custom' }
]

const sortOptions = [
  { value: 'installs', label: 'Most Installed' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'newest', label: 'Newest' }
]

const loadTemplates = async (append = false) => {
  loading.value = true
  try {
    const params = {
      limit,
      offset: append ? offset.value : 0
    }
    if (search.value) params.search = search.value
    if (category.value !== 'all') params.category = category.value
    if (sort.value) params.sort = sort.value

    const data = await getMarketplaceTemplates(params)

    if (append) {
      templates.value = [...templates.value, ...(data.templates || [])]
    } else {
      templates.value = data.templates || []
      offset.value = 0
    }

    total.value = data.total || 0
  } catch (e) {
    toast.error('Failed to load templates: ' + e.message)
  } finally {
    loading.value = false
  }
}

const loadMore = () => {
  offset.value += limit
  loadTemplates(true)
}

const hasMore = computed(() => templates.value.length < total.value)

const updateUrl = () => {
  const query = {}
  if (search.value) query.q = search.value
  if (category.value !== 'all') query.category = category.value
  if (sort.value !== 'installs') query.sort = sort.value
  router.replace({ query })
}

const handleSearch = () => {
  updateUrl()
  loadTemplates()
}

const handleCategoryChange = (newCategory) => {
  category.value = newCategory
  updateUrl()
  loadTemplates()
}

const handleSortChange = (e) => {
  sort.value = e.target.value
  updateUrl()
  loadTemplates()
}

const navigateToTemplate = (templateId) => {
  router.push(`/marketplace/${templateId}`)
}

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

onMounted(() => {
  loadTemplates()
})
</script>

<template>
  <div class="max-w-7xl mx-auto">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-text-primary mb-2">Agent Marketplace</h1>
      <p class="text-text-secondary">Browse and install pre-built agent templates</p>
    </div>

    <!-- Search and filters -->
    <div class="glass-card p-5 mb-6">
      <!-- Search bar -->
      <div class="relative mb-4">
        <MagnifyingGlassIcon class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted pointer-events-none" />
        <input
          v-model="search"
          type="text"
          placeholder="Search templates..."
          @keyup.enter="handleSearch"
          class="w-full pl-10 pr-3 py-2.5 bg-eval-surface border border-eval-border rounded-lg text-text-primary placeholder-text-muted focus:border-accent focus:outline-none"
        />
      </div>

      <!-- Category pills -->
      <div class="flex flex-wrap gap-2 mb-4">
        <button
          v-for="cat in categories"
          :key="cat.value"
          @click="handleCategoryChange(cat.value)"
          :class="[
            category === cat.value
              ? 'bg-accent/20 text-accent border-accent/30'
              : 'bg-eval-surface text-text-muted border-eval-border hover:text-text-secondary'
          ]"
          class="px-3 py-1.5 rounded-full border text-sm font-medium transition-colors"
        >
          {{ cat.label }}
        </button>
      </div>

      <!-- Sort dropdown -->
      <div class="flex items-center justify-between gap-3">
        <div class="text-text-muted text-sm">
          {{ total }} {{ total === 1 ? 'template' : 'templates' }} found
        </div>
        <div class="flex items-center gap-2">
          <label for="sort" class="text-text-muted text-sm">Sort by:</label>
          <div class="relative">
            <select
              id="sort"
              v-model="sort"
              @change="handleSortChange"
              class="appearance-none px-3 py-1.5 pr-8 bg-eval-surface border border-eval-border rounded-lg text-text-primary text-sm focus:border-accent focus:outline-none cursor-pointer"
            >
              <option v-for="opt in sortOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
            <ArrowDownIcon class="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
          </div>
        </div>
      </div>
    </div>

    <!-- Loading skeleton -->
    <div v-if="loading && templates.length === 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      <div v-for="i in 6" :key="i" class="glass-card rounded-xl p-5 animate-pulse">
        <div class="h-4 bg-eval-surface rounded w-3/4 mb-2"></div>
        <div class="h-3 bg-eval-surface rounded w-1/2 mb-4"></div>
        <div class="h-3 bg-eval-surface rounded w-full mb-2"></div>
        <div class="h-3 bg-eval-surface rounded w-5/6 mb-4"></div>
        <div class="flex gap-3">
          <div class="h-3 bg-eval-surface rounded w-16"></div>
          <div class="h-3 bg-eval-surface rounded w-16"></div>
        </div>
      </div>
    </div>

    <!-- Template grid -->
    <div v-else-if="templates.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      <div
        v-for="template in templates"
        :key="template.id"
        @click="navigateToTemplate(template.id)"
        class="glass-card rounded-xl p-5 hover:border-accent/30 transition-all cursor-pointer"
      >
        <!-- Header -->
        <div class="flex items-start justify-between mb-3">
          <div class="min-w-0 flex-1">
            <h3 class="text-text-primary font-semibold truncate">{{ template.name }}</h3>
            <p class="text-text-muted text-sm truncate">{{ template.role }}</p>
          </div>
          <CheckBadgeIcon
            v-if="template.is_official"
            class="w-5 h-5 text-accent shrink-0 ml-2"
            title="Official template"
          />
        </div>

        <!-- Description -->
        <p class="text-text-secondary text-sm line-clamp-2 mb-3 leading-relaxed">
          {{ template.description }}
        </p>

        <!-- Stats -->
        <div class="flex items-center gap-3 text-text-muted text-xs mb-3">
          <span>{{ template.install_count || 0 }} installs</span>
          <span v-if="template.avg_rating" class="flex items-center gap-0.5">
            <StarSolidIcon class="w-3 h-3 text-accent" />
            {{ template.avg_rating.toFixed(1) }}
          </span>
        </div>

        <!-- Category badge -->
        <div class="flex items-center gap-2">
          <span
            :class="[getCategoryColor(template.category), getCategoryBgColor(template.category)]"
            class="inline-flex items-center text-xs px-2 py-0.5 rounded-full border font-medium"
          >
            {{ template.category }}
          </span>
        </div>

        <!-- Tags -->
        <div v-if="template.tags?.length" class="flex flex-wrap gap-1 mt-3">
          <span
            v-for="tag in template.tags.slice(0, 3)"
            :key="tag"
            class="px-2 py-0.5 bg-eval-surface text-text-muted text-xs rounded-full"
          >
            {{ tag }}
          </span>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else-if="!loading" class="glass-card p-12 text-center">
      <p class="text-text-muted mb-3">No templates found</p>
      <button
        @click="() => { search = ''; category = 'all'; handleSearch() }"
        class="text-accent hover:text-accent-hover text-sm transition-colors"
      >
        Clear filters
      </button>
    </div>

    <!-- Load more button -->
    <div v-if="hasMore && !loading" class="text-center mt-8">
      <button
        @click="loadMore"
        class="px-6 py-2.5 bg-eval-card hover:bg-eval-surface border border-eval-border rounded-lg text-text-secondary hover:text-text-primary transition-colors font-medium"
      >
        Load more
      </button>
    </div>

    <!-- Loading more indicator -->
    <div v-if="loading && templates.length > 0" class="text-center mt-8">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
    </div>
  </div>
</template>
