import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Waar de magic link op uitkomt: wisselt de code uit voor een sessie en stuurt door
 * naar het dashboard.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const naar = url.searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(naar, url.origin));
    }
  }

  return NextResponse.redirect(new URL("/login?fout=inloglink", url.origin));
}
