import * as data from '../data/aiInterviewData'
import LearningRoadmap from '../components/LearningRoadmap'
export default function AIInterview() {
  return <LearningRoadmap data={data} title="AI interview" description="Prepare for every conversation, from coding to system design." route="/ai-interview" unit="questions" />
}
