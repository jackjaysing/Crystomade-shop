import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import {
  fetchMemberProfile,
  signInMember,
  signOutMember,
  signUpMember,
} from '../lib/api/members'
import { supabase } from '../lib/supabase'
import type { MemberProfile } from '../lib/types'
import type { MemberLoginInput, MemberRegisterInput } from '../lib/validateMember'

interface AuthContextValue {
  session: Session | null
  user: User | null
  profile: MemberProfile | null
  loading: boolean
  refreshProfile: () => Promise<void>
  register: (input: MemberRegisterInput) => Promise<void>
  login: (input: MemberLoginInput) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<MemberProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (userId: string) => {
    const data = await fetchMemberProfile(userId)
    setProfile(data)
  }, [])

  const refreshProfile = useCallback(async () => {
    if (!user?.id) {
      setProfile(null)
      return
    }
    await loadProfile(user.id)
  }, [loadProfile, user?.id])

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session)
      setUser(data.session?.user ?? null)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setUser(nextSession?.user ?? null)
      setLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!user?.id) {
      setProfile(null)
      return
    }
    void loadProfile(user.id)
  }, [user?.id, loadProfile])

  const register = useCallback(async (input: MemberRegisterInput) => {
    const created = await signUpMember(input)
    const { data, error } = await supabase.auth.signInWithPassword({
      email: created.email!,
      password: input.password,
    })
    if (error) throw error
    setSession(data.session)
    setUser(data.user)
    if (data.user?.id) await loadProfile(data.user.id)
  }, [loadProfile])

  const login = useCallback(
    async (input: MemberLoginInput) => {
      const nextSession = await signInMember(input)
      setSession(nextSession)
      setUser(nextSession.user)
      if (nextSession.user?.id) await loadProfile(nextSession.user.id)
    },
    [loadProfile]
  )

  const logout = useCallback(async () => {
    await signOutMember()
    setSession(null)
    setUser(null)
    setProfile(null)
  }, [])

  const value = useMemo(
    () => ({
      session,
      user,
      profile,
      loading,
      refreshProfile,
      register,
      login,
      logout,
    }),
    [session, user, profile, loading, refreshProfile, register, login, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
