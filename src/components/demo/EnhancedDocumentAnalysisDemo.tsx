/**
 * Enhanced Document Analysis Demo Component - Proof of Concept
 * Demonstrates improved extraction accuracy and intelligent search enhancement
 */

import React, { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  FileText,
  Search,
  Brain,
  BarChart3,
  MapPin,
  Ruler,
  Upload,
  Loader2,
} from 'lucide-react'

// Import our enhanced analysis service
import {
  analyzeDocumentStructure,
  IntelligentSearchEngine,
  type StructuredDocumentData,
  type EnhancedDocumentElement,
  type IntelligentSearchResult,
} from '@/services/ai/enhanced-document-analysis-simple'

interface DemoResult {
  documentId: string
  fileName: string
  structure: StructuredDocumentData
  processingTime: number
}

export function EnhancedDocumentAnalysisDemo() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [demoResults, setDemoResults] = useState<DemoResult[]>([])
  const [searchEngine] = useState(new IntelligentSearchEngine())
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<IntelligentSearchResult[]>(
    [],
  )
  const [isSearching, setIsSearching] = useState(false)

  const handleFileUpload = useCallback(
    async (file: File) => {
      setIsProcessing(true)

      try {
        const startTime = Date.now()

        // Determine document type based on file content
        const documentType = file.name.toLowerCase().includes('schedule')
          ? 'schedule'
          : 'floor_plan'

        // Perform enhanced analysis
        const structure = await analyzeDocumentStructure(file, documentType)

        const processingTime = Date.now() - startTime

        const result: DemoResult = {
          documentId: `doc_${Date.now()}`,
          fileName: file.name,
          structure,
          processingTime,
        }

        // Index in search engine
        await searchEngine.indexDocument(result.documentId, structure)

        setDemoResults(prev => [...prev, result])
      } catch (error) {
        console.error('Document analysis failed:', error)
        alert('Analysis failed. Please try again.')
      } finally {
        setIsProcessing(false)
      }
    },
    [searchEngine],
  )

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return

    setIsSearching(true)

    try {
      const results = await searchEngine.intelligentSearch(searchQuery)
      setSearchResults(results)
    } catch (error) {
      console.error('Search failed:', error)
      alert('Search failed. Please try again.')
    } finally {
      setIsSearching(false)
    }
  }, [searchQuery, searchEngine])

  const renderElementType = (type: string) => {
    const icons = {
      door: '🚪',
      window: '🪟',
      room: '🏢',
      dimension: '📏',
      schedule_item: '📋',
      symbol: '🔣',
      text_block: '📝',
    }
    return icons[type as keyof typeof icons] || '📄'
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-100 text-green-800'
    if (confidence >= 0.6) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Enhanced Document Analysis</h1>
        <p className="text-gray-600 mb-6">
          Proof of Concept: Intelligent Search Enhancement with Improved
          Extraction Accuracy
        </p>
      </div>

      {/* File Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Document Upload & Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={e => {
                const file = e.target.files?.[0]
                if (file) handleFileUpload(file)
              }}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer flex flex-col items-center"
            >
              {isProcessing ? (
                <Loader2 className="h-12 w-12 animate-spin text-blue-500 mb-4" />
              ) : (
                <FileText className="h-12 w-12 text-gray-400 mb-4" />
              )}
              <span className="text-lg font-medium mb-2">
                {isProcessing
                  ? 'Analyzing Document...'
                  : 'Upload Construction Document'}
              </span>
              <span className="text-sm text-gray-500">
                Support: Floor plans, schedules, elevations, details
                (images/PDFs)
              </span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Search Interface */}
      {demoResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Intelligent Search
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Try: 'How many conference rooms?', 'Show me 3-0 doors', 'Rooms adjacent to reception'"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && handleSearch()}
                className="flex-1"
              />
              <Button onClick={handleSearch} disabled={isSearching}>
                {isSearching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                Search
              </Button>
            </div>

            {/* Sample Queries */}
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-gray-500">Try these:</span>
              {[
                'How many doors?',
                'Show conference rooms',
                '3-0 doors',
                'Windows facing south',
                'Rooms with bathrooms',
              ].map(query => (
                <Badge
                  key={query}
                  variant="outline"
                  className="cursor-pointer hover:bg-gray-100"
                  onClick={() => setSearchQuery(query)}
                >
                  {query}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search Results */}
      {searchResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Search Results ({searchResults.length} found)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {searchResults.map((result, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">
                        {renderElementType(result.element.type)}
                      </span>
                      <span className="font-medium">
                        {result.element.type.replace('_', ' ').toUpperCase()}
                      </span>
                      <Badge
                        className={getConfidenceColor(
                          result.element.confidence,
                        )}
                      >
                        {(result.relevanceScore * 100).toFixed(0)}% match
                      </Badge>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {result.documentType}
                    </Badge>
                  </div>

                  <p className="text-gray-700 mb-2">{result.element.content}</p>

                  {Object.keys(result.element.properties).length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {Object.entries(result.element.properties).map(
                        ([key, value]) => (
                          <Badge
                            key={key}
                            variant="secondary"
                            className="text-xs"
                          >
                            {key}: {String(value)}
                          </Badge>
                        ),
                      )}
                    </div>
                  )}

                  {result.matchReasons.length > 0 && (
                    <div className="text-xs text-gray-500">
                      Match reasons: {result.matchReasons.join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analysis Results */}
      {demoResults.map(result => (
        <Card key={result.documentId}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Analysis: {result.fileName}
              </span>
              <Badge variant="outline">
                Processed in {result.processingTime}ms
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="overview">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="elements">Elements</TabsTrigger>
                <TabsTrigger value="schedules">Schedules</TabsTrigger>
                <TabsTrigger value="measurements">Measurements</TabsTrigger>
                <TabsTrigger value="spatial">Spatial</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {result.structure.elements.length}
                    </div>
                    <div className="text-sm text-gray-600">Elements</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {result.structure.schedules.length}
                    </div>
                    <div className="text-sm text-gray-600">Schedules</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">
                      {result.structure.measurements.length}
                    </div>
                    <div className="text-sm text-gray-600">Measurements</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {result.structure.spatial_map.length}
                    </div>
                    <div className="text-sm text-gray-600">Relationships</div>
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-2">Document Information</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      Type:{' '}
                      <Badge>{result.structure.metadata.document_type}</Badge>
                    </div>
                    <div>
                      Confidence:{' '}
                      <Badge
                        className={getConfidenceColor(
                          result.structure.metadata.confidence,
                        )}
                      >
                        {(result.structure.metadata.confidence * 100).toFixed(
                          1,
                        )}
                        %
                      </Badge>
                    </div>
                    <div>
                      Method:{' '}
                      <Badge variant="outline">
                        {result.structure.metadata.processing_method}
                      </Badge>
                    </div>
                    <div>
                      Processed:{' '}
                      {new Date(
                        result.structure.metadata.extracted_at,
                      ).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="elements" className="space-y-3">
                {result.structure.elements.map(element => (
                  <div key={element.id} className="border rounded-lg p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">
                          {renderElementType(element.type)}
                        </span>
                        <span className="font-medium">
                          {element.type.replace('_', ' ')}
                        </span>
                        <Badge
                          className={getConfidenceColor(element.confidence)}
                        >
                          {(element.confidence * 100).toFixed(0)}%
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">
                      {element.content}
                    </p>
                    {Object.keys(element.properties).length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(element.properties).map(
                          ([key, value]) => (
                            <Badge
                              key={key}
                              variant="secondary"
                              className="text-xs"
                            >
                              {key}: {String(value)}
                            </Badge>
                          ),
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="schedules">
                {result.structure.schedules.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    No schedules detected
                  </p>
                ) : (
                  result.structure.schedules.map(schedule => (
                    <div
                      key={schedule.id}
                      className="border rounded-lg p-4 mb-4"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium">
                          {schedule.type.replace('_', ' ').toUpperCase()}
                        </h4>
                        <Badge
                          className={getConfidenceColor(schedule.confidence)}
                        >
                          {(schedule.confidence * 100).toFixed(0)}% confidence
                        </Badge>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              {schedule.headers.map(header => (
                                <th
                                  key={header}
                                  className="text-left p-2 font-medium"
                                >
                                  {header}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {schedule.rows.map(row => (
                              <tr key={row.id} className="border-b">
                                <td className="p-2 font-medium">{row.tag}</td>
                                {Object.values(row.data).map((value, idx) => (
                                  <td key={idx} className="p-2">
                                    {value}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>

              <TabsContent value="measurements" className="space-y-3">
                {result.structure.measurements.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    No measurements detected
                  </p>
                ) : (
                  result.structure.measurements.map(measurement => (
                    <div key={measurement.id} className="border rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Ruler className="h-4 w-4" />
                        <span className="font-medium">
                          {measurement.value} {measurement.unit}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {measurement.dimension_type}
                        </Badge>
                        <Badge
                          className={getConfidenceColor(measurement.confidence)}
                        >
                          {(measurement.confidence * 100).toFixed(0)}%
                        </Badge>
                      </div>
                      {measurement.applies_to.length > 0 && (
                        <p className="text-xs text-gray-500">
                          Applies to: {measurement.applies_to.join(', ')}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </TabsContent>

              <TabsContent value="spatial" className="space-y-3">
                {result.structure.spatial_map.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    No spatial relationships detected
                  </p>
                ) : (
                  result.structure.spatial_map.map((relationship, index) => (
                    <div key={index} className="border rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span className="font-medium">
                          {relationship.element_a}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {relationship.relationship.replace('_', ' ')}
                        </Badge>
                        <span className="font-medium">
                          {relationship.element_b}
                        </span>
                        <Badge
                          className={getConfidenceColor(
                            relationship.confidence,
                          )}
                        >
                          {(relationship.confidence * 100).toFixed(0)}%
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      ))}

      {demoResults.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Brain className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">
              Ready for Enhanced Document Analysis
            </h3>
            <p className="text-gray-500">
              Upload a construction document to see intelligent extraction and
              search capabilities
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
