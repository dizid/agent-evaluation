import { createApp } from 'vue'
import { clerkPlugin } from '@clerk/vue'
import App from './App.vue'
import router from './router'
import './assets/tailwind.css'

const app = createApp(App)

// Clerk authentication
app.use(clerkPlugin, {
  publishableKey: import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
})

app.use(router)
app.mount('#app')
