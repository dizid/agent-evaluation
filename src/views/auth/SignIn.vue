<script setup>
import { SignIn } from '@clerk/vue'
</script>

<template>
  <div class="flex items-center justify-center min-h-[70vh] px-4">
    <div class="w-full max-w-md">
      <h1 class="text-2xl font-bold text-text-primary text-center mb-6">Sign In to AgentEval</h1>
      <SignIn
        :routing="'path'"
        :path="'/sign-in'"
        :sign-up-url="'/sign-up'"
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
