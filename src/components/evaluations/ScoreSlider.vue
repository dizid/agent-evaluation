<script setup>
import { computed } from 'vue'
import { getScoreColor, getScoreBgColor } from '@/services/scoring'

const props = defineProps({
  modelValue: { type: Number, default: 5 },
  label: { type: String, required: true },
  description: { type: String, default: '' }
})

const emit = defineEmits(['update:modelValue'])

const scoreColor = computed(() => getScoreColor(props.modelValue))
const scoreBg = computed(() => getScoreBgColor(props.modelValue))

function onInput(event) {
  emit('update:modelValue', Number(event.target.value))
}

// Thumb color for the range input based on score
const thumbColor = computed(() => {
  if (props.modelValue >= 9) return '#00ff88'
  if (props.modelValue >= 7) return '#00d4ff'
  if (props.modelValue >= 5) return '#f7931a'
  if (props.modelValue >= 3) return '#ff6b4a'
  return '#ff4757'
})
</script>

<template>
  <div class="glass-card p-4">
    <!-- Header: label + score display -->
    <div class="flex items-start justify-between gap-3 mb-1">
      <div class="min-w-0 flex-1">
        <div class="text-text-primary font-medium text-sm">{{ label }}</div>
        <div v-if="description" class="text-text-muted text-xs mt-0.5 line-clamp-2">
          {{ description }}
        </div>
      </div>
      <span
        :class="[scoreColor, scoreBg]"
        class="text-xl font-bold px-3 py-1 rounded-lg tabular-nums shrink-0"
      >
        {{ modelValue }}
      </span>
    </div>

    <!-- Slider -->
    <div class="mt-3">
      <input
        type="range"
        min="1"
        max="10"
        step="1"
        :value="modelValue"
        @input="onInput"
        class="w-full h-2 rounded-full appearance-none cursor-pointer bg-eval-surface
               [&::-webkit-slider-thumb]:appearance-none
               [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6
               [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer
               [&::-webkit-slider-thumb]:shadow-lg
               [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:h-6
               [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:cursor-pointer
               [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-lg"
        :style="{
          '--tw-shadow-color': thumbColor,
          '--webkit-slider-thumb-bg': thumbColor
        }"
      />
      <!-- Scale labels -->
      <div class="flex justify-between text-[10px] text-text-muted mt-1 px-0.5">
        <span>1</span>
        <span>5</span>
        <span>10</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
input[type="range"]::-webkit-slider-thumb {
  background: v-bind(thumbColor);
}
input[type="range"]::-moz-range-thumb {
  background: v-bind(thumbColor);
}
</style>
