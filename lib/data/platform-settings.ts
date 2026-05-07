import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import {
  mergePlatformSettings,
  normalizeNavPath,
} from "@/lib/platform-settings/defaults";
import type {
  CmsNavLink,
  PlatformSettings,
} from "@/lib/platform-settings/types";

export const getPlatformSettings = cache(
  async (): Promise<PlatformSettings> => {
    try {
      const supabase = await createClient();
      const { data, error } = await (supabase as any)
        .from("platform_settings")
        .select("settings")
        .eq("id", "default")
        .maybeSingle();

      if (error) return mergePlatformSettings(null);
      return mergePlatformSettings(data?.settings);
    } catch {
      return mergePlatformSettings(null);
    }
  },
);

export function toCmsNavLinks(settings: PlatformSettings): CmsNavLink[] {
  return settings.navItems
    .filter((i) => i.visible && i.label.trim() && i.path.trim())
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((i) => ({
      label: i.label.trim(),
      href: normalizeNavPath(i.path),
    }));
}
