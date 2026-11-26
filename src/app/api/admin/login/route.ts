import { NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import {
  createSupabaseAuthServerClient,
  isAllowedAdminUser,
} from "@/lib/supabase-auth";
import type { ApiErrorResponse } from "@/types/lead";

export const runtime = "nodejs";

const LOGIN_RATE_LIMIT = {
  maxRequests: 10,
  windowMs: 15 * 60 * 1000, // 15 minutes
};

interface LoginBody {
  email?: unknown;
  password?: unknown;
}

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);
    const rateLimit = checkRateLimit(`admin-login:${clientIp}`, LOGIN_RATE_LIMIT);

    if (!rateLimit.allowed) {
      return NextResponse.json<ApiErrorResponse>(
        {
          error: "Too many login attempts. Please wait a few minutes and try again.",
          code: "RATE_LIMITED",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.retryAfterSeconds),
          },
        }
      );
    }

    let body: LoginBody;
    try {
      body = (await request.json()) as LoginBody;
    } catch {
      return NextResponse.json<ApiErrorResponse>(
        { error: "Invalid request payload.", code: "INVALID_JSON" },
        { status: 400 }
      );
    }

    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!email || !password) {
      return NextResponse.json<ApiErrorResponse>(
        {
          error: "Please enter both your email address and password.",
          code: "VALIDATION_ERROR",
        },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseAuthServerClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      return NextResponse.json<ApiErrorResponse>(
        {
          error: "Invalid email or password. Please check your credentials and try again.",
          code: "INVALID_CREDENTIALS",
        },
        { status: 401 }
      );
    }

    if (!isAllowedAdminUser(data.user)) {
      await supabase.auth.signOut();
      return NextResponse.json<ApiErrorResponse>(
        {
          error: "This account is not authorized to access the admin dashboard.",
          code: "FORBIDDEN",
        },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        email: data.user.email,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[POST /api/admin/login] Unexpected error:", error);
    return NextResponse.json<ApiErrorResponse>(
      {
        error: "Unable to sign in right now. Please check server configuration.",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}
