import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useParams, useSearchParams, useNavigate } from 'react-router-dom'
import * as genai from '../data/genAIData'
import * as systemdesign from '../data/systemDesignData'
import * as interview from '../data/aiInterviewData'
import SplitReader from '../components/SplitReader'
import TopicBlog from './TopicBlog'
import GenAIBlog from './GenAIBlog'
import { readerPath } from '../utils/readerPaths'

const courses = [
  { title: 'Generative AI', route: '/genai', data: genai },
  { title: 'System design', route: '/systemdesign', data: systemdesign },
  { title: 'AI interview', route: '/ai-interview', data: interview },
]
export default function ReadingWorkspace() {
  const { sectionId } = useParams()
  const [params] = useSearchParams()
  const topic = params.get('topic')
  const location = useLocation()
  const navigate = useNavigate()
  const course = courses.find(c => c.data.SECTIONS.some(s => s.id === sectionId))
  const text = item => course?.data.itemTopic ? course.data.itemTopic(item) : String(item)
  const [saved, setSaved] = useState([])
  const [open, setOpen] = useState(true)
  const heading = useRef(null)
  useEffect(() => {
    if (course) return
    const abort = new AbortController()
    fetch('/api/genai/topic-blogs', { signal: abort.signal }).then(r => r.ok ? r.json() : []).then(setSaved).catch(() => {})
    return () => abort.abort()
  }, [course])
  useEffect(() => { heading.current?.focus({ preventScroll: true }); heading.current?.scrollIntoView({ block: 'start' }) }, [sectionId, topic])
  const sections = course?.data.SECTIONS || [...new Set(saved.map(b => b.section_id))].map(id => ({ id, title: saved.find(b => b.section_id === id)?.section_title || id, subsections: [{ label: 'Saved lessons', items: saved.filter(b => b.section_id === id).map(b => b.topic_name) }] }))
  const section = sections.find(s => s.id === sectionId)
  const lessons = sections.flatMap(s => s.subsections.flatMap(sub => sub.items.map(item => ({ section: s.id, title: text(item) }))))
  const index = lessons.findIndex(l => l.section === sectionId && l.title === topic)
  const previous = lessons[index - 1], next = lessons[index + 1]
  return <div className="reading-workspace">
    <div className="reader-navigation"><Link to={location.state?.returnTo || course?.route || '/blogs'}>← {course?.title || 'Reading library'}</Link></div>
    <button className="reader-sidebar-control" aria-label={open ? 'Collapse learning path' : 'Expand learning path'} aria-expanded={open} aria-controls="reader-path" title={open ? 'Collapse learning path' : 'Expand learning path'} onClick={() => setOpen(value => !value)}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d={open ? 'M14 6l-6 6 6 6' : 'M10 6l6 6-6 6'} /></svg></button>
    <div className={`reader-layout${open ? ' path-open' : ''}`}><aside id="reader-path" inert={!open ? true : undefined} className={`reader-path${open ? ' is-open' : ''}`} aria-label="Learning path"><span className="learning-eyebrow">LEARNING PATH</span><h2>{course?.title || 'Your saved lessons'}</h2><label className="reader-chapter-select">Jump to chapter<select value={sectionId} onChange={e => navigate(readerPath(e.target.value))}>{sections.map((s, i) => <option key={s.id} value={s.id}>{i + 1}. {s.title.replace(/^\d+\s*·\s*/, '')}</option>)}</select></label><nav aria-label="Chapters and lessons">{sections.map((s, i) => <details key={`${s.id}-${sectionId}`} open={s.id === sectionId}><summary><span>{String(i + 1).padStart(2, '0')}</span>{s.title.replace(/^\d+\s*·\s*/, '')}</summary>{course && <Link className="reader-chapter-guide" to={readerPath(s.id)} aria-current={!topic && s.id === sectionId ? 'page' : undefined}>Chapter guide</Link>}{s.subsections.map((sub, si) => <div className="reader-topic-group" key={si}><h3>{sub.label.replace(/^[★◆○]\s*/, '')}</h3>{sub.items.map((item, ti) => { const name = text(item); return <Link key={ti} to={readerPath(s.id, name)} aria-current={s.id === sectionId && topic === name ? 'page' : undefined}>{name}</Link> })}</div>)}</details>)}</nav></aside>
    <section className="reader-main" aria-label="Reading lesson"><SplitReader current={{ sectionId, topic }} sections={sections} courses={courses}><div ref={heading} tabIndex={-1} className="reader-location"><span>{section?.title || 'Saved lesson'}</span><h1>{topic || 'Chapter guide'}</h1></div>{topic ? <TopicBlog key={`${sectionId}-${topic}`} embedded topicName={topic} sectionId={sectionId} sectionTitle={section?.title || sectionId} /> : section ? <GenAIBlog key={sectionId} embedded section={section} /> : <p role="status">Loading learning path…</p>}
    {index >= 0 && <nav className="reader-next" aria-label="Adjacent lessons">{previous ? <Link to={readerPath(previous.section, previous.title)}><small>← Previous lesson</small><span>{previous.title}</span></Link> : <span />}{next && <Link to={readerPath(next.section, next.title)}><small>Next lesson →</small><span>{next.title}</span></Link>}</nav>}</SplitReader></section></div>
  </div>
}
