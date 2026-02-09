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
  Filler
} from 'chart.js'

ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Filler)

const props = defineProps({
  evaluations: { type: Array, required: true },
  height: { type: Number, default: 200 }
})

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

  const scores = sorted.value.map(e => Number(e.overall))

  return {
    labels,
    datasets: [{
      label: 'Score',
      data: scores,
      borderColor: '#7c3aed',
      backgroundColor: (ctx) => {
        if (!ctx.chart.chartArea) return 'transparent'
        const { top, bottom } = ctx.chart.chartArea
        const gradient = ctx.chart.ctx.createLinearGradient(0, top, 0, bottom)
        gradient.addColorStop(0, 'rgba(124, 58, 237, 0.3)')
        gradient.addColorStop(1, 'rgba(124, 58, 237, 0)')
        return gradient
      },
      fill: true,
      tension: 0.3,
      pointBackgroundColor: '#7c3aed',
      pointBorderColor: '#1a1a2e',
      pointBorderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 6,
      borderWidth: 2
    }]
  }
})

// Store project names for tooltip callback
const projectNames = computed(() =>
  sorted.value.map(e => e.project || null)
)

const chartOptions = computed(() => ({
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
    tooltip: {
      backgroundColor: '#1a1a2e',
      titleColor: '#ffffff',
      bodyColor: 'rgba(255, 255, 255, 0.7)',
      borderColor: 'rgba(255, 255, 255, 0.1)',
      borderWidth: 1,
      cornerRadius: 8,
      padding: 10,
      displayColors: false,
      callbacks: {
        title: (items) => {
          if (!items.length) return ''
          return items[0].label
        },
        label: (item) => {
          const lines = [`Score: ${item.parsed.y.toFixed(1)}`]
          const project = projectNames.value[item.dataIndex]
          if (project) lines.push(`Project: ${project}`)
          return lines
        }
      }
    }
  }
}))
</script>

<template>
  <div :style="{ height: `${height}px` }">
    <Line :data="chartData" :options="chartOptions" />
  </div>
</template>
