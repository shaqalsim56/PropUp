import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { Profile } from '../types/database.types'

interface AuthContextValue {
  session: Session | null
  profile: Profile | null
  loading: boolean
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  profile: null,
  loading: true,
  refreshProfile: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async (userId: string) => {
    let { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    // The DB trigger may still be running on first signup — retry once
    if (!data) {
      await new Promise(r => setTimeout(r, 800))
      const { data: retried } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      data = retried
    }

    setProfile(data)
    setLoading(false)
  }, [])

  const refreshProfile = useCallback(async () => {
    if (session?.user.id) await fetchProfile(session.user.id)
  }, [session, fetchProfile])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session)
      if (session) {
        await fetchProfile(session.user.id)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [fetchProfile])

  return (
    <AuthContext.Provider value={{ session, profile, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
