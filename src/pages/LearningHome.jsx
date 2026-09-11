import { Link } from 'react-router-dom'
import LearningIcon from '../components/LearningIcon'
import useLearningProgress from '../utils/useLearningProgress'

export default function LearningHome() {
  const { tracks } = useLearningProgress()
  const current = tracks.find(t => t.done + t.started > 0 && t.done < t.total)
  const completed = tracks.reduce((total, t) => total + t.done, 0)
  return <div className="learning-overview">
    <div className="apple-page-heading"><div><span className="learning-eyebrow">A LITTLE PROGRESS, EVERY DAY</span><h1>Learning library</h1><p>Your next chapter starts here.</p></div><Link to="/stats" className="apple-completion"><strong>{completed}</strong><span>items completed<LearningIcon name="chevron" size={12} /></span></Link></div>
    <Link to={current?.next || '/dsa'} className="apple-continue"><span className="apple-course-art" aria-hidden="true"><LearningIcon name={current ? current.to.slice(1) : 'dsa'} size={42} /></span><div><span className="learning-eyebrow">{current ? 'PICK UP WHERE YOU LEFT OFF' : 'A GOOD PLACE TO START'}</span><h2>{current?.title || 'Data structures & algorithms'}</h2><p>{current ? `${current.done} of ${current.total} ${current.unit} completed` : 'Build your foundations, one problem at a time.'}</p></div><span className="apple-continue-action">{current ? 'Continue' : 'Start learning'}<LearningIcon name="arrow" size={18} /></span></Link>
    <div className="learning-section-title"><h2>Your roadmaps <span className="apple-count">{tracks.length}</span></h2><span>Learn at your own pace</span></div>
    <div className="learning-tracks">{tracks.map(track => <Link className="learning-track" key={track.to} to={track.to}>
      <span className="apple-track-icon"><LearningIcon name={track.to === '/ai-interview' ? 'interview' : track.to.slice(1)} size={24} /></span><div className="learning-track-copy"><h3>{track.title}</h3><p>{track.description}</p></div>
      <div className="learning-track-progress"><span>{track.done} / {track.total} {track.unit}</span><progress value={track.done} max={track.total} aria-label={`${track.title} completion`} /></div><LearningIcon name="chevron" size={15} />
    </Link>)}</div>
    <div className="learning-section-title"><h2>Beyond the roadmap</h2></div>
    <div className="learning-resources">{[
      ['/dsa/practice', 'DSA practice', 'Turn understanding into problem-solving.', 'dsa'],
      ['/python/practice', 'Python practice', 'Build confidence through focused exercises.', 'python'],
      ['/practice', 'Interview practice', 'Find the words. Refine your answers.', 'interview'],
      ['/blogs', 'Reading library', 'Make room for a deeper understanding.', 'blogs'],
    ].map(([to, title, description, icon]) => <Link key={to} to={to}><LearningIcon name={icon} size={22} /><div><h3>{title}</h3><p>{description}</p></div><LearningIcon name="chevron" size={14} /></Link>)}</div>
  </div>
}
