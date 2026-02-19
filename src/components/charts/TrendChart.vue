<script setup>
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Filler,
  Legend
} from 'chart.js'

ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Filler, Legend)

const props = defineProps({
  evaluations: { type: Array, required: true },
  height: { type: Number, default: 200 },
  // Optional: show specific criterion scores alongside overall
  criteria: { type: Array, default: () => [] }
})

// Criterion display config
const CRITERION_COLORS = {
  task_completion: '#22c55e',
  accuracy: '#3b82f6',
  efficiency: '#f59e0b',
  judgment: '#a855f7',
  communication: '#06b6d4',
  domain_expertise: '#ec4899',
  autonomy: '#f97316',
  safety: '#ef4444'
}

function criterionLabel(key) {
  return key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

// Sort evaluations by date ascending (oldest first)
const sorted = computed(() =>
  [...props.evaluations]
    .filter(e => e.overall != null)
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
)

const chartData = computed(() => {
  const labels = sorted.value.map(e => {
    const d = new Date(e.created_at)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  })

  const hasCriteria = props.criteria.length > 0
  const datasets = []

  // Overall score line (always shown)
  datasets.push({
    label: 'Overall',
    data: sorted.value.map(e => Number(e.overall)),
    borderColor: '#7c3aed',
    backgroundColor: (ctx) => {
      if (!ctx.chart.chartArea || hasCriteria) return 'transparent'
      const { top, bottom } = ctx.chart.chartArea
      const gradient = ctx.chart.ctx.createLinearGradient(0, top, 0, bottom)
      gradient.addColorStop(0, 'rgba(124, 58, 237, 0.3)')
      gradient.addColorStop(1, 'rgba(124, 58, 237, 0)')
      return gradient
    },
    fill: !hasCriteria,
    tension: 0.3,
    pointBackgroundColor: '#7c3aed',
    pointBorderColor: '#1a1a2e',
    pointBorderWidth: 2,
    pointRadius: hasCriteria ? 3 : 4,
    pointHoverRadius: 6,
    borderWidth: 2
  })

  // Per-criterion lines (when criteria are selected)
  for (const criterion of props.criteria) {
    const color = CRITERION_COLORS[criterion] || '#8b5cf6'
    datasets.push({
      label: criterionLabel(criterion),
      data: sorted.value.map(e => e.scores?.[criterion] ?? null),
      borderColor: color,
      backgroundColor: 'transparent',
      fill: false,
      tension: 0.3,
      pointBackgroundColor: color,
      pointBorderColor: '#1a1a2e',
      pointBorderWidth: 1,
      pointRadius: 3,
      pointHoverRadius: 5,
      borderWidth: 1.5,
      borderDash: [4, 2],
      spanGaps: true
    })
  }

  return { labels, datasets }
})

// Store project names for tooltip callback
const projectNames = computed(() =>
  sorted.value.map(e => e.project || null)
)

const chartOptions = computed(() => {
  const hasCriteria = props.criteria.length > 0
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index'
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
          drawBorder: false
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.4)',
          font: { size: 11 },
          maxRotation: 0
        }
      },
      y: {
        min: 0,
        max: 10,
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
          drawBorder: false
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.4)',
          font: { size: 11 },
          stepSize: 2
        }
      }
    },
    plugins: {
      legend: {
        display: hasCriteria,
        position: 'top',
        labels: {
          color: 'rgba(255, 255, 255, 0.6)',
          font: { size: 11 },
          boxWidth: 12,
          padding: 8,
          usePointStyle: true,
          pointStyle: 'line'
        }
      },
      tooltip: {
        backgroundColor: '#1a1a2e',
        titleColor: '#ffffff',
        bodyColor: 'rgba(255, 255, 255, 0.7)',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        cornerRadius: 8,
        padding: 10,
        displayColors: hasCriteria,
        callbacks: {
          title: (items) => {
            if (!items.length) return ''
            return items[0].label
          },
          label: (item) => {
            const val = item.parsed.y
            if (val == null) return null
            const label = item.dataset.label
            const line = `${label}: ${val.toFixed(1)}`
            // Add project name only on the first dataset
            if (item.datasetIndex === 0) {
              const project = projectNames.value[item.dataIndex]
              if (project) return [line, `Project: ${project}`]
            }
            return line
          }
        }
      }
    }
  }
})
</script>

<template>
  <div :style="{ height: `${height}px` }">
    <Line :data="chartData" :options="chartOptions" />
  </div>
</template>
