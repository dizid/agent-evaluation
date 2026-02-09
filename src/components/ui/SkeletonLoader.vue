<script setup>
defineProps({
  // 'text', 'card', 'badge', 'chart', 'circle'
  variant: { type: String, default: 'text' },
  width: { type: String, default: '100%' },
  height: { type: String, default: null },
  count: { type: Number, default: 1 }
})

const heights = {
  text: '1rem',
  card: '8rem',
  badge: '1.5rem',
  chart: '12rem',
  circle: '3rem'
}
</script>

<template>
  <div class="flex flex-col gap-2" :style="{ width }">
    <div
      v-for="i in count"
      :key="i"
      class="skeleton rounded-lg"
      :class="{
        'rounded-full': variant === 'circle' || variant === 'badge',
        'w-full': variant !== 'circle' && variant !== 'badge'
      }"
      :style="{
        height: height || heights[variant],
        width: variant === 'circle' ? (height || heights.circle) : (variant === 'badge' ? '5rem' : width)
      }"
    />
  </div>
</template>

<style scoped>
.skeleton {
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.04) 25%,
    rgba(255, 255, 255, 0.08) 50%,
    rgba(255, 255, 255, 0.04) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

@media (prefers-reduced-motion: reduce) {
  .skeleton {
    animation: none;
    background: rgba(255, 255, 255, 0.06);
  }
}
</style>
