<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useOrgContext } from '@/composables/useOrgContext.js'

const { currentOrg, userOrgs } = useOrgContext()

const planTier = computed(() => currentOrg.value?.plan_tier || 'free')
const memberCount = computed(() => currentOrg.value?.member_count || 0)
const deptCount = computed(() => currentOrg.value?.department_count || 3)

function getPlanBadgeClass(tier) {
  const classes = {
    free: 'bg-gray-500/20 text-gray-300',
    pro: 'bg-accent/20 text-accent',
    enterprise: 'bg-yellow-500/20 text-yellow-300'
  }
  return classes[tier] || classes.free
}
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 py-8">
    <!-- Header -->
    <div class="mb-8">
      <div class="flex items-center justify-between mb-2">
        <h1 class="text-3xl font-bold text-text-primary">Organization Settings</h1>
        <span
          class="px-3 py-1 rounded-full text-sm font-semibold uppercase"
          :class="getPlanBadgeClass(planTier)"
        >
          {{ planTier }}
        </span>
      </div>
      <p class="text-text-secondary">{{ currentOrg?.name }}</p>
    </div>

    <!-- Settings grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Team Management -->
      <RouterLink
        to="/settings/team"
        class="glass-card p-6 hover:border-accent transition-colors block"
      >
        <div class="flex items-start justify-between mb-4">
          <div>
            <h3 class="text-xl font-semibold text-text-primary mb-2">Team Management</h3>
            <p class="text-text-secondary text-sm">Manage members, roles, and permissions</p>
          </div>
          <svg
            class="w-6 h-6 text-text-muted"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
        </div>
        <div class="flex items-center space-x-2">
          <span class="text-2xl font-bold text-text-primary">{{ memberCount }}</span>
          <span class="text-text-muted text-sm">team members</span>
        </div>
      </RouterLink>

      <!-- Departments -->
      <RouterLink
        to="/settings/departments"
        class="glass-card p-6 hover:border-accent transition-colors block"
      >
        <div class="flex items-start justify-between mb-4">
          <div>
            <h3 class="text-xl font-semibold text-text-primary mb-2">Departments</h3>
            <p class="text-text-secondary text-sm">Organize agents into departments</p>
          </div>
          <svg
            class="w-6 h-6 text-text-muted"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
        </div>
        <div class="flex items-center space-x-2">
          <span class="text-2xl font-bold text-text-primary">{{ deptCount }}</span>
          <span class="text-text-muted text-sm">departments</span>
        </div>
      </RouterLink>

      <!-- General (future) -->
      <div class="glass-card p-6 opacity-60 cursor-not-allowed">
        <div class="flex items-start justify-between mb-4">
          <div>
            <h3 class="text-xl font-semibold text-text-primary mb-2">General</h3>
            <p class="text-text-secondary text-sm">Organization name, slug, and branding</p>
          </div>
          <svg
            class="w-6 h-6 text-text-muted"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </div>
        <span class="text-text-muted text-sm">Coming soon</span>
      </div>

      <!-- Billing (future) -->
      <div class="glass-card p-6 opacity-60 cursor-not-allowed">
        <div class="flex items-start justify-between mb-4">
          <div>
            <h3 class="text-xl font-semibold text-text-primary mb-2">Billing</h3>
            <p class="text-text-secondary text-sm">Subscription, invoices, and payment methods</p>
          </div>
          <svg
            class="w-6 h-6 text-text-muted"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
            />
          </svg>
        </div>
        <span class="text-text-muted text-sm">Coming soon</span>
      </div>
    </div>
  </div>
</template>
