import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  PHASES, loadProgress, saveProgress, problemId,
  cycleStatus, STATUS_META, DIFFICULTY_COLORS, getTotalProblems,
} from '../data/pythonData'

export default function PythonSheet() {
  const navigate = useNavigate()
  const [progress, setProgress] = useState(loadProgress)
  const [openPhases, setOpenPhases] = useState(new Set())
  const [search, setSearch] = useState('')

  useEffect(() => {
    const sync = () => setProgress(loadProgress())
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])

  const toggle = (id) => {
    setProgress(prev => {
      const newStatus = cycleStatus(prev[id])
      const next = { ...prev, [id]: newStatus }
      saveProgress(next, id, newStatus)
      return next
    })
  }

  const togglePhase = (phaseId) => {
    setOpenPhases(prev => {
      const next = new Set(prev)
      next.has(phaseId) ? next.delete(phaseId) : next.add(phaseId)
      return next
    })
  }

  const expandAll = () => setOpenPhases(new Set(PHASES.map(s => s.id)))
  const collapseAll = () => setOpenPhases(new Set())

  // Overall stats
  const totalProblems = getTotalProblems()
  let solved = 0, attempted = 0
  PHASES.forEach((phase, si) => phase.topics.forEach((topic, ti) =>
    topic.problems.forEach((_, pi) => {
      const s = Number(progress[problemId(si, ti, pi)]) || 0
      if (s === 2) solved++
      else if (s === 1) attempted++
    })
  ))
  const overallPct = totalProblems ? Math.round(solved / totalProblems * 100) : 0

  const q = search.toLowerCase()

  return (
    <div style={{ maxWidth: 1060, margin: '0 auto' }}>
      <div className="prep-header"><span className="learning-eyebrow">LEARNING ROADMAP</span><h1>Python roadmap</h1><p>Develop Python fluency, from language fundamentals to production patterns.</p></div>
      <div className="apple-actions"><Link className="btn btn-primary" to="/python/practice">Practice Python →</Link><Link className="btn btn-secondary" to="/python/blog">Read topic guides</Link></div>

      {/* Overall Progress */}
      <div className="apple-sheet-summary" style={{
        background: 'var(--neu-bg)', borderRadius: 20, padding: '20px 24px', marginBottom: 24,
        boxShadow: '6px 6px 12px var(--neu-shadow-dark), -6px -6px 12px var(--neu-shadow-light)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div>
            <span style={{ fontWeight: 700, fontSize: '.9rem', color: 'var(--neu-text-primary)' }}>Overall Progress</span>
            <span style={{ fontSize: '.75rem', color: 'var(--neu-text-secondary)', marginLeft: 12, fontFamily: 'inherit' }}>
              {totalProblems} problems · {PHASES.length} phases
            </span>
          </div>
          <div style={{ display: 'flex', gap: 16, fontSize: '.78rem', fontFamily: 'inherit' }}>
            <span style={{ color: '#22c55e' }}>✓ {solved} solved</span>
            <span style={{ color: '#f59e0b' }}>~ {attempted} attempted</span>
            <span style={{ color: '#94a3b8' }}>○ {totalProblems - solved - attempted} todo</span>
          </div>
        </div>
        <div className="prep-progress-track">
          <div className="prep-progress-fill" style={{ width: `${overallPct}%` }} />
        </div>
        <div style={{ fontSize: '.72rem', color: 'var(--neu-text-secondary)', marginTop: 6, fontFamily: 'inherit', textAlign: 'right' }}>
          {overallPct}% complete
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-sm items-center" style={{ marginBottom: 20, flexWrap: 'wrap' }}>
        <input
          type="search" aria-label="Search problems or topics" placeholder="Search problems or topics"
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 200 }}
        />
        <button className="btn btn-secondary btn-sm" onClick={expandAll}>Expand All</button>
        <button className="btn btn-secondary btn-sm" onClick={collapseAll}>Collapse All</button>
      </div>

      {/* Phases */}
      {PHASES.map((phase, si) => {
        let phaseTotal = 0, phaseSolved = 0, phaseAttempted = 0
        phase.topics.forEach((t, ti) => t.problems.forEach((_, pi) => {
          phaseTotal++
          const s = Number(progress[problemId(si, ti, pi)]) || 0
          if (s === 2) phaseSolved++
          else if (s === 1) phaseAttempted++
        }))
        const phasePct = phaseTotal ? Math.round(phaseSolved / phaseTotal * 100) : 0
        const isOpen = openPhases.has(phase.id)

        const hasMatch = !q || phase.topics.some(t =>
          t.problems.some(p => p.title.toLowerCase().includes(q)) ||
          t.label.toLowerCase().includes(q)
        )
        if (!hasMatch) return null

        return (
          <div key={phase.id} style={{ marginBottom: 14 }}>
            {/* Phase header */}
            <div
              className="apple-sheet-step"
              role="button" tabIndex={0} aria-expanded={isOpen || !!q}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); togglePhase(phase.id) } }}
              onClick={() => togglePhase(phase.id)}
              style={{
                background: 'var(--neu-bg)', borderRadius: 16, padding: '14px 18px',
                cursor: 'pointer',
                boxShadow: phaseSolved === phaseTotal && phaseTotal > 0
                  ? `inset 3px 3px 6px var(--neu-shadow-dark), inset -3px -3px 6px var(--neu-shadow-light), 0 0 0 2px ${phase.color}`
                  : '4px 4px 8px var(--neu-shadow-dark), -4px -4px 8px var(--neu-shadow-light)',
                borderLeft: `4px solid ${phase.color}`,
                display: 'flex', alignItems: 'center', gap: 12,
                transition: 'transform .12s',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = '' }}
            >
              <div style={{
                width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem',
                background: 'var(--neu-bg)',
                boxShadow: 'inset 3px 3px 6px var(--neu-shadow-dark), inset -3px -3px 6px var(--neu-shadow-light)',
              }} className="course-ordinal">{String(phase.phase).padStart(2, '0')}</div>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: '.9rem', color: 'var(--neu-text-primary)' }}>
                    Phase {phase.phase}: {phase.title}
                  </span>
                  {phaseSolved === phaseTotal && phaseTotal > 0 && (
                    <span style={{ fontSize: '.68rem', color: '#22c55e', fontWeight: 700, background: 'rgba(34,197,94,0.12)', padding: '2px 8px', borderRadius: 999 }}>✓ Done</span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                  <div style={{
                    flex: 1, maxWidth: 200, height: 5, background: 'var(--neu-bg)', borderRadius: 999, overflow: 'hidden',
                    boxShadow: 'inset 2px 2px 3px var(--neu-shadow-dark), inset -2px -2px 3px var(--neu-shadow-light)',
                  }}>
                    <div style={{ width: `${phasePct}%`, height: '100%', background: 'var(--neu-accent)', borderRadius: 999, transition: 'width .3s' }} />
                  </div>
                  <span style={{ fontSize: '.7rem', fontFamily: 'inherit', color: 'var(--neu-accent)', fontWeight: 600 }}>
                    {phaseSolved}/{phaseTotal}
                  </span>
                </div>
              </div>

              <span style={{ fontSize: '.85rem', color: 'var(--neu-text-secondary)', transition: 'transform .2s', transform: isOpen ? 'rotate(0)' : 'rotate(-90deg)' }}>▾</span>
            </div>

            {/* Topics & Problems */}
            {(isOpen || q) && (
              <div style={{ paddingLeft: 20, marginTop: 8 }}>
                {phase.topics.map((topic, ti) => {
                  const filteredProblems = q
                    ? topic.problems.map((p, pi) => ({ p, pi })).filter(({ p }) => topic.label.toLowerCase().includes(q) || p.title.toLowerCase().includes(q))
                    : topic.problems.map((p, pi) => ({ p, pi }))

                  if (q && filteredProblems.length === 0 && !topic.label.toLowerCase().includes(q)) return null

                  return (
                    <div key={ti} style={{ marginBottom: 12 }}>
                      <div style={{
                        fontSize: '.75rem', fontWeight: 700, color: 'var(--neu-accent)',
                        padding: '4px 0', marginBottom: 4,
                        display: 'flex', alignItems: 'center', gap: 6,
                      }}>
                        <span style={{ background: `${phase.color}18`, padding: '2px 10px', borderRadius: 999 }}>{topic.label}</span>
                        <span style={{ fontSize: '.68rem', color: 'var(--neu-text-secondary)', fontFamily: 'inherit' }}>
                          {filteredProblems.length} problems
                        </span>
                      </div>

                      {filteredProblems.map(({ p, pi }) => {
                        const pId = problemId(si, ti, pi)
                        const status = Number(progress[pId]) || 0
                        const meta = STATUS_META[status]
                        const diff = DIFFICULTY_COLORS[p.difficulty]

                        return (
                          <div
                            key={pId}
                            className="apple-problem-row"
                            style={{
                              display: 'flex', alignItems: 'center', gap: 10,
                              padding: '7px 12px', marginBottom: 2,
                              borderRadius: 10, cursor: 'pointer',
                              transition: 'background .1s',
                              background: status === 2 ? 'rgba(34,197,94,0.04)' : 'transparent',
                            }}
                            onMouseEnter={e => { if (status !== 2) e.currentTarget.style.background = 'rgba(163,177,198,0.06)' }}
                            onMouseLeave={e => { if (status !== 2) e.currentTarget.style.background = 'transparent' }}
                          >
                            <button
                              title={meta.tip}
                              aria-label={`${p.title}: ${meta.tip}. Change status`}
                              onClick={e => { e.stopPropagation(); toggle(pId) }}
                              style={{
                                width: 24, height: 24, borderRadius: '50%', border: `2px solid ${meta.color}`,
                                background: status === 2 ? meta.color : 'transparent',
                                color: status === 2 ? '#fff' : meta.color,
                                fontSize: '.7rem', fontWeight: 800, cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0, transition: 'all .15s',
                              }}
                            >{meta.label}</button>

                            <Link className="apple-problem-link"
                              to={`/python/${si}/${ti}/${pi}`}
                              style={{
                                flex: 1, fontSize: '.84rem',
                                color: status === 2 ? 'var(--neu-text-secondary)' : 'var(--neu-text-primary)',
                                textDecoration: status === 2 ? 'line-through' : 'none',
                                cursor: 'pointer',
                              }}
                            >{p.title}</Link>

                            <span style={{
                              fontSize: '.64rem', fontWeight: 700, padding: '2px 8px',
                              borderRadius: 999, background: diff.bg, color: diff.color,
                              flexShrink: 0, fontFamily: 'inherit',
                            }}>{p.difficulty}</span>

                            <button
                              onClick={() => navigate(`/python/${si}/${ti}/${pi}`)}
                              title="Open in editor"
                              style={{
                                width: 26, height: 26, borderRadius: '50%', border: 'none',
                                background: 'var(--neu-bg)', cursor: 'pointer',
                                color: 'var(--neu-text-secondary)', fontSize: '.7rem',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: '2px 2px 4px var(--neu-shadow-dark), -2px -2px 4px var(--neu-shadow-light)',
                                flexShrink: 0, opacity: 0.6, transition: 'opacity .15s',
                              }}
                              onMouseEnter={e => { e.currentTarget.style.opacity = '1' }}
                              onMouseLeave={e => { e.currentTarget.style.opacity = '0.6' }}
                            >{'</>'}</button>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
