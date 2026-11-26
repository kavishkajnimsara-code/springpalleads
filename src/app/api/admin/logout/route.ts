import { NextResponse } from "next/server";
import { createSupabaseAuthServerClient } from "@/lib/supabase-auth";

export const runtime = "nodejs";

export async function POST() {
  try {
    const supabase = await createSupabaseAuthServerClient();
    await supabase.auth.signOut();
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("[POST /api/admin/logout] Unexpected error:", error);
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}
