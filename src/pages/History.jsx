import { useState, useEffect } from 'react'
import { getDailyStats } from '../data/dsaData'
import { getLocalDate } from '../utils/dateUtils'

const emojis = ['', '😴', '😐', '🙂', '😊', '🔥']

export default function History() {
  const [dayData, setDayData] = useState({})
  const [modal, setModal] = useState(null)
  const [modalData, setModalData] = useState(null)

  useEffect(() => {
    fetch('/api/history').then(r => r.json()).then(setDayData)
  }, [])

  const openModal = async (day) => {
    setModal(day)
    const data = await fetch(`/api/day_data/${day}`).then(r => r.json())
    setModalData(data)
  }

  // Build calendar cells
  const dates = Object.keys(dayData).sort()
  const buildCells = () => {
    if (dates.length === 0) return []
    const firstDate = new Date(dates[0] + 'T00:00:00')
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const startDate = new Date(firstDate); startDate.setDate(startDate.getDate() - startDate.getDay())
    const endDate = new Date(today); endDate.setDate(endDate.getDate() + (6 - endDate.getDay()))

    const cells = []
    const current = new Date(startDate)
    while (current <= endDate) {
      const ds = getLocalDate(current)
      const info = dayData[ds]
      cells.push({ date: ds, day: current.getDate(), info, isPast: current <= today })
      current.setDate(current.getDate() + 1)
    }
    return cells
  }

  const cells = buildCells()

  return (
    <>
      <div className="flex justify-between items-center mb-md">
        <h2 style={{ fontSize: '1.3rem', fontWeight: 700 }}>📆 Day History</h2>
        <p style={{ fontSize: '.82rem', color: 'var(--neu-text-secondary)' }}>Click any day to see full details</p>
      </div>

      <div className="card animate-in">
        <div className="calendar-grid">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div className="cal-header" key={d}>{d}</div>
          ))}
          {cells.length === 0 ? (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 40, color: 'var(--neu-text-secondary)' }}>No data yet. Start planning your day!</div>
          ) : cells.map((c, i) => {
            let cls = 'cal-cell'
            if (c.info) {
              cls += c.info.pct >= 80 ? ' green' : c.info.pct >= 50 ? ' amber' : ' red'
            } else {
              cls += ' empty'
            }
            return (
              <div key={i} className={cls} onClick={() => c.info && openModal(c.date)}>
                <div className="cal-date" style={!c.info ? { opacity: c.isPast ? .4 : .2 } : {}}>{c.day}</div>
                {c.info && (
                  <div className="cal-pct">
                    {c.info.pct}%
                    {c.info.study_hours > 0 && (
                      <div style={{ fontSize: '.55rem', marginTop: 2, lineHeight: 1.3 }}>
                        <span style={{ fontWeight: 700, color: '#6366f1' }}>📚 {c.info.study_hours}h</span>
                        {c.info.study_tracks?.length > 0 && (
                          <div style={{ fontSize: '.48rem', opacity: .85, marginTop: 1 }}>
                            {c.info.study_tracks.join(' · ')}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <button className="modal-close" onClick={() => setModal(null)}>×</button>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 16 }}>📅 {modal}</h3>

            {!modalData ? (
              <p style={{ color: 'var(--neu-text-secondary)' }}>Loading...</p>
            ) : (
              <>
                {modalData.mood && (
                  <div className="flex items-center gap-sm mb-md">
                    <span style={{ fontSize: '1.5rem' }}>{emojis[modalData.mood.energy_level] || ''}</span>
                    <span style={{ color: 'var(--neu-text-secondary)' }}>Energy: {modalData.mood.energy_level}/5</span>
                  </div>
                )}

                {modalData.blocks.length > 0 && (
                  <>
                    <div className="card-header" style={{ marginTop: 12 }}>Hourly Plan</div>
                    <table><thead><tr><th>Hour</th><th>Task</th><th>Category</th><th>Done</th></tr></thead><tbody>
                      {modalData.blocks.filter(b => b.task_title).map(b => (
                        <tr key={b.id}>
                          <td>{String(b.hour).padStart(2, '0')}:00</td>
                          <td>{b.task_title}</td>
                          <td><span className="pill pill-routine">{b.category}</span></td>
                          <td>{b.is_done ? '✅' : '⬜'}</td>
                        </tr>
                      ))}
                    </tbody></table>
                  </>
                )}

                {modalData.sessions.length > 0 && (
                  <>
                    <div className="card-header" style={{ marginTop: 20 }}>Study Sessions</div>
                    <table><thead><tr><th>Time</th><th>Track</th><th>Topic</th><th>Hours</th></tr></thead><tbody>
                      {modalData.sessions.map(s => (
                        <tr key={s.id}>
                          <td>{s.start_time} – {s.end_time}</td>
                          <td><span className="pill pill-routine">{s.track}</span></td>
                          <td>{s.topic}</td>
                          <td>{s.hours}h</td>
                        </tr>
                      ))}
                    </tbody></table>
                  </>
                )}

                {(() => {
                  const dsaDay = getDailyStats(modal)
                  if (dsaDay.count === 0) return null
                  return (
                    <>
                      <div className="card-header" style={{ marginTop: 20 }}>DSA Problems Solved — {dsaDay.count}</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {dsaDay.problems.map((title, i) => (
                          <span key={i} style={{
                            background: 'rgba(34,197,94,0.1)', color: '#22c55e',
                            padding: '4px 10px', borderRadius: 999,
                            fontSize: '.72rem', fontWeight: 600, fontFamily: 'monospace',
                          }}>
                            ✓ {title}
                          </span>
                        ))}
                      </div>
                    </>
                  )
                })()}

                {modalData.tasks.length > 0 && (
                  <>
                    <div className="card-header" style={{ marginTop: 20 }}>Prep Tasks</div>
                    {modalData.tasks.map(t => (
                      <div key={t.id} className="flex items-center gap-sm" style={{ padding: '6px 0', borderBottom: '1px solid rgba(163,177,198,0.25)' }}>
                        <span>{t.is_done ? '✅' : '⬜'}</span>
                        <span><strong>{t.track}</strong>: {t.task_text}</span>
                      </div>
                    ))}
                  </>
                )}

                {modalData.note && (modalData.note.full_notes || modalData.note.key_learnings) && (
                  <>
                    <div className="card-header" style={{ marginTop: 20 }}>Notes</div>
                    {modalData.note.full_notes && (
                      <div style={{ background: 'var(--neu-bg)', padding: 12, borderRadius: 8, fontSize: '.85rem', whiteSpace: 'pre-wrap', marginBottom: 8 }}>
                        {modalData.note.full_notes}
                      </div>
                    )}
                    {modalData.note.key_learnings && (
                      <>
                        <div className="card-header" style={{ fontSize: '.85rem' }}>Key Learnings</div>
                        <div style={{ background: 'var(--neu-bg)', padding: 12, borderRadius: 8, fontSize: '.85rem', whiteSpace: 'pre-wrap' }}>
                          {modalData.note.key_learnings}
                        </div>
                      </>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
