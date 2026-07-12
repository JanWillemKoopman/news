// Pure iCalendar-generator voor de agenda-koppeling (/api/agenda/[token]).
// Geen IO/DB: de route levert kant-en-klare events aan, dit bestand kent
// alleen het ICS-formaat (escaping, line-folding, tijdzone). Stabiele UIDs
// per item zorgen dat agenda-apps wijzigingen netjes overschrijven in
// plaats van dubbele events te maken.

export interface IcsEvent {
  uid: string // stabiel, bv. 'afspraak-<vendorId>@onstrouwplan'
  titel: string
  datum: string // 'YYYY-MM-DD'
  tijd?: string // 'HH:MM' — leeg/afwezig = hele-dag-event
  duurMinuten?: number // alleen bij tijd; standaard 60
  omschrijving?: string
  locatie?: string
}

// RFC 5545: backslash, puntkomma, komma en newlines escapen in tekstvelden.
function icsEscape(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

// RFC 5545: regels langer dan 75 octetten vouwen met CRLF + spatie. We
// vouwen op tekens (ruim binnen de limiet bij ASCII; bij veel multi-byte
// tekens iets conservatiever geknipt op 60).
function fold(line: string): string {
  const max = /[^\x20-\x7e]/.test(line) ? 60 : 74
  if (line.length <= max) return line
  const delen: string[] = []
  let rest = line
  while (rest.length > max) {
    delen.push(rest.slice(0, max))
    rest = rest.slice(max)
  }
  delen.push(rest)
  return delen.join('\r\n ')
}

function datumCompact(datum: string): string {
  return datum.replace(/-/g, '')
}

// 'YYYY-MM-DD' + 1 dag, voor DTEND van hele-dag-events (exclusief einde).
function volgendeDag(datum: string): string {
  const d = new Date(`${datum}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

function tijdCompact(tijd: string): string {
  const [uur, minuut] = tijd.split(':')
  return `${uur.padStart(2, '0')}${(minuut ?? '00').padStart(2, '0')}00`
}

// 'HH:MM' + duurMinuten, binnen dezelfde dag afgekapt op 23:59 zodat we
// geen datum-overloop hoeven te modelleren voor een simpel agenda-item.
function eindTijd(tijd: string, duurMinuten: number): string {
  const [uur, minuut] = tijd.split(':').map(Number)
  const totaal = Math.min(uur * 60 + minuut + duurMinuten, 23 * 60 + 59)
  const eu = Math.floor(totaal / 60)
  const em = totaal % 60
  return `${String(eu).padStart(2, '0')}:${String(em).padStart(2, '0')}`
}

// VTIMEZONE voor Europe/Amsterdam (CET/CEST) — vereist voor events met
// TZID, zodat elke agenda-app de lokale tijden juist interpreteert.
const VTIMEZONE = [
  'BEGIN:VTIMEZONE',
  'TZID:Europe/Amsterdam',
  'BEGIN:DAYLIGHT',
  'TZOFFSETFROM:+0100',
  'TZOFFSETTO:+0200',
  'TZNAME:CEST',
  'DTSTART:19700329T020000',
  'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
  'END:DAYLIGHT',
  'BEGIN:STANDARD',
  'TZOFFSETFROM:+0200',
  'TZOFFSETTO:+0100',
  'TZNAME:CET',
  'DTSTART:19701025T030000',
  'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
  'END:STANDARD',
  'END:VTIMEZONE',
]

export function buildIcsCalendar(kalenderNaam: string, events: IcsEvent[]): string {
  const dtstamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

  const regels: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Ons Trouwplan//Agenda//NL',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${icsEscape(kalenderNaam)}`,
    'X-WR-TIMEZONE:Europe/Amsterdam',
    // Hint aan agenda-apps om het abonnement regelmatig te verversen.
    'REFRESH-INTERVAL;VALUE=DURATION:PT6H',
    'X-PUBLISHED-TTL:PT6H',
    ...VTIMEZONE,
  ]

  for (const e of events) {
    regels.push('BEGIN:VEVENT')
    regels.push(`UID:${icsEscape(e.uid)}`)
    regels.push(`DTSTAMP:${dtstamp}`)
    if (e.tijd) {
      const duur = e.duurMinuten ?? 60
      regels.push(`DTSTART;TZID=Europe/Amsterdam:${datumCompact(e.datum)}T${tijdCompact(e.tijd)}`)
      regels.push(
        `DTEND;TZID=Europe/Amsterdam:${datumCompact(e.datum)}T${tijdCompact(eindTijd(e.tijd, duur))}`
      )
    } else {
      regels.push(`DTSTART;VALUE=DATE:${datumCompact(e.datum)}`)
      regels.push(`DTEND;VALUE=DATE:${datumCompact(volgendeDag(e.datum))}`)
    }
    regels.push(`SUMMARY:${icsEscape(e.titel)}`)
    if (e.omschrijving) regels.push(`DESCRIPTION:${icsEscape(e.omschrijving)}`)
    if (e.locatie) regels.push(`LOCATION:${icsEscape(e.locatie)}`)
    regels.push('END:VEVENT')
  }

  regels.push('END:VCALENDAR')
  return regels.map(fold).join('\r\n') + '\r\n'
}
