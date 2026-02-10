<script setup>
import { UserProfile } from '@clerk/vue'
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 py-8">
    <h1 class="text-3xl font-bold text-text-primary mb-6">User Profile</h1>
    <div class="glass-card p-8">
      <UserProfile
        :appearance="{
          variables: {
            colorPrimary: '#7c3aed',
            colorBackground: '#0f1419',
            colorInputBackground: '#1a1f2e',
            colorInputText: '#ffffff',
            borderRadius: '0.75rem'
          }
        }"
      />
    </div>
  </div>
</template>
