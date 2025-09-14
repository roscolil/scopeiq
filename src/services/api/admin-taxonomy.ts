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
// Environment-Driven API Configuration (explicit version prefix required by backend)
// Backend requires /api/v1; configurable in case of future version increment.
// ---------------------------------------------------------------------------
const TAXONOMY_API_VERSION_PREFIX = (
  import.meta.env.VITE_TAXONOMY_API_VERSION_PREFIX || '/api/v1'
).replace(/\/$/, '')
const TAXONOMY_CATEGORIES_SEGMENT =
  import.meta.env.VITE_TAXONOMY_CATEGORIES_SEGMENT || 'categories'
const TAXONOMY_ABBREVIATIONS_SEGMENT =
  import.meta.env.VITE_TAXONOMY_ABBREVIATIONS_SEGMENT || 'abbreviations'

const CATEGORIES_PATH = `${TAXONOMY_API_VERSION_PREFIX}/${TAXONOMY_CATEGORIES_SEGMENT}`
const ABBREVIATIONS_PATH = `${TAXONOMY_API_VERSION_PREFIX}/${TAXONOMY_ABBREVIATIONS_SEGMENT}`

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
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[adminTaxonomyService] non-ok response', {
            url,
            status: res.status,
            statusText: res.statusText,
            body: text,
            headers: (() => {
              const h: Record<string, string> = {}
              res.headers.forEach((v, k) => {
                h[k] = v
              })
              return h
            })(),
          })
        }
        throw new Error(`Request failed ${res.status} ${res.statusText}`)
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
    return jsonFetch(`${CATEGORIES_PATH}/${id}`)
  },
  async createCategory(input: CreateCategoryInput): Promise<Category> {
    return jsonFetch(`${CATEGORIES_PATH}`, {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },
  async updateCategory(
    id: string,
    input: UpdateCategoryInput,
  ): Promise<Category> {
    return jsonFetch(`${CATEGORIES_PATH}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    })
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
      interface MaybeLegacyAbbrev extends Partial<Abbreviation> {
        definition?: string
        abbreviation?: string
      }
      const mutable: MaybeLegacyAbbrev = { ...a }
      if (!mutable.expansion && mutable.definition) {
        mutable.expansion = mutable.definition
      }
      if (!mutable.term && mutable.abbreviation) {
        mutable.term = mutable.abbreviation
      }
      return mutable as Abbreviation
    })
    return normalized
  },
  async getAbbreviation(id: string): Promise<Abbreviation> {
    return jsonFetch(`${ABBREVIATIONS_PATH}/${id}`)
  },
  async createAbbreviation(
    input: CreateAbbreviationInput,
  ): Promise<Abbreviation> {
    return jsonFetch(`${ABBREVIATIONS_PATH}`, {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },
  async updateAbbreviation(
    id: string,
    input: UpdateAbbreviationInput,
  ): Promise<Abbreviation> {
    return jsonFetch(`${ABBREVIATIONS_PATH}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    })
  },
  async deleteAbbreviation(id: string): Promise<void> {
    await jsonFetch(`${ABBREVIATIONS_PATH}/${id}`, { method: 'DELETE' })
  },
}

export type { Category as AdminCategory, Abbreviation as AdminAbbreviation }
