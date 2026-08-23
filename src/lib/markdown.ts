/**
 * Inline-math normalisation for master content.
 *
 * Mirrors `normalizeInlineMath` in `edyma-site/src/lib/markdown.ts` and
 * `edyma_flutter/lib/shared/widgets/markdown_defaults.dart` - keep all three
 * in sync. `$...$` adjacent to punctuation or words does not survive
 * remark-math, so inline dollars are rewritten to `\(...\)` while display
 * blocks, escaped dollars and currency-like pairs are left alone.
 */

/**
 * Whether a `$...$` body is real inline math rather than prose with dollar
 * amounts: the delimiters must hug the content (`$x$`, not `$ x$`), and a
 * body reading like an amount inside a sentence ("50 and 60" - starts with
 * a digit and contains whitespace) is currency, not an equation.
 */
function isInlineMathBody(body: string): boolean {
  if (body.length === 0) return false
  if (/^\s/.test(body) || /\s$/.test(body)) return false
  if (/^\d/.test(body) && /\s/.test(body)) return false
  return true
}

function rewriteInlineDollars(text: string, replace: (body: string) => string): string {
  const pattern = /\$([^$\n]+?)\$/g
  let result = ''
  let cursor = 0
  let match = pattern.exec(text)
  while (match !== null) {
    const body = match[1]
    const openEscaped = match.index > 0 && text.charAt(match.index - 1) === '\\'
    const closeEscaped = /\\$/.test(body)
    if (openEscaped || closeEscaped) {
      pattern.lastIndex = match.index + 1
    } else {
      result += text.slice(cursor, match.index)
      result += isInlineMathBody(body) ? replace(body) : match[0]
      cursor = pattern.lastIndex
    }
    match = pattern.exec(text)
  }
  return result + text.slice(cursor)
}

export function normalizeInlineMath(markdown: string): string {
  const displayBlocks: string[] = []

  let text = markdown.replace(/\$\$[\s\S]*?\$\$/g, (match) => {
    displayBlocks.push(match)
    return `__DISPLAY_MATH_${displayBlocks.length - 1}__`
  })

  text = rewriteInlineDollars(text, (body) => `\\(${body}\\)`)

  displayBlocks.forEach((block, index) => {
    // Replacer function so `$$` in the block is not parsed as a
    // replacement pattern (a bare string replacement would eat dollars).
    text = text.replace(`__DISPLAY_MATH_${index}__`, () => block)
  })

  return text
}

/** The slug inside an `interactive://<slug>` image src, as chapter markdown embeds sims. */
export function interactiveSlug(src: string): string | null {
  if (!src.startsWith('interactive://')) return null
  return src.slice('interactive://'.length).replace(/\/+$/, '')
}
