import React, { useEffect, useState, useCallback, useRef } from 'react'
import { adminTaxonomyService } from '@/services'
import type {
  AdminCategory,
  AdminAbbreviation,
} from '@/services/api/admin-taxonomy'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { PageLoader } from '@/components/shared/PageLoader'
import { Card } from '@/components/ui/card'
import {
  Plus,
  RefreshCw,
  Loader2,
  MoreHorizontal,
  Edit3,
  Trash2,
} from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { AuditLogViewer } from '@/components/admin/AuditLogViewer'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

interface LoadState<T> {
  loading: boolean
  error: string | null
  data: T
}

const initialCategoriesState: LoadState<AdminCategory[]> = {
  loading: true,
  error: null,
  data: [],
}

const initialAbbrevState: LoadState<AdminAbbreviation[]> = {
  loading: true,
  error: null,
  data: [],
}

// Basic shell only – CRUD forms & detailed lists will be added in subsequent tasks
const AdminConsole: React.FC = () => {
  const [categoriesState, setCategoriesState] = useState(initialCategoriesState)
  const [abbrevState, setAbbrevState] = useState(initialAbbrevState)
  const [activeTab, setActiveTab] = useState<
    'categories' | 'abbreviations' | 'audit'
  >('categories')
  const { toast } = useToast()

  // Category modal + form state
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<AdminCategory | null>(
    null,
  )
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
  })
  const [categoryErrors, setCategoryErrors] = useState<{ name?: string }>({})
  const [categorySaving, setCategorySaving] = useState(false)
  const [pendingDeleteCategory, setPendingDeleteCategory] =
    useState<AdminCategory | null>(null)
  // Abbreviations state & modal
  const [showAbbrevModal, setShowAbbrevModal] = useState(false)
  const [editingAbbrev, setEditingAbbrev] = useState<AdminAbbreviation | null>(
    null,
  )
  const [abbrevForm, setAbbrevForm] = useState({
    term: '',
    expansion: '',
    categoryId: '',
    examples: '',
  })
  const [abbrevErrors, setAbbrevErrors] = useState<{
    term?: string
    expansion?: string
  }>({})
  const [abbrevSaving, setAbbrevSaving] = useState(false)
  const [pendingDeleteAbbrev, setPendingDeleteAbbrev] =
    useState<AdminAbbreviation | null>(null)

  // Pagination state
  const [categoriesPage, setCategoriesPage] = useState(1)
  const [abbrevPage, setAbbrevPage] = useState(1)
  const pageSize = 24
  const [categoriesHasMore, setCategoriesHasMore] = useState(false)
  const [abbrevHasMore, setAbbrevHasMore] = useState(false)
  // Smart table sort state for categories
  const [categoriesSortBy, setCategoriesSortBy] = useState<'name' | 'count'>(
    'name',
  )
  const [categoriesSortDir, setCategoriesSortDir] = useState<'asc' | 'desc'>(
    'asc',
  )
  // Bulk selection state
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(
    new Set(),
  )
  const [selectedAbbrevIds, setSelectedAbbrevIds] = useState<Set<string>>(
    new Set(),
  )
  // Bulk delete confirmation context
  const [bulkDeleteContext, setBulkDeleteContext] = useState<null | {
    type: 'categories' | 'abbreviations'
    ids: string[]
  }>(null)
  // Soft bulk deletion (undo window) state
  const UNDO_WINDOW_MS = 5000
  const [pendingBulkDeletion, setPendingBulkDeletion] = useState<null | {
    type: 'categories' | 'abbreviations'
    ids: string[]
    status: 'pending' | 'processing'
    expiresAt: number
  }>(null)
  const bulkTimerRef = useRef<number | null>(null)

  // Immediate overlay approach (no debounce) — overlays appear as soon as a refresh with existing data starts.

  // Clear any active timer on unmount
  useEffect(() => {
    const timerId = bulkTimerRef.current
    return () => {
      if (timerId) window.clearTimeout(timerId)
    }
  }, [])

  const toggleSelectAllCategories = (checked: boolean) => {
    if (checked) {
      setSelectedCategoryIds(new Set(categoriesState.data.map(c => c.id)))
    } else {
      setSelectedCategoryIds(new Set())
    }
  }
  const toggleSelectCategory = (id: string, checked: boolean) => {
    setSelectedCategoryIds(prev => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const toggleSelectAllAbbrevs = (checked: boolean) => {
    if (checked) {
      setSelectedAbbrevIds(new Set(abbrevState.data.map(a => a.id)))
    } else {
      setSelectedAbbrevIds(new Set())
    }
  }
  const toggleSelectAbbrev = (id: string, checked: boolean) => {
    setSelectedAbbrevIds(prev => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const commitBulkDeletion = async (
    type: 'categories' | 'abbreviations',
    ids: string[],
  ) => {
    if (!ids.length) return
    setPendingBulkDeletion(prev =>
      prev ? { ...prev, status: 'processing' } : prev,
    )
    if (type === 'categories') {
      for (const id of ids) {
        try {
          await adminTaxonomyService.deleteCategory(id)
        } catch (e) {
          console.error('Bulk delete category failed', id, e)
        }
      }
      setCategoriesState(s => ({
        ...s,
        data: s.data.filter(c => !ids.includes(c.id)),
      }))
    } else {
      for (const id of ids) {
        try {
          await adminTaxonomyService.deleteAbbreviation(id)
        } catch (e) {
          console.error('Bulk delete abbreviation failed', id, e)
        }
      }
      setAbbrevState(s => ({
        ...s,
        data: s.data.filter(a => !ids.includes(a.id)),
      }))
    }
    toast({
      title: 'Bulk delete complete',
      description: `${ids.length} ${type === 'categories' ? 'categories' : 'abbreviations'} removed`,
    })
    setPendingBulkDeletion(null)
  }

  const stageBulkDeletion = () => {
    if (!bulkDeleteContext || pendingBulkDeletion) return
    const { type, ids } = bulkDeleteContext
    setBulkDeleteContext(null)
    if (!ids.length) return
    // Clear selections immediately for visual feedback
    if (type === 'categories') setSelectedCategoryIds(new Set())
    else setSelectedAbbrevIds(new Set())

    const expiresAt = Date.now() + UNDO_WINDOW_MS
    setPendingBulkDeletion({ type, ids, status: 'pending', expiresAt })

    // Toast with Undo action
    const { dismiss } = toast({
      title: 'Deletion scheduled',
      description: `${ids.length} ${type === 'categories' ? 'categories' : 'abbreviations'} will be deleted.`,
      action: (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (bulkTimerRef.current) {
              window.clearTimeout(bulkTimerRef.current)
              bulkTimerRef.current = null
            }
            setPendingBulkDeletion(null)
            toast({
              title: 'Bulk delete canceled',
              description: 'Items were not removed.',
            })
            dismiss()
          }}
        >
          Undo
        </Button>
      ),
    })

    if (bulkTimerRef.current) window.clearTimeout(bulkTimerRef.current)
    bulkTimerRef.current = window.setTimeout(() => {
      setPendingBulkDeletion(prev => {
        if (!prev) return prev
        commitBulkDeletion(prev.type, prev.ids)
        return prev
      })
    }, UNDO_WINDOW_MS)
  }

  const loadCategories = useCallback(
    async (page = categoriesPage) => {
      setCategoriesState(s => ({ ...s, loading: true, error: null }))
      try {
        const res = await adminTaxonomyService.listCategories(page, pageSize)
        setCategoriesState({ loading: false, error: null, data: res.items })
        setCategoriesHasMore(res.hasMore)
        setCategoriesPage(res.page)
      } catch (e) {
        setCategoriesState({
          loading: false,
          error: (e as Error).message,
          data: [],
        })
        toast({
          title: 'Failed to load categories',
          description: (e as Error).message,
          variant: 'destructive',
        })
      }
    },
    [toast, categoriesPage],
  )

  const loadAbbreviations = useCallback(
    async (page = abbrevPage) => {
      setAbbrevState(s => ({ ...s, loading: true, error: null }))
      try {
        const res = await adminTaxonomyService.listAbbreviations(page, pageSize)
        setAbbrevState({ loading: false, error: null, data: res.items })
        setAbbrevHasMore(res.hasMore)
        setAbbrevPage(res.page)
      } catch (e) {
        setAbbrevState({
          loading: false,
          error: (e as Error).message,
          data: [],
        })
        toast({
          title: 'Failed to load abbreviations',
          description: (e as Error).message,
          variant: 'destructive',
        })
      }
    },
    [toast, abbrevPage],
  )

  useEffect(() => {
    loadCategories(1)
    loadAbbreviations(1)
  }, [loadCategories, loadAbbreviations])

  const openCreateCategory = () => {
    setEditingCategory(null)
    setCategoryForm({ name: '', description: '' })
    setCategoryErrors({})
    setShowCategoryModal(true)
  }

  const openEditCategory = (cat: AdminCategory) => {
    setEditingCategory(cat)
    setCategoryForm({ name: cat.name, description: cat.description || '' })
    setCategoryErrors({})
    setShowCategoryModal(true)
  }

  const validateCategory = () => {
    const errors: { name?: string } = {}
    if (!categoryForm.name.trim()) errors.name = 'Name is required'
    setCategoryErrors(errors)
    return Object.keys(errors).length === 0
  }

  const saveCategory = async () => {
    if (!validateCategory()) return
    setCategorySaving(true)
    try {
      if (editingCategory) {
        const updated = await adminTaxonomyService.updateCategory(
          editingCategory.id,
          {
            name: categoryForm.name.trim(),
            description: categoryForm.description.trim() || undefined,
          },
        )
        setCategoriesState(s => ({
          ...s,
          data: s.data.map(c =>
            c.id === updated.id ? { ...c, ...updated } : c,
          ),
        }))
        toast({ title: 'Category updated', description: updated.name })
      } else {
        const created = await adminTaxonomyService.createCategory({
          name: categoryForm.name.trim(),
          description: categoryForm.description.trim() || undefined,
        })
        setCategoriesState(s => ({ ...s, data: [created, ...s.data] }))
        toast({ title: 'Category created', description: created.name })
      }
      setShowCategoryModal(false)
    } catch (e) {
      toast({
        title: 'Save failed',
        description: (e as Error).message,
        variant: 'destructive',
      })
    } finally {
      setCategorySaving(false)
    }
  }

  const confirmDeleteCategory = async () => {
    if (!pendingDeleteCategory) return
    const cat = pendingDeleteCategory
    setPendingDeleteCategory(null)
    try {
      await adminTaxonomyService.deleteCategory(cat.id)
      setCategoriesState(s => ({
        ...s,
        data: s.data.filter(c => c.id !== cat.id),
      }))
      toast({ title: 'Category deleted', description: cat.name })
    } catch (e) {
      toast({
        title: 'Delete failed',
        description: (e as Error).message,
        variant: 'destructive',
      })
    }
  }

  // Abbreviation helpers
  const openCreateAbbrev = () => {
    setEditingAbbrev(null)
    setAbbrevForm({ term: '', expansion: '', categoryId: '', examples: '' })
    setAbbrevErrors({})
    setShowAbbrevModal(true)
  }

  const openEditAbbrev = (ab: AdminAbbreviation) => {
    setEditingAbbrev(ab)
    setAbbrevForm({
      term: ab.term,
      expansion: ab.expansion,
      categoryId: ab.categoryId || '',
      examples: (ab.usageExamples || []).join('\n'),
    })
    setAbbrevErrors({})
    setShowAbbrevModal(true)
  }

  const validateAbbrev = () => {
    const errors: { term?: string; expansion?: string } = {}
    if (!abbrevForm.term.trim()) errors.term = 'Term is required'
    if (!abbrevForm.expansion.trim()) errors.expansion = 'Expansion is required'
    setAbbrevErrors(errors)
    return Object.keys(errors).length === 0
  }

  const saveAbbrev = async () => {
    if (!validateAbbrev()) return
    setAbbrevSaving(true)
    try {
      const payload = {
        term: abbrevForm.term.trim(),
        expansion: abbrevForm.expansion.trim(),
        categoryId: abbrevForm.categoryId || undefined,
        usageExamples: abbrevForm.examples
          .split('\n')
          .map(l => l.trim())
          .filter(Boolean),
      }
      if (editingAbbrev) {
        const updated = await adminTaxonomyService.updateAbbreviation(
          editingAbbrev.id,
          payload,
        )
        setAbbrevState(s => ({
          ...s,
          data: s.data.map(a =>
            a.id === updated.id ? { ...a, ...updated } : a,
          ),
        }))
        toast({ title: 'Abbreviation updated', description: updated.term })
      } else {
        const created = await adminTaxonomyService.createAbbreviation(payload)
        setAbbrevState(s => ({ ...s, data: [created, ...s.data] }))
        toast({ title: 'Abbreviation created', description: created.term })
      }
      setShowAbbrevModal(false)
    } catch (e) {
      toast({
        title: 'Save failed',
        description: (e as Error).message,
        variant: 'destructive',
      })
    } finally {
      setAbbrevSaving(false)
    }
  }

  const confirmDeleteAbbrev = async () => {
    if (!pendingDeleteAbbrev) return
    const ab = pendingDeleteAbbrev
    setPendingDeleteAbbrev(null)
    try {
      await adminTaxonomyService.deleteAbbreviation(ab.id)
      setAbbrevState(s => ({ ...s, data: s.data.filter(a => a.id !== ab.id) }))
      toast({ title: 'Abbreviation deleted', description: ab.term })
    } catch (e) {
      toast({
        title: 'Delete failed',
        description: (e as Error).message,
        variant: 'destructive',
      })
    }
  }

  const renderCategories = () => {
    const isLoading = categoriesState.loading
    if (categoriesState.error && !isLoading) {
      return (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-sm text-destructive">
            Failed to load categories: {categoriesState.error}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadCategories(categoriesPage)}
          >
            Retry
          </Button>
        </div>
      )
    }
    if (!isLoading && !categoriesState.data.length) {
      return (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-sm text-muted-foreground max-w-sm">
            No categories yet. Categories help organize abbreviations and
            domain-specific terms.
          </p>
          <Button size="sm" onClick={openCreateCategory}>
            <Plus className="mr-2 h-4 w-4" /> New Category
          </Button>
        </div>
      )
    }

    const sorted = [...categoriesState.data]
      // Filter out any null/undefined defensive (shouldn't happen but prevents runtime errors)
      .filter((c): c is AdminCategory => !!c && typeof c === 'object')
      .sort((a, b) => {
        let cmp = 0
        if (categoriesSortBy === 'name') {
          const an = (a?.name || '').toString()
          const bn = (b?.name || '').toString()
          // localeCompare safe even if empty strings
          cmp = an.localeCompare(bn, undefined, { sensitivity: 'base' })
        } else {
          const av =
            typeof a?.abbreviationCount === 'number' ? a.abbreviationCount : 0
          const bv =
            typeof b?.abbreviationCount === 'number' ? b.abbreviationCount : 0
          cmp = av - bv
        }
        return categoriesSortDir === 'asc' ? cmp : -cmp
      })

    const toggleSort = (col: 'name' | 'count') => {
      if (categoriesSortBy === col) {
        setCategoriesSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
      } else {
        setCategoriesSortBy(col)
        setCategoriesSortDir('asc')
      }
    }

    return (
      <div className="space-y-4">
        <div className="overflow-x-auto rounded-md border border-border/60 bg-card/40 backdrop-blur relative">
          <table className="w-full text-[15px]">
            <thead>
              <tr className="text-[12px] uppercase tracking-wide text-foreground/90 bg-muted/50">
                <th className="px-2 py-2 w-8 text-left">
                  <Checkbox
                    aria-label="Select all categories"
                    checked={
                      selectedCategoryIds.size > 0 &&
                      selectedCategoryIds.size === categoriesState.data.length
                        ? true
                        : selectedCategoryIds.size === 0
                          ? false
                          : 'indeterminate'
                    }
                    onCheckedChange={val => toggleSelectAllCategories(!!val)}
                  />
                </th>
                <th
                  className="px-3 py-2 font-semibold text-left select-none cursor-pointer"
                  onClick={() => toggleSort('name')}
                >
                  <span className="inline-flex items-center gap-1">
                    Name
                    {categoriesSortBy === 'name' && (
                      <span className="text-[10px] font-normal opacity-70">
                        {categoriesSortDir === 'asc' ? '▲' : '▼'}
                      </span>
                    )}
                  </span>
                </th>
                <th className="px-3 py-2 font-semibold text-left">
                  Description
                </th>
                <th
                  className="px-3 py-2 font-semibold text-right select-none cursor-pointer w-24"
                  onClick={() => toggleSort('count')}
                >
                  <span className="inline-flex items-center gap-1">
                    Count
                    {categoriesSortBy === 'count' && (
                      <span className="text-[10px] font-normal opacity-70">
                        {categoriesSortDir === 'asc' ? '▲' : '▼'}
                      </span>
                    )}
                  </span>
                </th>
                <th className="px-3 py-2 font-semibold text-right w-40">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading &&
                categoriesState.data.length === 0 &&
                // Skeleton rows (initial load)
                Array.from({ length: 6 }).map((_, idx) => (
                  <tr
                    key={`cat-skel-${idx}`}
                    className={`border-t border-border/30 ${idx % 2 === 0 ? 'bg-gray-200' : 'bg-gray-300'}`}
                  >
                    <td className="px-2 py-2">
                      <div className="h-4 w-4 rounded-sm bg-muted/50 animate-pulse" />
                    </td>
                    <td className="px-3 py-2">
                      <div className="h-4 w-40 max-w-full rounded bg-muted/50 animate-pulse" />
                    </td>
                    <td className="px-3 py-2">
                      <div className="space-y-2">
                        <div className="h-3 w-64 max-w-full rounded bg-muted/40 animate-pulse" />
                        <div className="h-3 w-52 max-w-full rounded bg-muted/30 animate-pulse" />
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="h-4 w-8 ml-auto rounded bg-muted/40 animate-pulse" />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="h-6 w-16 ml-auto rounded bg-muted/40 animate-pulse" />
                    </td>
                  </tr>
                ))}
              {sorted.map((cat, idx) => {
                const dimmed =
                  pendingBulkDeletion &&
                  pendingBulkDeletion.type === 'categories' &&
                  pendingBulkDeletion.ids.includes(cat.id)
                const refreshing = isLoading && categoriesState.data.length > 0
                return (
                  <tr
                    key={cat.id}
                    className={`border-t border-border/30 transition-colors ${idx % 2 === 0 ? 'bg-gray-200' : 'bg-gray-300'} hover:bg-accent/15 ${dimmed ? 'opacity-50 saturate-50' : ''} ${refreshing ? 'opacity-60' : ''}`}
                  >
                    <td className="px-2 py-2 align-middle">
                      <Checkbox
                        aria-label={`Select category ${cat.name}`}
                        checked={selectedCategoryIds.has(cat.id)}
                        onCheckedChange={val =>
                          toggleSelectCategory(cat.id, !!val)
                        }
                      />
                    </td>
                    <td
                      className="px-3 py-2 font-medium text-foreground break-words max-w-[260px] leading-snug align-middle"
                      title={cat.name}
                    >
                      <span className="whitespace-pre-wrap">{cat.name}</span>
                    </td>
                    <td className="px-3 py-2 text-sm leading-snug text-foreground/80 align-middle max-w-[520px]">
                      {cat.description ? (
                        <span
                          className="whitespace-pre-wrap break-words block"
                          title={cat.description}
                        >
                          {cat.description}
                        </span>
                      ) : (
                        <span className="italic opacity-50">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums font-mono text-sm align-middle">
                      {cat.abbreviationCount ?? 0}
                    </td>
                    <td className="px-3 py-2 text-right align-middle">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            aria-label={`Actions for ${cat.name}`}
                            disabled={refreshing}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() => openEditCategory(cat)}
                            disabled={refreshing}
                          >
                            <Edit3 className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setPendingDeleteCategory(cat)}
                            className="text-destructive focus:text-destructive"
                            disabled={refreshing}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {categoriesState.loading && categoriesState.data.length > 0 && (
            <div
              aria-label="Refreshing categories"
              className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-[2px] pointer-events-none animate-fade-in"
            >
              <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/70 border border-border shadow-sm transform scale-95 animate-[fade-in_0.25s_ease-out_forwards]">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-xs font-medium tracking-wide uppercase text-muted-foreground">
                  Refreshing
                </span>
              </div>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
          <div className="text-xs text-muted-foreground">
            Page {categoriesPage}
            {categoriesHasMore ? '' : ' (end)'} • Showing{' '}
            {categoriesState.data.length} items
          </div>
          <div className="flex gap-2 items-center">
            {selectedCategoryIds.size > 0 && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() =>
                  setBulkDeleteContext({
                    type: 'categories',
                    ids: Array.from(selectedCategoryIds),
                  })
                }
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete Selected (
                {selectedCategoryIds.size})
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              disabled={categoriesPage === 1 || categoriesState.loading}
              onClick={() => loadCategories(categoriesPage - 1)}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!categoriesHasMore || categoriesState.loading}
              onClick={() => loadCategories(categoriesPage + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Abbreviations table sort state
  const [abbrevSortBy, setAbbrevSortBy] = useState<
    'term' | 'category' | 'expansion'
  >('term')
  const [abbrevSortDir, setAbbrevSortDir] = useState<'asc' | 'desc'>('asc')

  const renderAbbreviations = () => {
    const isLoading = abbrevState.loading

    if (abbrevState.error && !isLoading) {
      return (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-sm text-destructive">
            Failed to load abbreviations: {abbrevState.error}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadAbbreviations(abbrevPage)}
          >
            Retry
          </Button>
        </div>
      )
    }

    if (!isLoading && !abbrevState.data.length) {
      return (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-sm text-muted-foreground max-w-sm">
            No abbreviations yet. Abbreviations link domain terminology to full
            expansions and examples for better context.
          </p>
          <Button size="sm" onClick={openCreateAbbrev}>
            <Plus className="mr-2 h-4 w-4" /> New Abbreviation
          </Button>
        </div>
      )
    }

    const categoryNameById = new Map(
      categoriesState.data.map(c => [c.id, c.name]),
    )

    const sorted = [...abbrevState.data]
      .filter((a): a is AdminAbbreviation => !!a && typeof a === 'object')
      .sort((a, b) => {
        let cmp = 0
        if (abbrevSortBy === 'term') {
          const at = (a?.term || '').toString()
          const bt = (b?.term || '').toString()
          cmp = at.localeCompare(bt, undefined, { sensitivity: 'base' })
        } else if (abbrevSortBy === 'expansion') {
          const ae = (a?.expansion || '').toString()
          const be = (b?.expansion || '').toString()
          cmp = ae.localeCompare(be, undefined, { sensitivity: 'base' })
        } else if (abbrevSortBy === 'category') {
          const av = (a?.categoryId && categoryNameById.get(a.categoryId)) || ''
          const bv = (b?.categoryId && categoryNameById.get(b.categoryId)) || ''
          cmp = av.localeCompare(bv, undefined, { sensitivity: 'base' })
        }
        return abbrevSortDir === 'asc' ? cmp : -cmp
      })

    const toggleSort = (col: 'term' | 'expansion' | 'category') => {
      if (abbrevSortBy === col) {
        setAbbrevSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
      } else {
        setAbbrevSortBy(col)
        setAbbrevSortDir('asc')
      }
    }

    const refreshing = isLoading && abbrevState.data.length > 0

    return (
      <div className="space-y-4">
        <div className="overflow-x-auto rounded-md border border-border/60 bg-card/40 backdrop-blur relative">
          <table className="w-full text-[15px]">
            <thead>
              <tr className="text-[12px] uppercase tracking-wide text-foreground/90 bg-muted/50">
                <th className="px-2 py-2 w-8 text-left">
                  <Checkbox
                    aria-label="Select all abbreviations"
                    checked={
                      selectedAbbrevIds.size > 0 &&
                      selectedAbbrevIds.size === abbrevState.data.length
                        ? true
                        : selectedAbbrevIds.size === 0
                          ? false
                          : 'indeterminate'
                    }
                    onCheckedChange={val => toggleSelectAllAbbrevs(!!val)}
                  />
                </th>
                <th
                  className="px-3 py-2 font-semibold text-left select-none cursor-pointer w-[180px]"
                  onClick={() => toggleSort('term')}
                >
                  <span className="inline-flex items-center gap-1">
                    Term
                    {abbrevSortBy === 'term' && (
                      <span className="text-[10px] font-normal opacity-70">
                        {abbrevSortDir === 'asc' ? '▲' : '▼'}
                      </span>
                    )}
                  </span>
                </th>
                <th
                  className="px-3 py-2 font-semibold text-left select-none cursor-pointer min-w-[240px]"
                  onClick={() => toggleSort('expansion')}
                >
                  <span className="inline-flex items-center gap-1">
                    Definition
                    {abbrevSortBy === 'expansion' && (
                      <span className="text-[10px] font-normal opacity-70">
                        {abbrevSortDir === 'asc' ? '▲' : '▼'}
                      </span>
                    )}
                  </span>
                </th>
                <th
                  className="px-3 py-2 font-semibold text-left select-none cursor-pointer w-[180px]"
                  onClick={() => toggleSort('category')}
                >
                  <span className="inline-flex items-center gap-1">
                    Category
                    {abbrevSortBy === 'category' && (
                      <span className="text-[10px] font-normal opacity-70">
                        {abbrevSortDir === 'asc' ? '▲' : '▼'}
                      </span>
                    )}
                  </span>
                </th>
                <th className="px-3 py-2 font-semibold text-right w-32">
                  Examples
                </th>
                <th className="px-3 py-2 font-semibold text-right w-24">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading &&
                abbrevState.data.length === 0 &&
                Array.from({ length: 8 }).map((_, idx) => (
                  <tr
                    key={`abbrev-skel-${idx}`}
                    className={`border-t border-border/30 ${idx % 2 === 0 ? 'bg-gray-200' : 'bg-gray-300'}`}
                  >
                    <td className="px-2 py-2">
                      <div className="h-4 w-4 rounded-sm bg-muted/50 animate-pulse" />
                    </td>
                    <td className="px-3 py-2">
                      <div className="h-4 w-36 rounded bg-muted/50 animate-pulse" />
                    </td>
                    <td className="px-3 py-2">
                      <div className="space-y-2">
                        <div className="h-3 w-72 rounded bg-muted/40 animate-pulse" />
                        <div className="h-3 w-60 rounded bg-muted/30 animate-pulse" />
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="h-4 w-24 rounded bg-muted/40 animate-pulse" />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="h-4 w-10 ml-auto rounded bg-muted/40 animate-pulse" />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="h-6 w-16 ml-auto rounded bg-muted/40 animate-pulse" />
                    </td>
                  </tr>
                ))}
              {sorted.map((ab, idx) => {
                const dimmed =
                  pendingBulkDeletion &&
                  pendingBulkDeletion.type === 'abbreviations' &&
                  pendingBulkDeletion.ids.includes(ab.id)
                const refreshing = isLoading && abbrevState.data.length > 0
                return (
                  <tr
                    key={ab.id}
                    className={`border-t border-border/30 transition-colors ${idx % 2 === 0 ? 'bg-gray-200' : 'bg-gray-300'} hover:bg-accent/15 ${dimmed ? 'opacity-50 saturate-50' : ''} ${refreshing ? 'opacity-60' : ''}`}
                  >
                    <td className="px-2 py-2 align-middle">
                      <Checkbox
                        aria-label={`Select abbreviation ${ab.term}`}
                        checked={selectedAbbrevIds.has(ab.id)}
                        onCheckedChange={val =>
                          toggleSelectAbbrev(ab.id, !!val)
                        }
                        disabled={refreshing}
                      />
                    </td>
                    <td
                      className="px-3 py-2 font-medium text-foreground break-words max-w-[200px] leading-snug align-middle"
                      title={ab.term}
                    >
                      <span className="whitespace-pre-wrap">{ab.term}</span>
                    </td>
                    <td
                      className="px-3 py-2 text-sm leading-snug text-foreground/80 max-w-[520px] align-middle"
                      title={ab.expansion}
                    >
                      <span className="whitespace-pre-wrap break-words block">
                        {ab.expansion}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-sm text-foreground/70 align-middle">
                      {ab.categoryId ? (
                        <span
                          className="inline-flex items-center rounded bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground"
                          title={
                            categoryNameById.get(ab.categoryId) || ab.categoryId
                          }
                        >
                          {categoryNameById.get(ab.categoryId) || ab.categoryId}
                        </span>
                      ) : (
                        <span className="italic opacity-50">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right text-sm tabular-nums font-mono align-middle">
                      {(ab.usageExamples || []).length || 0}
                    </td>
                    <td className="px-3 py-2 text-right align-middle">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            aria-label={`Actions for ${ab.term}`}
                            disabled={refreshing}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() => openEditAbbrev(ab)}
                            disabled={refreshing}
                          >
                            <Edit3 className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setPendingDeleteAbbrev(ab)}
                            className="text-destructive focus:text-destructive"
                            disabled={refreshing}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {abbrevState.loading && abbrevState.data.length > 0 && (
            <div
              aria-label="Refreshing abbreviations"
              className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-[2px] pointer-events-none animate-fade-in"
            >
              <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/70 border border-border shadow-sm transform scale-95 animate-[fade-in_0.25s_ease-out_forwards]">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-xs font-medium tracking-wide uppercase text-muted-foreground">
                  Refreshing
                </span>
              </div>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
          <div className="text-xs text-muted-foreground">
            Page {abbrevPage}
            {abbrevHasMore ? '' : ' (end)'} • Showing {abbrevState.data.length}{' '}
            items
          </div>
          <div className="flex gap-2 items-center">
            {selectedAbbrevIds.size > 0 && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() =>
                  setBulkDeleteContext({
                    type: 'abbreviations',
                    ids: Array.from(selectedAbbrevIds),
                  })
                }
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete Selected (
                {selectedAbbrevIds.size})
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              disabled={abbrevPage === 1 || abbrevState.loading}
              onClick={() => loadAbbreviations(abbrevPage - 1)}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!abbrevHasMore || abbrevState.loading}
              onClick={() => loadAbbreviations(abbrevPage + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8">
      {/* Live region for screen readers announcing refresh state */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {categoriesState.loading &&
          categoriesState.data.length > 0 &&
          'Refreshing categories'}
        {abbrevState.loading &&
          abbrevState.data.length > 0 &&
          ' Refreshing abbreviations'}
      </div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-300 tracking-tight">
            Admin Console
          </h1>
          <p className="text-sm  text-gray-400 mt-1">
            Manage taxonomy resources that power improved search,
            disambiguation, and AI context building.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              loadCategories(categoriesPage)
              loadAbbreviations(abbrevPage)
            }}
          >
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
          {activeTab === 'categories' ? (
            <Button size="sm" onClick={openCreateCategory}>
              <Plus className="mr-2 h-4 w-4" /> New Category
            </Button>
          ) : (
            <Button size="sm" onClick={openCreateAbbrev}>
              <Plus className="mr-2 h-4 w-4" /> New Abbreviation
            </Button>
          )}
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(v: string) =>
          setActiveTab(v as 'categories' | 'abbreviations' | 'audit')
        }
      >
        <TabsList>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="abbreviations">Abbreviations</TabsTrigger>
          <TabsTrigger value="audit">Audit Logs</TabsTrigger>
        </TabsList>
        <TabsContent
          value="categories"
          className="mt-6 focus-visible:outline-none"
        >
          {renderCategories()}
        </TabsContent>
        <TabsContent
          value="abbreviations"
          className="mt-6 focus-visible:outline-none"
        >
          {renderAbbreviations()}
        </TabsContent>
        <TabsContent value="audit" className="mt-6 focus-visible:outline-none">
          <AuditLogViewer />
        </TabsContent>
      </Tabs>
      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog
        open={!!bulkDeleteContext}
        onOpenChange={open => !open && setBulkDeleteContext(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {bulkDeleteContext?.ids.length}{' '}
              {bulkDeleteContext?.type === 'categories'
                ? 'categories'
                : 'abbreviations'}{' '}
              ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.{' '}
              {bulkDeleteContext?.type === 'categories'
                ? 'Abbreviations will remain but become uncategorized if they referenced these categories.'
                : 'All selected abbreviations will be permanently removed from the taxonomy.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={stageBulkDeletion}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={!!pendingBulkDeletion}
            >
              {pendingBulkDeletion ? 'Pending…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {pendingBulkDeletion && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-md bg-muted/80 backdrop-blur border border-border shadow flex items-center gap-3 text-sm">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span>
            {pendingBulkDeletion.status === 'pending'
              ? `${pendingBulkDeletion.ids.length} ${pendingBulkDeletion.type === 'categories' ? 'categories' : 'abbreviations'} scheduled for deletion…`
              : 'Processing deletions…'}
          </span>
        </div>
      )}
      <Dialog open={showCategoryModal} onOpenChange={setShowCategoryModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Edit Category' : 'New Category'}
            </DialogTitle>
            <DialogDescription>
              {editingCategory
                ? 'Update category details.'
                : 'Create a category to group related abbreviations.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Name <span className="text-destructive">*</span>
              </label>
              <Input
                value={categoryForm.name}
                onChange={e =>
                  setCategoryForm(f => ({ ...f, name: e.target.value }))
                }
                placeholder="e.g. Safety Regulations"
                disabled={categorySaving}
              />
              {categoryErrors.name && (
                <p className="text-xs text-destructive mt-1">
                  {categoryErrors.name}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={categoryForm.description}
                onChange={e =>
                  setCategoryForm(f => ({ ...f, description: e.target.value }))
                }
                placeholder="Optional context / usage notes"
                disabled={categorySaving}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setShowCategoryModal(false)}
              disabled={categorySaving}
            >
              Cancel
            </Button>
            <Button onClick={saveCategory} disabled={categorySaving}>
              {categorySaving && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              <span>
                {editingCategory ? 'Save Changes' : 'Create Category'}
              </span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={!!pendingDeleteCategory}
        onOpenChange={open => !open && setPendingDeleteCategory(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Deleting a category will not delete
              abbreviations but may leave them uncategorized.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteCategory}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Abbreviation Create/Edit Modal */}
      <Dialog open={showAbbrevModal} onOpenChange={setShowAbbrevModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingAbbrev ? 'Edit Abbreviation' : 'New Abbreviation'}
            </DialogTitle>
            <DialogDescription>
              {editingAbbrev
                ? 'Update abbreviation details.'
                : 'Create an abbreviation to standardize terminology.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Term <span className="text-destructive">*</span>
              </label>
              <Input
                value={abbrevForm.term}
                onChange={e =>
                  setAbbrevForm(f => ({ ...f, term: e.target.value }))
                }
                placeholder="e.g. PPE"
                disabled={abbrevSaving}
              />
              {abbrevErrors.term && (
                <p className="text-xs text-destructive mt-1">
                  {abbrevErrors.term}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Definition<span className="text-destructive">*</span>
              </label>
              <Input
                value={abbrevForm.expansion}
                onChange={e =>
                  setAbbrevForm(f => ({ ...f, expansion: e.target.value }))
                }
                placeholder="e.g. Personal Protective Equipment"
                disabled={abbrevSaving}
              />
              {abbrevErrors.expansion && (
                <p className="text-xs text-destructive mt-1">
                  {abbrevErrors.expansion}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Select
                value={abbrevForm.categoryId}
                onValueChange={v =>
                  setAbbrevForm(f => ({ ...f, categoryId: v }))
                }
                disabled={
                  abbrevSaving ||
                  categoriesState.loading ||
                  !categoriesState.data.length
                }
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      categoriesState.loading
                        ? 'Loading...'
                        : 'Optional category'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {categoriesState.data.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Usage Examples{' '}
                <span className="text-xs text-muted-foreground font-normal">
                  (one per line)
                </span>
              </label>
              <Textarea
                value={abbrevForm.examples}
                onChange={e =>
                  setAbbrevForm(f => ({ ...f, examples: e.target.value }))
                }
                placeholder={
                  'e.g.\nPPE is mandatory on site.\nEnsure PPE compliance.'
                }
                disabled={abbrevSaving}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setShowAbbrevModal(false)}
              disabled={abbrevSaving}
            >
              Cancel
            </Button>
            <Button onClick={saveAbbrev} disabled={abbrevSaving}>
              {abbrevSaving && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              <span>
                {editingAbbrev ? 'Save Changes' : 'Create Abbreviation'}
              </span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Abbreviation Delete Confirmation */}
      <AlertDialog
        open={!!pendingDeleteAbbrev}
        onOpenChange={open => !open && setPendingDeleteAbbrev(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Abbreviation</AlertDialogTitle>
            <AlertDialogDescription>
              This abbreviation will be removed from the taxonomy. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteAbbrev}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default AdminConsole
