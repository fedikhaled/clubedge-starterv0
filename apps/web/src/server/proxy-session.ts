import type { CookieStore } from "@clubedge/auth";
import { createSupabaseAuth } from "@clubedge/auth-supabase";
import { getSupabaseAuthEnv } from "@/env/auth";

/**
 * Refreshes the Supabase session for a proxy request. The proxy runs outside the Server Component
 * context, so it bridges the request's cookies here instead of going through `nextCookieStore()`.
 */
export async function refreshProxySession(cookies: CookieStore): Promise<void> {
  const env = getSupabaseAuthEnv();
  if (!env) return;
  await createSupabaseAuth({ ...env, cookies }).refreshSession();
}
