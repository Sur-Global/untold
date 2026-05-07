// lib/nav.ts
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/supabase/types";
import type { CmsNavLink } from "@/lib/platform-settings/types";
import {
  getPlatformSettings,
  toCmsNavLinks,
} from "@/lib/data/platform-settings";
import { cache } from "react";

async function getNavPropsUncached(): Promise<{
  isLoggedIn: boolean;
  userRole: UserRole | null;
  userId: string | null;
  cmsNavItems: CmsNavLink[];
  showSearchInHeader: boolean;
}> {
  const supabase = await createClient();
  const [
    {
      data: { user },
      error: authError,
    },
    settings,
  ] = await Promise.all([supabase.auth.getUser(), getPlatformSettings()]);

  const cmsNavItems = toCmsNavLinks(settings);
  const showSearchInHeader = settings.searchBar.position !== "hidden";

  if (authError || !user) {
    return {
      isLoggedIn: false,
      userRole: null,
      userId: null,
      cmsNavItems,
      showSearchInHeader,
    };
  }

  const { data: profile } = await (supabase as any)
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return {
    isLoggedIn: true,
    userRole: (profile?.role as UserRole) ?? null,
    userId: user.id,
    cmsNavItems,
    showSearchInHeader,
  };
}

/** Deduped per request when multiple layouts/pages need nav auth state. */
export const getNavProps = cache(getNavPropsUncached);
