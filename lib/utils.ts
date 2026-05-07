import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ContentType } from "@/lib/supabase/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

export function readTime(text: string): number {
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}
const TYPE_SEGMENT: Record<ContentType, string> = {
  article: "articles",
  video: "videos",
  podcast: "podcasts",
  pill: "pills",
  course: "courses",
};

export function getEditPath(type: ContentType, id: string): string {
  return `/dashboard/${TYPE_SEGMENT[type]}/${id}/edit`;
}

/** Public URL path segment for a content item (locale prefix added by next-intl `Link`). */
export function getPublicContentPath(type: ContentType, slug: string): string {
  return `/${TYPE_SEGMENT[type]}/${slug}`;
}
