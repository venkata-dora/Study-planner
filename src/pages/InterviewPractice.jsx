import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

/* ═══════════════════════════════════════════════
   Question bank — pulled from interview prep docs
═══════════════════════════════════════════════ */
const QUESTION_BANK = [
  // ── RAG & Retrieval (12) ──
  { category: 'Technical — RAG', question: 'Explain the end-to-end flow of a basic RAG pipeline. What happens at each stage?' },
  { category: 'Technical — RAG', question: 'Compare chunking strategies — fixed-size, recursive, semantic, and parent-child. When do you use each?' },
  { category: 'Technical — RAG', question: 'Compare FAISS, Weaviate, and ChromaDB. What are the tradeoffs and when would you pick each?' },
  { category: 'Technical — RAG', question: 'What is hybrid search and why does it outperform pure vector search?' },
  { category: 'Technical — RAG', question: 'Explain re-ranking. How do cross-encoders work and why are they more accurate than bi-encoders?' },
  { category: 'Technical — RAG', question: 'What are HyDE, CRAG, and Self-RAG? Explain each and when to use them.' },
  { category: 'Technical — RAG', question: 'What is Graph RAG and when does it outperform standard vector RAG?' },
  { category: 'Technical — RAG', question: 'How do you handle production RAG concerns: caching, incremental indexing, and access control?' },
  { category: 'Technical — RAG', question: 'How do you evaluate RAG quality using the RAGAS framework? Explain each metric.' },
  { category: 'Technical — RAG', question: 'How do you debug bad retrieval in a production RAG system?' },
  { category: 'Technical — RAG', question: 'What embedding models would you choose for different use cases and why?' },
  { category: 'Technical — RAG', question: 'Explain semantic chunking in detail. How does it work and what are its limitations?' },

  // ── Fine-tuning & Training (6) ──
  { category: 'Technical — Fine-tuning', question: 'Explain LoRA and QLoRA. How do they work and when would you use each?' },
  { category: 'Technical — Fine-tuning', question: 'When should you fine-tune an LLM vs. use prompt engineering? What\'s the decision framework?' },
  { category: 'Technical — Fine-tuning', question: 'How do you prepare training data for LLM fine-tuning? What are the quality requirements?' },
  { category: 'Technical — Fine-tuning', question: 'Explain evaluation metrics for LLMs: perplexity, BLEU, ROUGE, and LLM-as-judge.' },
  { category: 'Technical — Fine-tuning', question: 'Explain distributed training: FSDP vs DeepSpeed. When do you need each?' },
  { category: 'Technical — Fine-tuning', question: 'What is DPO (Direct Preference Optimization) and how does it compare to RLHF?' },

  // ── Agents & Tool Use (6) ──
  { category: 'Technical — Agents', question: 'Explain the ReAct pattern for LLM agents. How does it work step by step?' },
  { category: 'Technical — Agents', question: 'Compare LangGraph, CrewAI, and AutoGen. When do you pick each?' },
  { category: 'Technical — Agents', question: 'How does function calling work in modern LLMs? Explain the flow and implementation.' },
  { category: 'Technical — Agents', question: 'How do you implement memory in LLM agents? Compare short-term vs. long-term memory approaches.' },
  { category: 'Technical — Agents', question: 'How do you evaluate and test LLM agents?' },
  { category: 'Technical — Agents', question: 'Explain multi-agent orchestration patterns. When do you need multiple agents?' },

  // ── Prompt Engineering & Optimization (6) ──
  { category: 'Technical — Prompt Eng', question: 'Explain chain-of-thought (CoT) prompting and its variants. When does it help?' },
  { category: 'Technical — Prompt Eng', question: 'How do temperature, top-p, and top-k affect LLM output? How do you tune them?' },
  { category: 'Technical — Prompt Eng', question: 'How do you get structured output (JSON) from LLMs reliably?' },
  { category: 'Technical — Prompt Eng', question: 'What is prompt injection and how do you defend against it?' },
  { category: 'Technical — Prompt Eng', question: 'How do you optimize LLM costs in production? What are the key strategies?' },
  { category: 'Technical — Prompt Eng', question: 'Compare few-shot vs. zero-shot prompting. How do you select and optimize few-shot examples?' },

  // ── MLOps & Deployment (6) ──
  { category: 'Technical — MLOps', question: 'Compare model serving frameworks: vLLM, TGI, and Triton. When do you pick each?' },
  { category: 'Technical — MLOps', question: 'Explain model quantization: GPTQ, AWQ, and GGUF. What are the tradeoffs?' },
  { category: 'Technical — MLOps', question: 'Explain KV caching, continuous batching, and speculative decoding for LLM latency optimization.' },
  { category: 'Technical — MLOps', question: 'How do you monitor LLMs in production? What metrics matter?' },
  { category: 'Technical — MLOps', question: 'How do you A/B test LLM features in production?' },
  { category: 'Technical — MLOps', question: 'How do you build CI/CD pipelines for ML/LLM systems?' },

  // ── Python & System Design (6) ──
  { category: 'Technical — System Design', question: 'How do you use async/await for AI pipelines in Python? What are the patterns?' },
  { category: 'Technical — System Design', question: 'How do you build a production ML serving API with FastAPI?' },
  { category: 'Technical — System Design', question: 'How do you implement caching patterns for LLM applications with Redis?' },
  { category: 'Technical — System Design', question: 'Explain rate limiting and backpressure patterns for LLM APIs.' },
  { category: 'Technical — System Design', question: 'Design a scalable RAG architecture for 10M documents and 1000 concurrent users.' },
  { category: 'Technical — System Design', question: 'Design a multi-tenant LLM platform for a SaaS company.' },

  // ── Responsible AI & Advanced Topics (8) ──
  { category: 'Technical — Responsible AI', question: 'How do you detect and mitigate hallucinations in LLM outputs?' },
  { category: 'Technical — Responsible AI', question: 'How do guardrail frameworks (NeMo Guardrails, Guardrails AI) work? When do you need them?' },
  { category: 'Technical — Responsible AI', question: 'How do you handle PII detection and data privacy in LLM applications?' },
  { category: 'Technical — Responsible AI', question: 'How do multimodal AI models (vision-language models) work and how do you use them in production?' },
  { category: 'Technical — Responsible AI', question: 'What is knowledge distillation and how is it used with LLMs?' },
  { category: 'Technical — Responsible AI', question: 'Explain Mixture of Experts (MoE) architecture. Why do models like Mixtral use it?' },
  { category: 'Technical — Responsible AI', question: 'Explain model compression techniques beyond quantization.' },
  { category: 'Technical — Responsible AI', question: 'What are the most important emerging trends in AI engineering as of 2025-2026?' },

  // ── Experience Deep Dive — Compass Group (8) ──
  { category: 'Experience — Compass', question: 'Walk me through the multi-agent system architecture. What agents did you have? How did they communicate?' },
  { category: 'Experience — Compass', question: 'How did MCP fit into your architecture? Why MCP over direct function calling?' },
  { category: 'Experience — Compass', question: 'Explain your RAG pipeline. How did you choose between FAISS and ChromaDB?' },
  { category: 'Experience — Compass', question: 'How did semantic chunking improve your retrieval? What was your chunk size? How did you measure the 10% improvement?' },
  { category: 'Experience — Compass', question: 'Walk me through your fine-tuning process. Why LoRA/QLoRA? What base model? How did you get 28% improvement?' },
  { category: 'Experience — Compass', question: 'What was the most challenging bug/issue you faced at Compass Group? How did you debug it?' },
  { category: 'Experience — Compass', question: 'How did you measure the 40% reduction in manual support overhead?' },
  { category: 'Experience — Compass', question: 'What would you do differently if you rebuilt the multi-agent system from scratch?' },

  // ── Experience Deep Dive — Grootan (8) ──
  { category: 'Experience — Grootan', question: 'How did you implement LLM-as-Judge? What metrics did you track? How did you validate the judge itself?' },
  { category: 'Experience — Grootan', question: 'Explain your hybrid RAG architecture. Why BM25 + dense + reranking? How did you tune weights?' },
  { category: 'Experience — Grootan', question: 'How did you achieve 200ms query latency with Weaviate? What optimizations?' },
  { category: 'Experience — Grootan', question: 'Walk me through your FastAPI + Docker + AWS deployment. How did you handle zero-downtime?' },
  { category: 'Experience — Grootan', question: 'How did structured outputs help cut token usage by 25%?' },
  { category: 'Experience — Grootan', question: 'What CI/CD pipeline did you set up? What tests ran in the pipeline?' },
  { category: 'Experience — Grootan', question: 'What was the biggest production incident at Grootan? How did you handle it?' },
  { category: 'Experience — Grootan', question: 'How did you monitor model quality in production?' },

  // ── Experience Deep Dive — Intern / iNeuron (9) ──
  { category: 'Experience — Intern', question: 'Explain the hologram verification system. How does CV detect holograms?' },
  { category: 'Experience — Intern', question: 'How did you reduce latency from 4 min to 2 min? What were the bottlenecks?' },
  { category: 'Experience — Intern', question: 'How did transfer learning help with limited labeled data?' },
  { category: 'Experience — Intern', question: 'What was the production architecture of the ID authentication system?' },
  { category: 'Experience — Intern', question: 'How did you handle different ID formats?' },
  { category: 'Experience — Intern', question: 'Walk me through the credit card default prediction model.' },
  { category: 'Experience — Intern', question: 'How did you achieve 97% accuracy? What about precision/recall tradeoffs for fraud?' },
  { category: 'Experience — Intern', question: 'How was the CI/CD pipeline set up at iNeuron?' },
  { category: 'Experience — Intern', question: 'What was the most important feature you found in EDA?' },

  // ── Behavioral STAR (15) ──
  { category: 'Behavioral', question: 'Tell me about yourself.' },
  { category: 'Behavioral', question: 'Tell me about a time you solved a difficult technical problem.' },
  { category: 'Behavioral', question: 'Tell me about a time you disagreed with a teammate.' },
  { category: 'Behavioral', question: 'Tell me about a time you had to learn something quickly.' },
  { category: 'Behavioral', question: 'Tell me about a time you improved a process.' },
  { category: 'Behavioral', question: 'Tell me about a time you failed.' },
  { category: 'Behavioral', question: 'Tell me about a time you handled ambiguity.' },
  { category: 'Behavioral', question: 'Tell me about a time you had to make a tradeoff.' },
  { category: 'Behavioral', question: 'Why are you interested in AI engineering?' },
  { category: 'Behavioral', question: 'Where do you see yourself in 5 years?' },
  { category: 'Behavioral', question: 'What\'s your biggest weakness?' },
  { category: 'Behavioral', question: 'Tell me about a time you worked under pressure.' },
  { category: 'Behavioral', question: 'How do you stay updated with AI?' },
  { category: 'Behavioral', question: 'Tell me about a time you went above and beyond.' },
  { category: 'Behavioral', question: 'What\'s the most impactful project you\'ve worked on?' },

  // ── Tricky Questions (7) ──
  { category: 'Tricky Questions', question: 'I see a gap between Dec 2023 and Jan 2025 — what were you doing?' },
  { category: 'Tricky Questions', question: 'Your internship was 10 months — why so long?' },
  { category: 'Tricky Questions', question: 'Why did you leave India?' },
  { category: 'Tricky Questions', question: 'Why Compass Group? It\'s not a tech company.' },
  { category: 'Tricky Questions', question: 'Your experience is mostly short stints — why?' },
  { category: 'Tricky Questions', question: 'Do you have experience leading a team?' },
  { category: 'Tricky Questions', question: 'What\'s your salary expectation?' },
]

const CATEGORIES = [...new Set(QUESTION_BANK.map(q => q.category))]

/* ═══════════════════════════════════════════════
   Confidence analysis
═══════════════════════════════════════════════ */
const FILLER_WORDS = ['um', 'uh', 'like', 'you know', 'basically', 'actually', 'so', 'right', 'kind of', 'sort of', 'i mean', 'well']

function analyzeConfidence(transcript, durationSec) {
  if (!transcript || durationSec < 1) return null

  const words = transcript.toLowerCase().split(/\s+/).filter(w => w.length > 0)
  const wordCount = words.length
  const wpm = Math.round(wordCount / (durationSec / 60))

  // Count fillers
  const lowerTranscript = transcript.toLowerCase()
  let fillerCount = 0
  const fillerDetails = {}
  FILLER_WORDS.forEach(f => {
    const regex = new RegExp(`\\b${f}\\b`, 'gi')
    const matches = lowerTranscript.match(regex)
    if (matches) {
      fillerCount += matches.length
      fillerDetails[f] = matches.length
    }
  })

  const fillerRate = wordCount > 0 ? (fillerCount / wordCount * 100) : 0

  // Pace score: ideal is 130-160 wpm
  let paceScore = 100
  if (wpm < 80) paceScore = 40       // too slow
  else if (wpm < 110) paceScore = 65  // a bit slow
  else if (wpm < 130) paceScore = 85
  else if (wpm <= 160) paceScore = 100 // ideal
  else if (wpm <= 190) paceScore = 80
  else paceScore = 50                  // too fast

  // Filler score: fewer = better
  let fillerScore = 100
  if (fillerRate > 8) fillerScore = 30
  else if (fillerRate > 5) fillerScore = 50
  else if (fillerRate > 3) fillerScore = 70
  else if (fillerRate > 1) fillerScore = 85

  // Length score: good answers are 100-400 words
  let lengthScore = 100
  if (wordCount < 30) lengthScore = 30
  else if (wordCount < 60) lengthScore = 55
  else if (wordCount < 100) lengthScore = 75
  else if (wordCount <= 400) lengthScore = 100
  else if (wordCount <= 600) lengthScore = 80
  else lengthScore = 60 // too long

  const overall = Math.round(paceScore * 0.3 + fillerScore * 0.35 + lengthScore * 0.35)

  return {
    wordCount, wpm, durationSec: Math.round(durationSec),
    fillerCount, fillerRate: fillerRate.toFixed(1), fillerDetails,
    paceScore, fillerScore, lengthScore, overall,
  }
}

/* ═══════════════════════════════════════════════
   Main Component
═══════════════════════════════════════════════ */
export default function InterviewPractice() {
  const navigate = useNavigate()

  // Question state
  const [category, setCategory] = useState('all')
  const [currentQ, setCurrentQ] = useState(null)
  const [qHistory, setQHistory] = useState([])

  // Recording state
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [recordStart, setRecordStart] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const recognitionRef = useRef(null)
  const timerRef = useRef(null)

  // Camera
  const [cameraOn, setCameraOn] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const videoRef = useRef(null)
  const streamRef = useRef(null)

  // Feedback
  const [feedback, setFeedback] = useState(null)
  const [feedbackLoading, setFeedbackLoading] = useState(false)
  const [confidence, setConfidence] = useState(null)

  // Pick a random question
  const pickQuestion = useCallback(() => {
    const pool = category === 'all' ? QUESTION_BANK : QUESTION_BANK.filter(q => q.category === category)
    const available = pool.filter(q => !qHistory.includes(q.question))
    const list = available.length > 0 ? available : pool
    const q = list[Math.floor(Math.random() * list.length)]
    setCurrentQ(q)
    setTranscript('')
    setInterimTranscript('')
    setFeedback(null)
    setConfidence(null)
    setElapsed(0)
  }, [category, qHistory])

  useEffect(() => { pickQuestion() }, []) // eslint-disable-line

  // Camera toggle
  const toggleCamera = async () => {
    if (cameraOn) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
        streamRef.current = null
      }
      setCameraOn(false)
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
      setCameraOn(true)
      setCameraError('')
    } catch (e) {
      setCameraError('Camera access denied. Please allow camera in browser settings.')
    }
  }

  // Attach stream when videoRef mounts
  useEffect(() => {
    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
    }
  }, [cameraOn])

  // Cleanup
  useEffect(() => {
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
      if (recognitionRef.current) recognitionRef.current.abort()
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  // Start recording
  const startRecording = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech Recognition is not supported in this browser. Please use Chrome or Edge.')
      return
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    let finalText = ''

    recognition.onresult = (event) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalText += t + ' '
          setTranscript(finalText.trim())
        } else {
          interim += t
        }
      }
      setInterimTranscript(interim)
    }

    recognition.onerror = (e) => {
      if (e.error !== 'no-speech') console.error('Speech error:', e.error)
    }

    recognition.onend = () => {
      // Auto-restart if still recording
      if (recognitionRef.current && isRecording) {
        try { recognition.start() } catch {}
      }
    }

    recognitionRef.current = recognition
    recognition.start()

    setIsRecording(true)
    setTranscript('')
    setInterimTranscript('')
    setFeedback(null)
    setConfidence(null)
    const start = Date.now()
    setRecordStart(start)
    setElapsed(0)
    timerRef.current = setInterval(() => {
      setElapsed(Math.round((Date.now() - start) / 1000))
    }, 1000)
  }

  // Stop recording
  const stopRecording = () => {
    setIsRecording(false)
    if (recognitionRef.current) {
      recognitionRef.current.abort()
      recognitionRef.current = null
    }
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    setInterimTranscript('')

    // Analyze confidence
    const duration = recordStart ? (Date.now() - recordStart) / 1000 : 0
    const analysis = analyzeConfidence(transcript, duration)
    setConfidence(analysis)
  }

  // Get AI feedback + auto-save session
  const getFeedback = async () => {
    if (!transcript.trim()) return
    setFeedbackLoading(true)
    try {
      const res = await fetch('/api/interview/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: currentQ.question,
          category: currentQ.category,
          answer: transcript,
          confidence: confidence,
        }),
      })
      const data = await res.json()
      const fb = data.feedback || data.error || 'No feedback received'
      setFeedback(fb)

      // Extract score from feedback (looks for "X/10")
      const scoreMatch = fb.match(/(\d+)\s*\/\s*10/)
      const score = scoreMatch ? parseInt(scoreMatch[1]) : 0

      // Auto-save session
      fetch('/api/interview/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: currentQ.question,
          category: currentQ.category,
          transcript,
          confidence,
          feedback: fb,
          score,
          duration_sec: confidence?.durationSec || elapsed,
        }),
      })
    } catch (e) {
      setFeedback(`Error: ${e.message}`)
    }
    setFeedbackLoading(false)
  }

  // Next question
  const nextQuestion = () => {
    if (currentQ) setQHistory(prev => [...prev.slice(-20), currentQ.question])
    pickQuestion()
  }

  const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  const scoreColor = (score) => score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444'

  return (
    <div className="study-practice" style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)' }}>

      <div className="apple-page-heading"><div><span className="learning-eyebrow">PRACTICE & REVIEW</span><h1>Interview practice</h1><p>Work through a question, record your answer, and review your feedback.</p></div></div>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap', flexShrink: 0 }}>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/interview')}>← Back</button>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/practice/history')} style={{ gap: 4, display: 'inline-flex', alignItems: 'center' }}>📊 History</button>

        <select
          aria-label="Interview question category"
          value={category}
          onChange={e => { setCategory(e.target.value); setTimeout(pickQuestion, 0) }}
          style={{
            background: 'var(--neu-bg)', border: 'none', borderRadius: 12, padding: '6px 12px',
            fontSize: '.78rem', color: 'var(--neu-text-primary)', cursor: 'pointer',
            boxShadow: '3px 3px 6px var(--neu-shadow-dark), -3px -3px 6px var(--neu-shadow-light)',
          }}
        >
          <option value="all">All categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <button className="btn btn-secondary btn-sm" onClick={toggleCamera}>
          {cameraOn ? '📷 Camera Off' : '📷 Camera On'}
        </button>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={nextQuestion}>⏭ Skip</button>
        </div>
      </div>
      {cameraError && <div style={{ color: '#ef4444', fontSize: '.78rem', marginBottom: 8 }}>{cameraError}</div>}

      {/* Main layout */}
      <div className="study-practice-split" style={{ flex: 1, display: 'flex', gap: 12, minHeight: 0 }}>

        {/* Left column: Camera + Question */}
        <div style={{ width: '40%', minWidth: 320, display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Camera preview */}
          {cameraOn && (
            <div style={{
              borderRadius: 16, overflow: 'hidden', aspectRatio: '4/3',
              boxShadow: '6px 6px 12px var(--neu-shadow-dark), -6px -6px 12px var(--neu-shadow-light)',
              background: '#000', position: 'relative', flexShrink: 0,
            }}>
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
              />
              {/* Recording indicator */}
              {isRecording && (
                <div style={{
                  position: 'absolute', top: 12, right: 12,
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'rgba(0,0,0,0.6)', borderRadius: 999, padding: '4px 12px',
                }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%', background: '#ef4444',
                    animation: 'pulse 1s infinite',
                  }} />
                  <span style={{ color: '#fff', fontSize: '.72rem', fontFamily: 'monospace' }}>{formatTime(elapsed)}</span>
                </div>
              )}
            </div>
          )}

          {/* Question card */}
          <div className="reading-question" style={{
            background: 'var(--neu-bg)', borderRadius: 16, padding: '20px 22px',
            boxShadow: '6px 6px 12px var(--neu-shadow-dark), -6px -6px 12px var(--neu-shadow-light)',
            borderLeft: '4px solid var(--neu-accent)',
            flex: cameraOn ? 'none' : 1,
          }}>
            <div style={{
              fontSize: '.68rem', fontWeight: 700, color: 'var(--neu-accent)',
              background: 'var(--neu-accent-soft)', padding: '3px 10px', borderRadius: 999,
              display: 'inline-block', marginBottom: 12, fontFamily: 'monospace',
              textTransform: 'uppercase', letterSpacing: '.05em',
            }}>
              {currentQ?.category}
            </div>
            <div style={{
              fontSize: '1.1rem', fontWeight: 700, color: 'var(--neu-text-primary)',
              lineHeight: 1.5,
            }}>
              {currentQ?.question}
            </div>
          </div>

          {/* Record controls */}
          <div style={{
            display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0,
          }}>
            {!isRecording ? (
              <button
                className="btn btn-primary"
                onClick={startRecording}
                style={{ flex: 1, fontSize: '.9rem', padding: '12px 20px' }}
              >
                🎙️ Start Recording
              </button>
            ) : (
              <button
                onClick={stopRecording}
                style={{
                  flex: 1, padding: '12px 20px', fontSize: '.9rem',
                  background: '#ef4444', color: '#fff', border: 'none',
                  borderRadius: 14, cursor: 'pointer', fontWeight: 700,
                  boxShadow: '0 4px 12px rgba(239,68,68,0.4)',
                }}
              >
                ⏹ Stop Recording ({formatTime(elapsed)})
              </button>
            )}

            {transcript && !isRecording && (
              <button
                className="btn btn-primary"
                onClick={getFeedback}
                disabled={feedbackLoading}
                style={{ padding: '12px 20px' }}
              >
                {feedbackLoading ? '⏳ Analyzing…' : '🤖 Get Feedback'}
              </button>
            )}
          </div>

          {/* Timer when no camera */}
          {!cameraOn && isRecording && (
            <div style={{ textAlign: 'center', fontSize: '2rem', fontFamily: 'monospace', fontWeight: 700, color: '#ef4444' }}>
              {formatTime(elapsed)}
            </div>
          )}
        </div>

        {/* Right column: Transcript + Confidence + Feedback */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>

          {/* Transcript */}
          <div style={{
            flex: 1, background: 'var(--neu-bg)', borderRadius: 16, padding: '18px 20px',
            boxShadow: 'inset 3px 3px 6px var(--neu-shadow-dark), inset -3px -3px 6px var(--neu-shadow-light)',
            overflowY: 'auto',
          }}>
            <div style={{
              fontSize: '.7rem', fontWeight: 700, color: 'var(--neu-text-secondary)',
              textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10,
              fontFamily: 'monospace',
            }}>
              {isRecording ? '🎙️ Listening…' : transcript ? '📝 Your Answer' : '📝 Transcript'}
            </div>
            {transcript || interimTranscript ? (
              <div style={{ fontSize: '.9rem', lineHeight: 1.8, color: 'var(--neu-text-primary)' }}>
                {transcript}
                {interimTranscript && (
                  <span style={{ color: 'var(--neu-text-secondary)', opacity: 0.6 }}> {interimTranscript}</span>
                )}
              </div>
            ) : (
              <div style={{ color: 'var(--neu-text-secondary)', fontSize: '.85rem', textAlign: 'center', paddingTop: 40 }}>
                {isRecording ? 'Start speaking…' : 'Click "Start Recording" and answer the question out loud'}
              </div>
            )}
          </div>

          {/* Confidence metrics */}
          {confidence && (
            <div style={{
              background: 'var(--neu-bg)', borderRadius: 16, padding: '16px 20px',
              boxShadow: '4px 4px 8px var(--neu-shadow-dark), -4px -4px 8px var(--neu-shadow-light)',
              flexShrink: 0,
            }}>
              <div style={{
                fontSize: '.7rem', fontWeight: 700, color: 'var(--neu-text-secondary)',
                textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10,
                fontFamily: 'monospace',
              }}>Confidence Analysis</div>

              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 12 }}>
                {/* Overall score */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: '50%',
                    border: `3px solid ${scoreColor(confidence.overall)}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1rem', fontWeight: 800, color: scoreColor(confidence.overall),
                    fontFamily: 'monospace',
                  }}>{confidence.overall}</div>
                  <div style={{ fontSize: '.6rem', color: 'var(--neu-text-secondary)', marginTop: 4, fontWeight: 600 }}>OVERALL</div>
                </div>

                {/* Metrics */}
                <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8 }}>
                  {[
                    { label: 'Words', value: confidence.wordCount, sub: `${confidence.wpm} wpm` },
                    { label: 'Duration', value: `${confidence.durationSec}s`, sub: formatTime(confidence.durationSec) },
                    { label: 'Pace', value: `${confidence.paceScore}/100`, sub: confidence.wpm < 110 ? 'Slow' : confidence.wpm > 160 ? 'Fast' : 'Good', color: scoreColor(confidence.paceScore) },
                    { label: 'Fillers', value: confidence.fillerCount, sub: `${confidence.fillerRate}%`, color: scoreColor(confidence.fillerScore) },
                    { label: 'Length', value: `${confidence.lengthScore}/100`, sub: confidence.wordCount < 60 ? 'Too short' : confidence.wordCount > 400 ? 'Long' : 'Good', color: scoreColor(confidence.lengthScore) },
                  ].map((m, i) => (
                    <div key={i} style={{
                      background: 'var(--neu-bg)', borderRadius: 10, padding: '8px 10px',
                      boxShadow: 'inset 2px 2px 4px var(--neu-shadow-dark), inset -2px -2px 4px var(--neu-shadow-light)',
                    }}>
                      <div style={{ fontSize: '.62rem', color: 'var(--neu-text-secondary)', fontWeight: 600, textTransform: 'uppercase', fontFamily: 'monospace' }}>{m.label}</div>
                      <div style={{ fontSize: '.88rem', fontWeight: 700, color: m.color || 'var(--neu-text-primary)' }}>{m.value}</div>
                      <div style={{ fontSize: '.6rem', color: 'var(--neu-text-secondary)' }}>{m.sub}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Filler word details */}
              {confidence.fillerCount > 0 && (
                <div style={{ fontSize: '.75rem', color: 'var(--neu-text-secondary)' }}>
                  Fillers detected: {Object.entries(confidence.fillerDetails).map(([w, c]) => `"${w}" (${c})`).join(', ')}
                </div>
              )}
            </div>
          )}

          {/* AI Feedback */}
          {(feedbackLoading || feedback) && (
            <div style={{
              background: 'var(--neu-bg)', borderRadius: 16, padding: '18px 20px',
              boxShadow: '4px 4px 8px var(--neu-shadow-dark), -4px -4px 8px var(--neu-shadow-light)',
              borderLeft: '4px solid #7c3aed',
              flexShrink: 0, maxHeight: 300, overflowY: 'auto',
            }}>
              <div style={{
                fontSize: '.7rem', fontWeight: 700, color: '#7c3aed',
                textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10,
                fontFamily: 'monospace',
              }}>🤖 AI Feedback</div>

              {feedbackLoading ? (
                <div style={{ textAlign: 'center', padding: 20 }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>🧠</div>
                  <div style={{ fontSize: '.82rem', color: 'var(--neu-text-secondary)' }}>Analyzing your answer…</div>
                </div>
              ) : (
                <div style={{ fontSize: '.86rem', lineHeight: 1.8, color: 'var(--neu-text-primary)', whiteSpace: 'pre-wrap' }}>
                  {feedback}
                </div>
              )}
            </div>
          )}

          {/* Next question button after feedback */}
          {feedback && !feedbackLoading && (
            <button
              className="btn btn-primary"
              onClick={nextQuestion}
              style={{ flexShrink: 0, padding: '12px 20px', fontSize: '.9rem' }}
            >
              ⏭ Next Question
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
