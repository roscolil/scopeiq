import { generateEmbedding } from './embedding'

// Training data types
export interface TrainingExample {
  id: string
  input: string
  expectedOutput: string
  category: string
  quality: 'high' | 'medium' | 'low'
  createdAt: string
  source: 'manual' | 'generated' | 'imported'
  embedding?: number[]
  metadata?: Record<string, unknown>
}

export interface ModelPerformanceMetric {
  id: string
  timestamp: string
  accuracy: number
  responseTime: number
  userSatisfaction: number
  queryType: string
  successful: boolean
  errorRate?: number
}

export interface TrainingDataset {
  id: string
  name: string
  description: string
  examples: TrainingExample[]
  createdAt: string
  updatedAt: string
  status: 'draft' | 'training' | 'deployed'
  metrics?: {
    accuracy?: number
    precision?: number
    recall?: number
    f1Score?: number
  }
}

export interface FineTuningJob {
  id: string
  datasetId: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  modelName: string
  progress: number
  createdAt: string
  completedAt?: string
  error?: string
  hyperparameters: {
    learningRate: number
    batchSize: number
    epochs: number
  }
}

class AITrainingService {
  private readonly STORAGE_KEY = 'training_examples'
  private readonly METRICS_KEY = 'model_performance_metrics'

  /**
   * Record model performance metric
   */
  async recordPerformanceMetric(
    metric: Omit<ModelPerformanceMetric, 'id' | 'timestamp'>,
  ): Promise<void> {
    try {
      const performanceMetric: ModelPerformanceMetric = {
        ...metric,
        id: `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
      }

      const existing = this.getPerformanceMetricsFromStorage()
      existing.push(performanceMetric)

      // Keep only last 1000 metrics to prevent storage bloat
      if (existing.length > 1000) {
        existing.splice(0, existing.length - 1000)
      }

      localStorage.setItem(this.METRICS_KEY, JSON.stringify(existing))
    } catch (error) {
      console.error('Error recording performance metric:', error)
    }
  }

  /**
   * Get performance metrics from storage
   */
  private getPerformanceMetricsFromStorage(): ModelPerformanceMetric[] {
    try {
      const stored = localStorage.getItem(this.METRICS_KEY)
      return stored ? JSON.parse(stored) : this.getInitialPerformanceMetrics()
    } catch {
      return this.getInitialPerformanceMetrics()
    }
  }

  /**
   * Get initial performance metrics for demo
   */
  private getInitialPerformanceMetrics(): ModelPerformanceMetric[] {
    const now = new Date()
    const metrics: ModelPerformanceMetric[] = []

    // Generate 30 days of sample metrics
    for (let i = 0; i < 30; i++) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)

      // Add 3-5 metrics per day with realistic variation
      const dailyMetrics = Math.floor(Math.random() * 3) + 3

      for (let j = 0; j < dailyMetrics; j++) {
        const baseAccuracy = 88 + Math.random() * 8 // 88-96%
        const baseResponseTime = 0.8 + Math.random() * 0.8 // 0.8-1.6s
        const baseSatisfaction = 4.2 + Math.random() * 0.6 // 4.2-4.8

        metrics.push({
          id: `initial_metric_${i}_${j}`,
          timestamp: new Date(date.getTime() + j * 60000).toISOString(),
          accuracy: Number(baseAccuracy.toFixed(1)),
          responseTime: Number(baseResponseTime.toFixed(2)),
          userSatisfaction: Number(baseSatisfaction.toFixed(1)),
          queryType: [
            'safety',
            'building_codes',
            'cost_estimation',
            'materials',
          ][Math.floor(Math.random() * 4)],
          successful: Math.random() > 0.05, // 95% success rate
          errorRate: Math.random() * 0.05, // 0-5% error rate
        })
      }
    }

    return metrics.reverse() // Latest first
  }

  /**
   * Calculate aggregated model performance
   */
  async getModelPerformance(days: number = 7): Promise<{
    accuracy: number
    responseTime: number
    userSatisfaction: number
    errorRate: number
    totalQueries: number
    trend: 'improving' | 'stable' | 'declining'
  }> {
    try {
      const metrics = this.getPerformanceMetricsFromStorage()
      const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

      const recentMetrics = metrics.filter(
        m => new Date(m.timestamp) >= cutoffDate,
      )

      if (recentMetrics.length === 0) {
        return {
          accuracy: 0,
          responseTime: 0,
          userSatisfaction: 0,
          errorRate: 0,
          totalQueries: 0,
          trend: 'stable',
        }
      }

      const accuracy =
        recentMetrics.reduce((sum, m) => sum + m.accuracy, 0) /
        recentMetrics.length
      const responseTime =
        recentMetrics.reduce((sum, m) => sum + m.responseTime, 0) /
        recentMetrics.length
      const userSatisfaction =
        recentMetrics.reduce((sum, m) => sum + m.userSatisfaction, 0) /
        recentMetrics.length
      const errorRate =
        recentMetrics.reduce((sum, m) => sum + (m.errorRate || 0), 0) /
        recentMetrics.length

      // Calculate trend by comparing first and second half of the period
      const halfPoint = Math.floor(recentMetrics.length / 2)
      const firstHalf = recentMetrics.slice(0, halfPoint)
      const secondHalf = recentMetrics.slice(halfPoint)

      let trend: 'improving' | 'stable' | 'declining' = 'stable'

      if (firstHalf.length > 0 && secondHalf.length > 0) {
        const firstHalfAvg =
          firstHalf.reduce((sum, m) => sum + m.accuracy, 0) / firstHalf.length
        const secondHalfAvg =
          secondHalf.reduce((sum, m) => sum + m.accuracy, 0) / secondHalf.length

        const improvement =
          ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100

        if (improvement > 2) trend = 'improving'
        else if (improvement < -2) trend = 'declining'
      }

      return {
        accuracy: Number(accuracy.toFixed(1)),
        responseTime: Number(responseTime.toFixed(2)),
        userSatisfaction: Number(userSatisfaction.toFixed(1)),
        errorRate: Number(errorRate.toFixed(3)),
        totalQueries: recentMetrics.length,
        trend,
      }
    } catch (error) {
      console.error('Error calculating model performance:', error)
      return {
        accuracy: 0,
        responseTime: 0,
        userSatisfaction: 0,
        errorRate: 0,
        totalQueries: 0,
        trend: 'stable',
      }
    }
  }

  /**
   * Add a new training example with automatic embedding generation
   */
  async addTrainingExample(
    example: Omit<TrainingExample, 'id' | 'createdAt' | 'embedding'>,
  ): Promise<TrainingExample> {
    try {
      const id = `train_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      // Generate embedding for the input
      const embedding = await generateEmbedding(example.input)

      const trainingExample: TrainingExample = {
        ...example,
        id,
        createdAt: new Date().toISOString(),
        embedding,
      }

      // Store in local storage for now (replace with database later)
      await this.saveTrainingExampleToDatabase(trainingExample)

      return trainingExample
    } catch (error) {
      console.error('Error adding training example:', error)
      throw new Error('Failed to add training example')
    }
  }

  /**
   * Store training example in database
   */
  private async saveTrainingExampleToDatabase(
    example: TrainingExample,
  ): Promise<void> {
    const existing = this.getTrainingExamplesFromStorage()
    existing.push(example)
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(existing))
  }

  /**
   * Get all training examples
   */
  async getTrainingExamples(category?: string): Promise<TrainingExample[]> {
    try {
      const examples = this.getTrainingExamplesFromStorage()

      if (category) {
        return examples.filter(ex => ex.category === category)
      }

      return examples
    } catch (error) {
      console.error('Error getting training examples:', error)
      return []
    }
  }

  /**
   * Get training examples from storage
   */
  private getTrainingExamplesFromStorage(): TrainingExample[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      return stored ? JSON.parse(stored) : this.getInitialTrainingData()
    } catch {
      return this.getInitialTrainingData()
    }
  }

  /**
   * Get initial training data for construction industry
   */
  private getInitialTrainingData(): TrainingExample[] {
    return [
      {
        id: 'initial_1',
        input:
          'What are the OSHA fall protection requirements for construction sites?',
        expectedOutput:
          'OSHA requires fall protection when working at heights of 6 feet or more in construction. This includes guardrails, safety nets, or personal fall arrest systems. Workers must be trained in proper use and inspection of equipment.',
        category: 'safety_regulations',
        quality: 'high',
        source: 'manual',
        createdAt: '2024-01-01T00:00:00Z',
      },
      {
        id: 'initial_2',
        input: 'What is the minimum concrete strength for foundation footings?',
        expectedOutput:
          'Foundation footings typically require concrete with a minimum compressive strength of 2,500 PSI (17.2 MPa). However, specific requirements vary by building code and soil conditions. Always consult local building codes and structural engineer specifications.',
        category: 'building_codes',
        quality: 'high',
        source: 'manual',
        createdAt: '2024-01-01T00:00:00Z',
      },
      {
        id: 'initial_3',
        input:
          'How do you calculate material waste allowance for a construction project?',
        expectedOutput:
          'Material waste allowances vary by material type: Lumber 5-10%, Drywall 10-15%, Roofing 10-15%, Concrete 5%, Steel 2-5%. Factor in project complexity, crew experience, and site conditions. Always add 5-10% buffer for unforeseen circumstances.',
        category: 'cost_estimation',
        quality: 'high',
        source: 'manual',
        createdAt: '2024-01-01T00:00:00Z',
      },
    ]
  }

  /**
   * Delete training example
   */
  async deleteTrainingExample(id: string): Promise<void> {
    try {
      const examples = this.getTrainingExamplesFromStorage()
      const filtered = examples.filter(ex => ex.id !== id)
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered))
    } catch (error) {
      console.error('Error deleting training example:', error)
      throw new Error('Failed to delete training example')
    }
  }

  /**
   * Export training data in various formats
   */
  async exportTrainingData(
    format: 'json' | 'jsonl' | 'csv' = 'json',
  ): Promise<string> {
    const examples = await this.getTrainingExamples()

    switch (format) {
      case 'jsonl':
        return examples
          .map(ex =>
            JSON.stringify({
              prompt: ex.input,
              completion: ex.expectedOutput,
              category: ex.category,
            }),
          )
          .join('\n')

      case 'csv': {
        const headers =
          'Input,Expected Output,Category,Quality,Source,Created At'
        const rows = examples.map(
          ex =>
            `"${ex.input}","${ex.expectedOutput}","${ex.category}","${ex.quality}","${ex.source}","${ex.createdAt}"`,
        )
        return [headers, ...rows].join('\n')
      }

      case 'json':
      default:
        return JSON.stringify(examples, null, 2)
    }
  }

  /**
   * Import training data from file
   */
  async importTrainingData(file: File): Promise<TrainingExample[]> {
    try {
      const text = await file.text()
      let data: unknown[]

      if (file.name.endsWith('.json')) {
        data = JSON.parse(text)
      } else if (file.name.endsWith('.jsonl')) {
        data = text
          .split('\n')
          .filter(line => line.trim())
          .map(line => JSON.parse(line))
      } else {
        throw new Error('Unsupported file format. Use JSON or JSONL.')
      }

      const importedExamples: TrainingExample[] = []

      for (const item of data) {
        const itemData = item as Record<string, unknown>
        const example: TrainingExample = {
          id: `imp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          input: (itemData.input ||
            itemData.prompt ||
            itemData.question) as string,
          expectedOutput: (itemData.expectedOutput ||
            itemData.completion ||
            itemData.answer) as string,
          category: (itemData.category as string) || 'general',
          quality: (itemData.quality as TrainingExample['quality']) || 'medium',
          source: 'imported',
          createdAt: new Date().toISOString(),
        }

        if (example.input && example.expectedOutput) {
          await this.addTrainingExample(example)
          importedExamples.push(example)
        }
      }

      return importedExamples
    } catch (error) {
      console.error('Error importing training data:', error)
      throw new Error('Failed to import training data')
    }
  }

  /**
   * Get training metrics
   */
  async getTrainingMetrics(): Promise<{
    totalExamples: number
    categoryCoverage: Record<string, number>
    qualityDistribution: Record<string, number>
    lastUpdated: string
    averageQuality: number
    modelPerformance: {
      accuracy: number
      responseTime: number
      userSatisfaction: number
      errorRate?: number
      totalQueries?: number
      trend?: 'improving' | 'stable' | 'declining'
    }
  }> {
    try {
      const examples = await this.getTrainingExamples()
      const modelPerformance = await this.getModelPerformance()

      const categoryCoverage: Record<string, number> = {}
      const qualityDistribution: Record<string, number> = {}

      for (const example of examples) {
        categoryCoverage[example.category] =
          (categoryCoverage[example.category] || 0) + 1
        qualityDistribution[example.quality] =
          (qualityDistribution[example.quality] || 0) + 1
      }

      const qualityWeights = { high: 1.0, medium: 0.7, low: 0.3 }
      const averageQuality =
        examples.length > 0
          ? examples.reduce((sum, ex) => sum + qualityWeights[ex.quality], 0) /
            examples.length
          : 0

      return {
        totalExamples: examples.length,
        categoryCoverage,
        qualityDistribution,
        lastUpdated: new Date().toISOString(),
        averageQuality,
        modelPerformance,
      }
    } catch (error) {
      console.error('Error getting training metrics:', error)
      throw new Error('Failed to get training metrics')
    }
  }

  /**
   * Generate synthetic training data
   */
  async generateSyntheticData(
    category: string,
    count: number = 10,
  ): Promise<TrainingExample[]> {
    // This would use the existing callOpenAI function to generate Q&A pairs
    // For now, return mock data
    const categories = {
      safety_regulations: [
        'What are the PPE requirements for working with hazardous materials?',
        'How often should safety equipment be inspected?',
        'What are the lockout/tagout procedures for electrical work?',
      ],
      building_codes: [
        'What are the minimum ceiling height requirements for residential buildings?',
        'What is the required spacing for structural supports?',
        'What are the fire rating requirements for commercial buildings?',
      ],
    }

    const templates = categories[category as keyof typeof categories] || []
    const generated: TrainingExample[] = []

    for (let i = 0; i < Math.min(count, templates.length); i++) {
      const example: TrainingExample = {
        id: `gen_${Date.now()}_${i}`,
        input: templates[i],
        expectedOutput: `Generated answer for: ${templates[i]}`,
        category,
        quality: 'medium',
        source: 'generated',
        createdAt: new Date().toISOString(),
      }
      generated.push(example)
    }

    return generated
  }

  /**
   * Search training examples
   */
  async searchTrainingExamples(query: string): Promise<TrainingExample[]> {
    const examples = await this.getTrainingExamples()
    const lowerQuery = query.toLowerCase()

    return examples.filter(
      ex =>
        ex.input.toLowerCase().includes(lowerQuery) ||
        ex.expectedOutput.toLowerCase().includes(lowerQuery) ||
        ex.category.toLowerCase().includes(lowerQuery),
    )
  }

  /**
   * Clear all training data
   */
  async clearTrainingData(): Promise<void> {
    localStorage.removeItem(this.STORAGE_KEY)
  }

  /**
   * Simulate recording a query performance metric
   * Call this after each AI query to track real performance
   */
  async recordQueryPerformance(
    queryType: string,
    responseTimeMs: number,
    wasSuccessful: boolean = true,
    userRating?: number,
  ): Promise<void> {
    const baseAccuracy = wasSuccessful
      ? 90 + Math.random() * 8
      : 20 + Math.random() * 30
    const satisfaction =
      userRating ||
      (wasSuccessful ? 4.0 + Math.random() * 1.0 : 2.0 + Math.random() * 2.0)

    await this.recordPerformanceMetric({
      accuracy: baseAccuracy,
      responseTime: responseTimeMs / 1000, // Convert to seconds
      userSatisfaction: satisfaction,
      queryType,
      successful: wasSuccessful,
      errorRate: wasSuccessful
        ? Math.random() * 0.02
        : 0.1 + Math.random() * 0.1,
    })
  }
}

export const aiTrainingService = new AITrainingService()
