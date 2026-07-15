import { createClient } from "@/lib/supabase/server";

export interface Viewer {
  id: string;
  email: string | null;
  isBuilder: boolean;
}

/** The signed-in user plus their builder flag, or null if not signed in. */
export async function getViewer(): Promise<Viewer | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .schema("mmm")
    .from("app_users")
    .select("is_builder")
    .eq("id", user.id)
    .maybeSingle();

  return {
    id: user.id,
    email: user.email ?? null,
    isBuilder: Boolean(data?.is_builder),
  };
}
