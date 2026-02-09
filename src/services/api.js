const API_BASE = '/api'

// --- Cache layer ---
const cache = new Map()
const DEFAULT_TTL = 5 * 60 * 1000 // 5 minutes

// Track in-flight GET requests for deduplication
const inflight = new Map()

function getCacheKey(url) {
  return url
}

function getCached(key) {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expires) {
    cache.delete(key)
    return null
  }
  return entry.data
}

function setCache(key, data, ttl = DEFAULT_TTL) {
  cache.set(key, { data, expires: Date.now() + ttl })
}

// Clear cache entries whose keys contain the pattern string
export function invalidateCache(urlPattern) {
  for (const key of cache.keys()) {
    if (key.includes(urlPattern)) {
      cache.delete(key)
    }
  }
}

// --- Core request helpers ---

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(error.error || `API error: ${res.status}`)
  }
  return res.json()
}

// Cached + deduplicated GET request
function fetchWithCache(path, options = {}, ttl = DEFAULT_TTL) {
  const url = `${API_BASE}${path}`
  const key = getCacheKey(url)

  // Return cached data if fresh
  const cached = getCached(key)
  if (cached) return Promise.resolve(cached)

  // Deduplicate: if same request is in-flight, return existing promise
  if (inflight.has(key)) return inflight.get(key)

  const promise = request(path, options)
    .then(data => {
      setCache(key, data, ttl)
      inflight.delete(key)
      return data
    })
    .catch(err => {
      inflight.delete(key)
      throw err
    })

  inflight.set(key, promise)
  return promise
}

// --- Agents ---

export const getAgents = (params = {}) => {
  const query = new URLSearchParams(params).toString()
  return fetchWithCache(`/agents${query ? `?${query}` : ''}`)
}

export const getAgent = (id) => fetchWithCache(`/agents/${id}`)

export const getAgentEvaluations = (id) => fetchWithCache(`/agents/${id}/evaluations`)

// --- Evaluations ---

export const submitEvaluation = (data) => {
  const agentId = data.agent_id
  return request('/evaluations', {
    method: 'POST',
    body: JSON.stringify(data)
  }).then(result => {
    // Invalidate caches that depend on evaluation data
    invalidateCache('/agents')
    invalidateCache('/leaderboard')
    invalidateCache('/categories')
    if (agentId) invalidateCache(`/agents/${agentId}`)
    return result
  })
}

// --- Leaderboard ---

export const getLeaderboard = (params = {}) => {
  const query = new URLSearchParams(params).toString()
  return fetchWithCache(`/leaderboard${query ? `?${query}` : ''}`)
}

// --- Criteria ---

export const getCriteria = (params = {}) => {
  const query = new URLSearchParams(params).toString()
  return fetchWithCache(`/criteria${query ? `?${query}` : ''}`)
}

// --- Categories ---

export const getCategories = () => fetchWithCache('/categories')

// --- Agent Management ---

export const createAgent = (data) => {
  return request('/agents', {
    method: 'POST',
    body: JSON.stringify(data)
  }).then(result => {
    invalidateCache('/agents')
    invalidateCache('/categories')
    return result
  })
}

export const updateAgent = (id, data) => {
  return request(`/agents/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }).then(result => {
    invalidateCache('/agents')
    invalidateCache(`/agents/${id}`)
    invalidateCache('/leaderboard')
    return result
  })
}

export const updateAgentStatus = (id, status) => {
  return request(`/agents/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  }).then(result => {
    invalidateCache('/agents')
    invalidateCache(`/agents/${id}`)
    invalidateCache('/leaderboard')
    invalidateCache('/categories')
    return result
  })
}

export const getActionItems = (id) => fetchWithCache(`/agents/${id}?include=action_items`)
