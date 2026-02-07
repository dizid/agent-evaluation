const API_BASE = '/api'

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

// Agents
export const getAgents = (params = {}) => {
  const query = new URLSearchParams(params).toString()
  return request(`/agents${query ? `?${query}` : ''}`)
}

export const getAgent = (id) => request(`/agents/${id}`)

export const getAgentEvaluations = (id) => request(`/agents/${id}/evaluations`)

// Evaluations
export const submitEvaluation = (data) => request('/evaluations', {
  method: 'POST',
  body: JSON.stringify(data)
})

// Leaderboard
export const getLeaderboard = (params = {}) => {
  const query = new URLSearchParams(params).toString()
  return request(`/leaderboard${query ? `?${query}` : ''}`)
}

// Criteria
export const getCriteria = (params = {}) => {
  const query = new URLSearchParams(params).toString()
  return request(`/criteria${query ? `?${query}` : ''}`)
}

// Categories
export const getCategories = () => request('/categories')

// Agent Management
export const createAgent = (data) => request('/agents', {
  method: 'POST',
  body: JSON.stringify(data)
})

export const updateAgent = (id, data) => request(`/agents/${id}`, {
  method: 'PUT',
  body: JSON.stringify(data)
})

export const updateAgentStatus = (id, status) => request(`/agents/${id}`, {
  method: 'PATCH',
  body: JSON.stringify({ status })
})

export const getActionItems = (id) => request(`/agents/${id}?include=action_items`)
