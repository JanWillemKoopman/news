import 'server-only'

import { GoogleGenerativeAI, SchemaType, type ResponseSchema } from '@google/generative-ai'

import {
  ALLOWED_RADII,
  ALLOWED_SANS_FONTS,
  ALLOWED_SERIF_FONTS,
  themeConfigSchema,
  type ThemeConfig,
} from '@/lib/bruiloft/theme'

// Wat we de gebruiker als foutmelding tonen als Gemini niet meewerkt.
export class ThemeGenerationError extends Error {}

const MODEL = 'gemini-2.5-flash'

function client(): GoogleGenerativeAI {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new ThemeGenerationError('GEMINI_API_KEY ontbreekt op de server.')
  return new GoogleGenerativeAI(key)
}

// Eén JSON-schema dat zowel naar Gemini gaat (als responseSchema) als wat
// wij na ontvangst nog eens met Zod controleren. Gemini's structured-output
// dwingt het formaat al sterk af; Zod is de tweede vangst.
const hslDescription =
  'HSL-triplet in CSS-formaat zonder hsl()-wrapper. Voorbeeld: "339 39% 50%". H is 0-360, S/L zijn 0-100 met %.'

const responseSchema: ResponseSchema = {
  type: SchemaType.OBJECT,
  required: ['colors', 'fonts', 'radius'],
  properties: {
    colors: {
      type: SchemaType.OBJECT,
      required: [
        'background',
        'foreground',
        'primary',
        'primary_foreground',
        'muted',
        'muted_foreground',
        'border',
        'accent',
        'header_bg',
        'header_fg',
      ],
      properties: {
        background: { type: SchemaType.STRING, description: `Pagina-canvas. ${hslDescription}` },
        foreground: {
          type: SchemaType.STRING,
          description: `Hoofd-tekstkleur op background. Contrast >= 7:1. ${hslDescription}`,
        },
        primary: {
          type: SchemaType.STRING,
          description: `Accentkleur (knoppen, links, namen). ${hslDescription}`,
        },
        primary_foreground: {
          type: SchemaType.STRING,
          description: `Tekst op primary (bv. knop-tekst). Contrast >= 4.5:1 met primary. ${hslDescription}`,
        },
        muted: {
          type: SchemaType.STRING,
          description: `Zachte achtergrond voor secundaire vlakken. ${hslDescription}`,
        },
        muted_foreground: {
          type: SchemaType.STRING,
          description: `Gedempte tekst (bv. datums, subteksten). Contrast >= 4.5:1 met background. ${hslDescription}`,
        },
        border: { type: SchemaType.STRING, description: `Randen en scheidslijnen. ${hslDescription}` },
        accent: {
          type: SchemaType.STRING,
          description: `Subtiele hover/highlight-tint, vaak een zachtere variant van primary. ${hslDescription}`,
        },
        header_bg: {
          type: SchemaType.STRING,
          description: `Achtergrond van de header-bar bovenaan. ${hslDescription}`,
        },
        header_fg: {
          type: SchemaType.STRING,
          description: `Tekst op header_bg. Contrast >= 4.5:1 met header_bg. ${hslDescription}`,
        },
      },
    },
    fonts: {
      type: SchemaType.OBJECT,
      required: ['serif', 'sans'],
      properties: {
        serif: {
          type: SchemaType.STRING,
          format: 'enum',
          enum: [...ALLOWED_SERIF_FONTS],
          description: 'Serif lettertype voor namen en koppen.',
        },
        sans: {
          type: SchemaType.STRING,
          format: 'enum',
          enum: [...ALLOWED_SANS_FONTS],
          description: 'Sans-serif lettertype voor lopende tekst.',
        },
      },
    },
    radius: {
      type: SchemaType.STRING,
      format: 'enum',
      enum: [...ALLOWED_RADII],
      description: 'Border-radius voor knoppen en cards.',
    },
  },
}

const SYSTEM = `Je bent een UI-designer die kleurpaletten en typografie kiest voor
een trouwbruiloft-uitnodiging. Output is een JSON-thema-object dat exact het
gegeven schema volgt — geen uitleg, geen markdown.

Regels:
- Alle kleuren ALTIJD als HSL-tripletten zonder hsl()-wrapper. Voorbeeld:
  "339 39% 50%". H is 0-360, S en L zijn 0-100% met procentteken.
- Het canvas (background) is doorgaans licht (L >= 90%). Donkere themes
  kunnen, maar zorg dan voor voldoende contrast op alle paren.
- Hou de pagina leesbaar: tekst-op-achtergrond contrast >= 4.5:1 (WCAG AA).
- header_bg mag een diepere/contrasterende kleur zijn — daarvoor geldt ook
  contrast >= 4.5:1 met header_fg.
- Kies één serif uit de lijst voor namen/koppen, één sans uit de lijst voor
  lopende tekst. Combineer ze klassiek (één serieus, één neutraal).
- Kies een radius die bij de sfeer past (modern strak = 0 of 0.25rem,
  romantisch zacht = 0.5-1rem).`

interface GenerateInput {
  prompt: string
  currentTheme?: ThemeConfig
}

export async function generateThemeFromPrompt({
  prompt,
  currentTheme,
}: GenerateInput): Promise<ThemeConfig> {
  const model = client().getGenerativeModel({
    model: MODEL,
    systemInstruction: SYSTEM,
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema,
      temperature: 0.7,
    },
  })

  const userMessage = [
    `Sfeerwens van het bruidspaar: "${prompt.trim()}"`,
    currentTheme
      ? `Huidig thema (referentie; mag je negeren als de wens iets heel anders vraagt):\n${JSON.stringify(currentTheme)}`
      : '',
    'Lever NU een geldig theme-object volgens het schema.',
  ]
    .filter(Boolean)
    .join('\n\n')

  let raw: string
  try {
    const result = await model.generateContent(userMessage)
    raw = result.response.text()
  } catch (e) {
    throw new ThemeGenerationError(
      e instanceof Error ? `Gemini-fout: ${e.message}` : 'Gemini-fout (onbekend).',
    )
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new ThemeGenerationError('Gemini gaf geen geldige JSON terug.')
  }

  const validated = themeConfigSchema.safeParse(parsed)
  if (!validated.success) {
    throw new ThemeGenerationError(
      `Thema-output voldoet niet aan het schema: ${validated.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join('; ')}`,
    )
  }

  return validated.data
}
