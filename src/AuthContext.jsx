import { useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db, firebaseConfigured } from './firebase'
import { AuthContext } from './auth-context'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [profileError, setProfileError] = useState('')
  const [loading, setLoading] = useState(firebaseConfigured)
  useEffect(() => {
    if (!firebaseConfigured) return
    let revision = 0
    const unsubscribe = onAuthStateChanged(auth, async (current) => {
      const currentRevision = ++revision
      setLoading(true)
      setUser(current)
      if (current) {
        try {
          const snapshot = await getDoc(doc(db, 'users', current.uid))
          if (currentRevision !== revision) return
          setProfile(snapshot.exists() ? snapshot.data() : null)
          setProfileError('')
        } catch (error) {
          if (currentRevision !== revision) return
          console.error('Unable to load the authenticated user profile.', error)
          setProfile(null)
          setProfileError('Profili nuk mund të ngarkohej. Kontrollo lidhjen dhe provo përsëri.')
        }
      } else {
        setProfile(null)
        setProfileError('')
      }
      if (currentRevision === revision) setLoading(false)
    })
    return () => { revision++; unsubscribe() }
  }, [])
  const value = useMemo(() => ({
    user, profile, loading, profileError,
    logout: () => signOut(auth),
    refreshProfile: async () => {
      if (!user) return
      const snapshot = await getDoc(doc(db, 'users', user.uid))
      setProfile(snapshot.exists() ? snapshot.data() : null)
    },
  }), [user, profile, loading, profileError])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
