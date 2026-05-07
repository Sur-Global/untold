import type { SupabaseClient } from "@supabase/supabase-js";

export type FooterStaticPage = {
  slug: string;
  title: string;
};

export async function getStaticPagesForFooter(
  supabase: SupabaseClient,
  locale: string,
): Promise<FooterStaticPage[]> {
  const { data, error } = await (supabase as any)
    .from("static_pages")
    .select("slug, footer_sort_order, static_page_translations(locale, title)")
    .eq("status", "published")
    .eq("show_in_footer", true)
    .order("footer_sort_order", { ascending: true });

  if (error || !data?.length) return [];

  return data.map((row: any) => {
    const trs = row.static_page_translations as Array<{
      locale: string;
      title: string;
    }> | null;
    const t =
      trs?.find((x) => x.locale === locale) ??
      trs?.find((x) => x.locale === "en") ??
      trs?.[0];
    return { slug: row.slug as string, title: t?.title ?? row.slug };
  });
}

export type PublishedStaticPage = {
  slug: string;
  title: string;
  body: Record<string, unknown> | unknown[] | null;
};

export async function getPublishedStaticPageBySlug(
  supabase: SupabaseClient,
  slug: string,
  locale: string,
): Promise<PublishedStaticPage | null> {
  const { data: page, error } = await (supabase as any)
    .from("static_pages")
    .select("slug, static_page_translations(locale, title, body)")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error || !page) return null;

  const trs = page.static_page_translations as Array<{
    locale: string;
    title: string;
    body: Record<string, unknown> | unknown[] | null;
  }>;

  const t =
    trs?.find((x) => x.locale === locale) ??
    trs?.find((x) => x.locale === "en") ??
    trs?.[0];

  if (!t?.title) return null;

  return {
    slug: page.slug,
    title: t.title,
    body: t.body ?? null,
  };
}
