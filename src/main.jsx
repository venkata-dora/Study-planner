import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import App from './App'
import CustomRoadmaps from './pages/CustomRoadmaps'
import LearningHome from './pages/LearningHome'
import Notes from './pages/Notes'
import Stats from './pages/Stats'
import GenAI from './pages/GenAI'
import GenAIDetail from './pages/GenAIDetail'
import BlogLibrary from './pages/BlogLibrary'
import InterviewPrep from './pages/InterviewPrep'
import DocReader from './pages/DocReader'
import DSASheet from './pages/DSASheet'
import DSAProblem from './pages/DSAProblem'
import DSAPractice from './pages/DSAPractice'
import PythonSheet from './pages/PythonSheet'
import PythonProblem from './pages/PythonProblem'
import PythonBlog from './pages/PythonBlog'
import PythonPractice from './pages/PythonPractice'
import SystemDesign from './pages/SystemDesign'
import SystemDesignDetail from './pages/SystemDesignDetail'
import AIInterview from './pages/AIInterview'
import AIInterviewDetail from './pages/AIInterviewDetail'
import InterviewPractice from './pages/InterviewPractice'
import InterviewHistory from './pages/InterviewHistory'
import './index.css'
import './styles/apple-learning.css'
import './styles/reading-room.css'
import './styles/focus.css'
import './styles/learning-styles.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<App />}>
          <Route index element={<LearningHome />} />
          {["planner", "week", "routine", "study", "prep", "today", "history"].map(path => <Route key={path} path={path} element={<Navigate to="/" replace />} />)}
          <Route path="*" element={<Navigate to="/" replace />} />
          <Route path="/roadmaps" element={<CustomRoadmaps />} />
          <Route path="/roadmaps/:roadmapId" element={<CustomRoadmaps />} />
          <Route path="/notes" element={<Notes />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/genai" element={<GenAI />} />
          <Route path="/genai/:sectionId" element={<GenAIDetail />} />
          <Route path="/systemdesign" element={<SystemDesign />} />
          <Route path="/systemdesign/:sectionId" element={<SystemDesignDetail />} />
          <Route path="/ai-interview" element={<AIInterview />} />
          <Route path="/ai-interview/:sectionId" element={<AIInterviewDetail />} />
          <Route path="/blogs" element={<BlogLibrary />} />
          <Route path="/interview" element={<InterviewPrep />} />
          <Route path="/interview/:docId" element={<DocReader />} />
          <Route path="/practice" element={<InterviewPractice />} />
          <Route path="/practice/history" element={<InterviewHistory />} />
          <Route path="/dsa" element={<DSASheet />} />
          <Route path="/dsa/practice" element={<DSAPractice />} />
          <Route path="/dsa/:stepIdx/:topicIdx/:probIdx" element={<DSAProblem />} />
          <Route path="/python" element={<PythonSheet />} />
          <Route path="/python/blog" element={<PythonBlog />} />
          <Route path="/python/practice" element={<PythonPractice />} />
          <Route path="/python/:phaseIdx/:topicIdx/:probIdx" element={<PythonProblem />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)
