import { z } from 'zod'

// Exponential-backoff retry voor tijdelijke API-fouten (netwerk, overload).
export async function withRetry<T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000))
      }
    }
  }
  throw lastError
}

// Breekt een promise af na `ms` milliseconden.
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('AI verzoek time-out')), ms)
  )
  return Promise.race([promise, timeout])
}

// Extraheert de eerste complete JSON-waarde (object of array) uit een string.
// Robuuster dan alleen markdown code-blocks strippen.
export function extractJSON(text: string): string {
  const objIdx = text.indexOf('{')
  const arrIdx = text.indexOf('[')

  if (arrIdx !== -1 && (objIdx === -1 || arrIdx < objIdx)) {
    const last = text.lastIndexOf(']')
    if (last > arrIdx) return text.slice(arrIdx, last + 1)
  }
  if (objIdx !== -1) {
    const last = text.lastIndexOf('}')
    if (last > objIdx) return text.slice(objIdx, last + 1)
  }
  return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
}

// ---- Zod-schema's voor AI-responses ----------------------------------------

export const adviesItemSchema = z.object({
  id: z.string(),
  titel: z.string(),
  omschrijving: z.string(),
  urgentie: z.enum(['kritiek', 'binnenkort', 'normaal']),
  sectie: z.string(),
  sectionLabel: z.string(),
})

export const adviesResponseSchema = z.array(adviesItemSchema)

export const budgetAdviesSchema = z.object({
  samenvatting: z.string(),
  aandachtspunten: z.array(
    z.object({
      categorie: z.string(),
      bericht: z.string(),
      type: z.enum(['waarschuwing', 'tip', 'positief']),
    })
  ),
  algemeneRaad: z.string(),
})

export const taakSuggestieSchema = z.object({
  titel: z.string(),
  omschrijving: z.string(),
  fase: z.string(),
  prioriteit: z.enum(['hoog', 'midden', 'laag']),
  toegewezenAan: z.enum(['samen', 'partner 1', 'partner 2']),
  deadline: z.string(),
  reden: z.string(),
})

export const takenAdviesSchema = z.object({
  samenvatting: z.string(),
  taken: z.array(taakSuggestieSchema),
})

export const moduleAdviesSchema = z.object({
  status: z.enum(['op_schema', 'actie_vereist', 'kritiek', 'niet_gestart']),
  globaal_advies: z.string(),
  concrete_acties: z.array(
    z.object({
      tekst: z.string(),
      link: z.string().optional(),
    })
  ),
})

export const globaleStatusSchema = z.object({
  status: z.enum(['op_schema', 'actie_vereist', 'kritiek']),
  samenvatting: z.string(),
  score: z.number().min(0).max(100),
})
