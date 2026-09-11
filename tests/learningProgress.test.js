import assert from 'node:assert/strict'
import { getLearningTracks, getCodingActivity, summarizeItems } from '../src/utils/learningProgress'
import * as genai from '../src/data/genAIData'
import * as system from '../src/data/systemDesignData'

const storage = new Map()
globalThis.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) }
const put = (key, value) => localStorage.setItem(key, JSON.stringify(value))
assert.deepEqual(summarizeItems([{ state: 1, to: '/a' }, { state: 2, to: '/b' }]), { total: 2, done: 1, started: 1, next: '/a' })
assert.ok(getLearningTracks().every(t => t.total > 0 && t.done === 0 && t.started === 0))
for (const data of [genai, system]) {
  const section = data.SECTIONS.find(s => s.subsections.some(sub => sub.items.length >= 3))
  const sub = section.subsections.find(sub => sub.items.length >= 3)
  put(data.STORAGE_KEY, { [data.itemId(section.id, sub.label, 0)]: 1, [data.itemId(section.id, sub.label, 1)]: 2, [data.itemId(section.id, sub.label, 2)]: true, obsolete: 2 })
}
for (const track of getLearningTracks().filter(t => ['/genai', '/systemdesign'].includes(t.to))) {
  assert.equal(track.done, 2, 'Only completed states and legacy true count; stale IDs do not')
  assert.equal(track.started, 1)
}
put('dp_dsa_progress_v1', { s0_t0_p0: '2', s0_t0_p1: 1, obsolete: 2 })
assert.equal(getLearningTracks()[0].done, 1)
put('dp_dsa_daily_v1', { '2026-09-10': ['a', 'a'], '2026-09-09': ['b'] })
put('dp_python_daily_v1', { '2026-09-10': ['a'] })
let activity = getCodingActivity(new Date(2026, 8, 11, 12))
assert.equal(activity.streak, 2, 'Yesterday keeps streak alive')
assert.equal(activity.today, 0)
assert.equal(activity.days.length, 14)
assert.equal(activity.days[12].count, 2, 'Deduplicate within track, not across tracks')
put('dp_python_daily_v1', { '2026-09-11': Array.from({length: 30}, (_, i) => `p${i}`) })
activity = getCodingActivity(new Date(2026, 8, 11, 12))
assert.equal(activity.today, 30, 'Reading history must not discard busy days')
assert.equal(activity.streak, 3)
console.log('Learning progress checks passed')

const { getCustomLearningTracks } = require('../src/utils/learningProgress')
const custom = getCustomLearningTracks([{ id: 'java', title: 'Java', description: 'Learn Java', stages: [{ topics: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] }], lessons: { a: { completed: true, blog: 'Saved' }, b: { completed: false, blog: 'Started' }, stale: { completed: true } } }])[0]
assert.equal(custom.done, 1)
assert.equal(custom.started, 1)
assert.equal(custom.total, 3)
assert.equal(custom.next, '/roadmaps/java?topic=b')
assert.equal(custom.icon, 'systemdesign')
assert.deepEqual(getCustomLearningTracks([]), [])
console.log('Custom roadmap statistics checks passed')
