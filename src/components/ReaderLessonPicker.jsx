import { useEffect, useRef, useState } from 'react'
import { readerPath } from '../utils/readerPaths'

export default function ReaderLessonPicker({ sections, courses, openUrls, onChoose, onClose }) {
  const dialog = useRef(null)
  const [chapter, setChapter] = useState(() => {
    try { return new URL(openUrls[0], 'https://reader.local').pathname.slice(6) } catch { return sections[0]?.id || '' }
  })
  useEffect(() => { dialog.current.showModal() }, [])
  const choose = (sectionId, topic) => {
    const url = readerPath(sectionId, topic)
    return <button type="button" disabled={openUrls.includes(url)} onClick={() => { onChoose(url); onClose() }}><span>{topic || 'Chapter guide'}</span><span aria-hidden="true">{openUrls.includes(url) ? 'Open' : '+'}</span></button>
  }
  return <dialog ref={dialog} className="reader-lesson-picker" aria-labelledby="lesson-picker-title" onCancel={onClose} onClose={onClose} onKeyDown={e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onClose() } }}>
    <header><h2 id="lesson-picker-title">Add a blog</h2><button type="button" aria-label="Close lesson picker" onClick={onClose}>×</button></header>
    <label className="reader-chapter-select">Jump to chapter<select autoFocus aria-label="Choose chapter to add a blog" value={chapter} onChange={e => {
      setChapter(e.target.value)
      requestAnimationFrame(() => dialog.current.querySelector(`[data-chapter="${CSS.escape(e.target.value)}"]`)?.scrollIntoView({ block: 'nearest' }))
    }}>{sections.map((s, i) => <option key={s.id} value={s.id}>{i + 1}. {s.title.replace(/^\d+\s*·\s*/, '')}</option>)}</select></label>
    <nav className="reader-lesson-results reader-picker-chapters" aria-label="Chapters and blogs">{sections.map((section, i) => {
      const owner = courses.find(c => c.data.SECTIONS.some(s => s.id === section.id))
      return <details key={`${section.id}-${chapter}`} data-chapter={section.id} open={section.id === chapter}><summary><span>{String(i + 1).padStart(2, '0')}</span>{section.title.replace(/^\d+\s*·\s*/, '')}</summary>{choose(section.id)}{section.subsections.map((sub, index) => <div className="reader-topic-group" key={index}><h3>{sub.label.replace(/^[★◆○]\s*/, '')}</h3>{sub.items.map((item, j) => { const topic = owner?.data.itemTopic ? owner.data.itemTopic(item) : String(item); return <div key={j}>{choose(section.id, topic)}</div> })}</div>)}</details>
    })}</nav>
  </dialog>
}
