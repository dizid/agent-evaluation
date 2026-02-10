import type { Config } from '@netlify/functions'
import { sql } from './utils/database.ts'
import { json, error, cors } from './utils/response.ts'
import { authenticate } from './utils/auth.ts'

function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, '')
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return cors()

  const ctx = await authenticate(req)
  if (ctx instanceof Response) return ctx

  try {
    if (req.method === 'GET') {
      return handleGetProfile(ctx.userId)
    }

    if (req.method === 'PUT') {
      return handleUpdateProfile(ctx.userId, req)
    }

    return error('Method not allowed', 405)
  } catch (err) {
    console.error('users-me error:', err)
    return error('Failed to process request', 500)
  }
}

// GET /api/users/me — return current user profile with org memberships
async function handleGetProfile(userId: string) {
  const users = await sql`
    SELECT u.id, u.clerk_user_id, u.email, u.full_name, u.avatar_url,
           u.onboarding_completed, u.created_at, u.last_seen_at
    FROM users u
    WHERE u.id = ${userId}
  `
  if (users.length === 0) return error('User not found', 404)

  const orgs = await sql`
    SELECT o.id, o.name, o.slug, o.plan_tier, om.role
    FROM organizations o
    JOIN org_members om ON om.org_id = o.id
    WHERE om.user_id = ${userId}
    ORDER BY om.joined_at ASC
  `

  return json({
    user: users[0],
    organizations: orgs
  })
}

// PUT /api/users/me — update profile fields
async function handleUpdateProfile(userId: string, req: Request) {
  const body = await req.json()

  if (body.full_name !== undefined && (typeof body.full_name !== 'string' || body.full_name.length > 100)) {
    return error('full_name must be a string of max 100 characters', 400)
  }

  const existing = await sql`SELECT * FROM users WHERE id = ${userId}`
  if (existing.length === 0) return error('User not found', 404)
  const user = existing[0]

  const fullName = body.full_name !== undefined ? stripHtml(body.full_name) : user.full_name
  const onboardingCompleted = body.onboarding_completed !== undefined
    ? body.onboarding_completed === true
    : user.onboarding_completed

  const result = await sql`
    UPDATE users SET
      full_name = ${fullName},
      onboarding_completed = ${onboardingCompleted}
    WHERE id = ${userId}
    RETURNING id, clerk_user_id, email, full_name, avatar_url, onboarding_completed, created_at
  `

  return json({ user: result[0] })
}

export const config: Config = {
  path: '/api/users/me'
}
