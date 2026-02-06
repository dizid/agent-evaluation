import { neon } from '@neondatabase/serverless'
import https from 'https'

// Custom fetch that forces IPv4 to work around Node.js undici dual-stack
// timeout issues with Neon's AWS endpoints in local development
function ipv4Fetch(url: string | URL, opts: any = {}): Promise<Response> {
  const u = new URL(url.toString())
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: u.hostname,
      port: Number(u.port) || 443,
      path: u.pathname + u.search,
      method: opts.method || 'GET',
      headers: opts.headers || {},
      family: 4
    }, (res) => {
      const chunks: Buffer[] = []
      res.on('data', (d: Buffer) => chunks.push(d))
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString()
        resolve(new Response(body, {
          status: res.statusCode || 500,
          headers: res.headers as Record<string, string>
        }))
      })
    })
    req.on('error', reject)
    if (opts.body) req.write(opts.body)
    req.end()
  })
}

// Use custom fetch in local dev, native fetch in production (Netlify edge)
const isLocal = process.env.NETLIFY_DEV === 'true' || !process.env.NETLIFY
const fetchFn = isLocal ? ipv4Fetch : undefined

// Create a SQL tagged template function connected to Neon
// Usage: const rows = await sql`SELECT * FROM agents WHERE id = ${id}`
export const sql = neon(process.env.DATABASE_URL!, {
  fetchOptions: fetchFn ? { cache: undefined } : undefined
})

// Monkey-patch globalThis.fetch for local dev so Neon driver uses IPv4
if (isLocal && typeof globalThis !== 'undefined') {
  const originalFetch = globalThis.fetch
  globalThis.fetch = function(input: any, init?: any) {
    const url = typeof input === 'string' ? input : input.url || input.toString()
    if (url.includes('neon.tech')) {
      return ipv4Fetch(url, init) as any
    }
    return originalFetch(input, init)
  } as typeof fetch
}

export { sql as default }
