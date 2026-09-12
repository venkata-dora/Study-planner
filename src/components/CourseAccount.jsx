import { useEffect, useState } from 'react'
import { accountApi, djangoCourses } from '../lib/courseApi'

export default function CourseAccount({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(djangoCourses)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    if (!djangoCourses) return
    accountApi('/session').then(data => setUser(data.user)).catch(e => setError(e.message)).finally(() => setLoading(false))
  }, [])
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('')
    const fields = new FormData(event.currentTarget)
    try {
      await accountApi('/session')
      const data = await accountApi('/login', { method: 'POST', body: JSON.stringify({ username: fields.get('username'), password: fields.get('password') }) })
      setUser({ username: data.username })
    } catch (e) { setError(e.message) }
    finally { setBusy(false) }
  }
  if (!djangoCourses) return children
  if (loading) return <p role="status">Loading your account…</p>
  if (!user) return <section className="course-account"><span className="learning-eyebrow">YOUR LEARNING PATHS</span><h1>Sign in to your learning space</h1><p>Your courses and progress are saved to your account.</p><form onSubmit={submit}><label>Username<input name="username" autoComplete="username" required maxLength={150} /></label><label>Password<input name="password" type="password" autoComplete="current-password" required /></label>{error && <p role="alert">{error}</p>}<button className="btn btn-primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button></form></section>
  return <><div className="course-account-bar"><span>{user.username}</span><button className="btn" onClick={async () => { try { await accountApi('/logout', { method: 'POST' }); setUser(null) } catch (e) { setError(e.message) } }}>Sign out</button></div>{error && <p role="alert">{error}</p>}{children}</>
}
