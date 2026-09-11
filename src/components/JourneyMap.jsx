import { useState } from 'react'
import { Link } from 'react-router-dom'

// Stages are subject-neutral: the same map supports generated and curated paths.
export default function JourneyMap({ stages, title }) {
  const [view, setView] = useState('map')
  const [selectedId, setSelectedId] = useState(null)
  const [page, setPage] = useState(() => Math.floor(Math.max(0, stages.findIndex(s => s.done < s.total)) / 4))
  const selected = stages.find(s => s.id === selectedId) || stages.find(s => s.done < s.total) || stages[0]
  if (!selected) return null
  const visible = view === 'map' ? stages.slice(page * 4, page * 4 + 4) : stages
  return <section className="journey" aria-label={`${title} learning journey`}>
    <div className="journey-heading"><div><span className="learning-eyebrow">YOUR LEARNING JOURNEY</span><h2>A little further, one chapter at a time.</h2></div><div className="journey-switch" aria-label="Path view">{['map', 'list'].map(mode => <button key={mode} aria-pressed={view === mode} onClick={() => { setView(mode); if (mode === 'map') setPage(Math.floor(stages.indexOf(selected) / 4)) }}>{mode === 'map' ? 'Journey' : 'List'}</button>)}</div></div>
    <div className={`journey-canvas canvas-${view}`}><svg className="journey-curve" viewBox="0 0 1000 100" preserveAspectRatio="none" aria-hidden="true"><path d="M125 32 C250 32 250 60 375 60 S500 32 625 32 S750 60 875 60" /></svg><ol className={`journey-stages journey-${view}`}>{visible.map((stage, index) => <li key={stage.id}><button className={`journey-node${selected.id === stage.id ? ' selected' : ''}`} aria-pressed={selected.id === stage.id} onClick={() => setSelectedId(stage.id)}><span className={`journey-number${stage.total > 0 && stage.done === stage.total ? ' complete' : ''}`}>{stage.total > 0 && stage.done === stage.total ? '✓' : String((view === 'map' ? page * 4 : 0) + index + 1).padStart(2, '0')}</span><strong>{stage.title.replace(/^\d+\s*·\s*/, '')}</strong><small>{stage.done} / {stage.total} completed</small></button></li>)}</ol></div>
    {view === 'map' && stages.length > 4 && <div className="journey-pagination"><button disabled={page === 0} onClick={() => { setPage(page - 1); setSelectedId(stages[(page - 1) * 4].id) }}>← Previous chapters</button><span>{page * 4 + 1}–{Math.min(page * 4 + 4, stages.length)} of {stages.length}</span><button disabled={(page + 1) * 4 >= stages.length} onClick={() => { setPage(page + 1); setSelectedId(stages[(page + 1) * 4].id) }}>Next chapters →</button></div>}
    <div className="journey-detail" aria-live="polite"><div><span className="learning-eyebrow">CHAPTER {stages.indexOf(selected) + 1}</span><h3>{selected.title.replace(/^\d+\s*·\s*/, '')}</h3>{selected.description && <p>{selected.description}</p>}<progress value={selected.done} max={selected.total || 1} aria-label={`${selected.title} completion`} /></div><div className="journey-lessons">{selected.items.map(item => item.to ? <Link key={item.id} to={item.to}><span>{item.title}</span><span aria-hidden="true">↗</span></Link> : <button key={item.id} onClick={item.onSelect}><span>{item.completed ? '✓ ' : ''}{item.title}</span><span aria-hidden="true">→</span></button>)}</div></div>
  </section>
}
