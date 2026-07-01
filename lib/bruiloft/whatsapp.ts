// Zet een telefoonnummer om naar het formaat dat wa.me verwacht (alleen
// cijfers, landcode voorop). Gaat uit van NL-nummers (voorloopnul → 31);
// buitenlandse nummers die al met landcode of + zijn ingevoerd blijven kloppen.
export function normalizeWhatsappNumber(raw: string): string | null {
  let n = raw.replace(/[^\d+]/g, '').replace(/^\+/, '')
  if (!n) return null
  if (n.startsWith('0')) n = '31' + n.slice(1)
  return n
}

export function buildWhatsappUrl(text: string, phone?: string): string {
  const n = phone ? normalizeWhatsappNumber(phone) : null
  return `${n ? `https://wa.me/${n}` : 'https://wa.me/'}?text=${encodeURIComponent(text)}`
}
