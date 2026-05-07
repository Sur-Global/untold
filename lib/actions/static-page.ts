"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/require-admin";
import { routing } from "@/i18n/routing";
import {
  isValidStaticPageSlug,
  normalizeStaticPageSlug,
} from "@/lib/static-pages/reserved-slugs";

type TranslationPayload = {
  title: string;
  body: unknown[] | Record<string, unknown> | null;
};

function parseTranslationsJson(
  raw: string | null,
): Record<string, TranslationPayload> | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, TranslationPayload>;
    return typeof parsed === "object" && parsed !== null ? parsed : null;
  } catch {
    return null;
  }
}

function revalidateStaticPagePaths(slug: string) {
  for (const loc of routing.locales) {
    revalidatePath(`/${loc}/${slug}`);
  }
  revalidatePath(`/${slug}`);
}

export async function createStaticPage(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  const rawSlug = (formData.get("slug") as string) ?? "";
  const slug = normalizeStaticPageSlug(rawSlug);
  if (!isValidStaticPageSlug(slug)) {
    throw new Error("Invalid or reserved URL slug.");
  }

  const status = formData.get("status") === "published" ? "published" : "draft";
  const showInFooter = formData.has("show_in_footer");
  const footerSortOrder = Number(formData.get("footer_sort_order") ?? 0) || 0;

  const translations = parseTranslationsJson(
    formData.get("translations_json") as string | null,
  );
  if (!translations) throw new Error("Missing translations.");

  const rows: { locale: string; title: string; body: unknown }[] = [];
  for (const loc of routing.locales) {
    const entry = translations[loc];
    const title = entry?.title?.trim() ?? "";
    if (!title) continue;
    rows.push({
      locale: loc,
      title,
      body: entry.body ?? null,
    });
  }

  if (rows.length === 0) {
    throw new Error("Add at least one locale with a title (e.g. English).");
  }

  const publishedAt = status === "published" ? new Date().toISOString() : null;

  const { data: page, error } = await (supabase as any)
    .from("static_pages")
    .insert({
      slug,
      status,
      show_in_footer: showInFooter,
      footer_sort_order: footerSortOrder,
      published_at: publishedAt,
    })
    .select("id")
    .single();

  if (error || !page)
    throw new Error(error?.message ?? "Failed to create page");

  const ins = rows.map((r) => ({
    static_page_id: page.id,
    locale: r.locale,
    title: r.title,
    body: r.body,
  }));

  const { error: trErr } = await (supabase as any)
    .from("static_page_translations")
    .insert(ins);
  if (trErr) {
    await (supabase as any).from("static_pages").delete().eq("id", page.id);
    throw new Error(trErr.message ?? "Failed to save translations");
  }

  if (status === "published") revalidateStaticPagePaths(slug);
  redirect("/admin/pages");
}

export async function updateStaticPage(pageId: string, formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  const { data: existing } = await (supabase as any)
    .from("static_pages")
    .select("slug, published_at")
    .eq("id", pageId)
    .single();

  if (!existing) throw new Error("Page not found");

  const rawSlug = (formData.get("slug") as string) ?? "";
  const slug = normalizeStaticPageSlug(rawSlug);
  if (!isValidStaticPageSlug(slug)) {
    throw new Error("Invalid or reserved URL slug.");
  }

  const status = formData.get("status") === "published" ? "published" : "draft";
  const showInFooter = formData.has("show_in_footer");
  const footerSortOrder = Number(formData.get("footer_sort_order") ?? 0) || 0;
  const publishedAt =
    status === "published"
      ? ((existing.published_at as string | null) ?? new Date().toISOString())
      : null;

  const translations = parseTranslationsJson(
    formData.get("translations_json") as string | null,
  );
  if (!translations) throw new Error("Missing translations.");

  const { error: upErr } = await (supabase as any)
    .from("static_pages")
    .update({
      slug,
      status,
      show_in_footer: showInFooter,
      footer_sort_order: footerSortOrder,
      published_at: publishedAt,
    })
    .eq("id", pageId);

  if (upErr) throw new Error(upErr.message ?? "Failed to update page");

  const rows: { locale: string; title: string; body: unknown }[] = [];
  for (const loc of routing.locales) {
    const entry = translations[loc];
    const title = entry?.title?.trim() ?? "";
    if (!title) continue;
    rows.push({
      locale: loc,
      title,
      body: entry.body ?? null,
    });
  }

  if (rows.length === 0) {
    throw new Error("Add at least one locale with a title (e.g. English).");
  }

  await (supabase as any)
    .from("static_page_translations")
    .delete()
    .eq("static_page_id", pageId);

  const ins = rows.map((r) => ({
    static_page_id: pageId,
    locale: r.locale,
    title: r.title,
    body: r.body,
  }));

  const { error: trErr } = await (supabase as any)
    .from("static_page_translations")
    .insert(ins);
  if (trErr) throw new Error(trErr.message ?? "Failed to save translations");

  revalidateStaticPagePaths(existing.slug as string);
  revalidateStaticPagePaths(slug);
  redirect("/admin/pages");
}

export async function deleteStaticPage(formData: FormData) {
  const pageId = formData.get("page_id") as string;
  if (!pageId?.trim()) throw new Error("Missing page id");

  await requireAdmin();
  const supabase = await createClient();

  const { data: existing } = await (supabase as any)
    .from("static_pages")
    .select("slug")
    .eq("id", pageId)
    .single();

  const { error } = await (supabase as any)
    .from("static_pages")
    .delete()
    .eq("id", pageId);
  if (error) throw new Error(error.message ?? "Failed to delete page");

  if (existing?.slug) revalidateStaticPagePaths(existing.slug as string);
  redirect("/admin/pages");
}
