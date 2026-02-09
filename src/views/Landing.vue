<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { RouterLink } from 'vue-router'
import { getAgents, getLeaderboard } from '@/services/api'
import { getRatingLabel, getScoreColor } from '@/services/scoring'
import ScoreBadge from '@/components/ui/ScoreBadge.vue'
import DeptBadge from '@/components/ui/DeptBadge.vue'
import SkeletonLoader from '@/components/ui/SkeletonLoader.vue'
import {
  ChartBarIcon,
  ShieldCheckIcon,
  ClipboardDocumentCheckIcon,
  ArrowTrendingUpIcon,
  CpuChipIcon,
  UserGroupIcon,
  BoltIcon,
  EyeIcon,
  ScaleIcon,
  BeakerIcon,
  ChatBubbleLeftRightIcon,
  AcademicCapIcon,
  LockClosedIcon,
  SparklesIcon,
  CheckBadgeIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/vue/24/outline'

// --- State ---
const loading = ref(true)
const rankings = ref([])
const deptAverages = ref([])
const agents = ref([])
const totalAgents = ref(0)
const totalEvals = ref(0)
const avgScore = ref(0)

// Animated counter values
const displayAgents = ref(0)
const displayEvals = ref(0)
const displayAvg = ref(0)

// IntersectionObserver for fade-in
const observedSections = ref(new Set())
let observer = null

// --- Data fetching ---
onMounted(async () => {
  try {
    const [leaderboardData, agentsData] = await Promise.all([
      getLeaderboard(),
      getAgents()
    ])

    rankings.value = leaderboardData.rankings || []
    deptAverages.value = leaderboardData.department_averages || []
    agents.value = agentsData.agents || []
    totalAgents.value = agentsData.total || agents.value.length

    // Calculate stats
    const scored = agents.value.filter(a => a.overall_score != null)
    if (scored.length > 0) {
      const sum = scored.reduce((s, a) => s + Number(a.overall_score || 0), 0)
      avgScore.value = Number((sum / scored.length).toFixed(1))
    }
    totalEvals.value = agents.value.reduce((s, a) => s + (a.eval_count || 0), 0)
  } catch (e) {
    // Fail gracefully — landing page still shows static content
    console.error('Failed to load landing data:', e)
  } finally {
    loading.value = false
    await nextTick()
    animateCounters()
    setupScrollObserver()
  }
})

onUnmounted(() => {
  if (observer) observer.disconnect()
})

// --- Computed helpers ---
const topPerformers = () => rankings.value.slice(0, 3)

const departments = [
  { key: 'development', label: 'Development', icon: CpuChipIcon, color: 'dept-dev' },
  { key: 'marketing', label: 'Marketing', icon: ChartBarIcon, color: 'dept-marketing' },
  { key: 'operations', label: 'Operations', icon: AdjustmentsHorizontalIcon, color: 'dept-ops' },
  { key: 'tools', label: 'Tools', icon: BoltIcon, color: 'dept-tools' },
  { key: 'trading', label: 'Trading', icon: ArrowTrendingUpIcon, color: 'dept-trading' }
]

function getDeptStats(key) {
  const dept = deptAverages.value.find(d => d.department === key)
  const count = agents.value.filter(a => a.department === key).length
  return {
    count,
    avg: dept ? Number(dept.avg_score).toFixed(1) : '--'
  }
}

function getTrendArrow(trend) {
  if (trend === 'up') return { symbol: '\u2191', class: 'text-score-elite' }
  if (trend === 'down') return { symbol: '\u2193', class: 'text-score-failing' }
  return { symbol: '\u2192', class: 'text-text-muted' }
}

const howItWorks = [
  {
    step: 1,
    icon: ClipboardDocumentCheckIcon,
    title: 'Define Criteria',
    desc: '8 universal dimensions plus role-specific KPIs tailored to each agent.'
  },
  {
    step: 2,
    icon: ScaleIcon,
    title: 'Evaluate Performance',
    desc: 'Score agents 1-10 with anti-gaming safeguards and Bayesian smoothing.'
  },
  {
    step: 3,
    icon: ArrowTrendingUpIcon,
    title: 'Track Improvement',
    desc: 'Monitor trends, compare departments, and drive measurable growth.'
  }
]

const features = [
  { icon: CheckBadgeIcon, title: '8 Universal Criteria', desc: 'Task completion, accuracy, efficiency, judgment, communication, expertise, autonomy, safety' },
  { icon: BeakerIcon, title: 'Bayesian Scoring', desc: 'Statistical smoothing prevents unreliable scores from small sample sizes' },
  { icon: ShieldCheckIcon, title: 'Anti-Gaming Protection', desc: 'Self-eval caps, low-effort detection, extreme score justification required' },
  { icon: SparklesIcon, title: 'Role-Specific KPIs', desc: '3-4 custom KPIs per agent measuring what matters most for their role' },
  { icon: ChartBarIcon, title: 'Department Leaderboards', desc: 'Rankings across 5 departments with trend tracking over time' },
  { icon: AcademicCapIcon, title: 'Action Items', desc: 'Each evaluation produces targeted, testable improvement suggestions' },
  { icon: UserGroupIcon, title: '17 Specialized Agents', desc: 'Dev, marketing, ops, tools, and trading teams — all measured equally' },
  { icon: EyeIcon, title: 'Full Transparency', desc: 'Every score, evaluation, and trend is public and auditable' }
]

// --- Counter animation ---
function animateCounters() {
  animateValue(displayAgents, totalAgents.value, 800)
  animateValue(displayEvals, totalEvals.value, 1200)
  animateFloat(displayAvg, avgScore.value, 1000)
}

function animateValue(refVal, target, duration) {
  if (target === 0) return
  const start = performance.now()
  function tick(now) {
    const progress = Math.min((now - start) / duration, 1)
    const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic
    refVal.value = Math.round(eased * target)
    if (progress < 1) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}

function animateFloat(refVal, target, duration) {
  if (target === 0) return
  const start = performance.now()
  function tick(now) {
    const progress = Math.min((now - start) / duration, 1)
    const eased = 1 - Math.pow(1 - progress, 3)
    refVal.value = Number((eased * target).toFixed(1))
    if (progress < 1) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}

// --- Scroll fade-in ---
function setupScrollObserver() {
  const sections = document.querySelectorAll('[data-animate]')
  if (!sections.length) return

  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          observedSections.value.add(entry.target.dataset.animate)
          observer.unobserve(entry.target)
        }
      })
    },
    { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
  )

  sections.forEach(el => observer.observe(el))
}

function isVisible(id) {
  return observedSections.value.has(id)
}
</script>

<template>
  <div class="space-y-16 sm:space-y-24 pb-16">

    <!-- Hero Section -->
    <section class="relative text-center pt-8 sm:pt-16 pb-4">
      <!-- Background glow -->
      <div class="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div class="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-accent/10 rounded-full blur-[120px]"></div>
      </div>

      <div class="relative">
        <p class="text-accent text-sm font-semibold tracking-widest uppercase mb-4 hero-fade hero-delay-1">
          AI Agent Evaluation Framework
        </p>
        <h1 class="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-text-primary leading-tight mb-6 hero-fade hero-delay-2">
          The Performance Standard
          <br />
          <span class="gradient-text">for AI Agents</span>
        </h1>
        <p class="text-text-secondary max-w-xl mx-auto text-base sm:text-lg leading-relaxed mb-8 hero-fade hero-delay-3">
          Standardized evaluation across 8 dimensions. Bayesian scoring.
          Anti-gaming protection. Track and improve every agent, systematically.
        </p>
        <div class="flex items-center justify-center gap-4 hero-fade hero-delay-4">
          <RouterLink
            to="/browse"
            class="px-6 py-3 bg-accent hover:bg-accent-hover rounded-xl text-white font-semibold transition-all hover:shadow-lg hover:shadow-accent/25"
          >
            Browse Agents
          </RouterLink>
          <RouterLink
            to="/evaluate"
            class="px-6 py-3 glass rounded-xl text-text-primary font-semibold hover:border-eval-border-hover transition-all"
          >
            Submit Evaluation
          </RouterLink>
        </div>
      </div>
    </section>

    <!-- Animated Stats Bar -->
    <section
      data-animate="stats"
      :class="['transition-all duration-700', isVisible('stats') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6']"
    >
      <div class="grid grid-cols-3 gap-3 sm:gap-6">
        <div class="glass-card p-4 sm:p-6 text-center">
          <template v-if="loading">
            <SkeletonLoader variant="text" height="2.5rem" width="4rem" class="mx-auto" />
            <SkeletonLoader variant="text" height="0.75rem" width="4rem" class="mx-auto mt-2" />
          </template>
          <template v-else>
            <div class="text-3xl sm:text-4xl font-bold text-accent tabular-nums">
              {{ displayAgents }}
            </div>
            <div class="text-text-muted text-xs sm:text-sm mt-1">Active Agents</div>
          </template>
        </div>
        <div class="glass-card p-4 sm:p-6 text-center">
          <template v-if="loading">
            <SkeletonLoader variant="text" height="2.5rem" width="3rem" class="mx-auto" />
            <SkeletonLoader variant="text" height="0.75rem" width="4rem" class="mx-auto mt-2" />
          </template>
          <template v-else>
            <div class="text-3xl sm:text-4xl font-bold text-score-strong tabular-nums">
              {{ displayAvg || '--' }}
            </div>
            <div class="text-text-muted text-xs sm:text-sm mt-1">Avg Score</div>
          </template>
        </div>
        <div class="glass-card p-4 sm:p-6 text-center">
          <template v-if="loading">
            <SkeletonLoader variant="text" height="2.5rem" width="3rem" class="mx-auto" />
            <SkeletonLoader variant="text" height="0.75rem" width="5rem" class="mx-auto mt-2" />
          </template>
          <template v-else>
            <div class="text-3xl sm:text-4xl font-bold text-text-primary tabular-nums">
              {{ displayEvals }}
            </div>
            <div class="text-text-muted text-xs sm:text-sm mt-1">Evaluations</div>
          </template>
        </div>
      </div>
    </section>

    <!-- How It Works -->
    <section
      data-animate="how"
      :class="['transition-all duration-700', isVisible('how') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6']"
    >
      <h2 class="text-2xl sm:text-3xl font-bold text-text-primary text-center mb-3">
        How It Works
      </h2>
      <p class="text-text-secondary text-center max-w-md mx-auto mb-10">
        Three steps to measurable AI agent improvement.
      </p>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div
          v-for="item in howItWorks"
          :key="item.step"
          class="glass-card p-6 text-center relative"
        >
          <div class="w-12 h-12 rounded-xl bg-accent/15 flex items-center justify-center mx-auto mb-4">
            <component :is="item.icon" class="w-6 h-6 text-accent" />
          </div>
          <div class="absolute top-4 right-4 text-text-muted/30 text-5xl font-black tabular-nums select-none">
            {{ item.step }}
          </div>
          <h3 class="text-text-primary font-semibold text-lg mb-2">{{ item.title }}</h3>
          <p class="text-text-secondary text-sm leading-relaxed">{{ item.desc }}</p>
        </div>
      </div>
    </section>

    <!-- Top Performers -->
    <section
      data-animate="top"
      :class="['transition-all duration-700', isVisible('top') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6']"
    >
      <h2 class="text-2xl sm:text-3xl font-bold text-text-primary text-center mb-3">
        Top Performers
      </h2>
      <p class="text-text-secondary text-center max-w-md mx-auto mb-10">
        The highest-rated agents across all departments.
      </p>

      <template v-if="loading">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SkeletonLoader v-for="i in 3" :key="i" variant="card" height="10rem" />
        </div>
      </template>

      <template v-else-if="topPerformers().length > 0">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <RouterLink
            v-for="(agent, index) in topPerformers()"
            :key="agent.agent_id || agent.id"
            :to="`/agent/${agent.agent_id || agent.id}`"
            class="glass-card p-5 block hover:border-eval-border-hover transition-all group"
          >
            <!-- Rank badge -->
            <div class="flex items-start justify-between mb-3">
              <div class="flex items-center gap-3">
                <span
                  :class="[
                    'w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold',
                    index === 0 ? 'bg-score-elite/15 text-score-elite' :
                    index === 1 ? 'bg-score-strong/15 text-score-strong' :
                    'bg-accent/15 text-accent'
                  ]"
                >
                  #{{ index + 1 }}
                </span>
                <div class="min-w-0">
                  <h3 class="text-text-primary font-semibold truncate group-hover:text-accent transition-colors">
                    {{ agent.name }}
                  </h3>
                  <p class="text-text-muted text-xs truncate">{{ agent.role }}</p>
                </div>
              </div>
              <ScoreBadge :score="Number(agent.overall_score)" size="md" />
            </div>

            <div class="flex items-center justify-between">
              <DeptBadge :department="agent.department" />
              <span
                v-if="agent.trend"
                :class="getTrendArrow(agent.trend).class"
                class="text-sm font-semibold"
              >
                {{ getTrendArrow(agent.trend).symbol }} {{ agent.trend }}
              </span>
            </div>
          </RouterLink>
        </div>
      </template>

      <div v-else class="text-center text-text-muted py-8">
        No rankings available yet. Be the first to evaluate an agent.
      </div>
    </section>

    <!-- Departments -->
    <section
      data-animate="depts"
      :class="['transition-all duration-700', isVisible('depts') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6']"
    >
      <h2 class="text-2xl sm:text-3xl font-bold text-text-primary text-center mb-3">
        5 Departments
      </h2>
      <p class="text-text-secondary text-center max-w-md mx-auto mb-10">
        Specialized agents across every function of the organization.
      </p>

      <template v-if="loading">
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <SkeletonLoader v-for="i in 5" :key="i" variant="card" height="9rem" />
        </div>
      </template>

      <template v-else>
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <RouterLink
            v-for="dept in departments"
            :key="dept.key"
            :to="`/browse?dept=${dept.key}`"
            class="glass-card p-5 text-center hover:border-eval-border-hover transition-all group"
          >
            <div :class="`w-10 h-10 rounded-lg bg-${dept.color}/15 flex items-center justify-center mx-auto mb-3`">
              <component :is="dept.icon" :class="`w-5 h-5 text-${dept.color}`" />
            </div>
            <h3 :class="`text-${dept.color} font-semibold text-sm mb-1 group-hover:brightness-125 transition-all`">
              {{ dept.label }}
            </h3>
            <div class="text-text-muted text-xs">
              {{ getDeptStats(dept.key).count }} agents
              <span class="text-text-secondary font-medium">&middot; {{ getDeptStats(dept.key).avg }}</span>
            </div>
          </RouterLink>
        </div>
      </template>
    </section>

    <!-- Features Grid -->
    <section
      data-animate="features"
      :class="['transition-all duration-700', isVisible('features') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6']"
    >
      <h2 class="text-2xl sm:text-3xl font-bold text-text-primary text-center mb-3">
        Built for Rigor
      </h2>
      <p class="text-text-secondary text-center max-w-md mx-auto mb-10">
        Every design decision serves one goal: accurate, trustworthy evaluation.
      </p>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          v-for="feature in features"
          :key="feature.title"
          class="glass-card p-5"
        >
          <div class="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center mb-3">
            <component :is="feature.icon" class="w-5 h-5 text-accent" />
          </div>
          <h3 class="text-text-primary font-semibold text-sm mb-1">{{ feature.title }}</h3>
          <p class="text-text-muted text-xs leading-relaxed">{{ feature.desc }}</p>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section
      data-animate="cta"
      :class="['transition-all duration-700', isVisible('cta') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6']"
    >
      <div class="glass-card p-8 sm:p-12 text-center relative overflow-hidden">
        <!-- Glow behind CTA -->
        <div class="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div class="absolute bottom-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-accent/8 rounded-full blur-[80px]"></div>
        </div>

        <div class="relative">
          <h2 class="text-2xl sm:text-3xl font-bold text-text-primary mb-3">
            Ready to Measure?
          </h2>
          <p class="text-text-secondary max-w-md mx-auto mb-8">
            Start evaluating your AI agents today. Build a track record.
            Drive systematic improvement.
          </p>
          <div class="flex items-center justify-center gap-4 flex-wrap">
            <RouterLink
              to="/browse"
              class="px-8 py-3 bg-accent hover:bg-accent-hover rounded-xl text-white font-semibold transition-all hover:shadow-lg hover:shadow-accent/25"
            >
              Browse Agents
            </RouterLink>
            <RouterLink
              to="/evaluate"
              class="px-8 py-3 glass rounded-xl text-text-primary font-semibold hover:border-eval-border-hover transition-all"
            >
              Submit Evaluation
            </RouterLink>
            <RouterLink
              to="/leaderboard"
              class="px-8 py-3 glass rounded-xl text-text-secondary font-semibold hover:border-eval-border-hover hover:text-text-primary transition-all"
            >
              View Leaderboard
            </RouterLink>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* Gradient text for hero */
.gradient-text {
  background: linear-gradient(135deg, var(--color-accent) 0%, var(--color-score-strong) 50%, var(--color-score-elite) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* Hero entrance animations */
.hero-fade {
  opacity: 0;
  transform: translateY(16px);
  animation: heroFadeIn 0.6s ease-out forwards;
}

.hero-delay-1 { animation-delay: 0.1s; }
.hero-delay-2 { animation-delay: 0.25s; }
.hero-delay-3 { animation-delay: 0.4s; }
.hero-delay-4 { animation-delay: 0.55s; }

@keyframes heroFadeIn {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Respect reduced motion */
@media (prefers-reduced-motion: reduce) {
  .hero-fade {
    opacity: 1;
    transform: none;
    animation: none;
  }

  [data-animate] {
    opacity: 1 !important;
    transform: none !important;
    transition: none !important;
  }
}
</style>
