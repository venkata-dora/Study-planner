import assert from 'node:assert/strict'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import App from '../src/App'
import LearningHome from '../src/pages/LearningHome'
import Stats from '../src/pages/Stats'

globalThis.localStorage = { getItem: () => null, setItem: () => {} }
const render = Component => renderToStaticMarkup(<MemoryRouter><Component /></MemoryRouter>)
const home = render(LearningHome)
assert.ok(home.includes('Learning library'))
for (const route of ['/dsa', '/python', '/genai', '/systemdesign', '/ai-interview', '/practice', '/blogs']) assert.ok(home.includes(`href="${route}"`))
const shell = render(App)
for (const route of ['/planner', '/week', '/routine', '/study', '/prep']) assert.ok(!shell.includes(`href="${route}"`))
assert.ok(shell.includes('Skip to content'))
const stats = render(Stats)
assert.ok(stats.includes('Learning stats'))
assert.ok(stats.includes('Start any roadmap'))
assert.ok(!stats.includes('NaN'))
console.log('Learning page render checks passed')
