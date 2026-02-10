import { ref, computed, watch } from 'vue'
import { useAuth, useUser } from '@clerk/vue'

// Shared auth state (singleton across all component instances)
const isReady = ref(false)
const authError = ref(null)

/**
 * Auth context composable — wraps Clerk's auth state and provides
 * session token access for API calls.
 *
 * Usage:
 *   const { isAuthenticated, user, getToken } = useAuthContext()
 */
export function useAuthContext() {
  const { isLoaded, isSignedIn, getToken: clerkGetToken, signOut: clerkSignOut } = useAuth()
  const { user } = useUser()

  const isAuthenticated = computed(() => isLoaded.value && isSignedIn.value)
  const isLoading = computed(() => !isLoaded.value)

  // Get session token for API calls
  async function getToken() {
    try {
      const token = await clerkGetToken.value()
      return token
    } catch (err) {
      authError.value = err.message
      return null
    }
  }

  // Sign out and clear local state
  async function signOut() {
    try {
      await clerkSignOut.value()
      localStorage.removeItem('current_org_slug')
    } catch (err) {
      console.error('Sign out failed:', err)
    }
  }

  // Mark ready when Clerk finishes loading
  watch(isLoaded, (loaded) => {
    if (loaded) isReady.value = true
  }, { immediate: true })

  return {
    isAuthenticated,
    isLoading,
    isReady,
    user,
    authError,
    getToken,
    signOut
  }
}
