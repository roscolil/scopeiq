/**
 * Processing message broadcasting service
 * Allows document processing services to broadcast status messages
 * that can be consumed by UI components
 */

export interface ProcessingMessage {
  documentId?: string
  projectId?: string
  type: 'info' | 'progress' | 'success' | 'error'
  message: string
  timestamp: number
  details?: {
    progress?: number // 0-100
    stage?: string
    batchInfo?: {
      current: number
      total: number
      size: number
    }
  }
}

type MessageListener = (message: ProcessingMessage) => void

class ProcessingMessageBroadcaster {
  private listeners: MessageListener[] = []
  private messageHistory: ProcessingMessage[] = []
  private readonly MAX_HISTORY = 50

  subscribe(listener: MessageListener): () => void {
    this.listeners.push(listener)

    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  broadcast(message: Omit<ProcessingMessage, 'timestamp'>): void {
    const fullMessage: ProcessingMessage = {
      ...message,
      timestamp: Date.now(),
    }

    // Add to history
    this.messageHistory.push(fullMessage)
    if (this.messageHistory.length > this.MAX_HISTORY) {
      this.messageHistory.shift()
    }

    // Notify all listeners
    this.listeners.forEach(listener => {
      try {
        listener(fullMessage)
      } catch (error) {
        console.error('Error in processing message listener:', error)
      }
    })
  }

  getRecentMessages(
    documentId?: string,
    projectId?: string,
    limit = 10,
  ): ProcessingMessage[] {
    let messages = this.messageHistory

    if (documentId) {
      messages = messages.filter(msg => msg.documentId === documentId)
    }

    if (projectId) {
      messages = messages.filter(msg => msg.projectId === projectId)
    }

    return messages.slice(-limit).sort((a, b) => b.timestamp - a.timestamp)
  }

  clear(documentId?: string, projectId?: string): void {
    if (!documentId && !projectId) {
      this.messageHistory = []
      return
    }

    this.messageHistory = this.messageHistory.filter(msg => {
      if (documentId && msg.documentId === documentId) return false
      if (projectId && msg.projectId === projectId) return false
      return true
    })
  }
}

// Global singleton instance
export const processingMessageBroadcaster = new ProcessingMessageBroadcaster()

// Convenience functions for common message types
export const broadcastProcessingMessage = {
  info: (message: string, documentId?: string, projectId?: string) => {
    processingMessageBroadcaster.broadcast({
      type: 'info',
      message,
      documentId,
      projectId,
    })
  },

  progress: (
    message: string,
    progress: number,
    documentId?: string,
    projectId?: string,
    stage?: string,
  ) => {
    processingMessageBroadcaster.broadcast({
      type: 'progress',
      message,
      documentId,
      projectId,
      details: { progress, stage },
    })
  },

  batchProgress: (
    currentBatch: number,
    totalBatches: number,
    batchSize: number,
    documentId?: string,
    projectId?: string,
  ) => {
    const progress = Math.round((currentBatch / totalBatches) * 100)
    processingMessageBroadcaster.broadcast({
      type: 'progress',
      message: `Processing batch ${currentBatch} of ${totalBatches} (${batchSize} chunks)`,
      documentId,
      projectId,
      details: {
        progress,
        stage: 'embedding',
        batchInfo: {
          current: currentBatch,
          total: totalBatches,
          size: batchSize,
        },
      },
    })
  },

  success: (message: string, documentId?: string, projectId?: string) => {
    processingMessageBroadcaster.broadcast({
      type: 'success',
      message,
      documentId,
      projectId,
    })
  },

  error: (message: string, documentId?: string, projectId?: string) => {
    processingMessageBroadcaster.broadcast({
      type: 'error',
      message,
      documentId,
      projectId,
    })
  },

  startProcessing: (
    message: string,
    documentId?: string,
    projectId?: string,
  ) => {
    // Clear previous messages for this document
    if (documentId) {
      processingMessageBroadcaster.clear(documentId)
    }

    // Broadcast the start message
    processingMessageBroadcaster.broadcast({
      type: 'info',
      message,
      documentId,
      projectId,
    })
  },
}
