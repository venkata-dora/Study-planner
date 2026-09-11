// AI Interview Prep — 140 questions across 6 rounds
// Pattern: same as genAIData.js

const STORAGE_KEY = 'dp_ai_interview_checks_v1'

export function loadChecks() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {} }
  catch { return {} }
}

export function saveChecks(checks) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(checks))
}

export function itemId(sectionId, subLabel, itemIdx) {
  const safe = subLabel.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
  return `${sectionId}_${safe}_${itemIdx}`
}

export function cycleState(current) {
  const n = normalizeState(current)
  return n === 0 ? 1 : n === 1 ? 2 : 0
}

export function normalizeState(val) {
  if (val === true) return 2
  if (val === false || val === undefined || val === null) return 0
  const n = Number(val)
  return [0, 1, 2].includes(n) ? n : 0
}

export function isDone(val) { return normalizeState(val) === 2 }

export const STATE_COLORS = {
  0: { bg: 'var(--neu-surface)', border: '#94a398', text: 'var(--neu-text-secondary)', label: '○', tip: 'Not started' },
  1: { bg: 'rgba(234,88,12,0.12)', border: '#ea580c', text: '#ea580c', label: '~', tip: 'In progress' },
  2: { bg: 'rgba(22,163,74,0.12)', border: '#16a34a', text: '#16a34a', label: '✓', tip: 'Done' },
}

export const SECTIONS = [
  // ── ROUND 1: Recruiter Screen ──
  {
    id: 'r1',
    icon: '📞',
    title: 'Round 1: Recruiter Screen',
    color: '#6366f1',
    bg: 'rgba(99,102,241,0.1)',
    subsections: [
      {
        label: 'Recruiter Questions',
        items: [
          'Tell me about yourself.',
          'Why do you want to leave UnitedHealth Group?',
          'Why this company specifically?',
          'How do your values align with ours?',
          'Are you looking for visa sponsorship?',
          'What is your expected compensation?',
          'When can you join?',
          'Do you have any questions for me?',
        ],
      },
    ],
  },

  // ── ROUND 2: Technical Coding ──
  {
    id: 'r2',
    icon: '💻',
    title: 'Round 2: Technical Coding',
    color: '#2563eb',
    bg: 'rgba(37,99,235,0.1)',
    subsections: [
      {
        label: 'Arrays & Two Pointers',
        items: [
          'Two Sum',
          'Container With Most Water',
          'Trapping Rain Water',
          'Product of Array Except Self',
        ],
      },
      {
        label: 'Strings & Sliding Window',
        items: [
          'Longest Substring Without Repeating Characters',
          'Minimum Window Substring',
        ],
      },
      {
        label: 'Dynamic Programming',
        items: [
          'Longest Increasing Subsequence',
          'Longest Common Subsequence',
          'Word Break',
          'Decode Ways',
        ],
      },
      {
        label: 'Trees',
        items: [
          'Binary Tree Maximum Path Sum',
          'Serialize and Deserialize Binary Tree',
        ],
      },
      {
        label: 'Graphs',
        items: [
          'Number of Islands',
          'Course Schedule',
          'Clone Graph',
          'Pacific Atlantic Water Flow',
        ],
      },
      {
        label: 'Heaps & Design',
        items: [
          'Merge K Sorted Lists',
          'Find Median from Data Stream',
          'K Closest Points to Origin',
          'LRU Cache',
          'Implement Trie (Prefix Tree)',
          'Median of Two Sorted Arrays',
        ],
      },
    ],
  },

  // ── ROUND 3: ML Implementation Coding ──
  {
    id: 'r3',
    icon: '🔬',
    title: 'Round 3: ML Implementation Coding',
    color: '#dc2626',
    bg: 'rgba(220,38,38,0.1)',
    subsections: [
      {
        label: 'Classical ML from Scratch',
        items: [
          'Implement K-Means Clustering from scratch using NumPy only',
          'Implement Gradient Descent for Linear Regression using NumPy only',
          'Implement Logistic Regression from scratch with Sigmoid and Log Loss',
          'Implement Naive Bayes Classifier with fit and predict methods',
          'Implement AUC-ROC from scratch in vanilla Python',
          'Implement KNN from scratch',
        ],
      },
      {
        label: 'Deep Learning & Advanced',
        items: [
          'Implement Batch Normalization using NumPy only',
          'Implement Min-Max Scaling and Feature Normalization using NumPy only',
          'Implement a basic RAG pipeline in Python',
          'Implement transformer self-attention with Q, K, V matrices',
        ],
      },
    ],
  },

  // ── ROUND 4: ML/AI Technical Concepts ──
  {
    id: 'r4a',
    icon: '🧠',
    title: 'Round 4A: Core ML Concepts',
    color: '#7c3aed',
    bg: 'rgba(124,58,237,0.1)',
    subsections: [
      {
        label: 'Core ML',
        items: [
          'What is the bias-variance tradeoff?',
          'What is overfitting and how do you prevent it?',
          'Explain the difference between L1 and L2 regularization.',
          'What is gradient descent and what are its variants?',
          'What is cross-validation and why do we use it?',
          'Explain precision, recall, and F1 score and when to use each.',
          'How do you handle imbalanced datasets?',
          'What is the difference between bagging and boosting?',
          'What is the curse of dimensionality?',
          'What is PCA and when would you use it?',
        ],
      },
      {
        label: 'Deep Learning',
        items: [
          'Explain the Transformer architecture and self-attention mechanism.',
          'What is the vanishing and exploding gradient problem and how do you solve it?',
          'What is the difference between CNN, RNN, and Transformer?',
          'What is dropout and how does it work?',
          'Explain batch normalization and why it is used.',
          'What is the difference between sigmoid, ReLU, and GELU activations?',
          'What is weight initialization and why does it matter?',
          'What is the difference between forward pass and backpropagation?',
          'What is an epoch, batch size, and learning rate and how do they interact?',
          'What is transfer learning and when would you use it?',
        ],
      },
    ],
  },

  {
    id: 'r4b',
    icon: '🤖',
    title: 'Round 4B: GenAI & LLM Concepts',
    color: '#ec4899',
    bg: 'rgba(236,72,153,0.1)',
    subsections: [
      {
        label: 'Generative AI and LLMs',
        items: [
          'What is the difference between fine-tuning and RAG?',
          'What causes hallucinations in LLMs and how do you mitigate them?',
          'What is RLHF and how does it work end to end?',
          'Explain RAG end to end — indexing, retrieval, augmentation, generation.',
          'What is the difference between embeddings and one-hot encoding?',
          'What are the key prompt engineering techniques?',
          'What is the difference between zero-shot, few-shot, and chain-of-thought prompting?',
          'What is the difference between GPT decoder-only and BERT encoder-only?',
          'What is the difference between dense retrieval and sparse retrieval BM25?',
          'How do you evaluate a RAG system and what metrics do you use?',
        ],
      },
      {
        label: 'RAG & Search Deep Dive',
        items: [
          'What is chunking strategy in RAG and how does chunk size affect performance?',
          'What is a vector database and how does it work?',
          'What is cosine similarity and why is it used in semantic search?',
          'What is the difference between semantic search and keyword search?',
          'What is temperature in LLMs and how does it affect output?',
          'What is top-k and top-p sampling in LLMs?',
          'What is context window and how do you handle documents exceeding it?',
          'What is a system prompt and how do you use it effectively?',
          'What is ReAct prompting?',
          'What is the difference between an LLM agent and a standard LLM call?',
        ],
      },
    ],
  },

  {
    id: 'r4c',
    icon: '⚙️',
    title: 'Round 4C: MLOps & Production',
    color: '#0891b2',
    bg: 'rgba(8,145,178,0.1)',
    subsections: [
      {
        label: 'MLOps & Production',
        items: [
          'How do you detect and handle model drift in production?',
          'What is the difference between data drift and concept drift?',
          'What is A/B testing and how do you design one for an ML model?',
          'How do you reduce model inference latency in production?',
          'What is model quantization and how does it work?',
          'What is knowledge distillation?',
          'What is a feature store and why is it important?',
          'What is the difference between online learning and batch learning?',
          'What is the difference between model parallelism and data parallelism?',
          'How do you version control ML models and datasets?',
        ],
      },
    ],
  },

  {
    id: 'r4d',
    icon: '📋',
    title: 'Round 4D: Resume Deep Dives',
    color: '#ea580c',
    bg: 'rgba(234,88,12,0.1)',
    subsections: [
      {
        label: 'UnitedHealth Group',
        items: [
          'Walk me through your Azure OpenAI document workflow architecture end to end.',
          'How did you design your prompt strategies for classification and entity extraction?',
          'How did you improve output accuracy by 21% through iterative tuning?',
          'How did you build your embedding-based vector search system?',
          'How did you detect and handle model drift at UHG?',
          'How did you optimize inference to reduce processing time by 23%?',
          'How did you reduce system downtime by 17% in your inference pipelines?',
          'How did you conduct A/B testing for your AI models at UHG?',
        ],
      },
      {
        label: 'Mastercard',
        items: [
          'Walk me through your fraud detection model — features, algorithm, and evaluation.',
          'How did you handle class imbalance in fraud detection?',
          'How did you deploy models on SageMaker and expose them via REST APIs?',
          'How did you build your ETL pipelines on AWS S3 and Lambda?',
        ],
      },
      {
        label: 'Chewy',
        items: [
          'Explain your recommendation system and collaborative filtering approach in detail.',
          'How did you evaluate your recommendation system beyond accuracy?',
          'How did you improve purchase prediction accuracy by 17%?',
        ],
      },
    ],
  },

  // ── ROUND 5: ML System Design ──
  {
    id: 'r5',
    icon: '🏗️',
    title: 'Round 5: ML System Design',
    color: '#16a34a',
    bg: 'rgba(22,163,74,0.1)',
    subsections: [
      {
        label: 'LLM & NLP Systems',
        items: [
          'Design an LLM-powered chatbot with RAG architecture',
          'Design a semantic search engine using embeddings and a vector database',
          'Design a document processing pipeline using LLMs',
          'Design a content moderation and unsafe content detection system',
        ],
      },
      {
        label: 'ML Infrastructure & Platform',
        items: [
          'Design a real-time fraud detection system',
          'Design a product recommendation system',
          'Design a model monitoring and drift detection system',
          'Design a low-latency model serving infrastructure',
          'Design an end-to-end ML training and serving pipeline on AWS',
          'Design a feature store for a large-scale ML platform',
        ],
      },
    ],
  },

  // ── ROUND 6: Behavioral ──
  {
    id: 'r6',
    icon: '🎯',
    title: 'Round 6: Behavioral',
    color: '#ca8a04',
    bg: 'rgba(202,138,4,0.1)',
    subsections: [
      {
        label: 'Achievement & Initiative',
        items: [
          'Tell me about your most significant professional achievement.',
          'Tell me about a time you took on work outside your comfort zone and found it rewarding.',
          'Tell me about a time you took initiative to fix a problem without being asked.',
          'Give an example of a calculated risk you took.',
          'Tell me about a time you worked with incomplete data or unclear requirements.',
          'Tell me about a time you had unclear responsibilities on a project.',
        ],
      },
      {
        label: 'Conflict & Communication',
        items: [
          'Tell me about a time you were wrong — what happened and what did you do?',
          'Describe a time you disagreed with a team member\'s approach — what did you do?',
          'If your manager asked you to do something you disagreed with, how would you handle it?',
          'How do you convince someone who is resistant to your ideas?',
          'Tell me about a time you learned something valuable from a peer or direct report.',
          'Describe a time when you had to speak up in a difficult or uncomfortable environment.',
        ],
      },
      {
        label: 'Delivery & Impact',
        items: [
          'Tell me about a time you worked with limited time or resources.',
          'Tell me about a time your team wanted to give up but you pushed them to deliver results.',
          'Describe a time you found a simple solution to a complex problem.',
          'Tell me about a time you removed a serious roadblock preventing your team from making progress.',
          'Tell me about a time you did not meet customer expectations — what happened?',
          'How do you prioritize when dealing with many competing stakeholder requests?',
        ],
      },
      {
        label: 'Innovation & Leadership',
        items: [
          'Tell me about a time you translated a vague business requirement into a technical solution.',
          'What is the most innovative project you have worked on?',
          'Tell me about a time you saw an opportunity to do something bigger than the initial scope.',
          'Tell me about the most complicated problem you have had to deal with.',
          'How have you empowered a person or a group to accomplish a task?',
          'Give an example of a time you left a project in a better position than you found it.',
          'What is the largest impact you have had on your team or organization?',
        ],
      },
    ],
  },
]
