'use client'

import { useEffect, useRef, useState } from 'react'
import { SUBSCRIBE_FORM_URL } from '@/lib/subscribe'

interface Props {
  label: string
  closeLabel: string
  formTitle: string
}

/** Footer "Subscribe" button: opens the Sender form in a pop-up window over the page. */
export function SubscribeModalButton({ label, closeLabel, formTitle }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-5 inline-flex h-10 items-center rounded-full px-6 text-sm font-medium text-black transition-opacity hover:opacity-90"
        style={{ backgroundColor: '#D2FE73', fontFamily: 'var(--font-aeonik), Aeonik, sans-serif' }}
      >
        {label}
      </button>

      <dialog
        ref={dialogRef}
        onClose={() => setOpen(false)}
        onClick={(e) => {
          // Click on the backdrop (the dialog element itself) closes it
          if (e.target === dialogRef.current) setOpen(false)
        }}
        className="m-auto w-[calc(100%-2rem)] max-w-[500px] overflow-hidden rounded-2xl bg-white p-0 shadow-2xl backdrop:bg-black/60"
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label={closeLabel}
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/5 text-lg leading-none text-black hover:bg-black/10"
        >
          ×
        </button>
        {open && (
          <iframe
            src={SUBSCRIBE_FORM_URL}
            title={formTitle}
            className="block h-[min(640px,85vh)] w-full border-0"
          />
        )}
      </dialog>
    </>
  )
}
