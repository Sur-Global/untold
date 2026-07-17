'use client'

import { useRef, useState } from 'react'
import { insertBracketLink } from '@/lib/photo-credit'

interface PhotoCreditInputProps {
  name: string
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  placeholder?: string
  className?: string
}

const INPUT_CLASS =
  'w-full h-[50px] px-4 rounded-[10px] border border-primary/20 bg-white text-foreground text-base outline-none focus:border-primary/50 transition-colors placeholder:text-muted-foreground'

export function PhotoCreditInput({
  name,
  value,
  defaultValue,
  onChange,
  placeholder,
  className,
}: PhotoCreditInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [internalValue, setInternalValue] = useState(value ?? defaultValue ?? '')
  const currentValue = value ?? internalValue

  const setValue = (next: string) => {
    setInternalValue(next)
    onChange?.(next)
  }

  const handleInsertLink = () => {
    const label = window.prompt('Link text (e.g. "Jane Doe" or "Unsplash")')
    if (!label) return
    const url = window.prompt('Link URL (must start with https://)')
    if (!url) return
    if (!/^https?:\/\//.test(url)) {
      window.alert('Link URL must start with http:// or https://')
      return
    }

    const cursor = inputRef.current?.selectionStart ?? null
    const next = insertBracketLink(currentValue, cursor, label, url)
    setValue(next)
    inputRef.current?.focus()
  }

  return (
    <div className="space-y-1.5">
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          name={name}
          value={currentValue}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className={className ?? INPUT_CLASS}
        />
        <button
          type="button"
          onClick={handleInsertLink}
          className="shrink-0 h-[50px] px-3 rounded-[10px] border border-primary/20 bg-white text-sm text-foreground hover:border-primary/50 transition-colors"
        >
          Insert link
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        Tip: you can also type a link directly as <code>[label](https://...)</code>.
      </p>
    </div>
  )
}
