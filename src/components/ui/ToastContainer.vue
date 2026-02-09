<script setup>
import { useToast } from '../../composables/useToast'
import {
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XMarkIcon
} from '@heroicons/vue/24/outline'

const { toasts, dismiss } = useToast()

const icons = {
  success: CheckCircleIcon,
  error: XCircleIcon,
  warning: ExclamationTriangleIcon,
  info: InformationCircleIcon
}

const colors = {
  success: 'border-score-elite/40 bg-score-elite/10 text-score-elite',
  error: 'border-score-failing/40 bg-score-failing/10 text-score-failing',
  warning: 'border-score-adequate/40 bg-score-adequate/10 text-score-adequate',
  info: 'border-accent/40 bg-accent/10 text-accent'
}
</script>

<template>
  <div class="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
    <TransitionGroup
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="translate-x-full opacity-0"
      enter-to-class="translate-x-0 opacity-100"
      leave-active-class="transition-all duration-300 ease-in"
      leave-from-class="translate-x-0 opacity-100"
      leave-to-class="translate-x-full opacity-0"
    >
      <div
        v-for="toast in toasts"
        :key="toast.id"
        :class="[
          'flex items-start gap-3 px-4 py-3 rounded-lg border backdrop-blur-md shadow-lg',
          colors[toast.type]
        ]"
      >
        <component :is="icons[toast.type]" class="w-5 h-5 shrink-0 mt-0.5" />
        <span class="text-sm flex-1">{{ toast.message }}</span>
        <button
          @click="dismiss(toast.id)"
          class="shrink-0 hover:opacity-70 transition-opacity"
          aria-label="Dismiss notification"
        >
          <XMarkIcon class="w-4 h-4" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>
