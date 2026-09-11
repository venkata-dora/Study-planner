import * as data from '../data/systemDesignData'
import LearningRoadmap from '../components/LearningRoadmap'
export default function SystemDesign() {
  return <LearningRoadmap data={data} title="System design" description="Architecture, tradeoffs, and the systems behind AI." route="/systemdesign" />
}
