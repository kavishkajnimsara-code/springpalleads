import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export interface AuthenticatedAdmin {
  id: string;
  email: string;
}

function getSupabaseAuthConfig(): { url: string; key: string } {
  const url = process.env.SUPABASE_URL?.trim();
  // Prefer dedicated anon/publishable key; fall back to service role key on server only
  // so deployments work immediately even before adding SUPABASE_ANON_KEY.
  const key =
    process.env.SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !key) {
    throw new Error(
      "Missing Supabase Auth server configuration. Set SUPABASE_URL and SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY)."
    );
  }

  return { url, key };
}

/**
 * Creates a server-only Supabase Auth client backed by HTTP-only Next.js cookies.
 * NEVER import this module in client components.
 */
export async function createSupabaseAuthServerClient() {
  const { url, key } = getSupabaseAuthConfig();
  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, {
              ...options,
              httpOnly: true,
              sameSite: "lax",
              secure: process.env.NODE_ENV === "production",
            });
          });
        } catch {
          // Server Components cannot mutate cookies during render; Route Handlers will persist them.
        }
      },
    },
  });
}

/**
 * Verifies whether a Supabase Auth user is permitted to access the Spring Pal admin dashboard.
 * Uses optional ADMIN_ALLOWED_EMAILS (comma-separated) allowlist if configured.
 * Never trusts user_metadata for authorization.
 */
export function isAllowedAdminUser(user: User | null | undefined): boolean {
  if (!user || !user.email || user.is_anonymous) {
    return false;
  }

  const rawAllowlist = process.env.ADMIN_ALLOWED_EMAILS?.trim();
  if (!rawAllowlist) {
    return true;
  }

  const allowedEmails = rawAllowlist
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

  if (allowedEmails.length === 0) {
    return true;
  }

  return allowedEmails.includes(user.email.toLowerCase());
}

/**
 * Validates the current admin session against Supabase Auth server (via getUser).
 * Returns null if unauthenticated or not authorized.
 */
export async function getAuthenticatedAdmin(): Promise<AuthenticatedAdmin | null> {
  try {
    const supabase = await createSupabaseAuthServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !isAllowedAdminUser(user) || !user?.email) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
    };
  } catch {
    return null;
  }
}
