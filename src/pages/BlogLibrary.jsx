import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { SECTIONS } from '../data/genAIData'
import TopicBlog from './TopicBlog'

export default function BlogLibrary() {
  const [blogs, setBlogs] = useState([])
  const [roadmaps, setRoadmaps] = useState([])
  useEffect(() => { fetch('/api/roadmaps').then(r => r.ok ? r.json() : []).then(setRoadmaps).catch(() => {}) }, [])
  const [loading, setLoading] = useState(true)
  const [activeBlog, setActiveBlog] = useState(null)
  const [filterSection, setFilterSection] = useState('all')
  const [search, setSearch] = useState('')

  const fetchBlogs = () => {
    fetch('http://localhost:5050/api/genai/topic-blogs')
      .then(r => r.json())
      .then(list => { setBlogs(list); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { fetchBlogs() }, [])

  // Refetch when modal closes
  useEffect(() => { if (!activeBlog) fetchBlogs() }, [activeBlog])

  const deleteBlog = async (id, e) => {
    e.stopPropagation()
    if (!confirm('Delete this blog?')) return
    await fetch(`http://localhost:5050/api/genai/topic-blog/${id}`, { method: 'DELETE' })
    setBlogs(prev => prev.filter(b => b.id !== id))
  }

  const sectionMap = Object.fromEntries(SECTIONS.map(s => [s.id, s]))
  const q = search.toLowerCase()
  const customBlogs = roadmaps.flatMap(m => m.stages.flatMap(s => s.topics.filter(t => m.lessons[t.id]?.blog).map(t => ({ ...t, roadmapId: m.id, roadmapTitle: m.title }))))
  const customFiltered = customBlogs.filter(t => !q || `${t.title} ${t.roadmapTitle}`.toLowerCase().includes(q))
  const filtered = blogs
    .filter(b => filterSection === 'all' || b.section_id === filterSection)
    .filter(b => !q || b.topic_name.toLowerCase().includes(q) || b.section_title.toLowerCase().includes(q))

  // Group by section
  const grouped = {}
  filtered.forEach(b => {
    if (!grouped[b.section_id]) grouped[b.section_id] = []
    grouped[b.section_id].push(b)
  })

  return (
    <div className="reading-library-page" style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div className="apple-page-heading"><div><span className="learning-eyebrow">READ & EXPLORE</span><h1>Reading library</h1><p>{blogs.length + customBlogs.length} saved {blogs.length + customBlogs.length === 1 ? 'article' : 'articles'}. Take a deeper look at what you’re learning.</p></div></div>

      {filterSection === 'all' && customFiltered.length > 0 && <section style={{ marginBottom: 28 }}><div className="learning-section-title"><h2>From your roadmaps</h2></div><div className="learning-tracks">{customFiltered.map(t => <Link className="learning-track" key={`${t.roadmapId}_${t.id}`} to={`/roadmaps/${t.roadmapId}?topic=${t.id}#custom-lesson`}><div className="learning-track-copy"><h3>{t.title}</h3><p>{t.roadmapTitle}</p></div><span>Read →</span></Link>)}</div></section>}

      {/* Filters */}
      <div className="library-filters flex gap-sm items-center" style={{ marginBottom: 20, flexWrap: 'wrap' }}>
        <input
          type="text"
          aria-label="Search saved articles" placeholder="Search saved articles"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 200 }}
        />
        <select
          aria-label="Filter articles by section"
          value={filterSection}
          onChange={e => setFilterSection(e.target.value)}
          style={{
            background: 'var(--neu-bg)', border: 'none', borderRadius: 12, padding: '8px 14px',
            fontSize: '.8rem', color: 'var(--neu-text-primary)', cursor: 'pointer',
            boxShadow: '3px 3px 6px var(--neu-shadow-dark), -3px -3px 6px var(--neu-shadow-light)',
          }}
        >
          <option value="all">All sections</option>
          {SECTIONS.map(s => (
            <option key={s.id} value={s.id}>{s.icon} {s.title}</option>
          ))}
        </select>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--neu-text-secondary)' }}>Loading…</div>
      )}

      {!loading && filtered.length === 0 && (filterSection !== 'all' || customFiltered.length === 0) && (
        <div className="reading-library-empty">
          <span className="reading-empty-number" aria-hidden="true">01</span>
          <div style={{ color: 'var(--neu-text-secondary)', marginBottom: 8 }}>
            {blogs.length + customBlogs.length === 0 ? 'Your reading library starts here' : 'No matching lessons'}
          </div>
          <div style={{ fontSize: '.8rem', color: 'var(--neu-text-secondary)' }}>
            Open a topic in your learning path and generate a lesson. Saved lessons appear here.
          </div>
          <Link to="/roadmaps" style={{ display: 'inline-block', marginTop: 20, color: 'var(--neu-accent)' }}>Explore your learning paths →</Link>
        </div>
      )}

      {/* Blog cards grouped by section */}
      {Object.entries(grouped).map(([secId, secBlogs]) => {
        const sec = sectionMap[secId]
        return (
          <div className="library-section" key={secId} style={{ marginBottom: 24 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
              padding: '6px 0',
            }}>
              <span style={{ fontSize: '1.1rem' }}>{sec?.icon || '📄'}</span>
              <span style={{ fontWeight: 700, fontSize: '.85rem', color: sec?.color || 'var(--neu-text-primary)' }}>
                {sec?.title || secId}
              </span>
              <span style={{ fontSize: '.72rem', color: 'var(--neu-text-secondary)', fontFamily: 'monospace' }}>
                ({secBlogs.length})
              </span>
            </div>

            <div className="reading-article-shelf">
              {secBlogs.map(blog => (
                <article className="reading-article" key={blog.id}>
                  <button className="reading-article-open" onClick={() => setActiveBlog(blog)}>
                    <span className="learning-eyebrow">SAVED ARTICLE</span>
                    <h3>{blog.topic_name}</h3>
                    <small>{new Date(blog.updated_at || blog.created_at).toLocaleDateString()}</small>
                    <span className="reading-article-action">Read article <span aria-hidden="true">→</span></span>
                  </button>
                  <button className="reading-article-delete" aria-label={`Delete ${blog.topic_name}`} onClick={e => deleteBlog(blog.id, e)}>×</button>
                </article>
              ))}
            </div>
          </div>
        )
      })}

      {/* Topic blog modal */}
      {activeBlog && (
        <TopicBlog
          topicName={activeBlog.topic_name}
          sectionId={activeBlog.section_id}
          sectionTitle={activeBlog.section_title}
          sectionColor={sectionMap[activeBlog.section_id]?.color || 'var(--neu-accent)'}
          sectionIcon={sectionMap[activeBlog.section_id]?.icon || '📄'}
          onClose={() => setActiveBlog(null)}
        />
      )}
    </div>
  )
}
