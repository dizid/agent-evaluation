const API_BASE = '/api'

// --- Auth token + org context ---
let _getToken = null
let _getOrgSlug = null

// Called once from App.vue to wire up auth
export function setAuthProvider(getToken, getOrgSlug) {
  _getToken = getToken
  _getOrgSlug = getOrgSlug
}

async function authHeaders() {
  const headers = { 'Content-Type': 'application/json' }
  if (_getToken) {
    const token = await _getToken()
    if (token) headers['Authorization'] = `Bearer ${token}`
  }
  if (_getOrgSlug) {
    const slug = _getOrgSlug()
    if (slug) headers['X-Org-Slug'] = slug
  }
  return headers
}

// --- Cache layer ---
const cache = new Map()
const DEFAULT_TTL = 5 * 60 * 1000 // 5 minutes

// Track in-flight GET requests for deduplication
const inflight = new Map()

function getCacheKey(url) {
  // Include org slug in cache key so org-switching invalidates
  const slug = _getOrgSlug ? _getOrgSlug() : ''
  return `${slug}:${url}`
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

// Clear all cache (used on org switch)
export function clearAllCache() {
  cache.clear()
  inflight.clear()
}

// --- Core request helpers ---

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`
  const headers = await authHeaders()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30000)
  let res
  try {
    res = await fetch(url, {
      headers: { ...headers, ...options.headers },
      signal: controller.signal,
      ...options
    })
  } catch (err) {
    clearTimeout(timeout)
    if (err.name === 'AbortError') throw new Error('Request timed out')
    throw err
  }
  clearTimeout(timeout)
  if (!res.ok) {
    if (res.status === 401) {
      // Token expired or invalid — let Clerk handle re-auth
      window.dispatchEvent(new CustomEvent('auth:expired'))
    }
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

export const markActionItemApplied = (agentId, evalId) => {
  return request(`/agents/${agentId}?action=apply_item&eval_id=${evalId}`, {
    method: 'PUT'
  }).then(result => {
    invalidateCache(`/agents/${agentId}`)
    return result
  })
}

export const markActionItemUnapplied = (agentId, evalId) => {
  return request(`/agents/${agentId}?action=unapply_item&eval_id=${evalId}`, {
    method: 'PUT'
  }).then(result => {
    invalidateCache(`/agents/${agentId}`)
    return result
  })
}

// --- Organizations ---

export const getOrganizations = () => fetchWithCache('/organizations')

export const getOrganization = (slug) => fetchWithCache(`/organizations/${slug}`)

export const createOrganization = (data) => {
  return request('/organizations', {
    method: 'POST',
    body: JSON.stringify(data)
  }).then(result => {
    invalidateCache('/organizations')
    return result
  })
}

export const updateOrganization = (slug, data) => {
  return request(`/organizations/${slug}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }).then(result => {
    invalidateCache('/organizations')
    invalidateCache(`/organizations/${slug}`)
    return result
  })
}

// --- Organization Members ---

export const getOrgMembers = (slug) => fetchWithCache(`/organizations/${slug}/members`)

export const inviteMember = (slug, data) => {
  return request(`/organizations/${slug}/members`, {
    method: 'POST',
    body: JSON.stringify(data)
  }).then(result => {
    invalidateCache(`/organizations/${slug}/members`)
    return result
  })
}

export const removeMember = (slug, userId) => {
  return request(`/organizations/${slug}/members/${userId}`, {
    method: 'DELETE'
  }).then(result => {
    invalidateCache(`/organizations/${slug}/members`)
    return result
  })
}

export const updateMemberRole = (slug, userId, role) => {
  return request(`/organizations/${slug}/members/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify({ role })
  }).then(result => {
    invalidateCache(`/organizations/${slug}/members`)
    return result
  })
}

// --- Departments ---

export const getDepartments = () => fetchWithCache('/departments')

export const createDepartment = (data) => {
  return request('/departments', {
    method: 'POST',
    body: JSON.stringify(data)
  }).then(result => {
    invalidateCache('/departments')
    return result
  })
}

export const updateDepartment = (id, data) => {
  return request(`/departments/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }).then(result => {
    invalidateCache('/departments')
    return result
  })
}

export const deleteDepartment = (id) => {
  return request(`/departments/${id}`, {
    method: 'DELETE'
  }).then(result => {
    invalidateCache('/departments')
    return result
  })
}

// --- Marketplace ---

export const getMarketplaceTemplates = (params = {}) => {
  const query = new URLSearchParams(params).toString()
  return fetchWithCache(`/marketplace${query ? `?${query}` : ''}`)
}

export const getMarketplaceTemplate = (id) => fetchWithCache(`/marketplace/${id}`)

export const installTemplate = (templateId, customization = {}) => {
  return request(`/marketplace/${templateId}?action=install`, {
    method: 'POST',
    body: JSON.stringify(customization)
  }).then(result => {
    invalidateCache('/agents')
    invalidateCache('/marketplace')
    return result
  })
}

export const submitTemplateReview = (templateId, data) => {
  return request(`/marketplace/${templateId}?action=review`, {
    method: 'POST',
    body: JSON.stringify(data)
  }).then(result => {
    invalidateCache(`/marketplace/${templateId}`)
    return result
  })
}

// --- Dashboard ---

export const getDashboardStats = () => fetchWithCache('/dashboard', {}, 2 * 60 * 1000) // 2 min TTL

// --- User Profile ---

export const getUserProfile = () => fetchWithCache('/users/me')

export const updateUserProfile = (data) => {
  return request('/users/me', {
    method: 'PUT',
    body: JSON.stringify(data)
  }).then(result => {
    invalidateCache('/users/me')
    return result
  })
}
