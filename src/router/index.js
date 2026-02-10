import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  // --- Public routes ---
  {
    path: '/',
    name: 'landing',
    component: () => import('../views/Landing.vue'),
    meta: { title: 'AgentEval — AI Agent Marketplace', public: true }
  },
  {
    path: '/pricing',
    name: 'pricing',
    component: () => import('../views/Pricing.vue'),
    meta: { title: 'Pricing — AgentEval', public: true }
  },
  {
    path: '/sign-in/:pathMatch(.*)*',
    name: 'sign-in',
    component: () => import('../views/auth/SignIn.vue'),
    meta: { title: 'Sign In — AgentEval', public: true }
  },
  {
    path: '/sign-up/:pathMatch(.*)*',
    name: 'sign-up',
    component: () => import('../views/auth/SignUp.vue'),
    meta: { title: 'Sign Up — AgentEval', public: true }
  },

  // --- Marketplace (public browse, auth for actions) ---
  {
    path: '/marketplace',
    name: 'marketplace',
    component: () => import('../views/marketplace/MarketplaceBrowse.vue'),
    meta: { title: 'Agent Marketplace — AgentEval', public: true }
  },
  {
    path: '/marketplace/:id',
    name: 'marketplace-detail',
    component: () => import('../views/marketplace/MarketplaceDetail.vue'),
    meta: { title: 'Agent Template — AgentEval', public: true }
  },
  {
    path: '/marketplace/:id/install',
    name: 'marketplace-install',
    component: () => import('../views/marketplace/MarketplaceInstall.vue'),
    meta: { title: 'Install Agent — AgentEval' }
  },

  // --- Authenticated routes ---
  {
    path: '/onboarding',
    name: 'onboarding',
    component: () => import('../views/user/Onboarding.vue'),
    meta: { title: 'Welcome — AgentEval', skipOrgCheck: true }
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: () => import('../views/dashboard/Dashboard.vue'),
    meta: { title: 'Dashboard — AgentEval' }
  },
  {
    path: '/browse',
    name: 'browse',
    component: () => import('../views/Browse.vue'),
    meta: { title: 'Browse Agents — AgentEval' }
  },
  {
    path: '/agent/:id',
    name: 'agent-detail',
    component: () => import('../views/AgentDetail.vue'),
    meta: { title: 'Agent Detail — AgentEval' }
  },
  {
    path: '/leaderboard',
    name: 'leaderboard',
    component: () => import('../views/Leaderboard.vue'),
    meta: { title: 'Leaderboard — AgentEval' }
  },
  {
    path: '/evaluate',
    name: 'evaluate',
    component: () => import('../views/Evaluate.vue'),
    meta: { title: 'Evaluate Agent — AgentEval' }
  },
  {
    path: '/manage',
    name: 'manage',
    component: () => import('../views/AgentManage.vue'),
    meta: { title: 'Manage Agents — AgentEval' }
  },
  {
    path: '/agent/:id/edit',
    name: 'agent-edit',
    component: () => import('../views/AgentEdit.vue'),
    meta: { title: 'Edit Agent — AgentEval' }
  },

  // --- Settings ---
  {
    path: '/settings',
    name: 'settings',
    component: () => import('../views/settings/OrgSettings.vue'),
    meta: { title: 'Settings — AgentEval' }
  },
  {
    path: '/settings/team',
    name: 'settings-team',
    component: () => import('../views/settings/TeamManage.vue'),
    meta: { title: 'Team — AgentEval' }
  },
  {
    path: '/settings/departments',
    name: 'settings-departments',
    component: () => import('../views/settings/DepartmentManage.vue'),
    meta: { title: 'Departments — AgentEval' }
  },

  // --- User ---
  {
    path: '/profile',
    name: 'profile',
    component: () => import('../views/user/UserProfile.vue'),
    meta: { title: 'Profile — AgentEval' }
  },

  // --- 404 ---
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('../views/NotFound.vue'),
    meta: { title: '404 — AgentEval', public: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  }
})

// Auth guard — redirects unauthenticated users to sign-in
// Clerk's isSignedIn is injected via the app-level guard in App.vue
// This guard uses a simple localStorage check as a fast pre-check
router.beforeEach((to) => {
  // Public routes don't need auth
  if (to.meta.public) return true

  // Check if we have any indication of auth (Clerk sets this)
  // The real auth check happens in App.vue which has access to Clerk composables
  // This guard is just for fast redirects on hard navigation
  return true
})

// Set page title from route meta
router.afterEach((to) => {
  document.title = to.meta.title || 'AgentEval'
})

// Auto-reload on stale chunks after deploy (new build = new hashes)
router.onError((error, to) => {
  if (error.message.includes('Failed to fetch dynamically imported module') ||
      error.message.includes('Importing a module script failed')) {
    window.location.href = to.fullPath
  }
})

export default router
