import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'landing',
    component: () => import('../views/Landing.vue'),
    meta: { title: 'AgentEval — AI Agent Evaluation' }
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
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('../views/NotFound.vue'),
    meta: { title: '404 — AgentEval' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  }
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
