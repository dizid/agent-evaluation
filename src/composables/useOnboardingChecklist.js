import { ref, computed, watch, isRef } from 'vue'

const STORAGE_PREFIX = 'onboarding_'

/**
 * Onboarding checklist composable.
 *
 * Tracks 3 user milestones per org, persisted in localStorage.
 * Auto-detects completion from dashboard stats when provided.
 *
 * @param {Ref<string>|string} orgSlug - The org slug (plain string or computed ref)
 * @param {Ref<object>|null}   stats   - Optional reactive stats object from dashboard
 */
export function useOnboardingChecklist(orgSlug, stats = null) {
  // Resolve the slug string from a ref or plain value
  const getSlug = () => (isRef(orgSlug) ? orgSlug.value : orgSlug) || 'default'

  const storageKey = () => `${STORAGE_PREFIX}${getSlug()}`

  // Default state shape
  const defaultState = () => ({
    browsed_marketplace: false,
    installed_agent: false,
    submitted_evaluation: false,
    dismissed: false
  })

  // Read from localStorage — returns the merged state object
  function readStorage() {
    try {
      const raw = localStorage.getItem(storageKey())
      if (!raw) return defaultState()
      return { ...defaultState(), ...JSON.parse(raw) }
    } catch {
      return defaultState()
    }
  }

  // Write the current state back to localStorage
  function writeStorage(state) {
    try {
      localStorage.setItem(storageKey(), JSON.stringify(state))
    } catch {
      // localStorage may be unavailable (private mode, storage full)
    }
  }

  // Reactive state loaded from storage
  const checklistState = ref(readStorage())

  // Re-read storage whenever the org slug changes (org switch)
  const slugWatchSource = isRef(orgSlug) ? orgSlug : ref(orgSlug)
  watch(slugWatchSource, () => {
    checklistState.value = readStorage()
  })

  // Auto-detect completion from dashboard stats
  if (stats !== null) {
    watch(
      stats,
      (newStats) => {
        if (!newStats) return
        let changed = false

        if (newStats.active_agents > 0 && !checklistState.value.installed_agent) {
          checklistState.value.installed_agent = true
          changed = true
        }

        if (newStats.total_evaluations > 0 && !checklistState.value.submitted_evaluation) {
          checklistState.value.submitted_evaluation = true
          changed = true
        }

        if (changed) {
          writeStorage(checklistState.value)
        }
      },
      { immediate: true }
    )
  }

  // Visible when NOT dismissed AND at least one step is still incomplete
  const isChecklistVisible = computed(() => {
    if (checklistState.value.dismissed) return false
    const { browsed_marketplace, installed_agent, submitted_evaluation } = checklistState.value
    return !browsed_marketplace || !installed_agent || !submitted_evaluation
  })

  /**
   * Mark a step as complete and persist.
   * @param {'browsed_marketplace'|'installed_agent'|'submitted_evaluation'} key
   */
  function completeStep(key) {
    if (!(key in checklistState.value)) return
    if (checklistState.value[key]) return // already done — skip write
    checklistState.value[key] = true
    writeStorage(checklistState.value)
  }

  /**
   * Permanently hide the checklist for this org.
   */
  function dismissChecklist() {
    checklistState.value.dismissed = true
    writeStorage(checklistState.value)
  }

  return {
    checklistState,
    isChecklistVisible,
    completeStep,
    dismissChecklist
  }
}
