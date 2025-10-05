/**
 * LocalStorage Manager with LRU Eviction and Size Limits
 *
 * Prevents memory bloat by:
 * - Limiting total localStorage size
 * - Implementing LRU (Least Recently Used) eviction
 * - Auto-cleaning expired entries
 * - Providing namespace isolation
 */

const MAX_STORAGE_SIZE = 8 * 1024 * 1024 // 8MB limit
const STORAGE_METADATA_KEY = '__storage_metadata__'

interface StorageMetadata {
  [key: string]: {
    size: number
    lastAccessed: number
    expiresAt?: number
  }
}

interface StorageOptions {
  ttl?: number // Time to live in milliseconds
  compress?: boolean
}

class LocalStorageManager {
  private getMetadata(): StorageMetadata {
    try {
      const metadata = localStorage.getItem(STORAGE_METADATA_KEY)
      return metadata ? JSON.parse(metadata) : {}
    } catch {
      return {}
    }
  }

  private setMetadata(metadata: StorageMetadata): void {
    try {
      localStorage.setItem(STORAGE_METADATA_KEY, JSON.stringify(metadata))
    } catch (error) {
      console.warn('Failed to save storage metadata:', error)
    }
  }

  private updateMetadata(key: string, size: number, ttl?: number): void {
    const metadata = this.getMetadata()
    metadata[key] = {
      size,
      lastAccessed: Date.now(),
      expiresAt: ttl ? Date.now() + ttl : undefined,
    }
    this.setMetadata(metadata)
  }

  private removeMetadata(key: string): void {
    const metadata = this.getMetadata()
    delete metadata[key]
    this.setMetadata(metadata)
  }

  /**
   * Get current storage size in bytes
   */
  getCurrentSize(): number {
    const metadata = this.getMetadata()
    return Object.values(metadata).reduce((sum, item) => sum + item.size, 0)
  }

  /**
   * Check if storage is over limit
   */
  isOverLimit(): boolean {
    return this.getCurrentSize() > MAX_STORAGE_SIZE
  }

  /**
   * Get storage usage statistics
   */
  getStats() {
    const metadata = this.getMetadata()
    const totalSize = this.getCurrentSize()
    const itemCount = Object.keys(metadata).length

    return {
      totalSize,
      totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
      maxSizeMB: (MAX_STORAGE_SIZE / (1024 * 1024)).toFixed(2),
      usagePercent: ((totalSize / MAX_STORAGE_SIZE) * 100).toFixed(1),
      itemCount,
      items: Object.entries(metadata).map(([key, data]) => ({
        key,
        sizeMB: (data.size / (1024 * 1024)).toFixed(3),
        lastAccessed: new Date(data.lastAccessed).toISOString(),
        expired: data.expiresAt ? Date.now() > data.expiresAt : false,
      })),
    }
  }

  /**
   * Set item with automatic eviction if needed
   */
  setItem(key: string, value: string, options: StorageOptions = {}): boolean {
    try {
      const size = new Blob([value]).size

      // Clean expired items first
      this.cleanExpired()

      // If still over limit, evict LRU items
      if (this.getCurrentSize() + size > MAX_STORAGE_SIZE) {
        this.evictLRU(size)
      }

      localStorage.setItem(key, value)
      this.updateMetadata(key, size, options.ttl)

      return true
    } catch (error) {
      console.error('Failed to set item:', key, error)
      // Try emergency cleanup and retry once
      this.emergencyCleanup()
      try {
        localStorage.setItem(key, value)
        this.updateMetadata(key, new Blob([value]).size, options.ttl)
        return true
      } catch {
        return false
      }
    }
  }

  /**
   * Get item and update last accessed time
   */
  getItem(key: string): string | null {
    try {
      const value = localStorage.getItem(key)
      if (!value) return null

      // Check if expired
      const metadata = this.getMetadata()
      const itemMeta = metadata[key]

      if (itemMeta?.expiresAt && Date.now() > itemMeta.expiresAt) {
        this.removeItem(key)
        return null
      }

      // Update last accessed time
      if (itemMeta) {
        itemMeta.lastAccessed = Date.now()
        this.setMetadata(metadata)
      }

      return value
    } catch (error) {
      console.warn('Failed to get item:', key, error)
      return null
    }
  }

  /**
   * Remove item and its metadata
   */
  removeItem(key: string): void {
    try {
      localStorage.removeItem(key)
      this.removeMetadata(key)
    } catch (error) {
      console.warn('Failed to remove item:', key, error)
    }
  }

  /**
   * Clean expired items
   */
  cleanExpired(): number {
    const metadata = this.getMetadata()
    const now = Date.now()
    let cleaned = 0

    Object.entries(metadata).forEach(([key, data]) => {
      if (data.expiresAt && now > data.expiresAt) {
        this.removeItem(key)
        cleaned++
      }
    })

    console.log(`[Storage] Cleaned ${cleaned} expired items`)
    return cleaned
  }

  /**
   * Evict least recently used items to make space
   */
  evictLRU(neededSpace: number): number {
    const metadata = this.getMetadata()
    const sortedItems = Object.entries(metadata).sort(
      ([, a], [, b]) => a.lastAccessed - b.lastAccessed,
    )

    let freedSpace = 0
    let evicted = 0

    for (const [key, data] of sortedItems) {
      if (freedSpace >= neededSpace) break

      this.removeItem(key)
      freedSpace += data.size
      evicted++
    }

    console.log(
      `[Storage] Evicted ${evicted} LRU items, freed ${(freedSpace / 1024).toFixed(2)}KB`,
    )
    return evicted
  }

  /**
   * Emergency cleanup - remove all caches
   */
  emergencyCleanup(): void {
    console.warn('[Storage] Emergency cleanup triggered!')

    const protectedKeys = [
      'authState',
      'authTimestamp',
      'tokenIssuedAt',
      STORAGE_METADATA_KEY,
    ]

    const metadata = this.getMetadata()
    Object.keys(metadata).forEach(key => {
      if (!protectedKeys.includes(key)) {
        this.removeItem(key)
      }
    })

    console.log('[Storage] Emergency cleanup complete')
  }

  /**
   * Clean items by pattern
   */
  cleanByPattern(pattern: RegExp): number {
    const metadata = this.getMetadata()
    let cleaned = 0

    Object.keys(metadata).forEach(key => {
      if (pattern.test(key)) {
        this.removeItem(key)
        cleaned++
      }
    })

    console.log(
      `[Storage] Cleaned ${cleaned} items matching pattern: ${pattern}`,
    )
    return cleaned
  }

  /**
   * Clean old project/document caches
   */
  cleanOldCaches(maxAge: number = 7 * 24 * 60 * 60 * 1000): number {
    const metadata = this.getMetadata()
    const now = Date.now()
    let cleaned = 0

    Object.entries(metadata).forEach(([key, data]) => {
      const age = now - data.lastAccessed
      const isCacheKey =
        key.includes('project_') ||
        key.includes('documents_') ||
        key.includes('dashboard_')

      if (isCacheKey && age > maxAge) {
        this.removeItem(key)
        cleaned++
      }
    })

    console.log(
      `[Storage] Cleaned ${cleaned} old caches (>${maxAge / (24 * 60 * 60 * 1000)} days)`,
    )
    return cleaned
  }

  /**
   * Initialize storage manager - run on app startup
   */
  initialize(): void {
    console.log('[Storage] Initializing storage manager...')

    // Clean expired items
    this.cleanExpired()

    // Clean old caches (7 days)
    this.cleanOldCaches()

    // If still over limit, evict LRU
    if (this.isOverLimit()) {
      const excess = this.getCurrentSize() - MAX_STORAGE_SIZE * 0.8 // Target 80%
      this.evictLRU(excess)
    }

    const stats = this.getStats()
    console.log(
      `[Storage] Initialized - ${stats.usagePercent}% used (${stats.totalSizeMB}/${stats.maxSizeMB}MB)`,
    )
  }

  /**
   * Clear all storage (dangerous!)
   */
  clearAll(): void {
    console.warn('[Storage] Clearing all localStorage!')
    localStorage.clear()
  }
}

// Singleton instance
export const storageManager = new LocalStorageManager()

// Initialize on import
if (typeof window !== 'undefined') {
  storageManager.initialize()
}

// Helper functions for common operations
export const storage = {
  set: (key: string, value: any, ttl?: number) => {
    return storageManager.setItem(key, JSON.stringify(value), { ttl })
  },

  get: <T = any>(key: string): T | null => {
    const value = storageManager.getItem(key)
    if (!value) return null
    try {
      return JSON.parse(value) as T
    } catch {
      return value as any
    }
  },

  remove: (key: string) => {
    storageManager.removeItem(key)
  },

  getStats: () => storageManager.getStats(),

  cleanOldCaches: () => storageManager.cleanOldCaches(),

  emergencyCleanup: () => storageManager.emergencyCleanup(),
}

export default storageManager
