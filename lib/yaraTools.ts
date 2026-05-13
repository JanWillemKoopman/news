// Gemini-function-calling configuratie voor Yara (data-analist).
// Bevat één tool: query_rdw_voertuigen — bevraagt de RDW open-data API.

import { type FunctionDeclaration, SchemaType } from '@google/generative-ai'
import { executeRdwQuery, RDW_FIELDS, type RdwFilter, type RdwOp, type RdwQueryParams } from './rdw'

const FIELD_NAMES = Object.keys(RDW_FIELDS)
const FIELD_DESCRIPTIONS = Object.entries(RDW_FIELDS)
  .map(([k, v]) => `${k} (${v.label})`)
  .join('; ')

export const QUERY_RDW_VOERTUIGEN: FunctionDeclaration = {
  name: 'query_rdw_voertuigen',
  description:
    'Bevraagt de openbare RDW open-data API met Nederlandse voertuigregistraties (dataset m9d7-ebf2). ' +
    'Gebruik voor concrete vragen over aantallen, merken, modellen, kleuren, APK-vervaldatums, ' +
    'eerste tenaamstellingen, bouwjaren, gewichten en verzekeringsstatus van Nederlandse voertuigen. ' +
    'Geef voor tellingen `aggregate: { fn: "count" }`; voor breakdowns combineer met `group_by`. ' +
    `Toegestane velden: ${FIELD_DESCRIPTIONS}. ` +
    'Belangrijk: het veld `merk` is altijd in HOOFDLETTERS in de dataset (bv. "AUDI", "VOLKSWAGEN", "TESLA"). ' +
    'Datumvelden hebben suffix _dt en accepteren YYYY-MM-DD. wam_verzekerd is "J" of "N".',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      filters: {
        type: SchemaType.ARRAY,
        description:
          'Lijst van filters die met AND worden gecombineerd. Operator-enum: eq, neq, gt, gte, lt, lte, starts_with, contains, between, is_null, is_not_null.',
        items: {
          type: SchemaType.OBJECT,
          properties: {
            field: {
              type: SchemaType.STRING,
              description: 'Naam van het veld. Moet uit de toegestane velden komen.',
              enum: FIELD_NAMES,
            },
            op: {
              type: SchemaType.STRING,
              description: 'Vergelijkingsoperator.',
              enum: [
                'eq',
                'neq',
                'gt',
                'gte',
                'lt',
                'lte',
                'starts_with',
                'contains',
                'between',
                'is_null',
                'is_not_null',
              ],
            },
            value: {
              type: SchemaType.STRING,
              description:
                'De waarde. Voor between: gebruik value_from + value_to in plaats van value. Bij is_null / is_not_null: leeg laten.',
            },
            value_from: {
              type: SchemaType.STRING,
              description: 'Ondergrens bij operator between.',
            },
            value_to: {
              type: SchemaType.STRING,
              description: 'Bovengrens bij operator between.',
            },
          },
          required: ['field', 'op'],
        },
      },
      select: {
        type: SchemaType.ARRAY,
        description:
          'Kolommen om mee terug te geven. Leeglaten bij aggregaties of group_by. Niet nodig als je alleen count wilt.',
        items: { type: SchemaType.STRING, enum: FIELD_NAMES },
      },
      group_by: {
        type: SchemaType.ARRAY,
        description:
          'Velden om op te groeperen. Combineer altijd met aggregate (bv. count) om zinnige breakdowns te krijgen.',
        items: { type: SchemaType.STRING, enum: FIELD_NAMES },
      },
      aggregate: {
        type: SchemaType.OBJECT,
        description:
          'Aggregatie over alle rijen of per groep. fn: count|sum|avg|min|max. Veld is verplicht behalve bij count.',
        properties: {
          fn: {
            type: SchemaType.STRING,
            enum: ['count', 'sum', 'avg', 'min', 'max'],
          },
          field: {
            type: SchemaType.STRING,
            enum: FIELD_NAMES,
          },
          alias: {
            type: SchemaType.STRING,
            description: 'Naam in de resultaat-rij. Default "aantal" voor count.',
          },
        },
        required: ['fn'],
      },
      order_by: {
        type: SchemaType.ARRAY,
        description:
          'Sortering. Veld mag een veldnaam OF een aggregatie-alias zijn (bv. "aantal").',
        items: {
          type: SchemaType.OBJECT,
          properties: {
            field: { type: SchemaType.STRING },
            dir: { type: SchemaType.STRING, enum: ['asc', 'desc'] },
          },
          required: ['field', 'dir'],
        },
      },
      limit: {
        type: SchemaType.INTEGER,
        description:
          'Aantal rijen terug, 1-1000. Default 20. Voor tellingen is 1 voldoende. Voor top-N breakdowns: kies N.',
      },
    },
    required: [],
  },
}

export const YARA_TOOL_DECLARATIONS: FunctionDeclaration[] = [QUERY_RDW_VOERTUIGEN]

type RawArgs = {
  filters?: Array<{
    field: string
    op: string
    value?: unknown
    value_from?: unknown
    value_to?: unknown
  }>
  select?: string[]
  group_by?: string[]
  aggregate?: { fn: string; field?: string; alias?: string }
  order_by?: Array<{ field: string; dir: string }>
  limit?: number
}

function coerceArgs(raw: RawArgs): RdwQueryParams {
  const filters: RdwFilter[] = (raw.filters || []).map((f) => {
    const op = f.op as RdwOp
    if (op === 'between') {
      if (f.value_from == null || f.value_to == null) {
        throw new Error(`Filter '${f.field}' met op=between vereist value_from en value_to.`)
      }
      return {
        field: f.field,
        op,
        value: [f.value_from as string | number, f.value_to as string | number],
      }
    }
    if (op === 'is_null' || op === 'is_not_null') {
      return { field: f.field, op }
    }
    return { field: f.field, op, value: f.value as string | number }
  })

  const aggregate = raw.aggregate
    ? {
        fn: raw.aggregate.fn as 'count' | 'sum' | 'avg' | 'min' | 'max',
        field: raw.aggregate.field,
        alias: raw.aggregate.alias || (raw.aggregate.fn === 'count' ? 'aantal' : undefined),
      }
    : undefined

  return {
    filters,
    select: raw.select,
    group_by: raw.group_by,
    aggregate,
    order_by: raw.order_by?.map((o) => ({
      field: o.field,
      dir: (o.dir === 'desc' ? 'desc' : 'asc') as 'asc' | 'desc',
    })),
    limit: raw.limit,
  }
}

export const YARA_TOOL_EXECUTORS: Record<
  string,
  (args: Record<string, unknown>) => Promise<Record<string, unknown>>
> = {
  query_rdw_voertuigen: async (args) => {
    try {
      const params = coerceArgs(args as RawArgs)
      const result = await executeRdwQuery(params)
      // Output minimaal en functioneel voor Gemini:
      return {
        rows: result.rows,
        row_count_returned: result.row_count_returned,
        truncated: result.truncated,
        error: result.error,
      }
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err), rows: [] }
    }
  },
}
