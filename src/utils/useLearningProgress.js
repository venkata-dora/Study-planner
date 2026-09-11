import { useEffect, useState } from 'react'
import { syncFromDB } from '../data/dsaData'
import { getLearningTracks, getCodingActivity } from './learningProgress'

export default function useLearningProgress() {
  const read = () => ({ tracks: getLearningTracks(), activity: getCodingActivity() })
  const [data, setData] = useState(read)
  useEffect(() => {
    let active = true
    const refresh = () => { if (active) setData(read()) }
    syncFromDB().then(refresh)
    window.addEventListener('focus', refresh)
    window.addEventListener('storage', refresh)
    return () => {
      active = false
      window.removeEventListener('focus', refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])
  return data
}
