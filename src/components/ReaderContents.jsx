import { useEffect, useState } from 'react'

export default function ReaderContents({ lessonKey }) {
  const [headings, setHeadings] = useState([])
  useEffect(() => {
    const article = document.querySelector('.reader-main')
    if (!article) return
    const update = () => {
      const items = [...article.querySelectorAll('.study-reading h2')].map((heading, index) => {
        heading.id = `lesson-section-${index}`
        return { id: heading.id, title: heading.textContent }
      })
      setHeadings(items)
    }
    update()
    const observer = new MutationObserver(update)
    observer.observe(article, { childList: true, subtree: true, characterData: true })
    return () => observer.disconnect()
  }, [lessonKey])
  if (headings.length < 2) return null
  return <nav className="reader-contents" aria-label="On this page"><span>On this page</span>{headings.map(heading => <a key={heading.id} href={`#${heading.id}`}>{heading.title}</a>)}</nav>
}
