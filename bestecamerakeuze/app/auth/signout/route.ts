import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseGeconfigureerd } from "@/lib/config";

/** Uitloggen. POST, zodat een prefetch of linkscanner je niet per ongeluk uitlogt. */
export async function POST(request: Request) {
  if (isSupabaseGeconfigureerd()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}
