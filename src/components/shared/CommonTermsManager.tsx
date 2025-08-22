import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  initializeCommonTerms,
  getAvailableContentTypes,
  getTermsCountByType,
  addCustomCommonTerm,
} from '@/services/utils/common-terms'
import {
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Database,
  Plus,
  Trash2,
  Edit,
  Search,
  Download,
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  queryEmbeddings,
  deleteEmbeddings,
  NAMESPACE_CONFIG,
} from '@/services/ai/pinecone'
import type { CommonContentType } from '@/services/ai/embedding'

// Form schema for adding new terms
const addTermSchema = z.object({
  id: z
    .string()
    .min(1, 'ID is required')
    .regex(
      /^[a-z0-9_]+$/,
      'ID must contain only lowercase letters, numbers, and underscores',
    ),
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(10, 'Content must be at least 10 characters'),
  contentType: z.string().min(1, 'Content type is required'),
  category: z.string().optional(),
  tags: z.string().optional(),
})

type AddTermFormData = z.infer<typeof addTermSchema>

interface ExistingTerm {
  id: string
  title: string
  content: string
  contentType: string
  metadata: Record<string, unknown>
}

export function CommonTermsManager() {
  const [isInitializing, setIsInitializing] = useState(false)
  const [initializationStatus, setInitializationStatus] = useState<
    'idle' | 'success' | 'error'
  >('idle')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [existingTerms, setExistingTerms] = useState<ExistingTerm[]>([])
  const [isLoadingTerms, setIsLoadingTerms] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedContentType, setSelectedContentType] = useState<string>('all')
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [isAddingTerm, setIsAddingTerm] = useState(false)

  const contentTypes = getAvailableContentTypes()
  const termsCounts = getTermsCountByType()
  const totalTerms = Object.values(termsCounts).reduce(
    (sum, count) => sum + count,
    0,
  )

  const form = useForm<AddTermFormData>({
    resolver: zodResolver(addTermSchema),
    defaultValues: {
      id: '',
      title: '',
      content: '',
      contentType: '',
      category: '',
      tags: '',
    },
  })

  // Load existing terms from Pinecone
  const loadExistingTerms = async () => {
    setIsLoadingTerms(true)
    try {
      // Query all terms from common namespace
      const dummyQuery = Array(1536).fill(0) // OpenAI embedding dimension
      const results = await queryEmbeddings(
        NAMESPACE_CONFIG.common,
        [dummyQuery],
        1000, // Get a large number to see all terms
      )

      const terms: ExistingTerm[] = []
      if (results.ids[0] && results.metadatas[0] && results.documents[0]) {
        for (let i = 0; i < results.ids[0].length; i++) {
          const metadata = results.metadatas[0][i] as Record<string, unknown>
          terms.push({
            id: results.ids[0][i],
            title: (metadata?.title as string) || 'Untitled',
            content: results.documents[0][i] || '',
            contentType: (metadata?.content_type as string) || 'unknown',
            metadata: metadata || {},
          })
        }
      }

      setExistingTerms(terms)
    } catch (error) {
      console.error('Error loading existing terms:', error)
      setExistingTerms([]) // Set empty array on error
    } finally {
      setIsLoadingTerms(false)
    }
  }

  // Initialize component
  useEffect(() => {
    loadExistingTerms()
  }, [])

  const handleInitialize = async () => {
    setIsInitializing(true)
    setInitializationStatus('idle')
    setErrorMessage('')

    try {
      await initializeCommonTerms()
      setInitializationStatus('success')
      // Reload terms after initialization
      await loadExistingTerms()
    } catch (error) {
      setInitializationStatus('error')
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Failed to initialize common terms',
      )
    } finally {
      setIsInitializing(false)
    }
  }

  const handleAddTerm = async (data: AddTermFormData) => {
    setIsAddingTerm(true)
    try {
      await addCustomCommonTerm({
        contentType: data.contentType as CommonContentType,
        id: data.id,
        title: data.title,
        content: data.content,
        metadata: {
          category: data.category || '',
          tags: data.tags || '',
          is_custom: true,
          created_at: new Date().toISOString(),
        },
      })

      // Reset form and close dialog
      form.reset()
      setShowAddDialog(false)

      // Reload terms
      await loadExistingTerms()

      // Show success message
      setInitializationStatus('success')
      setErrorMessage('')
    } catch (error) {
      setInitializationStatus('error')
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to add term',
      )
    } finally {
      setIsAddingTerm(false)
    }
  }

  const handleDeleteTerm = async (termId: string) => {
    if (
      !confirm(
        `Are you sure you want to delete the term "${termId}"? This action cannot be undone.`,
      )
    ) {
      return
    }

    try {
      await deleteEmbeddings(NAMESPACE_CONFIG.common, [termId])
      // Reload terms
      await loadExistingTerms()
      setInitializationStatus('success')
      setErrorMessage('')
    } catch (error) {
      setInitializationStatus('error')
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to delete term',
      )
    }
  }

  // Filter terms based on search and content type
  const filteredTerms = existingTerms.filter(term => {
    const matchesSearch =
      searchQuery === '' ||
      term.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      term.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      term.id.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesType =
      selectedContentType === 'all' || term.contentType === selectedContentType

    return matchesSearch && matchesType
  })

  return (
    <div className="space-y-6">
      {/* Status Messages */}
      {initializationStatus === 'success' && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Operation completed successfully!
          </AlertDescription>
        </Alert>
      )}

      {initializationStatus === 'error' && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Error: {errorMessage}</AlertDescription>
        </Alert>
      )}

      {/* Database Overview Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Common Terms Database
          </CardTitle>
          <CardDescription>
            Initialize and manage industry-standard construction terms, codes,
            and specifications that are shared across all projects for improved
            search performance.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {contentTypes.map(type => (
              <div key={type} className="space-y-2">
                <Badge variant="outline" className="text-xs">
                  {type.replace('_', ' ')}
                </Badge>
                <p className="text-sm text-muted-foreground">
                  {termsCounts[type]} predefined terms
                </p>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t flex items-center justify-between">
            <div>
              <p className="font-medium">
                Total Predefined Terms: {totalTerms}
              </p>
              <p className="text-sm text-muted-foreground">
                Existing Terms in Database: {existingTerms.length}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleInitialize}
                disabled={isInitializing}
                variant="outline"
              >
                {isInitializing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Initializing...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Initialize Predefined Terms
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Terms Management Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Edit className="h-5 w-5" />
                Manage Terms
              </CardTitle>
              <CardDescription>
                Add, edit, or remove individual terms from the common database
              </CardDescription>
            </div>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Custom Term
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add Custom Common Term</DialogTitle>
                  <DialogDescription>
                    Add a new term to the common database that will be available
                    across all projects.
                  </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(handleAddTerm)}
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Unique ID</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g. custom_safety_rule"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="contentType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Content Type</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select content type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {contentTypes.map(type => (
                                  <SelectItem key={type} value={type}>
                                    {type.replace('_', ' ')}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g. Custom Safety Regulation"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="content"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Content</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Detailed description of the term, regulation, or specification..."
                              className="min-h-[100px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Category (Optional)</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g. workplace_safety"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="tags"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tags (Optional)</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g. safety, construction, osha"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowAddDialog(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={isAddingTerm}>
                        {isAddingTerm ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Adding...
                          </>
                        ) : (
                          'Add Term'
                        )}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filter Controls */}
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
                <Input
                  placeholder="Search terms..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select
              value={selectedContentType}
              onValueChange={setSelectedContentType}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {contentTypes.map(type => (
                  <SelectItem key={type} value={type}>
                    {type.replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={loadExistingTerms}
              disabled={isLoadingTerms}
            >
              {isLoadingTerms ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Terms Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Content Preview</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingTerms ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-2" />
                      Loading terms...
                    </TableCell>
                  </TableRow>
                ) : filteredTerms.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-8 text-muted-foreground"
                    >
                      {existingTerms.length === 0
                        ? 'No terms found. Initialize the database or add custom terms.'
                        : 'No terms match your search criteria.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTerms.map(term => (
                    <TableRow key={term.id}>
                      <TableCell className="font-mono text-sm">
                        {term.id}
                      </TableCell>
                      <TableCell className="font-medium">
                        {term.title}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {term.contentType.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[300px]">
                        <p className="text-sm text-muted-foreground truncate">
                          {term.content.length > 100
                            ? `${term.content.substring(0, 100)}...`
                            : term.content}
                        </p>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteTerm(term.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="text-sm text-muted-foreground">
            Showing {filteredTerms.length} of {existingTerms.length} terms
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
