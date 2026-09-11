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

// Course links must remain valid after replacing decorative cards with grouped rows.
const { default: GenAI } = require('../src/pages/GenAI')
const { default: SystemDesign } = require('../src/pages/SystemDesign')
const { default: AIInterview } = require('../src/pages/AIInterview')
for (const [Component, route] of [[GenAI, '/genai/'], [SystemDesign, '/systemdesign/'], [AIInterview, '/ai-interview/']]) {
  const html = render(Component)
  assert.ok(html.includes(`href="${route}`))
  assert.ok(html.includes('Course contents'))
  assert.ok(html.includes('aria-label='))
}
console.log('Roadmap navigation render checks passed')

const { Routes, Route } = require('react-router-dom')
const { default: GenAIDetail } = require('../src/pages/GenAIDetail')
const { default: SystemDesignDetail } = require('../src/pages/SystemDesignDetail')
const { default: AIInterviewDetail } = require('../src/pages/AIInterviewDetail')
const genai = require('../src/data/genAIData')
const system = require('../src/data/systemDesignData')
const interview = require('../src/data/aiInterviewData')
for (const [Component, data, route] of [[GenAIDetail, genai, '/genai'], [SystemDesignDetail, system, '/systemdesign'], [AIInterviewDetail, interview, '/ai-interview']]) {
  const section = data.SECTIONS[0]
  const firstSub = section.subsections[0]
  const progress = { [data.itemId(section.id, firstSub.label, 0)]: 1, [data.itemId(section.id, firstSub.label, 1)]: 2 }
  const saved = new Map()
  globalThis.localStorage = { getItem: key => saved.get(key) ?? null, setItem: (key, value) => saved.set(key, value) }
  data.saveChecks(progress)
  const html = renderToStaticMarkup(<MemoryRouter initialEntries={[`${route}/${section.id}`]}><Routes><Route path={`${route}/:sectionId`} element={<Component />} /></Routes></MemoryRouter>)
  assert.ok(html.includes('Browse other sections'))
  assert.ok(html.includes('aria-expanded="true"'))
  assert.ok(/<progress[^>]*value="1"/.test(html), `${route}: ${html.match(/<progress[^>]*>/)?.[0]}`)
}
console.log('Lesson render and completion checks passed')
