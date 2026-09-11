import { useState, useEffect, useRef } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import LearningIcon from './components/LearningIcon'

const groups = [
  { label: 'Workspace', links: [['/', 'Library', 'library'], ['/stats', 'Stats', 'stats'], ['/roadmaps', 'My roadmaps', 'systemdesign']] },
  { label: 'Learn', links: [['/dsa', 'DSA', 'dsa'], ['/python', 'Python', 'python'], ['/genai', 'Gen AI', 'genai'], ['/systemdesign', 'System Design', 'systemdesign'], ['/ai-interview', 'AI Interview', 'interview']] },
  { label: 'Explore', links: [['/blogs', 'Blogs', 'blogs'], ['/practice', 'Practice', 'practice']] },
]
export default function App() {
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('dp_dark_mode') === '1')
  const { pathname } = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const sidebarRef = useRef(null)
  const menuRef = useRef(null)
  const closeMenu = () => { setMenuOpen(false); requestAnimationFrame(() => menuRef.current?.focus()) }
  const editorPage = /^\/(dsa|python)\/\d+\/\d+\/\d+$/.test(pathname)
  useEffect(() => {
    if (!menuOpen) return
    const first = sidebarRef.current?.querySelector('a')
    first?.focus()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = e => {
      if (e.key === 'Escape') { e.preventDefault(); closeMenu() }
      if (e.key !== 'Tab') return
      const targets = [...sidebarRef.current.querySelectorAll('a, button')]
      const first = targets[0], last = targets[targets.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    const media = window.matchMedia('(min-width: 761px)')
    const onResize = () => { if (media.matches) setMenuOpen(false) }
    media.addEventListener('change', onResize)
    document.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener('keydown', onKey); media.removeEventListener('change', onResize) }
  }, [menuOpen])
  const current = groups.flatMap(g => g.links).find(([to]) => to === '/' ? pathname === '/' : pathname.startsWith(to))
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light')
    localStorage.setItem('dp_dark_mode', darkMode ? '1' : '0')
  }, [darkMode])
  useEffect(() => { window.scrollTo(0, 0); setMenuOpen(false) }, [pathname])
  return <div className={`learning-platform apple-platform${menuOpen ? ' menu-open' : ''}${editorPage ? ' editor-page' : ''}`}>
    <a className="skip-link" href="#learning-content">Skip to content</a>
    <aside ref={sidebarRef} id="study-navigation" className="apple-sidebar" role={menuOpen ? 'dialog' : undefined} aria-modal={menuOpen || undefined} aria-label="Learning navigation">
      <button className="apple-menu-close btn btn-secondary" onClick={closeMenu}>Close menu</button>
      <NavLink to="/" className="learning-brand"><span className="apple-brand-mark"><LearningIcon name="library" size={22} /></span><span>Learning Lab<small>Learn. Practice. Review.</small></span></NavLink>
      <nav className="apple-navigation" aria-label="Learning navigation">{groups.map(group => <div className="apple-nav-group" key={group.label}><span className="apple-nav-label">{group.label}</span>{group.links.map(([to, label, icon]) => <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `apple-nav-item${isActive ? ' active' : ''}`}><LearningIcon name={icon} /><span>{label}</span></NavLink>)}</div>)}</nav>
      <div className="apple-sidebar-footer"><span className="apple-profile">L</span><div>Your learning space<small>Progress at your pace</small></div></div>
    </aside>
    {menuOpen && <button className="apple-mobile-scrim" onClick={closeMenu} aria-label="Close navigation" tabIndex={-1} />}
    <div className="apple-workspace" inert={menuOpen ? true : undefined}>
      <header className="apple-toolbar"><button ref={menuRef} className="apple-menu-button" onClick={() => setMenuOpen(true)} aria-label="Open navigation" aria-expanded={menuOpen} aria-controls="study-navigation"><LearningIcon name="menu" /></button><div><span className="apple-toolbar-brand">Learning Lab <span aria-hidden="true">/</span> </span>{current?.[1] || 'Learning'}</div><button className="apple-theme-button" onClick={() => setDarkMode(d => !d)} aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'} title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}><LearningIcon name={darkMode ? 'sun' : 'moon'} /></button></header>
      <main id="learning-content" className="main-content" tabIndex={-1}><Outlet /></main>
    </div>
  </div>
}
