import { useState, useEffect, useRef } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import LearningIcon from './components/LearningIcon'
import StylePicker, { STYLE_KEY, readLearningStyle, isLearningStyle } from './components/StylePicker'

const groups = [
  { label: 'Your learning', links: [['/', 'Discover', 'library'], ['/roadmaps', 'My learning paths', 'systemdesign'], ['/blogs', 'Reading library', 'blogs'], ['/stats', 'Learning progress', 'stats']] },
  { label: 'Tools', links: [['/practice', 'Interview practice', 'practice']] },
]
export default function App() {
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('dp_dark_mode') === '1')
  const [learningStyle, setLearningStyle] = useState(() => { const saved = readLearningStyle(); return isLearningStyle(saved) ? saved : 'reading-room' })
  const [stylePickerOpen, setStylePickerOpen] = useState(() => !isLearningStyle(readLearningStyle()))
  const saveStyle = value => {
    setLearningStyle(value)
    document.documentElement.dataset.learningStyle = value
    try { localStorage.setItem(STYLE_KEY, value) } catch { /* The style still applies for this session. */ }
    setStylePickerOpen(false)
  }
  useEffect(() => { document.documentElement.dataset.learningStyle = learningStyle }, [learningStyle])
  const { pathname } = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const sidebarRef = useRef(null)
  const menuRef = useRef(null)
  const closeMenu = () => { setMenuOpen(false); requestAnimationFrame(() => menuRef.current?.focus()) }
  const readerPage = pathname.startsWith('/read/')
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
  const pageName = ({ '/practice/history': 'Practice history', '/python/blog': 'Python lessons', '/interview': 'Interview preparation', '/notes': 'Learning notes' })[pathname] || (pathname.startsWith('/read/') ? 'Reading' : null) || (pathname.startsWith('/interview/') ? 'Interview reference' : [['/genai', 'Generative AI'], ['/systemdesign', 'System design'], ['/ai-interview', 'AI interview'], ['/dsa', 'DSA'], ['/python', 'Python']].find(([path]) => pathname === path || pathname.startsWith(path + '/'))?.[1]) || current?.[1] || 'Learning'
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light')
    localStorage.setItem('dp_dark_mode', darkMode ? '1' : '0')
  }, [darkMode])
  useEffect(() => { window.scrollTo(0, 0); setMenuOpen(false) }, [pathname])
  return <div className={`learning-platform apple-platform${menuOpen ? ' menu-open' : ''}${editorPage ? ' editor-page' : ''}${readerPage ? ' reader-mode' : ''}`}>
    <a className="skip-link" href="#learning-content">Skip to content</a>
    <aside ref={sidebarRef} id="study-navigation" className="apple-sidebar" role={menuOpen ? 'dialog' : undefined} aria-modal={menuOpen || undefined} aria-label="Learning navigation">
      <button className="apple-menu-close btn btn-secondary" onClick={closeMenu}>Close menu</button>
      <NavLink to="/" className="learning-brand"><span className="apple-brand-mark"><LearningIcon name="library" size={22} /></span><span>Learning Lab<small>Follow your curiosity.</small></span></NavLink>
      <nav className="apple-navigation" aria-label="Learning navigation">{groups.map(group => <div className="apple-nav-group" key={group.label}><span className="apple-nav-label">{group.label}</span>{group.links.map(([to, label, icon]) => <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `apple-nav-item${isActive ? ' active' : ''}`}><LearningIcon name={icon} /><span>{label}</span></NavLink>)}</div>)}</nav>
      <div className="apple-sidebar-footer"><span className="apple-profile">L</span><div>Your learning space<small>Progress at your pace</small></div></div>
    </aside>
    {menuOpen && <button className="apple-mobile-scrim" onClick={closeMenu} aria-label="Close navigation" tabIndex={-1} />}
    <div className="apple-workspace" inert={menuOpen ? true : undefined}>
      <header className="apple-toolbar"><button ref={menuRef} className="apple-menu-button" onClick={() => setMenuOpen(true)} title="Open main navigation" aria-label="Open navigation" aria-expanded={menuOpen} aria-controls="study-navigation"><LearningIcon name="menu" /></button>{readerPage ? <div className="reader-global-navigation"><NavLink to="/" className="reader-global-brand">Learning Lab</NavLink><nav aria-label="Platform navigation"><NavLink to="/">Discover</NavLink><NavLink to="/roadmaps">My paths</NavLink><NavLink to="/blogs">Library</NavLink></nav></div> : <div><span className="apple-toolbar-brand">Learning Lab <span aria-hidden="true">/</span> </span>{pageName}</div>}<div className="appearance-actions"><button className="appearance-button" onClick={() => setStylePickerOpen(true)}>Appearance</button><button className="apple-theme-button" onClick={() => setDarkMode(d => !d)} aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'} title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}><LearningIcon name={darkMode ? 'sun' : 'moon'} /></button></div></header>
      <main id="learning-content" className="main-content" tabIndex={-1}><Outlet /></main>
    </div>
    {stylePickerOpen && <StylePicker initialStyle={learningStyle} onSave={saveStyle} onDismiss={() => saveStyle(learningStyle)} />}
  </div>
}
