// Simple event emitter for document-level events (currently deletion)
// Mirrors the lightweight pattern used for processing messages but simplified.

export interface DocumentDeletionPayload {
  projectId: string
  documentId: string
  companyId?: string
  name?: string
}

type DeletionListener = (payload: DocumentDeletionPayload) => void

class DocumentDeletionEmitter {
  private listeners = new Set<DeletionListener>()

  subscribe(listener: DeletionListener) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  emitDeletion(payload: DocumentDeletionPayload) {
    for (const l of this.listeners) {
      try {
        l(payload)
      } catch (e) {
        console.warn('documentDeletionEvents listener failed', e)
      }
    }
  }
}

export const documentDeletionEvents = new DocumentDeletionEmitter()
