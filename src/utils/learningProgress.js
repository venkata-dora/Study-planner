import * as dsa from '../data/dsaData'
import * as python from '../data/pythonData'
import * as genai from '../data/genAIData'
import * as system from '../data/systemDesignData'
import * as interview from '../data/aiInterviewData'
import { getLocalDate } from './dateUtils'

export function summarizeItems(items) {
  return { total: items.length, done: items.filter(i => i.state === 2).length, started: items.filter(i => i.state === 1).length, next: items.find(i => i.state !== 2)?.to }
}

export function getLearningTracks() {
  const coding = (data, sections, route) => {
    const progress = data.loadProgress()
    return summarizeItems(sections.flatMap((s, si) => s.topics.flatMap((t, ti) => t.problems.map((p, pi) => ({ state: Number(progress[data.problemId(si, ti, pi)]) || 0, to: `${route}/${si}/${ti}/${pi}` })))))
  }
  const roadmap = (data, route) => {
    const checks = data.loadChecks()
    return summarizeItems(data.SECTIONS.flatMap(s => s.subsections.flatMap(sub => sub.items.map((_, i) => ({ state: data.normalizeState(checks[data.itemId(s.id, sub.label, i)]), to: `${route}/${s.id}` })))))
  }
  return [
    { title: 'Data structures & algorithms', to: '/dsa', description: 'Work through the A2Z sheet and solve problems in the editor.', unit: 'problems', ...coding(dsa, dsa.STEPS, '/dsa') },
    { title: 'Python', to: '/python', description: 'Build fluency through a structured roadmap and coding exercises.', unit: 'problems', ...coding(python, python.PHASES, '/python') },
    { title: 'Generative AI', to: '/genai', description: 'Study the foundations and engineering of production AI applications.', unit: 'topics', ...roadmap(genai, '/genai') },
    { title: 'System design', to: '/systemdesign', description: 'Explore architecture, tradeoffs, and scalable systems.', unit: 'topics', ...roadmap(system, '/systemdesign') },
    { title: 'AI interview', to: '/ai-interview', description: 'Prepare for technical, system design, and behavioral rounds.', unit: 'questions', ...roadmap(interview, '/ai-interview') },
  ]
}

export function getCodingActivity(now = new Date()) {
  const histories = [dsa.loadDailyHistory(), python.loadDailyHistory()]
  const counts = {}
  histories.forEach(history => Object.entries(history).forEach(([date, ids]) => {
    if (Array.isArray(ids)) counts[date] = (counts[date] || 0) + new Set(ids).size
  }))
  const today = getLocalDate(now)
  const cursor = new Date(now)
  if (!counts[today]) cursor.setDate(cursor.getDate() - 1)
  let streak = 0
  while (counts[getLocalDate(cursor)] > 0) { streak++; cursor.setDate(cursor.getDate() - 1) }
  const days = Array.from({ length: 14 }, (_, i) => {
    const date = new Date(now)
    date.setDate(date.getDate() - 13 + i)
    const key = getLocalDate(date)
    return { date: key, count: counts[key] || 0 }
  })
  return { days, streak, today: counts[today] || 0 }
}

export function getCustomLearningTracks(roadmaps) {
  return roadmaps.map(roadmap => ({
    title: roadmap.title,
    to: `/roadmaps/${roadmap.id}`,
    description: roadmap.description,
    unit: 'lessons',
    icon: 'systemdesign',
    ...summarizeItems(roadmap.stages.flatMap(stage => stage.topics.map(topic => {
      const lesson = roadmap.lessons?.[topic.id]
      return { state: lesson?.completed ? 2 : lesson?.blog ? 1 : 0, to: `/roadmaps/${roadmap.id}?topic=${topic.id}` }
    }))),
  }))
}
