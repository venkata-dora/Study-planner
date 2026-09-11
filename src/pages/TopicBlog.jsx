import { useState, useEffect, useRef, useCallback } from 'react'
import mermaid from 'mermaid'
import BlogHighlighter from '../components/BlogHighlighter'

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
   Markdown → JSX renderer (same as GenAIBlog)
═══════════════════════════════════════════════ */
function inlineFormat(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:var(--neu-text-primary)">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code style="font-family:monospace;font-size:.8em;background:rgba(41,121,255,0.1);padding:2px 7px;border-radius:5px;color:var(--neu-accent);font-weight:600">$1</code>')
}

function renderMarkdown(text) {
  if (!text) return null
  const lines = text.split('\n')
  const elements = []
  let key = 0, i = 0
  const nextKey = () => key++

  while (i < lines.length) {
    const line = lines[i]

    if (/^---+$/.test(line.trim())) {
      elements.push(<hr key={nextKey()} style={{ border: 'none', borderTop: '1px solid rgba(163,177,198,0.25)', margin: '24px 0' }} />)
      i++; continue
    }
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim().toLowerCase()
      const codeLines = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) { codeLines.push(lines[i]); i++ }
      i++
      if (lang === 'mermaid') {
        elements.push(<MermaidDiagram key={nextKey()} code={codeLines.join('\n')} />)
      } else {
        elements.push(
          <div key={nextKey()} style={{ margin: '16px 0' }}>
            {lang && <div style={{ fontSize: '.65rem', fontFamily: 'monospace', fontWeight: 700, color: 'var(--neu-accent)', background: 'var(--neu-accent-soft)', padding: '4px 12px', borderRadius: '12px 12px 0 0', display: 'inline-block', letterSpacing: '.05em', textTransform: 'uppercase' }}>{lang}</div>}
            <pre style={{ background: 'var(--neu-bg)', boxShadow: 'inset 4px 4px 8px var(--neu-shadow-dark), inset -4px -4px 8px var(--neu-shadow-light)', borderRadius: lang ? '0 12px 12px 12px' : 12, padding: '16px 18px', overflowX: 'auto', fontSize: '.78rem', lineHeight: 1.65, fontFamily: '"JetBrains Mono", "Fira Code", monospace', color: 'var(--neu-text-primary)', margin: 0, whiteSpace: 'pre' }}>{codeLines.join('\n')}</pre>
          </div>
        )
      }
      continue
    }
    if (line.startsWith('|') && i + 1 < lines.length && lines[i + 1].match(/^\|[\s|:-]+\|/)) {
      const headers = line.split('|').filter((_, ci) => ci > 0 && ci < line.split('|').length - 1).map(h => h.trim())
      i += 2
      const rows = []
      while (i < lines.length && lines[i].startsWith('|')) {
        rows.push(lines[i].split('|').filter((_, ci) => ci > 0 && ci < lines[i].split('|').length - 1).map(c => c.trim()))
        i++
      }
      elements.push(
        <div key={nextKey()} style={{ overflowX: 'auto', margin: '16px 0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: 'var(--neu-bg)', borderRadius: 12, overflow: 'hidden', boxShadow: '4px 4px 8px var(--neu-shadow-dark), -4px -4px 8px var(--neu-shadow-light)' }}>
            <thead><tr>{headers.map((h, ci) => <th key={ci} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--neu-accent)', background: 'var(--neu-accent-soft)', borderBottom: '2px solid rgba(41,121,255,0.2)' }} dangerouslySetInnerHTML={{ __html: inlineFormat(h) }} />)}</tr></thead>
            <tbody>{rows.map((row, ri) => <tr key={ri} style={{ borderBottom: '1px solid rgba(163,177,198,0.15)' }}>{row.map((cell, ci) => <td key={ci} style={{ padding: '9px 14px', fontSize: '.82rem', color: '#1a1a1a', fontWeight: ci === 0 ? 600 : 400 }}>{cell.includes('<br/>') || cell.includes('<br />') ? cell.split(/<br\s*\/?>/i).map((part, pi) => <div key={pi} style={{ marginBottom: pi < cell.split(/<br\s*\/?>/i).length - 1 ? 4 : 0, lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: inlineFormat(part) }} />) : <span dangerouslySetInnerHTML={{ __html: inlineFormat(cell) }} />}</td>)}</tr>)}</tbody>
          </table>
        </div>
      )
      continue
    }
    if (line.startsWith('> ')) {
      const quoteLines = []
      while (i < lines.length && lines[i].startsWith('> ')) { quoteLines.push(lines[i].slice(2)); i++ }
      const isInterview = quoteLines.some(l => l.toLowerCase().includes('interview'))
      elements.push(
        <div key={nextKey()} style={{ background: isInterview ? 'rgba(217,119,6,0.08)' : 'var(--neu-accent-soft)', borderLeft: `4px solid ${isInterview ? '#d97706' : 'var(--neu-accent)'}`, borderRadius: '0 12px 12px 0', padding: '12px 16px', margin: '16px 0' }}>
          {quoteLines.map((ql, qi) => <p key={qi} style={{ margin: qi < quoteLines.length - 1 ? '0 0 6px' : 0, fontSize: '.87rem', lineHeight: 1.7, color: isInterview ? '#d97706' : 'var(--neu-accent)' }} dangerouslySetInnerHTML={{ __html: inlineFormat(ql) }} />)}
        </div>
      )
      continue
    }
    if (line.startsWith('# ')) { elements.push(<h1 key={nextKey()} style={{ fontSize: '1.7rem', fontWeight: 800, letterSpacing: '-.03em', color: 'var(--neu-accent)', margin: '0 0 20px', lineHeight: 1.2 }}>{line.slice(2)}</h1>); i++; continue }
    if (line.startsWith('## ')) { elements.push(<h2 key={nextKey()} style={{ fontSize: '1.1rem', fontWeight: 700, margin: '28px 0 10px', color: 'var(--neu-text-primary)', display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 8, borderBottom: '2px solid rgba(163,177,198,0.2)' }}>{line.slice(3)}</h2>); i++; continue }
    if (line.startsWith('### ')) { elements.push(<h3 key={nextKey()} style={{ fontSize: '.95rem', fontWeight: 700, margin: '20px 0 8px', color: 'var(--neu-accent)' }}>{line.slice(4)}</h3>); i++; continue }
    if (line.match(/^\d+\. /)) {
      const listItems = []
      while (i < lines.length && lines[i].match(/^\d+\. /)) { listItems.push(lines[i].replace(/^\d+\. /, '')); i++ }
      elements.push(
        <ol key={nextKey()} style={{ paddingLeft: 0, margin: '8px 0 16px', listStyle: 'none' }}>
          {listItems.map((item, li) => <li key={li} style={{ display: 'flex', gap: 12, marginBottom: 10, alignItems: 'flex-start' }}><span style={{ flexShrink: 0, width: 24, height: 24, borderRadius: '50%', background: 'var(--neu-accent)', color: '#fff', fontSize: '.72rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1, boxShadow: '0 2px 6px rgba(41,121,255,0.35)' }}>{li + 1}</span><span style={{ fontSize: '.9rem', lineHeight: 1.7, color: 'var(--neu-text-primary)', paddingTop: 2 }} dangerouslySetInnerHTML={{ __html: inlineFormat(item) }} /></li>)}
        </ol>
      )
      continue
    }
    if (line.match(/^[-*] /)) {
      const listItems = []
      while (i < lines.length && lines[i].match(/^[-*] /)) { listItems.push(lines[i].replace(/^[-*] /, '')); i++ }
      elements.push(
        <ul key={nextKey()} style={{ paddingLeft: 0, margin: '8px 0 16px', listStyle: 'none' }}>
          {listItems.map((item, li) => <li key={li} style={{ display: 'flex', gap: 10, marginBottom: 8, alignItems: 'flex-start' }}><span style={{ flexShrink: 0, width: 6, height: 6, borderRadius: '50%', background: 'var(--neu-accent)', marginTop: 8 }} /><span style={{ fontSize: '.9rem', lineHeight: 1.7, color: 'var(--neu-text-primary)' }} dangerouslySetInnerHTML={{ __html: inlineFormat(item) }} /></li>)}
        </ul>
      )
      continue
    }
    if (line.trim() === '') { elements.push(<div key={nextKey()} style={{ height: 6 }} />); i++; continue }
    elements.push(<p key={nextKey()} style={{ fontSize: '.9rem', lineHeight: 1.85, color: 'var(--neu-text-primary)', margin: '0 0 10px' }} dangerouslySetInnerHTML={{ __html: inlineFormat(line) }} />)
    i++
  }
  return elements
}

/* ═══════════════════════════════════════════════
   TopicBlog — per-topic blog modal
═══════════════════════════════════════════════ */
export default function TopicBlog({ topicName, sectionId, sectionTitle, sectionColor, sectionIcon, onClose }) {
  const [status, setStatus] = useState('loading')
  const [blog, setBlog] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    // Try loading saved blog first
    fetch(`/api/genai/topic-blog/${encodeURIComponent(topicName)}/${encodeURIComponent(sectionId)}`)
      .then(r => r.json())
      .then(data => {
        if (data && data.blog_content) {
          setBlog(data.blog_content)
          setStatus('done')
        } else {
          generate()
        }
      })
      .catch(() => generate())
  }, []) // eslint-disable-line

  const generate = async () => {
    setStatus('loading')
    setBlog('')
    setErrorMsg('')
    try {
      const res = await fetch('/api/genai/topic-blog/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic_name: topicName, section_id: sectionId, section_title: sectionTitle }),
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
            } catch { /* skip */ }
          }
          if (line === 'event: done') setStatus('done')
        }
      }
      if (accumulated) {
        setStatus('done')
        // Auto-save to database
        fetch('/api/genai/topic-blog/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic_name: topicName, section_id: sectionId, section_title: sectionTitle, blog_text: accumulated }),
        }).catch(() => {})
      }
    } catch (e) {
      setErrorMsg(`Network error: ${e.message}. Is the Flask server running on port 5050?`)
      setStatus('error')
    }
  }

  const copyBlog = () => {
    navigator.clipboard.writeText(blog).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ alignItems: 'flex-start', paddingTop: 48 }}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--neu-bg)', borderRadius: 24,
          width: '92%', maxWidth: 860, maxHeight: '88vh',
          display: 'flex', flexDirection: 'column',
          boxShadow: '16px 16px 32px var(--neu-shadow-dark), -16px -16px 32px var(--neu-shadow-light)',
          overflow: 'hidden', animation: 'fadeUp .3s ease forwards',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 22px', borderBottom: '1px solid rgba(163,177,198,0.2)',
          flexShrink: 0, background: 'var(--neu-bg)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
              background: `${sectionColor}18`, display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '1rem',
              boxShadow: `0 0 0 2px ${sectionColor}44`,
            }}>{sectionIcon}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: '.9rem', color: 'var(--neu-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                📝 <span style={{ color: sectionColor }}>{topicName}</span>
              </div>
              <div style={{ fontSize: '.67rem', color: 'var(--neu-text-secondary)', fontFamily: 'monospace' }}>
                {sectionTitle} · {status === 'done' ? 'saved' : status === 'streaming' ? 'streaming…' : 'generating…'}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
            {status === 'done' && (
              <button className="btn btn-secondary btn-sm" onClick={copyBlog}>
                {copied ? '✓ Copied!' : '📋 Copy'}
              </button>
            )}
            <button className="btn btn-secondary btn-sm" onClick={generate} disabled={status === 'loading' || status === 'streaming'}>
              🔄 {status === 'done' ? 'Regenerate' : 'Retry'}
            </button>
            <button
              onClick={onClose}
              style={{
                width: 30, height: 30, borderRadius: '50%',
                background: 'var(--neu-bg)', border: 'none', cursor: 'pointer',
                color: 'var(--neu-text-secondary)', fontSize: '.9rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '3px 3px 6px var(--neu-shadow-dark), -3px -3px 6px var(--neu-shadow-light)',
              }}
            >✕</button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 30px' }}>
          {status === 'loading' && (
            <div style={{ textAlign: 'center', paddingTop: 80, paddingBottom: 80 }}>
              <div style={{ fontSize: '2.8rem', marginBottom: 16 }}>✍️</div>
              <div style={{ fontWeight: 700, color: 'var(--neu-text-primary)', marginBottom: 6, fontSize: '1rem' }}>
                Writing blog for "{topicName}"…
              </div>
              <div style={{ fontSize: '.78rem', color: 'var(--neu-text-secondary)', fontFamily: 'monospace', marginBottom: 28 }}>
                Deep dive: definition · examples · pitfalls · tips (~20–30s)
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
                {['🧭', '🔄', '🎯', '💡', '🛠️', '⚡'].map((e, idx) => (
                  <div key={idx} style={{
                    width: 38, height: 38, borderRadius: '50%',
                    background: 'var(--neu-bg)', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: '1rem',
                    boxShadow: '4px 4px 8px var(--neu-shadow-dark), -4px -4px 8px var(--neu-shadow-light)',
                    animation: `pulse 1.4s ease ${idx * 0.18}s infinite`, opacity: 0.6,
                  }}>{e}</div>
                ))}
              </div>
            </div>
          )}

          {status === 'error' && (
            <div style={{ background: 'rgba(220,38,38,0.07)', borderRadius: 16, padding: 22, border: '1px solid rgba(220,38,38,0.18)' }}>
              <div style={{ fontWeight: 700, color: '#dc2626', marginBottom: 10, fontSize: '.95rem' }}>⚠️ Error</div>
              <pre style={{ fontSize: '.8rem', color: 'var(--neu-text-secondary)', fontFamily: 'monospace', lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: 0 }}>{errorMsg}</pre>
              <button className="btn btn-secondary btn-sm" style={{ marginTop: 16 }} onClick={generate}>Try again</button>
            </div>
          )}

          {(status === 'done' || status === 'streaming') && (
            <article className="study-reading">
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                background: `${sectionColor}18`, borderRadius: 999,
                padding: '5px 14px', marginBottom: 24,
                fontSize: '.68rem', color: sectionColor, fontFamily: 'monospace', fontWeight: 700,
              }}>
                <span style={{ fontSize: '.9rem' }}>{sectionIcon}</span>
                {topicName} · {sectionTitle}
              </div>
              <BlogHighlighter storageKey={`topic_${sectionId}_${topicName}`} topicContext={`${topicName} (${sectionTitle})`}>
                {renderMarkdown(blog)}
              </BlogHighlighter>
            </article>
          )}
        </div>
      </div>
    </div>
  )
}
