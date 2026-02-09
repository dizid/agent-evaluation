import type { Config } from '@netlify/functions'
import { sql } from './utils/database.ts'
import { json } from './utils/response.ts'

export default async function handler() {
  let dbStatus: 'connected' | 'error' = 'error'

  try {
    await sql`SELECT 1`
    dbStatus = 'connected'
  } catch (err) {
    console.error('health check db error:', err)
  }

  const status = dbStatus === 'connected' ? 'healthy' : 'degraded'
  const statusCode = dbStatus === 'connected' ? 200 : 503

  return json(
    { status, db: dbStatus, timestamp: new Date().toISOString(), version: '1.0.0' },
    statusCode,
    { 'Cache-Control': 'no-cache' }
  )
}

export const config: Config = {
  path: '/api/health'
}
