import type { PlatformSettings } from "./types";

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  navItems: [
    {
      id: "n-articles",
      label: "Articles",
      path: "/articles",
      visible: true,
      sortOrder: 0,
    },
    {
      id: "n-videos",
      label: "Videos",
      path: "/videos",
      visible: true,
      sortOrder: 1,
    },
    {
      id: "n-podcasts",
      label: "Podcasts",
      path: "/podcasts",
      visible: true,
      sortOrder: 2,
    },
    {
      id: "n-pills",
      label: "Knowledge Pills",
      path: "/pills",
      visible: true,
      sortOrder: 3,
    },
    {
      id: "n-courses",
      label: "Courses",
      path: "/courses",
      visible: true,
      sortOrder: 4,
    },
  ],
  homeHero: { title: "", subtitle: "" },
  featuredContent: { count: 5, layout: "grid" },
  searchBar: { position: "header" },
  moderation: {
    autoModeration: false,
    blockedKeywords: [],
    approveFirstUpload: false,
    approveMultipleLinks: false,
  },
  social: {
    twitter: { enabled: false },
    facebook: { enabled: false },
    instagram: { enabled: false },
    linkedin: { enabled: false },
    youtube: { enabled: false },
  },
  featuredSections: {
    articles: true,
    videos: true,
    podcasts: true,
    pills: true,
    courses: true,
  },
};

function clampInt(
  n: unknown,
  min: number,
  max: number,
  fallback: number,
): number {
  const x = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(x)) return fallback;
  return Math.min(max, Math.max(min, Math.round(x)));
}

function asBool(v: unknown, fallback: boolean): boolean {
  return typeof v === "boolean" ? v : fallback;
}

function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function mergeNavItems(raw: unknown): PlatformSettings["navItems"] {
  if (!Array.isArray(raw) || raw.length === 0)
    return DEFAULT_PLATFORM_SETTINGS.navItems;
  const out: PlatformSettings["navItems"] = [];
  for (let i = 0; i < raw.length; i++) {
    const row = raw[i] as Record<string, unknown>;
    const id = typeof row.id === "string" && row.id ? row.id : `nav-${i}`;
    const label = asString(row.label).trim();
    const path = asString(row.path).trim();
    if (!label || !path) continue;
    out.push({
      id,
      label,
      path,
      visible: asBool(row.visible, true),
      sortOrder: clampInt(row.sortOrder, 0, 999, i),
    });
  }
  return out.length > 0 ? out : DEFAULT_PLATFORM_SETTINGS.navItems;
}

/** Safe path for nav: internal only, single leading slash. */
export function normalizeNavPath(path: string): string {
  const p = path.trim();
  if (!p.startsWith("/") || p.startsWith("//")) return "/";
  if (p.includes("://") || p.toLowerCase().includes("javascript:")) return "/";
  return p.split("?")[0].split("#")[0] || "/";
}

export function mergePlatformSettings(row: unknown): PlatformSettings {
  const base = DEFAULT_PLATFORM_SETTINGS;
  if (!row || typeof row !== "object") return structuredClone(base);
  const s = row as Record<string, unknown>;

  const homeHero =
    s.homeHero && typeof s.homeHero === "object"
      ? (s.homeHero as Record<string, unknown>)
      : {};
  const featuredContent =
    s.featuredContent && typeof s.featuredContent === "object"
      ? (s.featuredContent as Record<string, unknown>)
      : {};
  const searchBar =
    s.searchBar && typeof s.searchBar === "object"
      ? (s.searchBar as Record<string, unknown>)
      : {};
  const moderation =
    s.moderation && typeof s.moderation === "object"
      ? (s.moderation as Record<string, unknown>)
      : {};
  const social =
    s.social && typeof s.social === "object"
      ? (s.social as Record<string, unknown>)
      : {};
  const featuredSections =
    s.featuredSections && typeof s.featuredSections === "object"
      ? (s.featuredSections as Record<string, unknown>)
      : {};

  const layoutRaw = asString(featuredContent.layout).toLowerCase();
  const layout =
    layoutRaw === "list" || layoutRaw === "carousel" ? layoutRaw : "grid";

  const posRaw = asString(searchBar.position).toLowerCase();
  const position = posRaw === "hidden" ? "hidden" : "header";

  const keywordsRaw = moderation.blockedKeywords;
  const blockedKeywords = Array.isArray(keywordsRaw)
    ? keywordsRaw.map((k) => String(k).trim()).filter(Boolean)
    : [];

  const soc = (key: string) => {
    const o =
      social[key] && typeof social[key] === "object"
        ? (social[key] as Record<string, unknown>)
        : {};
    return { enabled: asBool(o.enabled, false) };
  };

  return {
    navItems: mergeNavItems(s.navItems),
    homeHero: {
      title: asString(homeHero.title).slice(0, 500),
      subtitle: asString(homeHero.subtitle).slice(0, 1000),
    },
    featuredContent: {
      count: clampInt(featuredContent.count, 1, 24, base.featuredContent.count),
      layout,
    },
    searchBar: { position },
    moderation: {
      autoModeration: asBool(moderation.autoModeration, false),
      blockedKeywords: blockedKeywords.slice(0, 200),
      approveFirstUpload: asBool(moderation.approveFirstUpload, false),
      approveMultipleLinks: asBool(moderation.approveMultipleLinks, false),
    },
    social: {
      twitter: soc("twitter"),
      facebook: soc("facebook"),
      instagram: soc("instagram"),
      linkedin: soc("linkedin"),
      youtube: soc("youtube"),
    },
    featuredSections: {
      articles: asBool(featuredSections.articles, true),
      videos: asBool(featuredSections.videos, true),
      podcasts: asBool(featuredSections.podcasts, true),
      pills: asBool(featuredSections.pills, true),
      courses: asBool(featuredSections.courses, true),
    },
  };
}
