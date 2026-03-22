// lib/nav.ts
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/supabase/types";
import { cache } from "react";

async function getNavPropsUncached(): Promise<{
  isLoggedIn: boolean;
  userRole: UserRole | null;
  userId: string | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return { isLoggedIn: false, userRole: null, userId: null };

  const { data: profile } = await (supabase as any)
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return {
    isLoggedIn: true,
    userRole: (profile?.role as UserRole) ?? null,
    userId: user.id,
  };
}

/** Deduped per request when multiple layouts/pages need nav auth state. */
export const getNavProps = cache(getNavPropsUncached);
