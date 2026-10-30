'use client'

import { useState } from 'react'
import { BlockNoteSchema, defaultBlockSpecs, defaultInlineContentSpecs } from '@blocknote/core'
import { createReactBlockSpec } from '@blocknote/react'
import { withMultiColumn } from '@blocknote/xl-multi-column'
import { toEmbedSource } from '@/lib/video-embed'
import { createFootnoteBlock, createFootnoteRef } from '@/components/editor/footnotes'

// Video embed block: paste a YouTube / Vimeo / video-file link, it plays in the article.
// (BlockNote's own "Video" block only takes direct file links, which YouTube and Vimeo aren't.)
function EmbedPlayer({ url }: { url: string }) {
  const source = toEmbedSource(url)
  // BlockNote needs a DOM element back (null makes the HTML export throw)
  if (!source) return <span hidden />
  if (source.kind === 'file') {
    return (
      <div className="bn-embed">
        <video src={source.src} controls preload="metadata" />
      </div>
    )
  }
  return (
    <div className="bn-embed">
      <iframe
        src={source.src}
        title="Video"
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
      />
    </div>
  )
}

function EmbedEditor({ url, editable, onChange }: { url: string; editable: boolean; onChange: (url: string) => void }) {
  const [draft, setDraft] = useState('')
  const [error, setError] = useState(false)
  const valid = !!toEmbedSource(url)

  if (valid) {
    return (
      <div style={{ width: '100%' }}>
        <EmbedPlayer url={url} />
        {editable && (
          <button
            type="button"
            onClick={() => onChange('')}
            style={{ marginTop: 6, fontSize: 12, color: '#6B5F58', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            ✕ Change link
          </button>
        )}
      </div>
    )
  }

  const submit = () => {
    if (toEmbedSource(draft)) {
      setError(false)
      onChange(draft.trim())
    } else {
      setError(true)
    }
  }

  return (
    <div
      contentEditable={false}
      style={{ width: '100%', border: '1px dashed rgba(139,69,19,0.35)', borderRadius: 8, padding: 12, background: '#FAF7F2' }}
    >
      <div style={{ fontSize: 13, color: '#6B5F58', marginBottom: 8 }}>Paste a YouTube, Vimeo or video file link</div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={draft}
          onChange={(e) => { setDraft(e.target.value); setError(false) }}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit() } }}
          placeholder="https://www.youtube.com/watch?v=…"
          style={{ flex: 1, minWidth: 0, border: '1px solid rgba(139,69,19,0.25)', borderRadius: 6, padding: '6px 10px', fontSize: 14, background: '#fff' }}
        />
        <button
          type="button"
          onClick={submit}
          style={{ border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 13, background: '#8b4513', color: '#fff', cursor: 'pointer' }}
        >
          Embed
        </button>
      </div>
      {error && <div style={{ marginTop: 6, fontSize: 12, color: '#991b1b' }}>That link isn&apos;t supported. Use YouTube, Vimeo or a direct .mp4 link.</div>}
    </div>
  )
}

export const createVideoEmbedBlock = createReactBlockSpec(
  { type: 'videoEmbed', propSchema: { url: { default: '' } }, content: 'none' },
  {
    render: ({ block, editor }) => (
      <EmbedEditor
        url={block.props.url}
        editable={editor.isEditable}
        onChange={(url) => editor.updateBlock(block, { props: { url } })}
      />
    ),
    toExternalHTML: ({ block }) => <EmbedPlayer url={block.props.url} />,
  },
)

/** The one schema shared by the editor and the reader, so every block type round-trips. */
export const contentSchema = withMultiColumn(
  BlockNoteSchema.create({
    blockSpecs: { ...defaultBlockSpecs, videoEmbed: createVideoEmbedBlock(), footnote: createFootnoteBlock() },
    // footnoteRef: the number in the text; the note itself is the `footnote` block (see lib/footnotes.ts)
    inlineContentSpecs: { ...defaultInlineContentSpecs, footnoteRef: createFootnoteRef },
  }),
)
