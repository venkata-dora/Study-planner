import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Editor from '@monaco-editor/react'
import MermaidDiagram from '../components/MermaidDiagram'
import {
  PHASES, loadProgress, saveProgress, loadSolutions, saveSolution,
  problemId, cycleStatus, STATUS_META, DIFFICULTY_COLORS,
} from '../data/pythonData'
import BlogHighlighter from '../components/BlogHighlighter'


/* ═══ Mermaid component ═══ */

/* ═══ Markdown → JSX renderer ═══ */
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
      else if (match[6]) parts.push(<code key={k++} style={{ background: 'var(--neu-accent-soft)', padding: '1px 5px', borderRadius: 5, fontSize: '.8em', fontFamily: 'monospace', color: 'var(--neu-accent)' }}>{match[6]}</code>)
      cursor = match.index + match[0].length
    }
    if (cursor < str.length) parts.push(<span key={k++}>{str.slice(cursor)}</span>)
    return parts.length ? parts : str
  }

  while (i < lines.length) {
    const line = lines[i]

    if (/^---+$/.test(line.trim())) {
      elements.push(<hr key={nextKey()} style={{ border: 'none', borderTop: '1px solid rgba(163,177,198,0.2)', margin: '16px 0' }} />)
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
          <div key={nextKey()} style={{ margin: '10px 0' }}>
            {lang && <div style={{ fontSize: '.6rem', fontFamily: 'monospace', fontWeight: 700, color: 'var(--neu-accent)', background: 'var(--neu-accent-soft)', padding: '3px 10px', borderRadius: '10px 10px 0 0', display: 'inline-block', letterSpacing: '.04em', textTransform: 'uppercase' }}>{lang}</div>}
            <pre style={{ margin: 0, padding: '10px 12px', borderRadius: lang ? '0 10px 10px 10px' : 10, fontSize: '.76rem', fontFamily: '"JetBrains Mono", monospace', lineHeight: 1.6, overflowX: 'auto', background: 'var(--neu-bg)', color: 'var(--neu-text-primary)', boxShadow: 'inset 2px 2px 4px var(--neu-shadow-dark), inset -2px -2px 4px var(--neu-shadow-light)' }}>
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
      while (i < lines.length && lines[i].startsWith('|')) { rows.push(lines[i].split('|').filter(c => c.trim()).map(c => c.trim())); i++ }

      /* Render a table cell — split on <br/> to show bullet points on separate lines */
      const renderCell = (cellText, cellKey) => {
        if (cellText.includes('<br/>') || cellText.includes('<br>')) {
          const parts = cellText.split(/<br\s*\/?>/)
          return parts.map((part, pi) => (
            <div key={`${cellKey}-${pi}`} style={{ marginBottom: pi < parts.length - 1 ? 3 : 0 }}>
              {formatInline(part.trim())}
            </div>
          ))
        }
        return formatInline(cellText)
      }

      elements.push(
        <div key={nextKey()} style={{ overflowX: 'auto', margin: '10px 0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.76rem' }}>
            <thead><tr>{headerCells.map((h, j) => <th key={j} style={{ textAlign: 'left', padding: '7px 10px', borderBottom: '2px solid var(--neu-accent)', fontWeight: 700, fontSize: '.7rem', fontFamily: 'monospace', textTransform: 'uppercase', color: 'var(--neu-accent)', letterSpacing: '.03em' }}>{formatInline(h)}</th>)}</tr></thead>
            <tbody>{rows.map((row, ri) => <tr key={ri} style={{ background: ri % 2 === 0 ? 'transparent' : 'rgba(163,177,198,0.04)' }}>{row.map((c, ci) => <td key={ci} style={{ padding: '8px 10px', borderBottom: '1px solid rgba(163,177,198,0.1)', lineHeight: 1.6, color: '#1a1a1a' }}>{renderCell(c, `${ri}-${ci}`)}</td>)}</tr>)}</tbody>
          </table>
        </div>
      )
      continue
    }

    if (line.startsWith('> ')) {
      const quoteLines = []
      while (i < lines.length && lines[i].startsWith('> ')) { quoteLines.push(lines[i].slice(2)); i++ }
      elements.push(
        <blockquote key={nextKey()} style={{ margin: '10px 0', padding: '10px 14px', borderLeft: '3px solid var(--neu-accent)', background: 'var(--neu-accent-soft)', borderRadius: '0 10px 10px 0', fontSize: '.82rem', color: 'var(--neu-text-primary)', lineHeight: 1.7 }}>
          {quoteLines.map((l, j) => <div key={j}>{formatInline(l)}</div>)}
        </blockquote>
      )
      continue
    }

    if (/^#{1,3}\s/.test(line)) {
      const level = line.match(/^(#+)/)[1].length
      const text = line.replace(/^#+\s*/, '')
      const styles = {
        1: { fontSize: '1.15rem', fontWeight: 800, color: 'var(--neu-accent)', margin: '20px 0 10px', letterSpacing: '-.02em' },
        2: { fontSize: '.95rem', fontWeight: 700, color: 'var(--neu-text-primary)', margin: '16px 0 8px', borderBottom: '1px solid var(--neu-accent)', paddingBottom: 6 },
        3: { fontSize: '.86rem', fontWeight: 700, color: 'var(--neu-accent)', margin: '12px 0 6px' },
      }
      const Tag = `h${level}`
      elements.push(<Tag key={nextKey()} style={styles[level]}>{formatInline(text)}</Tag>)
      i++; continue
    }

    if (/^\d+\.\s/.test(line)) {
      const items = []
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) { items.push(lines[i].replace(/^\d+\.\s*/, '')); i++ }
      elements.push(
        <ol key={nextKey()} style={{ margin: '8px 0', paddingLeft: 20, lineHeight: 1.8, fontSize: '.82rem' }}>
          {items.map((item, j) => <li key={j} style={{ color: 'var(--neu-text-primary)', marginBottom: 2 }}>{formatInline(item)}</li>)}
        </ol>
      )
      continue
    }

    if (/^[-*]\s/.test(line)) {
      const items = []
      while (i < lines.length && /^[-*]\s/.test(lines[i])) { items.push(lines[i].replace(/^[-*]\s*/, '')); i++ }
      elements.push(
        <ul key={nextKey()} style={{ margin: '8px 0', paddingLeft: 20, lineHeight: 1.8, fontSize: '.82rem', listStyle: 'none' }}>
          {items.map((item, j) => <li key={j} style={{ color: 'var(--neu-text-primary)', marginBottom: 2, position: 'relative', paddingLeft: 14 }}><span style={{ position: 'absolute', left: 0, color: 'var(--neu-accent)', fontWeight: 700 }}>•</span>{formatInline(item)}</li>)}
        </ul>
      )
      continue
    }

    if (line.trim() === '') { i++; continue }
    elements.push(<p key={nextKey()} style={{ margin: '6px 0', lineHeight: 1.7, fontSize: '.82rem', color: 'var(--neu-text-primary)' }}>{formatInline(line)}</p>)
    i++
  }
  return elements
}

/* ═══ Explanation storage ═══ */
const EXPLAIN_KEY = 'dp_python_explanations_v1'
function loadExplanations() { try { return JSON.parse(localStorage.getItem(EXPLAIN_KEY)) || {} } catch { return {} } }
function saveExplanation(id, content) { const all = loadExplanations(); all[id] = content; localStorage.setItem(EXPLAIN_KEY, JSON.stringify(all)) }

/* ═══ Notes storage (per-problem) ═══ */
const NOTES_KEY = 'dp_python_notes_v1'
function loadNotes() { try { return JSON.parse(localStorage.getItem(NOTES_KEY)) || {} } catch { return {} } }
function saveNote(id, content) { const all = loadNotes(); all[id] = content; localStorage.setItem(NOTES_KEY, JSON.stringify(all)) }

const DEFAULT_CODE = `# Write your solution here

def solution():
    pass

if __name__ == "__main__":
    print(solution())
`

export default function PythonProblem() {
  const { phaseIdx, topicIdx, probIdx } = useParams()
  const si = Number(phaseIdx), ti = Number(topicIdx), pi = Number(probIdx)
  const navigate = useNavigate()

  const phase = PHASES[si]
  const topic = phase?.topics[ti]
  const problem = topic?.problems[pi]
  const pId = problemId(si, ti, pi)

  const [progress, setProgress] = useState(loadProgress)
  const [code, setCode] = useState('')
  const [output, setOutput] = useState('')
  const [userOutput, setUserOutput] = useState('')
  const [testResults, setTestResults] = useState('')
  const [running, setRunning] = useState(false)
  const [saved, setSaved] = useState(false)
  const [customInput, setCustomInput] = useState('')
  const [showCustom, setShowCustom] = useState(false)
  const [theme, setTheme] = useState(() => localStorage.getItem('dp_dark_mode') === '1' ? 'vs-dark' : 'light')
  const editorRef = useRef(null)
  const autoSaveRef = useRef(null)

  // Explanation state
  const [explanation, setExplanation] = useState('')
  const [explainLoading, setExplainLoading] = useState(false)
  const [showExplanation, setShowExplanation] = useState(false)

  // Notes state
  const [notes, setNotes] = useState('')
  const [showNotes, setShowNotes] = useState(false)
  const [notesSaved, setNotesSaved] = useState(false)
  const [notesWidth, setNotesWidth] = useState(280)
  const notesTimerRef = useRef(null)
  const notesDragRef = useRef(null)


  useEffect(() => {
    const solutions = loadSolutions()
    setCode(solutions[pId] || problem?.starterCode || DEFAULT_CODE)
    setOutput('')
    setUserOutput('')
    setTestResults('')
    // Load existing explanation
    const exps = loadExplanations()
    if (exps[pId]) {
      setExplanation(exps[pId])
      setShowExplanation(true)
    } else {
      setExplanation('')
      setShowExplanation(false)
    }
    // Load notes (always closed on open)
    const allNotes = loadNotes()
    setNotes(allNotes[pId] || '')
    setShowNotes(false)
  }, [pId]) // eslint-disable-line

  useEffect(() => {
    const obs = new MutationObserver(() => {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark'
      setTheme(isDark ? 'vs-dark' : 'light')
    })
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => obs.disconnect()
  }, [])

  if (!problem) {
    return (
      <div style={{ textAlign: 'center', paddingTop: 80 }}>
        <div style={{ fontSize: '3rem', marginBottom: 16 }}>🤔</div>
        <div style={{ color: 'var(--neu-text-secondary)', marginBottom: 24 }}>Problem not found.</div>
        <button className="btn btn-primary" onClick={() => navigate('/python')}>← Back to Roadmap</button>
      </div>
    )
  }

  const status = Number(progress[pId]) || 0
  const meta = STATUS_META[status]
  const diff = DIFFICULTY_COLORS[problem.difficulty]

  const toggleStatus = () => {
    setProgress(prev => {
      const newStatus = cycleStatus(prev[pId])
      const next = { ...prev, [pId]: newStatus }
      saveProgress(next, pId, newStatus)
      return next
    })
  }

  const saveCode = () => {
    saveSolution(pId, code)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  const runCode = async () => {
    setRunning(true)
    setOutput('')
    setUserOutput('')
    setTestResults('')
    saveSolution(pId, code)
    try {
      const res = await fetch('/api/dsa/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language: 'python' }),
      })
      const data = await res.json()
      const raw = data.output || data.error || 'No output'
      setOutput(raw)
      const sep = '═══TEST_RESULTS═══'
      if (raw.includes(sep)) {
        const parts = raw.split(sep)
        setUserOutput(parts[0].trim())
        setTestResults(parts[1].trim())
      } else {
        setUserOutput(raw)
        setTestResults('')
      }
    } catch (e) {
      const err = `Error: ${e.message}\nIs the Flask server running?`
      setOutput(err)
      setUserOutput(err)
    }
    setRunning(false)
  }

  const runCustom = async () => {
    setRunning(true)
    setOutput('')
    setUserOutput('')
    setTestResults('')
    saveSolution(pId, code)
    let funcCode = code
    const marker = '# --- Test cases'
    const idx = code.indexOf(marker)
    if (idx !== -1) funcCode = code.substring(0, idx)
    const customCode = funcCode + '\n' + customInput + '\n'
    try {
      const res = await fetch('/api/dsa/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: customCode, language: 'python' }),
      })
      const data = await res.json()
      const raw = data.output || data.error || 'No output'
      setOutput(raw)
      setUserOutput(raw)
      setTestResults('(custom input mode — tests skipped)')
    } catch (e) {
      setUserOutput(`Error: ${e.message}`)
    }
    setRunning(false)
  }

  const generateExplanation = async () => {
    setExplainLoading(true)
    setShowExplanation(true)
    try {
      const res = await fetch('/api/python/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: problem.title,
          phase_title: `Phase ${phase.phase}: ${phase.title}`,
          topic_label: topic.label,
          difficulty: problem.difficulty,
          description: problem.description || '',
        }),
      })
      const data = await res.json()
      if (data.blog) {
        setExplanation(data.blog)
        saveExplanation(pId, data.blog)
      } else {
        setExplanation(`Error: ${data.error || 'No response'}`)
      }
    } catch (e) {
      setExplanation(`Error: ${e.message}`)
    }
    setExplainLoading(false)
  }

  const handleNotesChange = (val) => {
    setNotes(val)
    setNotesSaved(false)
    clearTimeout(notesTimerRef.current)
    notesTimerRef.current = setTimeout(() => {
      saveNote(pId, val)
      setNotesSaved(true)
      setTimeout(() => setNotesSaved(false), 1500)
    }, 1000)
  }

  const saveNotesNow = () => {
    clearTimeout(notesTimerRef.current)
    saveNote(pId, notes)
    setNotesSaved(true)
    setTimeout(() => setNotesSaved(false), 1500)
  }

  const startNotesDrag = (e) => {
    e.preventDefault()
    const startX = e.clientX
    const startW = notesWidth
    const onMove = (ev) => {
      const newW = Math.min(500, Math.max(200, startW + (ev.clientX - startX)))
      setNotesWidth(newW)
    }
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveCode() }
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); runCode() }
  }

  const getAdjacentProblem = (dir) => {
    let s = si, t = ti, p = pi + dir
    while (true) {
      const ph = PHASES[s]
      if (!ph) return null
      const tp = ph.topics[t]
      if (!tp || p < 0 || p >= (tp?.problems.length || 0)) {
        t += dir
        if (t < 0 || t >= (ph?.topics.length || 0)) {
          s += dir
          if (s < 0 || s >= PHASES.length) return null
          t = dir > 0 ? 0 : PHASES[s].topics.length - 1
        }
        const nextTopic = PHASES[s]?.topics[t]
        p = dir > 0 ? 0 : (nextTopic?.problems.length || 1) - 1
        if (PHASES[s]?.topics[t]?.problems[p]) return { s, t, p }
        continue
      }
      return { s, t, p }
    }
  }

  const prev = getAdjacentProblem(-1)
  const next = getAdjacentProblem(1)

  return (
    <div className="study-editor"
      style={{
        width: '100%', maxWidth: '100%',
        marginLeft: 0, padding: 0, boxSizing: 'border-box',
        display: 'flex', flexDirection: 'column', height: 'calc(100svh - 100px)', minHeight: 620,
      }}
      onKeyDown={handleKeyDown}
    >
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap', flexShrink: 0 }}>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/python')}>← Roadmap</button>
        {prev && <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/python/${prev.s}/${prev.t}/${prev.p}`)}>← Prev</button>}
        {next && <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/python/${next.s}/${next.t}/${next.p}`)}>Next →</button>}

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Generate / Open Blog button */}
          {!explanation && !explainLoading ? (
            <button
              onClick={generateExplanation}
              style={{
                padding: '5px 14px', borderRadius: 999, border: 'none',
                background: 'var(--neu-accent)',
                color: 'var(--neu-surface)', fontSize: '.72rem', fontWeight: 700, cursor: 'pointer',
                boxShadow: '0 3px 10px rgba(37,99,235,0.3)',
                display: 'flex', alignItems: 'center', gap: 5,
              }}
            >Generate lesson</button>
          ) : explainLoading ? (
            <span style={{
              padding: '5px 14px', borderRadius: 999,
              background: 'var(--neu-accent)',
              color: 'var(--neu-surface)', fontSize: '.72rem', fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: 5,
            }}>⏳ Generating…</span>
          ) : (
            <button
              onClick={() => setShowExplanation(v => !v)}
              style={{
                padding: '5px 14px', borderRadius: 999, border: 'none',
                background: showExplanation
                  ? 'var(--neu-accent)'
                  : 'var(--neu-bg)',
                color: showExplanation ? 'var(--neu-surface)' : 'var(--neu-accent)',
                fontSize: '.72rem', fontWeight: 700, cursor: 'pointer',
                boxShadow: showExplanation
                  ? '0 3px 10px rgba(124,58,237,0.3)'
                  : '3px 3px 6px var(--neu-shadow-dark), -3px -3px 6px var(--neu-shadow-light)',
                display: 'flex', alignItems: 'center', gap: 5,
              }}
            >{showExplanation ? 'Close lesson' : 'Read lesson'}</button>
          )}

          <button
            onClick={() => setShowNotes(v => !v)}
            style={{
              padding: '5px 14px', borderRadius: 999, border: 'none',
              background: showNotes
                ? 'var(--neu-accent)'
                : 'var(--neu-bg)',
              color: showNotes ? 'var(--neu-surface)' : 'var(--neu-text-secondary)',
              fontSize: '.72rem', fontWeight: 700, cursor: 'pointer',
              boxShadow: showNotes
                ? '0 3px 10px rgba(245,158,11,0.3)'
                : '3px 3px 6px var(--neu-shadow-dark), -3px -3px 6px var(--neu-shadow-light)',
              display: 'flex', alignItems: 'center', gap: 5,
            }}
          >{showNotes ? '✕ Close Notes' : 'Notes'}{notes ? ' •' : ''}</button>

          <button title={meta.tip} onClick={toggleStatus} style={{
            padding: '4px 12px', borderRadius: 999, border: `2px solid ${meta.color}`,
            background: status === 2 ? meta.color : 'transparent',
            color: status === 2 ? '#fff' : meta.color,
            fontSize: '.72rem', fontWeight: 700, cursor: 'pointer',
          }}>{meta.label} {meta.tip}</button>
          <span style={{ fontSize: '.68rem', fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: diff.bg, color: diff.color }}>{problem.difficulty}</span>
        </div>
      </div>

      {/* Problem header */}
      <div style={{
        background: 'var(--neu-bg)', borderRadius: 14, padding: '12px 18px', marginBottom: 10,
        boxShadow: '4px 4px 8px var(--neu-shadow-dark), -4px -4px 8px var(--neu-shadow-light)',
        borderLeft: '4px solid var(--neu-accent)', flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <span className="course-ordinal">{String(phase.phase).padStart(2, '0')}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--neu-text-primary)' }}>{problem.title}</div>
          <div style={{ fontSize: '.8125rem', color: 'var(--neu-text-secondary)', fontFamily: 'inherit', marginTop: 4 }}>
            Phase {phase.phase}: {phase.title} → {topic.label}
          </div>
        </div>
      </div>

      {/* Main area: split view */}
      <div className="study-editor-split" style={{ flex: 1, display: 'flex', gap: 0, minHeight: 0 }}>

        {/* Notes panel — left side, resizable */}
        {showNotes && (
          <>
            <div style={{
              width: notesWidth, minWidth: 200, maxWidth: 500, flexShrink: 0,
              background: 'var(--neu-bg)', borderRadius: '14px 0 0 14px', padding: '14px 16px',
              boxShadow: '4px 4px 8px var(--neu-shadow-dark), -4px -4px 8px var(--neu-shadow-light)',
              borderLeft: '4px solid #f59e0b',
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, flexShrink: 0,
              }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#f59e0b' }} />
                <span style={{ fontSize: '.7rem', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '.05em', fontFamily: 'monospace' }}>Notes</span>
                <div style={{ flex: 1 }} />
                {notesSaved && <span style={{ fontSize: '.6rem', color: '#22c55e', fontWeight: 600 }}>Saved</span>}
                <button onClick={saveNotesNow} style={{
                  padding: '2px 7px', borderRadius: 999, border: 'none',
                  background: 'var(--neu-bg)', cursor: 'pointer',
                  color: 'var(--neu-text-secondary)', fontSize: '.6rem', fontWeight: 700,
                  boxShadow: '2px 2px 4px var(--neu-shadow-dark), -2px -2px 4px var(--neu-shadow-light)',
                }}>💾</button>
                <button onClick={() => setShowNotes(false)} style={{
                  width: 20, height: 20, borderRadius: '50%', border: 'none',
                  background: 'var(--neu-bg)', cursor: 'pointer',
                  color: 'var(--neu-text-secondary)', fontSize: '.68rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '2px 2px 4px var(--neu-shadow-dark), -2px -2px 4px var(--neu-shadow-light)',
                }}>✕</button>
              </div>
              <textarea
                value={notes}
                onChange={e => handleNotesChange(e.target.value)}
                onBlur={saveNotesNow}
                placeholder="Write your notes, observations, key learnings for this problem..."
                style={{
                  flex: 1, margin: 0, padding: '8px 10px', border: 'none', outline: 'none',
                  background: 'transparent', resize: 'none',
                  fontSize: '.8rem', fontFamily: '"JetBrains Mono", monospace',
                  color: 'var(--neu-text-primary)', lineHeight: 1.7,
                }}
              />
            </div>
            {/* Drag handle */}
            <div
              className="study-panel-resizer" onMouseDown={startNotesDrag}
              style={{
                width: 6, cursor: 'col-resize', flexShrink: 0,
                background: 'transparent', position: 'relative', zIndex: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <div style={{
                width: 4, height: 40, borderRadius: 4,
                background: 'rgba(163,177,198,0.3)',
                transition: 'background .15s',
              }}
                onMouseEnter={e => e.currentTarget.style.background = '#f59e0b'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(163,177,198,0.3)'}
              />
            </div>
          </>
        )}

        {/* Problem + Blog + Editor container */}
        <div style={{ flex: 1, display: 'flex', gap: 8, minWidth: 0 }}>

        {/* Problem description (always visible) */}
        <div style={{
          width: showExplanation ? '20%' : '30%', minWidth: showExplanation ? 220 : 260,
          background: 'var(--neu-bg)', borderRadius: 14, padding: '18px 20px',
          boxShadow: '4px 4px 8px var(--neu-shadow-dark), -4px -4px 8px var(--neu-shadow-light)',
          overflowY: 'auto', display: 'flex', flexDirection: 'column',
          transition: 'width .25s, min-width .25s',
        }}>
          {problem.description ? (
            <div style={{ fontSize: '.84rem', lineHeight: 1.8, color: 'var(--neu-text-primary)', overflow: 'hidden', wordBreak: 'break-word' }}
              className="problem-desc"
              dangerouslySetInnerHTML={{ __html: problem.description }} />
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--neu-text-secondary)', textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📝</div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Problem description coming soon</div>
              <div style={{ fontSize: '.78rem', fontFamily: 'monospace' }}>Read the starter code to understand the task</div>
            </div>
          )}

          <div style={{
            marginTop: 'auto', paddingTop: 12, flexShrink: 0,
            borderTop: '1px solid rgba(163,177,198,0.15)',
            fontSize: '.7rem', color: 'var(--neu-text-secondary)', fontFamily: 'monospace',
          }}>
            <div>⌘+S / Ctrl+S → Save</div>
            <div>⌘+Enter / Ctrl+Enter → Run</div>
          </div>
        </div>

        {/* Middle: Blog panel (slides in when open) */}
        {showExplanation && (
          <div style={{
            width: '30%', minWidth: 300,
            background: 'var(--neu-bg)', borderRadius: 14, padding: '18px 22px',
            boxShadow: '4px 4px 8px var(--neu-shadow-dark), -4px -4px 8px var(--neu-shadow-light)',
            borderLeft: '4px solid #7c3aed',
            overflowY: 'auto', display: 'flex', flexDirection: 'column',
          }}>
            {/* Blog header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: 14, flexShrink: 0,
            }}>
              <div style={{
                fontSize: '.72rem', fontWeight: 700, color: '#7c3aed',
                textTransform: 'uppercase', letterSpacing: '.05em', fontFamily: 'monospace',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#7c3aed' }} />
                Concept Explanation
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={generateExplanation}
                  disabled={explainLoading}
                  style={{
                    padding: '3px 10px', borderRadius: 999, border: 'none',
                    background: 'var(--neu-bg)', cursor: explainLoading ? 'wait' : 'pointer',
                    color: '#7c3aed', fontSize: '.66rem', fontWeight: 700,
                    boxShadow: '2px 2px 4px var(--neu-shadow-dark), -2px -2px 4px var(--neu-shadow-light)',
                  }}
                >{explainLoading ? '⏳' : '🔄'} Regenerate</button>
                <button
                  onClick={() => setShowExplanation(false)}
                  style={{
                    width: 26, height: 26, borderRadius: '50%', border: 'none',
                    background: 'var(--neu-bg)', cursor: 'pointer',
                    color: 'var(--neu-text-secondary)', fontSize: '.8rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '2px 2px 4px var(--neu-shadow-dark), -2px -2px 4px var(--neu-shadow-light)',
                  }}
                >✕</button>
              </div>
            </div>

            {/* Blog content with highlight support */}
            {explainLoading ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 14 }}>🧠</div>
                <div style={{ fontSize: '.88rem', color: 'var(--neu-text-secondary)', fontWeight: 600 }}>Generating detailed explanation…</div>
                <div style={{ fontSize: '.75rem', color: 'var(--neu-text-secondary)', marginTop: 8, fontFamily: 'monospace' }}>This may take 15-30 seconds</div>
              </div>
            ) : explanation ? (
              <BlogHighlighter storageKey={`pyprob_${pId}`} topicContext={`${topic?.label || ''} - ${problem?.title || ''}`}>
                <div style={{ flex: 1 }}>
                  {renderMarkdown(explanation)}
                </div>
              </BlogHighlighter>
            ) : null}
          </div>
        )}

        {/* Right: Editor + Output */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>

          {/* Editor toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <span style={{
              fontSize: '.72rem', fontWeight: 700, color: 'var(--neu-accent)',
              background: 'var(--neu-accent-soft)', padding: '3px 10px', borderRadius: 999,
              fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '.05em',
            }}>Python</span>
            <div style={{ flex: 1 }} />
            <button className="btn btn-secondary btn-sm" onClick={() => setShowCustom(v => !v)}
              style={{ fontSize: '.72rem', color: showCustom ? 'var(--neu-accent)' : undefined }}>
              {showCustom ? '✎ Custom On' : '✎ Custom Input'}
            </button>
            <button className="btn btn-secondary btn-sm" onClick={saveCode} style={{ fontSize: '.72rem' }}>
              {saved ? '✓ Saved' : 'Save'}
            </button>
            {showCustom ? (
              <button className="btn btn-primary btn-sm" onClick={runCustom} disabled={running} style={{ fontSize: '.72rem' }}>
                {running ? '⏳ Running…' : '▶ Run Custom'}
              </button>
            ) : (
              <button className="btn btn-primary btn-sm" onClick={runCode} disabled={running} style={{ fontSize: '.72rem' }}>
                {running ? '⏳ Running…' : '▶ Run'}
              </button>
            )}
          </div>

          {/* Custom input */}
          {showCustom && (
            <div style={{
              flexShrink: 0, background: 'var(--neu-bg)', borderRadius: 12,
              boxShadow: 'inset 2px 2px 4px var(--neu-shadow-dark), inset -2px -2px 4px var(--neu-shadow-light)',
              padding: '8px 12px',
            }}>
              <div style={{ fontSize: '.65rem', fontWeight: 700, color: 'var(--neu-text-secondary)', textTransform: 'uppercase', fontFamily: 'monospace', marginBottom: 4 }}>
                Custom Input (Python code to call your function)
              </div>
              <textarea value={customInput} onChange={e => setCustomInput(e.target.value)}
                placeholder="e.g. print(my_function(5))"
                style={{ width: '100%', minHeight: 48, maxHeight: 100, resize: 'vertical', background: 'transparent', border: 'none', outline: 'none', fontFamily: '"JetBrains Mono", monospace', fontSize: '.78rem', color: 'var(--neu-text-primary)', lineHeight: 1.6 }} />
            </div>
          )}

          {/* Monaco Editor */}
          <div style={{ flex: 1, borderRadius: 14, overflow: 'hidden', boxShadow: 'inset 3px 3px 6px var(--neu-shadow-dark), inset -3px -3px 6px var(--neu-shadow-light)' }}>
            <Editor height="100%" language="python" theme={theme} value={code}
              onChange={val => {
                setCode(val || '')
                clearTimeout(autoSaveRef.current)
                autoSaveRef.current = setTimeout(() => {
                  saveSolution(pId, val || '')
                  setSaved(true)
                  setTimeout(() => setSaved(false), 1500)
                }, 1500)
              }}
              onMount={editor => { editorRef.current = editor }}
              options={{ fontSize: 14, minimap: { enabled: false }, scrollBeyondLastLine: false, padding: { top: 12 }, lineNumbers: 'on', renderLineHighlight: 'all', wordWrap: 'on', tabSize: 4, automaticLayout: true }} />
          </div>

          {/* Output panels */}
          <div style={{ height: 180, flexShrink: 0, display: 'flex', gap: 8 }}>
            <div style={{ flex: 1, background: 'var(--neu-bg)', borderRadius: 14, boxShadow: 'inset 3px 3px 6px var(--neu-shadow-dark), inset -3px -3px 6px var(--neu-shadow-light)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ padding: '6px 14px', borderBottom: '1px solid rgba(163,177,198,0.12)', fontSize: '.7rem', fontWeight: 700, color: 'var(--neu-text-secondary)', textTransform: 'uppercase', letterSpacing: '.05em', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: userOutput.includes('Error') || userOutput.includes('Traceback') ? '#ef4444' : userOutput ? '#2979FF' : '#94a3b8' }} />
                Your Output
              </div>
              <pre style={{ flex: 1, margin: 0, padding: '10px 14px', fontSize: '.78rem', fontFamily: '"JetBrains Mono", monospace', color: userOutput.includes('Error') || userOutput.includes('Traceback') ? '#ef4444' : 'var(--neu-text-primary)', overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
                {running ? 'Running...' : userOutput || (output ? '(no direct output)' : 'Click "▶ Run" or press ⌘+Enter')}
              </pre>
            </div>

            <div style={{ flex: 1, background: 'var(--neu-bg)', borderRadius: 14, boxShadow: 'inset 3px 3px 6px var(--neu-shadow-dark), inset -3px -3px 6px var(--neu-shadow-light)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ padding: '6px 14px', borderBottom: '1px solid rgba(163,177,198,0.12)', fontSize: '.7rem', fontWeight: 700, color: 'var(--neu-text-secondary)', textTransform: 'uppercase', letterSpacing: '.05em', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: testResults.includes('FAILED') ? '#ef4444' : testResults.includes('PASSED') ? '#22c55e' : '#94a3b8' }} />
                Test Results
              </div>
              <pre style={{ flex: 1, margin: 0, padding: '10px 14px', fontSize: '.78rem', fontFamily: '"JetBrains Mono", monospace', color: testResults.includes('FAILED') ? '#ef4444' : testResults.includes('PASSED') ? '#22c55e' : 'var(--neu-text-primary)', overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
                {running ? 'Running...' : testResults || (output ? '(no test harness found)' : 'Tests will appear here after running')}
              </pre>
            </div>
          </div>

        </div>
        </div>{/* end Problem+Blog+Editor container */}
      </div>
    </div>
  )
}
