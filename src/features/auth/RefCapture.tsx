import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

export const REF_KEY = 'picoworker:ref'

// Visiting picoworker.xyz/r/<CODE> stores the inviter's code in the browser so
// it survives navigation, then sends the visitor to sign up.
export function RefCapture() {
  const { code } = useParams()
  const nav = useNavigate()
  useEffect(() => {
    if (code) localStorage.setItem(REF_KEY, code.trim().toUpperCase())
    nav('/login', { replace: true })
  }, [code, nav])
  return null
}
