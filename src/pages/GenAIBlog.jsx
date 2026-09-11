import { Navigate, useLocation } from 'react-router-dom'
import { readerPath } from '../utils/readerPaths'
import { useState, useEffect, useRef, useCallback } from 'react'
import mermaid from 'mermaid'
import BlogHighlighter from '../components/BlogHighlighter'
import { itemText } from '../data/genAIData'

mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'loose' })

function MermaidDiagram({ code }) {
  const ref = useRef(null)
  const render = useCallback(async () => {
    if (!ref.current) return
    try {
      const id = `mermaid-${Math.random().toString(36).slice(2, 9)}`
      const { svg } = await mermaid.render(id, code)
      ref.current.innerHTML = svg
    } catch {
      ref.current.innerHTML = `<pre style="color:#ef4444;font-size:.8rem">${code}</pre>`
    }
  }, [code])
  useEffect(() => { render() }, [render])

  return (
    <div ref={ref} style={{
      margin: '16px 0', padding: '16px', background: 'var(--neu-bg)', borderRadius: 16, textAlign: 'center',
      boxShadow: '4px 4px 8px var(--neu-shadow-dark), -4px -4px 8px var(--neu-shadow-light)',
      overflow: 'auto',
    }} />
  )
}

/* ═══════════════════════════════════════════════
   Full-featured Markdown → JSX renderer
   Handles: h1/h2/h3, tables, code blocks, mermaid,
   blockquotes, ordered/unordered lists,
   hr, bold, italic, inline code, plain text
═══════════════════════════════════════════════ */
function renderMarkdown(text) {
  if (!text) return null

  const lines = text.split('\n')
  const elements = []
  let key = 0
  let i = 0

  const nextKey = () => key++

  while (i < lines.length) {
    const line = lines[i]

    // ── Horizontal rule ──
    if (/^---+$/.test(line.trim())) {
      elements.push(
        <hr key={nextKey()} style={{
          border: 'none',
          borderTop: '1px solid rgba(163,177,198,0.25)',
          margin: '24px 0',
        }} />
      )
      i++; continue
    }

    // ── Fenced code block ──
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim().toLowerCase()
      const codeLines = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      i++ // skip closing ```
      if (lang === 'mermaid') {
        elements.push(<MermaidDiagram key={nextKey()} code={codeLines.join('\n')} />)
      } else {
        elements.push(
          <div key={nextKey()} style={{ margin: '16px 0' }}>
            {lang && (
              <div style={{
                fontSize: '.65rem', fontFamily: 'monospace', fontWeight: 700,
                color: 'var(--neu-accent)', background: 'var(--neu-accent-soft)',
                padding: '4px 12px', borderRadius: '12px 12px 0 0',
                display: 'inline-block', letterSpacing: '.05em', textTransform: 'uppercase',
              }}>{lang || 'code'}</div>
            )}
            <pre style={{
              background: 'var(--neu-bg)',
              boxShadow: 'inset 4px 4px 8px var(--neu-shadow-dark), inset -4px -4px 8px var(--neu-shadow-light)',
              borderRadius: lang ? '0 12px 12px 12px' : 12,
              padding: '16px 18px',
              overflowX: 'auto',
              fontSize: '.78rem',
              lineHeight: 1.65,
              fontFamily: '"JetBrains Mono", "Fira Code", monospace',
              color: 'var(--neu-text-primary)',
              margin: 0,
              whiteSpace: 'pre',
            }}>
              {codeLines.join('\n')}
            </pre>
          </div>
        )
      }
      continue
    }

    // ── Table ──
    if (line.startsWith('|') && i + 1 < lines.length && lines[i + 1].match(/^\|[\s|:-]+\|/)) {
      const headers = line.split('|').filter((_, ci) => ci > 0 && ci < line.split('|').length - 1).map(h => h.trim())
      i += 2 // skip header + separator
      const rows = []
      while (i < lines.length && lines[i].startsWith('|')) {
        const cells = lines[i].split('|').filter((_, ci) => ci > 0 && ci < lines[i].split('|').length - 1).map(c => c.trim())
        rows.push(cells)
        i++
      }
      elements.push(
        <div key={nextKey()} style={{ overflowX: 'auto', margin: '16px 0' }}>
          <table style={{
            width: '100%', borderCollapse: 'collapse',
            background: 'var(--neu-bg)',
            borderRadius: 12, overflow: 'hidden',
            boxShadow: '4px 4px 8px var(--neu-shadow-dark), -4px -4px 8px var(--neu-shadow-light)',
          }}>
            <thead>
              <tr>
                {headers.map((h, ci) => (
                  <th key={ci} style={{
                    padding: '10px 14px', textAlign: 'left',
                    fontSize: '.72rem', fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '.06em', color: 'var(--neu-accent)',
                    background: 'var(--neu-accent-soft)',
                    borderBottom: '2px solid rgba(41,121,255,0.2)',
                  }}
                    dangerouslySetInnerHTML={{ __html: inlineFormat(h) }} />
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} style={{ borderBottom: '1px solid rgba(163,177,198,0.15)' }}>
                  {row.map((cell, ci) => (
                    <td key={ci} style={{
                      padding: '9px 14px', fontSize: '.82rem',
                      color: '#1a1a1a',
                      fontWeight: ci === 0 ? 600 : 400,
                    }}>
                      {cell.includes('<br/>') || cell.includes('<br />') ? (
                        cell.split(/<br\s*\/?>/i).map((part, pi) => (
                          <div key={pi} style={{ marginBottom: pi < cell.split(/<br\s*\/?>/i).length - 1 ? 4 : 0, lineHeight: 1.6 }}
                            dangerouslySetInnerHTML={{ __html: inlineFormat(part) }} />
                        ))
                      ) : (
                        <span dangerouslySetInnerHTML={{ __html: inlineFormat(cell) }} />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
      continue
    }

    // ── Blockquote ──
    if (line.startsWith('> ')) {
      const quoteLines = []
      while (i < lines.length && lines[i].startsWith('> ')) {
        quoteLines.push(lines[i].slice(2))
        i++
      }
      const isInterview = quoteLines.some(l => l.toLowerCase().includes('interview'))
      elements.push(
        <div key={nextKey()} style={{
          background: isInterview ? 'rgba(217,119,6,0.08)' : 'var(--neu-accent-soft)',
          borderLeft: `4px solid ${isInterview ? '#d97706' : 'var(--neu-accent)'}`,
          borderRadius: '0 12px 12px 0',
          padding: '12px 16px',
          margin: '16px 0',
        }}>
          {quoteLines.map((ql, qi) => (
            <p key={qi} style={{
              margin: qi < quoteLines.length - 1 ? '0 0 6px' : 0,
              fontSize: '.87rem', lineHeight: 1.7,
              color: isInterview ? '#d97706' : 'var(--neu-accent)',
            }}
              dangerouslySetInnerHTML={{ __html: inlineFormat(ql) }} />
          ))}
        </div>
      )
      continue
    }

    // ── H1 ──
    if (line.startsWith('# ')) {
      elements.push(
        <h1 key={nextKey()} style={{
          fontSize: '1.7rem', fontWeight: 800, letterSpacing: '-.03em',
          color: 'var(--neu-accent)', margin: '0 0 20px',
          lineHeight: 1.2,
        }}>
          {line.slice(2)}
        </h1>
      )
      i++; continue
    }

    // ── H2 ──
    if (line.startsWith('## ')) {
      elements.push(
        <h2 key={nextKey()} style={{
          fontSize: '1.1rem', fontWeight: 700, margin: '28px 0 10px',
          color: 'var(--neu-text-primary)',
          display: 'flex', alignItems: 'center', gap: 8,
          paddingBottom: 8,
          borderBottom: '2px solid rgba(163,177,198,0.2)',
        }}>
          {line.slice(3)}
        </h2>
      )
      i++; continue
    }

    // ── H3 ──
    if (line.startsWith('### ')) {
      elements.push(
        <h3 key={nextKey()} style={{
          fontSize: '.95rem', fontWeight: 700, margin: '20px 0 8px',
          color: 'var(--neu-accent)',
        }}>
          {line.slice(4)}
        </h3>
      )
      i++; continue
    }

    // ── Ordered list ──
    if (line.match(/^\d+\. /)) {
      const listItems = []
      while (i < lines.length && lines[i].match(/^\d+\. /)) {
        listItems.push(lines[i].replace(/^\d+\. /, ''))
        i++
      }
      elements.push(
        <ol key={nextKey()} style={{ paddingLeft: 0, margin: '8px 0 16px', listStyle: 'none' }}>
          {listItems.map((item, li) => (
            <li key={li} style={{
              display: 'flex', gap: 12, marginBottom: 10, alignItems: 'flex-start',
            }}>
              <span style={{
                flexShrink: 0, width: 24, height: 24, borderRadius: '50%',
                background: 'var(--neu-accent)', color: '#fff',
                fontSize: '.72rem', fontWeight: 800, display: 'flex',
                alignItems: 'center', justifyContent: 'center', marginTop: 1,
                boxShadow: '0 2px 6px rgba(41,121,255,0.35)',
              }}>{li + 1}</span>
              <span style={{ fontSize: '.9rem', lineHeight: 1.7, color: 'var(--neu-text-primary)', paddingTop: 2 }}
                dangerouslySetInnerHTML={{ __html: inlineFormat(item) }} />
            </li>
          ))}
        </ol>
      )
      continue
    }

    // ── Unordered list ──
    if (line.match(/^[-*] /)) {
      const listItems = []
      while (i < lines.length && lines[i].match(/^[-*] /)) {
        listItems.push(lines[i].replace(/^[-*] /, ''))
        i++
      }
      elements.push(
        <ul key={nextKey()} style={{ paddingLeft: 0, margin: '8px 0 16px', listStyle: 'none' }}>
          {listItems.map((item, li) => (
            <li key={li} style={{
              display: 'flex', gap: 10, marginBottom: 8, alignItems: 'flex-start',
            }}>
              <span style={{
                flexShrink: 0, width: 6, height: 6, borderRadius: '50%',
                background: 'var(--neu-accent)', marginTop: 8,
              }} />
              <span style={{ fontSize: '.9rem', lineHeight: 1.7, color: 'var(--neu-text-primary)' }}
                dangerouslySetInnerHTML={{ __html: inlineFormat(item) }} />
            </li>
          ))}
        </ul>
      )
      continue
    }

    // ── Empty line ──
    if (line.trim() === '') {
      elements.push(<div key={nextKey()} style={{ height: 6 }} />)
      i++; continue
    }

    // ── Plain paragraph ──
    elements.push(
      <p key={nextKey()} style={{
        fontSize: '.9rem', lineHeight: 1.85,
        color: 'var(--neu-text-primary)', margin: '0 0 10px',
      }}
        dangerouslySetInnerHTML={{ __html: inlineFormat(line) }} />
    )
    i++
  }

  return elements
}

function inlineFormat(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:var(--neu-text-primary)">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code style="font-family:monospace;font-size:.8em;background:rgba(41,121,255,0.1);padding:2px 7px;border-radius:5px;color:var(--neu-accent);font-weight:600">$1</code>')
}

/* ═══════════════════════════════════════════════
   Main GenAIBlog component
═══════════════════════════════════════════════ */
export default function GenAIBlog(props) {
  const location = useLocation()
  if (!props.embedded) return <Navigate to={readerPath(props.section.id)} state={{ returnTo: location.pathname }} />
  return <GenAIBlogContent {...props} />
}

function GenAIBlogContent({ section, onClose }) {
  const [status, setStatus] = useState('idle')
  const [blog, setBlog] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [copied, setCopied] = useState(false)
  const request = useRef(null)
  useEffect(() => () => request.current?.abort(), [])

  useEffect(() => { setStatus('idle') }, [])   // eslint-disable-line

  const generate = async () => {
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    setStatus('loading')
    setBlog('')
    setErrorMsg('')
    try {
      const topicsSample = []
      section.subsections.forEach(sub => sub.items.slice(0, 4).forEach(item => topicsSample.push(itemText(item))))
      const res = await fetch('/api/genai/blog/stream', {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section_title: section.title,
          subsections: section.subsections.map(s => s.label),
          topics_sample: topicsSample,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setErrorMsg(data.error || 'Unknown error'); setStatus('error')
        return
      }
      setStatus('streaming')
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const text = decoder.decode(value, { stream: true })
        for (const line of text.split('\n')) {
          if (line.startsWith('data: ') && line !== 'data: end') {
            try {
              accumulated += JSON.parse(line.slice(6))
              setBlog(accumulated)
            } catch { /* skip malformed */ }
          }
          if (line === 'event: done') {
            setStatus('done')
          }
        }
      }
      if (accumulated) setStatus('done')
    } catch (e) {
      if (e.name === 'AbortError') return
      setErrorMsg(`Network error: ${e.message}. Is the Flask server running on port 5050?`)
      setStatus('error')
    }
  }

  const copyBlog = () => {
    navigator.clipboard.writeText(blog).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  return (
    <div className="reader-article-shell">
      <div className="reader-article">
        {/* ── Header bar ── */}
        <header className="reader-toolbar"><div><span className="learning-eyebrow">CHAPTER GUIDE</span><p>{section.title}</p></div><div>{status === 'done' && <button className="btn btn-secondary" onClick={copyBlog}>{copied ? 'Copied' : 'Copy'}</button>}<button className="btn btn-secondary" onClick={generate} disabled={status === 'loading' || status === 'streaming'}>{status === 'done' ? 'Regenerate' : 'Generate lesson'}</button></div></header>

        {/* ── Body ── */}
        <div className="reader-content">

          {status === 'idle' && <div className="reader-empty"><h1>{section.title}</h1><p>This lesson hasn’t been written yet. Generate it when you’re ready, or choose another lesson from the learning path.</p><button className="btn btn-primary" onClick={generate}>Generate lesson</button></div>}
          {/* Loading */}
          {status === 'loading' && <p className="reader-status" role="status">Loading your lesson…</p>}
          {status === 'streaming' && <p className="reader-status" role="status">Writing your lesson. You can keep reading as it arrives.</p>}

          {status === 'error' && (
            <div style={{
              background: 'rgba(220,38,38,0.07)', borderRadius: 16, padding: 22,
              border: '1px solid rgba(220,38,38,0.18)',
            }}>
              <div style={{ fontWeight: 700, color: '#dc2626', marginBottom: 10, fontSize: '.95rem' }}>⚠️ Error</div>
              <pre style={{
                fontSize: '.8rem', color: 'var(--neu-text-secondary)',
                fontFamily: 'monospace', lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: 0,
              }}>{errorMsg}</pre>
              <button className="btn btn-secondary btn-sm" style={{ marginTop: 16 }} onClick={generate}>Try again</button>
            </div>
          )}

          {/* Blog content */}
          {(status === 'done' || status === 'streaming') && (
            <article className="study-reading">
              <BlogHighlighter storageKey={`genai_${section.title}`} topicContext={section.title}>
                {renderMarkdown(blog.replace(/^\s*# [^\n]*\n?/, ''))}
              </BlogHighlighter>
            </article>
          )}
        </div>
      </div>
    </div>
  )
}
