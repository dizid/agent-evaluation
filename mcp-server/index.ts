#!/usr/bin/env node

/**
 * AgentEval MCP Server
 *
 * Exposes 6 tools for querying and rating AI agents via the hirefire.dev REST API.
 * Runs as a stdio MCP server — meant to be registered in ~/.claude/settings.json.
 *
 * Auth: HIREFIRE_SERVICE_KEY env var → X-Service-Key header
 * Base: HIREFIRE_API_BASE env var (default https://hirefire.dev)
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'

const API_BASE = process.env.HIREFIRE_API_BASE || 'https://hirefire.dev'
const SERVICE_KEY = process.env.HIREFIRE_SERVICE_KEY

if (!SERVICE_KEY) {
  console.error('HIREFIRE_SERVICE_KEY environment variable is required')
  process.exit(1)
}

// ---------- HTTP helpers ----------

async function apiGet(path: string): Promise<any> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'X-Service-Key': SERVICE_KEY!,
      'Accept': 'application/json'
    }
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`API ${res.status}: ${text}`)
  }
  return res.json()
}

async function apiPost(path: string, body: Record<string, any>): Promise<any> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'X-Service-Key': SERVICE_KEY!,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(body)
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`API ${res.status}: ${text}`)
  }
  return res.json()
}

// ---------- Tool helpers ----------

function formatAgent(a: any): string {
  const score = a.overall_score ? `${Number(a.overall_score).toFixed(1)}/10` : 'unrated'
  const trend = a.trend === 'up' ? ' ↑' : a.trend === 'down' ? ' ↓' : ''
  const evals = a.eval_count ? ` (${a.eval_count} evals)` : ''
  return `@${a.name} [${a.department}] — ${a.role} — ${score}${trend}${evals}`
}

function formatScores(scores: Record<string, number>): string {
  return Object.entries(scores)
    .map(([k, v]) => `  ${k}: ${v}/10`)
    .join('\n')
}

// ---------- MCP Server setup ----------

const server = new McpServer({
  name: 'agenteval',
  version: '1.0.0'
})

// Tool 1: search_agents
server.tool(
  'search_agents',
  'Search for agents by department, keyword, or minimum score. Returns a list of matching agents with their scores and trends.',
  {
    department: z.string().optional().describe('Filter by department name (e.g. "Development", "Marketing")'),
    keyword: z.string().optional().describe('Search keyword to match agent name or role'),
    min_score: z.number().optional().describe('Minimum overall score (1-10)')
  },
  async ({ department, keyword, min_score }) => {
    try {
      const params = new URLSearchParams()
      if (department) params.set('department', department)
      if (min_score) params.set('min_score', String(min_score))
      params.set('sort', 'score')

      const data = await apiGet(`/api/agents?${params}`)
      let agents = data.agents || []

      // Client-side keyword filter (API doesn't support keyword search)
      if (keyword) {
        const kw = keyword.toLowerCase()
        agents = agents.filter((a: any) =>
          a.name?.toLowerCase().includes(kw) ||
          a.role?.toLowerCase().includes(kw) ||
          a.department?.toLowerCase().includes(kw)
        )
      }

      if (agents.length === 0) {
        return { content: [{ type: 'text' as const, text: 'No agents found matching your criteria.' }] }
      }

      const lines = agents.map(formatAgent)
      const text = `Found ${agents.length} agent(s):\n\n${lines.join('\n')}`
      return { content: [{ type: 'text' as const, text }] }
    } catch (err: any) {
      return { content: [{ type: 'text' as const, text: `Error: ${err.message}` }], isError: true }
    }
  }
)

// Tool 2: get_agent_scorecard
server.tool(
  'get_agent_scorecard',
  'Get a detailed scorecard for a specific agent including their profile, latest evaluation scores, reasoning, and pending action items.',
  {
    agent_id: z.string().describe('Agent ID (e.g. "fullstack", "content", "risk-quant")')
  },
  async ({ agent_id }) => {
    try {
      // Fetch agent detail + action items in parallel
      const [detail, actionData] = await Promise.all([
        apiGet(`/api/agents/${agent_id}`),
        apiGet(`/api/agents/${agent_id}?include=action_items`)
      ])

      const agent = detail.agent
      const latestEval = detail.latest_evaluation
      const actionItems = actionData.action_items || []

      const sections: string[] = []

      // Agent profile
      sections.push(`# @${agent.name}`)
      sections.push(`Department: ${agent.department}`)
      sections.push(`Role: ${agent.role}`)
      sections.push(`Status: ${agent.status || 'active'}`)
      sections.push(`Overall Score: ${agent.overall_score ? Number(agent.overall_score).toFixed(1) : 'unrated'}/10`)
      if (agent.rating_label) sections.push(`Rating: ${agent.rating_label}`)
      if (agent.confidence) sections.push(`Confidence: ${agent.confidence}`)
      if (agent.trend) sections.push(`Trend: ${agent.trend === 'up' ? '↑ Improving' : agent.trend === 'down' ? '↓ Declining' : '→ Stable'}`)
      sections.push(`Evaluations: ${agent.eval_count || 0}`)

      // Latest evaluation
      if (latestEval) {
        sections.push('')
        sections.push('## Latest Evaluation')
        sections.push(`Date: ${new Date(latestEval.created_at).toLocaleDateString()}`)
        sections.push(`Overall: ${Number(latestEval.overall).toFixed(1)}/10`)
        sections.push(`Type: ${latestEval.evaluator_type}`)
        if (latestEval.scores) {
          sections.push('Scores:')
          sections.push(formatScores(latestEval.scores))
        }
        if (latestEval.top_strength) sections.push(`Strength: ${latestEval.top_strength}`)
        if (latestEval.top_weakness) sections.push(`Weakness: ${latestEval.top_weakness}`)
        if (latestEval.reasoning) {
          sections.push('')
          sections.push('## Reasoning')
          sections.push(latestEval.reasoning)
        }
      }

      // Pending action items
      const pending = actionItems.filter((i: any) => !i.applied)
      if (pending.length > 0) {
        sections.push('')
        sections.push(`## Pending Action Items (${pending.length})`)
        for (const item of pending.slice(0, 5)) {
          sections.push(`- ${item.action_item}`)
        }
      }

      // KPIs
      if (agent.kpi_definitions?.length) {
        sections.push('')
        sections.push('## Role KPIs')
        for (const kpi of agent.kpi_definitions) {
          sections.push(`- ${kpi}`)
        }
      }

      return { content: [{ type: 'text' as const, text: sections.join('\n') }] }
    } catch (err: any) {
      return { content: [{ type: 'text' as const, text: `Error: ${err.message}` }], isError: true }
    }
  }
)

// Tool 3: get_leaderboard
server.tool(
  'get_leaderboard',
  'Get the agent leaderboard with rankings and department averages. Optionally filter by department.',
  {
    department: z.string().optional().describe('Filter by department name')
  },
  async ({ department }) => {
    try {
      const params = department ? `?department=${encodeURIComponent(department)}` : ''
      const data = await apiGet(`/api/leaderboard${params}`)
      const agents = data.agents || []
      const deptAvgs = data.department_averages || []

      const sections: string[] = []

      // Department averages
      if (deptAvgs.length > 0 && !department) {
        sections.push('## Department Averages')
        for (const d of deptAvgs) {
          sections.push(`  ${d.department}: ${Number(d.avg_score).toFixed(1)}/10 (${d.agent_count} agents, ${d.total_evals} evals)`)
        }
        sections.push('')
      }

      // Rankings
      sections.push(department ? `## ${department} Rankings` : '## Overall Rankings')
      if (agents.length === 0) {
        sections.push('No ranked agents found.')
      } else {
        agents.forEach((a: any, i: number) => {
          const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`
          const score = a.overall_score ? Number(a.overall_score).toFixed(1) : '—'
          const trend = a.trend === 'up' ? ' ↑' : a.trend === 'down' ? ' ↓' : ''
          sections.push(`  ${medal} @${a.name} — ${score}/10${trend} [${a.department}]`)
        })
      }

      return { content: [{ type: 'text' as const, text: sections.join('\n') }] }
    } catch (err: any) {
      return { content: [{ type: 'text' as const, text: `Error: ${err.message}` }], isError: true }
    }
  }
)

// Tool 4: get_dashboard_alerts
server.tool(
  'get_dashboard_alerts',
  'Get dashboard alerts and organization stats. Shows score drops, safety issues, stale agents, and overall org health.',
  {},
  async () => {
    try {
      const data = await apiGet('/api/dashboard')
      const stats = data.stats || {}
      const alerts = data.alerts || []
      const pending = data.pending_action_items || 0

      const sections: string[] = []

      // Org stats
      sections.push('## Organization Overview')
      if (data.organization) sections.push(`Org: ${data.organization.name} (${data.organization.plan_tier})`)
      sections.push(`Active Agents: ${stats.active_agents || 0}`)
      sections.push(`Average Score: ${stats.avg_score ? Number(stats.avg_score).toFixed(1) : '—'}/10`)
      sections.push(`Total Evaluations: ${stats.total_evaluations || 0}`)
      sections.push(`Pending Action Items: ${pending}`)

      // Alerts
      if (alerts.length > 0) {
        sections.push('')
        sections.push(`## Alerts (${alerts.length})`)
        for (const alert of alerts) {
          const icon = alert.severity === 'critical' ? '🔴' : alert.severity === 'warning' ? '🟡' : '🔵'
          sections.push(`${icon} @${alert.agent_name}: ${alert.message}`)
        }
      } else {
        sections.push('')
        sections.push('No alerts — all agents performing normally.')
      }

      return { content: [{ type: 'text' as const, text: sections.join('\n') }] }
    } catch (err: any) {
      return { content: [{ type: 'text' as const, text: `Error: ${err.message}` }], isError: true }
    }
  }
)

// Tool 5: rate_agent
server.tool(
  'rate_agent',
  'Submit an evaluation for an agent. Requires scores for universal criteria (task_completion, accuracy, efficiency, judgment, communication, domain_expertise, autonomy, safety) as integers 1-10.',
  {
    agent_id: z.string().describe('Agent ID to evaluate'),
    scores: z.record(z.number().int().min(1).max(10)).describe('Criterion scores as key-value pairs (e.g. {"task_completion": 7, "accuracy": 8, ...})'),
    task_description: z.string().optional().describe('Brief description of the task being evaluated'),
    top_strength: z.string().optional().describe('Agent\'s top strength in this task'),
    top_weakness: z.string().optional().describe('Agent\'s top weakness in this task'),
    action_item: z.string().optional().describe('One specific improvement action for the agent'),
    reasoning: z.string().optional().describe('Chain-of-thought reasoning for the scores'),
    project: z.string().optional().describe('Project name/identifier'),
    evaluator_type: z.string().optional().describe('Type of evaluator: "manual" or "auto" (default: "auto")')
  },
  async ({ agent_id, scores, task_description, top_strength, top_weakness, action_item, reasoning, project, evaluator_type }) => {
    try {
      const body: Record<string, any> = {
        agent_id,
        scores,
        evaluator_type: evaluator_type || 'auto'
      }
      if (task_description) body.task_description = task_description
      if (top_strength) body.top_strength = top_strength
      if (top_weakness) body.top_weakness = top_weakness
      if (action_item) body.action_item = action_item
      if (reasoning) body.reasoning = reasoning
      if (project) body.project = project

      const data = await apiPost('/api/evaluations', body)
      const eval_ = data.evaluation
      const summary = data.agent_summary

      const sections: string[] = []
      sections.push(`Evaluation submitted for @${agent_id}`)
      sections.push(`Score: ${Number(eval_.overall).toFixed(1)}/10 (${eval_.rating_label})`)
      sections.push(`Weight: ${eval_.weight}`)
      sections.push('')
      sections.push('Updated Agent Summary:')
      sections.push(`  Overall: ${Number(summary.overall_score).toFixed(1)}/10`)
      sections.push(`  Rating: ${summary.rating_label}`)
      sections.push(`  Confidence: ${summary.confidence}`)
      sections.push(`  Trend: ${summary.trend}`)
      sections.push(`  Total Evals: ${summary.eval_count}`)

      return { content: [{ type: 'text' as const, text: sections.join('\n') }] }
    } catch (err: any) {
      return { content: [{ type: 'text' as const, text: `Error: ${err.message}` }], isError: true }
    }
  }
)

// Tool 6: get_recommendations
server.tool(
  'get_recommendations',
  'Get agent recommendations for a specific task. Analyzes all agents and returns the top 3-5 best suited for the described task, ranked by relevance and score.',
  {
    task_description: z.string().describe('Description of the task you need help with')
  },
  async ({ task_description }) => {
    try {
      const data = await apiGet('/api/agents?sort=score')
      const agents = data.agents || []

      if (agents.length === 0) {
        return { content: [{ type: 'text' as const, text: 'No agents available.' }] }
      }

      // Simple keyword matching for relevance scoring
      const taskWords = task_description.toLowerCase().split(/\s+/)

      const scored = agents.map((a: any) => {
        let relevance = 0
        const searchable = `${a.name} ${a.role} ${a.department} ${(a.kpi_definitions || []).join(' ')}`.toLowerCase()

        for (const word of taskWords) {
          if (word.length < 3) continue
          if (searchable.includes(word)) relevance += 1
        }

        // Boost agents with higher scores slightly
        const scoreBoost = a.overall_score ? Number(a.overall_score) / 20 : 0

        return { ...a, relevance: relevance + scoreBoost }
      })

      // Sort by relevance desc, then score desc
      scored.sort((a: any, b: any) => b.relevance - a.relevance || Number(b.overall_score || 0) - Number(a.overall_score || 0))

      const top = scored.slice(0, 5)
      const sections: string[] = []
      sections.push(`## Recommended Agents for: "${task_description}"`)
      sections.push('')

      for (let i = 0; i < top.length; i++) {
        const a = top[i]
        const score = a.overall_score ? `${Number(a.overall_score).toFixed(1)}/10` : 'unrated'
        const trend = a.trend === 'up' ? ' ↑' : a.trend === 'down' ? ' ↓' : ''
        sections.push(`${i + 1}. @${a.name} — ${score}${trend}`)
        sections.push(`   ${a.role} [${a.department}]`)
        if (a.relevance > 0) {
          sections.push(`   Relevance: ${'★'.repeat(Math.min(Math.floor(a.relevance), 5))}`)
        }
        sections.push('')
      }

      return { content: [{ type: 'text' as const, text: sections.join('\n') }] }
    } catch (err: any) {
      return { content: [{ type: 'text' as const, text: `Error: ${err.message}` }], isError: true }
    }
  }
)

// ---------- Start server ----------

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('AgentEval MCP server running on stdio')
}

main().catch((err) => {
  console.error('Failed to start MCP server:', err)
  process.exit(1)
})
