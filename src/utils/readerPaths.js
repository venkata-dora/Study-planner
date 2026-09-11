export function readerPath(sectionId, topicName) {
  const params = new URLSearchParams()
  if (topicName) params.set('topic', topicName)
  return `/read/${encodeURIComponent(sectionId)}${params.size ? `?${params}` : ''}`
}
