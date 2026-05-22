// CSV-export. Gebruikt ';' als scheidingsteken en een UTF-8 BOM zodat het
// netjes opent in (Nederlandse) Excel. Getallen krijgen een komma-decimaal.

function escapeCell(value: string | number): string {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value).replace('.', ',') : '0'
  }
  const s = String(value ?? '')
  return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
}

export function downloadCsv(
  filename: string,
  headers: string[],
  rows: (string | number)[][]
): void {
  if (typeof document === 'undefined') return
  const sep = ';'
  const lines = [headers, ...rows].map((r) => r.map(escapeCell).join(sep))
  const csv = '﻿' + lines.join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
