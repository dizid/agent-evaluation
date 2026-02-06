import type { Config } from '@netlify/functions'
import { json } from './utils/response.ts'

export default async function handler() {
  return json({
    status: 'ok',
    timestamp: new Date().toISOString()
  })
}

export const config: Config = {
  path: '/api/health'
}
