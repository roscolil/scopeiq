import React, { useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import {
  Upload,
  FileText,
  Info,
  CheckCircle,
  AlertCircle,
  Brain,
  Zap,
  Database,
  X,
} from 'lucide-react'
import {
  aiDocumentTrainingService,
  DocumentTrainingOptions,
  GeneratedTrainingData,
} from '@/services/ai/ai-document-training'
import { extractTextFromFile } from '@/services/ai/embedding'

interface AITrainingUploaderProps {
  onTrainingDataGenerated: (data: GeneratedTrainingData) => void
}

export const AITrainingUploader: React.FC<AITrainingUploaderProps> = ({
  onTrainingDataGenerated,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStep, setProcessingStep] = useState('')
  const [progress, setProgress] = useState(0)
  const [processingLogs, setProcessingLogs] = useState<string[]>([])
  const [trainingOptions, setTrainingOptions] =
    useState<DocumentTrainingOptions>({
      category: 'general',
      mode: 'auto-generate',
      maxExamples: 10,
      qualityThreshold: 0.7,
    })
  const [results, setResults] = useState<GeneratedTrainingData | null>(null)
  const { toast } = useToast()

  // Add log entry with timestamp
  const addProcessingLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    const logEntry = `[${timestamp}] ${message}`
    setProcessingLogs(prev => [...prev, logEntry])
  }

  // Clear logs when starting new processing
  const clearProcessingLogs = () => {
    setProcessingLogs([])
  }

  const categories = [
    'building_codes',
    'safety_regulations',
    'material_specifications',
    'project_management',
    'cost_estimation',
    'quality_control',
    'equipment_operation',
    'environmental_compliance',
    'general',
  ]

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
    ]

    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Invalid File Type',
        description: 'Please upload PDF, DOCX, DOC, or TXT files only.',
        variant: 'destructive',
      })
      return
    }

    // Validate file size (10MB limit for training documents)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'File Too Large',
        description: 'Please upload files smaller than 10MB for training.',
        variant: 'destructive',
      })
      return
    }

    setSelectedFile(file)
    setResults(null)
  }

  const processDocumentForTraining = async () => {
    if (!selectedFile) return

    setIsProcessing(true)
    setProgress(0)
    clearProcessingLogs()
    setProcessingStep('Analyzing document structure and content...')

    try {
      // Step 1: Extract text (0-25%)
      addProcessingLog(`Starting document processing: ${selectedFile.name}`)
      addProcessingLog(
        `File size: ${(selectedFile.size / 1024 / 1024).toFixed(2)} MB`,
      )
      addProcessingLog(
        'Analyzing document structure and extracting all text content...',
      )

      setProgress(10)
      const content = await extractTextFromFile(selectedFile)

      if (!content || content.trim().length < 100) {
        throw new Error(
          'Document contains insufficient text content for training',
        )
      }

      addProcessingLog(`Extracted ${content.length} characters of text content`)
      addProcessingLog(`Selected category: ${trainingOptions.category}`)
      addProcessingLog(`Processing mode: ${trainingOptions.mode}`)

      setProgress(25)
      setProcessingStep('Processing content with advanced AI analysis...')

      // Step 2: Process with AI service (25-100%)
      addProcessingLog('Initializing GPT-4 Turbo for content analysis...')
      const result = await aiDocumentTrainingService.processDocumentForTraining(
        selectedFile,
        content,
        trainingOptions,
        addProcessingLog, // Pass the log function
      )

      setProgress(75)
      setProcessingStep('Creating semantic embeddings and training data...')
      addProcessingLog(
        'Generating vector embeddings and knowledge structures...',
      )

      // Simulate final processing step
      await new Promise(resolve => setTimeout(resolve, 1000))

      setProgress(100)
      setProcessingStep('Training data generated successfully!')
      addProcessingLog(
        `✅ Successfully generated ${result.examples.length} training examples`,
      )
      addProcessingLog(
        `✅ Extracted ${result.extractedConcepts.length} key concepts`,
      )
      addProcessingLog(
        `✅ Created ${result.processingStats.embeddings} embeddings`,
      )
      addProcessingLog('Document processing completed - ready for next upload')

      setResults(result)
      onTrainingDataGenerated(result)

      // Clear the selected file after successful processing
      setSelectedFile(null)

      toast({
        title: 'Training Data Generated',
        description: `Generated ${result.examples.length} training examples and ${result.extractedConcepts.length} concepts.`,
      })
    } catch (error) {
      console.error('Error processing document:', error)

      let errorMessage = 'Failed to process document for training.'

      if (error instanceof Error) {
        if (error.message.includes('OpenAI API key')) {
          errorMessage =
            'OpenAI API key is not configured. Please check your environment variables.'
        } else if (error.message.includes('rate limit')) {
          errorMessage =
            'API rate limit exceeded. Please try again in a few minutes.'
        } else if (error.message.includes('embedding')) {
          errorMessage =
            'Failed to generate text embeddings. Please check your API configuration.'
        } else if (error.message.includes('insufficient text')) {
          errorMessage =
            'Document contains insufficient text content. Please try a different document.'
        } else {
          errorMessage = error.message
        }
      }

      addProcessingLog(`❌ Error: ${errorMessage}`)

      toast({
        title: 'Processing Failed',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setIsProcessing(false)
      setProgress(0)
      setProcessingStep('')
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) {
      // Simulate file selection
      const fileList = [file]
      Object.defineProperty(fileList, 'item', {
        value: (index: number) => fileList[index] || null,
      })
      const mockEvent = {
        target: { files: fileList },
      } as unknown as React.ChangeEvent<HTMLInputElement>
      handleFileSelect(mockEvent)
    }
  }

  return (
    <div className="space-y-6">
      {/* Configuration */}
      <Card className="bg-slate-900/50 border-slate-700/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Brain className="h-5 w-5" />
            Training Configuration
          </CardTitle>
          <CardDescription className="text-slate-200">
            Configure how the document should be processed for AI training
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label
                htmlFor="category-select"
                className="text-sm font-medium text-white"
              >
                Category
              </label>
              <select
                id="category-select"
                value={trainingOptions.category}
                onChange={e =>
                  setTrainingOptions(prev => ({
                    ...prev,
                    category: e.target.value,
                  }))
                }
                className="w-full p-2 bg-slate-800/70 border border-slate-600 rounded-md text-white"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat.replace('_', ' ').toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="mode-select"
                className="text-sm font-medium text-white"
              >
                Processing Mode
              </label>
              <select
                id="mode-select"
                value={trainingOptions.mode}
                onChange={e =>
                  setTrainingOptions(prev => ({
                    ...prev,
                    mode: e.target.value as DocumentTrainingOptions['mode'],
                  }))
                }
                className="w-full p-2 bg-slate-800/70 border border-slate-600 rounded-md text-white"
              >
                <option value="auto-generate">Auto-generate Q&A pairs</option>
                <option value="extract-only">Extract concepts only</option>
                <option value="manual-review">Generate + Manual review</option>
              </select>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="examples-select"
                className="text-sm font-medium text-white"
              >
                Max Examples
              </label>
              <select
                id="examples-select"
                value={trainingOptions.maxExamples}
                onChange={e =>
                  setTrainingOptions(prev => ({
                    ...prev,
                    maxExamples: parseInt(e.target.value),
                  }))
                }
                className="w-full p-2 bg-slate-800/70 border border-slate-600 rounded-md text-white"
              >
                <option value={5}>5 examples</option>
                <option value={10}>10 examples</option>
                <option value={15}>15 examples</option>
                <option value={20}>20 examples</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload Area */}
      <Card className="bg-slate-900/50 border-slate-700/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Upload className="h-5 w-5" />
            Document Upload
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className="border-2 border-dashed border-primary/50 rounded-lg p-8 text-center hover:border-primary/70 hover:bg-primary/5 transition-all duration-200 cursor-pointer bg-slate-800/20"
          >
            {selectedFile ? (
              <div className="space-y-4">
                <FileText className="h-12 w-12 text-blue-400 mx-auto" />
                <div>
                  <p className="text-white font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-slate-400">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <div className="flex gap-2 justify-center">
                  <Button
                    variant="default"
                    onClick={() => setSelectedFile(null)}
                    disabled={isProcessing}
                    className="bg-red-600 hover:bg-red-700 text-white font-medium px-4 py-2 border border-red-500"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Remove
                  </Button>
                  <Button
                    onClick={processDocumentForTraining}
                    disabled={isProcessing}
                    className="bg-primary hover:bg-primary/90"
                  >
                    <Brain className="h-4 w-4 mr-2" />
                    {isProcessing ? 'Processing...' : 'Generate Training Data'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-full bg-primary/10 border border-primary/20 mx-auto w-fit">
                  <Upload className="h-12 w-12 text-primary mx-auto" />
                </div>
                <div>
                  <p className="text-white font-medium mb-2 text-lg">
                    Drop construction documents here or click to browse
                  </p>
                  <p className="text-sm text-slate-400 mb-6">
                    PDF, DOCX, DOC, TXT files up to 10MB
                  </p>
                  <input
                    type="file"
                    onChange={handleFileSelect}
                    accept=".pdf,.docx,.doc,.txt"
                    className="hidden"
                    id="training-file-upload"
                  />
                  <label
                    htmlFor="training-file-upload"
                    className="cursor-pointer"
                  >
                    <Button
                      variant="default"
                      size="lg"
                      className="bg-primary hover:bg-primary/90 text-white font-semibold px-6 py-3"
                      asChild
                    >
                      <span>
                        <Upload className="h-5 w-5 mr-2" />
                        Upload Training Documents
                      </span>
                    </Button>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Processing Progress */}
          {isProcessing && (
            <div className="mt-6 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-white">{processingStep}</span>
                <span className="text-sm text-slate-400">
                  Processing document
                </span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}

          {/* Processing Log */}
          {(isProcessing || processingLogs.length > 0) && (
            <div className="mt-6">
              <Card className="bg-slate-800/30 border-slate-600/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-slate-300 flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    Processing Log
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="bg-slate-900/50 rounded-md p-3 max-h-40 overflow-y-auto">
                    <div className="font-mono text-xs space-y-1">
                      {processingLogs.map((log, index) => (
                        <div
                          key={index}
                          className={`${
                            log.includes('✅')
                              ? 'text-green-400'
                              : log.includes('❌')
                                ? 'text-red-400'
                                : log.includes('Starting') ||
                                    log.includes('Extracting')
                                  ? 'text-blue-400'
                                  : 'text-slate-300'
                          }`}
                        >
                          {log}
                        </div>
                      ))}
                      {isProcessing && (
                        <div className="text-slate-500 animate-pulse">
                          Processing...
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {results && (
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <CheckCircle className="h-5 w-5 text-green-400" />
              Training Data Generated
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-slate-800/30 rounded-lg text-center">
                <div className="text-lg font-bold text-emerald-400">
                  {results.examples.length}
                </div>
                <div className="text-xs text-slate-300">Training Examples</div>
              </div>
              <div className="p-3 bg-slate-800/30 rounded-lg text-center">
                <div className="text-lg font-bold text-blue-400">
                  {results.extractedConcepts.length}
                </div>
                <div className="text-xs text-slate-300">Key Concepts</div>
              </div>
              <div className="p-3 bg-slate-800/30 rounded-lg text-center">
                <div className="text-lg font-bold text-purple-400">
                  {results.processingStats.embeddings}
                </div>
                <div className="text-xs text-slate-300">Embeddings</div>
              </div>
              <div className="p-3 bg-slate-800/30 rounded-lg text-center">
                <div className="text-lg font-bold text-cyan-400">
                  {results.namespace}
                </div>
                <div className="text-xs text-slate-300">Namespace</div>
              </div>
            </div>

            <Alert>
              <Database className="h-4 w-4" />
              <AlertDescription>
                Training data has been processed and stored in the{' '}
                <strong>{results.namespace}</strong> namespace. The AI model can
                now use this information to provide better answers in the{' '}
                <strong>{trainingOptions.category.replace('_', ' ')}</strong>{' '}
                category.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
