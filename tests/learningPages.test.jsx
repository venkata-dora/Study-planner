import assert from 'node:assert/strict'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import App from '../src/App'
import LearningHome from '../src/pages/LearningHome'
import Stats from '../src/pages/Stats'

globalThis.localStorage = { getItem: () => null, setItem: () => {} }
const render = Component => renderToStaticMarkup(<MemoryRouter><Component /></MemoryRouter>)
const home = render(LearningHome)
assert.ok(home.includes('Follow your curiosity.'))
for (const route of ['/dsa', '/python', '/genai', '/systemdesign', '/ai-interview', '/practice', '/blogs']) assert.ok(home.includes(`href="${route}"`))
const shell = render(App)
for (const route of ['/planner', '/week', '/routine', '/study', '/prep']) assert.ok(!shell.includes(`href="${route}"`))
assert.ok(shell.includes('Skip to content'))
assert.ok(shell.includes('Reading library'))
assert.ok(home.includes('Psychology'))
assert.ok(home.includes('World history'))
assert.ok(!shell.includes('href="/dsa"'))
const stats = render(Stats)
assert.ok(stats.includes('Learning stats'))
assert.ok(stats.includes('Make a little progress today.'))
assert.ok(stats.includes('aria-label="Activity period"'))
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

const { default: CustomRoadmaps } = require('../src/pages/CustomRoadmaps')
const { renderMarkdown } = require('../src/pages/TopicBlog')
const studio = renderToStaticMarkup(<MemoryRouter><CustomRoadmaps /></MemoryRouter>)
assert.ok(studio.includes('Subject or concept'))
assert.ok(studio.includes('Starting level'))
const safeArticle = renderToStaticMarkup(<article>{renderMarkdown('<img src=x onerror=alert(1)>\n\n**A useful lesson**')}</article>)
assert.ok(!safeArticle.includes('<img'))
assert.ok(safeArticle.includes('&lt;img'))
assert.ok(safeArticle.includes('<strong'))
console.log('Custom roadmap form and safe lesson rendering checks passed')

const { default: StylePicker, isLearningStyle } = require('../src/components/StylePicker')
assert.ok(isLearningStyle('reading-room'))
assert.ok(isLearningStyle('focus'))
assert.ok(isLearningStyle('paper'))
assert.ok(!isLearningStyle('unknown'))
const picker = renderToStaticMarkup(<StylePicker initialStyle="reading-room" onSave={() => {}} onDismiss={() => {}} />)
assert.ok(picker.includes('Choose your learning space.'))
assert.ok(picker.includes('Use Reading Room'))
assert.equal((picker.match(/type="radio"/g) || []).length, 4)
console.log('Learning style picker checks passed')

const { default: JourneyMap } = require('../src/components/JourneyMap')
assert.ok(isLearningStyle('studio'))
const journey = renderToStaticMarkup(<MemoryRouter><JourneyMap title="Creative writing" stages={Array.from({ length: 6 }, (_, i) => ({ id: `s${i}`, title: `Writing chapter ${i + 1}`, done: i < 4 ? 1 : 0, total: 1, items: [{ id: `t${i}`, title: 'Read an example', to: `/writing/${i}` }] }))} /></MemoryRouter>)
assert.ok(journey.includes('Writing chapter 5'), 'Open the group containing the next unfinished chapter')
assert.ok(!journey.includes('Writing chapter 1'), 'Long paths should show a bounded group of milestones')
assert.ok(journey.includes('href="/writing/4"'), 'Chapter previews link to their real lessons')
assert.equal(renderToStaticMarkup(<JourneyMap title="Empty" stages={[]} />), '')
console.log('Universal journey initial selection and pagination checks passed')

const { default: ReadingWorkspace } = require('../src/pages/ReadingWorkspace')
const { readerPath } = require('../src/utils/readerPaths')

const genaiReaderData = require('../src/data/genAIData')
const firstChapter = genaiReaderData.SECTIONS[0]
const firstTopic = genaiReaderData.itemTopic(firstChapter.subsections[0].items[0])
const readerMarkup = renderToStaticMarkup(<MemoryRouter initialEntries={[readerPath(firstChapter.id, firstTopic)]}><Routes><Route path="/read/:sectionId" element={<ReadingWorkspace />} /></Routes></MemoryRouter>)
assert.ok(readerMarkup.includes('aria-label="Chapters and lessons"'))
assert.ok(readerMarkup.includes('aria-current="page"'))
assert.ok(readerMarkup.includes('Next lesson'))
assert.ok(!readerMarkup.includes('aria-modal="true"'))
assert.ok(!readerMarkup.includes('modal-backdrop'))
assert.ok(readerPath('chapter', 'Art & design?').includes('topic=Art+%26+design%3F'))
console.log('Reading workspace navigation and nonmodal rendering checks passed')
