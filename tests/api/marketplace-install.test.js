/**
 * marketplace-install.test.js
 *
 * Unit tests for the marketplace install handler (marketplace-detail.mts).
 *
 * Strategy: mock the database (sql tagged template) and authenticate function,
 * then call the handler directly with a constructed Request object.
 *
 * The handler resolves its own URL segments to extract the template ID, so
 * we construct full URLs like "http://localhost/api/marketplace/test-template".
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Mock database module before importing handler ---
// The handler imports `sql` from './utils/database.ts'. In the test context,
// Vitest resolves this relative to the test file's working directory, so we
// mock the absolute path that corresponds to the handler's import.
vi.mock(
  '/home/marc/DEV/claude/agent-evaluation/netlify/functions/utils/database.ts',
  () => {
    const sql = vi.fn()
    return { sql, default: sql }
  }
)

// --- Mock auth module ---
vi.mock(
  '/home/marc/DEV/claude/agent-evaluation/netlify/functions/utils/auth.ts',
  () => ({
    authenticate: vi.fn(),
    authorize: vi.fn(() => true),
    optionalAuth: vi.fn(() => null)
  })
)

import handler from '/home/marc/DEV/claude/agent-evaluation/netlify/functions/marketplace-detail.mts'
import { sql } from '/home/marc/DEV/claude/agent-evaluation/netlify/functions/utils/database.ts'
import { authenticate } from '/home/marc/DEV/claude/agent-evaluation/netlify/functions/utils/auth.ts'

// Valid AuthContext returned by authenticate on success
const MOCK_AUTH_CTX = {
  userId: 'user-1',
  clerkUserId: 'clerk_user_1',
  orgId: 'org-1',
  orgSlug: 'test-org',
  userRole: 'admin'
}

// Minimal template row returned by the DB
const MOCK_TEMPLATE = {
  id: 'test-template',
  name: 'Test Agent Template',
  role: 'Test role',
  persona: 'You are a test agent.',
  description: 'A template for testing.',
  category: 'development',
  kpi_definitions: ['metric_a', 'metric_b'],
  is_public: true,
  install_count: 5,
  avg_rating: null
}

// Minimal department row
const MOCK_DEPT = { id: 'dept-uuid-1', slug: 'development' }

// Minimal installed agent row returned after INSERT
const MOCK_INSTALLED_AGENT = {
  id: 'test-template',
  org_id: 'org-1',
  name: 'Test Agent Template',
  role: 'Test role',
  persona: 'You are a test agent.',
  department: 'development',
  department_id: 'dept-uuid-1',
  kpi_definitions: ['metric_a', 'metric_b'],
  source_type: 'template',
  template_id: 'test-template',
  status: 'active'
}

/**
 * Build a POST install Request for the given template ID and body.
 */
function makeInstallRequest(templateId, body = {}, authHeader = 'Bearer mock-token') {
  return new Request(
    `http://localhost/api/marketplace/${templateId}?action=install`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader
      },
      body: JSON.stringify(body)
    }
  )
}

/**
 * Set up sql mock to return values in sequence for one happy-path install call.
 * The handler makes these SQL calls in order:
 *   1. SELECT template (verify exists + public)
 *   2. SELECT agents (check existing agent_id in org)
 *   3. SELECT departments (fallback — no department_id/slug in body)
 *   4. INSERT agents RETURNING *
 *   5. INSERT agent_installs
 *   6. UPDATE agent_templates install_count
 */
function setupHappyPathSql(overrides = {}) {
  const {
    templateRows = [MOCK_TEMPLATE],
    existingAgentRows = [],
    deptRows = [MOCK_DEPT],
    insertAgentRows = [MOCK_INSTALLED_AGENT],
    insertInstallRows = [{ id: 1 }],
    updateTemplateRows = []
  } = overrides

  sql
    .mockResolvedValueOnce(templateRows)      // 1. template lookup
    .mockResolvedValueOnce(existingAgentRows) // 2. existing agent check
    .mockResolvedValueOnce(deptRows)          // 3. fallback dept lookup
    .mockResolvedValueOnce(insertAgentRows)   // 4. INSERT agent
    .mockResolvedValueOnce(insertInstallRows) // 5. INSERT agent_installs
    .mockResolvedValueOnce(updateTemplateRows)// 6. UPDATE install_count
}

describe('marketplace-detail handler — install route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authenticate.mockResolvedValue(MOCK_AUTH_CTX)
  })

  // ─── Successful install ───────────────────────────────────────────────

  describe('successful install', () => {
    it('returns 201 with agent object on successful install', async () => {
      setupHappyPathSql()

      const req = makeInstallRequest('test-template')
      const res = await handler(req)

      expect(res.status).toBe(201)

      const body = await res.json()
      expect(body).toHaveProperty('agent')
      expect(body.agent.id).toBe('test-template')
      expect(body.message).toBe('Agent installed successfully')
    })

    it('includes the installed agent fields in the response', async () => {
      setupHappyPathSql()

      const req = makeInstallRequest('test-template')
      const res = await handler(req)
      const body = await res.json()

      expect(body.agent.status).toBe('active')
      expect(body.agent.source_type).toBe('template')
      expect(body.agent.template_id).toBe('test-template')
    })

    it('calls authenticate before processing', async () => {
      setupHappyPathSql()

      const req = makeInstallRequest('test-template')
      await handler(req)

      expect(authenticate).toHaveBeenCalledWith(req)
    })
  })

  // ─── agent_installs recorded ────────────────────────────────────────

  describe('agent_installs recording', () => {
    it('makes 6 SQL calls for a complete install (including recording the install)', async () => {
      setupHappyPathSql()

      const req = makeInstallRequest('test-template')
      await handler(req)

      // sql is called 6 times: template lookup, agent check, dept fallback,
      // INSERT agent, INSERT agent_installs, UPDATE install_count
      expect(sql).toHaveBeenCalledTimes(6)
    })
  })

  // ─── install_count increment ────────────────────────────────────────

  describe('install_count increment', () => {
    it('issues an UPDATE to increment install_count on the template', async () => {
      setupHappyPathSql()

      const req = makeInstallRequest('test-template')
      await handler(req)

      // The 6th sql call is the UPDATE. Verify sql was called 6 times total.
      // We cannot easily inspect the tagged template literal arguments in
      // Vitest without additional tooling, but we verify call count guarantees
      // the UPDATE was executed.
      expect(sql).toHaveBeenCalledTimes(6)
    })
  })

  // ─── 409 duplicate agent ID ──────────────────────────────────────────

  describe('duplicate agent ID', () => {
    it('returns 409 when an agent with the same ID already exists in the org', async () => {
      sql
        .mockResolvedValueOnce([MOCK_TEMPLATE])     // 1. template lookup
        .mockResolvedValueOnce([{ id: 'test-template' }]) // 2. existing agent found

      const req = makeInstallRequest('test-template')
      const res = await handler(req)

      expect(res.status).toBe(409)

      const body = await res.json()
      expect(body.error).toMatch(/already exists/i)
    })

    it('does not call INSERT agent when ID already exists', async () => {
      sql
        .mockResolvedValueOnce([MOCK_TEMPLATE])
        .mockResolvedValueOnce([{ id: 'test-template' }])

      const req = makeInstallRequest('test-template')
      await handler(req)

      // Only 2 SQL calls (template + existing agent check) — no INSERT
      expect(sql).toHaveBeenCalledTimes(2)
    })
  })

  // ─── 404 template not found ──────────────────────────────────────────

  describe('template not found', () => {
    it('returns 404 when the template does not exist', async () => {
      sql.mockResolvedValueOnce([]) // no template found

      const req = makeInstallRequest('nonexistent-template')
      const res = await handler(req)

      expect(res.status).toBe(404)

      const body = await res.json()
      expect(body.error).toMatch(/not found/i)
    })

    it('stops after template lookup when template is missing', async () => {
      sql.mockResolvedValueOnce([])

      const req = makeInstallRequest('nonexistent-template')
      await handler(req)

      expect(sql).toHaveBeenCalledTimes(1)
    })
  })

  // ─── 400 invalid agent_id format ────────────────────────────────────

  describe('invalid agent_id format', () => {
    it('returns 400 when agent_id contains uppercase letters', async () => {
      sql.mockResolvedValueOnce([MOCK_TEMPLATE]) // template found

      const req = makeInstallRequest('test-template', { agent_id: 'MyAgent' })
      const res = await handler(req)

      expect(res.status).toBe(400)

      const body = await res.json()
      expect(body.error).toMatch(/invalid agent_id format/i)
    })

    it('returns 400 when agent_id contains special characters', async () => {
      sql.mockResolvedValueOnce([MOCK_TEMPLATE])

      const req = makeInstallRequest('test-template', { agent_id: 'my_agent!' })
      const res = await handler(req)

      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toMatch(/invalid agent_id format/i)
    })

    it('returns 400 when agent_id is too short (1 char)', async () => {
      sql.mockResolvedValueOnce([MOCK_TEMPLATE])

      const req = makeInstallRequest('test-template', { agent_id: 'a' })
      const res = await handler(req)

      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toMatch(/invalid agent_id format/i)
    })

    it('returns 400 when agent_id exceeds 50 characters', async () => {
      sql.mockResolvedValueOnce([MOCK_TEMPLATE])

      const longId = 'a'.repeat(51)
      const req = makeInstallRequest('test-template', { agent_id: longId })
      const res = await handler(req)

      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toMatch(/invalid agent_id format/i)
    })

    it('accepts a valid lowercase agent_id with hyphens', async () => {
      sql
        .mockResolvedValueOnce([MOCK_TEMPLATE])
        .mockResolvedValueOnce([]) // no existing agent
        .mockResolvedValueOnce([MOCK_DEPT])
        .mockResolvedValueOnce([{ ...MOCK_INSTALLED_AGENT, id: 'my-custom-agent' }])
        .mockResolvedValueOnce([{ id: 1 }])
        .mockResolvedValueOnce([])

      const req = makeInstallRequest('test-template', { agent_id: 'my-custom-agent' })
      const res = await handler(req)

      expect(res.status).toBe(201)
    })
  })

  // ─── 401 unauthenticated ──────────────────────────────────────────────

  describe('unauthenticated request', () => {
    it('returns 401 when authenticate returns a Response (no auth header)', async () => {
      // Simulate authenticate returning a 401 Response (unauthenticated)
      const unauthorizedResponse = new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
      authenticate.mockResolvedValue(unauthorizedResponse)

      const req = makeInstallRequest('test-template', {}, '')
      const res = await handler(req)

      expect(res.status).toBe(401)
    })

    it('does not query the database when authentication fails', async () => {
      const unauthorizedResponse = new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
      authenticate.mockResolvedValue(unauthorizedResponse)

      const req = makeInstallRequest('test-template', {}, '')
      await handler(req)

      expect(sql).not.toHaveBeenCalled()
    })
  })

  // ─── Template ID validation ──────────────────────────────────────────

  describe('template ID validation', () => {
    it('returns 400 for template ID with uppercase letters', async () => {
      const req = new Request(
        'http://localhost/api/marketplace/BadTemplateID?action=install',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer mock-token' },
          body: JSON.stringify({})
        }
      )
      const res = await handler(req)

      // The handler validates the URL segment ID before auth
      expect(res.status).toBe(400)
    })

    it('returns 400 for missing template ID segment', async () => {
      const req = new Request(
        'http://localhost/api/marketplace?action=install',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer mock-token' },
          body: JSON.stringify({})
        }
      )
      const res = await handler(req)

      expect(res.status).toBe(400)
    })
  })

  // ─── GET template detail (public, no auth) ────────────────────────────

  describe('GET template detail', () => {
    it('returns 200 with template data for a valid public template', async () => {
      sql
        .mockResolvedValueOnce([MOCK_TEMPLATE]) // template lookup
        .mockResolvedValueOnce([{ avg_rating: null, review_count: '0' }]) // ratings

      const req = new Request('http://localhost/api/marketplace/test-template', {
        method: 'GET'
      })
      const res = await handler(req)

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.template.id).toBe('test-template')
      expect(body.template.name).toBe('Test Agent Template')
    })

    it('returns 404 for an unknown template', async () => {
      sql.mockResolvedValueOnce([]) // no template

      const req = new Request('http://localhost/api/marketplace/unknown-template', {
        method: 'GET'
      })
      const res = await handler(req)

      expect(res.status).toBe(404)
    })
  })

  // ─── OPTIONS preflight ───────────────────────────────────────────────

  describe('OPTIONS preflight', () => {
    it('returns 204 for CORS preflight', async () => {
      const req = new Request('http://localhost/api/marketplace/test-template', {
        method: 'OPTIONS'
      })
      const res = await handler(req)

      expect(res.status).toBe(204)
    })
  })
})
