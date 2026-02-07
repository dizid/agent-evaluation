import type { Config } from '@netlify/functions'
import { sql } from './utils/database.ts'
import { json, error, cors } from './utils/response.ts'

// POST /api/agents — Create a new agent
async function handleCreate(req: Request): Promise<Response> {
  try {
    const body = await req.json()
    const { id, name, department, role, persona, kpi_definitions, source_type, source_path, model } = body

    if (!id || !name || !department || !role) {
      return error('id, name, department, and role are required', 400)
    }

    // Validate id format (lowercase alphanumeric + hyphens)
    if (!/^[a-z0-9-]{2,50}$/.test(id)) {
      return error('id must be 2-50 lowercase alphanumeric characters or hyphens', 400)
    }

    // Check for duplicate
    const existing = await sql`SELECT id FROM agents WHERE id = ${id}`
    if (existing.length > 0) {
      return error('Agent ID already exists', 409)
    }

    const result = await sql`
      INSERT INTO agents (id, name, department, role, persona, kpi_definitions, source_type, source_path, model, status)
      VALUES (${id}, ${name}, ${department}, ${role}, ${persona || null}, ${JSON.stringify(kpi_definitions || [])}, ${source_type || 'manual'}, ${source_path || null}, ${model || null}, 'active')
      RETURNING *
    `

    return json({ agent: result[0] }, 201)
  } catch (err) {
    console.error('agents-create error:', err)
    return error('Failed to create agent', 500)
  }
}

// GET /api/agents — List agents with optional filters
async function handleList(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url)
    const department = url.searchParams.get('department')
    const minScore = url.searchParams.get('min_score')
    const sort = url.searchParams.get('sort') || 'name'
    const status = url.searchParams.get('status') // 'all' shows everything, default = active only

    // Validate min_score if provided
    if (minScore) {
      const parsed = parseFloat(minScore)
      if (isNaN(parsed)) return error('min_score must be a valid number', 400)
    }

    // Query with tagged template literals (neon driver requirement)
    let agents
    if (status === 'all') {
      // Show all agents including archived/fired (for Manage page)
      if (department) {
        agents = await sql`SELECT * FROM agents WHERE department = ${department}`
      } else {
        agents = await sql`SELECT * FROM agents`
      }
    } else if (department && minScore) {
      agents = await sql`
        SELECT * FROM agents
        WHERE (status = 'active' OR status IS NULL)
        AND department = ${department}
        AND overall_score >= ${parseFloat(minScore)}
      `
    } else if (department) {
      agents = await sql`
        SELECT * FROM agents WHERE (status = 'active' OR status IS NULL) AND department = ${department}
      `
    } else if (minScore) {
      agents = await sql`
        SELECT * FROM agents WHERE (status = 'active' OR status IS NULL) AND overall_score >= ${parseFloat(minScore)}
      `
    } else {
      agents = await sql`SELECT * FROM agents WHERE (status = 'active' OR status IS NULL)`
    }

    // Sort in JavaScript (simple and safe with 12 agents)
    const sorted = [...agents].sort((a: any, b: any) => {
      switch (sort) {
        case 'score':
          return (parseFloat(b.overall_score) || 0) - (parseFloat(a.overall_score) || 0)
        case 'department':
          return (a.department || '').localeCompare(b.department || '') ||
                 (a.name || '').localeCompare(b.name || '')
        case 'name':
        default:
          return (a.name || '').localeCompare(b.name || '')
      }
    })

    return json({ agents: sorted, total: sorted.length })
  } catch (err) {
    console.error('agents-list error:', err)
    return error('Failed to fetch agents', 500)
  }
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return cors()
  if (req.method === 'POST') return handleCreate(req)
  return handleList(req)
}

export const config: Config = {
  path: '/api/agents'
}
