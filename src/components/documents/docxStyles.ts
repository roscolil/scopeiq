// Style mapping + post-processing utilities for DOCX -> HTML rendering
// We leverage mammoth styleMap entries to label structural elements, then enhance with Tailwind classes.

export const docxStyleMap: string[] = [
  // Headings
  'heading1 => h1.docx-h1',
  'heading2 => h2.docx-h2',
  'heading3 => h3.docx-h3',
  'heading4 => h4.docx-h4',
  'heading5 => h5.docx-h5',
  'heading6 => h6.docx-h6',
  // Paragraphs with specific styles could be mapped similarly if needed
  // Lists (mammoth already outputs ul/ol/li) – keep defaults
  // Bold / Italic already converted – no custom mapping needed
]

// Tailwind utility classes applied after conversion
const classMap: Record<string, string> = {
  // Use em-based sizes so container font-size scaling (zoom) cascades
  'h1.docx-h1':
    'font-semibold mt-6 mb-4 tracking-tight text-black text-[1.875em] leading-tight', // ~30px at 16px base
  'h2.docx-h2':
    'font-semibold mt-5 mb-3 tracking-tight text-black text-[1.55em] leading-snug', // ~24.8px
  'h3.docx-h3':
    'font-semibold mt-4 mb-2 tracking-tight text-black text-[1.35em]', // ~21.6px
  'h4.docx-h4': 'font-semibold mt-4 mb-2 text-black text-[1.15em]', // ~18.4px
  'h5.docx-h5':
    'font-semibold mt-3 mb-1.5 uppercase tracking-wide text-black text-[0.95em]', // ~15.2px
  'h6.docx-h6':
    'font-semibold mt-3 mb-1 uppercase tracking-wider text-black text-[0.82em]', // ~13.1px
  p: 'my-3 leading-relaxed text-black text-[1em]',
  ul: 'list-disc ml-6 my-3 space-y-1 text-black',
  ol: 'list-decimal ml-6 my-3 space-y-1 text-black',
  li: 'leading-snug text-black',
  blockquote:
    'border-l-4 border-cyan-500/60 pl-4 italic my-4 text-black bg-cyan-50/60 rounded-sm py-1',
  table: 'w-full border-collapse my-4 text-black text-sm',
  thead: 'bg-gray-100',
  th: 'border px-2 py-1 text-left font-medium bg-gray-50 text-black',
  td: 'border px-2 py-1 align-top text-black',
  code: 'font-mono text-[0.81em] bg-slate-800/90 text-white px-1.5 py-0.5 rounded',
  pre: 'bg-slate-900 text-white rounded-md p-4 overflow-auto my-4 text-[0.85em]',
  a: 'text-blue-600 underline underline-offset-2 hover:text-blue-500 transition',
}

// Post-process the raw HTML string: add Tailwind classes, wrap tables, etc.
export const transformDocxHtml = (html: string): string => {
  try {
    if (!html) return html
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')

    // Remove inline font-size / line-height styles that block container scaling
    doc.querySelectorAll('[style]').forEach(el => {
      const style = el.getAttribute('style') || ''
      if (/font-size|line-height/i.test(style)) {
        const filtered = style
          .split(';')
          .map(s => s.trim())
          .filter(
            rule =>
              rule &&
              !/^font-size\s*:/i.test(rule) &&
              !/^line-height\s*:/i.test(rule) &&
              !/^mso-line-height-rule\s*:/i.test(rule),
          )
          .join('; ')
        if (filtered) el.setAttribute('style', filtered)
        else el.removeAttribute('style')
      }
    })

    // Apply class mappings
    Object.entries(classMap).forEach(([selector, classes]) => {
      doc.querySelectorAll(selector).forEach(el => {
        const existing = el.getAttribute('class') || ''
        // Avoid duplicating classes
        const merged = new Set(
          (existing + ' ' + classes).split(/\s+/).filter(Boolean),
        )
        el.setAttribute('class', Array.from(merged).join(' '))
      })
    })

    // Wrap tables for horizontal scroll on mobile
    doc.querySelectorAll('table').forEach(table => {
      if (
        !table.parentElement ||
        table.parentElement.classList.contains('docx-table-wrapper')
      )
        return
      const wrapper = doc.createElement('div')
      wrapper.className = 'docx-table-wrapper overflow-auto -mx-2 sm:mx-0'
      table.parentElement.insertBefore(wrapper, table)
      wrapper.appendChild(table)
    })

    // Return serialized HTML
    return doc.body.innerHTML
  } catch (e) {
    console.warn('transformDocxHtml error', e)
    return html // fallback to raw
  }
}

export interface DocxTransformConfig {
  styleMap?: string[]
  enabled?: boolean
}

export const defaultDocxTransformConfig: DocxTransformConfig = {
  styleMap: docxStyleMap,
  enabled: true,
}
