const paths = {
  menu: 'M4 6h16 M4 12h16 M4 18h16',
  library: 'M4 5h6v15H4z M14 5h6v15h-6z M7 8v4 M17 8v4',
  dsa: 'M5 5h4v4H5z M15 15h4v4h-4z M5 15h4v4H5z M7 9v6 M9 7h8v8',
  python: 'M8 7 3 12l5 5 M16 7l5 5-5 5 M14 4l-4 16',
  genai: 'M12 3v4 M12 17v4 M3 12h4 M17 12h4 M6 6l3 3 M15 15l3 3 M6 18l3-3 M15 9l3-3 M12 8l4 4-4 4-4-4z',
  systemdesign: 'M8 3h8v5H8z M3 16h6v5H3z M15 16h6v5h-6z M12 8v4 M6 16v-4h12v4',
  blogs: 'M4 4h6c1 0 2 1 2 2v15c0-2-2-3-4-3H4z M20 4h-6c-1 0-2 1-2 2 M20 4v14h-4c-2 0-4 1-4 3',
  interview: 'M5 4h14v12h-8l-5 4v-4H5z M8 8h8 M8 12h5',
  practice: 'M9 4v16l11-8z',
  stats: 'M5 20v-6 M12 20V9 M19 20V4',
  sun: 'M12 2v2 M12 20v2 M2 12h2 M20 12h2 M5 5l1 1 M18 18l1 1 M5 19l1-1 M18 6l1-1 M16 12a4 4 0 1 1-8 0 4 4 0 1 1 8 0',
  moon: 'M20 15A9 9 0 0 1 9 3a9 9 0 1 0 11 12',
  arrow: 'M5 12h14 M14 7l5 5-5 5',
  chevron: 'm9 5 7 7-7 7',
}
export default function LearningIcon({ name = 'library', size = 20 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name] || paths.library} /></svg>
}
