// Eén plek waar de implementatie van de opslaglaag gekozen wordt.
// Later: vervang deze regel door `new ApiWeddingRepository()` — de hele app
// (store én publieke trouwwebsite) gebruikt dan automatisch de backend.

import { LocalStorageWeddingRepository } from './localStorageRepository'
import type { WeddingRepository } from './repository'

export const repository: WeddingRepository = new LocalStorageWeddingRepository()
