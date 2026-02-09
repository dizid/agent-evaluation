// Response helpers for Netlify Functions

// Allowed origins for CORS — fallback to * for dev flexibility
const ALLOWED_ORIGINS = [
  'https://dizid-agenteval.netlify.app',
  'http://localhost:5173',
  'http://localhost:8888'
]

function getCorsOrigin(origin?: string | null): string {
  if (origin && ALLOWED_ORIGINS.includes(origin)) return origin
  return '*'
}

function corsHeaders(origin?: string | null): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': getCorsOrigin(origin),
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
  }
}

// Structured error codes
export type ErrorCode = 'VALIDATION_ERROR' | 'NOT_FOUND' | 'SERVER_ERROR' | 'RATE_LIMIT' | 'METHOD_NOT_ALLOWED' | 'CONFLICT'

// Return a structured error response with code + optional details
export function structuredError(
  statusCode: number,
  code: ErrorCode,
  message: string,
  details?: string,
  origin?: string | null
): Response {
  const body: { error: string; code: ErrorCode; details?: string } = { error: message, code }
  if (details) body.details = details
  return new Response(JSON.stringify(body), {
    status: statusCode,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(origin)
    }
  })
}

// Return a JSON response with CORS headers + optional extra headers
export function json(data: unknown, status = 200, extraHeaders?: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(),
      ...extraHeaders
    }
  })
}

// Return an error response with CORS headers
export function error(message: string, status = 400): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders()
    }
  })
}

// Handle CORS preflight requests
export function cors(): Response {
  return new Response(null, {
    status: 204,
    headers: corsHeaders()
  })
}
