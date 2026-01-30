import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase, supabaseUntyped } from '@/lib/supabase'
import type { Database } from '@/types/database'

type UserRole = Database['public']['Enums']['user_role']

interface UserProfile {
  id: string
  email: string
  name: string
  role: UserRole
  phone: string | null
  avatar_url: string | null
}

interface WorkerProfile {
  id: string
  cpf: string
  skills: string[]
  rating: number
  total_jobs: number
  documents_verified: boolean
}

interface ClientProfile {
  id: string
  cnpj: string
  company_name: string
  address: string | null
}

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  workerProfile: WorkerProfile | null
  clientProfile: ClientProfile | null
  session: Session | null
  loading: boolean
  isProfileComplete: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (email: string, password: string, metadata: SignUpMetadata) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

interface SignUpMetadata {
  name: string
  role: UserRole
  phone?: string
  cpf?: string
  cnpj?: string
  company_name?: string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [workerProfile, setWorkerProfile] = useState<WorkerProfile | null>(null)
  const [clientProfile, setClientProfile] = useState<ClientProfile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [isProfileComplete, setIsProfileComplete] = useState(false)

  useEffect(() => {
    let isMounted = true

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id, isMounted)
      } else {
        setLoading(false)
      }
    }).catch(() => {
      if (isMounted) setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return

        // Reset state on sign out
        if (event === 'SIGNED_OUT') {
          setSession(null)
          setUser(null)
          setProfile(null)
          setWorkerProfile(null)
          setClientProfile(null)
          setIsProfileComplete(false)
          setLoading(false)
          return
        }

        setSession(session)
        setUser(session?.user ?? null)

        if (session?.user) {
          setLoading(true)
          await fetchProfile(session.user.id, isMounted)
        } else {
          setProfile(null)
          setWorkerProfile(null)
          setClientProfile(null)
          setIsProfileComplete(false)
          setLoading(false)
        }
      }
    )

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  async function fetchProfile(userId: string, isMounted: boolean = true) {
    try {
      const { data, error } = await supabaseUntyped
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (!isMounted) return

      if (error) throw error

      const userProfile = data as UserProfile
      setProfile(userProfile)

      // Fetch role-specific profile
      if (userProfile.role === 'worker') {
        const { data: workerData } = await supabaseUntyped
          .from('workers')
          .select('*')
          .eq('id', userId)
          .single()

        if (!isMounted) return

        if (workerData) {
          setWorkerProfile(workerData as WorkerProfile)
          setIsProfileComplete(true)
        } else {
          setWorkerProfile(null)
          setIsProfileComplete(false)
        }
        setClientProfile(null)
      } else if (userProfile.role === 'client') {
        const { data: clientData } = await supabaseUntyped
          .from('clients')
          .select('*')
          .eq('id', userId)
          .single()

        if (!isMounted) return

        if (clientData) {
          setClientProfile(clientData as ClientProfile)
          setIsProfileComplete(true)
        } else {
          setClientProfile(null)
          setIsProfileComplete(false)
        }
        setWorkerProfile(null)
      } else if (userProfile.role === 'admin') {
        setIsProfileComplete(true)
        setWorkerProfile(null)
        setClientProfile(null)
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
      if (isMounted) {
        setProfile(null)
        setIsProfileComplete(false)
      }
    } finally {
      if (isMounted) {
        setLoading(false)
      }
    }
  }

  async function refreshProfile() {
    if (user) {
      await fetchProfile(user.id)
    }
  }

  async function signIn(email: string, password: string) {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      return { error }
    } catch (error) {
      return { error: error as Error }
    }
  }

  async function signUp(email: string, password: string, metadata: SignUpMetadata) {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: metadata.name,
            role: metadata.role,
            phone: metadata.phone,
          },
        },
      })

      if (error) return { error }

      return { error: null }
    } catch (error) {
      return { error: error as Error }
    }
  }

  async function signOut() {
    // Clear local state immediately
    setUser(null)
    setProfile(null)
    setWorkerProfile(null)
    setClientProfile(null)
    setSession(null)
    setIsProfileComplete(false)
    setLoading(false)

    // Sign out from Supabase (this will also trigger onAuthStateChange)
    await supabase.auth.signOut({ scope: 'local' })
  }

  const value = {
    user,
    profile,
    workerProfile,
    clientProfile,
    session,
    loading,
    isProfileComplete,
    signIn,
    signUp,
    signOut,
    refreshProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
