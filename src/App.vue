<script setup>
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div class="min-h-screen bg-eval-bg">
    <!-- Navigation -->
    <nav class="glass sticky top-0 z-50 px-4 py-3">
      <div class="max-w-6xl mx-auto flex items-center justify-between">
        <RouterLink to="/" class="flex items-center gap-2">
          <span class="text-xl font-bold text-accent">AgentEval</span>
        </RouterLink>
        <div class="flex items-center gap-4 text-sm">
          <RouterLink
            to="/browse"
            class="text-text-secondary hover:text-text-primary transition-colors"
            active-class="text-text-primary"
          >Browse</RouterLink>
          <RouterLink
            to="/leaderboard"
            class="text-text-secondary hover:text-text-primary transition-colors"
            active-class="text-text-primary"
          >Leaderboard</RouterLink>
          <RouterLink
            to="/evaluate"
            class="px-3 py-1.5 bg-accent hover:bg-accent-hover rounded-lg text-white text-sm transition-colors"
          >Evaluate</RouterLink>
        </div>
      </div>
    </nav>

    <!-- Main content -->
    <main class="max-w-6xl mx-auto px-4 py-6">
      <RouterView />
    </main>

    <!-- Footer -->
    <footer class="border-t border-eval-border mt-12 py-6 px-4">
      <div class="max-w-6xl mx-auto text-center text-text-muted text-xs">
        AgentEval — Standardized AI Agent Evaluation
      </div>
    </footer>
  </div>
</template>
