import React, { useEffect, useMemo, useState } from 'react'
import { adminTaxonomyService } from '@/services'
import type { AdminCategory } from '@/services/api/admin-taxonomy'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { X, Plus, Loader2, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface CategoryMultiSelectProps {
  value: string[]
  onChange: (next: string[]) => void
  max?: number
  min?: number
  disabled?: boolean
  allowCreate?: boolean // future use (admin inline create)
  placeholder?: string
  className?: string
  compact?: boolean
}

interface CategoryRecord {
  id: string
  name: string
  description?: string | null
}

export const CategoryMultiSelect: React.FC<CategoryMultiSelectProps> = ({
  value,
  onChange,
  max = 5,
  min = 1,
  disabled,
  allowCreate = false,
  placeholder = 'Select categories',
  className,
  compact,
}) => {
  const [categories, setCategories] = useState<CategoryRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await adminTaxonomyService.listCategories(1, 500)
        if (!active) return
        setCategories(
          res.items.map((c: AdminCategory) => ({
            id: c.id,
            name: c.name,
            description: c.description,
          })),
        )
      } catch (e) {
        if (!active) return
        setError((e as Error).message)
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => {
      active = false
    }
  }, [])

  const selectedDetails = useMemo(
    () =>
      value
        .map(id => categories.find(c => c.id === id))
        .filter(Boolean) as CategoryRecord[],
    [value, categories],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return categories
    return categories.filter(
      c =>
        c.name.toLowerCase().includes(q) ||
        (c.description?.toLowerCase().includes(q) ?? false),
    )
  }, [categories, query])

  const toggle = (id: string) => {
    if (value.includes(id)) {
      // Prevent removing below minimum
      if (value.length <= min) return
      onChange(value.filter(v => v !== id))
    } else {
      if (value.length >= max) return
      onChange([...value, id])
    }
  }

  const remove = (id: string) => {
    if (value.length <= min) return
    onChange(value.filter(v => v !== id))
  }

  const clearAll = () => {
    if (min > 0) return
    onChange([])
  }

  return (
    <div className={cn('relative', className)}>
      <div
        className={cn(
          'border rounded-md px-2 py-2 flex flex-wrap gap-1 items-center min-h-[42px] bg-background/70 backdrop-blur transition-colors',
          disabled && 'opacity-50 pointer-events-none',
          open && 'ring-2 ring-primary/40 ring-offset-1',
        )}
        onClick={() => setOpen(o => !o)}
        role="button"
        tabIndex={0}
      >
        {selectedDetails.length === 0 && (
          <span className="text-xs text-muted-foreground px-1 select-none">
            {loading ? 'Loading categories…' : placeholder}
          </span>
        )}
        {selectedDetails.map(cat => {
          const canRemove = value.length > min
          return (
            <Badge
              key={cat.id}
              variant="secondary"
              className={cn(
                'flex items-center gap-1 pr-1',
                !canRemove && 'opacity-90',
              )}
              onClick={e => {
                e.stopPropagation()
                if (canRemove) remove(cat.id)
              }}
            >
              <span className="text-[11px] font-medium">{cat.name}</span>
              <X
                className={cn(
                  'h-3 w-3',
                  canRemove
                    ? 'opacity-70 hover:opacity-100'
                    : 'opacity-30 cursor-not-allowed',
                )}
              />
            </Badge>
          )
        })}
        <div className="ml-auto flex items-center gap-1">
          {value.length > min && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={e => {
                e.stopPropagation()
                clearAll()
              }}
              className="h-6 px-1 text-[10px] text-muted-foreground"
            >
              Clear
            </Button>
          )}
          <ChevronDown
            className={cn('h-4 w-4 transition-transform', open && 'rotate-180')}
          />
        </div>
      </div>
      {open && (
        <div className="absolute z-30 mt-1 w-full border rounded-md bg-popover shadow-lg max-h-72 overflow-hidden flex flex-col">
          <div className="p-2 border-b">
            <Input
              placeholder="Search categories…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="h-8 text-xs"
              autoFocus
            />
          </div>
          <div className="overflow-y-auto custom-scrollbar text-sm">
            {loading && (
              <div className="flex items-center gap-2 px-3 py-3 text-xs text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            )}
            {!loading && error && (
              <div className="px-3 py-3 text-xs text-destructive whitespace-pre-wrap">
                {error}
              </div>
            )}
            {!loading && !error && filtered.length === 0 && (
              <div className="px-3 py-3 text-xs text-muted-foreground">
                No matches.
              </div>
            )}
            {!loading && !error && filtered.length > 0 && (
              <ul className="py-1">
                {filtered.map(cat => {
                  const selected = value.includes(cat.id)
                  const disabledSel = !selected && value.length >= max
                  return (
                    <li
                      key={cat.id}
                      className={cn(
                        'px-3 py-1.5 cursor-pointer hover:bg-accent flex flex-col gap-0.5',
                        selected && 'bg-accent/40',
                        disabledSel && 'opacity-40 cursor-not-allowed',
                      )}
                      onClick={() => !disabledSel && toggle(cat.id)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[12px] font-medium leading-none">
                          {cat.name}
                        </span>
                        {selected && (
                          <span className="text-[10px] font-semibold text-primary uppercase tracking-wide">
                            Selected
                          </span>
                        )}
                      </div>
                      {cat.description && !compact && (
                        <p className="text-[10px] leading-snug line-clamp-2 text-muted-foreground">
                          {cat.description}
                        </p>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
          <div className="flex items-center justify-between border-t px-2 py-1.5 bg-muted/30">
            <span className="text-[10px] text-muted-foreground">
              {value.length}/{max} selected{min > 0 && ` (min ${min})`}
            </span>
            {allowCreate && (
              <Button
                variant="ghost"
                size="sm"
                className="text-[10px] h-6"
                onClick={() => {
                  // placeholder for future inline create
                }}
              >
                <Plus className="h-3 w-3 mr-1" /> New
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default CategoryMultiSelect
