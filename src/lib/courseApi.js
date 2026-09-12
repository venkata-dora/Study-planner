export const djangoCourses = import.meta.env?.VITE_DJANGO_API === 'true'
let csrfToken = ''
export async function accountApi(path, options = {}) {
  const response = await fetch(`/api/v1${path}`, { credentials: 'same-origin', ...options, headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken, ...options.headers } })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || data.detail || 'Unable to complete this request. Please try again.')
  if (data.csrfToken) csrfToken = data.csrfToken
  return data
}
export async function courseApi(path, options) {
  if (djangoCourses) return accountApi(`/roadmaps${path}`, options)
  const response = await fetch(`/api/roadmaps${path}`, options)
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'Unable to reach your roadmaps. Please try again.')
  return data
}
