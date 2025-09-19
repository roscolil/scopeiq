import { getEnvironmentConfig } from '@/config/python-backend'

// Types for Categories & Abbreviations (a.k.a. terms)
export interface Category {
  id: string
  name: string
  description?: string
  createdAt?: string
  updatedAt?: string
  abbreviationCount?: number
}

export interface CreateCategoryInput {
  name: string
  description?: string
}

export interface UpdateCategoryInput {
  name?: string
  description?: string
}

export interface Abbreviation {
  id: string
  term: string
  expansion: string
  categoryId?: string
  createdAt?: string
  updatedAt?: string
  usageExamples?: string[]
}

export interface CreateAbbreviationInput {
  term: string
  expansion: string
  categoryId?: string
  usageExamples?: string[]
}

export interface UpdateAbbreviationInput {
  term?: string
  expansion?: string
  categoryId?: string
  usageExamples?: string[]
}

export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

interface FetchOptions extends RequestInit {
  skipAuth?: boolean
}

// Normalize backend list response (supports either {success,data,total,skip,limit} or direct array)
function transformListResponse<T>(
  raw: unknown,
  page: number,
  pageSize: number,
): PaginatedResult<T> {
  // Type guard for expected envelope
  interface Envelope {
    data: unknown
    total?: unknown
    skip?: unknown
    limit?: unknown
  }
  const isEnvelope = (val: unknown): val is Envelope => {
    return (
      !!val &&
      typeof val === 'object' &&
      'data' in val &&
      Array.isArray((val as Record<string, unknown>).data as unknown[])
    )
  }
  if (isEnvelope(raw)) {
    const dataArray = raw.data as T[]
    const total = typeof raw.total === 'number' ? raw.total : dataArray.length
    const skip = typeof raw.skip === 'number' ? raw.skip : (page - 1) * pageSize
    const limit = typeof raw.limit === 'number' ? raw.limit : pageSize
    const computedPage = limit > 0 ? Math.floor(skip / limit) + 1 : page
    const hasMore = skip + dataArray.length < total
    return {
      items: dataArray,
      total,
      page: computedPage,
      pageSize: limit,
      hasMore,
    }
  }
  // Fallback: raw might already be array
  if (Array.isArray(raw)) {
    const items = raw as T[]
    return {
      items,
      total: items.length,
      page,
      pageSize,
      hasMore: false,
    }
  }
  // Unknown structure
  if (process.env.NODE_ENV !== 'production') {
    console.warn('[adminTaxonomyService] unrecognized list response shape', {
      raw,
    })
  }
  return { items: [], total: 0, page, pageSize, hasMore: false }
}

// ---------------------------------------------------------------------------
// Auth Token Retrieval (lazy to avoid hard dependency at module import time)
// ---------------------------------------------------------------------------
// Minimal interface for the subset of Amplify Auth we use
interface AmplifyAuthLike {
  currentSession?: () => Promise<{
    getIdToken?: () => { getJwtToken?: () => string }
  }>
}
let amplifyAuth: AmplifyAuthLike | false | null = null
async function getAuthToken(): Promise<string | null> {
  if (amplifyAuth === null) {
    try {
      const mod: unknown = await import('aws-amplify') // dynamic import
      const maybeRecord = mod as Record<string, unknown>
      let authCandidate: unknown
      if (maybeRecord && typeof maybeRecord === 'object') {
        authCandidate = maybeRecord['Auth']
        if (!authCandidate) {
          const defaultMod = maybeRecord['default'] as
            | Record<string, unknown>
            | undefined
          if (defaultMod && typeof defaultMod === 'object') {
            authCandidate = defaultMod['Auth']
          }
        }
      }
      if (authCandidate && typeof authCandidate === 'object') {
        const candidateObj = authCandidate as Record<string, unknown>
        if ('currentSession' in candidateObj) {
          amplifyAuth = authCandidate as AmplifyAuthLike
        } else {
          amplifyAuth = null
        }
      } else {
        amplifyAuth = null
      }
    } catch {
      amplifyAuth = false
    }
  }
  if (!amplifyAuth) return null
  try {
    const session = await amplifyAuth.currentSession?.()
    const token = session?.getIdToken?.().getJwtToken?.()
    return token || null
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Unified Admin API Base
// Prefer single base constant for all admin taxonomy endpoints. Supports either
// VITE_ADMIN_API_BASE (new) or legacy VITE_TAXONOMY_API_VERSION_PREFIX fallback.
// Ensures consistent prefix (default /api/v1) without duplicating logic.
// ---------------------------------------------------------------------------
const ADMIN_API_BASE = (
  import.meta.env.VITE_ADMIN_API_BASE ||
  import.meta.env.VITE_TAXONOMY_API_VERSION_PREFIX ||
  '/api/v1'
).replace(/\/$/, '')
const TAXONOMY_CATEGORIES_SEGMENT =
  import.meta.env.VITE_TAXONOMY_CATEGORIES_SEGMENT || 'categories'
const TAXONOMY_ABBREVIATIONS_SEGMENT =
  import.meta.env.VITE_TAXONOMY_ABBREVIATIONS_SEGMENT || 'abbreviations'

const CATEGORIES_PATH = `${ADMIN_API_BASE}/${TAXONOMY_CATEGORIES_SEGMENT}`
const ABBREVIATIONS_PATH = `${ADMIN_API_BASE}/${TAXONOMY_ABBREVIATIONS_SEGMENT}`

// Ensure collection endpoints always include a trailing slash to avoid backend 30x redirects
function ensureCollection(path: string): string {
  return path.endsWith('/') ? path : `${path}/`
}

// Generic JSON fetcher with retry + optional auth based on python backend config
async function jsonFetch<T>(
  path: string,
  options: FetchOptions = {},
): Promise<T> {
  const config = getEnvironmentConfig()
  const base = config.baseURL.replace(/\/$/, '')
  const url = `${base}${path}`
  if (process.env.NODE_ENV !== 'production') {
    // Temporary diagnostics for taxonomy loading issues
    console.debug('[adminTaxonomyService] fetch', {
      baseURL: base,
      path,
      fullUrl: url,
      timeout: config.timeout,
    })
  }

  const { retryAttempts, retryDelay, timeout } = config

  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeout)

  let attempt = 0
  let lastError: unknown

  while (attempt <= retryAttempts) {
    try {
      // Auth temporarily disabled for diagnostics
      const authHeader: Record<string, string> = {}
      if (process.env.NODE_ENV !== 'production') {
        console.debug('[adminTaxonomyService] auth disabled for request', {
          url,
        })
      }
      const res = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...authHeader,
          ...(options.headers || {}),
        },
        signal: controller.signal,
      })

      if (!res.ok) {
        const clone = res.clone()
        let text = ''
        try {
          text = await clone.text()
        } catch (e) {
          if (process.env.NODE_ENV !== 'production') {
            console.debug('[adminTaxonomyService] body read failed', { url, e })
          }
        }
        const snippet = text ? text.substring(0, 400) : ''
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[adminTaxonomyService] non-ok response', {
            url,
            method: options.method || 'GET',
            status: res.status,
            statusText: res.statusText,
            bodySample: snippet,
          })
        }
        throw new Error(
          `Request failed ${res.status} ${res.statusText}${snippet ? ': ' + snippet : ''}`,
        )
      }

      // 204 No Content handling
      if (res.status === 204) {
        clearTimeout(id)
        return undefined as unknown as T
      }

      let data: T
      try {
        data = (await res.json()) as T
      } catch (parseErr) {
        if (process.env.NODE_ENV !== 'production') {
          console.error('[adminTaxonomyService] JSON parse error', {
            url,
            parseErr,
          })
        }
        throw parseErr
      }
      clearTimeout(id)
      return data
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('[adminTaxonomyService] attempt failed', {
          attempt,
          url,
          err,
        })
      }
      lastError = err
      attempt++
      if (attempt > retryAttempts) break
      await new Promise(r => setTimeout(r, retryDelay * attempt))
    }
  }

  clearTimeout(id)
  throw lastError instanceof Error
    ? lastError
    : new Error('Unknown fetch error')
}

// Helper to build query string
function qs(
  params: Record<string, string | number | boolean | undefined>,
): string {
  const search = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(
      ([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`,
    )
    .join('&')
  return search ? `?${search}` : ''
}

// Normalize single-entity (category) responses that may arrive as { data: {...} } or direct object
function normalizeSingleCategory(raw: unknown): Category {
  if (raw && typeof raw === 'object') {
    const rec = raw as Record<string, unknown>
    const candidateRaw =
      rec.data && typeof rec.data === 'object'
        ? (rec.data as Record<string, unknown>)
        : rec
    const candidate = candidateRaw as Record<string, unknown>
    // Map possible legacy keys
    const id = (candidate.id as string) || (candidate._id as string) || ''
    const name = (candidate.name as string) || (candidate.title as string) || ''
    const description =
      (candidate.description as string) || (candidate.desc as string) || ''
    const abbreviationCount =
      typeof candidate.abbreviationCount === 'number'
        ? (candidate.abbreviationCount as number)
        : Array.isArray(candidate.abbreviations as unknown[])
          ? (candidate.abbreviations as unknown[]).length
          : undefined
    return {
      id,
      name,
      description,
      createdAt:
        (candidate.createdAt as string) || (candidate.created_at as string),
      updatedAt:
        (candidate.updatedAt as string) || (candidate.updated_at as string),
      abbreviationCount,
    }
  }
  // Fallback minimal object (prevents UI crashes)
  return { id: 'unknown', name: '' }
}

// Normalize single-entity (abbreviation/term) responses
function normalizeSingleAbbreviation(raw: unknown): Abbreviation {
  if (raw && typeof raw === 'object') {
    const rec = raw as Record<string, unknown>
    const candidateRaw =
      rec.data && typeof rec.data === 'object'
        ? (rec.data as Record<string, unknown>)
        : rec
    const candidate = candidateRaw as Record<string, unknown>
    const id = (candidate.id as string) || (candidate._id as string) || ''
    const term =
      (candidate.term as string) || (candidate.abbreviation as string) || ''
    const expansion =
      (candidate.expansion as string) ||
      (candidate.full_form as string) ||
      (candidate.definition as string) ||
      ''
    const categoryId =
      (candidate.categoryId as string) ||
      (candidate.category_id as string) ||
      (candidate.category as string) ||
      undefined
    let usageExamples: string[] | undefined
    if (Array.isArray(candidate.usageExamples))
      usageExamples = candidate.usageExamples as string[]
    else if (Array.isArray(candidate.examples))
      usageExamples = candidate.examples as string[]
    return {
      id,
      term,
      expansion,
      categoryId,
      usageExamples,
      createdAt:
        (candidate.createdAt as string) || (candidate.created_at as string),
      updatedAt:
        (candidate.updatedAt as string) || (candidate.updated_at as string),
    }
  }
  return { id: 'unknown', term: '', expansion: '' }
}

// Service object
export const adminTaxonomyService = {
  // Categories
  async listCategories(
    page = 1,
    pageSize = 50,
  ): Promise<PaginatedResult<Category>> {
    // Translate UI paging to backend skip/limit
    const skip = (page - 1) * pageSize
    const limit = pageSize
    // IMPORTANT: Backend issues a 307 redirect (and incorrectly downgrades to http) when the
    // collection endpoint is requested without a trailing slash. Fetch then fails due to
    // mixed-content / blocked downgrade, surfacing as TypeError: Failed to fetch before status.
    // Request the canonical trailing-slash form directly to bypass the redirect.
    const raw = await jsonFetch<unknown>(
      `${CATEGORIES_PATH}/${qs({ skip, limit })}`,
    )
    return transformListResponse<Category>(raw, page, pageSize)
  },
  async getCategory(id: string): Promise<Category> {
    const raw = await jsonFetch<unknown>(`${CATEGORIES_PATH}/${id}`)
    return normalizeSingleCategory(raw)
  },
  async createCategory(input: CreateCategoryInput): Promise<Category> {
    const raw = await jsonFetch<unknown>(
      `${ensureCollection(CATEGORIES_PATH)}`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
    )
    return normalizeSingleCategory(raw)
  },
  async updateCategory(
    id: string,
    input: UpdateCategoryInput,
  ): Promise<Category> {
    // Some backends treat PUT as full replace. If required keys (name) are missing, fetch existing.
    const working: UpdateCategoryInput & {
      name?: string
      description?: string
    } = {
      ...input,
    }
    if (working.name === undefined) {
      try {
        const existingRaw = await jsonFetch<unknown>(`${CATEGORIES_PATH}/${id}`)
        const existing = normalizeSingleCategory(existingRaw)
        working.name = existing.name
        if (working.description === undefined)
          working.description = existing.description
      } catch (e) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn(
            '[adminTaxonomyService] updateCategory fallback fetch failed',
            { id, e },
          )
        }
      }
    }
    // Include legacy alias 'title' if backend ever used it.
    const payload: Record<string, unknown> = {
      name: working.name,
      description: working.description,
      title: working.name, // legacy alias safeguard
    }
    const raw = await jsonFetch<unknown>(`${CATEGORIES_PATH}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
    return normalizeSingleCategory(raw)
  },
  async deleteCategory(id: string): Promise<void> {
    await jsonFetch(`${CATEGORIES_PATH}/${id}`, { method: 'DELETE' })
  },

  // Abbreviations
  async listAbbreviations(
    page = 1,
    pageSize = 50,
    categoryId?: string,
  ): Promise<PaginatedResult<Abbreviation>> {
    const skip = (page - 1) * pageSize
    const limit = pageSize
    // Apply same trailing-slash strategy as categories to avoid 307 scheme-downgrade redirect.
    const raw = await jsonFetch<unknown>(
      `${ABBREVIATIONS_PATH}/${qs({ skip, limit, category_id: categoryId })}`,
    )
    if (process.env.NODE_ENV !== 'production') {
      console.debug('[adminTaxonomyService] abbreviations raw', raw)
    }
    const normalized = transformListResponse<Abbreviation>(raw, page, pageSize)
    // Defensive: ensure each abbreviation has term & expansion; if backend used different keys, map them.
    normalized.items = normalized.items.map(a => {
      // Accept potential legacy shapes and coerce
      const rec = a as unknown as Record<string, unknown>
      const id = (rec.id as string) || (rec._id as string) || a.id
      const term =
        (rec.term as string) || (rec.abbreviation as string) || a.term
      const expansion =
        (rec.expansion as string) ||
        (rec.full_form as string) ||
        (rec.definition as string) ||
        a.expansion
      const categoryId =
        (rec.categoryId as string) ||
        (rec.category_id as string) ||
        (rec.category as string) ||
        a.categoryId
      let usageExamples: string[] | undefined = a.usageExamples
      if (!usageExamples) {
        if (Array.isArray(rec.usageExamples))
          usageExamples = rec.usageExamples as string[]
        else if (Array.isArray(rec.examples))
          usageExamples = rec.examples as string[]
      }
      return {
        ...a,
        id,
        term,
        expansion,
        categoryId,
        usageExamples,
      }
    })
    return normalized
  },
  async getAbbreviation(id: string): Promise<Abbreviation> {
    const raw = await jsonFetch<unknown>(`${ABBREVIATIONS_PATH}/${id}`)
    return normalizeSingleAbbreviation(raw)
  },
  async createAbbreviation(
    input: CreateAbbreviationInput,
  ): Promise<Abbreviation> {
    // Backend currently expects keys: abbreviation, full_form, (optional) category_id, examples
    // We also send our canonical keys (term, expansion, usageExamples) for forward/backward compatibility.
    const payload: Record<string, unknown> = {
      abbreviation: input.term,
      full_form: input.expansion,
      term: input.term,
      expansion: input.expansion,
    }
    if (input.categoryId) {
      payload.category_id = input.categoryId
      payload.categoryId = input.categoryId
    }
    if (input.usageExamples) {
      payload.examples = input.usageExamples
      payload.usageExamples = input.usageExamples
    }
    const raw = await jsonFetch<unknown>(
      `${ensureCollection(ABBREVIATIONS_PATH)}` as string,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    )
    return normalizeSingleAbbreviation(raw)
  },
  async updateAbbreviation(
    id: string,
    input: UpdateAbbreviationInput,
  ): Promise<Abbreviation> {
    // Ensure required fields (term/expansion) present; if absent fetch existing.
    const working: UpdateAbbreviationInput & {
      term?: string
      expansion?: string
      categoryId?: string
      usageExamples?: string[]
    } = {
      ...input,
    }
    if (working.term === undefined || working.expansion === undefined) {
      try {
        const existingRaw = await jsonFetch<unknown>(
          `${ABBREVIATIONS_PATH}/${id}`,
        )
        const existing = normalizeSingleAbbreviation(existingRaw)
        if (working.term === undefined) working.term = existing.term
        if (working.expansion === undefined)
          working.expansion = existing.expansion
        if (working.categoryId === undefined)
          working.categoryId = existing.categoryId
        if (working.usageExamples === undefined)
          working.usageExamples = existing.usageExamples
      } catch (e) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn(
            '[adminTaxonomyService] updateAbbreviation fallback fetch failed',
            { id, e },
          )
        }
      }
    }
    const payload: Record<string, unknown> = {
      // Canonical & legacy pairs
      term: working.term,
      abbreviation: working.term,
      expansion: working.expansion,
      full_form: working.expansion,
    }
    if (working.categoryId !== undefined) {
      payload.categoryId = working.categoryId
      payload.category_id = working.categoryId
    }
    if (working.usageExamples !== undefined) {
      payload.usageExamples = working.usageExamples
      payload.examples = working.usageExamples
    }
    const raw = await jsonFetch<unknown>(`${ABBREVIATIONS_PATH}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
    return normalizeSingleAbbreviation(raw)
  },
  async deleteAbbreviation(id: string): Promise<void> {
    await jsonFetch(`${ABBREVIATIONS_PATH}/${id}`, { method: 'DELETE' })
  },
}

export type { Category as AdminCategory, Abbreviation as AdminAbbreviation }
