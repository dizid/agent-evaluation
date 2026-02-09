<script setup>
import {
  MagnifyingGlassIcon,
  TrophyIcon,
  HomeIcon,
} from '@heroicons/vue/24/outline'
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
    <!-- Glitchy 404 -->
    <div class="glitch-wrapper mb-6">
      <h1 class="glitch text-8xl sm:text-9xl font-black tracking-tighter text-text-primary" data-text="404">404</h1>
    </div>

    <p class="text-text-secondary text-lg mb-2">Agent not found in the registry.</p>
    <p class="text-text-muted text-sm mb-8">They might have been fired.</p>

    <!-- Navigation links -->
    <div class="glass-card p-5 w-full max-w-sm space-y-3">
      <p class="text-text-muted text-xs uppercase tracking-wider mb-3">Where to next?</p>

      <RouterLink
        to="/browse"
        class="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group"
      >
        <div class="p-2 rounded-lg bg-accent-soft group-hover:bg-accent/25 transition-colors">
          <MagnifyingGlassIcon class="w-5 h-5 text-accent" />
        </div>
        <div class="text-left">
          <div class="text-sm font-medium text-text-primary">Browse Agents</div>
          <div class="text-xs text-text-muted">Find a specific agent</div>
        </div>
      </RouterLink>

      <RouterLink
        to="/leaderboard"
        class="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group"
      >
        <div class="p-2 rounded-lg bg-score-elite/15 group-hover:bg-score-elite/25 transition-colors">
          <TrophyIcon class="w-5 h-5 text-score-elite" />
        </div>
        <div class="text-left">
          <div class="text-sm font-medium text-text-primary">Leaderboard</div>
          <div class="text-xs text-text-muted">See top-ranked agents</div>
        </div>
      </RouterLink>

      <RouterLink
        to="/"
        class="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group"
      >
        <div class="p-2 rounded-lg bg-score-strong/15 group-hover:bg-score-strong/25 transition-colors">
          <HomeIcon class="w-5 h-5 text-score-strong" />
        </div>
        <div class="text-left">
          <div class="text-sm font-medium text-text-primary">Home</div>
          <div class="text-xs text-text-muted">Back to base</div>
        </div>
      </RouterLink>
    </div>
  </div>
</template>

<style scoped>
.glitch-wrapper {
  position: relative;
}

.glitch {
  position: relative;
  color: var(--color-accent);
}

.glitch::before,
.glitch::after {
  content: attr(data-text);
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.glitch::before {
  color: var(--color-score-failing);
  animation: glitch-shift 3s infinite linear alternate-reverse;
  clip-path: inset(0 0 60% 0);
  z-index: -1;
}

.glitch::after {
  color: var(--color-score-strong);
  animation: glitch-shift 2s infinite linear alternate;
  clip-path: inset(40% 0 0 0);
  z-index: -1;
}

@keyframes glitch-shift {
  0%, 90%, 100% {
    transform: translate(0);
  }
  92% {
    transform: translate(-3px, 1px);
  }
  94% {
    transform: translate(3px, -1px);
  }
  96% {
    transform: translate(-2px, -1px);
  }
  98% {
    transform: translate(2px, 1px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .glitch::before,
  .glitch::after {
    animation: none;
    display: none;
  }
}
</style>
