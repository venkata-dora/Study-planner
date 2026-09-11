import { useEffect, useState } from 'react'
import { syncFromDB } from '../data/dsaData'
import { getLearningTracks, getCodingActivity, getCustomLearningTracks } from './learningProgress'

export default function useLearningProgress() {
  const read = () => ({ tracks: getLearningTracks(), activity: getCodingActivity() })
  const [data, setData] = useState(read)
  const [customTracks, setCustomTracks] = useState([])
  const [customStatus, setCustomStatus] = useState('loading')
  useEffect(() => {
    let active = true
    let requestNumber = 0
    const refreshLocal = () => { if (active) setData(read()) }
    const refresh = async () => {
      refreshLocal()
      const current = ++requestNumber
      try {
        const response = await fetch('/api/roadmaps')
        if (!response.ok) throw new Error('Unable to load custom roadmaps')
        const roadmaps = await response.json()
        if (active && current === requestNumber) {
          setCustomTracks(getCustomLearningTracks(roadmaps))
          setCustomStatus('ready')
        }
      } catch {
        if (active && current === requestNumber) setCustomStatus('error')
      }
    }
    syncFromDB().then(refreshLocal)
    refresh()
    window.addEventListener('focus', refresh)
    window.addEventListener('storage', refreshLocal)
    return () => {
      active = false
      window.removeEventListener('focus', refresh)
      window.removeEventListener('storage', refreshLocal)
    }
  }, [])
  return { ...data, tracks: [...data.tracks, ...customTracks], customStatus }
}
