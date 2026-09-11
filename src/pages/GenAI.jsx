import { Link } from 'react-router-dom'
import * as data from '../data/genAIData'
import LearningRoadmap from '../components/LearningRoadmap'
export default function GenAI() {
  return <LearningRoadmap data={data} title="Generative AI" description="From the foundations to production-ready AI applications." route="/genai"><div className="learning-section-title"><h2>Keep exploring</h2></div><div className="learning-resources"><Link to="/interview"><div><h3>Resume interview questions</h3><p>Technical answers, behavioral stories, and project architecture.</p></div></Link><Link to="/blogs"><div><h3>Reading library</h3><p>Explore your saved topic explanations.</p></div></Link></div></LearningRoadmap>
}
