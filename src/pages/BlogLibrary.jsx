import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import './BlogLibrary.css'
import { SECTIONS as genai } from '../data/genAIData'
import { SECTIONS as systemdesign } from '../data/systemDesignData'
import { SECTIONS as interview } from '../data/aiInterviewData'

const courses = [{ id: 'genai', title: 'Generative AI', chapters: genai }, { id: 'systemdesign', title: 'System design', chapters: systemdesign }, { id: 'interview', title: 'AI interview', chapters: interview }]
const chapterMap = new Map(courses.flatMap(course => course.chapters.map((chapter, index) => [chapter.id, { course, chapter, index }])))

export default function BlogLibrary() {
  const recentShelf = useRef(null)
  const [blogs, setBlogs] = useState([])
  const [roadmaps, setRoadmaps] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('recent')

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetch('/api/genai/topic-blogs').then(r => { if (!r.ok) throw new Error(); return r.json() }),
      fetch('/api/roadmaps').then(r => { if (!r.ok) throw new Error(); return r.json() }),
    ]).then(([articles, paths]) => { if (!cancelled) { setBlogs(articles); setRoadmaps(paths) } })
      .catch(() => { if (!cancelled) setError(true) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const articles = [
    ...blogs.map(b => { const match = chapterMap.get(b.section_id); return ({ id: `blog-${b.id}`, deleteId: b.id, title: b.topic_name, group: match?.chapter.title || b.section_title || b.section_id, groupId: b.section_id, course: match?.course.title || 'Saved lessons', chapter: match?.chapter.title || b.section_title || b.section_id, chapterId: b.section_id, chapterOrder: match?.index ?? 999, date: b.updated_at || b.created_at, href: `/read/${encodeURIComponent(b.section_id)}?topic=${encodeURIComponent(b.topic_name)}` }) }),
    ...roadmaps.flatMap(m => (m.stages || []).flatMap((s, stageIndex) => (s.topics || []).filter(t => m.lessons?.[t.id]?.blog).map(t => ({ id: `${m.id}-${t.id}`, title: t.title, group: m.title, course: 'Your roadmaps', groupId: `path-${m.id}`, chapter: s.title || `Stage ${stageIndex + 1}`, chapterId: s.id || String(stageIndex), chapterOrder: stageIndex, href: `/roadmaps/${m.id}?topic=${encodeURIComponent(t.id)}#custom-lesson` })))),
  ]
  const recent = articles.filter(a => a.date && !isNaN(Date.parse(a.date))).sort((a, b) => Date.parse(b.date) - Date.parse(a.date)).slice(0, 12)
  const groups = [...new Map(articles.map(a => [a.groupId, a.group])).entries()]
  const q = search.trim().toLowerCase()
  const filtered = articles.filter(a => (filter === 'all' || a.groupId === filter) && `${a.title} ${a.group} ${a.chapter}`.toLowerCase().includes(q)).sort((a, b) => sort === 'title' ? a.title.localeCompare(b.title) : (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0))
  const sections = [...new Set(filtered.map(a => a.groupId))]

  async function remove(article) {
    if (!confirm('Delete this saved article?')) return
    try {
      const response = await fetch(`/api/genai/topic-blog/${article.deleteId}`, { method: 'DELETE' })
      if (!response.ok) throw new Error()
      setBlogs(previous => previous.filter(b => b.id !== article.deleteId))
    } catch { alert('The article could not be deleted. Please try again.') }
  }

  return <div className="library-index">
    <header className="library-index-heading">
      <div><span className="learning-eyebrow">YOUR COLLECTION</span><h1>Reading library</h1><p>Saved lessons from across your learning paths.</p></div>
      <Link to="/roadmaps" className="library-path-link">Explore learning paths <span aria-hidden="true">↗</span></Link>
    </header>
    {recent.length > 0 && <section className="library-recent" aria-label="Recently generated articles">
      <div className="library-recent-heading"><div><h2>Recently generated</h2><p>Your latest lessons, ready to revisit.</p></div><div className="library-scroll-controls">{[-1, 1].map(direction => <button key={direction} aria-label={direction < 0 ? 'Scroll recent articles left' : 'Scroll recent articles right'} onClick={() => recentShelf.current?.scrollBy({ left: direction * recentShelf.current.clientWidth * .8, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })}>{direction < 0 ? '←' : '→'}</button>)}</div></div>
      <div className="library-recent-shelf" ref={recentShelf}>{recent.map(a => <Link className="library-recent-card" key={a.id} to={a.href}><span className="learning-eyebrow">{a.course}</span><h3>{a.title}</h3><p>{a.group}</p><span className="library-recent-foot">{new Date(a.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}<span aria-hidden="true">↗</span></span></Link>)}</div>
    </section>}
    <h2 className="library-browse-title">Browse by section</h2>
    <div className="library-index-tools">
      <label className="library-search"><svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg><input type="search" aria-label="Search saved articles" placeholder="Search your library…" value={search} onChange={e => setSearch(e.target.value)}/></label>

      <select aria-label="Filter articles by section" value={filter} onChange={e => setFilter(e.target.value)}><option value="all">All sections</option>{groups.map(([id, title]) => <option key={id} value={id}>{title}</option>)}</select>
      <select aria-label="Sort articles" value={sort} onChange={e => setSort(e.target.value)}><option value="recent">Recently saved</option><option value="title">Title A–Z</option></select>
    </div>
    <div className="library-index-summary" aria-live="polite"><span>{loading ? 'Loading your collection…' : `${filtered.length} ${filtered.length === 1 ? 'article' : 'articles'}`}</span>{(q || filter !== 'all') && <button onClick={() => { setSearch(''); setFilter('all') }}>Clear filters</button>}</div>
    {error && <p role="alert">Your library couldn’t load. Please refresh to try again.</p>}
    {!loading && !error && !filtered.length && <div className="library-index-empty"><h2>{articles.length ? 'No articles found' : 'Make room for a new idea.'}</h2><p>{articles.length ? 'Try another topic or learning path.' : 'Generate a lesson in any learning path to save it here.'}</p>{!articles.length && <Link to="/roadmaps">Find a learning path →</Link>}</div>}
    {sections.map(id => <section className="library-index-section" key={id}>
      <div className="library-index-section-heading"><h2>{groups.find(([key]) => key === id)?.[1]}</h2><span>{filtered.filter(a => a.groupId === id).length} {filtered.filter(a => a.groupId === id).length === 1 ? 'article' : 'articles'}</span></div>
      <div className="library-section-cards">{filtered.filter(a => a.groupId === id).map((a, index) => <article className="library-index-article" key={a.id}>
        <Link to={a.href}><span className="library-article-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><div><h3>{a.title}</h3><span className="library-article-meta">{a.date && !isNaN(Date.parse(a.date)) ? `Saved ${new Date(a.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}` : 'From your learning path'}</span></div><span className="library-read-arrow" aria-hidden="true">↗</span></Link>
        {a.deleteId != null && <button className="library-remove" aria-label={`Delete ${a.title}`} title="Delete saved article" onClick={() => remove(a)}><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 10v7m4-7v7"/></svg></button>}
      </article>)}</div>
    </section>)}
  </div>
}
