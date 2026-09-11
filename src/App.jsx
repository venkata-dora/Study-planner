import { useState, useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import LearningIcon from './components/LearningIcon'

const groups = [
  { label: 'Workspace', links: [['/', 'Library', 'library'], ['/stats', 'Stats', 'stats']] },
  { label: 'Learn', links: [['/dsa', 'DSA', 'dsa'], ['/python', 'Python', 'python'], ['/genai', 'Gen AI', 'genai'], ['/systemdesign', 'System Design', 'systemdesign'], ['/ai-interview', 'AI Interview', 'interview']] },
  { label: 'Explore', links: [['/blogs', 'Blogs', 'blogs'], ['/practice', 'Practice', 'practice']] },
]
export default function App() {
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('dp_dark_mode') === '1')
  const { pathname } = useLocation()
  const current = groups.flatMap(g => g.links).find(([to]) => to === '/' ? pathname === '/' : pathname.startsWith(to))
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light')
    localStorage.setItem('dp_dark_mode', darkMode ? '1' : '0')
  }, [darkMode])
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return <div className="learning-platform apple-platform">
    <a className="skip-link" href="#learning-content">Skip to content</a>
    <aside className="apple-sidebar">
      <NavLink to="/" className="learning-brand"><span className="apple-brand-mark"><LearningIcon name="library" size={22} /></span><span>Learning Lab<small>A space to grow.</small></span></NavLink>
      <nav className="apple-navigation" aria-label="Learning navigation">{groups.map(group => <div className="apple-nav-group" key={group.label}><span className="apple-nav-label">{group.label}</span>{group.links.map(([to, label, icon]) => <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `apple-nav-item${isActive ? ' active' : ''}`}><LearningIcon name={icon} /><span>{label}</span></NavLink>)}</div>)}</nav>
      <div className="apple-sidebar-footer"><span className="apple-profile">L</span><div>Your learning space<small>Progress at your pace</small></div></div>
    </aside>
    <div className="apple-workspace">
      <header className="apple-toolbar"><div><span className="apple-toolbar-brand">Learning Lab <span aria-hidden="true">/</span> </span>{current?.[1] || 'Learning'}</div><button className="apple-theme-button" onClick={() => setDarkMode(d => !d)} aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'} title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}><LearningIcon name={darkMode ? 'sun' : 'moon'} /></button></header>
      <main id="learning-content" className="main-content" tabIndex={-1}><Outlet /></main>
    </div>
  </div>
}
