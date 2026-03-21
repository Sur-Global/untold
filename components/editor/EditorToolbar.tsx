'use client'

import type { Editor } from '@tiptap/react'

interface EditorToolbarProps {
  editor: Editor
}

interface ToolbarButton {
  label: string
  title: string
  action: () => boolean
  isActive: () => boolean
}

export function EditorToolbar({ editor }: EditorToolbarProps) {
  const groups: ToolbarButton[][] = [
    [
      { label: 'B',  title: 'Bold',          action: () => editor.chain().focus().toggleBold().run(),        isActive: () => editor.isActive('bold') },
      { label: 'I',  title: 'Italic',        action: () => editor.chain().focus().toggleItalic().run(),      isActive: () => editor.isActive('italic') },
      { label: 'U',  title: 'Underline',     action: () => editor.chain().focus().toggleUnderline().run(),   isActive: () => editor.isActive('underline') },
      { label: 'S',  title: 'Strikethrough', action: () => editor.chain().focus().toggleStrike().run(),      isActive: () => editor.isActive('strike') },
    ],
    [
      { label: 'H1', title: 'Heading 1',     action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), isActive: () => editor.isActive('heading', { level: 1 }) },
      { label: 'H2', title: 'Heading 2',     action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), isActive: () => editor.isActive('heading', { level: 2 }) },
      { label: 'H3', title: 'Heading 3',     action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), isActive: () => editor.isActive('heading', { level: 3 }) },
    ],
    [
      { label: '❝',  title: 'Blockquote',    action: () => editor.chain().focus().toggleBlockquote().run(),  isActive: () => editor.isActive('blockquote') },
      { label: '`',  title: 'Inline code',   action: () => editor.chain().focus().toggleCode().run(),        isActive: () => editor.isActive('code') },
      { label: '{ }',title: 'Code block',    action: () => editor.chain().focus().toggleCodeBlock().run(),   isActive: () => editor.isActive('codeBlock') },
    ],
    [
      { label: '• ',  title: 'Bullet list',  action: () => editor.chain().focus().toggleBulletList().run(),  isActive: () => editor.isActive('bulletList') },
      { label: '1. ', title: 'Ordered list', action: () => editor.chain().focus().toggleOrderedList().run(), isActive: () => editor.isActive('orderedList') },
    ],
  ]

  const handleLinkToggle = () => {
    if (editor.isActive('link')) {
      editor.chain().focus().unsetLink().run()
    } else {
      const url = window.prompt('URL')
      if (url) editor.chain().focus().setLink({ href: url }).run()
    }
  }

  const btnClass = (active: boolean) =>
    `px-2 py-1 text-xs font-mono rounded transition-colors ${
      active
        ? 'bg-[#A0522D] text-white'
        : 'text-[#2C2420] hover:bg-[rgba(160,82,45,0.12)]'
    }`

  return (
    <div
      className="flex flex-wrap items-center gap-1 p-2 border-b"
      style={{ borderColor: 'rgba(139,69,19,0.2)', background: 'rgba(160,82,45,0.04)' }}
    >
      {groups.map((group, gi) => (
        <span key={gi} className="flex items-center gap-1">
          {group.map((btn) => (
            <button
              key={btn.title}
              type="button"
              title={btn.title}
              onClick={btn.action}
              className={btnClass(btn.isActive())}
            >
              {btn.label}
            </button>
          ))}
          {gi < groups.length - 1 && (
            <span className="mx-1 text-[rgba(139,69,19,0.3)]">|</span>
          )}
        </span>
      ))}
      <span className="mx-1 text-[rgba(139,69,19,0.3)]">|</span>
      <button
        type="button"
        title="Link"
        onClick={handleLinkToggle}
        className={btnClass(editor.isActive('link'))}
      >
        Link
      </button>
    </div>
  )
}
