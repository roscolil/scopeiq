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
  'h1.docx-h1': 'text-2xl font-semibold mt-6 mb-4 tracking-tight',
  'h2.docx-h2': 'text-xl font-semibold mt-5 mb-3 tracking-tight',
  'h3.docx-h3': 'text-lg font-semibold mt-4 mb-2 tracking-tight',
  'h4.docx-h4': 'text-base font-semibold mt-4 mb-2',
  'h5.docx-h5':
    'text-sm font-semibold mt-3 mb-1.5 uppercase tracking-wide text-gray-600',
  'h6.docx-h6':
    'text-xs font-semibold mt-3 mb-1 uppercase tracking-wider text-gray-500',
  p: 'my-3 leading-relaxed text-sm text-gray-800 dark:text-gray-200',
  ul: 'list-disc ml-6 my-3 space-y-1',
  ol: 'list-decimal ml-6 my-3 space-y-1',
  li: 'leading-snug',
  blockquote:
    'border-l-4 border-cyan-500/60 pl-4 italic my-4 text-gray-700 dark:text-gray-300 bg-cyan-50/40 dark:bg-cyan-900/10 rounded-sm py-1',
  table: 'w-full border-collapse text-sm my-4',
  thead: 'bg-gray-100 dark:bg-gray-800',
  th: 'border px-2 py-1 text-left font-medium bg-gray-50 dark:bg-gray-800',
  td: 'border px-2 py-1 align-top',
  code: 'font-mono text-[13px] bg-slate-800/90 text-slate-100 px-1.5 py-0.5 rounded',
  pre: 'bg-slate-900 text-slate-100 rounded-md p-4 overflow-auto text-sm my-4',
  a: 'text-cyan-600 dark:text-cyan-400 underline underline-offset-2 hover:text-cyan-500 dark:hover:text-cyan-300 transition',
}

// Post-process the raw HTML string: add Tailwind classes, wrap tables, etc.
export const transformDocxHtml = (html: string): string => {
  try {
    if (!html) return html
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')

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
