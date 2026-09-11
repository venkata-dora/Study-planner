import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
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
  return <div className="learning-overview">
    <div className="apple-page-heading"><div><span className="learning-eyebrow">LEARNING ROADMAP</span><h1>{title}</h1><p>{description}</p></div></div>
    <div className="apple-roadmap-summary"><div><strong>{done}<span> / {total}</span></strong><p>{unit} completed</p></div><div><span>{Math.round(done / (total || 1) * 100)}% complete</span><progress aria-label={`${title} completion`} value={done} max={total} /></div></div>
    <div className="learning-section-title"><h2>Course contents</h2><span>{sections.length} sections</span></div>
    <div className="learning-tracks">{sections.map((section, i) => <Link className="learning-track apple-roadmap-row" key={section.id} to={`${route}/${section.id}`}><span className={`apple-section-number${section.done === section.total ? ' complete' : ''}`}>{section.done === section.total ? '✓' : String(i + 1).padStart(2, '0')}</span><div className="learning-track-copy"><h3>{section.title}</h3><p>{section.subsections.map(s => s.label).join(' · ')}</p></div><div className="learning-track-progress"><span>{section.done} / {section.total} {unit}</span><progress aria-label={`${section.title} completion`} value={section.done} max={section.total} /></div><LearningIcon name="chevron" size={15} /></Link>)}</div>
    {children}
  </div>
}
