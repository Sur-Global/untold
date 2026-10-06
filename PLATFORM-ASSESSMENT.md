# UNTOLD.ink Platform — Status & Path Forward

*Written at the user's request, to pause and get a clear, honest picture before continuing.*

## 1. What's solid today

- **Auth + 4 roles** (`user`, `author`, `editor`, `admin`) with real permission differences — creators can make content, editors/admins can manage everyone's, only admins can touch other admins.
- **5 content types** (articles, videos, podcasts, pills, courses) with create/edit/publish/delete, each gated by role.
- **Translations**: content can exist in 6 languages, with automatic translation via DeepL (currently quota-limited — see below) and per-locale editing.
- **Admin console**: content list (paginated, sortable, type-filterable), user list (same), static pages (rich-text, publish/unpublish), platform settings (see #4), an activity log of who-changed-what.
- **Author profiles**: bio (rich text), photo, website, contact email, social links (BlueSky/LinkedIn/Instagram/Medium/custom) — editable by the author or by admins/editors.
- **Homepage curation**: hero (3 slots, any content type) + per-type featured sections, admin-controlled.

## 2. What's fragile — bugs found and fixed this session

1. **Article/video edits silently not saving** (your first report): the editor's autosave was firing the instant a page loaded, before you'd touched anything — sometimes overwriting real content with a partial reconstruction. Fixed, and verified live (created a real article, edited it, reloaded, content persisted).
2. **Every article/video/pill/profile-bio editor crashed on server-render** (`window is not defined`): this was a *severe*, previously-invisible bug — every hard page reload of those editors could show a broken page in production. Fixed by loading the rich-text editor client-side only.
3. **NOT yet fixed**: a block on the "About" static page has a literal black-background/white-text style baked into it (visible in your screenshot), which doesn't show in the page editor. This is a real, separate, scoped bug — likely a leftover style from how the content was originally imported or pasted. I paused mid-investigation on this one when we shifted to this assessment.

## 3. What you've asked for that isn't built yet (from our conversation)

- **Video/Podcast/Pill creation redesign**: subtitle, plain description (drop the rich-text body for these — they're embedded/linked, not hosted), a fixed 9-topic category system (admin/editor can add new categories inline, regular users pick from the list), tags capped at 5, an ownership/rights confirmation checkbox, "submit for featured" on create (not just edit).
- **Podcast + Course creation restricted to admin/editor only** (currently any creator role can start one).
- **Pills**: choose between a social-media-link card (title/description/one image) or an image carousel (up to 10 images) — not built.
- **A "pending feature requests" queue for admins**, with an email notification when someone requests to be featured — not built (no email sending capability exists in the codebase at all yet).
- **Article retrofits**: category, capped tags, ownership checkbox, without touching the 57 existing Ghost-imported articles.

*(A full technical plan for this was drafted and approved before we paused — it's saved and ready to resume without re-litigating the design.)*

## 4. Your new screenshots — what's really there vs. not

**Good news: "Platform Settings" is mostly already built**, more than I'd realized:
- Navigation management (add/reorder/hide nav items) — **built**.
- Static pages list — **built**.
- Homepage hero title/subtitle, featured content count — **built**.
- Featured-content-per-type toggles — **built**.
- Moderation rules (auto-moderation, blocked keywords, approve-first-upload) — **the settings exist and save**, but I found no code anywhere that actually *enforces* them. Right now this panel stores a preference nobody reads. Same story for the **Social Media Integrations** toggles — stored, but nothing on the public site checks them.

**Not built at all** — these are the big, genuinely new pieces:
- **Newsletter integration** (embed code from Substack/Mailchimp/etc.) — zero existing code.
- **Analytics & Metrics dashboard** (views, engagement, shares, session time, bounce rate, top content, traffic sources, audience by country) — there is no view-tracking of any kind in the database today. This alone is a substantial feature (needs an events table, aggregation, and either a hand-built tracker or a third-party analytics integration).
- **Full visual page editor** (drag-and-drop sections, per-section color pickers, live preview, distinct Hero/Text/Image/Features/CTA section types) — what exists today (`StaticPageForm`) is a rich-text editor, not a page builder. This is a different, much bigger kind of tool.
- **Content moderation workflow** (Pending → Approve/Reject/Request Revisions → Scheduled, with a scheduled-publish date) — today's model is just Draft/Published plus an optional "feature request." A real editorial pipeline with reject/revise/schedule states is a meaningfully bigger data model and UI.
- **SEO tool, comments system, version history (v1/v2/...)** — none of these exist.
- **User management extras**: search bar, multiple capability badges (Writer/Creator) beyond the single role, suspension with a reason + auto-expiry date, per-user stats page — partially there (role, suspend/ban, pagination, sorting exist), the rest doesn't.

## 5. The honest scope read

Put together, #3 and #4 describe something considerably bigger than "a publishing platform" — it's closer to a small CMS + analytics product + moderation system + drag-drop page builder. That's genuinely a lot of engineering, the kind of scope a small team would spread across weeks, not something to fit into a few more chat turns on a tightening budget.

## 6. Recommendation

Given you're time- and token-constrained and can't personally verify code: **don't try to build all of this now.** Pick what actually matters for launch, and treat the rest as a backlog. A few honest opinions to help you triage:

- **Highest value, already mostly done or close**: the video/podcast/pill creation redesign (#3) — it's scoped, planned, and builds on things that already work.
- **Real but scoped bug**: the black-background block on the About page — worth a quick, contained fix.
- **Genuinely big, separate projects, not "one more feature"**: analytics dashboard, visual page builder, full moderation/approval workflow, newsletter integration. Each of these could be its own multi-day effort. If any of these matter for launch, they need to be scoped and budgeted on their own — not bundled in as an afterthought.

Tell me which of these you actually need before launch versus which can wait, and I'll build a realistic plan (and token estimate) around just that.
