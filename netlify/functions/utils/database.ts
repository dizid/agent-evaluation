import { neon } from '@neondatabase/serverless'

// Create a SQL tagged template function connected to Neon
// Usage: const rows = await sql`SELECT * FROM agents WHERE id = ${id}`
export const sql = neon(process.env.DATABASE_URL!)
