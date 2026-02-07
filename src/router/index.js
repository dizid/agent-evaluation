import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'landing',
    component: () => import('../views/Landing.vue')
  },
  {
    path: '/browse',
    name: 'browse',
    component: () => import('../views/Browse.vue')
  },
  {
    path: '/agent/:id',
    name: 'agent-detail',
    component: () => import('../views/AgentDetail.vue')
  },
  {
    path: '/leaderboard',
    name: 'leaderboard',
    component: () => import('../views/Leaderboard.vue')
  },
  {
    path: '/evaluate',
    name: 'evaluate',
    component: () => import('../views/Evaluate.vue')
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('../views/NotFound.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Auto-reload on stale chunks after deploy (new build = new hashes)
router.onError((error, to) => {
  if (error.message.includes('Failed to fetch dynamically imported module') ||
      error.message.includes('Importing a module script failed')) {
    window.location.href = to.fullPath
  }
})

export default router
