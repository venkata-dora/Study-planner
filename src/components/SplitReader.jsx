import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ReaderLessonPicker from './ReaderLessonPicker'
import TopicBlog from '../pages/TopicBlog'
import GenAIBlog from '../pages/GenAIBlog'
import { readerPath } from '../utils/readerPaths'

export default function SplitReader({ current, sections, courses, children }) {
  const navigate = useNavigate()
  const grid = useRef(null)
  const workspace = useRef(null)
  const returnFocus = useRef(null)
  const [expanded, setExpanded] = useState(null)
  const exitFullscreen = async () => {
    if (document.fullscreenElement === workspace.current) await document.exitFullscreen()
    setExpanded(null)
    returnFocus.current?.focus()
  }
  const expand = async (pane = 'all') => {
    returnFocus.current = document.activeElement
    setExpanded(pane)
    try { await workspace.current.requestFullscreen?.() } catch { /* Use the viewport layout when native fullscreen is unavailable. */ }
  }
  useEffect(() => {
    if (!expanded) return
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const siblings = []
    for (let node = workspace.current; node?.parentElement && node !== document.body; node = node.parentElement) {
      for (const sibling of node.parentElement.children) {
        if (sibling !== node) { siblings.push([sibling, sibling.inert]); sibling.inert = true }
      }
    }
    workspace.current.querySelector('.split-fullscreen')?.focus()
    const onChange = () => { if (!document.fullscreenElement) { setExpanded(null); returnFocus.current?.focus() } }
    const onKey = e => { if (e.key === 'Escape' && !document.fullscreenElement) { e.preventDefault(); setExpanded(null); returnFocus.current?.focus() } }
    document.addEventListener('fullscreenchange', onChange)
    document.addEventListener('keydown', onKey)
    return () => { siblings.forEach(([element, inert]) => { element.inert = inert }); document.body.style.overflow = overflow; document.removeEventListener('fullscreenchange', onChange); document.removeEventListener('keydown', onKey) }
  }, [expanded])
  const [panes, setPanes] = useState([])
  const [layout, setLayout] = useState('columns')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [message, setMessage] = useState('')
  const currentUrl = readerPath(current.sectionId, current.topic)
  const available = [...courses.flatMap(c => c.data.SECTIONS), ...sections]
  const resolve = value => {
    try {
      const url = new URL(value, window.location.origin)
      if (url.origin !== window.location.origin || !url.pathname.startsWith('/read/')) return null
      const sectionId = decodeURIComponent(url.pathname.slice(6))
      const section = available.find(s => s.id === sectionId)
      if (!section) return null
      const topic = url.searchParams.get('topic') || null
      return { sectionId, section, topic, url: readerPath(sectionId, topic) }
    } catch { return null }
  }
  const add = value => {
    const lesson = resolve(value)
    if (!lesson) { setMessage('Drag a lesson link from a learning path into this reader.'); return }
    if (lesson.url === currentUrl || panes.some(p => p.url === lesson.url)) { setMessage('This lesson is already open.'); return }
    if (active.length >= 3) { setMessage('Four blogs are open. Close one before adding another.'); return }
    setPanes([...active, lesson]); setMessage('Lesson opened alongside.')
  }
  const active = panes.filter(p => p.url !== currentUrl)
  useLayoutEffect(() => {
    const update = () => grid.current?.style.setProperty('--split-top', `${Math.max(80, grid.current.getBoundingClientRect().top)}px`)
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, { passive: true })
    return () => { window.removeEventListener('resize', update); window.removeEventListener('scroll', update) }
  }, [active.length, message, layout, expanded])
  return <div ref={workspace} className={`split-reader${active.length ? ' has-splits' : ''}${expanded ? ' is-expanded' : ''}${expanded && expanded !== 'all' ? ' focused-pane' : ''}`} onDragOver={e => {
    if ([...e.dataTransfer.types].some(t => t === 'text/uri-list' || t === 'text/plain')) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; setDragging(true) }
  }} onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false) }} onDrop={e => {
    e.preventDefault(); setDragging(false)
    const value = (e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain')).split('\n').find(line => line && !line.startsWith('#'))
    add(value || '')
  }}>
    <div className="split-reader-tools">
      <span className="split-workspace-label">{active.length ? `${active.length + 1} blogs` : 'Reading'}</span>
      <button type="button" className="split-add-blog" disabled={active.length >= 3} title={active.length >= 3 ? 'Close a blog to add another' : 'Add a blog, or drag a lesson into the reader'} onClick={() => setPickerOpen(true)}><span aria-hidden="true">＋</span> Add blog</button>
      {active.length > 0 && <>{active.length === 1 ? <label>Layout<select aria-label="Split layout" value={layout} onChange={e => setLayout(e.target.value)} ><option value="columns">Side by side</option><option value="rows">Top and bottom</option></select></label> : <span className="split-layout-summary">{active.length === 2 ? '2 above · 1 below' : '2 × 2 grid'}</span>}<button type="button" onClick={() => { setPanes([]); if (expanded) setExpanded('all'); setMessage('Returned to one blog.') }}>Single blog</button></>}
      <button type="button" className="split-fullscreen" onClick={() => expanded ? exitFullscreen() : expand()}>{expanded ? 'Exit fullscreen' : 'Fullscreen'}</button>
    </div>
    {pickerOpen && <ReaderLessonPicker sections={sections} courses={courses} openUrls={[currentUrl, ...active.map(p => p.url)]} onChoose={add} onClose={() => setPickerOpen(false)} />}
    <p className="split-reader-status" role="status">{message}</p>
    {dragging && <div className="split-drop-hint">Drop to open alongside · up to 4 blogs</div>}
    <div ref={grid} className={`split-reader-grid layout-${layout} panes-${active.length + 1}`}>
      <section hidden={!!expanded && expanded !== 'all' && expanded !== 'current'} className="split-reader-pane" aria-label={current.topic || 'Current chapter guide'}>{active.length > 0 && <div className="split-pane-heading"><span>{current.topic || 'Current chapter guide'}</span><button type="button" aria-label="Expand current blog" onClick={() => expand('current')}>⛶</button><button type="button" aria-label="Close current lesson" onClick={() => { const next = active[0]; if (expanded) setExpanded('all'); setPanes(active.slice(1)); navigate(next.url) }}>×</button></div>}{children}</section>
      {active.map(p => <section key={p.url} hidden={!!expanded && expanded !== 'all' && expanded !== p.url} className="split-reader-pane" aria-label={p.topic || p.section.title}><div className="split-pane-heading"><span>{p.topic || p.section.title}</span><button type="button" aria-label={`Expand ${p.topic || p.section.title}`} onClick={() => expand(p.url)}>⛶</button><button type="button" aria-label={`Close ${p.topic || p.section.title}`} onClick={() => { if (expanded === p.url) setExpanded('all'); setPanes(prev => prev.filter(item => item.url !== p.url)) }}>×</button></div><div className="reader-location"><span>{p.section.title}</span><h2>{p.topic || 'Chapter guide'}</h2></div>{p.topic ? <TopicBlog embedded topicName={p.topic} sectionId={p.sectionId} sectionTitle={p.section.title} /> : <GenAIBlog embedded section={p.section} />}</section>)}
    </div>
  </div>
}
