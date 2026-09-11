import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import mermaid from 'mermaid'
import { PHASES } from '../data/pythonData'
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

/* ═══ Markdown → JSX renderer (same as GenAIBlog) ═══ */
function renderMarkdown(text) {
  if (!text) return null
  const lines = text.split('\n')
  const elements = []
  let key = 0, i = 0
  const nextKey = () => key++

  const formatInline = (str) => {
    const parts = []
    let cursor = 0, k = 0
    const regex = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(`(.+?)`)/g
    let match
    while ((match = regex.exec(str)) !== null) {
      if (match.index > cursor) parts.push(<span key={k++}>{str.slice(cursor, match.index)}</span>)
      if (match[2]) parts.push(<strong key={k++}>{match[2]}</strong>)
      else if (match[4]) parts.push(<em key={k++}>{match[4]}</em>)
      else if (match[6]) parts.push(<code key={k++} style={{ background: 'var(--neu-accent-soft)', padding: '1px 6px', borderRadius: 6, fontSize: '.82em', fontFamily: 'monospace', color: 'var(--neu-accent)' }}>{match[6]}</code>)
      cursor = match.index + match[0].length
    }
    if (cursor < str.length) parts.push(<span key={k++}>{str.slice(cursor)}</span>)
    return parts.length ? parts : str
  }

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
            <pre style={{ margin: 0, padding: '14px 16px', borderRadius: lang ? '0 12px 12px 12px' : 12, fontSize: '.82rem', fontFamily: '"JetBrains Mono", monospace', lineHeight: 1.7, overflowX: 'auto', background: 'var(--neu-bg)', color: 'var(--neu-text-primary)', boxShadow: 'inset 3px 3px 6px var(--neu-shadow-dark), inset -3px -3px 6px var(--neu-shadow-light)' }}>
              {codeLines.join('\n')}
            </pre>
          </div>
        )
      }
      continue
    }
    if (line.startsWith('|') && lines[i + 1]?.match(/^\|[\s\-:|]+\|/)) {
      const headerCells = line.split('|').filter(c => c.trim()).map(c => c.trim())
      i += 2
      const rows = []
      while (i < lines.length && lines[i].startsWith('|')) {
        rows.push(lines[i].split('|').filter(c => c.trim()).map(c => c.trim()))
        i++
      }
      elements.push(
        <div key={nextKey()} style={{ overflowX: 'auto', margin: '16px 0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.82rem' }}>
            <thead><tr>{headerCells.map((h, j) => <th key={j} style={{ textAlign: 'left', padding: '10px 14px', borderBottom: '2px solid var(--neu-accent)', fontWeight: 700, fontSize: '.76rem', fontFamily: 'monospace', textTransform: 'uppercase', color: 'var(--neu-accent)', letterSpacing: '.04em' }}>{formatInline(h)}</th>)}</tr></thead>
            <tbody>{rows.map((row, ri) => <tr key={ri} style={{ background: ri % 2 === 0 ? 'transparent' : 'rgba(163,177,198,0.04)' }}>{row.map((c, ci) => <td key={ci} style={{ padding: '10px 14px', borderBottom: '1px solid rgba(163,177,198,0.12)', lineHeight: 1.6, color: 'var(--neu-text-primary)' }}>{formatInline(c)}</td>)}</tr>)}</tbody>
          </table>
        </div>
      )
      continue
    }
    if (line.startsWith('> ')) {
      const quoteLines = []
      while (i < lines.length && lines[i].startsWith('> ')) { quoteLines.push(lines[i].slice(2)); i++ }
      elements.push(
        <blockquote key={nextKey()} style={{ margin: '16px 0', padding: '14px 20px', borderLeft: '4px solid var(--neu-accent)', background: 'var(--neu-accent-soft)', borderRadius: '0 12px 12px 0', fontSize: '.88rem', color: 'var(--neu-text-primary)', lineHeight: 1.8 }}>
          {quoteLines.map((l, j) => <div key={j}>{formatInline(l)}</div>)}
        </blockquote>
      )
      continue
    }
    if (/^#{1,3}\s/.test(line)) {
      const level = line.match(/^(#+)/)[1].length
      const text = line.replace(/^#+\s*/, '')
      const styles = {
        1: { fontSize: '1.6rem', fontWeight: 800, color: 'var(--neu-accent)', margin: '32px 0 16px', letterSpacing: '-.02em' },
        2: { fontSize: '1.2rem', fontWeight: 700, color: 'var(--neu-text-primary)', margin: '28px 0 12px', borderBottom: '2px solid var(--neu-accent)', paddingBottom: 8 },
        3: { fontSize: '1rem', fontWeight: 700, color: 'var(--neu-accent)', margin: '20px 0 8px' },
      }
      const Tag = `h${level}`
      elements.push(<Tag key={nextKey()} style={styles[level]}>{formatInline(text)}</Tag>)
      i++; continue
    }
    if (/^\d+\.\s/.test(line)) {
      const items = []
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) { items.push(lines[i].replace(/^\d+\.\s*/, '')); i++ }
      elements.push(
        <ol key={nextKey()} style={{ margin: '12px 0', paddingLeft: 24, lineHeight: 2, fontSize: '.9rem' }}>
          {items.map((item, j) => <li key={j} style={{ color: 'var(--neu-text-primary)', marginBottom: 4 }}>{formatInline(item)}</li>)}
        </ol>
      )
      continue
    }
    if (/^[-*]\s/.test(line)) {
      const items = []
      while (i < lines.length && /^[-*]\s/.test(lines[i])) { items.push(lines[i].replace(/^[-*]\s*/, '')); i++ }
      elements.push(
        <ul key={nextKey()} style={{ margin: '12px 0', paddingLeft: 24, lineHeight: 2, fontSize: '.9rem', listStyle: 'none' }}>
          {items.map((item, j) => <li key={j} style={{ color: 'var(--neu-text-primary)', marginBottom: 4, position: 'relative', paddingLeft: 16 }}><span style={{ position: 'absolute', left: 0, color: 'var(--neu-accent)', fontWeight: 700 }}>•</span>{formatInline(item)}</li>)}
        </ul>
      )
      continue
    }
    if (line.trim() === '') { i++; continue }
    elements.push(<p key={nextKey()} style={{ margin: '10px 0', lineHeight: 1.9, fontSize: '.9rem', color: 'var(--neu-text-primary)' }}>{formatInline(line)}</p>)
    i++
  }
  return elements
}

/* ═══ Blog storage ═══ */
const BLOG_KEY = 'dp_python_blogs_v1'
function loadBlogs() { try { return JSON.parse(localStorage.getItem(BLOG_KEY)) || {} } catch { return {} } }
function saveBlog(key, content) { const all = loadBlogs(); all[key] = content; localStorage.setItem(BLOG_KEY, JSON.stringify(all)) }

export default function PythonBlog() {
  const navigate = useNavigate()
  const [blogs, setBlogs] = useState(loadBlogs)
  const [generating, setGenerating] = useState(null) // phase.id generating
  const [viewBlog, setViewBlog] = useState(null) // { phaseId, topicLabel, content }

  const generateBlog = async (phase, topic) => {
    const key = `${phase.id}_${topic.label}`
    setGenerating(key)
    // Show streaming view immediately
    setViewBlog({ phaseId: phase.id, topicLabel: topic.label, content: '', streaming: true })
    try {
      const res = await fetch('/api/python/blog/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phase_title: `Phase ${phase.phase}: ${phase.title}`,
          topic_label: topic.label,
          problem_titles: topic.problems.map(p => p.title),
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert(data.error || 'Error generating blog')
        setViewBlog(null)
        setGenerating(null)
        return
      }
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
              setViewBlog({ phaseId: phase.id, topicLabel: topic.label, content: accumulated, streaming: true })
            } catch { /* skip */ }
          }
        }
      }
      if (accumulated) {
        saveBlog(key, accumulated)
        setBlogs(loadBlogs())
        setViewBlog({ phaseId: phase.id, topicLabel: topic.label, content: accumulated, streaming: false })
      }
    } catch (e) {
      alert(`Error: ${e.message}`)
    }
    setGenerating(null)
  }

  // View existing blog
  if (viewBlog) {
    return (
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <button className="btn btn-secondary btn-sm" onClick={() => setViewBlog(null)} style={{ marginBottom: 16 }}>← Back to Topics</button>
        <div style={{
          background: 'var(--neu-bg)', borderRadius: 20, padding: '28px 32px',
          boxShadow: '6px 6px 12px var(--neu-shadow-dark), -6px -6px 12px var(--neu-shadow-light)',
        }}>
          <div className="study-reading"><BlogHighlighter storageKey={`python_${viewBlog.phaseId}_${viewBlog.topicLabel}`} topicContext={viewBlog.topicLabel}>
            {renderMarkdown(viewBlog.content)}
          </BlogHighlighter></div>
        </div>
      </div>
    )
  }

  return (
    <div className="python-lessons" style={{ maxWidth: 1060, margin: '0 auto' }}>
      <div className="prep-header">
        <span className="learning-eyebrow">PYTHON · READ & UNDERSTAND</span><h1>Python lessons</h1>
        <p>Explore each topic through focused explanations and examples.</p>
      </div>

      <button className="btn btn-secondary btn-sm" onClick={() => navigate('/python')} style={{ marginBottom: 20 }}>← Back to Roadmap</button>

      {PHASES.map(phase => (
        <section className="python-lesson-section" key={phase.id} style={{ marginBottom: 20 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10,
            padding: '10px 16px', borderRadius: 14,
            background: 'var(--neu-bg)',
            boxShadow: '4px 4px 8px var(--neu-shadow-dark), -4px -4px 8px var(--neu-shadow-light)',
            borderLeft: `4px solid ${phase.color}`,
          }}>
            <span className="course-ordinal">{String(phase.phase).padStart(2, '0')}</span>
            <span style={{ fontWeight: 700, fontSize: '.92rem', color: 'var(--neu-text-primary)' }}>
              Phase {phase.phase}: {phase.title}
            </span>
          </div>

          <div style={{ paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {phase.topics.map((topic, ti) => {
              const key = `${phase.id}_${topic.label}`
              const hasBlog = !!blogs[key]
              const isGenerating = generating === key

              return (
                <div className="python-lesson-row" key={ti} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                  borderRadius: 12, background: 'var(--neu-bg)',
                  boxShadow: '3px 3px 6px var(--neu-shadow-dark), -3px -3px 6px var(--neu-shadow-light)',
                }}>
                  <span style={{ flex: 1, fontSize: '.84rem', color: 'var(--neu-text-primary)', fontWeight: 600 }}>
                    {topic.label}
                  </span>
                  <span style={{ fontSize: '.8125rem', color: 'var(--neu-text-secondary)', fontFamily: 'inherit' }}>
                    {topic.problems.length} {topic.problems.length === 1 ? 'problem' : 'problems'}
                  </span>

                  {hasBlog && (
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setViewBlog({ phaseId: phase.id, topicLabel: topic.label, content: blogs[key] })}
                      style={{ fontSize: '.7rem' }}
                    >Read lesson</button>
                  )}

                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => generateBlog(phase, topic)}
                    disabled={isGenerating}
                    style={{ fontSize: '.7rem' }}
                  >
                    {isGenerating ? 'Writing…' : hasBlog ? 'Regenerate' : 'Generate lesson'}
                  </button>
                </div>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
