// Presentation-only cleanup: stored articles and highlights remain untouched.
export function readerContent(markdown, title) {
  let text = markdown.replace(/^\s*Granting write permission needed\. Alternatively, here's the complete blog post formatted for your project:\s*/i, '')
  const normalize = value => value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
  const heading = text.match(/^\s*(?:---\s*\n\s*)?# ([^\n]+)\n?/)
  if (heading && normalize(heading[1]).startsWith(normalize(title))) text = text.slice(heading[0].length)
  return text.replace(/^\s*---\s*\n/, '')
}
