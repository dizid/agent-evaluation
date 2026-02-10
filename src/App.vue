<script setup>
import { watch, computed, onMounted } from 'vue'
import { RouterLink, RouterView, useRouter, useRoute } from 'vue-router'
import { useAuth, useUser, SignedIn, SignedOut } from '@clerk/vue'
import ToastContainer from './components/ui/ToastContainer.vue'
import { setAuthProvider, clearAllCache } from './services/api.js'
import { useOrgContext } from './composables/useOrgContext.js'

const router = useRouter()
const route = useRoute()
const { isLoaded, isSignedIn, getToken } = useAuth()
const { user } = useUser()
const {
  currentOrg,
  userOrgs,
  orgSlug,
  canManageAgents,
  setTokenGetter,
  fetchOrgs,
  switchOrg,
  clearOrg
} = useOrgContext()

// Wire up auth provider for API client
const getTokenFn = async () => {
  try {
    return await getToken.value()
  } catch {
    return null
  }
}
setAuthProvider(getTokenFn, () => orgSlug.value)
setTokenGetter(getTokenFn)

// When auth state changes, fetch orgs
watch(isSignedIn, async (signedIn) => {
  if (signedIn) {
    await fetchOrgs()
  } else {
    clearOrg()
    clearAllCache()
  }
}, { immediate: false })

// On mount, if already signed in, fetch orgs
onMounted(async () => {
  if (isLoaded.value && isSignedIn.value) {
    await fetchOrgs()
  }
})

// Auth guard — redirect to sign-in for protected routes
watch([isLoaded, isSignedIn, () => route.path], ([loaded, signedIn]) => {
  if (!loaded) return
  if (!signedIn && !route.meta.public) {
    router.replace({ name: 'sign-in', query: { redirect: route.fullPath } })
  }
})

// Org switcher
const showOrgMenu = computed(() => userOrgs.value.length > 1)

function handleOrgSwitch(slug) {
  switchOrg(slug)
  clearAllCache()
  router.go(0)
}

// User menu
const userName = computed(() =>
  user.value?.firstName ||
  user.value?.emailAddresses?.[0]?.emailAddress?.split('@')[0] ||
  'User'
)
const userAvatar = computed(() => user.value?.imageUrl || null)
</script>

<template>
  <div class="min-h-screen bg-eval-bg">
    <!-- Loading screen while Clerk initializes -->
    <div v-if="!isLoaded" class="flex items-center justify-center min-h-screen">
      <div class="text-center">
        <div class="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p class="text-text-muted text-sm">Loading...</p>
      </div>
    </div>

    <template v-else>
      <!-- Navigation -->
      <nav class="glass sticky top-0 z-50 px-4 py-3">
        <div class="max-w-6xl mx-auto flex items-center justify-between">
          <!-- Logo + org name -->
          <div class="flex items-center gap-3">
            <RouterLink to="/" class="flex items-center gap-2">
              <span class="text-xl font-bold text-accent">AgentEval</span>
            </RouterLink>
            <!-- Org badge (authenticated only) -->
            <SignedIn>
              <div v-if="currentOrg" class="hidden sm:flex items-center gap-1.5">
                <span class="text-text-muted">/</span>
                <div class="relative group">
                  <button
                    class="text-sm text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1"
                  >
                    {{ currentOrg.name }}
                    <svg v-if="showOrgMenu" class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <!-- Org switcher dropdown -->
                  <div v-if="showOrgMenu" class="hidden group-hover:block absolute top-full left-0 mt-1 w-48 glass-card rounded-lg py-1 shadow-lg z-50">
                    <button
                      v-for="org in userOrgs"
                      :key="org.slug"
                      @click="handleOrgSwitch(org.slug)"
                      class="w-full text-left px-3 py-2 text-sm hover:bg-white/5 transition-colors"
                      :class="org.slug === currentOrg?.slug ? 'text-accent' : 'text-text-secondary'"
                    >
                      {{ org.name }}
                    </button>
                  </div>
                </div>
              </div>
            </SignedIn>
          </div>

          <!-- Nav links -->
          <div class="flex items-center gap-4 text-sm">
            <!-- Authenticated nav -->
            <SignedIn>
              <RouterLink
                to="/dashboard"
                class="hidden sm:inline text-text-secondary hover:text-text-primary transition-colors"
                active-class="text-text-primary"
              >Dashboard</RouterLink>
              <RouterLink
                to="/browse"
                class="text-text-secondary hover:text-text-primary transition-colors"
                active-class="text-text-primary"
              >Browse</RouterLink>
              <RouterLink
                to="/leaderboard"
                class="hidden sm:inline text-text-secondary hover:text-text-primary transition-colors"
                active-class="text-text-primary"
              >Leaderboard</RouterLink>
              <RouterLink
                to="/marketplace"
                class="text-text-secondary hover:text-text-primary transition-colors"
                active-class="text-text-primary"
              >Marketplace</RouterLink>
              <RouterLink
                v-if="canManageAgents"
                to="/manage"
                class="hidden sm:inline text-text-secondary hover:text-text-primary transition-colors"
                active-class="text-text-primary"
              >Manage</RouterLink>
              <RouterLink
                to="/evaluate"
                class="px-3 py-1.5 bg-accent hover:bg-accent-hover rounded-lg text-white text-sm transition-colors"
              >Evaluate</RouterLink>

              <!-- User menu -->
              <div class="relative group ml-2">
                <button class="flex items-center gap-2 hover:opacity-80 transition-opacity">
                  <img
                    v-if="userAvatar"
                    :src="userAvatar"
                    :alt="userName"
                    class="w-7 h-7 rounded-full border border-eval-border"
                  />
                  <div v-else class="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center text-accent text-xs font-bold">
                    {{ userName.charAt(0).toUpperCase() }}
                  </div>
                </button>
                <!-- User dropdown -->
                <div class="hidden group-hover:block absolute top-full right-0 mt-1 w-48 glass-card rounded-lg py-1 shadow-lg z-50">
                  <div class="px-3 py-2 border-b border-eval-border">
                    <p class="text-sm text-text-primary font-medium truncate">{{ userName }}</p>
                    <p v-if="currentOrg" class="text-xs text-text-muted truncate">{{ currentOrg.name }}</p>
                  </div>
                  <RouterLink to="/profile" class="block px-3 py-2 text-sm text-text-secondary hover:bg-white/5 transition-colors">Profile</RouterLink>
                  <RouterLink to="/settings" class="block px-3 py-2 text-sm text-text-secondary hover:bg-white/5 transition-colors">Settings</RouterLink>
                  <div class="border-t border-eval-border mt-1 pt-1">
                    <RouterLink to="/sign-in" class="block px-3 py-2 text-sm text-red-400 hover:bg-white/5 transition-colors">Sign Out</RouterLink>
                  </div>
                </div>
              </div>
            </SignedIn>

            <!-- Public nav -->
            <SignedOut>
              <RouterLink
                to="/marketplace"
                class="text-text-secondary hover:text-text-primary transition-colors"
                active-class="text-text-primary"
              >Marketplace</RouterLink>
              <RouterLink
                to="/pricing"
                class="text-text-secondary hover:text-text-primary transition-colors"
                active-class="text-text-primary"
              >Pricing</RouterLink>
              <RouterLink
                to="/sign-in"
                class="text-text-secondary hover:text-text-primary transition-colors"
              >Sign In</RouterLink>
              <RouterLink
                to="/sign-up"
                class="px-3 py-1.5 bg-accent hover:bg-accent-hover rounded-lg text-white text-sm transition-colors"
              >Get Started</RouterLink>
            </SignedOut>
          </div>
        </div>
      </nav>

      <!-- Main content with route transitions -->
      <main class="max-w-6xl mx-auto px-4 py-6">
        <RouterView v-slot="{ Component }">
          <Transition name="page" mode="out-in">
            <component :is="Component" />
          </Transition>
        </RouterView>
      </main>

      <!-- Footer -->
      <footer class="border-t border-eval-border mt-12 py-6 px-4">
        <div class="max-w-6xl mx-auto text-center text-text-muted text-xs">
          AgentEval — AI Agent Evaluation & Marketplace
        </div>
      </footer>

      <!-- Toast notifications -->
      <ToastContainer />
    </template>
  </div>
</template>

<style>
.page-enter-active,
.page-leave-active {
  transition: opacity 0.2s ease;
}
.page-enter-from,
.page-leave-to {
  opacity: 0;
}
</style>
