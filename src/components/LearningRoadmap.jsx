import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import JourneyMap from './JourneyMap'
import LearningIcon from './LearningIcon'

export default function LearningRoadmap({ data, title, description, route, unit = 'topics', children }) {
  const [checks, setChecks] = useState(data.loadChecks)
  useEffect(() => {
    const refresh = () => setChecks(data.loadChecks())
    window.addEventListener('focus', refresh)
    window.addEventListener('storage', refresh)
    return () => { window.removeEventListener('focus', refresh); window.removeEventListener('storage', refresh) }
  }, [data])
  const sections = data.SECTIONS.map(section => {
    const states = section.subsections.flatMap(sub => sub.items.map((_, i) => data.normalizeState(checks[data.itemId(section.id, sub.label, i)])))
    return { ...section, total: states.length, done: states.filter(s => s === 2).length }
  })
  const total = sections.reduce((sum, s) => sum + s.total, 0)
  const done = sections.reduce((sum, s) => sum + s.done, 0)
  const journey = listView => <JourneyMap listView={listView} title={title} stages={sections.map(s => ({ ...s, items: s.subsections.map((sub, i) => ({ id: `${s.id}-${i}`, title: sub.label.replace(/^[★◆○]\s*/, ''), to: `${route}/${s.id}` })) }))} />
  if (route === '/genai' || route === '/systemdesign') {
    const next = sections.find(s => s.done < s.total)
    return <div className="learning-overview roadmap-studio">
      <header className="path-heading"><span className="learning-eyebrow">LEARNING PATH · {sections.length} CHAPTERS</span><h1>{title}</h1><p>{description}</p><div className="path-heading-bottom"><span>{done} / {total} {unit} completed</span><progress aria-label={`${title} completion`} value={done} max={total} />{next && <Link className="btn btn-primary" to={`${route}/${next.id}`}>Continue learning →</Link>}</div></header>
      {journey(<><div className="learning-section-title"><h2>Course contents</h2><Link to="/roadmaps">Create your own roadmap ↗</Link></div>
      <div className="path-timeline curated-path">{sections.map((section, i) => <section className="path-stage" key={section.id}><span className={`path-marker${section.done === section.total ? ' complete' : ''}`}>{section.done === section.total ? '✓' : String(i + 1).padStart(2, '0')}</span><div className="path-stage-content"><div className="path-chapter-heading"><div><span className="learning-eyebrow">CHAPTER {i + 1}</span><h2><Link to={`${route}/${section.id}`}>{section.title.replace(/^\d+\s*·\s*/, '')}</Link></h2></div><span>{section.done} / {section.total}</span></div><details><summary>Explore {section.subsections.length} topic groups</summary><div className="path-topic-preview">{section.subsections.map(sub => <Link to={`${route}/${section.id}`} key={sub.label}><span>{sub.label.replace(/^[★◆○]\s*/, '')}</span><small>{sub.items.length} topics</small></Link>)}</div></details><Link className="path-chapter-link" to={`${route}/${section.id}`}>Open chapter <span aria-hidden="true">→</span></Link></div></section>)}</div></>)}{children}
    </div>
  }
  return <div className="learning-overview">
    <div className="apple-page-heading"><div><span className="learning-eyebrow">LEARNING ROADMAP</span><h1>{title}</h1><p>{description}</p></div></div>
    <div className="apple-roadmap-summary"><div><strong>{done}<span> / {total}</span></strong><p>{unit} completed</p></div><div><span>{Math.round(done / (total || 1) * 100)}% complete</span><progress aria-label={`${title} completion`} value={done} max={total} /></div></div>
    {journey(<><div className="learning-section-title"><h2>Course contents</h2><span>{sections.length} sections</span></div>
    <div className="learning-tracks">{sections.map((section, i) => <Link className="learning-track apple-roadmap-row" key={section.id} to={`${route}/${section.id}`}><span className={`apple-section-number${section.done === section.total ? ' complete' : ''}`}>{section.done === section.total ? '✓' : String(i + 1).padStart(2, '0')}</span><div className="learning-track-copy"><h3>{section.title.replace(/^\d+\s*·\s*/, '')}</h3><p>{section.subsections.slice(0, 3).map(s => s.label.replace(/^[★◆○]\s*/, '')).join(' · ')}{section.subsections.length > 3 ? ` · +${section.subsections.length - 3} more` : ''}</p></div><div className="learning-track-progress"><span>{section.done} / {section.total} {unit}</span><progress aria-label={`${section.title} completion`} value={section.done} max={section.total} /></div><LearningIcon name="chevron" size={15} /></Link>)}</div>
    </>)}{children}
  </div>
}
