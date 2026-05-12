// Acties op een opgeleverd leveringsstuk: downloaden (.md), kopieren als
// geformatteerde tekst en printen / opslaan als PDF.

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function renderInline(s: string): string {
  return escapeHtml(s).replace(
    /\*\*([^*]+)\*\*/g,
    '<strong>$1</strong>'
  )
}

export function planMarkdownToHtml(md: string): string {
  const blocks = md.split(/\n{2,}/)
  const out: string[] = []
  for (const block of blocks) {
    const trimmed = block.trim()
    if (!trimmed) continue
    if (trimmed === '---') {
      out.push('<hr>')
      continue
    }
    if (/^# /.test(trimmed)) {
      out.push(`<h1>${renderInline(trimmed.slice(2))}</h1>`)
      continue
    }
    if (/^## /.test(trimmed)) {
      out.push(`<h2>${renderInline(trimmed.slice(3))}</h2>`)
      continue
    }
    if (/^### /.test(trimmed)) {
      out.push(`<h3>${renderInline(trimmed.slice(4))}</h3>`)
      continue
    }
    if (/^([-•*])\s/.test(trimmed)) {
      const items = trimmed
        .split('\n')
        .filter((l) => /^([-•*])\s/.test(l.trim()))
        .map((l) => `<li>${renderInline(l.replace(/^([-•*])\s/, ''))}</li>`)
      out.push(`<ul>${items.join('')}</ul>`)
      continue
    }
    if (/^\d+\.\s/.test(trimmed)) {
      const items = trimmed
        .split('\n')
        .filter((l) => /^\d+\.\s/.test(l.trim()))
        .map((l) => `<li>${renderInline(l.replace(/^\d+\.\s/, ''))}</li>`)
      out.push(`<ol>${items.join('')}</ol>`)
      continue
    }
    const lines = trimmed.split('\n').map(renderInline).join('<br>')
    out.push(`<p>${lines}</p>`)
  }
  return out.join('\n')
}

function suggestedFilename(md: string, ext: 'md'): string {
  const titleMatch = md.match(/^#\s+(.+)$/m)
  const title = (titleMatch?.[1] ?? 'leveringsstuk').trim()
  const slug = title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60) || 'leveringsstuk'
  const date = new Date().toISOString().slice(0, 10)
  return `${slug}-${date}.${ext}`
}

export function downloadPlanAsMarkdown(md: string): void {
  const filename = suggestedFilename(md, 'md')
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  // Geef de browser even de tijd om de download te starten
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}

export async function copyPlanAsRichText(md: string): Promise<boolean> {
  const html = planMarkdownToHtml(md)
  const wrapped = `<div>${html}</div>`
  try {
    if (
      typeof navigator !== 'undefined' &&
      navigator.clipboard &&
      typeof window !== 'undefined' &&
      'ClipboardItem' in window
    ) {
      const ClipboardItemCtor = (window as unknown as {
        ClipboardItem: new (data: Record<string, Blob>) => unknown
      }).ClipboardItem
      const item = new ClipboardItemCtor({
        'text/html': new Blob([wrapped], { type: 'text/html' }),
        'text/plain': new Blob([md], { type: 'text/plain' }),
      })
      await (navigator.clipboard as unknown as {
        write: (items: unknown[]) => Promise<void>
      }).write([item])
      return true
    }
  } catch {
    // val terug op plain-text copy hieronder
  }
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(md)
      return true
    }
  } catch {
    // doormodderen, return false
  }
  return false
}

export function printPlan(md: string): boolean {
  const html = planMarkdownToHtml(md)
  const iframe = document.createElement('iframe')
  iframe.setAttribute('aria-hidden', 'true')
  Object.assign(iframe.style, {
    position: 'fixed',
    right: '0',
    bottom: '0',
    width: '0',
    height: '0',
    border: '0',
    visibility: 'hidden',
  } as Partial<CSSStyleDeclaration>)
  document.body.appendChild(iframe)
  const doc = iframe.contentDocument
  if (!doc) {
    document.body.removeChild(iframe)
    return false
  }
  doc.open()
  doc.write(`<!doctype html><html lang="nl"><head>
<meta charset="utf-8">
<title>Leveringsstuk</title>
<style>
  @page { margin: 18mm; }
  html, body { background: #fff; color: #2a2a2a; }
  body {
    font-family: Georgia, "Times New Roman", serif;
    font-size: 11pt;
    line-height: 1.55;
    max-width: 720px;
    margin: 0 auto;
    padding: 16px 0;
  }
  h1, h2, h3 { font-family: Georgia, "Times New Roman", serif; line-height: 1.25; }
  h1 { font-size: 22pt; margin: 0 0 0.6em; }
  h2 { font-size: 14pt; margin: 1.4em 0 0.4em; }
  h3 { font-size: 12pt; margin: 1em 0 0.3em; }
  p { margin: 0.5em 0; }
  hr { border: 0; border-top: 1px solid #ccc; margin: 1.4em 0; }
  ul, ol { padding-left: 1.4em; margin: 0.4em 0; }
  li { margin: 0.2em 0; }
  strong { font-weight: 600; }
</style>
</head><body>${html}</body></html>`)
  doc.close()
  const win = iframe.contentWindow
  if (!win) {
    document.body.removeChild(iframe)
    return false
  }
  const doPrint = () => {
    try {
      win.focus()
      win.print()
    } finally {
      setTimeout(() => {
        if (iframe.parentNode) document.body.removeChild(iframe)
      }, 1000)
    }
  }
  if (doc.readyState === 'complete') {
    setTimeout(doPrint, 50)
  } else {
    win.addEventListener('load', doPrint)
  }
  return true
}
