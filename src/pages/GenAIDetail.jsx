import LearningLessonHeader from '../components/LearningLessonHeader'
import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { SECTIONS, loadChecks, saveChecks, itemId, isDone as itemIsDone, itemText, itemTopic, itemRank, RANK_LABELS } from '../data/genAIData'
import GenAIBlog from './GenAIBlog'
import TopicBlog from './TopicBlog'


export default function GenAIDetail() {
  const { sectionId } = useParams()
  const navigate = useNavigate()
  const section = SECTIONS.find(s => s.id === sectionId)

  const [checks, setChecks] = useState(loadChecks)
  const [showBlog, setShowBlog] = useState(false)
  const [topicBlog, setTopicBlog] = useState(null) // { topicName } or null
  const [savedBlogs, setSavedBlogs] = useState(new Set()) // topic names that have saved blogs
  const [openSubs, setOpenSubs] = useState(() => {
    const o = new Set()
    if (section) section.subsections.forEach(sub => o.add(sub.label))
    return o
  })
  const [search, setSearch] = useState('')

  // Sync checks across tabs / overview page
  useEffect(() => {
    const sync = () => setChecks(loadChecks())
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])

  // Load which topics have saved blogs
  useEffect(() => {
    fetch('/api/genai/topic-blogs')
      .then(r => r.json())
      .then(list => {
        const names = new Set(list.filter(b => b.section_id === sectionId).map(b => b.topic_name))
        setSavedBlogs(names)
      })
      .catch(() => {})
  }, [sectionId, topicBlog]) // refetch when a blog modal closes (topicBlog changes)

  const toggle = useCallback((id) => {
    setChecks(prev => {
      const next = { ...prev, [id]: !itemIsDone(prev[id]) }
      saveChecks(next)
      return next
    })
  }, [])

  const toggleSub = (label) => {
    setOpenSubs(prev => {
      const next = new Set(prev)
      next.has(label) ? next.delete(label) : next.add(label)
      return next
    })
  }

  const expandAll = () => setOpenSubs(new Set(section?.subsections.map(s => s.label) ?? []))
  const collapseAll = () => setOpenSubs(new Set())

  const markAllSection = (done) => {
    setChecks(prev => {
      const next = { ...prev }
      section.subsections.forEach(sub =>
        sub.items.forEach((_, i) => { next[itemId(section.id, sub.label, i)] = done })
      )
      saveChecks(next)
      return next
    })
  }

  if (!section) {
    return (
      <div style={{ textAlign: 'center', paddingTop: 80 }}>
        <div style={{ fontSize: '3rem', marginBottom: 16 }}>🤔</div>
        <div style={{ color: 'var(--neu-text-secondary)', marginBottom: 24 }}>Section not found.</div>
        <button className="btn btn-primary" onClick={() => navigate('/genai')}>← Back to Roadmap</button>
      </div>
    )
  }

  // Progress for this section
  let total = 0, done = 0
  section.subsections.forEach(sub => sub.items.forEach((_, i) => {
    total++; if (itemIsDone(checks[itemId(section.id, sub.label, i)])) done++
  }))

  const q = search.toLowerCase()

  // All sections for the sidebar nav
  return (
    <div className="refined-lesson" style={{ maxWidth: 1000, margin: '0 auto' }}>

      {/* ── Back button ── */}
      <button
        className="btn btn-secondary btn-sm"
        onClick={() => navigate('/genai')}
        style={{ marginBottom: 20, display: 'inline-flex', alignItems: 'center', gap: 6 }}
      >
        ← All Topics
      </button>

      <LearningLessonHeader section={section} done={done} total={total} onRead={() => setShowBlog(true)} />

      {/* ── Controls ── */}
      <div className="flex gap-sm items-center" style={{ marginBottom: 20, flexWrap: 'wrap' }}>
        <input
          type="text"
          aria-label="Search within this topic" placeholder="Search within this topic"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 200 }}
        />
        <button className="btn btn-secondary btn-sm" onClick={expandAll}>Expand All</button>
        <button className="btn btn-secondary btn-sm" onClick={collapseAll}>Collapse All</button>
        <button className="btn btn-secondary btn-sm" onClick={() => markAllSection(true)}>✓ Mark all done</button>
        <button className="btn btn-secondary btn-sm" onClick={() => markAllSection(false)}>↺ Uncheck all</button>
      </div>

      <details className="study-other-sections"><summary>Browse other sections</summary>
      {/* ── Other sections quick nav ── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
        {SECTIONS.filter(s => s.id !== section.id).map(s => {
          let st = 0, sd = 0
          s.subsections.forEach(sub => sub.items.forEach((_, i) => {
            st++; if (itemIsDone(checks[itemId(s.id, sub.label, i)])) sd++
          }))
          const sp = st ? Math.round(sd / st * 100) : 0
          return (
            <button
              key={s.id}
              onClick={() => navigate(`/genai/${s.id}`)}
              style={{
                background: 'var(--neu-bg)',
                border: 'none',
                borderRadius: 999,
                padding: '5px 12px',
                fontSize: '.7rem',
                fontWeight: 600,
                cursor: 'pointer',
                color: 'var(--neu-text-secondary)',
                boxShadow: '3px 3px 6px var(--neu-shadow-dark), -3px -3px 6px var(--neu-shadow-light)',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                transition: 'all .15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = s.color }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--neu-text-secondary)' }}
            >
              {s.icon} {s.title}
              <span style={{ fontFamily: 'monospace', opacity: .7 }}>{sp}%</span>
            </button>
          )
        })}
      </div>

      </details>

      {/* ── Subsections ── */}
      {section.subsections.map(sub => {
        const filteredItems = q
          ? sub.items.map((item, i) => ({ item, i })).filter(({ item }) => itemText(item).toLowerCase().includes(q))
          : sub.items.map((item, i) => ({ item, i }))

        if (q && filteredItems.length === 0) return null

        const isOpen = openSubs.has(sub.label)
        let subDone = 0
        sub.items.forEach((_, i) => { if (itemIsDone(checks[itemId(section.id, sub.label, i)])) subDone++ })
        const subPct = sub.items.length ? Math.round(subDone / sub.items.length * 100) : 0
        const allSubDone = subDone === sub.items.length && sub.items.length > 0

        return (
          <div
            key={sub.label}
            className={`prep-day-card${allSubDone ? ' all-done' : ''}`}
            style={{ marginBottom: 14 }}
          >
            {/* Subsection Header */}
            <div className="prep-day-header" role="button" tabIndex={0} aria-expanded={isOpen || !!q}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSub(sub.label) } }} onClick={() => toggleSub(sub.label)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span
                  className="prep-track-label"
                  style={{ background: section.bg, color: section.color, margin: 0, fontSize: '.8rem' }}
                >
                  {sub.label}
                </span>
                {allSubDone && <span style={{ color: '#4ade80', fontSize: '.75rem' }}>✓ Completed!</span>}
              </div>
              <div className="prep-day-prog">
                <span style={{ fontFamily: 'monospace', fontSize: '.72rem', color: section.color }}>{subDone}/{sub.items.length}</span>
                <div style={{
                  width: 52, height: 5, background: 'var(--neu-bg)', borderRadius: 999, overflow: 'hidden',
                  boxShadow: 'inset 2px 2px 3px var(--neu-shadow-dark), inset -2px -2px 3px var(--neu-shadow-light)'
                }}>
                  <div style={{ width: `${subPct}%`, height: '100%', background: section.color, borderRadius: 999, transition: 'width .3s' }} />
                </div>
                <span className="prep-chevron">{isOpen ? '▾' : '▸'}</span>
              </div>
            </div>

            {/* Items list */}
            {(isOpen || q) && (
              <div className="prep-day-body">
                {filteredItems.map(({ item, i }) => {
                  const id = itemId(section.id, sub.label, i)
                  const isDone = itemIsDone(checks[id])
                  const text = itemText(item)
                  const topic = itemTopic(item)
                  const rank = itemRank(item)
                  const hasBlog = savedBlogs.has(topic)
                  return (
                    <div
                      key={id}
                      style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      <label
                        className={`prep-task${isDone ? ' done' : ''}`}
                        style={{ paddingLeft: 4, flex: 1, marginBottom: 0 }}
                      >
                        <input type="checkbox" checked={isDone} onChange={() => toggle(id)} />
                        <span className="prep-task-text" style={{ fontSize: '.88rem' }}>
                          {text}
                        </span>
                      </label>
                      {rank && (
                        <span
                          title={`Importance ${rank}/5 — ${RANK_LABELS[rank]}`}
                          style={{
                            flexShrink: 0,
                            width: 22, height: 22, borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontFamily: 'monospace', fontSize: '.68rem', fontWeight: 700,
                            background: rank >= 4 ? section.color : 'var(--neu-bg)',
                            color: rank >= 4 ? '#fff' : 'var(--neu-text-secondary)',
                            border: rank >= 4 ? 'none' : '1.5px solid var(--neu-shadow-dark)',
                            boxShadow: rank >= 4
                              ? 'none'
                              : 'inset 1px 1px 2px var(--neu-shadow-dark), inset -1px -1px 2px var(--neu-shadow-light)',
                            opacity: rank >= 4 ? 1 : 0.75,
                            userSelect: 'none',
                          }}
                        >
                          {rank}
                        </span>
                      )}
                      <button className="lesson-blog-action" aria-label={hasBlog ? `Read blog: ${topic}` : `Generate blog: ${topic}`} onClick={() => setTopicBlog({ topicName: topic })}>{hasBlog ? 'Read' : 'Blog'} ↗</button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}

      {/* ── Section blog modal ── */}
      {showBlog && <GenAIBlog section={section} onClose={() => setShowBlog(false)} />}

      {/* ── Topic blog modal ── */}
      {topicBlog && (
        <TopicBlog
          topicName={topicBlog.topicName}
          sectionId={section.id}
          sectionTitle={section.title}
          sectionColor={section.color}
          sectionIcon={section.icon}
          onClose={() => setTopicBlog(null)}
        />
      )}

      {/* ── Bottom nav ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32, flexWrap: 'wrap', gap: 12 }}>
        {(() => {
          const idx = SECTIONS.findIndex(s => s.id === sectionId)
          const prev = SECTIONS[idx - 1]
          const next = SECTIONS[idx + 1]
          return (
            <>
              {prev ? (
                <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/genai/${prev.id}`)}>
                  ← {prev.icon} {prev.title}
                </button>
              ) : <span />}
              {next ? (
                <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/genai/${next.id}`)}>
                  {next.icon} {next.title} →
                </button>
              ) : <span />}
            </>
          )
        })()}
      </div>
    </div>
  )
}
