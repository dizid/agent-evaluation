<script setup>
import { SignIn } from '@clerk/vue'
import { RouterLink } from 'vue-router'
</script>

<template>
  <div class="auth-page">
    <!-- Background layers -->
    <div class="auth-bg" aria-hidden="true">
      <!-- Gradient orbs -->
      <div class="auth-orb auth-orb-purple"></div>
      <div class="auth-orb auth-orb-cyan"></div>
      <div class="auth-orb auth-orb-green"></div>
      <!-- Dot grid -->
      <div class="auth-grid"></div>
    </div>

    <!-- Floating ambient scores (desktop only) -->
    <div class="hidden lg:block" aria-hidden="true">
      <div class="auth-float auth-float-1 auth-enter auth-enter-delay-5">
        <span class="auth-score-pill" style="--pill-color: var(--color-score-elite)">9.2</span>
      </div>
      <div class="auth-float auth-float-2 auth-enter auth-enter-delay-6">
        <span class="auth-score-pill" style="--pill-color: var(--color-score-strong)">7.8</span>
      </div>
      <div class="auth-float auth-float-3 auth-enter auth-enter-delay-5">
        <span class="auth-score-pill" style="--pill-color: var(--color-score-adequate)">6.4</span>
      </div>
      <div class="auth-float auth-float-4 auth-enter auth-enter-delay-6">
        <span class="auth-score-pill" style="--pill-color: var(--color-score-strong)">8.1</span>
      </div>
    </div>

    <!-- Content -->
    <div class="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-4 py-8">
      <!-- Brand -->
      <div class="text-center mb-8">
        <RouterLink to="/" class="auth-enter auth-enter-delay-1 inline-block">
          <span class="text-2xl font-bold text-accent tracking-tight">AgentEval</span>
        </RouterLink>
        <p class="auth-enter auth-enter-delay-2 mt-3 text-text-muted text-xs tracking-[0.25em] uppercase" style="font-family: 'JetBrains Mono', monospace;">
          The Performance Standard for AI Agents
        </p>
      </div>

      <!-- Gradient divider -->
      <div class="auth-enter auth-enter-delay-3 w-48 h-px mb-8 auth-divider"></div>

      <!-- Clerk form in glass card -->
      <div class="auth-enter auth-enter-delay-4 w-full max-w-md">
        <div class="auth-card">
          <SignIn
            :routing="'path'"
            :path="'/sign-in'"
            :sign-up-url="'/sign-up'"
            :appearance="{
              variables: {
                colorPrimary: '#7c3aed',
                colorBackground: 'transparent',
                colorInputBackground: 'rgba(255, 255, 255, 0.05)',
                colorInputText: '#ffffff',
                borderRadius: '0.75rem'
              },
              elements: {
                card: 'bg-transparent shadow-none',
                headerTitle: 'text-text-primary',
                headerSubtitle: 'text-text-secondary',
                formFieldLabel: 'text-text-secondary',
                footerActionLink: 'text-accent hover:text-accent-hover',
                dividerLine: 'bg-eval-border',
                dividerText: 'text-text-muted'
              }
            }"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Page container */
.auth-page {
  position: relative;
  overflow: hidden;
  min-height: calc(100vh - 4rem);
}

/* Background layer */
.auth-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

/* Gradient orbs */
.auth-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(120px);
}

.auth-orb-purple {
  top: 10%;
  left: 50%;
  transform: translateX(-60%);
  width: 500px;
  height: 300px;
  background: rgba(124, 58, 237, 0.12);
}

.auth-orb-cyan {
  top: 40%;
  right: -5%;
  width: 350px;
  height: 250px;
  background: rgba(0, 212, 255, 0.06);
}

.auth-orb-green {
  bottom: 5%;
  left: -5%;
  width: 300px;
  height: 200px;
  background: rgba(0, 255, 136, 0.04);
}

/* Subtle dot grid */
.auth-grid {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(circle, rgba(255, 255, 255, 0.08) 1px, transparent 1px);
  background-size: 32px 32px;
  opacity: 0.04;
  animation: gridPulse 8s ease-in-out infinite;
}

/* Glass card for Clerk form */
.auth-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.02));
  backdrop-filter: blur(20px);
  border: 1px solid rgba(124, 58, 237, 0.15);
  border-radius: 16px;
  padding: 8px;
  box-shadow:
    0 0 40px rgba(124, 58, 237, 0.05),
    0 4px 24px rgba(0, 0, 0, 0.3);
}

/* Gradient divider */
.auth-divider {
  background: linear-gradient(
    90deg,
    transparent 0%,
    var(--color-accent) 30%,
    var(--color-score-strong) 50%,
    var(--color-score-elite) 70%,
    transparent 100%
  );
  opacity: 0.4;
}

/* Floating score pills */
.auth-float {
  position: fixed;
  z-index: 5;
  pointer-events: none;
}

.auth-float-1 {
  top: 18%;
  left: 8%;
  animation: floatSlow 7s ease-in-out infinite;
}

.auth-float-2 {
  top: 35%;
  right: 7%;
  animation: floatMedium 5s ease-in-out infinite;
  animation-delay: 1s;
}

.auth-float-3 {
  bottom: 28%;
  left: 6%;
  animation: floatMedium 6s ease-in-out infinite;
  animation-delay: 2s;
}

.auth-float-4 {
  bottom: 15%;
  right: 10%;
  animation: floatSlow 8s ease-in-out infinite;
  animation-delay: 0.5s;
}

.auth-score-pill {
  display: inline-flex;
  align-items: center;
  padding: 6px 14px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--pill-color);
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(12px);
  border: 1px solid color-mix(in srgb, var(--pill-color) 20%, transparent);
  border-radius: 20px;
  box-shadow: 0 0 16px color-mix(in srgb, var(--pill-color) 10%, transparent);
  letter-spacing: 0.05em;
}

/* Entrance animations */
.auth-enter {
  opacity: 0;
  transform: translateY(16px);
  animation: authFadeIn 0.6s ease-out forwards;
}

.auth-enter-delay-1 { animation-delay: 0.1s; }
.auth-enter-delay-2 { animation-delay: 0.2s; }
.auth-enter-delay-3 { animation-delay: 0.3s; }
.auth-enter-delay-4 { animation-delay: 0.4s; }
.auth-enter-delay-5 { animation-delay: 0.7s; }
.auth-enter-delay-6 { animation-delay: 0.9s; }

@keyframes authFadeIn {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Respect reduced motion */
@media (prefers-reduced-motion: reduce) {
  .auth-enter {
    opacity: 1;
    transform: none;
    animation: none;
  }
  .auth-grid {
    animation: none;
    opacity: 0.03;
  }
  .auth-float {
    animation: none;
  }
  .auth-score-pill {
    animation: none;
  }
}
</style>
