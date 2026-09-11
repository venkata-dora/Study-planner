import { useEffect, useRef, useState } from 'react'

export const LEARNING_STYLES = [
  { id: 'studio', name: 'Studio', description: 'Warm paper, illustrated covers, and colorful learning journeys. A space for curious minds.' },
  { id: 'reading-room', name: 'Reading Room', description: 'Soft book covers, expressive titles, and deep green. A warm, editorial workspace.' },
  { id: 'paper', name: 'Paper', description: 'White pages, charcoal text, and minimal color. A simple, document-like workspace.' },
  { id: 'focus', name: 'Focus', description: 'Clean surfaces, simple typography, and a quieter palette for focused reading.' },
]
export const STYLE_KEY = 'learning_style_v1'
export function readLearningStyle() {
  try { return localStorage.getItem(STYLE_KEY) } catch { return null }
}
export const isLearningStyle = value => LEARNING_STYLES.some(style => style.id === value)

export default function StylePicker({ initialStyle, onSave, onDismiss }) {
  const [draft, setDraft] = useState(initialStyle)
  const dialog = useRef(null)
  useEffect(() => {
    const element = dialog.current
    const previousFocus = document.activeElement
    const overflow = document.body.style.overflow
    element.showModal()
    document.body.style.overflow = 'hidden'
    return () => { element.close(); document.body.style.overflow = overflow; previousFocus?.focus() }
  }, [])
  useEffect(() => { document.documentElement.dataset.learningStyle = draft }, [draft])
  const dismiss = () => { document.documentElement.dataset.learningStyle = initialStyle; onDismiss() }
  return <dialog ref={dialog} className="style-picker" aria-labelledby="style-picker-title" aria-describedby="style-picker-description" onCancel={e => { e.preventDefault(); dismiss() }}>
    <span className="learning-eyebrow">MAKE YOURSELF AT HOME</span><h2 id="style-picker-title">Choose your learning space.</h2><p id="style-picker-description">Same subjects, lessons, and progress. A look that feels right for you. Change it anytime using Appearance.</p>
    <fieldset className="style-options"><legend>Visual style</legend>{LEARNING_STYLES.map(style => <label key={style.id} className={`style-option${draft === style.id ? ' selected' : ''}`}><input type="radio" name="learning-style" value={style.id} checked={draft === style.id} onChange={() => setDraft(style.id)} /><span className={`style-preview style-preview-${style.id}`} aria-hidden="true"><span className="style-preview-heading">Follow your curiosity.</span><span className="style-preview-hero">What would you like to learn?</span><span className="style-preview-books"><span>Psychology</span><span>Astronomy</span><span>Writing</span></span></span><span className="style-option-title">{style.name}<span aria-hidden="true">{draft === style.id ? '✓' : ''}</span></span><span className="style-option-description">{style.description}</span></label>)}</fieldset>
    <div className="style-picker-footer"><span>Saved on this browser. Every style supports light and dark mode.</span><div><button type="button" className="style-dismiss" onClick={dismiss}>Keep current style</button><button type="button" className="style-save" onClick={() => onSave(draft)}>Use {LEARNING_STYLES.find(style => style.id === draft).name}</button></div></div>
  </dialog>
}
