'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { ensureTag } from '@/lib/actions/tags'

export interface Tag {
  id: string
  slug: string
  name: string
}

interface TagsInputProps {
  value: Tag[]
  onChange: (tags: Tag[]) => void
  placeholder?: string
}

export function TagsInput({ value, onChange, placeholder = 'Add categories…' }: TagsInputProps) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<Tag[]>([])
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  const fetchSuggestions = useCallback((q: string) => {
    if (!q.trim()) { setSuggestions([]); setActiveIndex(-1); return }
    fetch(`/api/tags?q=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((tags: Tag[]) => {
        setSuggestions(tags.filter((t) => !value.find((v) => v.id === t.id)))
        setActiveIndex(-1)
      })
      .catch(() => setSuggestions([]))
  }, [value])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchSuggestions(query), 250)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, fetchSuggestions])

  const showCreate = !!(query.trim() && !suggestions.find((s) => s.name.toLowerCase() === query.toLowerCase()))
  // Total items: suggestions + optional create item
  const totalItems = suggestions.length + (showCreate ? 1 : 0)

  const addTag = (tag: Tag) => {
    if (!value.find((v) => v.id === tag.id)) onChange([...value, tag])
    setQuery('')
    setSuggestions([])
    setOpen(false)
    setActiveIndex(-1)
    inputRef.current?.focus()
  }

  const removeTag = (id: string) => onChange(value.filter((t) => t.id !== id))

  const handleCreateNew = async () => {
    if (!query.trim()) return
    setCreating(true)
    try {
      const tag = await ensureTag(query.trim())
      addTag(tag)
    } finally {
      setCreating(false)
    }
  }

  const selectActive = () => {
    if (activeIndex >= 0 && activeIndex < suggestions.length) {
      addTag(suggestions[activeIndex])
    } else if (showCreate && activeIndex === suggestions.length) {
      handleCreateNew()
    } else if (suggestions.length > 0) {
      addTag(suggestions[0])
    } else if (showCreate) {
      handleCreateNew()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setActiveIndex((i) => Math.min(i + 1, totalItems - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, -1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      selectActive()
    } else if (e.key === 'Backspace' && !query && value.length > 0) {
      removeTag(value[value.length - 1].id)
    } else if (e.key === 'Escape') {
      setOpen(false)
      setActiveIndex(-1)
    }
  }

  return (
    <div className="relative">
      <div
        className="min-h-[50px] flex flex-wrap gap-1.5 items-center px-4 py-2.5 rounded-[10px] border border-primary/20 bg-white cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 h-6 px-2.5 rounded-full text-xs font-medium bg-primary/10 text-primary"
          >
            {tag.name}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removeTag(tag.id) }}
              className="text-primary/60 hover:text-primary ml-0.5"
              aria-label={`Remove ${tag.name}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => { setOpen(false); setActiveIndex(-1) }, 150)}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[120px] bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
        />
      </div>

      {open && totalItems > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-primary/20 rounded-[10px] shadow-lg z-50 overflow-hidden">
          {suggestions.map((tag, i) => (
            <button
              key={tag.id}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); addTag(tag) }}
              onMouseEnter={() => setActiveIndex(i)}
              className={[
                'w-full text-left px-4 py-2.5 text-sm text-foreground transition-colors',
                activeIndex === i ? 'bg-primary/10' : 'hover:bg-primary/5',
              ].join(' ')}
            >
              {tag.name}
            </button>
          ))}
          {showCreate && (
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); handleCreateNew() }}
              onMouseEnter={() => setActiveIndex(suggestions.length)}
              disabled={creating}
              className={[
                'w-full text-left px-4 py-2.5 text-sm text-primary transition-colors border-t border-primary/10',
                activeIndex === suggestions.length ? 'bg-primary/10' : 'hover:bg-primary/5',
              ].join(' ')}
            >
              {creating ? 'Creating…' : `Create "${query.trim()}"`}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
