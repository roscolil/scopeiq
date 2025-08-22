import { aiTrainingService, TrainingExample } from './ai-training'
import { generateEmbedding } from './embedding'
import {
  upsertCommonTerms,
  NAMESPACE_CONFIG,
  CommonContentType,
} from './pinecone'
import { callOpenAI } from './openai'

/**
 * Service for generating training data from uploaded documents
 */

export interface DocumentTrainingOptions {
  category: string
  mode: 'auto-generate' | 'extract-only' | 'manual-review'
  maxExamples?: number
  qualityThreshold?: number
}

export interface GeneratedTrainingData {
  examples: TrainingExample[]
  extractedConcepts: string[]
  namespace: string
  processingStats: {
    totalContent: number
    conceptsExtracted: number
    examplesGenerated: number
    embeddings: number
  }
}

class AIDocumentTrainingService {
  /**
   * Process uploaded document for AI training
   */
  async processDocumentForTraining(
    file: File,
    content: string,
    options: DocumentTrainingOptions,
    logCallback?: (message: string) => void,
  ): Promise<GeneratedTrainingData> {
    const log = logCallback || console.log
    log(
      `Processing document ${file.name} for training in category: ${options.category}`,
    )

    const result: GeneratedTrainingData = {
      examples: [],
      extractedConcepts: [],
      namespace: this.getNamespaceForCategory(options.category),
      processingStats: {
        totalContent: content.length,
        conceptsExtracted: 0,
        examplesGenerated: 0,
        embeddings: 0,
      },
    }

    try {
      // Step 1: Extract key concepts and terminology
      log('Analyzing document content with AI...')
      const concepts = await this.extractKeyConcepts(
        content,
        options.category,
        log,
      )
      result.extractedConcepts = concepts
      result.processingStats.conceptsExtracted = concepts.length
      log(`Extracted ${concepts.length} key concepts from document`)

      // Step 2: Generate training examples based on mode
      if (
        options.mode === 'auto-generate' ||
        options.mode === 'manual-review'
      ) {
        log(
          `Generating up to ${options.maxExamples || 10} training Q&A examples...`,
        )
        const examples = await this.generateTrainingExamples(
          content,
          concepts,
          options.category,
          options.maxExamples || 10,
          log,
        )
        result.examples = examples
        result.processingStats.examplesGenerated = examples.length
        log(`Generated ${examples.length} training examples`)

        // Store training examples
        log('Storing training examples in database...')
        for (const example of examples) {
          await aiTrainingService.addTrainingExample({
            input: example.input,
            expectedOutput: example.expectedOutput,
            category: example.category,
            quality: example.quality,
            source: 'imported',
          })
        }
        log(`Stored ${examples.length} training examples in database`)
      }

      // Step 3: Create embeddings and store in appropriate namespace
      if (options.mode !== 'manual-review') {
        log('Creating embeddings and storing in knowledge base...')
        await this.storeInNamespace(
          content,
          concepts,
          result.namespace,
          options.category,
          log,
        )
        result.processingStats.embeddings = concepts.length + 1 // content + concepts
        log(`Stored embeddings in namespace: ${result.namespace}`)
      }

      log('Document processing completed successfully!')
      return result
    } catch (error) {
      const errorMsg = `Failed to process document: ${error instanceof Error ? error.message : 'Unknown error'}`
      log(`❌ ${errorMsg}`)
      throw new Error(errorMsg)
    }
  }

  /**
   * Extract key concepts and terminology from document content
   */
  private async extractKeyConcepts(
    content: string,
    category: string,
    logCallback?: (message: string) => void,
  ): Promise<string[]> {
    const log = logCallback || console.log

    const prompt = `Extract key concepts, technical terms, regulations, standards, and important information from the following construction document.
    
    Focus on extracting:
    - Technical definitions and terminology
    - Safety regulations and requirements
    - Building codes and standards
    - Material specifications
    - Procedural steps and guidelines
    - Compliance requirements
    - Industry-specific measurements and units
    
    Category context: ${category.replace('_', ' ')}
    
    Return a JSON array of extracted concepts, each as a clear, concise statement or definition.
    Limit to the 20 most important concepts.
    
    Document content: ${content.slice(0, 4000)}`

    try {
      log('Requesting AI analysis for concept extraction...')
      const response = await callOpenAI(prompt)
      const concepts = JSON.parse(response)

      // Ensure we return an array of strings
      if (Array.isArray(concepts)) {
        const validConcepts = concepts
          .filter(
            concept => typeof concept === 'string' && concept.trim().length > 0,
          )
          .map(concept => String(concept).trim())
          .slice(0, 20)

        log(`AI extracted ${validConcepts.length} valid concepts`)
        return validConcepts
      }

      log('AI response was not a valid array, using fallback extraction')
      return this.extractConceptsFallback(content, log)
    } catch (error) {
      log(
        `AI concept extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
      log('Using fallback pattern-based extraction...')
      // Fallback: extract sentences that look like definitions or requirements
      return this.extractConceptsFallback(content, log)
    }
  }

  /**
   * Fallback method to extract concepts using text patterns
   */
  private extractConceptsFallback(
    content: string,
    logCallback?: (message: string) => void,
  ): string[] {
    const log = logCallback || console.log
    const concepts: string[] = []
    const lines = content.split('\n')

    // Patterns that often indicate important concepts
    const patterns = [
      /^[A-Z][^.]*(?:shall|must|required|requirement|definition|means|refers to)/i,
      /^[A-Z][^.]*(?:code|standard|regulation|specification|guideline)/i,
      /^[A-Z][^.]*(?:minimum|maximum|at least|not less than|not more than)/i,
      /^[A-Z][^.]*(?:OSHA|ADA|IBC|IRC|NEC|UBC|AISC|ACI|ASTM)/i,
    ]

    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed.length > 20 && trimmed.length < 200) {
        for (const pattern of patterns) {
          if (pattern.test(trimmed)) {
            concepts.push(trimmed)
            break
          }
        }
      }
    }

    const result = concepts.slice(0, 15) // Limit to 15 concepts
    log(
      `Fallback extraction found ${result.length} concepts using pattern matching`,
    )
    return result
  }

  /**
   * Generate Q&A training examples from content and concepts
   */
  private async generateTrainingExamples(
    content: string,
    concepts: string[],
    category: string,
    maxExamples: number,
    logCallback?: (message: string) => void,
  ): Promise<TrainingExample[]> {
    const log = logCallback || console.log
    const conceptsText = concepts.join('\n- ')
    const prompt = `Generate high-quality question-answer pairs for training a construction AI assistant.
    
    Guidelines:
    - Questions should be realistic queries that construction professionals would ask
    - Answers should be accurate, specific, and based on the provided content
    - Focus on practical, actionable information
    - Include relevant codes, standards, or regulations when applicable
    - Vary question types: definitions, procedures, requirements, calculations, safety
    
    Category: ${category.replace('_', ' ')}
    
    Return a JSON array of objects with: { "question": "...", "answer": "...", "difficulty": "basic|intermediate|advanced" }

Based on this construction document content and extracted concepts, generate ${maxExamples} training Q&A pairs:

CONTENT EXCERPT:
${content.slice(0, 3000)}

KEY CONCEPTS:
- ${conceptsText}

Generate practical Q&A pairs that would help train an AI to answer construction-related questions.`

    try {
      log('Requesting AI generation of training Q&A examples...')
      const response = await callOpenAI(prompt)
      const rawExamples = JSON.parse(response)
      if (!Array.isArray(rawExamples)) {
        log('AI returned invalid response format for training examples')
        return []
      }

      // Convert to TrainingExample format
      const examples: TrainingExample[] = rawExamples
        .map((item, index) => ({
          id: `doc_${Date.now()}_${index}`,
          input: item.question || '',
          expectedOutput: item.answer || '',
          category,
          quality: this.assessQuality(
            item.difficulty,
            item.question,
            item.answer,
          ),
          source: 'generated' as const,
          createdAt: new Date().toISOString(),
        }))
        .filter(ex => ex.input.length > 10 && ex.expectedOutput.length > 20)

      const finalExamples = examples.slice(0, maxExamples)
      log(`Generated ${finalExamples.length} valid Q&A training examples`)
      return finalExamples
    } catch (error) {
      log(
        `Failed to generate training examples: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
      return []
    }
  }

  /**
   * Assess quality based on difficulty and content length
   */
  private assessQuality(
    difficulty?: string,
    question?: string,
    answer?: string,
  ): 'high' | 'medium' | 'low' {
    const questionLength = question?.length || 0
    const answerLength = answer?.length || 0

    if (difficulty === 'advanced' && questionLength > 50 && answerLength > 100)
      return 'high'
    if (
      difficulty === 'intermediate' &&
      questionLength > 30 &&
      answerLength > 80
    )
      return 'high'
    if (questionLength > 20 && answerLength > 50) return 'medium'
    return 'low'
  }

  /**
   * Store content and concepts in appropriate Pinecone namespace
   */
  private async storeInNamespace(
    content: string,
    concepts: string[],
    namespace: string,
    category: string,
    logCallback?: (message: string) => void,
  ): Promise<void> {
    const log = logCallback || console.log

    try {
      // Chunk content for embedding
      const chunks = this.chunkContent(content, 1000)

      // Ensure all items are strings and filter out invalid ones
      const validChunks = chunks.filter(
        chunk => typeof chunk === 'string' && chunk.trim().length > 0,
      )

      const validConcepts = concepts.filter(
        concept => typeof concept === 'string' && concept.trim().length > 0,
      )

      const allTexts = [...validChunks, ...validConcepts]

      // Check if we have valid text to process
      if (allTexts.length === 0) {
        log('No valid text content found for embedding generation')
        return
      }

      log(
        `Preparing ${allTexts.length} text segments for embedding generation...`,
      )

      // Generate embeddings with better error handling
      const embeddings: number[][] = []
      const processedTexts: string[] = []

      for (let i = 0; i < allTexts.length; i++) {
        const text = allTexts[i]

        // Double-check that text is a string
        if (typeof text !== 'string') {
          log(`Skipping non-string item at index ${i}`)
          continue
        }

        const trimmedText = text.trim()
        if (trimmedText.length === 0) {
          log(`Skipping empty text segment ${i + 1}`)
          continue
        }

        try {
          log(
            `Generating embedding ${embeddings.length + 1}/${allTexts.length} (${trimmedText.length} chars)`,
          )
          const embedding = await generateEmbedding(trimmedText)
          embeddings.push(embedding)
          processedTexts.push(trimmedText)
        } catch (embeddingError) {
          const errorMsg = `Failed to generate embedding for segment ${i + 1}: ${embeddingError instanceof Error ? embeddingError.message : 'Unknown error'}`
          log(`❌ ${errorMsg}`)
          throw new Error(errorMsg)
        }
      }

      if (embeddings.length === 0) {
        throw new Error('No embeddings were successfully generated')
      }

      // Prepare IDs and metadata for successful embeddings
      const ids = processedTexts.map(
        (_, index) => `${category}_${Date.now()}_${index}`,
      )

      const metadatas = processedTexts.map((text, index) => ({
        content: text,
        category,
        type: index < validChunks.length ? 'content_chunk' : 'concept',
        timestamp: Date.now(),
        source: 'document_training',
      }))

      // Store in appropriate namespace
      if (this.isCommonCategory(category)) {
        log(`Storing ${embeddings.length} embeddings in common namespace...`)
        await upsertCommonTerms(
          category as CommonContentType,
          ids,
          embeddings,
          metadatas,
        )
      } else {
        // Store in project-specific namespace (implement if needed)
        log(
          `Would store ${embeddings.length} embeddings in project namespace: ${namespace}`,
        )
      }

      log(
        `✅ Successfully stored ${embeddings.length} embeddings in namespace: ${namespace}`,
      )
    } catch (error) {
      const errorMsg = `Failed to store embeddings: ${error instanceof Error ? error.message : 'Unknown error'}`
      log(`❌ ${errorMsg}`)
      throw new Error(errorMsg)
    }
  }

  /**
   * Chunk content into manageable pieces for embedding
   */
  private chunkContent(content: string, maxChunkSize: number): string[] {
    // Ensure content is a string
    if (typeof content !== 'string') {
      console.warn(
        'chunkContent received non-string content:',
        typeof content,
        content,
      )
      return []
    }

    const chunks: string[] = []
    const sentences = content
      .split(/[.!?]+/)
      .filter(s => typeof s === 'string' && s.trim().length > 0)

    let currentChunk = ''

    for (const sentence of sentences) {
      // Ensure sentence is a string
      const sentenceStr =
        typeof sentence === 'string' ? sentence : String(sentence)

      if (
        currentChunk.length + sentenceStr.length > maxChunkSize &&
        currentChunk.length > 0
      ) {
        const trimmedChunk = currentChunk.trim()
        if (trimmedChunk.length > 0) {
          chunks.push(trimmedChunk)
        }
        currentChunk = sentenceStr
      } else {
        currentChunk += (currentChunk ? '. ' : '') + sentenceStr
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim())
    }

    // Filter out any non-string or empty chunks
    return chunks.filter(
      chunk => typeof chunk === 'string' && chunk.trim().length > 0,
    )
  }

  /**
   * Get appropriate namespace for category
   */
  private getNamespaceForCategory(category: string): string {
    const commonCategories = [
      'building_codes',
      'safety_regulations',
      'material_specifications',
      'environmental_compliance',
    ]

    if (commonCategories.includes(category)) {
      return NAMESPACE_CONFIG.common
    }

    // Project-specific categories would use project namespace
    return `category_${category}`
  }

  /**
   * Check if category should go in common namespace
   */
  private isCommonCategory(category: string): boolean {
    const commonCategories = [
      'building_codes',
      'safety_regulations',
      'material_specifications',
      'environmental_compliance',
    ]
    return commonCategories.includes(category)
  }

  /**
   * Batch process multiple documents
   */
  async batchProcessDocuments(
    documents: Array<{ file: File; content: string }>,
    options: DocumentTrainingOptions,
  ): Promise<GeneratedTrainingData[]> {
    const results: GeneratedTrainingData[] = []

    for (const doc of documents) {
      try {
        const result = await this.processDocumentForTraining(
          doc.file,
          doc.content,
          options,
        )
        results.push(result)

        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000))
      } catch (error) {
        console.error(`Error processing ${doc.file.name}:`, error)
        // Continue with other documents
      }
    }

    return results
  }

  /**
   * Get processing statistics
   */
  getProcessingStats(results: GeneratedTrainingData[]): {
    totalDocuments: number
    totalExamples: number
    totalConcepts: number
    categoryCoverage: Record<string, number>
  } {
    const stats = {
      totalDocuments: results.length,
      totalExamples: results.reduce((sum, r) => sum + r.examples.length, 0),
      totalConcepts: results.reduce(
        (sum, r) => sum + r.extractedConcepts.length,
        0,
      ),
      categoryCoverage: {} as Record<string, number>,
    }

    // Count examples per category
    for (const result of results) {
      for (const example of result.examples) {
        stats.categoryCoverage[example.category] =
          (stats.categoryCoverage[example.category] || 0) + 1
      }
    }

    return stats
  }
}

export const aiDocumentTrainingService = new AIDocumentTrainingService()
