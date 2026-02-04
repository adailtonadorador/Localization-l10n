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
  session: 'sama_session_cache',
}

// Helper functions for cache - sem expiração de tempo, só limpa no logout
function getCachedData<T>(key: string): T | null {
  try {
    const cached = localStorage.getItem(key)
    if (cached) {
      const { data } = JSON.parse(cached)
      return data as T
    }
  } catch {
    localStorage.removeItem(key)
  }
  return null
}

function setCachedData<T>(key: string, data: T | null) {
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
  const cachedProfile = getCachedData<UserProfile>(CACHE_KEYS.profile)
  const cachedWorkerProfile = getCachedData<WorkerProfile>(CACHE_KEYS.workerProfile)
  const cachedClientProfile = getCachedData<ClientProfile>(CACHE_KEYS.clientProfile)

  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(cachedProfile)
  const [workerProfile, setWorkerProfile] = useState<WorkerProfile | null>(cachedWorkerProfile)
  const [clientProfile, setClientProfile] = useState<ClientProfile | null>(cachedClientProfile)
  const [session, setSession] = useState<Session | null>(null)
  // Se temos cache, não mostrar loading inicial
  const [loading, setLoading] = useState(!cachedProfile)
  const [isProfileComplete, setIsProfileComplete] = useState(!!cachedProfile)

  // Flag to skip auth state changes during manual sign-in process
  const isManualSignInRef = useRef(false)
  // Flag to track if we've done initial session check
  const initialCheckDoneRef = useRef(false)

  useEffect(() => {
    let isMounted = true

    async function initializeAuth() {
      try {
        // Get initial session
        const { data: { session: currentSession }, error } = await supabase.auth.getSession()

        if (!isMounted) return

        if (error) {
          console.error('Error getting session:', error)
          // Se temos cache, manter o usuário logado
          if (!cachedProfile) {
            clearAllCache()
            setLoading(false)
          }
          initialCheckDoneRef.current = true
          return
        }

        if (currentSession?.user) {
          // Verificar se trabalhador está bloqueado
          const isBlocked = await checkIfWorkerBlocked(currentSession.user.id)

          if (!isMounted) return

          if (isBlocked) {
            clearAllCache()
            setProfile(null)
            setWorkerProfile(null)
            setClientProfile(null)
            setIsProfileComplete(false)
            await supabase.auth.signOut({ scope: 'local' })
            setLoading(false)
            initialCheckDoneRef.current = true
            return
          }

          setSession(currentSession)
          setUser(currentSession.user)

          // Atualizar profile em background (não bloqueia a UI)
          fetchProfileInBackground(currentSession.user.id, isMounted)
        } else if (!cachedProfile) {
          // Não há sessão e não há cache
          clearAllCache()
          setLoading(false)
        } else {
          // Não há sessão mas temos cache - limpar tudo (sessão expirou)
          clearAllCache()
          setProfile(null)
          setWorkerProfile(null)
          setClientProfile(null)
          setIsProfileComplete(false)
          setLoading(false)
        }

        initialCheckDoneRef.current = true
      } catch (err) {
        console.error('Auth initialization error:', err)
        if (isMounted && !cachedProfile) {
          setLoading(false)
        }
        initialCheckDoneRef.current = true
      }
    }

    initializeAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!isMounted) return

        console.log('Auth event:', event)

        // Skip processing if we're in manual sign-in mode
        if (isManualSignInRef.current && event === 'SIGNED_IN') {
          return
        }

        // Eventos que devem limpar completamente o estado
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

        // TOKEN_REFRESHED - apenas atualizar sessão, manter profile
        if (event === 'TOKEN_REFRESHED' && newSession) {
          setSession(newSession)
          setUser(newSession.user)
          // Não precisa fazer nada com o profile - manter o que temos
          return
        }

        // SIGNED_IN ou INITIAL_SESSION - atualizar tudo
        if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && newSession?.user) {
          setSession(newSession)
          setUser(newSession.user)

          // Só mostrar loading se não temos profile em cache
          if (!profile && !cachedProfile) {
            setLoading(true)
          }

          // Atualizar profile em background
          fetchProfileInBackground(newSession.user.id, isMounted)
          return
        }

        // USER_UPDATED - atualizar dados do user
        if (event === 'USER_UPDATED' && newSession?.user) {
          setSession(newSession)
          setUser(newSession.user)
          fetchProfileInBackground(newSession.user.id, isMounted)
          return
        }

        // Para outros eventos, apenas atualizar sessão se disponível
        if (newSession) {
          setSession(newSession)
          setUser(newSession.user)
        }
      }
    )

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  async function checkIfWorkerBlocked(userId: string): Promise<boolean> {
    try {
      const { data: userData } = await supabaseUntyped
        .from('users')
        .select('role')
        .eq('id', userId)
        .single()

      if (userData?.role === 'worker') {
        const { data: workerData } = await supabaseUntyped
          .from('workers')
          .select('is_active')
          .eq('id', userId)
          .single()

        return workerData?.is_active === false
      }
    } catch (err) {
      console.error('Error checking worker status:', err)
    }
    return false
  }

  // Busca profile sem bloquear a UI - atualiza em background
  async function fetchProfileInBackground(userId: string, isMounted: boolean) {
    try {
      const { data, error } = await supabaseUntyped
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (!isMounted) return

      if (error) {
        console.error('Error fetching profile:', error)
        // NÃO limpar o profile em caso de erro - manter o cache
        setLoading(false)
        return
      }

      const userProfile = data as UserProfile
      setProfile(userProfile)
      setCachedData(CACHE_KEYS.profile, userProfile)

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
          setCachedData(CACHE_KEYS.workerProfile, workerProfileData)
          setIsProfileComplete(true)
        } else {
          setWorkerProfile(null)
          setCachedData(CACHE_KEYS.workerProfile, null)
          setIsProfileComplete(false)
        }
        setClientProfile(null)
        setCachedData(CACHE_KEYS.clientProfile, null)
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
          setCachedData(CACHE_KEYS.clientProfile, clientProfileData)
          setIsProfileComplete(true)
        } else {
          setClientProfile(null)
          setCachedData(CACHE_KEYS.clientProfile, null)
          setIsProfileComplete(false)
        }
        setWorkerProfile(null)
        setCachedData(CACHE_KEYS.workerProfile, null)
      } else if (userProfile.role === 'admin') {
        setIsProfileComplete(true)
        setWorkerProfile(null)
        setClientProfile(null)
        setCachedData(CACHE_KEYS.workerProfile, null)
        setCachedData(CACHE_KEYS.clientProfile, null)
      }
    } catch (err) {
      console.error('Error in fetchProfileInBackground:', err)
      // NÃO limpar estados em caso de erro - manter o cache
    } finally {
      if (isMounted) {
        setLoading(false)
      }
    }
  }

  async function refreshProfile() {
    const currentUser = user || (session?.user)
    if (currentUser) {
      await fetchProfileInBackground(currentUser.id, true)
    }
  }

  async function signIn(email: string, password: string) {
    try {
      isManualSignInRef.current = true

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        isManualSignInRef.current = false
        return { error }
      }

      if (data.user) {
        // Check if worker is blocked
        const isBlocked = await checkIfWorkerBlocked(data.user.id)

        if (isBlocked) {
          await supabase.auth.signOut({ scope: 'local' })
          isManualSignInRef.current = false
          return { error: new Error('WORKER_BLOCKED') }
        }

        setSession(data.session)
        setUser(data.user)
        setLoading(true)
        await fetchProfileInBackground(data.user.id, true)
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

    // Sign out from Supabase
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
