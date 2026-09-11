import { useState, useEffect, useRef, useCallback } from 'react'

const VIBRANT_COLORS = [
  '#6366f1', '#ec4899', '#14b8a6', '#f97316', '#8b5cf6',
  '#06b6d4', '#eab308', '#ef4444',
]

const BAR_GRADIENTS = [
  'linear-gradient(180deg, #6366f1, #818cf8)',     // indigo
  'linear-gradient(180deg, #ec4899, #f472b6)',     // pink
  'linear-gradient(180deg, #14b8a6, #2dd4bf)',     // teal
  'linear-gradient(180deg, #f97316, #fb923c)',     // orange
  'linear-gradient(180deg, #8b5cf6, #a78bfa)',     // violet
]

export default function DSAVisualizer({ code, stepColor, isFullscreen }) {
  const [snapshots, setSnapshots] = useState([])
  const [currentStep, setCurrentStep] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hasRun, setHasRun] = useState(false)
  const [customInput, setCustomInput] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [varsExpanded, setVarsExpanded] = useState(false)
  const [visibleRows, setVisibleRows] = useState(0) // 0 = show all
  const timerRef = useRef(null)
  const tableRef = useRef(null)
  const pointerColorMap = useRef({})
  const pointerColorIdx = useRef(0)
  const accent = stepColor || '#6366f1'
  const fullscreen = isFullscreen || false

  useEffect(() => () => clearInterval(timerRef.current), [])

  // Playback
  useEffect(() => {
    clearInterval(timerRef.current)
    if (playing && snapshots.length > 0) {
      const ms = Math.max(50, 600 / speed)
      timerRef.current = setInterval(() => {
        setCurrentStep(prev => {
          if (prev >= snapshots.length - 1) { setPlaying(false); return prev }
          return prev + 1
        })
      }, ms)
    }
    return () => clearInterval(timerRef.current)
  }, [playing, speed, snapshots.length])

  // Auto-scroll table to current step
  useEffect(() => {
    if (tableRef.current) {
      const row = tableRef.current.querySelector(`[data-step="${currentStep}"]`)
      if (row) row.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [currentStep])

  const runVisualize = useCallback(async () => {
    setLoading(true)
    setError('')
    setSnapshots([])
    setCurrentStep(0)
    setPlaying(false)
    setHasRun(true)
    pointerColorMap.current = {}
    pointerColorIdx.current = 0
    try {
      const body = { code }
      if (customInput.trim()) body.customInput = customInput.trim()
      const res = await fetch('/api/dsa/visualize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (data.error) {
        setError(data.error)
      } else if (data.snapshots?.length > 0) {
        for (const snap of data.snapshots) {
          if (snap.pointers) {
            Object.keys(snap.pointers).forEach(name => {
              if (!(name in pointerColorMap.current)) {
                pointerColorMap.current[name] = VIBRANT_COLORS[pointerColorIdx.current % VIBRANT_COLORS.length]
                pointerColorIdx.current++
              }
            })
          }
        }
        setSnapshots(data.snapshots)
      } else {
        setError('No array operations detected. Make sure your function uses list variables.')
      }
    } catch (e) {
      setError(`Failed: ${e.message}`)
    }
    setLoading(false)
  }, [code, customInput])

  // ── Landing ──
  if (!hasRun) {
    return (
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', padding: 24,
        background: 'linear-gradient(135deg, rgba(99,102,241,0.05), rgba(236,72,153,0.05))',
        borderRadius: 16,
      }}>
        <div style={{
          fontSize: '3rem', marginBottom: 12,
          filter: 'drop-shadow(0 4px 12px rgba(99,102,241,0.3))',
        }}>📊</div>
        <div style={{
          fontWeight: 800, marginBottom: 6, fontSize: '1.2rem',
          background: 'linear-gradient(135deg, #6366f1, #ec4899)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>Algorithm Visualizer</div>
        <div style={{
          fontSize: '.88rem', fontFamily: 'monospace', marginBottom: 18,
          lineHeight: 1.7, color: 'var(--neu-text-secondary)', maxWidth: 360,
        }}>
          Step through your code and watch arrays & variables change in real-time
        </div>
        <button
          onClick={() => setShowCustomInput(v => !v)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '.78rem', color: '#6366f1', marginBottom: 8,
            fontFamily: 'monospace', textDecoration: 'underline',
          }}
        >
          {showCustomInput ? 'Hide custom input' : 'Custom test input (optional)'}
        </button>
        {showCustomInput && (
          <input
            type="text" value={customInput}
            onChange={e => setCustomInput(e.target.value)}
            placeholder="e.g. [2, 0, 1, 2, 1, 0]"
            style={{
              width: '90%', maxWidth: 300, marginBottom: 14, padding: '10px 16px',
              fontSize: '.85rem', fontFamily: '"JetBrains Mono", monospace',
              borderRadius: 12, border: '2px solid rgba(99,102,241,0.3)',
              background: 'var(--neu-bg)', color: 'var(--neu-text-primary)',
              outline: 'none',
            }}
          />
        )}
        <button onClick={runVisualize} disabled={loading}
          style={{
            fontSize: '1rem', padding: '12px 32px', border: 'none',
            borderRadius: 12, cursor: 'pointer', fontWeight: 700,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: '#fff',
            boxShadow: '0 4px 16px rgba(99,102,241,0.4)',
            transition: 'transform .15s, box-shadow .15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(99,102,241,0.5)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 16px rgba(99,102,241,0.4)' }}
        >
          {loading ? '⏳ Tracing…' : '▶ Visualize'}
        </button>
      </div>
    )
  }

  if (loading) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '2.2rem', marginBottom: 8, animation: 'pulse 1.5s infinite' }}>⏳</div>
        <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--neu-text-secondary)' }}>Tracing algorithm…</div>
      </div>
    </div>
  )

  if (error) return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24 }}>
      <div style={{ fontSize: '2rem', marginBottom: 10 }}>⚠️</div>
      <div style={{ fontSize: '.92rem', color: '#ef4444', marginBottom: 14, maxWidth: 400, lineHeight: 1.6 }}>
        {error.length > 200 ? error.slice(0, 200) + '…' : error}
      </div>
      <button onClick={runVisualize} style={{
        padding: '10px 24px', border: 'none', borderRadius: 10,
        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
        color: '#fff', fontWeight: 700, cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
      }}>Retry</button>
    </div>
  )

  if (snapshots.length === 0) return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24 }}>
      <div style={{ fontSize: '2rem', marginBottom: 10 }}>🤷</div>
      <div style={{ fontSize: '.92rem', marginBottom: 14, color: 'var(--neu-text-secondary)' }}>No array operations captured.</div>
      <button onClick={runVisualize} style={{
        padding: '10px 24px', border: 'none', borderRadius: 10,
        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
        color: '#fff', fontWeight: 700, cursor: 'pointer',
      }}>Re-run</button>
    </div>
  )

  // ── Current snapshot data ──
  const snap = snapshots[currentStep]
  const prevSnap = currentStep > 0 ? snapshots[currentStep - 1] : null
  const arrayEntries = snap ? Object.entries(snap.arrays) : []
  const primaryEntry = arrayEntries.length > 0
    ? arrayEntries.reduce((a, b) => b[1].length > a[1].length ? b : a)
    : null
  const arr = primaryEntry ? primaryEntry[1] : []
  const maxVal = Math.max(...arr.map(Math.abs), 1)
  const highlights = snap?.highlights?.[primaryEntry?.[0]] || []
  const highlightSet = new Set(highlights)
  const movedPtrs = new Set(snap?.movedPointers || [])
  const changedVars = new Set(snap?.changedVars || [])

  // Group pointers by index
  const pointersByIdx = {}
  if (snap?.pointers) {
    Object.entries(snap.pointers).forEach(([name, idx]) => {
      if (idx < 0 || idx >= arr.length) return
      const key = String(idx)
      if (!pointersByIdx[key]) pointersByIdx[key] = []
      pointersByIdx[key].push(name)
    })
  }
  const ptrCount = snap?.pointers ? Object.keys(snap.pointers).length : 0
  const maxStack = Object.keys(pointersByIdx).length > 0
    ? Math.max(...Object.values(pointersByIdx).map(a => a.length)) : 0

  // Collect all variable names across all snapshots for consistent table columns
  const allVarNames = [...new Set(snapshots.flatMap(s => Object.keys(s.vars || {})))]
  const allPtrNames = [...new Set(snapshots.flatMap(s => Object.keys(s.pointers || {})))]

  // Determine which rows to show in the table
  const displaySnapshots = visibleRows > 0
    ? snapshots.filter((_, idx) => {
        // Show rows around current step
        const half = Math.floor(visibleRows / 2)
        const start = Math.max(0, Math.min(currentStep - half, snapshots.length - visibleRows))
        const end = start + visibleRows
        return idx >= start && idx < end
      })
    : snapshots
  const displayStartIdx = visibleRows > 0
    ? Math.max(0, Math.min(currentStep - Math.floor(visibleRows / 2), snapshots.length - visibleRows))
    : 0

  const vizContent = (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* ── Controls ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '6px 4px',
        borderBottom: '2px solid rgba(99,102,241,0.12)', flexShrink: 0, flexWrap: 'wrap',
      }}>
        <button onClick={() => { setCurrentStep(0); setPlaying(false) }} disabled={currentStep === 0} style={ctrlBtn} title="Reset">⏮</button>
        <button onClick={() => setCurrentStep(s => Math.max(0, s - 1))} disabled={currentStep === 0} style={ctrlBtn} title="Prev">◀</button>
        <button onClick={() => setPlaying(p => !p)}
          style={{
            ...ctrlBtn, width: 32, height: 32,
            background: playing
              ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
              : 'var(--neu-bg)',
            color: playing ? '#fff' : 'var(--neu-text-secondary)',
            boxShadow: playing
              ? '0 3px 12px rgba(99,102,241,0.4)'
              : '2px 2px 4px var(--neu-shadow-dark), -2px -2px 4px var(--neu-shadow-light)',
          }}
        >{playing ? '⏸' : '▶'}</button>
        <button onClick={() => setCurrentStep(s => Math.min(snapshots.length - 1, s + 1))} disabled={currentStep >= snapshots.length - 1} style={ctrlBtn} title="Next">▶</button>
        <button onClick={() => { setCurrentStep(snapshots.length - 1); setPlaying(false) }} disabled={currentStep >= snapshots.length - 1} style={ctrlBtn} title="End">⏭</button>

        <div style={{ width: 1, height: 18, background: 'rgba(99,102,241,0.15)', margin: '0 4px' }} />

        <input type="range" min="0.2" max="5" step="0.1" value={speed}
          onChange={e => setSpeed(Number(e.target.value))}
          style={{ width: 60, accentColor: '#6366f1', height: 4 }}
          title={`Speed: ${speed.toFixed(1)}x`}
        />
        <span style={{ fontSize: '.72rem', fontFamily: 'monospace', color: 'var(--neu-text-secondary)', width: 30 }}>{speed.toFixed(1)}x</span>

        <div style={{ flex: 1 }} />
        <span style={{
          fontSize: '.78rem', fontWeight: 700, fontFamily: 'monospace',
          background: 'linear-gradient(135deg, #6366f1, #ec4899)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          Step {currentStep + 1} / {snapshots.length}
        </span>
        <button onClick={runVisualize} style={{
          ...ctrlBtn, width: 'auto', borderRadius: 8, padding: '0 10px',
          fontSize: '.68rem', fontWeight: 700,
        }}>↻ Re-run</button>
      </div>

      {/* ── Slider ── */}
      <div style={{ padding: '4px 0 3px', flexShrink: 0 }}>
        <input type="range" min={0} max={snapshots.length - 1} value={currentStep}
          onChange={e => { setCurrentStep(Number(e.target.value)); setPlaying(false) }}
          style={{ width: '100%', accentColor: '#6366f1', height: 5 }}
        />
      </div>

      {/* ── Code Line ── */}
      {snap?.codeLine && (
        <div style={{
          flexShrink: 0, padding: '8px 14px', marginBottom: 8,
          background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(236,72,153,0.05))',
          borderLeft: '4px solid #6366f1',
          borderRadius: '0 10px 10px 0',
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: fullscreen ? '1rem' : '.88rem',
          color: 'var(--neu-text-primary)',
          lineHeight: 1.5, whiteSpace: 'pre-wrap', overflow: 'hidden',
        }}>
          <span style={{
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            fontSize: '.72rem', fontWeight: 800, marginRight: 10,
          }}>
            L{snap.line}
          </span>
          {snap.codeLine}
        </div>
      )}

      {/* ── Main Content: Bars (left) + Table (right) ── */}
      <div style={{ flex: 1, display: 'flex', gap: 12, minHeight: 0, overflow: 'hidden' }}>

        {/* ── LEFT: Array Bars ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>

          {/* Array label */}
          <div style={{
            fontSize: fullscreen ? '.85rem' : '.76rem', fontWeight: 800,
            fontFamily: 'monospace', padding: '3px 0 6px', flexShrink: 0,
            textTransform: 'uppercase', letterSpacing: '.05em',
            background: 'linear-gradient(135deg, #6366f1, #14b8a6)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            {primaryEntry[0]}[{arr.length}]
          </div>

          {/* Bars */}
          <div style={{
            flex: 1, display: 'flex', alignItems: 'flex-end',
            gap: arr.length > 30 ? 1 : arr.length > 15 ? 3 : 5,
            padding: '0 4px', minHeight: 60,
          }}>
            {arr.map((val, i) => {
              const barPct = maxVal === 0 ? 50 : Math.max(10, (Math.abs(val) / maxVal) * 100)
              const isHL = highlightSet.has(i)
              const isPointed = snap.pointers && Object.values(snap.pointers).includes(i)
              const gradIdx = i % BAR_GRADIENTS.length

              return (
                <div key={i} style={{
                  flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                  maxWidth: 64, minWidth: 0, height: '100%', justifyContent: 'flex-end',
                }}>
                  {arr.length <= 25 && (
                    <div style={{
                      fontSize: fullscreen
                        ? (arr.length <= 10 ? '1.1rem' : '.9rem')
                        : (arr.length <= 10 ? '.95rem' : '.78rem'),
                      fontFamily: '"JetBrains Mono", monospace', marginBottom: 4, lineHeight: 1,
                      color: isHL ? '#fff' : 'var(--neu-text-primary)',
                      fontWeight: isHL ? 900 : 800,
                      textShadow: isHL ? '0 1px 8px rgba(99,102,241,0.5)' : 'none',
                    }}>
                      {val}
                    </div>
                  )}
                  <div style={{
                    width: '100%',
                    height: `${barPct}%`,
                    minHeight: 8,
                    borderRadius: '6px 6px 2px 2px',
                    background: isHL
                      ? 'linear-gradient(180deg, #6366f1, #ec4899)'
                      : isPointed
                        ? 'linear-gradient(180deg, rgba(99,102,241,0.35), rgba(139,92,246,0.25))'
                        : BAR_GRADIENTS[gradIdx].replace(/[^,]+$/, 'rgba(163,177,198,0.15))').replace(/linear-gradient\(180deg,\s*[^,]+/, 'linear-gradient(180deg, rgba(163,177,198,0.28)'),
                    transition: 'height .3s cubic-bezier(.4,0,.2,1), background .25s ease',
                    boxShadow: isHL
                      ? '0 0 18px rgba(99,102,241,0.45), 0 0 6px rgba(236,72,153,0.3)'
                      : isPointed
                        ? '0 0 8px rgba(99,102,241,0.2)'
                        : 'none',
                  }} />
                </div>
              )
            })}
          </div>

          {/* Index row */}
          {arr.length <= 30 && (
            <div style={{
              display: 'flex', gap: arr.length > 15 ? 3 : 5,
              padding: '3px 4px 0', flexShrink: 0,
            }}>
              {arr.map((_, i) => (
                <div key={i} style={{
                  flex: 1, maxWidth: 64, textAlign: 'center',
                  fontSize: fullscreen ? '.7rem' : '.62rem',
                  fontFamily: 'monospace', fontWeight: 700,
                  color: highlightSet.has(i) ? '#6366f1' : 'var(--neu-text-primary)',
                  opacity: highlightSet.has(i) ? 1 : 0.6,
                }}>
                  {i}
                </div>
              ))}
            </div>
          )}

          {/* Pointer arrows */}
          {ptrCount > 0 && (
            <div style={{
              display: 'flex', gap: arr.length > 30 ? 1 : arr.length > 15 ? 3 : 5,
              padding: '0 4px', flexShrink: 0,
              minHeight: 18 + maxStack * 16,
              marginTop: 3,
            }}>
              {arr.map((_, i) => {
                const names = pointersByIdx[String(i)]
                return (
                  <div key={i} style={{
                    flex: 1, maxWidth: 64, minWidth: 0,
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                  }}>
                    {names && (
                      <>
                        <div style={{
                          fontSize: '.7rem', lineHeight: 1,
                          color: pointerColorMap.current[names[0]] || '#6366f1',
                          filter: `drop-shadow(0 1px 4px ${pointerColorMap.current[names[0]] || '#6366f1'}60)`,
                        }}>▲</div>
                        {names.map(name => {
                          const pColor = pointerColorMap.current[name] || '#6366f1'
                          const moved = movedPtrs.has(name)
                          return (
                            <div key={name} style={{
                              fontSize: fullscreen ? '.74rem' : '.68rem',
                              fontWeight: 800, fontFamily: 'monospace',
                              color: '#fff', whiteSpace: 'nowrap', lineHeight: 1.5,
                              background: moved
                                ? `linear-gradient(135deg, ${pColor}, ${pColor}cc)`
                                : pColor,
                              padding: '1px 6px', borderRadius: 4,
                              boxShadow: moved
                                ? `0 2px 8px ${pColor}50`
                                : `0 1px 4px ${pColor}30`,
                              transition: 'all .2s',
                            }}>
                              {name}
                            </div>
                          )
                        })}
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Secondary arrays */}
          {arrayEntries.length > 1 && arrayEntries
            .filter(([name]) => name !== primaryEntry[0])
            .map(([name, secArr]) => {
              const secMax = Math.max(...secArr.map(Math.abs), 1)
              const secHL = new Set(snap?.highlights?.[name] || [])
              return (
                <div key={name} style={{ marginTop: 8, flexShrink: 0 }}>
                  <div style={{
                    fontSize: '.68rem', fontWeight: 800, fontFamily: 'monospace',
                    textTransform: 'uppercase', marginBottom: 3,
                    color: '#14b8a6',
                  }}>
                    {name}[{secArr.length}]
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 42, padding: '0 4px' }}>
                    {secArr.map((val, i) => (
                      <div key={i} style={{
                        flex: 1, maxWidth: 44,
                        height: `${Math.max(8, (Math.abs(val) / secMax) * 100)}%`,
                        minHeight: 4, borderRadius: '4px 4px 0 0',
                        background: secHL.has(i)
                          ? 'linear-gradient(180deg, #14b8a6, #2dd4bf)'
                          : 'rgba(163,177,198,0.2)',
                        boxShadow: secHL.has(i) ? '0 0 10px rgba(20,184,166,0.3)' : 'none',
                      }} />
                    ))}
                  </div>
                </div>
              )
            })}
        </div>

        {/* ── RIGHT: Step Details Table ── */}
        <div style={{
          width: varsExpanded ? '60%' : '45%',
          minWidth: 220, maxWidth: varsExpanded ? 600 : 400, flexShrink: 0,
          display: 'flex', flexDirection: 'column',
          background: 'var(--neu-bg)', borderRadius: 12,
          boxShadow: 'inset 2px 2px 5px var(--neu-shadow-dark), inset -2px -2px 5px var(--neu-shadow-light)',
          overflow: 'hidden',
          transition: 'width .3s, max-width .3s',
        }}>
          {/* Table header */}
          <div style={{
            padding: '8px 12px', flexShrink: 0,
            borderBottom: '2px solid rgba(99,102,241,0.15)',
            display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
          }}>
            <span style={{
              fontSize: fullscreen ? '.78rem' : '.72rem', fontWeight: 800, fontFamily: 'monospace',
              textTransform: 'uppercase', letterSpacing: '.06em',
              background: 'linear-gradient(135deg, #6366f1, #ec4899)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              Variables & State
            </span>
            <div style={{ flex: 1 }} />
            {/* Row count control */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: '.6rem', color: 'var(--neu-text-secondary)', fontFamily: 'monospace' }}>Rows:</span>
              <select
                value={visibleRows}
                onChange={e => setVisibleRows(Number(e.target.value))}
                style={{
                  fontSize: '.62rem', fontFamily: 'monospace', fontWeight: 700,
                  padding: '2px 4px', borderRadius: 5, border: '1px solid rgba(163,177,198,0.2)',
                  background: 'var(--neu-bg)', color: 'var(--neu-text-primary)',
                  cursor: 'pointer', outline: 'none',
                }}
              >
                <option value={0}>All</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={30}>30</option>
                <option value={50}>50</option>
              </select>
            </div>
            <button
              onClick={() => setVarsExpanded(v => !v)}
              style={{
                ...ctrlBtn, width: 22, height: 22, fontSize: '.65rem',
                borderRadius: 6,
              }}
              title={varsExpanded ? 'Collapse panel' : 'Expand panel'}
            >
              {varsExpanded ? '◂' : '▸'}
            </button>
          </div>

          {/* Current step vars - big display */}
          <div style={{
            padding: '10px 12px', flexShrink: 0,
            borderBottom: '1px solid rgba(99,102,241,0.08)',
          }}>
            {/* Pointers (index vars) */}
            {ptrCount > 0 && (
              <div style={{ marginBottom: 8 }}>
                <div style={{
                  fontSize: '.66rem', fontWeight: 800,
                  textTransform: 'uppercase', fontFamily: 'monospace',
                  marginBottom: 5, letterSpacing: '.05em',
                  color: '#6366f1',
                }}>Index Pointers</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {Object.entries(snap.pointers).map(([name, val]) => {
                    const pColor = pointerColorMap.current[name] || '#6366f1'
                    const moved = movedPtrs.has(name)
                    const prevVal = prevSnap?.pointers?.[name]
                    return (
                      <div key={name} style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        padding: '4px 10px', borderRadius: 8,
                        background: moved
                          ? `linear-gradient(135deg, ${pColor}18, ${pColor}08)`
                          : 'rgba(163,177,198,0.06)',
                        border: `2px solid ${moved ? pColor : 'rgba(163,177,198,0.12)'}`,
                        transition: 'all .2s',
                        boxShadow: moved ? `0 2px 8px ${pColor}20` : 'none',
                      }}>
                        <span style={{
                          fontSize: fullscreen ? '.85rem' : '.78rem',
                          fontFamily: 'monospace', color: pColor, fontWeight: 800,
                        }}>
                          {name}
                        </span>
                        {moved && prevVal !== undefined && (
                          <span style={{
                            fontSize: '.68rem', color: 'rgba(163,177,198,0.5)',
                            textDecoration: 'line-through', fontFamily: 'monospace',
                          }}>
                            {prevVal}
                          </span>
                        )}
                        <span style={{
                          fontSize: fullscreen ? '1.05rem' : '.95rem',
                          fontWeight: 900, fontFamily: 'monospace',
                          color: moved ? pColor : 'var(--neu-text-primary)',
                        }}>
                          {val}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Scalar vars */}
            {snap?.vars && Object.keys(snap.vars).length > 0 && (
              <div>
                <div style={{
                  fontSize: '.66rem', fontWeight: 800,
                  textTransform: 'uppercase', fontFamily: 'monospace',
                  marginBottom: 5, letterSpacing: '.05em',
                  color: '#ec4899',
                }}>Variables</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {Object.entries(snap.vars).map(([name, val]) => {
                    const changed = changedVars.has(name)
                    const prevVal = prevSnap?.vars?.[name]
                    return (
                      <div key={name} style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        padding: '4px 10px', borderRadius: 8,
                        background: changed
                          ? 'linear-gradient(135deg, rgba(236,72,153,0.12), rgba(236,72,153,0.04))'
                          : 'rgba(163,177,198,0.06)',
                        border: `2px solid ${changed ? '#ec489960' : 'rgba(163,177,198,0.12)'}`,
                        transition: 'all .2s',
                        boxShadow: changed ? '0 2px 8px rgba(236,72,153,0.15)' : 'none',
                      }}>
                        <span style={{
                          fontSize: fullscreen ? '.85rem' : '.78rem',
                          fontFamily: 'monospace', color: 'var(--neu-text-secondary)', fontWeight: 700,
                        }}>
                          {name}
                        </span>
                        {changed && prevVal !== undefined && (
                          <span style={{
                            fontSize: '.68rem', color: 'rgba(163,177,198,0.5)',
                            textDecoration: 'line-through', fontFamily: 'monospace',
                          }}>
                            {String(prevVal)}
                          </span>
                        )}
                        <span style={{
                          fontSize: fullscreen ? '1.05rem' : '.95rem',
                          fontWeight: 900, fontFamily: 'monospace',
                          color: changed ? '#ec4899' : 'var(--neu-text-primary)',
                        }}>
                          {String(val)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {ptrCount === 0 && (!snap?.vars || Object.keys(snap.vars).length === 0) && (
              <div style={{ fontSize: '.78rem', color: 'var(--neu-text-secondary)', fontStyle: 'italic' }}>
                Initializing…
              </div>
            )}
          </div>

          {/* Step history table - scrollable */}
          {visibleRows > 0 && (
            <div style={{
              padding: '3px 12px', fontSize: '.58rem', color: 'var(--neu-text-secondary)',
              fontFamily: 'monospace', borderBottom: '1px solid rgba(163,177,198,0.06)',
              flexShrink: 0,
            }}>
              Showing {visibleRows} rows around step {currentStep + 1} (of {snapshots.length})
            </div>
          )}
          <div ref={tableRef} style={{ flex: 1, overflowY: 'auto', overflowX: 'auto' }}>
            <table style={{ width: 'max-content', minWidth: '100%', borderCollapse: 'collapse', fontSize: fullscreen ? '.74rem' : '.7rem', fontFamily: '"JetBrains Mono", monospace' }}>
              <thead>
                <tr style={{
                  position: 'sticky', top: 0, zIndex: 1,
                  background: 'var(--neu-bg)',
                  borderBottom: '2px solid rgba(99,102,241,0.15)',
                }}>
                  <th style={{ ...thStyle, width: 30 }}>#</th>
                  <th style={{ ...thStyle, textAlign: 'left', minWidth: fullscreen ? 220 : 160 }}>Code</th>
                  {allPtrNames.map(n => (
                    <th key={n} style={{ ...thStyle, color: pointerColorMap.current[n] || '#6366f1' }}>{n}</th>
                  ))}
                  {allVarNames.map(n => (
                    <th key={n} style={{ ...thStyle, color: '#ec4899' }}>{n}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displaySnapshots.map((s, displayIdx) => {
                  const idx = displayStartIdx + displayIdx
                  const isActive = idx === currentStep
                  const sChangedVars = new Set(s.changedVars || [])
                  const sMovedPtrs = new Set(s.movedPointers || [])

                  return (
                    <tr
                      key={idx}
                      data-step={idx}
                      onClick={() => { setCurrentStep(idx); setPlaying(false) }}
                      style={{
                        cursor: 'pointer',
                        background: isActive
                          ? 'linear-gradient(90deg, rgba(99,102,241,0.12), rgba(236,72,153,0.06))'
                          : idx % 2 === 0 ? 'transparent' : 'rgba(163,177,198,0.03)',
                        borderLeft: isActive ? '3px solid #6366f1' : '3px solid transparent',
                        transition: 'background .15s',
                      }}
                      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(99,102,241,0.06)' }}
                      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = idx % 2 === 0 ? 'transparent' : 'rgba(163,177,198,0.03)' }}
                    >
                      <td style={{
                        ...tdStyle,
                        color: isActive ? '#6366f1' : 'var(--neu-text-secondary)',
                        fontWeight: isActive ? 900 : 400, fontSize: '.66rem',
                      }}>
                        {idx + 1}
                      </td>
                      <td style={{
                        ...tdStyle, textAlign: 'left',
                        color: isActive ? 'var(--neu-text-primary)' : 'var(--neu-text-secondary)',
                        fontWeight: isActive ? 700 : 400,
                        whiteSpace: 'nowrap',
                      }}
                        title={s.codeLine || ''}
                      >
                        {s.codeLine || '—'}
                      </td>
                      {allPtrNames.map(n => {
                        const val = s.pointers?.[n]
                        const moved = sMovedPtrs.has(n)
                        const pColor = pointerColorMap.current[n] || '#6366f1'
                        return (
                          <td key={n} style={{
                            ...tdStyle,
                            color: moved ? pColor : val !== undefined ? 'var(--neu-text-primary)' : 'rgba(163,177,198,0.2)',
                            fontWeight: moved ? 900 : 500,
                            background: moved && isActive ? `${pColor}12` : undefined,
                          }}>
                            {val !== undefined ? val : '—'}
                          </td>
                        )
                      })}
                      {allVarNames.map(n => {
                        const val = s.vars?.[n]
                        const changed = sChangedVars.has(n)
                        return (
                          <td key={n} style={{
                            ...tdStyle,
                            color: changed ? '#ec4899' : val !== undefined ? 'var(--neu-text-primary)' : 'rgba(163,177,198,0.2)',
                            fontWeight: changed ? 900 : 500,
                            background: changed && isActive ? 'rgba(236,72,153,0.08)' : undefined,
                          }}>
                            {val !== undefined ? String(val) : '—'}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )

  return vizContent
}

const ctrlBtn = {
  width: 28, height: 28, borderRadius: '50%', border: 'none',
  background: 'var(--neu-bg)', cursor: 'pointer',
  color: 'var(--neu-text-secondary)', fontSize: '.75rem',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  boxShadow: '2px 2px 4px var(--neu-shadow-dark), -2px -2px 4px var(--neu-shadow-light)',
  transition: 'all .15s',
}

const thStyle = {
  padding: '6px 7px',
  textAlign: 'center',
  fontSize: '.64rem',
  fontWeight: 800,
  color: 'var(--neu-text-secondary)',
  textTransform: 'uppercase',
  letterSpacing: '.04em',
  whiteSpace: 'nowrap',
}

const tdStyle = {
  padding: '5px 7px',
  textAlign: 'center',
  fontSize: '.68rem',
  borderBottom: '1px solid rgba(163,177,198,0.06)',
  whiteSpace: 'nowrap',
}
