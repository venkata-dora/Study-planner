import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'

const DOCS = [
  {
    id: 'technical',
    file: '/docs/01_technical_interview_qa.md',
    icon: '🧠',
    title: 'Technical Interview Q&A',
    subtitle: '50 questions — RAG, Fine-tuning, Agents, Prompt Eng, MLOps, System Design',
    color: '#7c3aed',
    bg: 'rgba(124,58,237,0.12)',
    tags: ['RAG', 'Fine-tuning', 'Agents', 'Prompt Eng', 'MLOps', 'System Design', 'Responsible AI'],
  },
  {
    id: 'behavioral',
    file: '/docs/02_experience_behavioral_qa.md',
    icon: '💬',
    title: 'Experience & Behavioral Q&A',
    subtitle: 'Tell me about yourself, STAR stories, tricky questions',
    color: '#0891b2',
    bg: 'rgba(8,145,178,0.12)',
    tags: ['Intro Pitch', 'Compass Group', 'Grootan', 'Behavioral', 'STAR', 'Gaps'],
  },
  {
    id: 'projects',
    file: '/docs/03_project_stories_architecture.md',
    icon: '🏗️',
    title: 'Project Stories & Architecture',
    subtitle: 'Deep dive: architecture, decisions, impact, lessons learned',
    color: '#ea580c',
    bg: 'rgba(234,88,12,0.12)',
    tags: ['Multi-Agent', 'Hybrid RAG', 'ID Auth', 'Credit Default', 'Cross-Project Patterns'],
  },
]

export { DOCS }

const CATEGORIES = ['all', 'project', 'company', 'technical', 'behavioral', 'system_design', 'situational']
const CAT_LABELS = { all: 'All', technical: 'Technical', behavioral: 'Behavioral', project: 'Project', company: 'Company', system_design: 'System Design', situational: 'Situational' }
const CAT_COLORS = { technical: '#7c3aed', behavioral: '#0891b2', project: '#ea580c', company: '#d97706', system_design: '#2563eb', situational: '#059669', general: '#6b7280' }

export default function InterviewPrep() {
  const navigate = useNavigate()
  const [view, setView] = useState('hub') // 'hub' | 'detail'
  const [sessions, setSessions] = useState([])
  const [activeSession, setActiveSession] = useState(null)
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [answerLoading, setAnswerLoading] = useState({})
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [uploadFile, setUploadFile] = useState(null)
  const [jdText, setJdText] = useState('')
  const [title, setTitle] = useState('')
  const [expandedAnswers, setExpandedAnswers] = useState({})
  const [showResumePreview, setShowResumePreview] = useState(false)

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/interview-prep/sessions')
      if (res.ok) setSessions(await res.json())
    } catch {}
  }, [])

  useEffect(() => { fetchSessions() }, [fetchSessions])

  const openSession = async (sid) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/interview-prep/session/${sid}`)
      if (res.ok) {
        const data = await res.json()
        setActiveSession(data)
        setQuestions(data.questions || [])
        setCategoryFilter('all')
        setExpandedAnswers({})
        setView('detail')
      }
    } catch {} finally { setLoading(false) }
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!uploadFile) return
    setLoading(true)
    const fd = new FormData()
    fd.append('resume', uploadFile)
    if (jdText) fd.append('jd_text', jdText)
    if (title) fd.append('title', title)
    try {
      const res = await fetch('/api/interview-prep/session', { method: 'POST', body: fd })
      const data = await res.json()
      if (res.ok) {
        setUploadFile(null)
        setJdText('')
        setTitle('')
        if (data.ai_failed) {
          await fetchSessions()
          alert('Resume uploaded but AI question generation failed. You can retry from the session.')
        } else {
          await openSession(data.session_id)
          await fetchSessions()
        }
      } else {
        alert(data.error || 'Upload failed')
      }
    } catch { alert('Network error') } finally { setLoading(false) }
  }

  const handleDelete = async (sid, e) => {
    e.stopPropagation()
    if (!confirm('Delete this session and all its questions?')) return
    try {
      await fetch(`/api/interview-prep/session/${sid}`, { method: 'DELETE' })
      setSessions(s => s.filter(x => x.id !== sid))
      if (activeSession?.id === sid) { setView('hub'); setActiveSession(null) }
    } catch {}
  }

  const handleRegenQuestions = async () => {
    if (!activeSession) return
    setLoading(true)
    try {
      const res = await fetch(`/api/interview-prep/session/${activeSession.id}/regenerate`, { method: 'POST' })
      const data = await res.json()
      if (data.ai_failed) {
        alert('AI failed to regenerate questions. Try again later.')
      } else {
        await openSession(activeSession.id)
        await fetchSessions()
      }
    } catch {} finally { setLoading(false) }
  }

  const generateAnswer = async (qid) => {
    setAnswerLoading(prev => ({ ...prev, [qid]: true }))
    try {
      const res = await fetch(`/api/interview-prep/question/${qid}/answer`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setQuestions(qs => qs.map(q => q.id === qid ? { ...q, answer_text: data.answer_text, answered_at: data.answered_at } : q))
        setExpandedAnswers(prev => ({ ...prev, [qid]: true }))
        setActiveSession(s => s ? { ...s, answered_count: s.answered_count + 1 } : s)
      } else {
        alert(data.error || 'Failed to generate answer')
      }
    } catch { alert('Network error') } finally {
      setAnswerLoading(prev => ({ ...prev, [qid]: false }))
    }
  }

  const regenerateAnswer = async (qid) => {
    setAnswerLoading(prev => ({ ...prev, [qid]: true }))
    try {
      const res = await fetch(`/api/interview-prep/question/${qid}/regenerate-answer`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setQuestions(qs => qs.map(q => q.id === qid ? { ...q, answer_text: data.answer_text, answered_at: data.answered_at } : q))
        setExpandedAnswers(prev => ({ ...prev, [qid]: true }))
      } else {
        alert(data.error || 'Failed to regenerate answer')
      }
    } catch { alert('Network error') } finally {
      setAnswerLoading(prev => ({ ...prev, [qid]: false }))
    }
  }

  const filteredQuestions = categoryFilter === 'all' ? questions : questions.filter(q => q.category === categoryFilter)
  const answeredCount = activeSession?.answered_count || 0
  const totalCount = activeSession?.question_count || 0

  // ── Session Detail View ──
  if (view === 'detail' && activeSession) {
    return (
      <div className="interview-preparation" style={{ maxWidth: 1060, margin: '0 auto' }}>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => { setView('hub'); setActiveSession(null) }}
          style={{ marginBottom: 20, display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          ← Back to Sessions
        </button>

        {/* Session Header */}
        <div style={{
          background: 'var(--neu-bg)', borderRadius: 24, padding: '24px 28px', marginBottom: 20,
          boxShadow: '8px 8px 16px var(--neu-shadow-dark), -8px -8px 16px var(--neu-shadow-light)',
          borderLeft: '4px solid var(--neu-accent)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800 }}>{activeSession.title}</h2>
              <div style={{ fontSize: '.78rem', color: 'var(--neu-text-secondary)', marginTop: 4 }}>
                {new Date(activeSession.created_at).toLocaleDateString()} · {totalCount} questions
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowResumePreview(p => !p)}>
                {showResumePreview ? 'Hide' : 'Show'} Resume
              </button>
              <button className="btn btn-secondary btn-sm" onClick={handleRegenQuestions} disabled={loading}>
                {loading ? 'Regenerating...' : 'Regenerate Questions'}
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.75rem', marginBottom: 4 }}>
              <span>{answeredCount}/{totalCount} answered</span>
              <span>{totalCount > 0 ? Math.round((answeredCount / totalCount) * 100) : 0}%</span>
            </div>
            <div style={{ height: 8, borderRadius: 4, background: 'var(--study-line)', overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 4, width: `${totalCount > 0 ? (answeredCount / totalCount) * 100 : 0}%`,
                background: 'var(--neu-accent)', transition: 'width .3s',
              }} />
            </div>
          </div>
        </div>

        {/* Resume/JD preview */}
        {showResumePreview && (
          <div style={{
            background: 'var(--neu-bg)', borderRadius: 16, padding: '16px 20px', marginBottom: 16,
            boxShadow: 'inset 4px 4px 8px var(--neu-shadow-dark), inset -4px -4px 8px var(--neu-shadow-light)',
            maxHeight: 300, overflow: 'auto', fontSize: '.8rem', whiteSpace: 'pre-wrap', fontFamily: 'inherit',
          }}>
            <strong>Resume:</strong><br />{activeSession.resume_text?.slice(0, 3000)}
            {activeSession.resume_text?.length > 3000 && '...'}
            {activeSession.jd_text && (<><br /><br /><strong>Job Description:</strong><br />{activeSession.jd_text}</>)}
          </div>
        )}

        {/* Category filter tabs */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
          {CATEGORIES.map(cat => {
            const count = cat === 'all' ? questions.length : questions.filter(q => q.category === cat).length
            if (cat !== 'all' && count === 0) return null
            return (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                style={{
                  padding: '6px 14px', borderRadius: 999, border: 'none', cursor: 'pointer',
                  fontSize: '.78rem', fontWeight: 600, fontFamily: 'inherit',
                  background: categoryFilter === cat ? (CAT_COLORS[cat] || '#7c3aed') : 'var(--neu-bg)',
                  color: categoryFilter === cat ? '#fff' : 'var(--neu-text-secondary)',
                  boxShadow: categoryFilter === cat
                    ? `0 2px 8px ${CAT_COLORS[cat] || '#7c3aed'}44`
                    : '3px 3px 6px var(--neu-shadow-dark), -3px -3px 6px var(--neu-shadow-light)',
                  transition: 'all .15s',
                }}
              >
                {CAT_LABELS[cat] || cat} ({count})
              </button>
            )
          })}
        </div>

        {/* Questions list */}
        {totalCount === 0 && (
          <div style={{
            textAlign: 'center', padding: 40, color: 'var(--neu-text-secondary)',
            background: 'var(--neu-bg)', borderRadius: 20,
            boxShadow: '6px 6px 12px var(--neu-shadow-dark), -6px -6px 12px var(--neu-shadow-light)',
          }}>
            <div style={{ fontSize: '2rem', marginBottom: 12 }}>⚠️</div>
            <p>No questions generated. AI may have failed.</p>
            <button className="btn btn-primary" onClick={handleRegenQuestions} disabled={loading}>
              {loading ? 'Regenerating...' : 'Retry Question Generation'}
            </button>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {filteredQuestions.map((q, i) => {
            const catColor = CAT_COLORS[q.category] || '#6b7280'
            const isExpanded = expandedAnswers[q.id]
            const isLoadingAnswer = answerLoading[q.id]
            return (
              <div key={q.id} style={{
                background: 'var(--neu-bg)', borderRadius: 18, padding: '20px 24px',
                boxShadow: '5px 5px 10px var(--neu-shadow-dark), -5px -5px 10px var(--neu-shadow-light)',
                borderLeft: `4px solid ${catColor}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <span style={{
                    minWidth: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '.72rem', fontWeight: 700, fontFamily: 'inherit',
                    background: `${catColor}18`, color: catColor, flexShrink: 0,
                  }}>
                    {q.order_index + 1}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '.95rem', lineHeight: 1.4, marginBottom: 8 }}>
                      {q.question_text}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{
                        padding: '2px 10px', borderRadius: 999, fontSize: '.68rem', fontWeight: 600, fontFamily: 'inherit',
                        background: `${catColor}18`, color: catColor,
                      }}>
                        {CAT_LABELS[q.category] || q.category}
                      </span>
                      {q.answer_text ? (
                        <>
                          <button
                            onClick={() => setExpandedAnswers(prev => ({ ...prev, [q.id]: !prev[q.id] }))}
                            style={{
                              background: 'none', border: 'none', cursor: 'pointer',
                              color: '#7c3aed', fontSize: '.78rem', fontWeight: 600, padding: 0,
                            }}
                          >
                            {isExpanded ? 'Hide Answer ▲' : 'Show Answer ▼'}
                          </button>
                          <button
                            onClick={() => regenerateAnswer(q.id)}
                            disabled={isLoadingAnswer}
                            style={{
                              background: 'none', border: 'none', cursor: 'pointer',
                              color: 'var(--neu-text-secondary)', fontSize: '.72rem', padding: 0,
                            }}
                          >
                            {isLoadingAnswer ? 'Regenerating...' : '↻ Regenerate'}
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => generateAnswer(q.id)}
                          disabled={isLoadingAnswer}
                          className="btn btn-sm"
                          style={{
                            background: 'var(--neu-accent)',
                            color: 'var(--neu-surface)', border: 'none', padding: '4px 14px', borderRadius: 999,
                            fontSize: '.72rem', fontWeight: 600, cursor: 'pointer',
                          }}
                        >
                          {isLoadingAnswer ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                              <span className="spinner" style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                              Generating...
                            </span>
                          ) : 'Get AI Answer'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Answer section */}
                {q.answer_text && isExpanded && (
                  <div style={{
                    marginTop: 14, padding: '14px 18px', borderRadius: 12,
                    background: 'var(--neu-shadow-light)', fontSize: '.85rem', lineHeight: 1.6,
                    whiteSpace: 'pre-wrap', borderLeft: `3px solid ${catColor}44`,
                  }}>
                    {q.answer_text}
                  </div>
                )}

                {/* Loading spinner for answer */}
                {isLoadingAnswer && !q.answer_text && (
                  <div style={{
                    marginTop: 14, padding: '14px 18px', borderRadius: 12,
                    background: 'var(--neu-shadow-light)', fontSize: '.82rem',
                    color: 'var(--neu-text-secondary)', textAlign: 'center',
                  }}>
                    Generating answer... this may take ~15s
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ── Session Hub View ──
  return (
    <div className="interview-preparation" style={{ maxWidth: 1060, margin: '0 auto' }}>
      {/* Back */}
      <button
        className="btn btn-secondary btn-sm"
        onClick={() => navigate('/practice')}
        style={{ marginBottom: 20, display: 'inline-flex', alignItems: 'center', gap: 6 }}
      >
        ← Interview practice
      </button>

      <header className="apple-page-heading"><div><span className="learning-eyebrow">PREPARE & PRACTICE</span><h1>Interview preparation</h1><p>Create questions from your resume, explore reference guides, and rehearse your answers.</p></div></header>

      {/* Upload Card */}
      <div className="resume-upload" style={{
        background: 'var(--neu-bg)', borderRadius: 20, padding: '24px 28px', marginBottom: 24,
        boxShadow: '6px 6px 12px var(--neu-shadow-dark), -6px -6px 12px var(--neu-shadow-light)',
        borderLeft: '4px solid #2563eb',
      }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '1.05rem', fontWeight: 700, color: '#2563eb' }}>
          Create a practice session
        </h3>
        <form onSubmit={handleUpload}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: '.78rem', fontWeight: 600, marginBottom: 4, color: 'var(--neu-text-secondary)' }}>
              Resume (.pdf or .txt) *
            </label>
            <input
              aria-label="Resume PDF or text file"
              type="file"
              accept=".pdf,.txt"
              onChange={e => setUploadFile(e.target.files[0] || null)}
              style={{ fontSize: '.85rem' }}
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: '.78rem', fontWeight: 600, marginBottom: 4, color: 'var(--neu-text-secondary)' }}>
              Session Title (optional)
            </label>
            <input
              aria-label="Session title"
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Google SWE Interview"
              style={{
                width: '100%', padding: '8px 12px', borderRadius: 10, border: 'none', fontSize: '.85rem',
                background: 'var(--neu-bg)', color: 'var(--neu-text)',
                boxShadow: 'inset 3px 3px 6px var(--neu-shadow-dark), inset -3px -3px 6px var(--neu-shadow-light)',
              }}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: '.78rem', fontWeight: 600, marginBottom: 4, color: 'var(--neu-text-secondary)' }}>
              Job Description (optional — improves question relevance)
            </label>
            <textarea aria-label="Job description"
              value={jdText}
              onChange={e => setJdText(e.target.value)}
              placeholder="Paste the job description here..."
              rows={3}
              style={{
                width: '100%', padding: '8px 12px', borderRadius: 10, border: 'none', fontSize: '.85rem',
                resize: 'vertical', fontFamily: 'inherit',
                background: 'var(--neu-bg)', color: 'var(--neu-text)',
                boxShadow: 'inset 3px 3px 6px var(--neu-shadow-dark), inset -3px -3px 6px var(--neu-shadow-light)',
              }}
            />
          </div>
          <button
            type="submit"
            disabled={!uploadFile || loading}
            className="btn btn-primary"
            style={{
              background: loading ? '#999' : 'var(--neu-accent)',
              color: 'var(--neu-surface)', border: 'none', padding: '10px 28px', borderRadius: 12,
              fontSize: '.9rem', fontWeight: 700, cursor: loading ? 'wait' : 'pointer',
            }}
          >
            {loading ? 'Analyzing resume and generating questions... ~30s' : 'Upload & Generate Questions'}
          </button>
        </form>
      </div>

      {/* Past Sessions */}
      {sessions.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 14, color: 'var(--neu-text-secondary)' }}>
            Past Sessions ({sessions.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {sessions.map(s => {
              const pct = s.question_count > 0 ? Math.round((s.answered_count / s.question_count) * 100) : 0
              return (
                <div
                  key={s.id}
                  onClick={() => openSession(s.id)}
                  style={{
                    background: 'var(--neu-bg)', borderRadius: 16, padding: '18px 22px',
                    cursor: 'pointer', position: 'relative',
                    boxShadow: '5px 5px 10px var(--neu-shadow-dark), -5px -5px 10px var(--neu-shadow-light)',
                    transition: 'transform .15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '.95rem' }}>{s.title || 'Untitled Session'}</div>
                      <div style={{ fontSize: '.75rem', color: 'var(--neu-text-secondary)', marginTop: 3 }}>
                        {new Date(s.created_at).toLocaleDateString()} · {s.question_count} questions · {s.answered_count} answered
                      </div>
                      {/* Progress bar */}
                      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--study-line)', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', borderRadius: 3, width: `${pct}%`,
                            background: pct === 100 ? '#059669' : 'var(--neu-accent)',
                            transition: 'width .3s',
                          }} />
                        </div>
                        <span style={{ fontSize: '.7rem', fontWeight: 600, color: 'var(--neu-text-secondary)', fontFamily: 'inherit' }}>
                          {pct}%
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={e => handleDelete(s.id, e)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px',
                        color: '#ef4444', fontSize: '.8rem', fontWeight: 600, marginLeft: 12,
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <Link className="hub-practice-link" to="/practice"><div><span className="learning-eyebrow">PUT IT INTO WORDS</span><h2>Practice your answers</h2><p>Record a response, review your transcript, and reflect on your feedback.</p></div><span aria-hidden="true">→</span></Link>
      <div className="learning-section-title"><h2>Interview reference guides</h2></div>

      {/* Doc cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {DOCS.map(doc => (
          <Link className="interview-guide"
            key={doc.id}
            to={`/interview/${doc.id}`}
            style={{
              background: 'var(--neu-bg)', borderRadius: 20, padding: '24px 28px',
              cursor: 'pointer', position: 'relative', overflow: 'hidden',
              boxShadow: '6px 6px 12px var(--neu-shadow-dark), -6px -6px 12px var(--neu-shadow-light)',
              borderLeft: `4px solid ${doc.color}`,
              transition: 'transform .15s, box-shadow .15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '8px 8px 20px var(--neu-shadow-dark), -8px -8px 20px var(--neu-shadow-light)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '6px 6px 12px var(--neu-shadow-dark), -6px -6px 12px var(--neu-shadow-light)' }}
          >
            {/* Glow */}
            <div style={{
              position: 'absolute', top: -20, right: -20,
              width: 120, height: 120, borderRadius: '50%',
              background: doc.bg, filter: 'blur(30px)', pointerEvents: 'none'
            }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10, position: 'relative' }}>
              <div style={{
                width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem',
                background: doc.bg,
                boxShadow: `0 0 0 2px ${doc.color}33`,
              }}>
                {doc.icon}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1.05rem', color: doc.color }}>
                  {doc.title}
                </div>
                <div style={{ fontSize: '.78rem', color: 'var(--neu-text-secondary)', marginTop: 2 }}>
                  {doc.subtitle}
                </div>
              </div>
              <div style={{ marginLeft: 'auto', color: doc.color, fontSize: '1.2rem', opacity: 0.5 }}>→</div>
            </div>

            {/* Tags */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, position: 'relative' }}>
              {doc.tags.map(tag => (
                <span key={tag} style={{
                  background: doc.bg, color: doc.color,
                  padding: '3px 10px', borderRadius: 999,
                  fontSize: '.68rem', fontWeight: 600, fontFamily: 'inherit',
                }}>
                  {tag}
                </span>
              ))}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
