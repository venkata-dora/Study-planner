import { useEffect, useRef, useState } from 'react'
import { readerPath } from '../utils/readerPaths'

export default function ReaderLessonPicker({ sections, courses, openUrls, onChoose, onClose }) {
  const dialog = useRef(null)
  const [query, setQuery] = useState('')
  useEffect(() => { dialog.current.showModal() }, [])
  const lessons = sections.flatMap(section => {
    const owner = courses.find(c => c.data.SECTIONS.some(s => s.id === section.id))
    return [{ title: 'Chapter guide', url: readerPath(section.id), chapter: section.title }, ...section.subsections.flatMap(sub => sub.items).map(item => {
      const title = owner?.data.itemTopic ? owner.data.itemTopic(item) : String(item)
      return { title, chapter: section.title, url: readerPath(section.id, title) }
    })]
  })
  const matches = lessons.filter(lesson => `${lesson.title} ${lesson.chapter}`.toLowerCase().includes(query.trim().toLowerCase()))
  return <dialog ref={dialog} className="reader-lesson-picker" aria-labelledby="lesson-picker-title" onCancel={onClose} onClose={onClose} onKeyDown={e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onClose() } }}>
    <header><div><h2 id="lesson-picker-title">Add a blog</h2><p>Read another lesson alongside this one.</p></div><button type="button" aria-label="Close lesson picker" onClick={onClose}>×</button></header>
    <input autoFocus type="search" aria-label="Search lessons" placeholder="Search lessons or chapters…" value={query} onChange={e => setQuery(e.target.value)} />
    <div className="reader-lesson-results">{matches.slice(0, 80).map((lesson, i) => <button type="button" key={`${lesson.url}-${i}`} disabled={openUrls.includes(lesson.url)} onClick={() => { onChoose(lesson.url); onClose() }}><span><strong>{lesson.title}</strong><small>{lesson.chapter}</small></span><span aria-hidden="true">{openUrls.includes(lesson.url) ? 'Open' : '+'}</span></button>)}{!matches.length && <p>No lessons found. Try a different search.</p>}</div>
    <footer>{matches.length > 80 ? `Showing 80 of ${matches.length} lessons. Search to narrow the list.` : `${matches.length} lessons`}</footer>
  </dialog>
}
