import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from './database.types'

// Is de ingelogde gebruiker een platform_admin (operator/ontwikkelaar met
// volledige toegang tot elke bruiloft)? Leest het eigen profiel — de
// profiles-RLS staat `id = auth.uid()` toe, dus dit werkt zowel met de
// user-scoped client als met de service-role client.
//
// Server-routes die eigenaarschap hardcoderen gebruiken dit als bypass, zodat
// een platform_admin dezelfde beheeracties kan uitvoeren als een owner. De
// databasegrens (RLS) staat dit ook toe via can_manage_wedding()/can_edit().
export async function isPlatformAdmin(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from('profiles')
    .select('app_role')
    .eq('id', userId)
    .maybeSingle()
  return data?.app_role === 'platform_admin'
}
