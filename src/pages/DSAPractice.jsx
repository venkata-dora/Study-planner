import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Editor from '@monaco-editor/react'
import mermaid from 'mermaid'
import { STEPS, loadProgress, problemId } from '../data/dsaData'

mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'loose' })

const HISTORY_KEY = 'dp_dsa_practice_history_v1'

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [] }
  catch { return [] }
}
function saveHistory(h) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(h))
}

/* ─── Markdown Renderer ─── */
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
  return <div ref={ref} style={{ margin: '12px 0', padding: 12, background: 'var(--neu-bg)', borderRadius: 12, textAlign: 'center', boxShadow: 'inset 3px 3px 6px var(--neu-shadow-dark), inset -3px -3px 6px var(--neu-shadow-light)', overflow: 'auto' }} />
}

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
    if (/^---+$/.test(line.trim())) { elements.push(<hr key={nextKey()} style={{ border: 'none', borderTop: '1px solid rgba(163,177,198,0.25)', margin: '16px 0' }} />); i++; continue }
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
          <div key={nextKey()} style={{ margin: '12px 0' }}>
            {lang && <div style={{ fontSize: '.6rem', fontFamily: 'monospace', fontWeight: 700, color: 'var(--neu-accent)', background: 'var(--neu-accent-soft)', padding: '3px 10px', borderRadius: '10px 10px 0 0', display: 'inline-block', textTransform: 'uppercase' }}>{lang}</div>}
            <pre style={{ margin: 0, padding: '12px 14px', borderRadius: lang ? '0 10px 10px 10px' : 10, fontSize: '.8rem', fontFamily: '"JetBrains Mono", monospace', lineHeight: 1.6, overflowX: 'auto', background: 'var(--neu-bg)', color: 'var(--neu-text-primary)', boxShadow: 'inset 3px 3px 6px var(--neu-shadow-dark), inset -3px -3px 6px var(--neu-shadow-light)' }}>
              {codeLines.join('\n')}
            </pre>
          </div>
        )
      }
      continue
    }
    if (/^#{1,3}\s/.test(line)) {
      const level = line.match(/^(#+)/)[1].length
      const text = line.replace(/^#+\s*/, '')
      const styles = {
        1: { fontSize: '1.4rem', fontWeight: 800, color: 'var(--neu-accent)', margin: '24px 0 12px' },
        2: { fontSize: '1.1rem', fontWeight: 700, color: 'var(--neu-text-primary)', margin: '20px 0 8px', borderBottom: '2px solid var(--neu-accent)', paddingBottom: 6 },
        3: { fontSize: '.95rem', fontWeight: 700, color: 'var(--neu-accent)', margin: '16px 0 6px' },
      }
      const Tag = `h${level}`
      elements.push(<Tag key={nextKey()} style={styles[level]}>{formatInline(text)}</Tag>)
      i++; continue
    }
    if (/^[-*]\s/.test(line)) {
      const items = []
      while (i < lines.length && /^[-*]\s/.test(lines[i])) { items.push(lines[i].replace(/^[-*]\s*/, '')); i++ }
      elements.push(
        <ul key={nextKey()} style={{ margin: '8px 0', paddingLeft: 20, lineHeight: 1.8, fontSize: '.85rem', listStyle: 'none' }}>
          {items.map((item, j) => <li key={j} style={{ color: 'var(--neu-text-primary)', marginBottom: 2, position: 'relative', paddingLeft: 14 }}><span style={{ position: 'absolute', left: 0, color: 'var(--neu-accent)', fontWeight: 700 }}>•</span>{formatInline(item)}</li>)}
        </ul>
      )
      continue
    }
    if (/^\d+\.\s/.test(line)) {
      const items = []
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) { items.push(lines[i].replace(/^\d+\.\s*/, '')); i++ }
      elements.push(
        <ol key={nextKey()} style={{ margin: '8px 0', paddingLeft: 20, lineHeight: 1.8, fontSize: '.85rem' }}>
          {items.map((item, j) => <li key={j} style={{ color: 'var(--neu-text-primary)', marginBottom: 2 }}>{formatInline(item)}</li>)}
        </ol>
      )
      continue
    }
    if (line.startsWith('> ')) {
      const quoteLines = []
      while (i < lines.length && lines[i].startsWith('> ')) { quoteLines.push(lines[i].slice(2)); i++ }
      elements.push(
        <blockquote key={nextKey()} style={{ margin: '12px 0', padding: '10px 16px', borderLeft: '4px solid var(--neu-accent)', background: 'var(--neu-accent-soft)', borderRadius: '0 10px 10px 0', fontSize: '.85rem', lineHeight: 1.7 }}>
          {quoteLines.map((l, j) => <div key={j}>{formatInline(l)}</div>)}
        </blockquote>
      )
      continue
    }
    if (line.trim() === '') { i++; continue }
    elements.push(<p key={nextKey()} style={{ margin: '8px 0', lineHeight: 1.8, fontSize: '.85rem', color: 'var(--neu-text-primary)' }}>{formatInline(line)}</p>)
    i++
  }
  return elements
}

/* ─── Get completed topic labels from progress ─── */
function getCompletedTopics() {
  const progress = loadProgress()
  const completed = new Set()
  STEPS.forEach((step, si) => {
    step.topics.forEach((topic, ti) => {
      const anyDone = topic.problems.some((_, pi) => Number(progress[problemId(si, ti, pi)]) >= 1)
      if (anyDone) completed.add(topic.label)
    })
  })
  return [...completed]
}

function getAllTopicLabels() {
  const labels = []
  STEPS.forEach(step => {
    step.topics.forEach(topic => labels.push(topic.label))
  })
  return labels
}

const DIFF_COLORS = {
  Easy:   { bg: 'rgba(34,197,94,0.12)', color: '#22c55e', grad: 'linear-gradient(135deg, #22c55e, #16a34a)' },
  Medium: { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b', grad: 'linear-gradient(135deg, #f59e0b, #d97706)' },
  Hard:   { bg: 'rgba(239,68,68,0.12)', color: '#ef4444', grad: 'linear-gradient(135deg, #ef4444, #dc2626)' },
}

export default function DSAPractice() {
  const navigate = useNavigate()
  const [question, setQuestion] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [difficulty, setDifficulty] = useState('Medium')
  const [code, setCode] = useState('')
  const [output, setOutput] = useState('')
  const [running, setRunning] = useState(false)
  const [showHints, setShowHints] = useState(false)
  const [showSolution, setShowSolution] = useState(false)
  const [history, setHistory] = useState(loadHistory)
  const [showHistory, setShowHistory] = useState(false)

  const completedTopics = getCompletedTopics()
  const allTopics = getAllTopicLabels()
  const hasCompleted = completedTopics.length > 0

  const generateQuestion = async (diff) => {
    const topicsToUse = hasCompleted ? completedTopics : allTopics.slice(0, 5)
    setLoading(true)
    setError(null)
    setQuestion(null)
    setCode('')
    setOutput('')
    setShowHints(false)
    setShowSolution(false)

    try {
      const res = await fetch('/api/dsa/random-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed_topics: topicsToUse, difficulty: diff || difficulty }),
      })
      const data = await res.json()
      if (data.question) {
        setQuestion(data.question)
        setCode(data.question.starter_code || '')
        const entry = {
          title: data.question.title,
          difficulty: data.question.difficulty,
          topics: data.question.topics_tested,
          timestamp: new Date().toISOString(),
        }
        const newHistory = [entry, ...history].slice(0, 50)
        setHistory(newHistory)
        saveHistory(newHistory)
      } else {
        setError(data.error || 'Failed to generate question')
      }
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  const runCode = async () => {
    setRunning(true)
    setOutput('')
    try {
      const res = await fetch('/api/dsa/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const data = await res.json()
      setOutput(data.output || data.error || 'No output')
    } catch (e) {
      setOutput(`Error: ${e.message}`)
    }
    setRunning(false)
  }

  const testParts = output.split('═══TEST_RESULTS═══')
  const stdOut = testParts[0]?.trimEnd() || ''
  const testOut = testParts[1]?.trim() || ''
  const testLines = testOut ? testOut.split('\n').filter(l => l.trim()) : []
  const passCount = testLines.filter(l => l.includes('PASS')).length
  const failCount = testLines.filter(l => l.includes('FAIL')).length
  const allPass = testLines.length > 0 && failCount === 0

  if (showHistory) {
    return (
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <div className="prep-header">
          <h1>🕐 DSA Practice History</h1>
          <p>YOUR GENERATED QUESTIONS LOG</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => setShowHistory(false)} style={{ marginBottom: 16 }}>← Back</button>

        {history.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--neu-text-secondary)', fontSize: '.9rem' }}>
            No practice questions generated yet. Start practicing!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {history.map((h, idx) => {
              const dc = DIFF_COLORS[h.difficulty] || DIFF_COLORS.Medium
              return (
                <div key={idx} style={{
                  background: 'var(--neu-bg)', borderRadius: 14, padding: '12px 16px',
                  boxShadow: '3px 3px 6px var(--neu-shadow-dark), -3px -3px 6px var(--neu-shadow-light)',
                  display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <span style={{
                    fontSize: '.64rem', fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                    background: dc.bg, color: dc.color, fontFamily: 'monospace', flexShrink: 0,
                  }}>{h.difficulty}</span>
                  <span style={{ flex: 1, fontSize: '.84rem', fontWeight: 600, color: 'var(--neu-text-primary)' }}>{h.title}</span>
                  <span style={{ fontSize: '.68rem', color: 'var(--neu-text-secondary)', fontFamily: 'monospace' }}>
                    {h.topics?.join(', ')}
                  </span>
                  <span style={{ fontSize: '.65rem', color: 'var(--neu-text-secondary)', fontFamily: 'monospace', flexShrink: 0 }}>
                    {new Date(h.timestamp).toLocaleDateString()}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="coding-practice" style={{ maxWidth: '100%', margin: '0 auto' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <div className="prep-header">
          <span className="learning-eyebrow">PRACTICE & APPLY</span><h1>DSA practice</h1>
          <p>Build confidence with a challenge based on the topics you’ve studied.</p>
        </div>

        <div className="flex gap-sm items-center" style={{ marginBottom: 20, flexWrap: 'wrap' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/dsa')}>← Back to Sheet</button>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowHistory(true)}>
            🕐 History ({history.length})
          </button>
          <div style={{ marginLeft: 'auto' }} />
          <span style={{ fontSize: '.75rem', color: 'var(--neu-text-secondary)', fontFamily: 'monospace' }}>
            {completedTopics.length}/{allTopics.length} topics practiced
          </span>
        </div>

        {/* Topics Covered */}
        <div style={{
          background: 'var(--neu-bg)', borderRadius: 16, padding: '14px 18px', marginBottom: 20,
          boxShadow: '4px 4px 8px var(--neu-shadow-dark), -4px -4px 8px var(--neu-shadow-light)',
        }}>
          <div style={{ fontSize: '.75rem', fontWeight: 700, color: 'var(--neu-accent)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.04em' }}>
            Topics you've practiced ({completedTopics.length})
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {completedTopics.length > 0 ? completedTopics.map((t, i) => (
              <span key={i} style={{
                fontSize: '.7rem', padding: '3px 10px', borderRadius: 999,
                background: 'var(--neu-accent-soft)', color: 'var(--neu-accent)',
                fontWeight: 600, fontFamily: 'monospace',
              }}>{t}</span>
            )) : (
              <span style={{ fontSize: '.78rem', color: 'var(--neu-text-secondary)' }}>
                No topics completed yet — questions will use introductory topics
              </span>
            )}
          </div>
        </div>

        {/* Generate Controls */}
        {!question && !loading && (
          <div className="practice-start" style={{
            background: 'var(--neu-bg)', borderRadius: 20, padding: '28px 32px', marginBottom: 24,
            boxShadow: '6px 6px 12px var(--neu-shadow-dark), -6px -6px 12px var(--neu-shadow-light)',
            textAlign: 'center',
          }}>
            <span className="learning-eyebrow">ONE CHALLENGE AT A TIME</span>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--neu-text-primary)', marginBottom: 6 }}>
              Choose your challenge
            </h2>
            <p style={{ fontSize: '.82rem', color: 'var(--neu-text-secondary)', marginBottom: 20, maxWidth: 500, margin: '0 auto 20px' }}>
              Get a random interview-style DSA challenge that combines topics you've already learned. Choose your difficulty:
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              {['Easy', 'Medium', 'Hard'].map(d => {
                const dc = DIFF_COLORS[d]
                return (
                  <button
                    key={d}
                    className="practice-difficulty"
                    onClick={() => { setDifficulty(d); generateQuestion(d) }}
                    style={{
                      padding: '12px 28px', borderRadius: 14, border: 'none', cursor: 'pointer',
                      background: dc.grad, color: '#fff', fontWeight: 700, fontSize: '.88rem',
                      boxShadow: `4px 4px 10px ${dc.color}40`,
                      transition: 'transform .15s, box-shadow .15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `6px 6px 16px ${dc.color}50` }}
                    onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = `4px 4px 10px ${dc.color}40` }}
                  >
                    {d}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{
            background: 'var(--neu-bg)', borderRadius: 20, padding: '40px 32px',
            boxShadow: '6px 6px 12px var(--neu-shadow-dark), -6px -6px 12px var(--neu-shadow-light)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '2rem', marginBottom: 12 }}>⏳</div>
            <div style={{ fontSize: '.9rem', color: 'var(--neu-text-primary)', fontWeight: 600 }}>Generating your challenge...</div>
            <div style={{ fontSize: '.75rem', color: 'var(--neu-text-secondary)', marginTop: 6 }}>
              Crafting an interview-style problem from your learned topics
            </div>
            <div style={{ marginTop: 16, height: 4, background: 'var(--neu-bg)', borderRadius: 999, overflow: 'hidden', maxWidth: 300, margin: '16px auto 0', boxShadow: 'inset 2px 2px 4px var(--neu-shadow-dark), inset -2px -2px 4px var(--neu-shadow-light)' }}>
              <div style={{ width: '60%', height: '100%', background: 'var(--neu-accent)', borderRadius: 999, animation: 'pulse 1.5s ease-in-out infinite' }} />
            </div>
          </div>
        )}

        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 12, padding: '12px 16px', marginBottom: 16, color: '#ef4444', fontSize: '.82rem',
          }}>
            {error}
            <button className="btn btn-secondary btn-sm" onClick={() => generateQuestion()} style={{ marginLeft: 12 }}>Retry</button>
          </div>
        )}
      </div>

      {/* Question + Editor Layout */}
      {question && !loading && (
        <div style={{ display: 'flex', gap: 0, height: 'calc(100vh - 120px)' }}>
          {/* Left: Problem Description */}
          <div style={{
            width: '35%', minWidth: 300, overflowY: 'auto',
            background: 'var(--neu-bg)', padding: '20px 24px',
            borderRight: '1px solid rgba(163,177,198,0.15)',
          }}>
            <div className="flex gap-sm items-center" style={{ marginBottom: 14, flexWrap: 'wrap' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => { setQuestion(null); setCode(''); setOutput('') }}>← New Question</button>
              <button
                className="btn btn-sm"
                onClick={() => generateQuestion()}
                style={{
                  background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                  color: '#fff', border: 'none',
                }}
              >🔀 Skip / Next</button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--neu-text-primary)', margin: 0 }}>
                {question.title}
              </h2>
              <span style={{
                fontSize: '.64rem', fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                background: DIFF_COLORS[question.difficulty]?.bg, color: DIFF_COLORS[question.difficulty]?.color,
                fontFamily: 'monospace',
              }}>{question.difficulty}</span>
            </div>

            {question.topics_tested?.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 14 }}>
                {question.topics_tested.map((t, i) => (
                  <span key={i} style={{
                    fontSize: '.65rem', padding: '2px 8px', borderRadius: 999,
                    background: 'var(--neu-accent-soft)', color: 'var(--neu-accent)',
                    fontWeight: 600, fontFamily: 'monospace',
                  }}>{t}</span>
                ))}
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              {renderMarkdown(question.description)}
            </div>

            <div style={{ marginBottom: 14 }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setShowHints(!showHints)}
                style={{ fontSize: '.72rem' }}
              >
                {showHints ? '🙈 Hide Hints' : '💡 Show Hints'} ({question.hints?.length || 0})
              </button>
              {showHints && question.hints && (
                <div style={{
                  marginTop: 8, padding: '12px 14px', borderRadius: 12,
                  background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)',
                }}>
                  <ol style={{ margin: 0, paddingLeft: 18, fontSize: '.8rem', lineHeight: 1.8, color: 'var(--neu-text-primary)' }}>
                    {question.hints.map((h, i) => <li key={i}>{h}</li>)}
                  </ol>
                </div>
              )}
            </div>

            <div>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setShowSolution(!showSolution)}
                style={{ fontSize: '.72rem' }}
              >
                {showSolution ? '🙈 Hide Solution' : '🔑 Solution Approach'}
              </button>
              {showSolution && question.solution_approach && (
                <div style={{
                  marginTop: 8, padding: '12px 14px', borderRadius: 12,
                  background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)',
                  fontSize: '.82rem', lineHeight: 1.7, color: 'var(--neu-text-primary)',
                }}>
                  {question.solution_approach}
                </div>
              )}
            </div>
          </div>

          {/* Right: Editor + Output */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
              background: 'var(--neu-bg)',
              borderBottom: '1px solid rgba(163,177,198,0.15)',
            }}>
              <span style={{ fontSize: '.72rem', fontWeight: 700, color: 'var(--neu-accent)', fontFamily: 'monospace', textTransform: 'uppercase' }}>
                solution.py
              </span>
              <div style={{ flex: 1 }} />
              <button
                onClick={runCode}
                disabled={running}
                className="btn btn-primary btn-sm"
                style={{ fontSize: '.72rem' }}
              >
                {running ? '⏳ Running…' : '▶ Run Code'}
              </button>
              <span style={{ fontSize: '.65rem', color: 'var(--neu-text-secondary)' }}>Ctrl+Enter</span>
            </div>

            <div style={{ flex: 1, minHeight: 0 }}>
              <Editor
                height="100%"
                defaultLanguage="python"
                value={code}
                onChange={v => setCode(v || '')}
                theme="vs-dark"
                onMount={(editor) => {
                  editor.addCommand(2048 | 3, () => runCode())
                }}
                options={{
                  fontSize: 14, minimap: { enabled: false },
                  padding: { top: 12 }, lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  wordWrap: 'on',
                }}
              />
            </div>

            {output && (
              <div style={{
                maxHeight: 220, overflowY: 'auto', padding: '10px 14px',
                background: '#1e1e1e', borderTop: '1px solid rgba(163,177,198,0.15)',
              }}>
                {testLines.length > 0 && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8,
                    padding: '6px 12px', borderRadius: 8,
                    background: allPass ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                    border: `1px solid ${allPass ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                  }}>
                    <span style={{ fontSize: '1rem' }}>{allPass ? '✅' : '❌'}</span>
                    <span style={{ fontSize: '.78rem', fontWeight: 700, color: allPass ? '#22c55e' : '#ef4444' }}>
                      {allPass ? 'All Tests Passed!' : `${passCount} passed, ${failCount} failed`}
                    </span>
                  </div>
                )}
                {stdOut && (
                  <pre style={{ margin: 0, fontSize: '.78rem', color: '#d4d4d4', fontFamily: '"JetBrains Mono", monospace', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                    {stdOut}
                  </pre>
                )}
                {testOut && (
                  <pre style={{ margin: stdOut ? '8px 0 0' : 0, fontSize: '.78rem', fontFamily: '"JetBrains Mono", monospace', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                    {testLines.map((l, i) => (
                      <div key={i} style={{ color: l.includes('PASS') ? '#22c55e' : l.includes('FAIL') ? '#ef4444' : '#d4d4d4' }}>
                        {l}
                      </div>
                    ))}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
