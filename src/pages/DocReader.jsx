import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { DOCS } from './InterviewPrep'

/* ═══════════════════════════════════════════════
   Inline formatter
═══════════════════════════════════════════════ */
function inlineFormat(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:var(--neu-text-primary)">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code style="font-family:\'JetBrains Mono\',monospace;font-size:.8em;background:rgba(41,121,255,0.1);padding:2px 7px;border-radius:5px;color:var(--neu-accent);font-weight:600">$1</code>')
}

/* ═══════════════════════════════════════════════
   Render markdown body (no h1/h2/h3/h4 — those
   are handled by the card structure)
═══════════════════════════════════════════════ */
function renderBody(text) {
  if (!text) return null
  const lines = text.split('\n')
  const elements = []
  let key = 0, i = 0
  const nextKey = () => key++

  while (i < lines.length) {
    const line = lines[i]

    // HR — skip (we use card boundaries instead)
    if (/^---+$/.test(line.trim())) { i++; continue }

    // Fenced code block
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim()
      const codeLines = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) { codeLines.push(lines[i]); i++ }
      i++
      elements.push(
        <div key={nextKey()} style={{ margin: '14px 0' }}>
          {lang && <div style={{ fontSize: '.63rem', fontFamily: 'monospace', fontWeight: 700, color: 'var(--neu-accent)', background: 'var(--neu-accent-soft)', padding: '3px 10px', borderRadius: '10px 10px 0 0', display: 'inline-block', letterSpacing: '.05em', textTransform: 'uppercase' }}>{lang}</div>}
          <pre style={{
            background: 'var(--neu-bg)',
            boxShadow: 'inset 3px 3px 6px var(--neu-shadow-dark), inset -3px -3px 6px var(--neu-shadow-light)',
            borderRadius: lang ? '0 10px 10px 10px' : 10,
            padding: '14px 16px', overflowX: 'auto',
            fontSize: '.74rem', lineHeight: 1.6,
            fontFamily: '"JetBrains Mono", "Fira Code", monospace',
            color: 'var(--neu-text-primary)', margin: 0, whiteSpace: 'pre',
          }}>{codeLines.join('\n')}</pre>
        </div>
      )
      continue
    }

    // Table
    if (line.startsWith('|') && i + 1 < lines.length && lines[i + 1].match(/^\|[\s|:-]+\|/)) {
      const headers = line.split('|').filter((_, ci) => ci > 0 && ci < line.split('|').length - 1).map(h => h.trim())
      i += 2
      const rows = []
      while (i < lines.length && lines[i].startsWith('|')) {
        rows.push(lines[i].split('|').filter((_, ci) => ci > 0 && ci < lines[i].split('|').length - 1).map(c => c.trim()))
        i++
      }
      elements.push(
        <div key={nextKey()} style={{ overflowX: 'auto', margin: '14px 0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: 'var(--neu-bg)', borderRadius: 10, overflow: 'hidden', boxShadow: '3px 3px 6px var(--neu-shadow-dark), -3px -3px 6px var(--neu-shadow-light)' }}>
            <thead><tr>{headers.map((h, ci) => <th key={ci} style={{ padding: '8px 12px', textAlign: 'left', fontSize: '.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--neu-accent)', background: 'var(--neu-accent-soft)', borderBottom: '2px solid rgba(41,121,255,0.2)' }} dangerouslySetInnerHTML={{ __html: inlineFormat(h) }} />)}</tr></thead>
            <tbody>{rows.map((row, ri) => <tr key={ri} style={{ borderBottom: '1px solid rgba(163,177,198,0.12)' }}>{row.map((cell, ci) => <td key={ci} style={{ padding: '7px 12px', fontSize: '.8rem', color: ci === 0 ? 'var(--neu-text-primary)' : 'var(--neu-text-secondary)', fontWeight: ci === 0 ? 600 : 400 }} dangerouslySetInnerHTML={{ __html: inlineFormat(cell) }} />)}</tr>)}</tbody>
          </table>
        </div>
      )
      continue
    }

    // Blockquote
    if (line.startsWith('> ')) {
      const quoteLines = []
      while (i < lines.length && lines[i].startsWith('> ')) { quoteLines.push(lines[i].slice(2)); i++ }
      const isInterview = quoteLines.some(l => l.toLowerCase().includes('interview') || l.toLowerCase().includes('tip'))
      elements.push(
        <div key={nextKey()} style={{
          background: isInterview ? 'rgba(217,119,6,0.08)' : 'var(--neu-accent-soft)',
          borderLeft: `3px solid ${isInterview ? '#d97706' : 'var(--neu-accent)'}`,
          borderRadius: '0 10px 10px 0', padding: '10px 14px', margin: '12px 0',
        }}>
          {quoteLines.map((ql, qi) => <p key={qi} style={{ margin: qi < quoteLines.length - 1 ? '0 0 4px' : 0, fontSize: '.84rem', lineHeight: 1.7, color: isInterview ? '#d97706' : 'var(--neu-accent)' }} dangerouslySetInnerHTML={{ __html: inlineFormat(ql) }} />)}
        </div>
      )
      continue
    }

    // Bold label line (like **Answer:** or **Scenario:**)
    if (line.match(/^\*\*[^*]+:\*\*/) && !line.match(/^[-*] /)) {
      elements.push(
        <p key={nextKey()} style={{ fontSize: '.86rem', lineHeight: 1.8, color: 'var(--neu-text-primary)', margin: '10px 0 6px' }}
          dangerouslySetInnerHTML={{ __html: inlineFormat(line) }} />
      )
      i++; continue
    }

    // Ordered list
    if (line.match(/^\d+\. /)) {
      const listItems = []
      while (i < lines.length && lines[i].match(/^\d+\. /)) { listItems.push(lines[i].replace(/^\d+\. /, '')); i++ }
      elements.push(
        <ol key={nextKey()} style={{ paddingLeft: 0, margin: '6px 0 14px', listStyle: 'none' }}>
          {listItems.map((item, li) => <li key={li} style={{ display: 'flex', gap: 10, marginBottom: 8, alignItems: 'flex-start' }}><span style={{ flexShrink: 0, width: 22, height: 22, borderRadius: '50%', background: 'var(--neu-accent)', color: '#fff', fontSize: '.68rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2, boxShadow: '0 2px 4px rgba(41,121,255,0.3)' }}>{li + 1}</span><span style={{ fontSize: '.86rem', lineHeight: 1.7, color: 'var(--neu-text-primary)', paddingTop: 1 }} dangerouslySetInnerHTML={{ __html: inlineFormat(item) }} /></li>)}
        </ol>
      )
      continue
    }

    // Unordered list
    if (line.match(/^[-*] /)) {
      const listItems = []
      while (i < lines.length && lines[i].match(/^[-*] /)) { listItems.push(lines[i].replace(/^[-*] /, '')); i++ }
      elements.push(
        <ul key={nextKey()} style={{ paddingLeft: 0, margin: '6px 0 14px', listStyle: 'none' }}>
          {listItems.map((item, li) => <li key={li} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'flex-start' }}><span style={{ flexShrink: 0, width: 5, height: 5, borderRadius: '50%', background: 'var(--neu-accent)', marginTop: 8 }} /><span style={{ fontSize: '.86rem', lineHeight: 1.7, color: 'var(--neu-text-primary)' }} dangerouslySetInnerHTML={{ __html: inlineFormat(item) }} /></li>)}
        </ul>
      )
      continue
    }

    // Empty line
    if (line.trim() === '') { elements.push(<div key={nextKey()} style={{ height: 6 }} />); i++; continue }

    // Paragraph — quoted speech gets subtle styling
    const isQuotedSpeech = line.trim().startsWith('"')
    elements.push(
      <p key={nextKey()} style={{
        fontSize: '.86rem', lineHeight: 1.8,
        color: 'var(--neu-text-primary)', margin: '0 0 8px',
        ...(isQuotedSpeech ? {
          background: 'rgba(124,58,237,0.04)',
          borderLeft: '3px solid rgba(124,58,237,0.25)',
          padding: '8px 12px', borderRadius: '0 8px 8px 0',
          fontStyle: 'italic',
        } : {}),
      }}
        dangerouslySetInnerHTML={{ __html: inlineFormat(line) }} />
    )
    i++
  }

  return elements
}

/* ═══════════════════════════════════════════════
   Parse markdown into structured sections & cards

   Structure:
   - preamble: lines before the first ## heading
   - sections[]: each has { title, cards[] }
   - cards[]: each has { title, level (3|4), body }
═══════════════════════════════════════════════ */
function parseDocument(text) {
  if (!text) return { preamble: '', sections: [] }

  const lines = text.split('\n')
  const sections = []
  let preambleLines = []
  let currentSection = null
  let currentCard = null
  let i = 0

  const flushCard = () => {
    if (currentCard && currentSection) {
      currentCard.body = currentCard.bodyLines.join('\n').trim()
      delete currentCard.bodyLines
      currentSection.cards.push(currentCard)
      currentCard = null
    }
  }

  const flushSection = () => {
    flushCard()
    if (currentSection) {
      sections.push(currentSection)
      currentSection = null
    }
  }

  while (i < lines.length) {
    const line = lines[i]

    // H1 — just add to preamble
    if (line.startsWith('# ') && !line.startsWith('## ')) {
      if (!currentSection) preambleLines.push(line)
      else {
        if (currentCard) currentCard.bodyLines.push(line)
      }
      i++; continue
    }

    // H2 — new section
    if (line.startsWith('## ')) {
      flushSection()
      currentSection = { title: line.slice(3), cards: [] }
      i++; continue
    }

    // H3 — new card
    if (line.startsWith('### ')) {
      flushCard()
      currentCard = { title: line.slice(4), level: 3, bodyLines: [] }
      i++; continue
    }

    // H4 — new sub-card
    if (line.startsWith('#### ')) {
      flushCard()
      currentCard = { title: line.slice(5), level: 4, bodyLines: [] }
      i++; continue
    }

    // Regular line
    if (currentCard) {
      currentCard.bodyLines.push(line)
    } else if (currentSection) {
      // Lines between section header and first card — add as a standalone card
      if (line.trim() && !(/^---+$/.test(line.trim()))) {
        currentCard = { title: '', level: 0, bodyLines: [line] }
      }
    } else {
      preambleLines.push(line)
    }
    i++
  }

  flushSection()

  // Clean up: merge empty-title cards into the section's intro
  sections.forEach(sec => {
    sec.cards = sec.cards.filter(c => c.title || c.body.trim())
  })

  return { preamble: preambleLines.join('\n').trim(), sections }
}

/* ═══════════════════════════════════════════════
   Expandable Card component
═══════════════════════════════════════════════ */
function QuestionCard({ card, isOpen, onToggle, color, index }) {
  if (!card.title && !card.body) return null

  // Card with no title = section intro text, always visible
  if (!card.title) {
    return (
      <div style={{ marginBottom: 12, padding: '0 4px' }}>
        {renderBody(card.body)}
      </div>
    )
  }

  return (
    <div style={{
      marginBottom: 10,
      background: 'var(--neu-bg)',
      borderRadius: 14,
      boxShadow: isOpen
        ? '5px 5px 10px var(--neu-shadow-dark), -5px -5px 10px var(--neu-shadow-light)'
        : '3px 3px 6px var(--neu-shadow-dark), -3px -3px 6px var(--neu-shadow-light)',
      overflow: 'hidden',
      transition: 'box-shadow .2s',
    }}>
      {/* Header */}
      <div
        role="button" tabIndex={0} aria-expanded={isOpen}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle() } }}
        onClick={onToggle}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 16px',
          cursor: 'pointer',
          userSelect: 'none',
          transition: 'background .15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = `${color}08` }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
      >
        {/* Number badge for questions */}
        {card.title.match(/^Q?\d/) && (
          <span style={{
            flexShrink: 0, minWidth: 28, height: 28, borderRadius: '50%',
            background: `${color}15`, color: color,
            fontSize: '.72rem', fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {card.title.match(/Q?(\d+)/)?.[0] || (index + 1)}
          </span>
        )}

        {/* Title — black */}
        <span style={{
          flex: 1,
          fontWeight: 600,
          fontSize: card.level === 4 ? '.85rem' : '.9rem',
          color: 'var(--neu-text-primary)',
          lineHeight: 1.35,
        }}>
          {/* Strip "Q1: " prefix if we already show the number badge */}
          {card.title.match(/^Q?\d/) ? card.title.replace(/^Q?\d+[:.]?\s*/, '') : card.title}
        </span>

        {/* Chevron */}
        <span style={{
          flexShrink: 0, fontSize: '.8rem', color: 'var(--neu-text-secondary)',
          transition: 'transform .2s',
          transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
        }}>
          ▾
        </span>
      </div>

      {/* Body */}
      {isOpen && (
        <div style={{
          padding: '4px 16px 16px',
          borderTop: '1px solid rgba(163,177,198,0.12)',
        }}>
          {renderBody(card.body)}
        </div>
      )}
    </div>
  )
}


/* ═══════════════════════════════════════════════
   DocReader — structured card-based reader
═══════════════════════════════════════════════ */
export default function DocReader() {
  const { docId } = useParams()
  const navigate = useNavigate()
  const doc = DOCS.find(d => d.id === docId)
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [scrollPct, setScrollPct] = useState(0)
  const [collapsed, setCollapsed] = useState(new Set()) // stores IDs of collapsed cards
  const bodyRef = useRef(null)

  useEffect(() => {
    if (!doc) return
    setLoading(true)
    setCollapsed(new Set()) // all expanded by default
    fetch(doc.file)
      .then(r => r.text())
      .then(text => { setContent(text); setLoading(false) })
      .catch(() => setLoading(false))
  }, [docId]) // eslint-disable-line

  // Scroll progress
  useEffect(() => {
    const el = bodyRef.current
    if (!el) return
    const onScroll = () => {
      const pct = el.scrollTop / (el.scrollHeight - el.clientHeight) * 100
      setScrollPct(Math.min(100, Math.max(0, pct)))
    }
    el.addEventListener('scroll', onScroll)
    return () => el.removeEventListener('scroll', onScroll)
  }, [content])

  const parsed = useMemo(() => parseDocument(content), [content])

  if (!doc) {
    return (
      <div style={{ textAlign: 'center', paddingTop: 80 }}>
        <div style={{ fontSize: '3rem', marginBottom: 16 }}>🤔</div>
        <div style={{ color: 'var(--neu-text-secondary)', marginBottom: 24 }}>Document not found.</div>
        <button className="btn btn-primary" onClick={() => navigate('/interview')}>← Back</button>
      </div>
    )
  }

  const toggleCard = (cardId) => {
    setCollapsed(prev => {
      const next = new Set(prev)
      next.has(cardId) ? next.delete(cardId) : next.add(cardId)
      return next
    })
  }

  const expandAll = () => setCollapsed(new Set())
  const collapseAll = () => {
    const all = new Set()
    parsed.sections.forEach((sec, si) => {
      sec.cards.forEach((_, ci) => { all.add(`${si}-${ci}`) })
    })
    setCollapsed(all)
  }

  // Total card count
  const totalCards = parsed.sections.reduce((sum, sec) => sum + sec.cards.filter(c => c.title).length, 0)

  return (
    <div className="reference-reader" style={{ maxWidth: 1060, margin: '0 auto', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)' }}>

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/interview')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          ← Back
        </button>

        {DOCS.filter(d => d.id !== docId).map(d => (
          <button
            key={d.id}
            className="btn btn-secondary btn-sm"
            onClick={() => navigate(`/interview/${d.id}`)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '.72rem' }}
          >
            {d.icon} {d.title}
          </button>
        ))}

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={expandAll}>Expand All</button>
          <button className="btn btn-secondary btn-sm" onClick={collapseAll}>Collapse All</button>
        </div>
      </div>

      {/* Reading progress bar */}
      <div style={{
        height: 3, borderRadius: 999, background: 'var(--neu-bg)', marginBottom: 12,
        boxShadow: 'inset 2px 2px 3px var(--neu-shadow-dark), inset -2px -2px 3px var(--neu-shadow-light)',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', width: `${scrollPct}%`,
          background: `linear-gradient(90deg, ${doc.color}90, ${doc.color})`,
          borderRadius: 999, transition: 'width .1s',
        }} />
      </div>

      {/* Header card */}
      <div className="reference-heading" style={{
        background: 'var(--neu-bg)', borderRadius: 20, padding: '18px 24px', marginBottom: 14,
        boxShadow: '6px 6px 12px var(--neu-shadow-dark), -6px -6px 12px var(--neu-shadow-light)',
        borderLeft: `4px solid ${doc.color}`,
        display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0,
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem',
          background: doc.bg, boxShadow: `0 0 0 2px ${doc.color}33`,
        }}>{doc.icon}</div>
        <div>
          <h1 style={{ fontWeight: 500, fontSize: '1.8rem', margin: 0, color: 'var(--neu-text-primary)' }}>{doc.title}</h1>
          <div style={{ fontSize: '.75rem', color: 'var(--neu-text-secondary)', fontFamily: 'monospace', marginTop: 2 }}>
            {totalCards} questions/topics · {parsed.sections.length} sections · {Math.round(scrollPct)}% read
          </div>
        </div>
      </div>

      {/* Content body */}
      <div
        className="reference-reader-body"
        ref={bodyRef}
        style={{
          flex: 1, overflowY: 'auto',
          padding: '4px 2px',
        }}
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--neu-text-secondary)' }}>Loading document…</div>
        ) : (
          <>
            {/* Sections */}
            {parsed.sections.map((sec, si) => (
              <div key={si} style={{ marginBottom: 24 }}>
                {/* Section header */}
                <div className="reference-section-heading" style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 16px', marginBottom: 12,
                  background: 'var(--neu-bg)', borderRadius: 14,
                  boxShadow: '4px 4px 8px var(--neu-shadow-dark), -4px -4px 8px var(--neu-shadow-light)',
                  borderLeft: `4px solid ${doc.color}`,
                }}>
                  <span style={{
                    fontWeight: 700, fontSize: '.95rem', color: doc.color,
                  }}>
                    {sec.title}
                  </span>
                  <span style={{
                    marginLeft: 'auto', fontSize: '.7rem', fontFamily: 'monospace',
                    color: 'var(--neu-text-secondary)',
                  }}>
                    {sec.cards.filter(c => c.title).length} items
                  </span>
                </div>

                {/* Cards */}
                {sec.cards.map((card, ci) => {
                  const cardId = `${si}-${ci}`
                  return (
                    <QuestionCard
                      key={cardId}
                      card={card}
                      isOpen={!collapsed.has(cardId)}
                      onToggle={() => toggleCard(cardId)}
                      color={doc.color}
                      index={ci}
                    />
                  )
                })}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
