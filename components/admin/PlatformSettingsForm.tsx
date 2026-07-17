'use client'

import { useState, useTransition } from 'react'
import { Link } from '@/i18n/navigation'
import {
  ChevronDown,
  ChevronUp,
  ListOrdered,
  LayoutTemplate,
  Shield,
  Share2,
  Sparkles,
  FileText,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import { savePlatformSettings } from '@/lib/actions/platform-settings'
import type { NavItemSetting, PlatformSettings } from '@/lib/platform-settings/types'
import { AdminPanel } from '@/components/admin/AdminPanel'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { adminPrimaryButton, adminGhostButton } from '@/components/admin/admin-ui'

export type StaticPageSummary = {
  id: string
  slug: string
  status: string
  title: string
}

function newNavId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? `nav-${crypto.randomUUID()}`
    : `nav-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

const SOCIAL_KEYS = ['twitter', 'facebook', 'instagram', 'linkedin', 'youtube'] as const

export function PlatformSettingsForm({
  initial,
  staticPages,
}: {
  initial: PlatformSettings
  staticPages: StaticPageSummary[]
}) {
  const [settings, setSettings] = useState<PlatformSettings>(() =>
    structuredClone(initial),
  )
  const [keywordDraft, setKeywordDraft] = useState('')
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)

  const updateNav = (index: number, patch: Partial<NavItemSetting>) => {
    setSettings((s) => {
      const navItems = [...s.navItems]
      navItems[index] = { ...navItems[index], ...patch }
      return { ...s, navItems }
    })
  }

  const moveNav = (index: number, dir: -1 | 1) => {
    setSettings((s) => {
      const navItems = [...s.navItems]
      const j = index + dir
      if (j < 0 || j >= navItems.length) return s
      ;[navItems[index], navItems[j]] = [navItems[j], navItems[index]]
      return {
        ...s,
        navItems: navItems.map((item, i) => ({ ...item, sortOrder: i })),
      }
    })
  }

  const addNav = () => {
    setSettings((s) => ({
      ...s,
      navItems: [
        ...s.navItems,
        {
          id: newNavId(),
          label: 'New link',
          path: '/',
          visible: true,
          sortOrder: s.navItems.length,
        },
      ],
    }))
  }

  const removeNav = (index: number) => {
    setSettings((s) => ({
      ...s,
      navItems: s.navItems.filter((_, i) => i !== index).map((item, i) => ({ ...item, sortOrder: i })),
    }))
  }

  const addKeyword = () => {
    const w = keywordDraft.trim().toLowerCase()
    if (!w || settings.moderation.blockedKeywords.includes(w)) return
    setSettings((s) => ({
      ...s,
      moderation: {
        ...s.moderation,
        blockedKeywords: [...s.moderation.blockedKeywords, w].slice(0, 200),
      },
    }))
    setKeywordDraft('')
  }

  const removeKeyword = (word: string) => {
    setSettings((s) => ({
      ...s,
      moderation: {
        ...s.moderation,
        blockedKeywords: s.moderation.blockedKeywords.filter((k) => k !== word),
      },
    }))
  }

  const save = () => {
    setMessage(null)
    startTransition(async () => {
      try {
        await savePlatformSettings(settings)
        setMessage('Saved.')
      } catch (e) {
        setMessage(e instanceof Error ? e.message : 'Save failed')
      }
    })
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Platform settings"
        description="Control main navigation, homepage messaging, moderation preferences, and social toggles. Changes apply across the public site after save."
      >
        <button type="button" onClick={save} disabled={isPending} className={adminPrimaryButton}>
          {isPending ? 'Saving…' : 'Save all changes'}
        </button>
      </AdminPageHeader>
      {message && (
        <p
          className={`text-sm ${message === 'Saved.' ? 'text-secondary' : 'text-destructive'}`}
          role="status"
        >
          {message}
        </p>
      )}

      {/* Navigation management */}
      <AdminPanel>
        <div className="border-b border-primary/10 px-6 py-4">
          <h2 className="flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <ListOrdered className="h-4 w-4 text-primary" aria-hidden />
            Navigation management
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Label and path for each main nav link. Only visible items are shown on the site.
          </p>
        </div>
        <div className="divide-y divide-primary/5">
          {settings.navItems.map((item, index) => (
            <div
              key={item.id}
              className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:flex-wrap sm:items-center"
            >
              <span className="font-mono text-xs text-muted-foreground w-8">{index + 1}</span>
              <input
                value={item.label}
                onChange={(e) => updateNav(index, { label: e.target.value })}
                placeholder="Label"
                className="min-w-[8rem] flex-1 rounded-[10px] border border-primary/20 bg-white px-3 py-2 text-sm"
              />
              <input
                value={item.path}
                onChange={(e) => updateNav(index, { path: e.target.value })}
                placeholder="/path"
                className="min-w-[8rem] flex-1 rounded-[10px] border border-primary/20 bg-white px-3 py-2 font-mono text-sm"
              />
              <label className="flex items-center gap-2 text-sm whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={item.visible}
                  onChange={(e) => updateNav(index, { visible: e.target.checked })}
                  className="size-4 rounded border-primary/30"
                />
                Visible
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label="Move up"
                  className="rounded p-1.5 text-muted-foreground hover:bg-muted"
                  onClick={() => moveNav(index, -1)}
                  disabled={index === 0}
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="Move down"
                  className="rounded p-1.5 text-muted-foreground hover:bg-muted"
                  onClick={() => moveNav(index, 1)}
                  disabled={index === settings.navItems.length - 1}
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="Remove"
                  className="rounded p-1.5 text-destructive hover:bg-destructive/10"
                  onClick={() => removeNav(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="px-6 py-4">
          <button type="button" onClick={addNav} className={adminGhostButton}>
            <Plus className="mr-2 inline h-4 w-4" aria-hidden />
            Add menu item
          </button>
        </div>
      </AdminPanel>

      {/* Static pages */}
      <AdminPanel>
        <div className="flex flex-col gap-2 border-b border-primary/10 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <FileText className="h-4 w-4 text-primary" aria-hidden />
            Static pages
          </h2>
          <Link href="/admin/pages/new" className={`${adminPrimaryButton} w-fit text-center`}>
            + New page
          </Link>
        </div>
        <ul className="divide-y divide-primary/5">
          {staticPages.map((p) => (
            <li
              key={p.id}
              className="flex flex-col gap-2 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-heading text-sm text-foreground">
                  {p.title}
                </p>
                <p className="font-mono text-xs text-muted-foreground">/{p.slug}</p>
                <p className="mt-1 text-xs text-secondary">{p.status}</p>
              </div>
              <Link
                href={`/admin/pages/${p.id}/edit`}
                className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                <Pencil className="h-3.5 w-3.5" aria-hidden />
                Edit
              </Link>
            </li>
          ))}
          {staticPages.length === 0 && (
            <li className="px-6 py-8 text-center text-sm text-muted-foreground">
              No static pages yet.{' '}
              <Link href="/admin/pages/new" className="text-primary underline">
                Create one
              </Link>
            </li>
          )}
        </ul>
      </AdminPanel>

      {/* Homepage layout */}
      <AdminPanel>
        <div className="border-b border-primary/10 px-6 py-4">
          <h2 className="flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <LayoutTemplate className="h-4 w-4 text-primary" aria-hidden />
            Homepage layout
          </h2>
        </div>
        <div className="space-y-6 px-6 py-6">
          <div>
            <p className="mb-3 text-sm font-semibold text-foreground">Hero section</p>
            <div className="space-y-3">
              <input
                value={settings.homeHero.title}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    homeHero: { ...s.homeHero, title: e.target.value },
                  }))
                }
                placeholder="Override headline (leave empty for translation default)"
                className="w-full rounded-[10px] border border-primary/20 bg-white px-3 py-2 text-sm"
              />
              <textarea
                value={settings.homeHero.subtitle}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    homeHero: { ...s.homeHero, subtitle: e.target.value },
                  }))
                }
                placeholder="Override subtext (leave empty for translation default)"
                rows={3}
                className="w-full rounded-[10px] border border-primary/20 bg-white px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-foreground">
                Featured content count
              </label>
              <input
                type="number"
                min={1}
                max={24}
                value={settings.featuredContent.count}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    featuredContent: {
                      ...s.featuredContent,
                      count: Math.min(24, Math.max(1, Number(e.target.value) || 1)),
                    },
                  }))
                }
                className="w-full rounded-[10px] border border-primary/20 bg-white px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-foreground">Layout</label>
              <select
                value={settings.featuredContent.layout}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    featuredContent: {
                      ...s.featuredContent,
                      layout: e.target.value as PlatformSettings['featuredContent']['layout'],
                    },
                  }))
                }
                className="w-full rounded-[10px] border border-primary/20 bg-white px-3 py-2 text-sm"
              >
                <option value="grid">Grid</option>
                <option value="list">List</option>
                <option value="carousel">Carousel</option>
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-foreground">Search bar</label>
            <select
              value={settings.searchBar.position}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  searchBar: {
                    position: e.target.value as PlatformSettings['searchBar']['position'],
                  },
                }))
              }
              className="w-full max-w-md rounded-[10px] border border-primary/20 bg-white px-3 py-2 text-sm"
            >
              <option value="header">Header</option>
              <option value="hidden">Hidden</option>
            </select>
          </div>
        </div>
      </AdminPanel>

      {/* Moderation */}
      <AdminPanel>
        <div className="border-b border-primary/10 px-6 py-4">
          <h2 className="flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Shield className="h-4 w-4 text-primary" aria-hidden />
            Moderation rules
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Stored for future automation; enforcement is not wired yet.
          </p>
        </div>
        <div className="space-y-6 px-6 py-6">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={settings.moderation.autoModeration}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  moderation: { ...s.moderation, autoModeration: e.target.checked },
                }))
              }
              className="mt-1 size-4 rounded border-primary/30"
            />
            <span>
              <span className="font-medium text-foreground">Auto-moderation</span>
              <span className="block text-sm text-muted-foreground">
                Automatically flag or hide content that matches blocked keywords (when implemented).
              </span>
            </span>
          </label>
          <div>
            <p className="mb-2 text-sm font-semibold text-foreground">Blocked keywords</p>
            <div className="mb-2 flex flex-wrap gap-2">
              {settings.moderation.blockedKeywords.map((word) => (
                <span
                  key={word}
                  className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive"
                >
                  {word}
                  <button
                    type="button"
                    className="rounded hover:bg-destructive/20"
                    onClick={() => removeKeyword(word)}
                    aria-label={`Remove ${word}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={keywordDraft}
                onChange={(e) => setKeywordDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                placeholder="Add keyword…"
                className="min-w-0 flex-1 rounded-[10px] border border-primary/20 bg-white px-3 py-2 text-sm"
              />
              <button type="button" onClick={addKeyword} className={adminPrimaryButton}>
                +
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={settings.moderation.approveFirstUpload}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    moderation: { ...s.moderation, approveFirstUpload: e.target.checked },
                  }))
                }
                className="size-4 rounded border-primary/30"
              />
              First-time user&apos;s first upload requires approval
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={settings.moderation.approveMultipleLinks}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    moderation: { ...s.moderation, approveMultipleLinks: e.target.checked },
                  }))
                }
                className="size-4 rounded border-primary/30"
              />
              Content with multiple links requires approval
            </label>
          </div>
        </div>
      </AdminPanel>

      {/* Social */}
      <AdminPanel>
        <div className="border-b border-primary/10 px-6 py-4">
          <h2 className="flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Share2 className="h-4 w-4 text-primary" aria-hidden />
            Social integrations
          </h2>
        </div>
        <ul className="divide-y divide-primary/5">
          {SOCIAL_KEYS.map((key) => (
            <li
              key={key}
              className="flex items-center justify-between px-6 py-4 capitalize"
            >
              <span className="text-sm font-medium text-foreground">{key}</span>
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                Enabled
                <input
                  type="checkbox"
                  checked={settings.social[key].enabled}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      social: {
                        ...s.social,
                        [key]: { enabled: e.target.checked },
                      },
                    }))
                  }
                  className="size-4 rounded border-primary/30"
                />
              </label>
            </li>
          ))}
        </ul>
      </AdminPanel>

      {/* Featured sections */}
      <AdminPanel>
        <div className="border-b border-primary/10 px-6 py-4">
          <h2 className="flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Sparkles className="h-4 w-4 text-primary" aria-hidden />
            Featured content on homepage
          </h2>
        </div>
        <ul className="divide-y divide-primary/5 px-6 py-2">
          {(
            [
              ['articles', 'Allow featured articles'],
              ['videos', 'Allow videos section'],
              ['podcasts', 'Allow podcasts section'],
              ['pills', 'Allow knowledge pills section'],
              ['courses', 'Allow courses section'],
            ] as const
          ).map(([key, label]) => (
            <li key={key} className="flex items-center justify-between py-3">
              <span className="text-sm text-foreground">{label}</span>
              <input
                type="checkbox"
                checked={settings.featuredSections[key]}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    featuredSections: {
                      ...s.featuredSections,
                      [key]: e.target.checked,
                    },
                  }))
                }
                className="size-4 rounded border-primary/30"
              />
            </li>
          ))}
        </ul>
      </AdminPanel>
    </div>
  )
}
