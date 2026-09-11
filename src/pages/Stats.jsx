import { Link } from 'react-router-dom'
import LearningIcon from '../components/LearningIcon'
import useLearningProgress from '../utils/useLearningProgress'

export default function Stats() {
  const { tracks, activity } = useLearningProgress()
  const done = tracks.reduce((n, t) => n + t.done, 0)
  const started = tracks.reduce((n, t) => n + t.started, 0)
  const max = Math.max(1, ...activity.days.map(d => d.count))
  return <div className="learning-overview">
    <div className="learning-heading"><span className="learning-eyebrow">YOUR PROGRESS</span><h1>Learning stats</h1><p>Completion across your roadmaps and recent coding activity.</p></div>
    <div className="learning-metrics">{[[done, 'Items completed'], [started, 'In progress'], [activity.today, 'Problems solved today'], [activity.streak, 'Day coding streak']].map(([value, label]) => <div key={label}><strong>{value}</strong><span>{label}</span></div>)}</div>
    <div className="learning-section-title"><h2>Progress by roadmap</h2></div>
    <div className="learning-tracks">{tracks.map(t => <Link key={t.to} to={t.to} className="learning-track"><div className="learning-track-copy"><h3>{t.title}</h3><p>{t.done} completed · {t.started} in progress · {t.total - t.done - t.started} remaining</p></div><div className="learning-track-progress"><span>{Math.round(t.done / (t.total || 1) * 100)}% of {t.total} {t.unit}</span><progress value={t.done} max={t.total} aria-label={`${t.title} completion`} /></div><LearningIcon name="chevron" size={15} /></Link>)}</div>
    {!done && !started && <p className="learning-note">Start any roadmap and mark your progress. Your totals will appear here automatically.</p>}
    <div className="learning-section-title"><h2>Coding activity</h2><span>Last 14 days</span></div>
    <p className="learning-note">DSA and Python solve records. Repeat solves count once per problem per day. Your streak stays active if you solved yesterday.</p>
    <div className="learning-activity">{activity.days.map(d => <div key={d.date} className="learning-day" title={`${d.date}: ${d.count} problems`}><span>{d.count}</span><div className="learning-bar-slot"><div style={{ height: `${Math.max(2, d.count / max * 100)}%` }} /></div><small>{d.date.slice(5)}</small></div>)}</div>
    <p className="learning-note">Roadmap and Python progress is saved in this browser. DSA also uses your saved database progress when available.</p>
  </div>
}
