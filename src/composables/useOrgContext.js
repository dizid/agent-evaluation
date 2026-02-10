import { ref, computed, watch } from 'vue'

// Shared org state (singleton across all component instances)
const currentOrg = ref(null)
const userOrgs = ref([])
const loading = ref(false)
const initialized = ref(false)

// Store getToken function reference from auth context
let _getToken = null

/**
 * Organization context composable — manages current org selection
 * and provides role-based permission checks.
 *
 * Usage:
 *   const { currentOrg, userRole, canManageAgents, switchOrg } = useOrgContext()
 */
export function useOrgContext() {
  const userRole = computed(() => currentOrg.value?.role || null)

  const canView = computed(() =>
    ['viewer', 'evaluator', 'admin', 'owner'].includes(userRole.value)
  )
  const canEvaluate = computed(() =>
    ['evaluator', 'admin', 'owner'].includes(userRole.value)
  )
  const canManageAgents = computed(() =>
    ['admin', 'owner'].includes(userRole.value)
  )
  const canManageTeam = computed(() =>
    ['admin', 'owner'].includes(userRole.value)
  )
  const isOwner = computed(() => userRole.value === 'owner')

  const orgSlug = computed(() => currentOrg.value?.slug || '')

  // Initialize with auth token getter
  function setTokenGetter(getToken) {
    _getToken = getToken
  }

  // Fetch user's organizations from API
  async function fetchOrgs() {
    if (!_getToken) return
    loading.value = true
    try {
      const token = await _getToken()
      if (!token) return

      const res = await fetch('/api/organizations', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      if (!res.ok) return

      const data = await res.json()
      userOrgs.value = data.organizations || []

      // Restore saved org or default to first
      const savedSlug = localStorage.getItem('current_org_slug')
      const savedOrg = savedSlug
        ? userOrgs.value.find(o => o.slug === savedSlug)
        : null
      currentOrg.value = savedOrg || userOrgs.value[0] || null

      if (currentOrg.value) {
        localStorage.setItem('current_org_slug', currentOrg.value.slug)
      }
      initialized.value = true
    } catch (err) {
      console.error('Failed to fetch organizations:', err)
    } finally {
      loading.value = false
    }
  }

  // Switch to a different org
  function switchOrg(slug) {
    const org = userOrgs.value.find(o => o.slug === slug)
    if (org) {
      currentOrg.value = org
      localStorage.setItem('current_org_slug', slug)
    }
  }

  // Clear state on logout
  function clearOrg() {
    currentOrg.value = null
    userOrgs.value = []
    initialized.value = false
    localStorage.removeItem('current_org_slug')
  }

  return {
    currentOrg,
    userOrgs,
    userRole,
    orgSlug,
    loading,
    initialized,
    canView,
    canEvaluate,
    canManageAgents,
    canManageTeam,
    isOwner,
    setTokenGetter,
    fetchOrgs,
    switchOrg,
    clearOrg
  }
}
