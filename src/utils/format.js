// Format snake_case criterion key into readable label
export function formatLabel(key) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

// Format ISO date string to "Jan 15, 2025"
export function formatDate(dateString) {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// Format ISO date string to relative time ("2 days ago", "just now")
export function formatRelativeDate(dateString) {
  const now = Date.now()
  const then = new Date(dateString).getTime()
  const diffMs = now - then

  if (diffMs < 0) return 'just now'

  const seconds = Math.floor(diffMs / 1000)
  if (seconds < 60) return 'just now'

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return hours === 1 ? '1 hour ago' : `${hours} hours ago`

  const days = Math.floor(hours / 24)
  if (days < 7) return days === 1 ? '1 day ago' : `${days} days ago`

  const weeks = Math.floor(days / 7)
  if (weeks < 5) return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`

  const months = Math.floor(days / 30)
  if (months < 12) return months === 1 ? '1 month ago' : `${months} months ago`

  const years = Math.floor(days / 365)
  return years === 1 ? '1 year ago' : `${years} years ago`
}

// Format number with locale separators and fixed decimals
export function formatNumber(num, decimals = 1) {
  if (num == null || isNaN(num)) return '—'
  return Number(num).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })
}

// Truncate string with ellipsis if longer than maxLength
export function truncate(str, maxLength = 80) {
  if (!str || str.length <= maxLength) return str || ''
  return str.slice(0, maxLength - 3) + '...'
}

// Format score difference with sign prefix ("+0.3", "-1.2", "0.0")
export function formatScoreChange(current, previous) {
  if (current == null || previous == null) return null
  const diff = Number(current) - Number(previous)
  const sign = diff > 0 ? '+' : ''
  return `${sign}${diff.toFixed(1)}`
}
