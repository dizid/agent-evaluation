import { verifyToken } from '@clerk/backend'
import { sql } from './database.ts'
import { error } from './response.ts'

// Auth context returned to handlers after verification
export interface AuthContext {
  userId: string       // Internal UUID from users table
  clerkUserId: string  // Clerk's user ID
  orgId: string        // Internal UUID from organizations table
  orgSlug: string      // Organization slug for URLs
  userRole: 'owner' | 'admin' | 'evaluator' | 'viewer'
}

// Role hierarchy for permission checks
const ROLE_HIERARCHY: Record<string, number> = {
  viewer: 0,
  evaluator: 1,
  admin: 2,
  owner: 3
}

/**
 * Authenticate a request and return the auth context.
 * Returns an AuthContext on success, or a Response (401/403) on failure.
 *
 * Supports two auth methods:
 * 1. Clerk JWT via Authorization: Bearer <token>
 * 2. Service key via X-Service-Key header (for machine-to-machine, e.g., auto-eval hook)
 *
 * Usage in handlers:
 *   const ctx = await authenticate(req)
 *   if (ctx instanceof Response) return ctx
 *   // ctx is AuthContext — use ctx.orgId to scope queries
 */
export async function authenticate(req: Request): Promise<AuthContext | Response> {
  // Check for service key (machine-to-machine, e.g., auto-eval hook)
  const serviceKey = req.headers.get('X-Service-Key')
  if (serviceKey && process.env.SERVICE_KEY && serviceKey === process.env.SERVICE_KEY) {
    const org = await sql`SELECT id, slug FROM organizations WHERE slug = 'dizid' LIMIT 1`
    if (org.length === 0) return error('Service org not found', 500)
    return {
      userId: 'a0000001-0000-0000-0000-000000000001',
      clerkUserId: 'service',
      orgId: org[0].id,
      orgSlug: org[0].slug,
      userRole: 'admin' as const
    }
  }

  // Extract JWT from Authorization header
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return error('Authentication required', 401)
  }

  const token = authHeader.slice(7)
  if (!token) {
    return error('Authentication required', 401)
  }

  // Verify JWT with Clerk
  let clerkUserId: string
  try {
    const verified = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY!,
      authorizedParties: ['http://localhost:3000', 'https://hirefire.dev']
    })
    clerkUserId = verified.sub
  } catch (err) {
    console.error('Clerk token verification failed:', err)
    return error('Invalid or expired token', 401)
  }

  // Look up user in our database
  let users = await sql`
    SELECT id FROM users WHERE clerk_user_id = ${clerkUserId}
  `
  if (users.length === 0) {
    // User exists in Clerk but not in our DB yet — create on the fly
    // (webhook may not have fired yet, especially in dev)
    users = await sql`
      INSERT INTO users (clerk_user_id, email, full_name)
      VALUES (${clerkUserId}, '', '')
      ON CONFLICT (clerk_user_id) DO UPDATE SET last_seen_at = NOW()
      RETURNING id
    `
    if (users.length === 0) {
      return error('User setup failed', 500)
    }
  }

  const userId = users[0].id

  // Determine org context from X-Org-Slug header or default to first org
  const orgSlug = req.headers.get('X-Org-Slug')
  let org: { id: string; slug: string; role: string } | null = null

  if (orgSlug) {
    // Look up specific org + verify membership
    const rows = await sql`
      SELECT o.id, o.slug, om.role
      FROM organizations o
      JOIN org_members om ON om.org_id = o.id
      WHERE o.slug = ${orgSlug} AND om.user_id = ${userId}
    `
    if (rows.length > 0) {
      org = { id: rows[0].id, slug: rows[0].slug, role: rows[0].role }
    }
  }

  if (!org) {
    // Fall back to user's first org (by join date)
    const rows = await sql`
      SELECT o.id, o.slug, om.role
      FROM organizations o
      JOIN org_members om ON om.org_id = o.id
      WHERE om.user_id = ${userId}
      ORDER BY om.joined_at ASC
      LIMIT 1
    `
    if (rows.length > 0) {
      org = { id: rows[0].id, slug: rows[0].slug, role: rows[0].role }
    }
  }

  if (!org) {
    // User has no org — needs onboarding
    return error('No organization found. Please create one.', 403)
  }

  // Update last_seen_at (fire-and-forget, don't block response)
  sql`UPDATE users SET last_seen_at = NOW() WHERE id = ${userId}`.catch(() => {})

  return {
    userId,
    clerkUserId,
    orgId: org.id,
    orgSlug: org.slug,
    userRole: org.role as AuthContext['userRole']
  }
}

/**
 * Check if the user's role meets the minimum required level.
 *
 * Usage:
 *   if (!authorize(ctx, 'admin')) return error('Forbidden', 403)
 */
export function authorize(ctx: AuthContext, requiredRole: 'viewer' | 'evaluator' | 'admin' | 'owner'): boolean {
  return (ROLE_HIERARCHY[ctx.userRole] ?? -1) >= (ROLE_HIERARCHY[requiredRole] ?? 99)
}

/**
 * Optional auth — returns AuthContext if authenticated, null if not.
 * Use for endpoints that work both with and without auth (e.g., marketplace browse).
 */
export async function optionalAuth(req: Request): Promise<AuthContext | null> {
  const authHeader = req.headers.get('Authorization')
  const serviceKey = req.headers.get('X-Service-Key')
  if (!authHeader?.startsWith('Bearer ') && !serviceKey) return null

  const result = await authenticate(req)
  if (result instanceof Response) return null
  return result
}
