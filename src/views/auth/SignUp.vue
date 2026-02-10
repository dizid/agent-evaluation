<script setup>
import { SignUp } from '@clerk/vue'
</script>

<template>
  <div class="flex items-center justify-center min-h-[70vh] px-4">
    <div class="w-full max-w-md">
      <h1 class="text-2xl font-bold text-text-primary text-center mb-6">Create Your Account</h1>
      <SignUp
        :routing="'path'"
        :path="'/sign-up'"
        :sign-in-url="'/sign-in'"
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
