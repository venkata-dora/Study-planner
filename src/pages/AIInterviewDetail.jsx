import LearningLessonHeader from '../components/LearningLessonHeader'
import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { SECTIONS, loadChecks, saveChecks, itemId, cycleState, normalizeState, isDone, STATE_COLORS } from '../data/aiInterviewData'
import TopicBlog from './TopicBlog'

export default function AIInterviewDetail() {
  const { sectionId } = useParams()
  const navigate = useNavigate()
  const section = SECTIONS.find(s => s.id === sectionId)

  const [checks, setChecks] = useState(loadChecks)
  const [topicBlog, setTopicBlog] = useState(null)
  const [savedBlogs, setSavedBlogs] = useState(new Set())
  const [openSubs, setOpenSubs] = useState(() => {
    const o = new Set()
    if (section) section.subsections.forEach(sub => o.add(sub.label))
    return o
  })
  const [search, setSearch] = useState('')

  useEffect(() => {
    const sync = () => setChecks(loadChecks())
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])

  useEffect(() => {
    fetch('http://localhost:5050/api/genai/topic-blogs')
      .then(r => r.json())
      .then(list => {
        const names = new Set(list.filter(b => b.section_id === sectionId).map(b => b.topic_name))
        setSavedBlogs(names)
      })
      .catch(() => {})
  }, [sectionId, topicBlog])

  const toggle = useCallback((id) => {
    setChecks(prev => {
      const next = { ...prev, [id]: cycleState(prev[id]) }
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

  const markAllSection = (state) => {
    setChecks(prev => {
      const next = { ...prev }
      section.subsections.forEach(sub =>
        sub.items.forEach((_, i) => { next[itemId(section.id, sub.label, i)] = state })
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
        <button className="btn btn-primary" onClick={() => navigate('/ai-interview')}>← Back to Interview Prep</button>
      </div>
    )
  }

  let total = 0, done = 0
  section.subsections.forEach(sub => sub.items.forEach((_, i) => {
    total++; if (isDone(checks[itemId(section.id, sub.label, i)])) done++
  }))

  const q = search.toLowerCase()

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Back button */}
      <button
        className="btn btn-secondary btn-sm"
        onClick={() => navigate('/ai-interview')}
        style={{ marginBottom: 20, display: 'inline-flex', alignItems: 'center', gap: 6 }}
      >
        ← All Rounds
      </button>

      <LearningLessonHeader section={section} done={done} total={total} unit="questions">
        {/* Legend */}
        <div style={{ display: 'flex', gap: 16, marginTop: 14 }}>
          {[0, 1, 2].map(st => {
            const c = STATE_COLORS[st]
            return (
              <div key={st} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '.72rem' }}>
                <span style={{
                  width: 18, height: 18, borderRadius: 4,
                  background: c.bg, border: `1.5px solid ${c.border}`,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  color: c.text, fontWeight: 700, fontSize: '.65rem',
                }}>{c.label}</span>
                <span style={{ color: 'var(--neu-text-secondary)' }}>{c.tip}</span>
              </div>
            )
          })}
        </div>
      </LearningLessonHeader>

      {/* Controls */}
      <div className="flex gap-sm items-center" style={{ marginBottom: 20, flexWrap: 'wrap' }}>
        <input
          type="text"
          aria-label="Search questions" placeholder="Search questions"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 200 }}
        />
        <button className="btn btn-secondary btn-sm" onClick={expandAll}>Expand All</button>
        <button className="btn btn-secondary btn-sm" onClick={collapseAll}>Collapse All</button>
        <button className="btn btn-secondary btn-sm" onClick={() => markAllSection(2)}>✓ Mark all done</button>
        <button className="btn btn-secondary btn-sm" onClick={() => markAllSection(0)}>↺ Reset all</button>
      </div>

      <details className="study-other-sections"><summary>Browse other sections</summary>
      {/* Other sections quick nav */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
        {SECTIONS.filter(s => s.id !== section.id).map(s => {
          let st = 0, sd = 0
          s.subsections.forEach(sub => sub.items.forEach((_, i) => {
            st++; if (isDone(checks[itemId(s.id, sub.label, i)])) sd++
          }))
          const sp = st ? Math.round(sd / st * 100) : 0
          return (
            <button
              key={s.id}
              onClick={() => navigate(`/ai-interview/${s.id}`)}
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
              <span style={{ fontFamily: 'inherit', opacity: .7 }}>{sp}%</span>
            </button>
          )
        })}
      </div>

      </details>

      {/* Subsections */}
      {section.subsections.map(sub => {
        const filteredItems = q
          ? sub.items.map((item, i) => ({ item, i })).filter(({ item }) => item.toLowerCase().includes(q))
          : sub.items.map((item, i) => ({ item, i }))

        if (q && filteredItems.length === 0) return null

        const isOpen = openSubs.has(sub.label)
        let subDone = 0
        sub.items.forEach((_, i) => { if (isDone(checks[itemId(section.id, sub.label, i)])) subDone++ })
        const subPct = sub.items.length ? Math.round(subDone / sub.items.length * 100) : 0
        const allSubDone = subDone === sub.items.length && sub.items.length > 0

        return (
          <div
            key={sub.label}
            className={`prep-day-card${allSubDone ? ' all-done' : ''}`}
            style={{ marginBottom: 14 }}
          >
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
                <span style={{ fontFamily: 'inherit', fontSize: '.72rem', color: section.color }}>{subDone}/{sub.items.length}</span>
                <div style={{
                  width: 52, height: 5, background: 'var(--neu-bg)', borderRadius: 999, overflow: 'hidden',
                  boxShadow: 'inset 2px 2px 3px var(--neu-shadow-dark), inset -2px -2px 3px var(--neu-shadow-light)'
                }}>
                  <div style={{ width: `${subPct}%`, height: '100%', background: section.color, borderRadius: 999, transition: 'width .3s' }} />
                </div>
                <span className="prep-chevron">{isOpen ? '▾' : '▸'}</span>
              </div>
            </div>

            {(isOpen || q) && (
              <div className="prep-day-body">
                {filteredItems.map(({ item, i }) => {
                  const id = itemId(section.id, sub.label, i)
                  const state = normalizeState(checks[id])
                  const sc = STATE_COLORS[state]
                  const hasBlog = savedBlogs.has(item)
                  return (
                    <div
                      key={id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '8px 10px', borderRadius: 10,
                        background: sc.bg,
                        border: `1.5px solid ${sc.border}33`,
                        transition: 'all .15s',
                        marginBottom: 4,
                      }}
                    >
                      {/* State badge */}
                      <button className="study-status-button"
                        aria-label={`${item}: ${sc.tip}. Change status`}
                        title={sc.tip}
                        onClick={() => toggle(id)}
                        style={{
                          width: 24, height: 24, borderRadius: 6, flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: sc.bg, border: `2px solid ${sc.border}`,
                          color: sc.text, fontWeight: 800, fontSize: '.72rem',
                          transition: 'all .15s', cursor: 'pointer',
                        }}
                      >
                        {sc.label}
                      </button>
                      <span
                        onClick={() => toggle(id)}
                        style={{
                          fontSize: '.88rem',
                          color: 'var(--neu-text-primary)',
                          textDecoration: state === 2 ? 'line-through' : 'none',
                          opacity: state === 2 ? 0.6 : 1,
                          flex: 1, cursor: 'pointer',
                        }}
                      >
                        {item}
                      </span>
                      <button
                        title={hasBlog ? `Read blog: ${item}` : `Generate blog: ${item}`}
                        onClick={e => { e.stopPropagation(); setTopicBlog({ topicName: item }) }}
                        style={{
                          flexShrink: 0,
                          width: 28, height: 28, borderRadius: '50%',
                          background: hasBlog ? `${section.color}18` : 'var(--neu-bg)',
                          border: hasBlog ? `1.5px solid ${section.color}55` : 'none',
                          cursor: 'pointer',
                          color: hasBlog ? section.color : 'var(--neu-text-secondary)',
                          fontSize: '.7rem',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          boxShadow: hasBlog
                            ? 'none'
                            : '2px 2px 4px var(--neu-shadow-dark), -2px -2px 4px var(--neu-shadow-light)',
                          transition: 'all .15s',
                          opacity: hasBlog ? 1 : 0.6,
                        }}
                        onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = section.color }}
                        onMouseLeave={e => { if (!hasBlog) { e.currentTarget.style.opacity = '0.6'; e.currentTarget.style.color = 'var(--neu-text-secondary)' } }}
                      >
                        📝
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}

      {/* Topic blog modal */}
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

      {/* Bottom nav */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32, flexWrap: 'wrap', gap: 12 }}>
        {(() => {
          const idx = SECTIONS.findIndex(s => s.id === sectionId)
          const prev = SECTIONS[idx - 1]
          const next = SECTIONS[idx + 1]
          return (
            <>
              {prev ? (
                <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/ai-interview/${prev.id}`)}>
                  ← {prev.icon} {prev.title}
                </button>
              ) : <span />}
              {next ? (
                <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/ai-interview/${next.id}`)}>
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
