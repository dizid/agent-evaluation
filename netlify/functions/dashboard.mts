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
      orgInfo,
      scoreDrop,
      lowSafety,
      staleAgents
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
      `,

      // Anomaly: agents with >1pt score drop in last 5 evals vs prior 5
      sql`
        WITH recent AS (
          SELECT agent_id,
            AVG(overall) AS recent_avg,
            ROW_NUMBER() OVER (PARTITION BY agent_id ORDER BY created_at DESC) AS rn
          FROM evaluations
          WHERE org_id = ${ctx.orgId}
          GROUP BY agent_id, created_at
        ),
        agent_avgs AS (
          SELECT e.agent_id,
            AVG(CASE WHEN sub.rn <= 5 THEN e.overall END) AS recent_avg,
            AVG(CASE WHEN sub.rn > 5 AND sub.rn <= 10 THEN e.overall END) AS prior_avg
          FROM evaluations e
          JOIN (
            SELECT id, agent_id,
              ROW_NUMBER() OVER (PARTITION BY agent_id ORDER BY created_at DESC) AS rn
            FROM evaluations
            WHERE org_id = ${ctx.orgId} AND overall IS NOT NULL
          ) sub ON sub.id = e.id
          WHERE e.org_id = ${ctx.orgId}
          GROUP BY e.agent_id
          HAVING COUNT(*) >= 6
        )
        SELECT aa.agent_id, a.name, a.department,
               ROUND(aa.recent_avg::numeric, 1) AS recent_avg,
               ROUND(aa.prior_avg::numeric, 1) AS prior_avg,
               ROUND((aa.prior_avg - aa.recent_avg)::numeric, 1) AS drop_amount
        FROM agent_avgs aa
        JOIN agents a ON a.id = aa.agent_id AND a.org_id = ${ctx.orgId}
        WHERE aa.prior_avg IS NOT NULL
          AND (aa.prior_avg - aa.recent_avg) >= 1.0
          AND (a.status = 'active' OR a.status IS NULL)
        ORDER BY (aa.prior_avg - aa.recent_avg) DESC
        LIMIT 5
      `,

      // Anomaly: agents with safety score below 5 in latest eval
      sql`
        SELECT DISTINCT ON (e.agent_id)
          e.agent_id, a.name, a.department,
          (e.scores->>'safety')::numeric AS safety_score
        FROM evaluations e
        JOIN agents a ON a.id = e.agent_id AND a.org_id = e.org_id
        WHERE e.org_id = ${ctx.orgId}
          AND e.scores->>'safety' IS NOT NULL
          AND (e.scores->>'safety')::numeric < 5
          AND (a.status = 'active' OR a.status IS NULL)
        ORDER BY e.agent_id, e.created_at DESC
        LIMIT 5
      `,

      // Anomaly: stale agents (no evaluations in 14+ days)
      sql`
        SELECT a.id AS agent_id, a.name, a.department,
               MAX(e.created_at) AS last_eval_at,
               EXTRACT(DAY FROM NOW() - MAX(e.created_at))::int AS days_stale
        FROM agents a
        LEFT JOIN evaluations e ON e.agent_id = a.id AND e.org_id = a.org_id
        WHERE a.org_id = ${ctx.orgId}
          AND (a.status = 'active' OR a.status IS NULL)
        GROUP BY a.id, a.name, a.department
        HAVING MAX(e.created_at) IS NULL OR MAX(e.created_at) < NOW() - INTERVAL '14 days'
        ORDER BY MAX(e.created_at) ASC NULLS FIRST
        LIMIT 5
      `
    ])

    // Build alerts array from anomaly queries
    const alerts: Array<{ type: string; severity: string; agent_id: string; agent_name: string; department: string; message: string }> = []

    for (const row of scoreDrop) {
      alerts.push({
        type: 'score_drop',
        severity: Number(row.drop_amount) >= 2 ? 'critical' : 'warning',
        agent_id: row.agent_id,
        agent_name: row.name,
        department: row.department,
        message: `Score dropped ${row.drop_amount}pts (${row.prior_avg} → ${row.recent_avg})`
      })
    }

    for (const row of lowSafety) {
      alerts.push({
        type: 'low_safety',
        severity: 'critical',
        agent_id: row.agent_id,
        agent_name: row.name,
        department: row.department,
        message: `Safety score is ${row.safety_score}/10 in latest evaluation`
      })
    }

    for (const row of staleAgents) {
      alerts.push({
        type: 'stale',
        severity: 'info',
        agent_id: row.agent_id,
        agent_name: row.name,
        department: row.department,
        message: row.days_stale ? `No evaluations in ${row.days_stale} days` : 'Never evaluated'
      })
    }

    return json({
      organization: orgInfo[0] || null,
      stats: agentStats[0] || {},
      department_performance: deptPerformance,
      recent_evaluations: recentEvals,
      top_agents: topAgents,
      pending_action_items: actionItems[0]?.pending_count || 0,
      alerts
    }, 200, { 'Cache-Control': 'public, max-age=30' })
  } catch (err) {
    console.error('dashboard error:', err)
    return error('Failed to fetch dashboard data', 500)
  }
}

export const config: Config = {
  path: '/api/dashboard'
}
