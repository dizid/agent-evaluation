import { ref } from 'vue'

const toasts = ref([])
let nextId = 0

export function useToast() {
  function show(message, type = 'success', duration = 4000) {
    const id = nextId++
    toasts.value.push({ id, message, type, visible: true })

    if (duration > 0) {
      setTimeout(() => dismiss(id), duration)
    }
    return id
  }

  function dismiss(id) {
    const toast = toasts.value.find(t => t.id === id)
    if (toast) {
      toast.visible = false
      setTimeout(() => {
        toasts.value = toasts.value.filter(t => t.id !== id)
      }, 300) // allow exit animation
    }
  }

  function success(message, duration) { return show(message, 'success', duration) }
  function error(message, duration) { return show(message, 'error', duration ?? 6000) }
  function warning(message, duration) { return show(message, 'warning', duration) }
  function info(message, duration) { return show(message, 'info', duration) }

  return { toasts, show, dismiss, success, error, warning, info }
}
