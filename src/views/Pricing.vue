<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

const tiers = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Perfect for getting started',
    features: [
      'Up to 5 agents',
      '3 team members',
      'Basic evaluations',
      'Community support',
      'Public leaderboard'
    ],
    cta: 'Get Started',
    popular: false
  },
  {
    name: 'Pro',
    price: '$20',
    period: 'per month',
    description: 'For growing teams',
    features: [
      'Up to 20 agents',
      '10 team members',
      'Advanced analytics',
      'Priority support',
      'Marketplace publishing',
      'Custom departments',
      'API access'
    ],
    cta: 'Start Free Trial',
    popular: true
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: 'contact us',
    description: 'For large organizations',
    features: [
      'Unlimited agents',
      'Unlimited team members',
      'SSO & SAML',
      'Dedicated support',
      'Custom integrations',
      'SLA guarantee',
      'Private hosting option'
    ],
    cta: 'Contact Sales',
    popular: false
  }
]
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 py-12">
    <!-- Header -->
    <div class="text-center mb-12">
      <h1 class="text-4xl font-bold text-text-primary mb-4">Choose Your Plan</h1>
      <p class="text-text-secondary text-lg">
        Start free, upgrade as you grow. No credit card required.
      </p>
    </div>

    <!-- Pricing cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
      <div
        v-for="tier in tiers"
        :key="tier.name"
        class="glass-card p-8 relative flex flex-col"
        :class="tier.popular ? 'border-2 border-accent' : ''"
      >
        <!-- Popular badge -->
        <div
          v-if="tier.popular"
          class="absolute -top-4 left-1/2 transform -translate-x-1/2 px-4 py-1 bg-accent rounded-full text-white text-sm font-semibold"
        >
          Popular
        </div>

        <!-- Header -->
        <div class="mb-6">
          <h3 class="text-2xl font-bold text-text-primary mb-2">{{ tier.name }}</h3>
          <p class="text-text-muted text-sm mb-4">{{ tier.description }}</p>
          <div class="flex items-baseline">
            <span class="text-4xl font-bold text-text-primary">{{ tier.price }}</span>
            <span class="text-text-muted text-sm ml-2">{{ tier.period }}</span>
          </div>
        </div>

        <!-- Features -->
        <ul class="space-y-3 mb-8 flex-1">
          <li
            v-for="feature in tier.features"
            :key="feature"
            class="flex items-start"
          >
            <svg
              class="w-5 h-5 text-accent mr-3 flex-shrink-0 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fill-rule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clip-rule="evenodd"
              />
            </svg>
            <span class="text-text-secondary">{{ feature }}</span>
          </li>
        </ul>

        <!-- CTA -->
        <button
          @click="router.push('/sign-up')"
          class="w-full px-4 py-3 rounded-lg font-semibold transition-colors"
          :class="
            tier.popular
              ? 'bg-accent hover:bg-accent-hover text-white'
              : 'bg-eval-surface hover:bg-eval-card border border-eval-border text-text-primary'
          "
        >
          {{ tier.cta }}
        </button>
      </div>
    </div>

    <!-- FAQ section -->
    <div class="mt-16 glass-card p-8">
      <h2 class="text-2xl font-bold text-text-primary mb-6 text-center">Frequently Asked Questions</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 class="text-text-primary font-semibold mb-2">Can I change plans later?</h3>
          <p class="text-text-secondary text-sm">
            Yes, you can upgrade or downgrade at any time. Changes take effect immediately.
          </p>
        </div>
        <div>
          <h3 class="text-text-primary font-semibold mb-2">What payment methods do you accept?</h3>
          <p class="text-text-secondary text-sm">
            We accept all major credit cards, PayPal, and wire transfer for Enterprise plans.
          </p>
        </div>
        <div>
          <h3 class="text-text-primary font-semibold mb-2">Is there a free trial?</h3>
          <p class="text-text-secondary text-sm">
            Pro plan includes a 14-day free trial. No credit card required to start.
          </p>
        </div>
        <div>
          <h3 class="text-text-primary font-semibold mb-2">What happens if I exceed my limits?</h3>
          <p class="text-text-secondary text-sm">
            We'll notify you when approaching limits. You can upgrade anytime to continue.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
