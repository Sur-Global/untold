/**
 * First-level `[locale]` route segments. Static page slugs must not shadow these.
 */
export const RESERVED_STATIC_PAGE_SLUGS = new Set([
  "admin",
  "articles",
  "auth",
  "author",
  "create",
  "courses",
  "dashboard",
  "pills",
  "podcasts",
  "search",
  "suspended",
  "tag",
  "videos",
]);

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isReservedStaticPageSlug(slug: string): boolean {
  return RESERVED_STATIC_PAGE_SLUGS.has(slug.toLowerCase());
}

export function isValidStaticPageSlug(slug: string): boolean {
  if (slug.length < 1 || slug.length > 120) return false;
  if (!SLUG_PATTERN.test(slug)) return false;
  return !isReservedStaticPageSlug(slug);
}

export function normalizeStaticPageSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
