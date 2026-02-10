import type { Config } from '@netlify/functions'
import { Webhook } from 'svix'
import { sql } from './utils/database.ts'

// Clerk webhook handler — syncs user data to our database
// Clerk sends events via Svix webhooks with signature verification
export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  // Verify webhook signature
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('CLERK_WEBHOOK_SECRET not configured')
    return new Response('Server misconfigured', { status: 500 })
  }

  const payload = await req.text()
  const svixId = req.headers.get('svix-id')
  const svixTimestamp = req.headers.get('svix-timestamp')
  const svixSignature = req.headers.get('svix-signature')

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response('Missing svix headers', { status: 400 })
  }

  let event: any
  try {
    const wh = new Webhook(webhookSecret)
    event = wh.verify(payload, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature
    })
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return new Response('Invalid signature', { status: 401 })
  }

  // Handle events
  try {
    switch (event.type) {
      case 'user.created':
      case 'user.updated': {
        const { id, email_addresses, first_name, last_name, image_url } = event.data
        const email = email_addresses?.[0]?.email_address || ''
        const fullName = [first_name, last_name].filter(Boolean).join(' ')

        await sql`
          INSERT INTO users (clerk_user_id, email, full_name, avatar_url)
          VALUES (${id}, ${email}, ${fullName}, ${image_url || null})
          ON CONFLICT (clerk_user_id) DO UPDATE SET
            email = EXCLUDED.email,
            full_name = EXCLUDED.full_name,
            avatar_url = EXCLUDED.avatar_url,
            last_seen_at = NOW()
        `
        break
      }

      case 'user.deleted': {
        const { id } = event.data
        // Soft approach: just mark as deleted, don't cascade yet
        // Orgs they own should remain (transfer ownership flow is separate)
        await sql`DELETE FROM users WHERE clerk_user_id = ${id}`
        break
      }

      default:
        // Ignore unhandled event types
        console.log(`Unhandled webhook event: ${event.type}`)
    }
  } catch (err) {
    console.error(`Webhook handler error for ${event.type}:`, err)
    return new Response('Internal error', { status: 500 })
  }

  return new Response('OK', { status: 200 })
}

export const config: Config = {
  path: '/api/webhooks/clerk'
}
