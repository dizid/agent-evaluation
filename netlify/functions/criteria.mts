import type { Config } from '@netlify/functions'
import { sql } from './utils/database.ts'
import { json, error, cors } from './utils/response.ts'

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return cors()

  try {
    const url = new URL(req.url)
    const category = url.searchParams.get('category')
    const appliesTo = url.searchParams.get('applies_to')

    let criteria
    if (category && appliesTo) {
      criteria = await sql`
        SELECT * FROM criteria
        WHERE category = ${category}
          AND (applies_to IS NULL OR ${appliesTo} = ANY(applies_to))
        ORDER BY sort_order
      `
    } else if (category) {
      criteria = await sql`
        SELECT * FROM criteria
        WHERE category = ${category}
        ORDER BY sort_order
      `
    } else if (appliesTo) {
      criteria = await sql`
        SELECT * FROM criteria
        WHERE applies_to IS NULL OR ${appliesTo} = ANY(applies_to)
        ORDER BY category, sort_order
      `
    } else {
      criteria = await sql`
        SELECT * FROM criteria
        ORDER BY category, sort_order
      `
    }

    return json(
      { criteria },
      200,
      { 'Cache-Control': 'public, max-age=300' }
    )
  } catch (err) {
    console.error('criteria error:', err)
    return error('Failed to fetch criteria', 500)
  }
}

export const config: Config = {
  path: '/api/criteria'
}
