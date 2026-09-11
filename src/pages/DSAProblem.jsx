import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Editor from '@monaco-editor/react'
import {
  STEPS, loadProgress, saveProgress, loadSolutions, saveSolution,
  problemId, cycleStatus, STATUS_META, DIFFICULTY_COLORS,
  syncFromDB, loadNotes, saveNote,
} from '../data/dsaData'
import DSAVisualizer from '../components/DSAVisualizer'

const DEFAULT_CODE = `# Write your solution here

def solution():
    pass

# Test your solution
if __name__ == "__main__":
    print(solution())
`

export default function DSAProblem() {
  const { stepIdx, topicIdx, probIdx } = useParams()
  const si = Number(stepIdx), ti = Number(topicIdx), pi = Number(probIdx)
  const navigate = useNavigate()

  const step = STEPS[si]
  const topic = step?.topics[ti]
  const problem = topic?.problems[pi]
  const pId = problemId(si, ti, pi)

  const [progress, setProgress] = useState(loadProgress)
  const [code, setCode] = useState('')
  const [leftTab, setLeftTab] = useState('description') // 'description' | 'visualize'
  const [leftFullscreen, setLeftFullscreen] = useState(false)
  const [output, setOutput] = useState('')
  const [userOutput, setUserOutput] = useState('')
  const [testResults, setTestResults] = useState('')
  const [running, setRunning] = useState(false)
  const [saved, setSaved] = useState(false)
  const [customInput, setCustomInput] = useState('')
  const [showCustom, setShowCustom] = useState(false)
  const [theme, setTheme] = useState(() => localStorage.getItem('dp_dark_mode') === '1' ? 'vs-dark' : 'light')
  const [outputHeight, setOutputHeight] = useState(160)
  const [outputCollapsed, setOutputCollapsed] = useState(true)
  const [leftPanelPct, setLeftPanelPct] = useState(() => {
    const saved = localStorage.getItem('dp_dsa_left_pct')
    return saved ? Number(saved) : 35
  })
  const editorRef = useRef(null)
  const autoSaveRef = useRef(null)

  // Notes state
  const [notes, setNotes] = useState('')
  const [showNotes, setShowNotes] = useState(false)
  const [notesSaved, setNotesSaved] = useState(false)
  const [notesWidth, setNotesWidth] = useState(280)
  const notesTimerRef = useRef(null)

  // Generate problem state
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState('')
  const [generatedData, setGeneratedData] = useState(null)

  // Sync from DB then load saved code/notes
  useEffect(() => {
    syncFromDB().then(() => {
      const solutions = loadSolutions()
      setCode(solutions[pId] || problem?.starterCode || DEFAULT_CODE)
      const allNotes = loadNotes()
      setNotes(allNotes[pId] || '')
      setProgress(loadProgress())
    })
    setOutput('')
    setShowNotes(false)
  }, [pId]) // eslint-disable-line

  // ESC exits left fullscreen
  useEffect(() => {
    if (!leftFullscreen) return
    const onKey = e => { if (e.key === 'Escape') setLeftFullscreen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [leftFullscreen])

  // Sync dark mode
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
        <button className="btn btn-primary" onClick={() => navigate('/dsa')}>← Back to Sheet</button>
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
    setOutputCollapsed(false)
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

      // Split on separator marker injected by test harness
      const sep = '═══TEST_RESULTS═══'
      if (raw.includes(sep)) {
        const parts = raw.split(sep)
        setUserOutput(parts[0].trim())
        setTestResults(parts[1].trim())
      } else {
        // Try to detect test results even without separator
        const lines = raw.split('\n')
        // Match: "Test N: PASSED/FAILED", "PASSED ✅", "FAILED ❌", "❌ FAILED", "✅ All tests"
        const isTestLine = l => /Test\s+\d+[\s:].*(?:PASS|FAIL|✅|❌)/i.test(l)
          || /^(?:✅|❌|PASS|FAIL)/i.test(l.trim())
          || /(?:PASSED\s*✅|FAILED\s*❌)/i.test(l)
          || /All tests passed/i.test(l)

        const firstTestLine = lines.findIndex(l => isTestLine(l))

        if (firstTestLine > 0) {
          setUserOutput(lines.slice(0, firstTestLine).join('\n').trim())
          setTestResults(lines.slice(firstTestLine).join('\n').trim())
        } else if (firstTestLine === 0) {
          setUserOutput('')
          setTestResults(raw)
        } else {
          setUserOutput(raw)
          setTestResults('')
        }
      }
    } catch (e) {
      const err = `Error: ${e.message}\nIs the Flask server running?`
      setOutput(err)
      setUserOutput(err)
    }
    setRunning(false)
  }

  // Run with custom input only — strips test harness
  const runCustom = async () => {
    setRunning(true)
    setOutputCollapsed(false)
    setOutput('')
    setUserOutput('')
    setTestResults('')
    saveSolution(pId, code)

    // Extract just the function definition (everything before test harness)
    let funcCode = code
    const marker = '# --- Test cases'
    const idx = code.indexOf(marker)
    if (idx !== -1) funcCode = code.substring(0, idx)

    // Append custom runner
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
      const err = `Error: ${e.message}`
      setUserOutput(err)
    }
    setRunning(false)
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
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault()
      saveCode()
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      runCode()
    }
  }

  // Navigation: prev/next problem
  const getAdjacentProblem = (dir) => {
    let s = si, t = ti, p = pi + dir
    while (true) {
      const step = STEPS[s]
      if (!step) return null
      const topic = step.topics[t]
      if (!topic || p < 0 || p >= (topic?.problems.length || 0)) {
        t += dir
        if (t < 0 || t >= (step?.topics.length || 0)) {
          s += dir
          if (s < 0 || s >= STEPS.length) return null
          t = dir > 0 ? 0 : STEPS[s].topics.length - 1
        }
        const nextTopic = STEPS[s]?.topics[t]
        p = dir > 0 ? 0 : (nextTopic?.problems.length || 1) - 1
        if (STEPS[s]?.topics[t]?.problems[p]) return { s, t, p }
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
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap', flexShrink: 0,
      }}>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/dsa')}>← Sheet</button>

        {prev && (
          <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/dsa/${prev.s}/${prev.t}/${prev.p}`)}>
            ← Prev
          </button>
        )}
        {next && (
          <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/dsa/${next.s}/${next.t}/${next.p}`)}>
            Next →
          </button>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
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

          <button
            title={meta.tip}
            onClick={toggleStatus}
            style={{
              padding: '4px 12px', borderRadius: 999, border: `2px solid ${meta.color}`,
              background: status === 2 ? meta.color : 'transparent',
              color: status === 2 ? '#fff' : meta.color,
              fontSize: '.72rem', fontWeight: 700, cursor: 'pointer',
            }}
          >{meta.label} {meta.tip}</button>

          <span style={{
            fontSize: '.68rem', fontWeight: 700, padding: '3px 10px',
            borderRadius: 999, background: diff.bg, color: diff.color,
          }}>{problem.difficulty}</span>
        </div>
      </div>

      {/* Problem header */}
      <div style={{
        background: 'var(--neu-bg)', borderRadius: 14, padding: '8px 14px', marginBottom: 6,
        boxShadow: '4px 4px 8px var(--neu-shadow-dark), -4px -4px 8px var(--neu-shadow-light)',
        borderLeft: '4px solid var(--neu-accent)', flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <span className="course-ordinal">{String(step.step).padStart(2, '0')}</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--neu-text-primary)' }}>
            {problem.title}
          </div>
          <div style={{ fontSize: '.8125rem', color: 'var(--neu-text-secondary)', fontFamily: 'inherit', marginTop: 4 }}>
            Step {step.step}: {step.title} → {topic.label}
          </div>
        </div>
      </div>

      {/* Main area: split view */}
      <div className="study-editor-split" style={{ flex: 1, display: 'flex', gap: 0, minHeight: 0 }}>

        {/* Notes panel — left side, resizable */}
        {showNotes && leftTab !== 'visualize' && (
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

        {/* ── Left panel: Description / Visualize (with fullscreen toggle) ── */}
        <div className={leftFullscreen ? 'study-fullscreen' : ''} style={{
          ...(leftFullscreen ? {
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 9999, background: 'var(--neu-bg)', borderRadius: 0,
            padding: 16, display: 'flex', flexDirection: 'column',
          } : {
            width: `${leftPanelPct}%`, minWidth: 200, maxWidth: '70%',
            background: 'var(--neu-bg)', borderRadius: 14,
            boxShadow: '4px 4px 8px var(--neu-shadow-dark), -4px -4px 8px var(--neu-shadow-light)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }),
        }}>
          {/* Tab bar + fullscreen button */}
          <div style={{
            display: 'flex', borderBottom: '1px solid rgba(163,177,198,0.12)',
            flexShrink: 0, alignItems: 'center',
          }}>
            {[
              { key: 'description', label: 'Description', icon: '📄' },
              { key: 'visualize', label: 'Visualize', icon: '📊' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setLeftTab(tab.key)}
                style={{
                  flex: 1, padding: '10px 8px', border: 'none',
                  background: leftTab === tab.key ? 'var(--neu-accent-soft)' : 'transparent',
                  borderBottom: leftTab === tab.key ? '2.5px solid var(--neu-accent)' : '2.5px solid transparent',
                  color: leftTab === tab.key ? 'var(--neu-accent)' : 'var(--neu-text-secondary)',
                  fontSize: '.74rem', fontWeight: leftTab === tab.key ? 700 : 500,
                  cursor: 'pointer', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: 5, transition: 'all .15s',
                  fontFamily: 'inherit',
                }}
              >
                {tab.label}
              </button>
            ))}
            <button
              onClick={() => setLeftFullscreen(f => !f)}
              title={leftFullscreen ? 'Exit fullscreen (ESC)' : 'Fullscreen'}
              style={{
                width: 30, height: 30, borderRadius: 8, border: 'none',
                background: leftFullscreen ? 'var(--neu-accent)' : 'var(--neu-bg)',
                color: leftFullscreen ? 'var(--neu-surface)' : 'var(--neu-text-secondary)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '.8rem', margin: '0 6px', flexShrink: 0,
                boxShadow: leftFullscreen
                  ? '0 2px 8px rgba(99,102,241,0.3)'
                  : '2px 2px 4px var(--neu-shadow-dark), -2px -2px 4px var(--neu-shadow-light)',
              }}
            >
              {leftFullscreen ? '⊟' : '⊞'}
            </button>
          </div>

          {/* Tab content */}
          {leftTab === 'description' ? (
            <div style={{ flex: 1, padding: '18px 20px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
              {(problem.description || generatedData?.description) ? (
                <div style={{ fontSize: '.86rem', lineHeight: 1.8, color: 'var(--neu-text-primary)', overflow: 'hidden', wordBreak: 'break-word' }}
                  className="problem-desc"
                  dangerouslySetInnerHTML={{ __html: generatedData?.description || problem.description }} />
              ) : (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--neu-text-secondary)', textAlign: 'center' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📝</div>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>Problem description not generated yet</div>
                  <div style={{ fontSize: '.78rem', fontFamily: 'monospace', marginBottom: 20 }}>
                    Click below to auto-generate using AI
                  </div>
                  <button
                    className="btn btn-primary"
                    disabled={generating}
                    onClick={async () => {
                      setGenerating(true)
                      setGenError('')
                      try {
                        const res = await fetch('/api/dsa/generate-problem', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            title: problem.title,
                            difficulty: problem.difficulty,
                            topic_label: topic.label,
                            step_title: step.title,
                          }),
                        })
                        const data = await res.json()
                        if (data.error && !data.description) {
                          setGenError(data.error)
                        } else if (data.description) {
                          setGeneratedData(data)
                          if (data.starterCode && !loadSolutions()[pId]) {
                            setCode(data.starterCode)
                            saveSolution(pId, data.starterCode)
                          }
                        }
                      } catch (e) {
                        setGenError(e.message)
                      }
                      setGenerating(false)
                    }}
                    style={{ fontSize: '.9rem', padding: '10px 28px' }}
                  >
                    {generating ? '⏳ Generating…' : '⚡ Generate Problem'}
                  </button>
                  {generating && (
                    <div style={{ fontSize: '.75rem', marginTop: 12, color: 'var(--neu-accent)' }}>
                      This may take 20-30 seconds…
                    </div>
                  )}
                  {genError && (
                    <div style={{ fontSize: '.78rem', marginTop: 12, color: '#ef4444' }}>
                      Error: {genError}
                    </div>
                  )}
                  <div style={{ fontSize: '.72rem', marginTop: 20, color: 'var(--neu-text-secondary)', opacity: 0.7 }}>
                    Or look up "{problem.title}" and start coding →
                  </div>
                </div>
              )}

              {/* Quick tips */}
              <div style={{
                marginTop: 'auto', paddingTop: 16,
                borderTop: '1px solid rgba(163,177,198,0.15)',
                fontSize: '.72rem', color: 'var(--neu-text-secondary)', fontFamily: 'monospace',
              }}>
                <div>⌘+S / Ctrl+S → Save</div>
                <div>⌘+Enter / Ctrl+Enter → Run</div>
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, padding: '10px 14px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <DSAVisualizer code={code} stepColor={step.color} isFullscreen={leftFullscreen} />
            </div>
          )}
        </div>

        {/* Drag handle + Editor — hidden when left panel is fullscreen */}
        {!leftFullscreen && (
          <>
          {/* Drag handle — resize left/right split */}
          <div
            className="study-panel-resizer" onMouseDown={e => {
              e.preventDefault()
              const container = e.currentTarget.parentElement
              const startX = e.clientX
              const startPct = leftPanelPct
              const containerW = container.getBoundingClientRect().width
              const onMove = ev => {
                const dx = ev.clientX - startX
                const newPct = Math.min(70, Math.max(15, startPct + (dx / containerW) * 100))
                setLeftPanelPct(newPct)
              }
              const onUp = () => {
                document.removeEventListener('mousemove', onMove)
                document.removeEventListener('mouseup', onUp)
                document.body.style.cursor = ''
                document.body.style.userSelect = ''
                localStorage.setItem('dp_dsa_left_pct', String(leftPanelPct))
              }
              document.body.style.cursor = 'col-resize'
              document.body.style.userSelect = 'none'
              document.addEventListener('mousemove', onMove)
              document.addEventListener('mouseup', onUp)
            }}
            style={{
              width: 8, flexShrink: 0, cursor: 'col-resize',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <div
              style={{
                width: 4, height: 48, borderRadius: 4,
                background: 'rgba(163,177,198,0.25)', transition: 'background .15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = step.color}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(163,177,198,0.25)'}
            />
          </div>

        {/* Right: Editor + Output */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>

          {/* Editor toolbar */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
          }}>
            <span style={{
              fontSize: '.72rem', fontWeight: 700, color: 'var(--neu-accent)',
              background: 'var(--neu-accent-soft)', padding: '3px 10px', borderRadius: 999,
              fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '.05em',
            }}>Python</span>
            <div style={{ flex: 1 }} />
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setShowCustom(v => !v)}
              style={{ fontSize: '.72rem', color: showCustom ? 'var(--neu-accent)' : undefined }}
            >
              {showCustom ? '✎ Custom On' : '✎ Custom Input'}
            </button>
            <button className="btn btn-secondary btn-sm" onClick={saveCode} style={{ fontSize: '.72rem' }}>
              {saved ? '✓ Saved' : 'Save'}
            </button>
            {showCustom ? (
              <button
                className="btn btn-primary btn-sm"
                onClick={runCustom}
                disabled={running}
                style={{ fontSize: '.72rem' }}
              >
                {running ? '⏳ Running…' : '▶ Run Custom'}
              </button>
            ) : (
              <button
                className="btn btn-primary btn-sm"
                onClick={runCode}
                disabled={running}
                style={{ fontSize: '.72rem' }}
              >
                {running ? '⏳ Running…' : '▶ Run'}
              </button>
            )}
          </div>

          {/* Custom input area */}
          {showCustom && (
            <div style={{
              flexShrink: 0, background: 'var(--neu-bg)', borderRadius: 12,
              boxShadow: 'inset 2px 2px 4px var(--neu-shadow-dark), inset -2px -2px 4px var(--neu-shadow-light)',
              padding: '8px 12px',
            }}>
              <div style={{ fontSize: '.65rem', fontWeight: 700, color: 'var(--neu-text-secondary)', textTransform: 'uppercase', fontFamily: 'monospace', marginBottom: 4 }}>
                Custom Input (Python code to call your function)
              </div>
              <textarea
                value={customInput}
                onChange={e => setCustomInput(e.target.value)}
                placeholder={`e.g. print(${problem?.title?.split(' ')[0]?.toLowerCase() || 'solution'}(5))`}
                style={{
                  width: '100%', minHeight: 48, maxHeight: 100, resize: 'vertical',
                  background: 'transparent', border: 'none', outline: 'none',
                  fontFamily: '"JetBrains Mono", monospace', fontSize: '.78rem',
                  color: 'var(--neu-text-primary)', lineHeight: 1.6,
                }}
              />
            </div>
          )}

          {/* Monaco Editor */}
          <div style={{
            flex: 1, borderRadius: 14, overflow: 'hidden',
            boxShadow: 'inset 3px 3px 6px var(--neu-shadow-dark), inset -3px -3px 6px var(--neu-shadow-light)',
          }}>
            <Editor
              height="100%"
              language="python"
              theme={theme}
              value={code}
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
              options={{
                fontSize: 14,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                padding: { top: 12 },
                lineNumbers: 'on',
                renderLineHighlight: 'all',
                wordWrap: 'on',
                tabSize: 4,
                automaticLayout: true,
              }}
            />
          </div>

          {/* Drag handle to resize output — only when output is open */}
          {!outputCollapsed && (
            <div
              onMouseDown={e => {
                e.preventDefault()
                const startY = e.clientY
                const startH = outputHeight
                const onMove = ev => {
                  const newH = Math.min(400, Math.max(60, startH - (ev.clientY - startY)))
                  setOutputHeight(newH)
                }
                const onUp = () => {
                  document.removeEventListener('mousemove', onMove)
                  document.removeEventListener('mouseup', onUp)
                  document.body.style.cursor = ''
                  document.body.style.userSelect = ''
                }
                document.body.style.cursor = 'row-resize'
                document.body.style.userSelect = 'none'
                document.addEventListener('mousemove', onMove)
                document.addEventListener('mouseup', onUp)
              }}
              style={{
                height: 8, flexShrink: 0, cursor: 'row-resize',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <div style={{
                width: 40, height: 4, borderRadius: 4,
                background: 'rgba(163,177,198,0.25)', transition: 'background .15s',
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--neu-accent)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(163,177,198,0.25)'}
              />
            </div>
          )}

          {/* Output panels — hidden until Run, with close button */}
          {!outputCollapsed && (
            <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
              {/* Output header bar with close button */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '4px 10px',
                fontSize: '.65rem', fontWeight: 700,
                color: 'var(--neu-text-secondary)', fontFamily: 'monospace',
                textTransform: 'uppercase', letterSpacing: '.04em',
                userSelect: 'none',
              }}>
                <span style={{ fontSize: '.7rem' }}>▾</span>
                Output
                {(userOutput || testResults) && (
                  <span style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: testResults.includes('FAILED') || userOutput.includes('Error') ? '#ef4444'
                      : testResults.includes('PASSED') ? '#22c55e' : '#2979FF',
                  }} />
                )}
                <div style={{ flex: 1 }} />
                <button
                  onClick={() => setOutputCollapsed(true)}
                  style={{
                    padding: '2px 10px', borderRadius: 999, border: 'none',
                    background: 'var(--neu-bg)', cursor: 'pointer',
                    color: 'var(--neu-text-secondary)', fontSize: '.62rem', fontWeight: 700,
                    boxShadow: '2px 2px 4px var(--neu-shadow-dark), -2px -2px 4px var(--neu-shadow-light)',
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}
                >
                  ✕ Close
                </button>
              </div>

              <div style={{ height: outputHeight, display: 'flex', gap: 10 }}>
                {/* Your Output */}
                <div style={{
                  flex: 1,
                  background: 'var(--neu-bg)', borderRadius: 14,
                  boxShadow: 'inset 3px 3px 6px var(--neu-shadow-dark), inset -3px -3px 6px var(--neu-shadow-light)',
                  display: 'flex', flexDirection: 'column', overflow: 'hidden',
                }}>
                  <div style={{
                    padding: '6px 14px', borderBottom: '1px solid rgba(163,177,198,0.12)',
                    fontSize: '.7rem', fontWeight: 700, color: 'var(--neu-text-secondary)',
                    textTransform: 'uppercase', letterSpacing: '.05em', fontFamily: 'monospace',
                    display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
                  }}>
                    <span style={{
                      width: 7, height: 7, borderRadius: '50%',
                      background: userOutput.includes('Error') || userOutput.includes('Traceback') ? '#ef4444' : userOutput ? '#2979FF' : '#94a3b8',
                    }} />
                    Your Output
                  </div>
                  <pre style={{
                    flex: 1, margin: 0, padding: '10px 14px',
                    fontSize: '.78rem', fontFamily: '"JetBrains Mono", monospace',
                    color: userOutput.includes('Error') || userOutput.includes('Traceback') ? '#ef4444' : 'var(--neu-text-primary)',
                    overflowY: 'auto', whiteSpace: 'pre-wrap',
                  }}>
                    {running ? 'Running...' : userOutput || (output ? '(no direct output)' : '')}
                  </pre>
                </div>

                {/* Test Results */}
                <div style={{
                  flex: 1,
                  background: 'var(--neu-bg)', borderRadius: 14,
                  boxShadow: 'inset 3px 3px 6px var(--neu-shadow-dark), inset -3px -3px 6px var(--neu-shadow-light)',
                  display: 'flex', flexDirection: 'column', overflow: 'hidden',
                }}>
                  <div style={{
                    padding: '6px 14px', borderBottom: '1px solid rgba(163,177,198,0.12)',
                    fontSize: '.7rem', fontWeight: 700, color: 'var(--neu-text-secondary)',
                    textTransform: 'uppercase', letterSpacing: '.05em', fontFamily: 'monospace',
                    display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
                  }}>
                    <span style={{
                      width: 7, height: 7, borderRadius: '50%',
                      background: testResults.includes('FAILED') ? '#ef4444' : testResults.includes('PASSED') ? '#22c55e' : '#94a3b8',
                    }} />
                    Test Results
                  </div>
                  <pre style={{
                    flex: 1, margin: 0, padding: '10px 14px',
                    fontSize: '.78rem', fontFamily: '"JetBrains Mono", monospace',
                    color: testResults.includes('FAILED') ? '#ef4444' : testResults.includes('PASSED') ? '#22c55e' : 'var(--neu-text-primary)',
                    overflowY: 'auto', whiteSpace: 'pre-wrap',
                  }}>
                    {running ? 'Running...' : testResults || (output ? '(no test harness found)' : '')}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
        </>
        )}
      </div>
    </div>
  )
}
