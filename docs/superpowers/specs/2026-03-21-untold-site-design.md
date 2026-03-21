# UNTOLD.ink — Site Design Spec
**Date:** 2026-03-21
**Status:** Draft (pending final review)
**Organization:** Sur Global

---

## Overview

UNTOLD.ink is a multilingual editorial platform — a Medium-style publishing hub for Sur Global's magazine. Authors create articles, videos, podcasts, knowledge pills, and courses. Readers browse, read, react (like/bookmark), and follow authors. The platform is fully multilingual with auto-translation and an invite-based author promotion model. Hosted on Vercel with Supabase as the database and auth layer.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 App Router |
| Styling | Tailwind CSS + shadcn/ui |
| Editor | Tiptap (rich text, articles only) |
| Database | Supabase Postgres |
| Auth | Supabase Auth |
| Storage | Supabase Storage (images only) |
| Translation | DeepL API |
| i18n routing | next-intl |
| Payments | Stripe (courses, deferred) |
| Hosting | Vercel |

**Media (video/podcast)** is embedded via third-party URLs only. No self-hosted media.

---

## Design System

Sourced from the UNTOLD.ink Figma Make prototype and SG-2026 Figma file.

- **Background:** `#F5F1E8` (warm cream) with noise texture overlay
- **Text:** `#2C2420` (near-black brown)
- **Primary accent:** `#A0522D` (sienna) / `#8B4513` (rust)
- **Secondary accent:** `#6B8E23` (olive green)
- **Fonts:** Audiowide (headings, uppercase), JetBrains Mono (buttons/labels), Inter (body)
- **Aesthetic:** Vintage editorial — steampunk gradient accents (rust, brass, bronze, copper), paper noise, high contrast

---

## Languages

| Locale | Status |
|---|---|
| `en` | Default — primary language, prefix-free URLs (e.g. `/articles`) |
| `es` | Auto-translated via DeepL, prefix `/es/` |
| `pt` | Auto-translated via DeepL, prefix `/pt/` |
| `fr` | Auto-translated via DeepL, prefix `/fr/` |
| `de` | Auto-translated via DeepL, prefix `/de/` |
| `da` | Auto-translated via DeepL, prefix `/da/` |
| `qu` (Quechua) | Manual only, prefix `/qu/` |

English URLs have no locale prefix. All other locales are prefixed. Configured via next-intl with `localePrefix: 'as-needed'`. SEO `hreflang` tags generated per page.

Auto-translations stored in `content_translations` with `is_auto_translated = true`. Admin can override any translation manually. Falls back to `en` if translation is pending.

---

## Content Types

All content shares a single `content` table with a `type` discriminator, plus per-type extension tables for fields that don't generalise.

### Article
- Title, excerpt, body (Tiptap JSON) — stored in `content_translations`
- Cover image (Supabase Storage URL)
- Categories, tags, read time (auto-calculated from body word count)
- Draft / Published status, featured flag

### Video
- Title, description — stored in `content_translations`
- Embed URL (YouTube — videos + shorts, Vimeo), thumbnail URL (external), duration (text, e.g. "15:30")
- Categories, tags
- Stored in `video_meta` extension table

### Podcast
- Title, description — stored in `content_translations`
- Embed URL — supported platforms: Spotify, Apple Podcasts, Amazon Music, Overcast, Podbean
- Cover image URL (external), duration (text), episode number (text, e.g. "Episode 12")
- Categories, tags
- Stored in `podcast_meta` extension table

### Knowledge Pill
- Title, body (short text) — stored in `content_translations`
- Accent color (hex string), optional image URL (external)
- Categories, tags
- Stored in `pill_meta` extension table

### Course (admin only)
- Title, description — stored in `content_translations`
- Cover image (Supabase Storage URL), duration (text), price (numeric), currency (text), Stripe product ID
- Students count (int), rating (numeric 0–5)
- Categories, tags
- Stored in `course_meta` extension table
- Creation UI is a form (not Tiptap). Fields: title, description, cover image, price, currency, duration.

---

## Article Editor (Tiptap)

### Formatting
- Headings (H1–H4), bold, italic, underline, strikethrough
- Ordered + unordered lists
- Blockquote (regular)
- Pull quote — styled callout block, visually distinct from blockquote
- Tables — insert, add/remove rows and columns
- Code block (inline + fenced)
- Horizontal rule

### Media & Embeds
- Image upload → Supabase Storage
- Social embeds (author pastes any URL; platform auto-detected via oEmbed):
  - **Video:** YouTube (videos + Shorts), Vimeo
  - **Audio:** Spotify, Apple Podcasts, Amazon Music, Overcast, Podbean
  - **Social:** Instagram (posts, carousels, Reels), Twitter/X, Threads, TikTok, LinkedIn (posts, carousels, videos, newsletter articles), Facebook, Bluesky, Reddit
- Single Tiptap `Embed` node handles all platforms; platform detected from URL pattern

### Footnotes
- Inline superscript reference marker, auto-numbered
- Footnote list block auto-rendered at article bottom
- Each footnote: URL + optional label/explainer text
- Bi-directional jump links (marker ↓ list, list ↑ marker)
- Stored as part of Tiptap JSON body

### Editor UX
- Autosave every 30 seconds writes to `content` (draft status) + `content_translations` for the **source locale only**. Does not overwrite non-source-locale translations.
- Save draft / Publish buttons
- Cover image upload with crop
- Categories + tags picker
- Excerpt field (manual or auto-truncated from body)
- Word count + estimated read time display

---

## Data Model

### `profiles`
```
id              uuid PK (→ auth.users)
slug            text unique
display_name    text
role            enum: admin | author | user
bio             text
location        text
website         text
avatar_url      text  -- Supabase Storage URL
followers_count int   -- maintained by Postgres trigger on follows insert/delete
following_count int   -- maintained by Postgres trigger on follows insert/delete
created_at      timestamptz
```

### `content`
```
id              uuid PK
type            enum: article | video | podcast | pill | course
author_id       uuid (→ profiles)
slug            text unique  -- auto-generated from title (kebab-case), unique across all types
source_locale   text default 'en'  -- locale the author wrote in; translation pipeline translates FROM this
status          enum: draft | published
is_featured     bool default false  -- writable by admin only (enforced via RLS)
cover_image_url text  -- Supabase Storage URL for article/course; null for video/podcast/pill
likes_count     int default 0  -- denormalized, maintained by Postgres trigger on likes insert/delete
published_at    timestamptz
created_at      timestamptz
updated_at      timestamptz
```

### `content_translations`
```
id                  uuid PK
content_id          uuid (→ content)
locale              text  -- en | es | pt | fr | de | da | qu
title               text
-- Field usage by type:
-- article:  excerpt (text) + body (jsonb Tiptap JSON)
-- video:    description (text), body null
-- podcast:  description (text), body null
-- pill:     body (jsonb Tiptap JSON for short rich text), excerpt null
-- course:   description (text), body null
excerpt             text   -- article excerpt or null
description         text   -- video/podcast/course description or null
body                jsonb  -- article/pill rich text or null
is_auto_translated  bool default false
created_at          timestamptz
UNIQUE (content_id, locale)
```

### Extension tables

#### `video_meta`
```
content_id     uuid PK (→ content)
embed_url      text  -- YouTube (videos + Shorts) or Vimeo URL
thumbnail_url  text  -- external image URL
duration       text  -- e.g. "15:30"
```

#### `podcast_meta`
```
content_id      uuid PK (→ content)
embed_url       text  -- Spotify / Apple Podcasts URL
cover_image_url text  -- external image URL
duration        text  -- e.g. "45 min"
episode_number  text  -- e.g. "Episode 12"
```

#### `pill_meta`
```
content_id   uuid PK (→ content)
accent_color text  -- hex string, e.g. "#6B8E23"
image_url    text  -- external image URL, optional
```

#### `course_meta`
```
content_id        uuid PK (→ content)
price             numeric
currency          text  -- e.g. "USD", "EUR"
duration          text  -- e.g. "6 weeks" (display text, not interval)
stripe_product_id text
students_count    int default 0
rating            numeric  -- 0.0–5.0
```

### `categories`
```
id     uuid PK
slug   text unique
names  jsonb  -- { "en": "Technology", "es": "Tecnología", "pt": "...", ... }
```

### `tags`
```
id     uuid PK
slug   text unique
names  jsonb  -- { "en": "AI", "es": "IA", ... }
```

### `content_categories`
```
content_id   uuid (→ content)
category_id  uuid (→ categories)
PRIMARY KEY (content_id, category_id)
```

### `content_tags`
```
content_id  uuid (→ content)
tag_id      uuid (→ tags)
PRIMARY KEY (content_id, tag_id)
```

### `likes`
```
user_id     uuid (→ profiles)
content_id  uuid (→ content)
created_at  timestamptz
PRIMARY KEY (user_id, content_id)
```

### `bookmarks`
```
user_id     uuid (→ profiles)
content_id  uuid (→ content)
created_at  timestamptz
PRIMARY KEY (user_id, content_id)
```

### `follows`
```
follower_id  uuid (→ profiles)
following_id uuid (→ profiles)
created_at   timestamptz
PRIMARY KEY (follower_id, following_id)
```

### `creator_applications`
```
id           uuid PK
user_id      uuid (→ profiles)
message      text  -- applicant's pitch/message
status       enum: pending | approved | rejected
admin_notes  text  -- internal notes from reviewer
created_at   timestamptz
reviewed_at  timestamptz
reviewed_by  uuid (→ profiles)
```

---

## Row Level Security

| Table | Rule |
|---|---|
| `content` | Anyone reads `status = published`; author reads own drafts; author inserts/updates own rows except `is_featured`; admin full access |
| `content.is_featured` | Only admin can set `is_featured = true` (column-level policy) |
| `content_translations` | Anyone reads; Edge Function writes via service role; admin updates any row |
| `bookmarks` | User reads/writes only their own rows |
| `likes` | Authenticated users insert/delete own rows; `content.likes_count` is the public-facing count |
| `profiles` | Anyone reads; authenticated user updates own row except `role` column |
| `profiles.role` | Only admin can update the `role` column |
| `follows` | Anyone reads; authenticated user inserts/deletes own follower rows |
| `categories` + `tags` | Anyone reads; only admin inserts/updates/deletes |
| `content_categories` + `content_tags` | Author/admin writes for own content |
| `course_meta` | Anyone reads; only admin writes |
| `video_meta` | Author reads/writes own content rows; admin full access |
| `podcast_meta` | Author reads/writes own content rows; admin full access |
| `pill_meta` | Author reads/writes own content rows; admin full access |
| `creator_applications` | User inserts own application; admin reads/updates all |

### Homepage feed view
```sql
CREATE VIEW homepage_feed AS
SELECT c.* FROM content c
JOIN profiles p ON p.id = c.author_id
WHERE c.status = 'published'
  AND p.role IN ('admin', 'author')
ORDER BY c.is_featured DESC, c.published_at DESC;
```

---

## Routing

English (`en`) is the default locale — URLs have no locale prefix. All other locales are prefixed (e.g. `/es/articles`). Configured via next-intl `localePrefix: 'as-needed'`.

### Public (SSR)
```
/                          → homepage (curated feed)
/articles                  → all articles
/articles/[slug]           → article detail
/videos/[slug]             → video detail
/podcasts/[slug]           → podcast detail
/pills/[slug]              → pill detail
/courses/[slug]            → course detail
/tag/[slug]                → tag page
/author/[slug]             → author / admin profile
/user/[slug]               → user profile
/search?q=...              → search results
/about
/contact
/newsletter
/become-creator
```

### Auth-gated
```
/dashboard                 → user home
/dashboard/bookmarks
/dashboard/settings
/create                    → pick content type
/create/article
/create/video
/create/podcast
/create/pill
/edit/[id]                 → edit own content
```

### Admin-only
```
/admin                     → dashboard overview
/admin/content             → CMS content list
/admin/users               → user management + creator applications
/admin/moderation          → content moderation queue
/admin/analytics           → platform analytics
/create/course             → admin only
```

---

## User System

### Roles
- **Admin** — full platform control, creates courses, manages users, sees all admin panels. Content on homepage.
- **Author** — invited curator. Content appears on homepage and has search priority. Author badge on profile. Cannot create courses.
- **User** — self-registered. Content not on homepage. Lower search priority. Can like/bookmark.

### Sign-up flow
1. Email + password via Supabase Auth
2. Email confirmation required
3. `profiles` row auto-created (via Postgres trigger on `auth.users` insert) with `role = user`
4. Redirect to complete profile (display name + unique slug)

### Role promotion
1. User submits application via `/become-creator` — saved to `creator_applications`
2. Admin reviews pending applications in `/admin/users`
3. Admin approves → `profiles.role` updated to `author`; RLS enforces only admin can write `role`

### `is_featured` flag
Only admin can set `is_featured = true` on any content. Authors cannot self-feature their own content. Enforced via column-level RLS policy.

### Slug generation
Slugs are auto-generated from the content title (kebab-case, max 80 chars). If a collision occurs, a short random suffix is appended. Slugs are unique across all content types. Users can edit the slug before first publish.

### Search
- Postgres full-text search using `tsvector` on `content_translations.title`, `content_translations.excerpt`/`description`, and `tags.names`
- A GIN index on the `tsvector` column for performance
- Results ordered by role priority: admin → author → user, then by `ts_rank` within each group
- Filter by type via query param `?type=article`
- Paginated, 20 results per page

---

## Translation Pipeline

1. Author publishes content — `content.source_locale` records which language they wrote in (default `en`)
2. Supabase database trigger fires `translate` Edge Function (runs async, does not block publish)
3. Edge Function reads the `source_locale` translation from `content_translations`
4. Calls DeepL API to translate `title`, `excerpt`/`description`, and `body` into each configured locale (ES, PT, FR, DE, DA)
5. Upserts results into `content_translations` with `is_auto_translated = true`
6. Admin can manually edit any translation row; manually edited rows are not overwritten by future auto-translate runs
7. Quechua (`qu`): no auto-translate — admin submits manually via admin content panel
8. Frontend falls back to `en` translation if the requested locale row is absent

**DeepL cost estimate** (5 auto-translated locales per article, ~6K chars/locale = ~30K chars/article):
- Free tier (500K chars/mo): ~16 articles/month
- Starter ($5.49/mo, 1M chars): ~33 articles/month
- Advanced ($25/mo, 3M chars): ~100 articles/month

---

## Admin Dashboard

### Content Management (`/admin/content`)
- List all content across all types with filters (type, status, author, date)
- Feature / unfeature content
- Publish / unpublish / delete
- Preview any content

### User Management (`/admin/users`)
- List all users with role badges
- Promote user → author, demote author → user, suspend accounts
- Review and action `creator_applications` (pending / approve / reject + admin notes)
- View any user's published content

### Analytics (`/admin/analytics`)
- Total users, authors, published content
- Most liked and bookmarked content
- New signups over time
- Content breakdown by type and category

### Moderation (`/admin/moderation`)
- Queue of flagged content (flagging mechanism: deferred to v2)
- Approve / reject / delete actions

---

## Deferred Decisions

- **Quechua auto-translation** — DeepL doesn't support Quechua. Manual-only for v1. Google Translate API is an option for v2.
- **Image CDN** — Supabase Storage free tier for MVP. Upgrade to Supabase pro ($25/mo) or Cloudflare Images (~$5/mo) when needed.
- **Comments** — not in scope for v1.
- **Following feed** — personalised feed based on followed authors, deferred to v2.
- **Stripe / course payments** — schema in place (`course_meta.stripe_product_id`), implementation deferred until first course is ready.
- **Content flagging** — moderation queue exists in admin; flagging UI for readers is deferred to v2.
- **Email gate** — `email_gates` concept exists in the Figma prototype but is not fully specified. Deferred: requires a full feature spec (which content types, what triggers the gate, what happens after email submission).
- **Collaborative editing** — Tiptap Pro supports real-time collaboration, deferred to v2.
