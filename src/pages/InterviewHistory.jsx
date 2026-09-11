import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const scoreColor = (s) => s >= 7 ? '#22c55e' : s >= 5 ? '#f59e0b' : '#ef4444'
const confColor = (c) => c >= 80 ? '#22c55e' : c >= 60 ? '#f59e0b' : '#ef4444'

export default function InterviewHistory() {
  const navigate = useNavigate()
  const [sessions, setSessions] = useState([])
  const [stats, setStats] = useState(null)
  const [filter, setFilter] = useState('all')
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    fetch('/api/interview/sessions').then(r => r.json()).then(setSessions)
    fetch('/api/interview/stats').then(r => r.json()).then(setStats)
  }, [])

  const deleteSession = async (id) => {
    if (!confirm('Delete this session?')) return
    await fetch(`/api/interview/session/${id}`, { method: 'DELETE' })
    setSessions(prev => prev.filter(s => s.id !== id))
  }

  const categories = [...new Set(sessions.map(s => s.category))]
  const filtered = filter === 'all' ? sessions : sessions.filter(s => s.category === filter)

  const formatDate = (d) => {
    const dt = new Date(d)
    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="practice-history learning-overview" style={{ maxWidth: 1060, margin: '0 auto' }}>

      <header className="apple-page-heading"><div><span className="learning-eyebrow">PRACTICE & REVIEW</span><h1>Practice history</h1><p>Revisit your answers and see how your practice develops.</p></div></header>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/practice')}>← Practice</button>
        <select aria-label="Filter sessions by category"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          style={{
            background: 'var(--neu-bg)', border: 'none', borderRadius: 12, padding: '6px 12px',
            fontSize: '.78rem', color: 'var(--neu-text-primary)', cursor: 'pointer',
            boxShadow: '3px 3px 6px var(--neu-shadow-dark), -3px -3px 6px var(--neu-shadow-light)',
          }}
        >
          <option value="all">All categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <div style={{ marginLeft: 'auto', fontSize: '.78rem', fontFamily: 'monospace', color: 'var(--neu-text-secondary)' }}>
          {filtered.length} session{filtered.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Stats overview */}
      {stats && stats.total > 0 && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 24,
        }}>
          <div style={{
            background: 'var(--neu-bg)', borderRadius: 16, padding: '18px 20px',
            boxShadow: '6px 6px 12px var(--neu-shadow-dark), -6px -6px 12px var(--neu-shadow-light)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--neu-accent)' }}>{stats.total}</div>
            <div style={{ fontSize: '.68rem', fontWeight: 600, color: 'var(--neu-text-secondary)', textTransform: 'uppercase', fontFamily: 'monospace', marginTop: 4 }}>Total Sessions</div>
          </div>
          <div style={{
            background: 'var(--neu-bg)', borderRadius: 16, padding: '18px 20px',
            boxShadow: '6px 6px 12px var(--neu-shadow-dark), -6px -6px 12px var(--neu-shadow-light)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: scoreColor(stats.avg_score) }}>{stats.avg_score}/10</div>
            <div style={{ fontSize: '.68rem', fontWeight: 600, color: 'var(--neu-text-secondary)', textTransform: 'uppercase', fontFamily: 'monospace', marginTop: 4 }}>Avg Score</div>
          </div>
          <div style={{
            background: 'var(--neu-bg)', borderRadius: 16, padding: '18px 20px',
            boxShadow: '6px 6px 12px var(--neu-shadow-dark), -6px -6px 12px var(--neu-shadow-light)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: confColor(stats.avg_confidence) }}>{stats.avg_confidence}</div>
            <div style={{ fontSize: '.68rem', fontWeight: 600, color: 'var(--neu-text-secondary)', textTransform: 'uppercase', fontFamily: 'monospace', marginTop: 4 }}>Avg Confidence</div>
          </div>

          {/* Per-category breakdown */}
          {stats.by_category.map(cat => (
            <div key={cat.category} style={{
              background: 'var(--neu-bg)', borderRadius: 16, padding: '14px 16px',
              boxShadow: '4px 4px 8px var(--neu-shadow-dark), -4px -4px 8px var(--neu-shadow-light)',
            }}>
              <div style={{ fontSize: '.68rem', fontWeight: 700, color: 'var(--neu-accent)', fontFamily: 'monospace', marginBottom: 6 }}>{cat.category}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: '.78rem', color: 'var(--neu-text-secondary)' }}>{cat.cnt} session{cat.cnt !== 1 ? 's' : ''}</span>
                <span style={{ fontSize: '1rem', fontWeight: 700, color: scoreColor(cat.avg_score) }}>{cat.avg_score?.toFixed(1)}/10</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Progress trend (last 20 sessions) */}
      {stats && stats.recent && stats.recent.length > 1 && (
        <div style={{
          background: 'var(--neu-bg)', borderRadius: 16, padding: '16px 20px', marginBottom: 24,
          boxShadow: '6px 6px 12px var(--neu-shadow-dark), -6px -6px 12px var(--neu-shadow-light)',
        }}>
          <div style={{ fontSize: '.7rem', fontWeight: 700, color: 'var(--neu-text-secondary)', textTransform: 'uppercase', fontFamily: 'monospace', marginBottom: 12 }}>
            Score Trend (recent sessions)
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 60 }}>
            {[...stats.recent].reverse().map((r, i) => {
              const h = r.score ? (r.score / 10) * 100 : 10
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <div style={{
                    width: '100%', maxWidth: 24, height: `${h}%`, minHeight: 4,
                    background: `linear-gradient(180deg, ${scoreColor(r.score)} 0%, ${scoreColor(r.score)}88 100%)`,
                    borderRadius: 4,
                  }} />
                </div>
              )
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ fontSize: '.58rem', color: 'var(--neu-text-secondary)' }}>Oldest</span>
            <span style={{ fontSize: '.58rem', color: 'var(--neu-text-secondary)' }}>Latest</span>
          </div>
        </div>
      )}

      {/* Session list */}
      {filtered.length === 0 ? (
        <div className="hub-empty-state" style={{
          background: 'var(--neu-bg)', borderRadius: 16, padding: '40px 20px',
          boxShadow: '6px 6px 12px var(--neu-shadow-dark), -6px -6px 12px var(--neu-shadow-light)',
          textAlign: 'center',
        }}>
          <span className="learning-eyebrow">YOUR PRACTICE JOURNAL</span>
          <div style={{ color: 'var(--neu-text-secondary)', fontSize: '.9rem' }}>{filter === 'all' ? 'Your first session starts here.' : 'No sessions in this category.'}</div>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/practice')} style={{ marginTop: 16 }}>Start Practicing</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(s => {
            const conf = (() => { try { return JSON.parse(s.confidence_json) } catch { return {} } })()
            const isExpanded = expanded === s.id

            return (
              <div key={s.id} style={{
                background: 'var(--neu-bg)', borderRadius: 16, padding: '16px 20px',
                boxShadow: '4px 4px 8px var(--neu-shadow-dark), -4px -4px 8px var(--neu-shadow-light)',
                borderLeft: `4px solid ${scoreColor(s.score)}`,
                cursor: 'pointer',
              }} onClick={() => setExpanded(isExpanded ? null : s.id)}>

                {/* Header row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {/* Score circle */}
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                    border: `3px solid ${scoreColor(s.score)}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '.95rem', fontWeight: 800, color: scoreColor(s.score), fontFamily: 'monospace',
                  }}>{s.score || '—'}</div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '.88rem', color: 'var(--neu-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {s.question}
                    </div>
                    <div style={{ display: 'flex', gap: 10, fontSize: '.68rem', color: 'var(--neu-text-secondary)', marginTop: 3, fontFamily: 'monospace' }}>
                      <span style={{ background: 'var(--neu-accent-soft)', color: 'var(--neu-accent)', padding: '1px 8px', borderRadius: 999, fontWeight: 600 }}>{s.category}</span>
                      <span>{formatDate(s.created_at)}</span>
                      <span>{s.duration_sec}s</span>
                      {conf.overall != null && <span style={{ color: confColor(conf.overall) }}>Conf: {conf.overall}</span>}
                    </div>
                  </div>

                  <div style={{ color: 'var(--neu-text-secondary)', fontSize: '.8rem', flexShrink: 0 }}>
                    {isExpanded ? '▲' : '▼'}
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div style={{ marginTop: 16 }} onClick={e => e.stopPropagation()}>
                    {/* Transcript */}
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: '.68rem', fontWeight: 700, color: 'var(--neu-text-secondary)', textTransform: 'uppercase', fontFamily: 'monospace', marginBottom: 6 }}>Your Answer</div>
                      <div style={{
                        background: 'var(--neu-bg)', borderRadius: 12, padding: '12px 14px',
                        boxShadow: 'inset 2px 2px 4px var(--neu-shadow-dark), inset -2px -2px 4px var(--neu-shadow-light)',
                        fontSize: '.82rem', lineHeight: 1.7, color: 'var(--neu-text-primary)', maxHeight: 200, overflowY: 'auto',
                      }}>
                        {s.transcript}
                      </div>
                    </div>

                    {/* Confidence metrics */}
                    {conf.overall != null && (
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: '.68rem', fontWeight: 700, color: 'var(--neu-text-secondary)', textTransform: 'uppercase', fontFamily: 'monospace', marginBottom: 6 }}>Confidence Metrics</div>
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                          {[
                            { label: 'Overall', value: conf.overall, color: confColor(conf.overall) },
                            { label: 'Pace', value: `${conf.wpm} wpm`, color: confColor(conf.paceScore || 50) },
                            { label: 'Fillers', value: `${conf.fillerCount || 0}`, color: confColor(conf.fillerScore || 50) },
                            { label: 'Words', value: conf.wordCount },
                          ].map((m, i) => (
                            <div key={i} style={{
                              background: 'var(--neu-bg)', borderRadius: 10, padding: '6px 12px',
                              boxShadow: 'inset 2px 2px 4px var(--neu-shadow-dark), inset -2px -2px 4px var(--neu-shadow-light)',
                              fontSize: '.72rem', fontFamily: 'monospace',
                            }}>
                              <span style={{ color: 'var(--neu-text-secondary)' }}>{m.label}: </span>
                              <span style={{ fontWeight: 700, color: m.color || 'var(--neu-text-primary)' }}>{m.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* AI Feedback */}
                    {s.feedback && (
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: '.68rem', fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', fontFamily: 'monospace', marginBottom: 6 }}>AI Feedback</div>
                        <div style={{
                          background: 'var(--neu-bg)', borderRadius: 12, padding: '12px 14px',
                          boxShadow: 'inset 2px 2px 4px var(--neu-shadow-dark), inset -2px -2px 4px var(--neu-shadow-light)',
                          borderLeft: '3px solid #7c3aed',
                          fontSize: '.82rem', lineHeight: 1.7, color: 'var(--neu-text-primary)', whiteSpace: 'pre-wrap',
                          maxHeight: 300, overflowY: 'auto',
                        }}>
                          {s.feedback}
                        </div>
                      </div>
                    )}

                    {/* Delete */}
                    <div style={{ textAlign: 'right' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => deleteSession(s.id)}
                        style={{ fontSize: '.72rem', color: '#ef4444' }}
                      >
                        Delete Session
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
