import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { renderMarkdown } from './TopicBlog'
import JourneyMap from '../components/JourneyMap'
import BlogHighlighter from '../components/BlogHighlighter'

async function api(path, options) {
  const response = await fetch(`/api/roadmaps${path}`, options)
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'Unable to reach your roadmaps. Please try again.')
  return data
}
const send = (method, body) => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

function PreparingPath({ subject, level }) {
  const [message, setMessage] = useState(0)
  const heading = useRef(null)
  const messages = ['Preparing your syllabus', 'Organizing a course structure for your level', 'Connecting chapters and their subtopics', 'Building a path from foundations to practice']
  useEffect(() => {
    heading.current?.focus({ preventScroll: true })
    window.scrollTo(0, 0)
    const timer = setInterval(() => setMessage(value => Math.min(value + 1, 4)), 9000)
    return () => clearInterval(timer)
  }, [])
  return <section className="path-preparing" aria-labelledby="preparing-title">
    <div className="path-preparing-art" aria-hidden="true"><span>01</span><i /><span>02</span><i /><span>03</span></div>
    <span className="learning-eyebrow">YOUR NEXT LEARNING JOURNEY</span>
    <h1 id="preparing-title" ref={heading} tabIndex={-1}>A little planning.<br />A clearer path ahead.</h1>
    <p className="path-preparing-subject">{subject}<span>{level}</span></p>
    <div className="path-preparing-status" role="status" aria-live="polite"><span className="path-preparing-spinner" aria-hidden="true" />{messages[message] || 'Still preparing your syllabus. Thanks for your patience.'}</div>
    <p className="path-preparing-note">This may take a few minutes. Your roadmap will open automatically when it’s ready. Keep this page open while we prepare it.</p>
  </section>
}

export default function CustomRoadmaps() {
  const { roadmapId } = useParams()
  const navigate = useNavigate()
  const [maps, setMaps] = useState([])
  const [searchParams] = useSearchParams()
  const [subject, setSubject] = useState(() => searchParams.get('subject')?.slice(0, 160) || '')
  const [level, setLevel] = useState('Beginner')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [deletingId, setDeletingId] = useState('')
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    api('').then(data => { if (active) setMaps(data) }).catch(e => { if (active) setError(e.message) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [roadmapId])
  async function create(e) {
    if (creating) return
    e.preventDefault(); setCreating(true); setError('')
    try {
      const result = await api('', send('POST', { subject: subject.trim(), level }))
      setMaps(prev => [result, ...prev]); navigate(`/roadmaps/${result.id}`)
    } catch (e) { setError(e.message) }
    finally { setCreating(false) }
  }
  async function remove(roadmap) {
    if (!window.confirm(`Delete “${roadmap.title}”? Its generated lessons and progress will also be deleted. This can’t be undone.`)) return
    setDeletingId(roadmap.id); setError('')
    try {
      await api(`/${roadmap.id}`, { method: 'DELETE' })
      setMaps(previous => previous.filter(item => item.id !== roadmap.id))
    } catch (e) { setError(e.message) }
    finally { setDeletingId('') }
  }
  if (roadmapId) return <CustomPath key={roadmapId} id={roadmapId} />
  if (creating) return <PreparingPath subject={subject.trim()} level={level} />
  return <div className="learning-overview roadmap-studio">
    <header className="apple-page-heading"><div><span className="learning-eyebrow">YOUR LEARNING PATHS</span><h1>What do you want to learn?</h1><p>Start with a subject. Get a path with topics, subtopics, and lessons you can read as you go.</p></div></header>
    <form className="roadmap-create" onSubmit={create} aria-busy={creating}>
      <div className="roadmap-create-fields"><label className="roadmap-subject-field" htmlFor="roadmap-subject">Subject or concept<input id="roadmap-subject" value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Psychology, world history, creative writing" required minLength={2} maxLength={160} disabled={creating} /></label><label className="roadmap-level">Starting level<select aria-label="Starting level" value={level} onChange={e => setLevel(e.target.value)} disabled={creating}>{['Beginner', 'Intermediate', 'Advanced'].map(l => <option key={l}>{l}</option>)}</select></label><button className="btn btn-primary" disabled={creating || subject.trim().length < 2}>{creating ? 'Building your path…' : 'Create roadmap →'}</button></div>
      <div className="roadmap-suggestions"><span>Try a subject</span>{['Psychology', 'World history', 'Creative writing', 'Artificial intelligence'].map(s => <button type="button" key={s} disabled={creating} onClick={() => setSubject(s)}>{s}</button>)}</div>
    </form>
    {error && <p role="alert">{error}</p>}
    <div className="learning-section-title"><h2>Your roadmaps</h2><span>{maps.length} saved</span></div>
    {loading ? <p role="status">Loading your roadmaps…</p> : maps.length ? <div className="learning-tracks">{maps.map(m => { const total = m.stages.reduce((n, s) => n + s.topics.length, 0); const done = Object.values(m.lessons).filter(l => l.completed).length; return <div className="roadmap-saved-row" key={m.id}><Link className="learning-track" to={`/roadmaps/${m.id}`}><div className="learning-track-copy"><h3>{m.title}</h3><p>{m.level} · {m.stages.length} stages · {done} / {total} lessons complete</p></div><span aria-hidden="true">↗</span></Link><button className="roadmap-delete" type="button" disabled={deletingId === m.id} onClick={() => remove(m)} aria-label={`Delete ${m.title}`} title="Delete learning path"><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 10v7m4-7v7"/></svg></button></div> })}</div> : <div className="roadmap-empty"><span aria-hidden="true">01 ─── 02 ─── 03</span><h3>Your next subject starts here.</h3><p>Create a roadmap above. Your path and lesson progress will be saved.</p></div>}
  </div>
}

function CustomPath({ id }) {
  const [params] = useSearchParams()
  const topicId = params.get('topic')
  const [map, setMap] = useState(null)
  useEffect(() => {
    if (topicId && window.location.hash === '#custom-lesson') {
      const frame = requestAnimationFrame(() => document.getElementById('custom-lesson')?.scrollIntoView({ block: 'start' }))
      return () => cancelAnimationFrame(frame)
    }
  }, [topicId, map?.id])
  const inspector = useRef(null)
  const choose = topic => {
    setSelected(topic); setError('')
    requestAnimationFrame(() => { inspector.current?.focus({ preventScroll: true }); if (window.matchMedia('(max-width: 760px)').matches) inspector.current?.scrollIntoView({ block: 'start' }) })
  }
  const [selected, setSelected] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [saving, setSaving] = useState(false)
  const [reload, setReload] = useState(0)
  useEffect(() => {
    let active = true
    setError('')
    api(`/${id}`).then(data => { if (active) { setMap(data); if (topicId) setSelected(data.stages.flatMap(s => s.topics).find(t => t.id === topicId) || null) } }).catch(e => { if (active) setError(e.message) })
    return () => { active = false }
  }, [id, reload, topicId])
  async function generate(topic) {
    setBusy(true); setError('')
    try {
      const result = await api(`/${id}/lessons/${topic.id}`, send('POST', {}))
      setMap(prev => ({ ...prev, lessons: { ...prev.lessons, [topic.id]: { ...prev.lessons[topic.id], ...result } } }))
    } catch (e) { setError(e.message) }
    finally { setBusy(false) }
  }
  async function complete(topic) {
    setSaving(true); setError('')
    try {
      const result = await api(`/${id}/lessons/${topic.id}`, send('PATCH', { completed: !map.lessons[topic.id]?.completed }))
      setMap(prev => ({ ...prev, lessons: { ...prev.lessons, [topic.id]: result } }))
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }
  if (!map) return <div className="learning-overview"><Link to="/roadmaps">← Your roadmaps</Link>{error ? <div role="alert"><p>{error}</p><button className="btn btn-secondary" onClick={() => setReload(n => n + 1)}>Retry</button></div> : <p role="status">Loading your path…</p>}</div>
  const topics = map.stages.flatMap(s => s.topics)
  const done = topics.filter(t => map.lessons[t.id]?.completed).length
  const next = topics.find(t => !map.lessons[t.id]?.completed)
  const lesson = selected && map.lessons[selected.id]
  return <div className="learning-overview roadmap-studio">
    <Link to="/roadmaps">← Your roadmaps</Link>
    <header className="path-heading"><span className="learning-eyebrow">{map.level} · PERSONAL ROADMAP</span><h1>{map.title}</h1><p>{map.description}</p><div className="path-heading-bottom"><span>{done} of {topics.length} lessons complete</span><progress aria-label="Roadmap completion" value={done} max={topics.length} />{next && <button className="btn btn-primary" onClick={() => choose(next)}>Continue learning →</button>}</div></header>
    {error && <p role="alert">{error}</p>}
    <JourneyMap listView={<div className="path-timeline">{map.stages.map((s, i) => <section className="path-stage" key={s.id}><span className="path-marker">{String(i + 1).padStart(2, '0')}</span><div className="path-stage-content"><span className="learning-eyebrow">STAGE {i + 1}</span><h2>{s.title}</h2><p>{s.outcome}</p><div className="path-topics">{s.topics.map(t => <button className={`path-topic${selected?.id === t.id ? ' selected' : ''}`} aria-pressed={selected?.id === t.id} key={t.id} onClick={() => choose(t)}><span>{map.lessons[t.id]?.completed ? '✓' : '○'}</span><span>{t.title}<small>{t.subtopics.length} subtopics</small></span><span aria-hidden="true">↗</span></button>)}</div></div></section>)}</div>} title={map.title} stages={map.stages.map(s => ({ id: s.id, title: s.title, description: s.outcome, total: s.topics.length, done: s.topics.filter(t => map.lessons[t.id]?.completed).length, items: s.topics.map(t => ({ id: t.id, title: t.title, completed: map.lessons[t.id]?.completed, onSelect: () => choose(t) })) }))} />
    <div className="path-workspace">
      <aside ref={inspector} tabIndex={-1} className="path-inspector" aria-label="Selected lesson">{selected ? <><span className="learning-eyebrow">LESSON PREVIEW</span><h2>{selected.title}</h2><p>What you’ll learn</p><ul>{selected.subtopics.map((s, i) => <li key={i}>{s}</li>)}</ul><button className="btn btn-primary" disabled={busy || saving} onClick={() => lesson?.blog ? document.getElementById('custom-lesson')?.scrollIntoView({ block: 'start' }) : generate(selected)}>{busy ? 'Writing lesson…' : lesson?.blog ? 'Read lesson ↓' : 'Generate lesson blog'}</button><button className="btn btn-secondary" disabled={saving || busy} onClick={() => complete(selected)}>{saving ? 'Saving…' : lesson?.completed ? '✓ Completed · Undo' : 'Mark complete'}</button>{busy && <p role="status">Your lesson is being written and saved. You can explore the roadmap while you wait.</p>}{lesson?.blog && <a href="#custom-lesson">Read saved lesson ↓</a>}</> : <><span className="learning-eyebrow">EXPLORE YOUR PATH</span><h2>One topic at a time.</h2><p>Select a topic to see its subtopics, generate a lesson, and track your progress.</p></>}</aside>
    </div>
    {selected && lesson?.blog && <section id="custom-lesson" className="custom-lesson"><div className="learning-section-title"><h2>{selected.title}</h2><span>Saved lesson</span></div><article className="study-reading"><BlogHighlighter storageKey={`roadmap_${id}_${selected.id}`} topicContext={`${selected.title} (${map.title})`}>{renderMarkdown(lesson.blog)}</BlogHighlighter></article><button className="btn btn-secondary" disabled={saving || busy} onClick={() => complete(selected)}>{lesson.completed ? '✓ Completed · Undo' : 'Mark lesson complete'}</button></section>}
  </div>
}
