export default function LearningLessonHeader({ section, done, total, unit = 'topics', onRead, children }) {
  const percent = Math.round(done / (total || 1) * 100)
  return <header className="study-lesson-header">
    <div className="apple-page-heading"><div><span className="learning-eyebrow">{section.subsections.length} SECTIONS · {total} {unit.toUpperCase()}</span><h1>{section.title.replace(/^\d+\s*·\s*/, '')}</h1></div>{onRead && <button className="btn btn-secondary" onClick={onRead}>Read topic guide</button>}</div>
    <div className="study-lesson-progress"><span>{done} of {total} {unit} completed</span><strong>{percent}%</strong></div>
    <progress value={done} max={total} aria-label={`${section.title} completion`} />
    {children}
  </header>
}
