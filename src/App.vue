<script setup>
import { ref, watch, computed, onMounted } from 'vue'
import { RouterLink, RouterView, useRouter, useRoute } from 'vue-router'
import { useAuth, useUser, SignedIn, SignedOut } from '@clerk/vue'
import { Bars3Icon, XMarkIcon } from '@heroicons/vue/24/outline'
import ToastContainer from './components/ui/ToastContainer.vue'
import { setAuthProvider, clearAllCache } from './services/api.js'
import { useOrgContext } from './composables/useOrgContext.js'

const router = useRouter()
const route = useRoute()
const { isLoaded, isSignedIn, getToken } = useAuth()
const { user } = useUser()

// Safety timeout: if Clerk doesn't load within 12s, show error with retry
const clerkTimedOut = ref(false)
const loadTimer = setTimeout(() => {
  if (!isLoaded.value) clerkTimedOut.value = true
}, 12000)
watch(isLoaded, (loaded) => {
  if (loaded) { clearTimeout(loadTimer); clerkTimedOut.value = false }
})
function retryLoad() {
  clerkTimedOut.value = false
  window.location.reload()
}
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

// Mobile menu
const mobileMenuOpen = ref(false)

function closeMobileMenu() {
  mobileMenuOpen.value = false
}

// Close mobile menu on route change
watch(() => route.path, () => {
  mobileMenuOpen.value = false
})
</script>

<template>
  <div class="min-h-screen bg-eval-bg">
    <!-- Loading screen while Clerk initializes -->
    <div v-if="!isLoaded" class="flex items-center justify-center min-h-screen">
      <div class="text-center">
        <template v-if="clerkTimedOut">
          <p class="text-text-secondary text-sm mb-3">Taking longer than expected...</p>
          <button
            @click="retryLoad"
            class="px-4 py-2 bg-accent hover:bg-accent-hover rounded-lg text-white text-sm transition-colors"
          >Reload Page</button>
        </template>
        <template v-else>
          <div class="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p class="text-text-muted text-sm">Loading...</p>
        </template>
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
                  <div v-if="showOrgMenu" class="hidden group-hover:block absolute top-full left-0 pt-1 z-50">
                    <div class="w-48 glass-card rounded-lg py-1 shadow-lg">
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
                class="hidden sm:inline text-text-secondary hover:text-text-primary transition-colors"
                active-class="text-text-primary"
              >Browse</RouterLink>
              <RouterLink
                to="/leaderboard"
                class="hidden sm:inline text-text-secondary hover:text-text-primary transition-colors"
                active-class="text-text-primary"
              >Leaderboard</RouterLink>
              <RouterLink
                to="/marketplace"
                class="hidden sm:inline text-text-secondary hover:text-text-primary transition-colors"
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
                <div class="hidden group-hover:block absolute top-full right-0 pt-1 z-50">
                  <div class="w-48 glass-card rounded-lg py-1 shadow-lg">
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
              </div>
            </SignedIn>

            <!-- Mobile hamburger (authenticated) -->
            <SignedIn>
              <button
                @click="mobileMenuOpen = true"
                class="sm:hidden p-2 text-text-secondary hover:text-text-primary transition-colors"
                aria-label="Open menu"
              >
                <Bars3Icon class="w-6 h-6" />
              </button>
            </SignedIn>

            <!-- Public nav -->
            <SignedOut>
              <RouterLink
                to="/marketplace"
                class="hidden sm:inline text-text-secondary hover:text-text-primary transition-colors"
                active-class="text-text-primary"
              >Marketplace</RouterLink>
              <RouterLink
                to="/pricing"
                class="hidden sm:inline text-text-secondary hover:text-text-primary transition-colors"
                active-class="text-text-primary"
              >Pricing</RouterLink>
              <RouterLink
                to="/sign-in"
                class="hidden sm:inline text-text-secondary hover:text-text-primary transition-colors"
              >Sign In</RouterLink>
              <RouterLink
                to="/sign-up"
                class="px-3 py-1.5 bg-accent hover:bg-accent-hover rounded-lg text-white text-sm transition-colors"
              >Get Started</RouterLink>
              <!-- Mobile hamburger (public) -->
              <button
                @click="mobileMenuOpen = true"
                class="sm:hidden p-2 text-text-secondary hover:text-text-primary transition-colors"
                aria-label="Open menu"
              >
                <Bars3Icon class="w-6 h-6" />
              </button>
            </SignedOut>
          </div>
        </div>
      </nav>

      <!-- Mobile menu overlay (Teleported to body to avoid z-index issues) -->
      <Teleport to="body">
        <Transition
          enter-active-class="transition-opacity duration-200"
          enter-from-class="opacity-0"
          enter-to-class="opacity-100"
          leave-active-class="transition-opacity duration-200"
          leave-from-class="opacity-100"
          leave-to-class="opacity-0"
        >
          <div v-if="mobileMenuOpen" class="fixed inset-0 z-50 sm:hidden">
            <!-- Backdrop -->
            <div class="absolute inset-0 bg-black/50" @click="closeMobileMenu"></div>

            <!-- Slide-in panel from right -->
            <div class="absolute right-0 top-0 h-full w-72 max-w-[85vw] bg-eval-bg border-l border-eval-border shadow-xl overflow-y-auto">
              <!-- Panel header -->
              <div class="flex items-center justify-between p-4 border-b border-eval-border">
                <div>
                  <span class="text-accent font-bold">AgentEval</span>
                  <SignedIn>
                    <p v-if="currentOrg" class="text-text-muted text-xs mt-0.5">{{ currentOrg.name }}</p>
                  </SignedIn>
                </div>
                <button
                  @click="closeMobileMenu"
                  class="p-2 text-text-muted hover:text-text-primary transition-colors"
                  aria-label="Close menu"
                >
                  <XMarkIcon class="w-5 h-5" />
                </button>
              </div>

              <!-- Authenticated links -->
              <SignedIn>
                <nav class="py-2">
                  <RouterLink
                    to="/dashboard"
                    @click="closeMobileMenu"
                    class="block px-4 py-3 text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors"
                    active-class="text-accent"
                  >Dashboard</RouterLink>
                  <RouterLink
                    to="/browse"
                    @click="closeMobileMenu"
                    class="block px-4 py-3 text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors"
                    active-class="text-accent"
                  >Browse Agents</RouterLink>
                  <RouterLink
                    to="/leaderboard"
                    @click="closeMobileMenu"
                    class="block px-4 py-3 text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors"
                    active-class="text-accent"
                  >Leaderboard</RouterLink>
                  <RouterLink
                    to="/marketplace"
                    @click="closeMobileMenu"
                    class="block px-4 py-3 text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors"
                    active-class="text-accent"
                  >Marketplace</RouterLink>
                  <RouterLink
                    v-if="canManageAgents"
                    to="/manage"
                    @click="closeMobileMenu"
                    class="block px-4 py-3 text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors"
                    active-class="text-accent"
                  >Manage Agents</RouterLink>
                  <RouterLink
                    to="/evaluate"
                    @click="closeMobileMenu"
                    class="block px-4 py-3 text-accent font-medium hover:bg-accent/10 transition-colors"
                  >Evaluate Agent</RouterLink>

                  <div class="border-t border-eval-border my-2"></div>

                  <RouterLink
                    to="/profile"
                    @click="closeMobileMenu"
                    class="block px-4 py-3 text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors"
                    active-class="text-accent"
                  >Profile</RouterLink>
                  <RouterLink
                    to="/settings"
                    @click="closeMobileMenu"
                    class="block px-4 py-3 text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors"
                    active-class="text-accent"
                  >Settings</RouterLink>

                  <div class="border-t border-eval-border my-2"></div>

                  <RouterLink
                    to="/sign-in"
                    @click="closeMobileMenu"
                    class="block px-4 py-3 text-red-400 hover:bg-white/5 transition-colors"
                  >Sign Out</RouterLink>
                </nav>
              </SignedIn>

              <!-- Public links -->
              <SignedOut>
                <nav class="py-2">
                  <RouterLink
                    to="/marketplace"
                    @click="closeMobileMenu"
                    class="block px-4 py-3 text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors"
                    active-class="text-accent"
                  >Marketplace</RouterLink>
                  <RouterLink
                    to="/pricing"
                    @click="closeMobileMenu"
                    class="block px-4 py-3 text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors"
                    active-class="text-accent"
                  >Pricing</RouterLink>

                  <div class="border-t border-eval-border my-2"></div>

                  <RouterLink
                    to="/sign-in"
                    @click="closeMobileMenu"
                    class="block px-4 py-3 text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors"
                  >Sign In</RouterLink>
                  <RouterLink
                    to="/sign-up"
                    @click="closeMobileMenu"
                    class="block px-4 py-3 text-accent font-medium hover:bg-accent/10 transition-colors"
                  >Get Started</RouterLink>
                </nav>
              </SignedOut>
            </div>
          </div>
        </Transition>
      </Teleport>

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
