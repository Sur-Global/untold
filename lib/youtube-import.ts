// Pure helpers of the YouTube channel import (scripts/import-youtube-channel.ts): turning what YouTube gives us
// (ISO durations, a description with a footer, chapters as timestamp lines) into what the platform stores.
import { randomUUID } from 'node:crypto'

/** PT1H22M18S → "1:22:18", PT2M19S → "2:19" (same format as the videos already on the site) */
export function formatDuration(iso: string): string {
  const m = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso) ?? []
  const [h, min, s] = [Number(m[1] ?? 0), Number(m[2] ?? 0), Number(m[3] ?? 0)]
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${String(min).padStart(2, '0')}:${ss}` : `${min}:${ss}`
}

/** The video description without the channel's "Síguenos en…" footer */
export function cleanDescription(description: string): string {
  const cut = description.search(/🔗|S[ií]guenos en/i)
  return (cut >= 0 ? description.slice(0, cut) : description).replace(/\r/g, '').trim()
}

/** Chapters: lines that start with a timestamp (YouTube needs 0:00 first and at least three) */
export function parseChapters(description: string): { timestamp: string; title: string }[] {
  const chapters = [...description.matchAll(/^\s*((?:\d{1,2}:)?\d{1,2}:\d{2})\s+(.+?)\s*$/gm)].map((m) => ({ timestamp: m[1], title: m[2] }))
  return chapters.length >= 3 && /^0?0:00$/.test(chapters[0].timestamp) ? chapters : []
}

const props = { textColor: 'default', textAlignment: 'left', backgroundColor: 'default' }
const URL_RE = /(https?:\/\/[^\s)]+)/g

/** Paragraphs of the description as BlockNote blocks (links become links) */
export function descriptionBlocks(description: string, chapterCount = 0) {
  const text = chapterCount ? description.split('\n').filter((l) => !/^\s*(?:\d{1,2}:)?\d{1,2}:\d{2}\s+/.test(l)).join('\n') : description
  return text
    .split(/\n\s*\n/)
    .map((p) => p.split('\n').map((l) => l.trim()).filter(Boolean).join(' '))
    .filter(Boolean)
    .map((p) => ({
      id: randomUUID(),
      type: 'paragraph',
      props,
      content: p.split(URL_RE).filter(Boolean).map((part) =>
        /^https?:\/\//.test(part)
          ? { type: 'link', href: part, content: [{ type: 'text', text: part, styles: {} }] }
          : { type: 'text', text: part, styles: {} },
      ),
      children: [],
    }))
}

