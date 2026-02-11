<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { getLeaderboard } from '@/services/api'
import { getScoreColor, getRatingLabel } from '@/services/scoring'
import ScoreBadge from '@/components/ui/ScoreBadge.vue'
import RatingLabel from '@/components/ui/RatingLabel.vue'
import DeptBadge from '@/components/ui/DeptBadge.vue'
import SkeletonLoader from '@/components/ui/SkeletonLoader.vue'
import {
  TrophyIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MinusIcon
} from '@heroicons/vue/24/outline'

const router = useRouter()
const agents = ref([])
const deptAverages = ref([])
const loading = ref(true)
const error = ref(null)
const deptFilter = ref('all')

const departments = [
  { value: 'all', label: 'All' },
  { value: 'development', label: 'Dev' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'operations', label: 'Ops' },
  { value: 'tools', label: 'Tools' },
  { value: 'trading', label: 'Trading' }
]

onMounted(async () => {
  try {
    const data = await getLeaderboard()
    agents.value = data.agents || []
    deptAverages.value = data.department_averages || []
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
})

const filtered = computed(() => {
  let result = [...agents.value]
  if (deptFilter.value !== 'all') {
    result = result.filter(a => a.department === deptFilter.value)
  }
  result.sort((a, b) => Number(b.overall_score || 0) - Number(a.overall_score || 0))
  return result
})

// Top 3 for podium (only when showing "all" departments)
const podium = computed(() => filtered.value.slice(0, 3))
const tableAgents = computed(() => filtered.value)

function trendColor(trend) {
  if (trend === 'up') return 'text-score-elite'
  if (trend === 'down') return 'text-score-failing'
  return 'text-text-muted'
}

function navigateToAgent(id) {
  router.push(`/agent/${id}`)
}

// Trophy colors: gold, silver, bronze
const trophyColors = ['text-[#FFD700]', 'text-[#C0C0C0]', 'text-[#CD7F32]']
const trophyGlowColors = ['shadow-[0_0_20px_rgba(255,215,0,0.3)]', 'shadow-[0_0_20px_rgba(192,192,192,0.2)]', 'shadow-[0_0_20px_rgba(205,127,50,0.2)]']
const rankBorderColors = ['border-[#FFD700]/30', 'border-[#C0C0C0]/30', 'border-[#CD7F32]/30']

// Podium display order: 2nd (left), 1st (center), 3rd (right)
const podiumOrder = computed(() => {
  const p = podium.value
  if (p.length < 3) return p
  return [p[1], p[0], p[2]]
})
const podiumRankMap = [1, 0, 2] // maps display position to actual rank index

// Filter dept averages to match active filter
const filteredDeptAverages = computed(() => {
  if (deptFilter.value === 'all') return deptAverages.value
  return deptAverages.value.filter(d => d.department === deptFilter.value)
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center gap-3">
      <TrophyIcon class="w-7 h-7 text-[#FFD700]" />
      <h1 class="text-2xl font-bold text-text-primary">Agent Leaderboard</h1>
    </div>

    <!-- Department filter pills -->
    <div class="flex flex-wrap gap-1.5 bg-eval-surface rounded-xl p-1.5">
      <button
        v-for="dept in departments"
        :key="dept.value"
        @click="deptFilter = dept.value"
        :class="[
          'px-4 py-1.5 text-sm rounded-lg transition-all duration-200 font-medium',
          deptFilter === dept.value
            ? 'bg-accent text-white shadow-md shadow-accent/20'
            : 'text-text-muted hover:text-text-secondary hover:bg-white/[0.03]'
        ]"
      >
        {{ dept.label }}
      </button>
    </div>

    <!-- Department averages bar -->
    <div v-if="!loading && filteredDeptAverages.length > 0" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
      <div
        v-for="dept in filteredDeptAverages"
        :key="dept.department"
        class="glass-card p-3 text-center"
      >
        <DeptBadge :department="dept.department" />
        <div class="mt-2">
          <span :class="getScoreColor(Number(dept.avg_score))" class="text-lg font-bold tabular-nums">
            {{ Number(dept.avg_score).toFixed(1) }}
          </span>
          <span class="text-text-muted text-xs ml-1">avg</span>
        </div>
        <div class="text-text-muted text-xs mt-0.5">
          {{ dept.agent_count }} agent{{ dept.agent_count != 1 ? 's' : '' }}
        </div>
      </div>
    </div>

    <!-- Skeleton loading state -->
    <template v-if="loading">
      <!-- Skeleton podium -->
      <div class="hidden sm:flex justify-center items-end gap-4 pt-4">
        <div class="glass-card p-4 w-40 h-36 flex flex-col items-center justify-center">
          <SkeletonLoader variant="circle" height="2rem" />
          <SkeletonLoader variant="text" width="80%" class="mt-2" />
          <SkeletonLoader variant="badge" class="mt-2" />
        </div>
        <div class="glass-card p-4 w-48 h-44 flex flex-col items-center justify-center">
          <SkeletonLoader variant="circle" height="2.5rem" />
          <SkeletonLoader variant="text" width="80%" class="mt-2" />
          <SkeletonLoader variant="badge" class="mt-2" />
        </div>
        <div class="glass-card p-4 w-40 h-32 flex flex-col items-center justify-center">
          <SkeletonLoader variant="circle" height="2rem" />
          <SkeletonLoader variant="text" width="80%" class="mt-2" />
          <SkeletonLoader variant="badge" class="mt-2" />
        </div>
      </div>
      <!-- Skeleton table rows -->
      <div class="glass-card p-4 space-y-3">
        <SkeletonLoader variant="text" :count="8" />
      </div>
    </template>

    <!-- Error -->
    <div v-else-if="error" class="glass-card p-12 text-center">
      <p class="text-score-failing font-medium">{{ error }}</p>
      <p class="text-text-muted text-sm mt-2">Failed to load leaderboard data.</p>
    </div>

    <!-- Empty -->
    <div v-else-if="filtered.length === 0" class="glass-card p-12 text-center">
      <TrophyIcon class="w-12 h-12 text-text-muted mx-auto mb-3" />
      <p class="text-text-muted">No agents found for this filter.</p>
    </div>

    <!-- Content -->
    <template v-else>
      <!-- Podium: top 3 (desktop) -->
      <div v-if="podium.length >= 3 && deptFilter === 'all'" class="hidden md:flex justify-center items-end gap-4 pt-2 pb-2">
        <div
          v-for="(agent, displayIdx) in podiumOrder"
          :key="agent.id"
          @click="navigateToAgent(agent.id)"
          :class="[
            'glass-card cursor-pointer transition-all duration-300 hover:scale-[1.03] flex flex-col items-center text-center relative overflow-hidden',
            rankBorderColors[podiumRankMap[displayIdx]],
            trophyGlowColors[podiumRankMap[displayIdx]],
            podiumRankMap[displayIdx] === 0 ? 'w-52 p-5 -mt-4' : 'w-44 p-4',
            podiumRankMap[displayIdx] === 2 ? 'mt-2' : ''
          ]"
        >
          <!-- Rank glow background -->
          <div
            v-if="podiumRankMap[displayIdx] === 0"
            class="absolute inset-0 bg-gradient-to-b from-[#FFD700]/[0.06] to-transparent pointer-events-none"
          />

          <!-- Trophy + rank number -->
          <div class="relative">
            <TrophyIcon
              :class="[
                trophyColors[podiumRankMap[displayIdx]],
                podiumRankMap[displayIdx] === 0 ? 'w-10 h-10' : 'w-8 h-8'
              ]"
            />
            <span
              :class="[
                'absolute -bottom-1 -right-2 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center',
                podiumRankMap[displayIdx] === 0 ? 'bg-[#FFD700] text-black' : '',
                podiumRankMap[displayIdx] === 1 ? 'bg-[#C0C0C0] text-black' : '',
                podiumRankMap[displayIdx] === 2 ? 'bg-[#CD7F32] text-black' : ''
              ]"
            >
              {{ podiumRankMap[displayIdx] + 1 }}
            </span>
          </div>

          <!-- Agent info -->
          <div :class="podiumRankMap[displayIdx] === 0 ? 'mt-3' : 'mt-2'" class="relative">
            <div :class="[
              'font-semibold text-text-primary',
              podiumRankMap[displayIdx] === 0 ? 'text-lg' : 'text-sm'
            ]">
              {{ agent.name }}
            </div>
            <div class="text-text-muted text-xs mt-0.5 truncate max-w-full">{{ agent.role }}</div>
          </div>

          <div class="mt-2 relative">
            <ScoreBadge :score="agent.overall_score" :size="podiumRankMap[displayIdx] === 0 ? 'lg' : 'md'" />
          </div>

          <div class="mt-2 relative">
            <DeptBadge :department="agent.department" />
          </div>
        </div>
      </div>

      <!-- Podium: top 3 (mobile) -->
      <div v-if="podium.length >= 3 && deptFilter === 'all'" class="md:hidden space-y-2">
        <div
          v-for="(agent, idx) in podium"
          :key="agent.id"
          @click="navigateToAgent(agent.id)"
          :class="[
            'glass-card flex items-center gap-3 p-3 cursor-pointer transition-all duration-200',
            rankBorderColors[idx]
          ]"
        >
          <div class="flex items-center justify-center w-10">
            <TrophyIcon :class="[trophyColors[idx], 'w-6 h-6']" />
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-text-primary font-semibold text-sm truncate">{{ agent.name }}</div>
            <div class="flex items-center gap-2 mt-0.5">
              <DeptBadge :department="agent.department" />
              <span class="text-text-muted text-xs truncate">{{ agent.role }}</span>
            </div>
          </div>
          <ScoreBadge :score="agent.overall_score" size="sm" />
        </div>
      </div>

      <!-- Desktop table -->
      <div class="hidden md:block">
        <div class="glass-card overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="sticky top-0 bg-eval-surface/90 backdrop-blur-sm z-10">
                <tr class="border-b border-eval-border text-text-muted text-xs uppercase tracking-wider">
                  <th class="text-left p-3 w-14">#</th>
                  <th class="text-left p-3">Agent</th>
                  <th class="text-left p-3">Department</th>
                  <th class="text-left p-3">Score</th>
                  <th class="text-left p-3">Rating</th>
                  <th class="text-right p-3">Evals</th>
                  <th class="text-right p-3">Trend</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(agent, idx) in tableAgents"
                  :key="agent.id"
                  @click="navigateToAgent(agent.id)"
                  :class="[
                    'border-b border-eval-border/30 last:border-0 cursor-pointer transition-colors duration-150',
                    'hover:bg-white/[0.03]',
                    idx % 2 === 1 ? 'bg-white/[0.01]' : ''
                  ]"
                >
                  <!-- Rank -->
                  <td class="p-3">
                    <div class="flex items-center gap-1">
                      <TrophyIcon
                        v-if="idx < 3 && deptFilter === 'all'"
                        :class="[trophyColors[idx], 'w-4 h-4 flex-shrink-0']"
                      />
                      <span
                        :class="[
                          'tabular-nums font-semibold',
                          idx === 0 && deptFilter === 'all' ? 'text-[#FFD700]' : '',
                          idx === 1 && deptFilter === 'all' ? 'text-[#C0C0C0]' : '',
                          idx === 2 && deptFilter === 'all' ? 'text-[#CD7F32]' : '',
                          idx >= 3 || deptFilter !== 'all' ? 'text-text-muted' : ''
                        ]"
                      >
                        {{ idx + 1 }}
                      </span>
                    </div>
                  </td>

                  <!-- Agent name + role -->
                  <td class="p-3">
                    <div class="text-text-primary font-medium hover:text-accent transition-colors">
                      {{ agent.name }}
                    </div>
                    <div class="text-text-muted text-xs mt-0.5">{{ agent.role }}</div>
                  </td>

                  <!-- Department -->
                  <td class="p-3">
                    <DeptBadge :department="agent.department" />
                  </td>

                  <!-- Score -->
                  <td class="p-3">
                    <ScoreBadge :score="agent.overall_score" size="sm" />
                  </td>

                  <!-- Rating -->
                  <td class="p-3">
                    <RatingLabel :label="agent.rating_label || getRatingLabel(Number(agent.overall_score))" size="sm" />
                  </td>

                  <!-- Eval count -->
                  <td class="p-3 text-right text-text-muted tabular-nums">
                    {{ agent.eval_count || 0 }}
                  </td>

                  <!-- Trend -->
                  <td class="p-3 text-right">
                    <span :class="trendColor(agent.trend)" class="inline-flex items-center">
                      <ArrowTrendingUpIcon v-if="agent.trend === 'up'" class="w-4 h-4" />
                      <ArrowTrendingDownIcon v-if="agent.trend === 'down'" class="w-4 h-4" />
                      <MinusIcon v-if="agent.trend === 'stable' || !agent.trend" class="w-4 h-4" />
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Mobile card list -->
      <div class="md:hidden space-y-2">
        <div
          v-for="(agent, idx) in tableAgents"
          :key="agent.id"
          @click="navigateToAgent(agent.id)"
          :class="[
            'glass-card flex items-center gap-3 p-3 cursor-pointer transition-all duration-200',
            idx < 3 && deptFilter === 'all' ? rankBorderColors[idx] : ''
          ]"
        >
          <!-- Rank -->
          <div class="flex items-center justify-center w-8 flex-shrink-0">
            <TrophyIcon
              v-if="idx < 3 && deptFilter === 'all'"
              :class="[trophyColors[idx], 'w-5 h-5']"
            />
            <span
              v-else
              class="text-text-muted tabular-nums text-sm font-semibold"
            >
              {{ idx + 1 }}
            </span>
          </div>

          <!-- Info -->
          <div class="flex-1 min-w-0">
            <div class="text-text-primary font-medium text-sm truncate">{{ agent.name }}</div>
            <div class="flex items-center gap-2 mt-0.5">
              <DeptBadge :department="agent.department" />
              <RatingLabel :label="agent.rating_label || getRatingLabel(Number(agent.overall_score))" size="sm" />
            </div>
          </div>

          <!-- Score + trend -->
          <div class="flex items-center gap-2 flex-shrink-0">
            <span :class="trendColor(agent.trend)" class="inline-flex">
              <ArrowTrendingUpIcon v-if="agent.trend === 'up'" class="w-4 h-4" />
              <ArrowTrendingDownIcon v-if="agent.trend === 'down'" class="w-4 h-4" />
              <MinusIcon v-if="agent.trend === 'stable' || !agent.trend" class="w-3.5 h-3.5" />
            </span>
            <ScoreBadge :score="agent.overall_score" size="sm" />
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
