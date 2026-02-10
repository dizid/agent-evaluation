import type { Config } from '@netlify/functions'
import { sql } from './utils/database.ts'
import { json, error, cors } from './utils/response.ts'
import { authenticate } from './utils/auth.ts'

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return cors()

  const ctx = await authenticate(req)
  if (ctx instanceof Response) return ctx

  try {
    // Run all dashboard queries in parallel for speed
    const [
      agentStats,
      deptPerformance,
      recentEvals,
      topAgents,
      actionItems,
      orgInfo
    ] = await Promise.all([
      // Overall agent stats
      sql`
        SELECT
          COUNT(*)::int AS total_agents,
          COUNT(*) FILTER (WHERE status = 'active' OR status IS NULL)::int AS active_agents,
          COUNT(*) FILTER (WHERE status = 'archived')::int AS archived_agents,
          COUNT(*) FILTER (WHERE status = 'fired')::int AS fired_agents,
          ROUND(AVG(overall_score) FILTER (WHERE status = 'active' OR status IS NULL), 1) AS avg_score,
          SUM(eval_count) FILTER (WHERE status = 'active' OR status IS NULL)::int AS total_evaluations
        FROM agents
        WHERE org_id = ${ctx.orgId}
      `,

      // Department performance breakdown
      sql`
        SELECT
          department,
          COUNT(*)::int AS agent_count,
          ROUND(AVG(overall_score)::numeric, 1) AS avg_score,
          SUM(eval_count)::int AS eval_count,
          COUNT(*) FILTER (WHERE trend = 'up')::int AS trending_up,
          COUNT(*) FILTER (WHERE trend = 'down')::int AS trending_down
        FROM agents
        WHERE org_id = ${ctx.orgId}
          AND (status = 'active' OR status IS NULL)
          AND overall_score IS NOT NULL
        GROUP BY department
        ORDER BY avg_score DESC
      `,

      // Recent evaluations (last 10)
      sql`
        SELECT e.id, e.agent_id, a.name AS agent_name, a.department,
               e.overall, e.rating_label, e.evaluator_type, e.created_at,
               e.top_strength, e.top_weakness
        FROM evaluations e
        JOIN agents a ON a.id = e.agent_id AND a.org_id = e.org_id
        WHERE e.org_id = ${ctx.orgId}
        ORDER BY e.created_at DESC
        LIMIT 10
      `,

      // Top 5 agents by score
      sql`
        SELECT id, name, department, role, overall_score, rating_label, trend, eval_count
        FROM agents
        WHERE org_id = ${ctx.orgId}
          AND (status = 'active' OR status IS NULL)
          AND overall_score IS NOT NULL
        ORDER BY overall_score DESC
        LIMIT 5
      `,

      // Pending action items count
      sql`
        SELECT COUNT(*)::int AS pending_count
        FROM evaluations e
        JOIN agents a ON a.id = e.agent_id AND a.org_id = e.org_id
        WHERE e.org_id = ${ctx.orgId}
          AND e.action_item IS NOT NULL
          AND (e.applied = false OR e.applied IS NULL)
          AND (a.status = 'active' OR a.status IS NULL)
      `,

      // Org info
      sql`
        SELECT o.name, o.slug, o.plan_tier, o.agent_limit,
               (SELECT COUNT(*)::int FROM org_members WHERE org_id = o.id) AS member_count
        FROM organizations o
        WHERE o.id = ${ctx.orgId}
      `
    ])

    return json({
      organization: orgInfo[0] || null,
      stats: agentStats[0] || {},
      department_performance: deptPerformance,
      recent_evaluations: recentEvals,
      top_agents: topAgents,
      pending_action_items: actionItems[0]?.pending_count || 0
    }, 200, { 'Cache-Control': 'public, max-age=30' })
  } catch (err) {
    console.error('dashboard error:', err)
    return error('Failed to fetch dashboard data', 500)
  }
}

export const config: Config = {
  path: '/api/dashboard'
}
