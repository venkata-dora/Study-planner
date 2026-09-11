import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getLocalDate } from '../utils/dateUtils'
import {
  STEPS, loadProgress, saveProgress, problemId,
  cycleStatus, STATUS_META, DIFFICULTY_COLORS, getTotalProblems,
  loadDailyHistory, syncFromDB,
} from '../data/dsaData'

export default function DSASheet() {
  const navigate = useNavigate()
  const [progress, setProgress] = useState(loadProgress)
  const [openSteps, setOpenSteps] = useState(new Set())
  const [search, setSearch] = useState('')
  const [showDashboard, setShowDashboard] = useState(() => localStorage.getItem('dp_dsa_dashboard_open') === '1')
  const [generatingIds, setGeneratingIds] = useState(new Set())

  useEffect(() => {
    // Sync from DB on mount, then refresh state
    syncFromDB().then(() => setProgress(loadProgress()))
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

  const toggleStep = (stepId) => {
    setOpenSteps(prev => {
      const next = new Set(prev)
      next.has(stepId) ? next.delete(stepId) : next.add(stepId)
      return next
    })
  }

  const expandAll = () => setOpenSteps(new Set(STEPS.map(s => s.id)))
  const collapseAll = () => setOpenSteps(new Set())

  // Overall stats
  const totalProblems = getTotalProblems()
  let solved = 0, attempted = 0
  STEPS.forEach((step, si) => step.topics.forEach((topic, ti) =>
    topic.problems.forEach((_, pi) => {
      const s = Number(progress[problemId(si, ti, pi)]) || 0
      if (s === 2) solved++
      else if (s === 1) attempted++
    })
  ))
  const overallPct = totalProblems ? Math.round(solved / totalProblems * 100) : 0

  const q = search.toLowerCase()

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div className="prep-header"><span className="learning-eyebrow">LEARNING ROADMAP</span><h1>Striver’s A2Z DSA</h1><p>Build your foundations through ordered topics and hands-on problem solving.</p></div>
      <div className="apple-actions"><Link className="btn btn-primary" to="/dsa/practice">Practice DSA →</Link></div>

      {/* Overall Progress */}
      <div className="apple-sheet-summary" style={{
        background: 'var(--neu-bg)', borderRadius: 20, padding: '20px 24px', marginBottom: 24,
        boxShadow: '6px 6px 12px var(--neu-shadow-dark), -6px -6px 12px var(--neu-shadow-light)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div>
            <span style={{ fontWeight: 700, fontSize: '.9rem', color: 'var(--neu-text-primary)' }}>Overall Progress</span>
            <span style={{ fontSize: '.75rem', color: 'var(--neu-text-secondary)', marginLeft: 12, fontFamily: 'monospace' }}>
              {totalProblems} problems · {STEPS.length} steps
            </span>
          </div>
          <div style={{ display: 'flex', gap: 16, fontSize: '.78rem', fontFamily: 'monospace' }}>
            <span style={{ color: '#22c55e' }}>✓ {solved} solved</span>
            <span style={{ color: '#f59e0b' }}>~ {attempted} attempted</span>
            <span style={{ color: '#94a3b8' }}>○ {totalProblems - solved - attempted} todo</span>
          </div>
        </div>
        <div className="prep-progress-track">
          <div className="prep-progress-fill" style={{ width: `${overallPct}%` }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
          <button
            onClick={() => {
              const next = !showDashboard
              setShowDashboard(next)
              localStorage.setItem('dp_dsa_dashboard_open', next ? '1' : '0')
            }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              fontSize: '.72rem', fontWeight: 600, color: 'var(--neu-accent)',
              display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            <span style={{ transition: 'transform .2s', transform: showDashboard ? 'rotate(0)' : 'rotate(-90deg)', display: 'inline-block' }}>▾</span>
            {showDashboard ? 'Hide Dashboard' : 'Show Dashboard'}
          </button>
          <span style={{ fontSize: '.72rem', color: 'var(--neu-text-secondary)', fontFamily: 'monospace' }}>
            {overallPct}% complete
          </span>
        </div>

        {/* Mini Dashboard */}
        {showDashboard && (() => {
          const daily = loadDailyHistory()
          const today = getLocalDate()
          const todaySolved = (daily[today] || []).length

          // Streak calculation (use local dates to avoid timezone issues)
          const toLocalDate = (dt) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
          let streak = 0
          const d = new Date()
          // If today has solves, count it; otherwise start from yesterday
          if ((daily[today] || []).length === 0) d.setDate(d.getDate() - 1)
          while (true) {
            const key = toLocalDate(d)
            if ((daily[key] || []).length > 0) { streak++; d.setDate(d.getDate() - 1) }
            else break
          }

          // Last 14 days activity
          const last14 = []
          for (let i = 13; i >= 0; i--) {
            const dt = new Date()
            dt.setDate(dt.getDate() - i)
            const key = toLocalDate(dt)
            const count = (daily[key] || []).length
            last14.push({ date: key, count, day: dt.toLocaleDateString('en', { weekday: 'short' }).slice(0, 2) })
          }
          const maxDaily = Math.max(1, ...last14.map(d => d.count))

          // Difficulty breakdown
          let easy = 0, medium = 0, hard = 0
          STEPS.forEach((step, si) => step.topics.forEach((topic, ti) =>
            topic.problems.forEach((p, pi) => {
              if (Number(progress[problemId(si, ti, pi)]) === 2) {
                if (p.difficulty === 'Easy') easy++
                else if (p.difficulty === 'Medium') medium++
                else if (p.difficulty === 'Hard') hard++
              }
            })
          ))

          // Best day
          let bestDay = '', bestCount = 0
          Object.entries(daily).forEach(([date, ids]) => {
            if (ids.length > bestCount) { bestCount = ids.length; bestDay = date }
          })

          // Total active days
          const activeDays = Object.values(daily).filter(ids => ids.length > 0).length

          return (
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Stats row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                {[
                  { label: 'Streak', value: `${streak}d`, icon: '🔥', color: '#ef4444', sub: streak > 0 ? 'Keep going!' : 'Start today' },
                  { label: 'Today', value: todaySolved, icon: '📌', color: '#2563eb', sub: 'Problems solved' },
                  { label: 'Active Days', value: activeDays, icon: '📅', color: '#7c3aed', sub: bestDay ? `Best: ${bestCount} on ${bestDay.slice(5)}` : 'No data' },
                  { label: 'Avg / Day', value: activeDays > 0 ? (solved / activeDays).toFixed(1) : '0', icon: '📊', color: '#0ea5e9', sub: `${solved} total solved` },
                ].map((s, i) => (
                  <div key={i} style={{
                    background: 'var(--neu-bg)', borderRadius: 14, padding: '12px 14px',
                    boxShadow: 'inset 3px 3px 6px var(--neu-shadow-dark), inset -3px -3px 6px var(--neu-shadow-light)',
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: '1.1rem', marginBottom: 4 }}>{s.icon}</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: s.color, fontFamily: 'monospace' }}>{s.value}</div>
                    <div style={{ fontSize: '.68rem', fontWeight: 700, color: 'var(--neu-text-primary)', marginTop: 2 }}>{s.label}</div>
                    <div style={{ fontSize: '.6rem', color: 'var(--neu-text-secondary)', marginTop: 2 }}>{s.sub}</div>
                  </div>
                ))}
              </div>

              {/* Activity chart + Difficulty split */}
              <div style={{ display: 'flex', gap: 10 }}>
                {/* 14-day activity */}
                <div style={{
                  flex: 1, background: 'var(--neu-bg)', borderRadius: 14, padding: '12px 16px',
                  boxShadow: 'inset 3px 3px 6px var(--neu-shadow-dark), inset -3px -3px 6px var(--neu-shadow-light)',
                }}>
                  <div style={{ fontSize: '.68rem', fontWeight: 700, color: 'var(--neu-text-secondary)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 10, fontFamily: 'monospace' }}>
                    Last 14 Days
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 60 }}>
                    {last14.map((d, i) => (
                      <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                        <div
                          title={`${d.date}: ${d.count} solved`}
                          style={{
                            width: '100%', borderRadius: 4,
                            height: d.count > 0 ? Math.max(6, (d.count / maxDaily) * 50) : 3,
                            background: d.count > 0
                              ? d.date === today ? '#2563eb' : '#22c55e'
                              : 'rgba(163,177,198,0.2)',
                            transition: 'height .3s',
                          }}
                        />
                        <span style={{ fontSize: '.5rem', color: d.date === today ? 'var(--neu-accent)' : 'var(--neu-text-secondary)', fontFamily: 'monospace', fontWeight: d.date === today ? 700 : 400 }}>
                          {d.day}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Difficulty breakdown */}
                <div style={{
                  width: 180, flexShrink: 0, background: 'var(--neu-bg)', borderRadius: 14, padding: '12px 16px',
                  boxShadow: 'inset 3px 3px 6px var(--neu-shadow-dark), inset -3px -3px 6px var(--neu-shadow-light)',
                }}>
                  <div style={{ fontSize: '.68rem', fontWeight: 700, color: 'var(--neu-text-secondary)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 10, fontFamily: 'monospace' }}>
                    Difficulty Split
                  </div>
                  {[
                    { label: 'Easy', count: easy, color: '#22c55e' },
                    { label: 'Medium', count: medium, color: '#f59e0b' },
                    { label: 'Hard', count: hard, color: '#ef4444' },
                  ].map((d, i) => (
                    <div key={i} style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ fontSize: '.68rem', fontWeight: 600, color: d.color }}>{d.label}</span>
                        <span style={{ fontSize: '.68rem', fontFamily: 'monospace', color: 'var(--neu-text-secondary)' }}>{d.count}</span>
                      </div>
                      <div style={{ height: 5, background: 'rgba(163,177,198,0.15)', borderRadius: 999, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${solved > 0 ? (d.count / solved) * 100 : 0}%`, background: d.color, borderRadius: 999, transition: 'width .3s' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        })()}
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

      {/* Steps */}
      {STEPS.map((step, si) => {
        // Step-level stats
        let stepTotal = 0, stepSolved = 0, stepAttempted = 0
        step.topics.forEach((t, ti) => t.problems.forEach((_, pi) => {
          stepTotal++
          const s = Number(progress[problemId(si, ti, pi)]) || 0
          if (s === 2) stepSolved++
          else if (s === 1) stepAttempted++
        }))
        const stepPct = stepTotal ? Math.round(stepSolved / stepTotal * 100) : 0
        const isOpen = openSteps.has(step.id)

        // Filter
        const hasMatch = !q || step.topics.some(t =>
          t.problems.some(p => p.title.toLowerCase().includes(q)) ||
          t.label.toLowerCase().includes(q)
        )
        if (!hasMatch) return null

        return (
          <div key={step.id} style={{ marginBottom: 14 }}>
            {/* Step header */}
            <div
              className="apple-sheet-step"
              role="button" tabIndex={0} aria-expanded={isOpen || !!q}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleStep(step.id) } }}
              onClick={() => toggleStep(step.id)}
              style={{
                background: 'var(--neu-bg)', borderRadius: 16, padding: '14px 18px',
                cursor: 'pointer',
                boxShadow: stepSolved === stepTotal && stepTotal > 0
                  ? `inset 3px 3px 6px var(--neu-shadow-dark), inset -3px -3px 6px var(--neu-shadow-light), 0 0 0 2px ${step.color}`
                  : '4px 4px 8px var(--neu-shadow-dark), -4px -4px 8px var(--neu-shadow-light)',
                borderLeft: `4px solid ${step.color}`,
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
              }}>{step.icon}</div>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: '.9rem', color: 'var(--neu-text-primary)' }}>
                    Step {step.step}: {step.title}
                  </span>
                  {stepSolved === stepTotal && stepTotal > 0 && (
                    <span style={{ fontSize: '.68rem', color: '#22c55e', fontWeight: 700, background: 'rgba(34,197,94,0.12)', padding: '2px 8px', borderRadius: 999 }}>✓ Done</span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                  <div style={{
                    flex: 1, maxWidth: 200, height: 5, background: 'var(--neu-bg)', borderRadius: 999, overflow: 'hidden',
                    boxShadow: 'inset 2px 2px 3px var(--neu-shadow-dark), inset -2px -2px 3px var(--neu-shadow-light)',
                  }}>
                    <div style={{ width: `${stepPct}%`, height: '100%', background: step.color, borderRadius: 999, transition: 'width .3s' }} />
                  </div>
                  <span style={{ fontSize: '.7rem', fontFamily: 'monospace', color: step.color, fontWeight: 600 }}>
                    {stepSolved}/{stepTotal}
                  </span>
                </div>
              </div>

              <span style={{ fontSize: '.85rem', color: 'var(--neu-text-secondary)', transition: 'transform .2s', transform: isOpen ? 'rotate(0)' : 'rotate(-90deg)' }}>▾</span>
            </div>

            {/* Topics & Problems */}
            {(isOpen || q) && (
              <div style={{ paddingLeft: 20, marginTop: 8 }}>
                {step.topics.map((topic, ti) => {
                  const filteredProblems = q
                    ? topic.problems.map((p, pi) => ({ p, pi })).filter(({ p }) => topic.label.toLowerCase().includes(q) || p.title.toLowerCase().includes(q))
                    : topic.problems.map((p, pi) => ({ p, pi }))

                  if (q && filteredProblems.length === 0 && !topic.label.toLowerCase().includes(q)) return null

                  return (
                    <div key={ti} style={{ marginBottom: 12 }}>
                      {/* Topic label */}
                      <div style={{
                        fontSize: '.75rem', fontWeight: 700, color: step.color,
                        padding: '4px 0', marginBottom: 4,
                        display: 'flex', alignItems: 'center', gap: 6,
                      }}>
                        <span style={{ background: `${step.color}18`, padding: '2px 10px', borderRadius: 999 }}>{topic.label}</span>
                        <span style={{ fontSize: '.68rem', color: 'var(--neu-text-secondary)', fontFamily: 'monospace' }}>
                          {filteredProblems.length} problems
                        </span>
                      </div>

                      {/* Problem rows */}
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
                            {/* Status toggle */}
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

                            {/* Problem title */}
                            <Link className="apple-problem-link"
                              to={`/dsa/${si}/${ti}/${pi}`}
                              style={{
                                flex: 1, fontSize: '.84rem',
                                color: status === 2 ? 'var(--neu-text-secondary)' : 'var(--neu-text-primary)',
                                textDecoration: status === 2 ? 'line-through' : 'none',
                                cursor: 'pointer',
                              }}
                            >{p.title}</Link>

                            {/* Difficulty badge */}
                            <span style={{
                              fontSize: '.64rem', fontWeight: 700, padding: '2px 8px',
                              borderRadius: 999, background: diff.bg, color: diff.color,
                              flexShrink: 0, fontFamily: 'monospace',
                            }}>{p.difficulty}</span>

                            {/* Generate problem if no description */}
                            {!p.description && (
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation()
                                  const gId = pId
                                  setGeneratingIds(prev => new Set([...prev, gId]))
                                  try {
                                    const res = await fetch('/api/dsa/generate-problem', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({
                                        title: p.title,
                                        difficulty: p.difficulty,
                                        topic_label: topic.label,
                                        step_title: step.title,
                                      }),
                                    })
                                    const data = await res.json()
                                    if (data.ok) {
                                      // Reload page to pick up new dsaData.js (dev server HMR)
                                      window.location.reload()
                                    }
                                  } catch {}
                                  setGeneratingIds(prev => { const n = new Set(prev); n.delete(gId); return n })
                                }}
                                disabled={generatingIds.has(pId)}
                                title="Generate problem description & tests"
                                style={{
                                  width: 26, height: 26, borderRadius: '50%', border: 'none',
                                  background: generatingIds.has(pId) ? 'var(--neu-accent-soft)' : 'var(--neu-bg)',
                                  cursor: generatingIds.has(pId) ? 'wait' : 'pointer',
                                  color: generatingIds.has(pId) ? 'var(--neu-accent)' : '#f59e0b',
                                  fontSize: '.7rem',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  boxShadow: '2px 2px 4px var(--neu-shadow-dark), -2px -2px 4px var(--neu-shadow-light)',
                                  flexShrink: 0, opacity: 0.7, transition: 'opacity .15s',
                                  animation: generatingIds.has(pId) ? 'pulse 1.5s infinite' : 'none',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.opacity = '1' }}
                                onMouseLeave={e => { e.currentTarget.style.opacity = '0.7' }}
                              >{generatingIds.has(pId) ? '⏳' : '⚡'}</button>
                            )}

                            {/* Open in editor */}
                            <button
                              onClick={() => navigate(`/dsa/${si}/${ti}/${pi}`)}
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
