import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { SECTIONS } from '../data/genAIData'
import TopicBlog from './TopicBlog'

export default function BlogLibrary() {
  const navigate = useNavigate()
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
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <button
        className="btn btn-secondary btn-sm"
        onClick={() => navigate('/genai')}
        style={{ marginBottom: 20, display: 'inline-flex', alignItems: 'center', gap: 6 }}
      >
        ← Back to Roadmap
      </button>

      <div className="apple-page-heading"><div><span className="learning-eyebrow">READ & EXPLORE</span><h1>Reading library</h1><p>{blogs.length + customBlogs.length} saved {blogs.length + customBlogs.length === 1 ? 'article' : 'articles'}. Take a deeper look at what you’re learning.</p></div></div>

      {filterSection === 'all' && customFiltered.length > 0 && <section style={{ marginBottom: 28 }}><div className="learning-section-title"><h2>From your roadmaps</h2></div><div className="learning-tracks">{customFiltered.map(t => <Link className="learning-track" key={`${t.roadmapId}_${t.id}`} to={`/roadmaps/${t.roadmapId}?topic=${t.id}#custom-lesson`}><div className="learning-track-copy"><h3>{t.title}</h3><p>{t.roadmapTitle}</p></div><span>Read →</span></Link>)}</div></section>}

      {/* Filters */}
      <div className="flex gap-sm items-center" style={{ marginBottom: 20, flexWrap: 'wrap' }}>
        <input
          type="text"
          aria-label="Search saved articles" placeholder="Search saved articles"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 200 }}
        />
        <select
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

      {!loading && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>📝</div>
          <div style={{ color: 'var(--neu-text-secondary)', marginBottom: 8 }}>
            {blogs.length === 0 ? 'No blogs yet' : 'No matching blogs'}
          </div>
          <div style={{ fontSize: '.8rem', color: 'var(--neu-text-secondary)' }}>
            Go to any topic and click the 📝 button to generate a blog
          </div>
        </div>
      )}

      {/* Blog cards grouped by section */}
      {Object.entries(grouped).map(([secId, secBlogs]) => {
        const sec = sectionMap[secId]
        return (
          <div key={secId} style={{ marginBottom: 24 }}>
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

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
              {secBlogs.map(blog => (
                <div
                  key={blog.id}
                  onClick={() => setActiveBlog(blog)}
                  style={{
                    background: 'var(--neu-bg)', borderRadius: 16, padding: '16px 18px',
                    cursor: 'pointer', position: 'relative',
                    boxShadow: '4px 4px 8px var(--neu-shadow-dark), -4px -4px 8px var(--neu-shadow-light)',
                    borderLeft: `3px solid ${sec?.color || 'var(--neu-accent)'}`,
                    transition: 'transform .15s, box-shadow .15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)' }}
                >
                  <div style={{ fontWeight: 700, fontSize: '.85rem', color: 'var(--neu-text-primary)', marginBottom: 6 }}>
                    {blog.topic_name}
                  </div>
                  <div style={{ fontSize: '.68rem', color: 'var(--neu-text-secondary)', fontFamily: 'monospace' }}>
                    {blog.updated_at
                      ? `updated ${new Date(blog.updated_at).toLocaleDateString()}`
                      : `created ${new Date(blog.created_at).toLocaleDateString()}`
                    }
                  </div>
                  <button
                    title="Delete blog"
                    onClick={e => deleteBlog(blog.id, e)}
                    style={{
                      position: 'absolute', top: 10, right: 10,
                      width: 22, height: 22, borderRadius: '50%',
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      color: 'var(--neu-text-secondary)', fontSize: '.7rem',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      opacity: 0.4, transition: 'opacity .15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = '#dc2626' }}
                    onMouseLeave={e => { e.currentTarget.style.opacity = '0.4'; e.currentTarget.style.color = 'var(--neu-text-secondary)' }}
                  >✕</button>
                </div>
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
