import { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'

mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'strict', suppressErrorRendering: true })

export default function MermaidDiagram({ code }) {
  const ref = useRef(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    const target = ref.current
    const container = document.createElement('div')
    target.replaceChildren(container)
    setFailed(false)
    const id = `diagram-${crypto.randomUUID()}`
    mermaid.render(id, code, container).then(({ svg }) => {
      if (!cancelled) container.innerHTML = svg
    }).catch(() => {
      if (!cancelled) {
        container.replaceChildren()
        setFailed(true)
      }
    })
    return () => {
      cancelled = true
      container.remove()
    }
  }, [code])

  return <div style={{ margin: '16px 0', overflow: 'auto' }}>
    <div ref={ref} />
    {failed && <details>
      <summary>Diagram unavailable — view source</summary>
      <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{code}</pre>
    </details>}
  </div>
}
