"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/require-admin";
import { mergePlatformSettings } from "@/lib/platform-settings/defaults";
import type { PlatformSettings } from "@/lib/platform-settings/types";
import { routing } from "@/i18n/routing";

function revalidateSite() {
  revalidatePath("/", "layout");
  for (const loc of routing.locales) {
    revalidatePath(`/${loc}`, "page");
  }
}

export async function savePlatformSettings(payload: unknown) {
  await requireAdmin();
  const supabase = await createClient();
  const settings = mergePlatformSettings(payload) as PlatformSettings;

  const { error } = await (supabase as any)
    .from("platform_settings")
    .update({ settings })
    .eq("id", "default");

  if (error) throw new Error(error.message ?? "Failed to save settings");

  revalidateSite();
}
