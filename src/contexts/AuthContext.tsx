import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from 'react'
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
  is_active: boolean
  pix_key: string | null
  address: string | null
  cep: string | null
  logradouro: string | null
  numero: string | null
  complemento: string | null
  bairro: string | null
  cidade: string | null
  uf: string | null
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

// Cache keys for localStorage
const CACHE_KEYS = {
  profile: 'sama_profile_cache',
  workerProfile: 'sama_worker_profile_cache',
  clientProfile: 'sama_client_profile_cache',
}

// Helper functions for cache
function getCachedProfile<T>(key: string): T | null {
  try {
    const cached = localStorage.getItem(key)
    if (cached) {
      const { data, timestamp } = JSON.parse(cached)
      // Cache válido por 24 horas
      if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
        return data as T
      }
      localStorage.removeItem(key)
    }
  } catch {
    localStorage.removeItem(key)
  }
  return null
}

function setCachedProfile<T>(key: string, data: T | null) {
  try {
    if (data) {
      localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }))
    } else {
      localStorage.removeItem(key)
    }
  } catch {
    // Ignore localStorage errors
  }
}

function clearAllCache() {
  Object.values(CACHE_KEYS).forEach(key => localStorage.removeItem(key))
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Inicializar estados com cache do localStorage para evitar tela em branco
  const cachedProfile = getCachedProfile<UserProfile>(CACHE_KEYS.profile)
  const cachedWorkerProfile = getCachedProfile<WorkerProfile>(CACHE_KEYS.workerProfile)
  const cachedClientProfile = getCachedProfile<ClientProfile>(CACHE_KEYS.clientProfile)

  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(cachedProfile)
  const [workerProfile, setWorkerProfile] = useState<WorkerProfile | null>(cachedWorkerProfile)
  const [clientProfile, setClientProfile] = useState<ClientProfile | null>(cachedClientProfile)
  const [session, setSession] = useState<Session | null>(null)
  // Se temos cache, não mostrar loading inicial (dados serão atualizados em background)
  const [loading, setLoading] = useState(!cachedProfile)
  const [isProfileComplete, setIsProfileComplete] = useState(!!cachedProfile)

  // Flag to skip auth state changes during manual sign-in process (using ref for synchronous updates)
  const isManualSignInRef = useRef(false)

  useEffect(() => {
    let isMounted = true

    // Get initial session and check if worker is blocked
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted) return

      if (session?.user) {
        // Check if user is a blocked worker
        const { data: userData } = await supabaseUntyped
          .from('users')
          .select('role')
          .eq('id', session.user.id)
          .single()

        if (userData?.role === 'worker') {
          const { data: workerData } = await supabaseUntyped
            .from('workers')
            .select('is_active')
            .eq('id', session.user.id)
            .single()

          if (workerData && workerData.is_active === false) {
            // Worker is blocked, sign them out and clear cache
            clearAllCache()
            setProfile(null)
            setWorkerProfile(null)
            setClientProfile(null)
            setIsProfileComplete(false)
            await supabase.auth.signOut({ scope: 'local' })
            if (isMounted) setLoading(false)
            return
          }
        }

        setSession(session)
        setUser(session.user)
        fetchProfile(session.user.id, isMounted)
      } else {
        // Não há sessão, limpar cache e estados
        clearAllCache()
        setProfile(null)
        setWorkerProfile(null)
        setClientProfile(null)
        setIsProfileComplete(false)
        setLoading(false)
      }
    }).catch(() => {
      if (isMounted) {
        clearAllCache()
        setProfile(null)
        setWorkerProfile(null)
        setClientProfile(null)
        setIsProfileComplete(false)
        setLoading(false)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return

        // Skip processing if we're in manual sign-in mode (will be handled by signIn function)
        if (isManualSignInRef.current && event === 'SIGNED_IN') {
          return
        }

        // Reset state on sign out
        if (event === 'SIGNED_OUT') {
          setSession(null)
          setUser(null)
          setProfile(null)
          setWorkerProfile(null)
          setClientProfile(null)
          setIsProfileComplete(false)
          setLoading(false)
          clearAllCache()
          return
        }

        setSession(session)
        setUser(session?.user ?? null)

        if (session?.user) {
          // Só mostrar loading se não temos profile em cache
          // Isso evita tela em branco ao renovar token ou mudar de aba
          const hasCachedData = !!getCachedProfile(CACHE_KEYS.profile)
          if (!hasCachedData) {
            setLoading(true)
          }
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
      setCachedProfile(CACHE_KEYS.profile, userProfile)

      // Fetch role-specific profile
      if (userProfile.role === 'worker') {
        const { data: workerData } = await supabaseUntyped
          .from('workers')
          .select('*')
          .eq('id', userId)
          .single()

        if (!isMounted) return

        if (workerData) {
          const workerProfileData = workerData as WorkerProfile
          setWorkerProfile(workerProfileData)
          setCachedProfile(CACHE_KEYS.workerProfile, workerProfileData)
          setIsProfileComplete(true)
        } else {
          setWorkerProfile(null)
          setCachedProfile(CACHE_KEYS.workerProfile, null)
          setIsProfileComplete(false)
        }
        setClientProfile(null)
        setCachedProfile(CACHE_KEYS.clientProfile, null)
      } else if (userProfile.role === 'client') {
        const { data: clientData } = await supabaseUntyped
          .from('clients')
          .select('*')
          .eq('id', userId)
          .single()

        if (!isMounted) return

        if (clientData) {
          const clientProfileData = clientData as ClientProfile
          setClientProfile(clientProfileData)
          setCachedProfile(CACHE_KEYS.clientProfile, clientProfileData)
          setIsProfileComplete(true)
        } else {
          setClientProfile(null)
          setCachedProfile(CACHE_KEYS.clientProfile, null)
          setIsProfileComplete(false)
        }
        setWorkerProfile(null)
        setCachedProfile(CACHE_KEYS.workerProfile, null)
      } else if (userProfile.role === 'admin') {
        setIsProfileComplete(true)
        setWorkerProfile(null)
        setClientProfile(null)
        setCachedProfile(CACHE_KEYS.workerProfile, null)
        setCachedProfile(CACHE_KEYS.clientProfile, null)
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
      if (isMounted) {
        setProfile(null)
        setCachedProfile(CACHE_KEYS.profile, null)
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
      // Set flag to prevent onAuthStateChange from processing during sign-in
      isManualSignInRef.current = true

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        isManualSignInRef.current = false
        return { error }
      }

      // Check if user is a worker and if they are active
      if (data.user) {
        const { data: userData } = await supabaseUntyped
          .from('users')
          .select('role')
          .eq('id', data.user.id)
          .single()

        if (userData?.role === 'worker') {
          const { data: workerData } = await supabaseUntyped
            .from('workers')
            .select('is_active')
            .eq('id', data.user.id)
            .single()

          // If worker exists and is not active, sign them out
          if (workerData && workerData.is_active === false) {
            await supabase.auth.signOut({ scope: 'local' })
            isManualSignInRef.current = false
            return {
              error: new Error('WORKER_BLOCKED')
            }
          }
        }

        // Worker is active or user is not a worker, proceed with setting session
        setSession(data.session)
        setUser(data.user)
        setLoading(true)
        await fetchProfile(data.user.id)
      }

      isManualSignInRef.current = false
      return { error: null }
    } catch (error) {
      isManualSignInRef.current = false
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

    // Clear cached profiles
    clearAllCache()

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
