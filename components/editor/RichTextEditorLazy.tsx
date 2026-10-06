'use client'

import dynamic from 'next/dynamic'

// BlockNote's useCreateBlockNote touches `window` during initialization, which
// crashes with "ReferenceError: window is not defined" when this component is
// server-rendered (Next.js SSRs 'use client' components on the initial request,
// not just on the client) — every hard page load/refresh of any form using the
// rich text editor was hitting this. Loading it via next/dynamic with
// ssr:false skips server rendering entirely; it only ever mounts client-side.
export const RichTextEditor = dynamic(
  () => import('./RichTextEditor').then((m) => m.RichTextEditor),
  {
    ssr: false,
    loading: () => (
      <div
        className="rounded-lg bg-white animate-pulse"
        style={{ border: '1px solid rgba(139,69,19,0.25)', minHeight: 320 }}
      />
    ),
  },
)

export type { EditorBlock } from './RichTextEditor'
