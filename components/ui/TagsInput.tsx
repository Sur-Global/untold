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
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  const fetchSuggestions = useCallback((q: string) => {
    if (!q.trim()) { setSuggestions([]); return }
    fetch(`/api/tags?q=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((tags: Tag[]) => setSuggestions(tags.filter((t) => !value.find((v) => v.id === t.id))))
      .catch(() => setSuggestions([]))
  }, [value])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchSuggestions(query), 250)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, fetchSuggestions])

  const addTag = (tag: Tag) => {
    if (!value.find((v) => v.id === tag.id)) onChange([...value, tag])
    setQuery('')
    setSuggestions([])
    setOpen(false)
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (suggestions.length > 0) addTag(suggestions[0])
      else if (query.trim()) handleCreateNew()
    }
    if (e.key === 'Backspace' && !query && value.length > 0) {
      removeTag(value[value.length - 1].id)
    }
    if (e.key === 'Escape') { setOpen(false) }
  }

  const showCreate = query.trim() && !suggestions.find((s) => s.name.toLowerCase() === query.toLowerCase())

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
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[120px] bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
        />
      </div>

      {open && (suggestions.length > 0 || showCreate) && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-primary/20 rounded-[10px] shadow-lg z-50 overflow-hidden">
          {suggestions.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); addTag(tag) }}
              className="w-full text-left px-4 py-2.5 text-sm text-foreground hover:bg-primary/5 transition-colors"
            >
              {tag.name}
            </button>
          ))}
          {showCreate && (
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); handleCreateNew() }}
              disabled={creating}
              className="w-full text-left px-4 py-2.5 text-sm text-primary hover:bg-primary/5 transition-colors border-t border-primary/10"
            >
              {creating ? 'Creating…' : `Create "${query.trim()}"`}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
