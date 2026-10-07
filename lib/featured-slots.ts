// Placement slots an admin/editor can fill from admin/content. Three independent levels:
//   ★ page  — featured at the top of the content type's own listing page (/podcasts…)
//   ⌂ home  — shown in the content type's section on the homepage
//   ↑ hero  — the big banner at the top of the homepage (any type)
export const CONTENT_TYPES = ['article', 'video', 'podcast', 'pill', 'course'] as const
export type PlacementType = (typeof CONTENT_TYPES)[number]

export const PAGE_FEATURED_SLOTS = 3
export const HERO_SLOTS = 3
export const HOME_SLOTS: Record<PlacementType, number> = {
  article: 5,
  video: 3,
  podcast: 4,
  pill: 6,
  course: 2,
}

export const TYPE_PLURAL: Record<PlacementType, string> = {
  article: 'articles',
  video: 'videos',
  podcast: 'podcasts',
  pill: 'pills',
  course: 'courses',
}
