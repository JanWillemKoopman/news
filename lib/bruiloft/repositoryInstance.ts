// Eén plek waar de implementatie van de opslaglaag gekozen wordt.
// De hele app (store) praat via deze singleton met de backend.

import type { WeddingRepository } from './repository'
import { SupabaseWeddingRepository } from './supabaseRepository'

export const repository: WeddingRepository = new SupabaseWeddingRepository()
