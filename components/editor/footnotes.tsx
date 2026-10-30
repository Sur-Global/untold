'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  createReactBlockSpec,
  createReactInlineContentSpec,
  useBlockNoteEditor,
  useComponentsContext,
  useEditorChange,
} from '@blocknote/react'
import {
  FOOTNOTE,
  FOOTNOTE_REF,
  findNotes,
  footnoteNumbers,
  inlineItems,
  newFootnoteId,
  notePlacement,
  planDuplicates,
  planNotes,
  type FnBlock,
} from '@/lib/footnotes'

// ─── Reading what the document says about its footnotes (live, as the author types) ─────────

function useEditorValue<T extends string | number | boolean | undefined>(editor: any, read: (blocks: FnBlock[]) => T): T {
  const [value, setValue] = useState<T>(() => read(editor.document))
  useEditorChange(() => setValue(read(editor.document)), editor)
  return value
}

// ─── The number in the text ─────────────────────────────────────────────────────────────────

function FootnoteMarker({ id, editor }: { id: string; editor: any }) {
  const t = useTranslations('footnotes')
  const n = useEditorValue(editor, (blocks) => footnoteNumbers(blocks).get(id))
  return (
    <span
      className="bn-fn-ref"
      data-fn-ref={id}
      role="link"
      tabIndex={-1}
      contentEditable={false}
      title={t('goToNote')}
      aria-label={n ? t('noteLabel', { n }) : t('goToNote')}
      onClick={() => goToNote(editor, id)}
    >
      {n ?? '?'}
    </span>
  )
}

export const createFootnoteRef = createReactInlineContentSpec(
  {
    type: FOOTNOTE_REF,
    // `n`, `mode` and `label` are filled in when the article is shown (lib/footnotes → prepareFootnotes); they are never typed by hand
    propSchema: { id: { default: '' }, n: { default: '' }, mode: { default: '' }, label: { default: '' } },
    content: 'none',
  },
  {
    render: ({ inlineContent, editor }) => <FootnoteMarker id={inlineContent.props.id} editor={editor} />,
    // Pure, no hooks: BlockNote renders this to plain HTML for the reader and for copying
    toExternalHTML: ({ inlineContent }) => {
      const { id, n, mode, label } = inlineContent.props
      if (!n) return <sup className="fn-ref">*</sup>
      if (mode === 'link') {
        return (
          <sup className="fn-ref">
            <a id={`fnref-${id}`} href={`#fn-${id}`} role="doc-noteref" aria-label={label || undefined}>
              {n}
            </a>
          </sup>
        )
      }
      return (
        <sup className="fn-ref">
          <a href={`#fn-${id}`} role="doc-noteref" aria-label={label || undefined}>
            {n}
          </a>
        </sup>
      )
    },
  },
)

// ─── The note, at the end of the article ────────────────────────────────────────────────────

function FootnoteNote({ block, editor, contentRef }: { block: any; editor: any; contentRef: (node: HTMLElement | null) => void }) {
  const t = useTranslations('footnotes')
  const ref: string = block.props.ref
  const n = useEditorValue(editor, (blocks) => footnoteNumbers(blocks).get(ref))
  const first = useEditorValue(editor, (blocks) => findNotes(blocks)[0]?.id === block.id)
  const orphan = n === undefined

  return (
    <div className="bn-fn-note" data-fn-note={ref} data-orphan={orphan || undefined}>
      {first && (
        <div className="bn-fn-title" contentEditable={false}>
          {t('title')}
        </div>
      )}
      <div className="bn-fn-row">
        <span className="bn-fn-num" contentEditable={false}>
          {orphan ? '–' : n}.
        </span>
        <div className="bn-fn-text" ref={contentRef} />
        {!orphan && (
          <button type="button" className="bn-fn-back" contentEditable={false} title={t('back')} aria-label={t('back')} onClick={() => goToMarker(editor, ref)}>
            ↑
          </button>
        )}
      </div>
      {orphan && (
        <div className="bn-fn-orphan" contentEditable={false}>
          {t('orphan')}{' '}
          <button type="button" onClick={() => editor.removeBlocks([block.id])}>
            {t('remove')}
          </button>
        </div>
      )}
    </div>
  )
}

export const createFootnoteBlock = createReactBlockSpec(
  { type: FOOTNOTE, propSchema: { ref: { default: '' } }, content: 'inline' },
  {
    render: ({ block, editor, contentRef }) => <FootnoteNote block={block} editor={editor} contentRef={contentRef} />,
    // The reader lays the notes out itself (lib/blocknote-html.ts); this is what copying a note gives
    toExternalHTML: ({ contentRef }) => <p ref={contentRef} />,
  },
)

// ─── Moving around ──────────────────────────────────────────────────────────────────────────

function scrollTo(editor: any, selector: string) {
  requestAnimationFrame(() => {
    const el = editor.domElement?.querySelector(selector) as HTMLElement | null
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    el?.classList.add('bn-fn-flash')
    setTimeout(() => el?.classList.remove('bn-fn-flash'), 1200)
  })
}

export function goToNote(editor: any, ref: string) {
  const note = findNotes(editor.document).find((n) => n.props?.ref === ref)
  if (!note?.id) return
  editor.setTextCursorPosition(note.id, 'end')
  editor.focus()
  scrollTo(editor, `[data-fn-note="${ref}"]`)
}

function goToMarker(editor: any, ref: string) {
  let target: string | undefined
  const visit = (blocks: FnBlock[]) => {
    for (const block of blocks) {
      if (target) return
      if (block.type !== FOOTNOTE && inlineItems(block).some((i) => i?.type === FOOTNOTE_REF && i.props?.id === ref)) target = block.id
      if (!target && block.children) visit(block.children)
    }
  }
  visit(editor.document)
  if (!target) return
  editor.setTextCursorPosition(target, 'end')
  editor.focus()
  scrollTo(editor, `[data-fn-ref="${ref}"]`)
}

// ─── Keeping numbers and notes in step ──────────────────────────────────────────────────────

function insertNote(editor: any, ref: string, content?: any[]) {
  const place = notePlacement(editor.document, ref)
  if (!place) return
  editor.insertBlocks([{ type: FOOTNOTE, props: { ref }, ...(content ? { content } : {}) }], place.referenceId, place.placement)
}

function reorderNotes(editor: any, orderedIds: string[]) {
  const doc: FnBlock[] = editor.document
  const notes = orderedIds.map((id) => doc.find((b) => b.id === id)).filter(Boolean) as FnBlock[]
  const rest = doc.filter((b) => b.type !== FOOTNOTE)
  const last = rest[rest.length - 1]
  if (!last?.id) return
  const tailEmpty = inlineItems(last).every((i) => !String(i?.text ?? '').trim() && i?.type !== FOOTNOTE_REF) && last.type === 'paragraph' && rest.length > 1
  editor.transact(() => {
    editor.removeBlocks(notes.map((n) => n.id))
    editor.insertBlocks(
      notes.map((n) => ({ type: FOOTNOTE, props: { ref: n.props?.ref }, content: n.content })),
      last.id,
      tailEmpty ? 'before' : 'after',
    )
  })
}

/**
 * Brings the notes in line with the numbers in the text: gives a note to every number, drops empty notes whose number was deleted,
 * copes with a number that was copied, and keeps the notes in the order of the numbers. Safe to call at any time.
 */
export function syncFootnotes(editor: any): void {
  for (let guard = 0; guard < 60; guard++) {
    const doc: FnBlock[] = editor.document

    const dup = planDuplicates(doc)
    if (dup) {
      editor.transact(() => {
        for (const u of dup.updates) editor.updateBlock(u.blockId, { content: u.content })
      })
      for (const clone of dup.clones) {
        const original = findNotes(editor.document).find((n) => n.props?.ref === clone.from)
        insertNote(editor, clone.to, original?.content)
      }
      continue
    }

    const plan = planNotes(doc)
    if (plan.remove.length) {
      editor.removeBlocks(plan.remove)
      continue
    }
    if (plan.create.length) {
      insertNote(editor, plan.create[0])
      continue
    }
    if (plan.reorder) {
      reorderNotes(editor, plan.reorder)
      continue
    }
    return
  }
}

/** Puts a new number after the cursor (after the selected words, if any) and opens its note at the end of the article. */
export function insertFootnote(editor: any): boolean {
  const block = editor.getTextCursorPosition?.()?.block
  if (!block || block.type === FOOTNOTE || block.type === 'codeBlock') return false

  const tip = editor._tiptapEditor
  const { from, to, $from } = tip.state.selection
  if (to !== from) {
    tip.commands.setTextSelection(to) // after the words, not over them
  } else if ($from.parentOffset > 1 && $from.parent.textBetween($from.parentOffset - 1, $from.parentOffset) === ' ') {
    // the number belongs to the word before it: drop the space typed to open the "/" menu
    tip.commands.deleteRange({ from: from - 1, to: from })
  }

  const id = newFootnoteId()
  editor.insertInlineContent([{ type: FOOTNOTE_REF, props: { id } }])
  syncFootnotes(editor)
  goToNote(editor, id)
  return true
}

// ─── The button in the toolbar that appears over selected text ──────────────────────────────

export function FootnoteToolbarButton() {
  const t = useTranslations('footnotes')
  const Components = useComponentsContext()
  const editor = useBlockNoteEditor()
  if (!Components) return null
  return (
    <Components.FormattingToolbar.Button
      className="bn-button bn-fn-toolbar-button"
      mainTooltip={t('itemTitle')}
      label={t('itemTitle')}
      // the toolbar draws only the icon, so the words go inside it: anyone can find the button
      icon={
        <span className="bn-fn-toolbar-label">
          <span aria-hidden>
            A<sup>1</sup>
          </span>
          {t('itemTitle')}
        </span>
      }
      onClick={() => insertFootnote(editor)}
    />
  )
}
