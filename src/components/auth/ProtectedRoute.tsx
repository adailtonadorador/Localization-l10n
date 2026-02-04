import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import type { Database } from '@/types/database'

type UserRole = Database['public']['Enums']['user_role']

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: UserRole[]
  requireCompleteProfile?: boolean
}

export function ProtectedRoute({
  children,
  allowedRoles,
  requireCompleteProfile = true
}: ProtectedRouteProps) {
  const { user, profile, loading, isProfileComplete } = useAuth()
  const location = useLocation()

  // Se está carregando e não tem profile em cache, mostrar loading
  if (loading && !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Só redireciona para login se não tem usuário E não tem profile em cache
  // Isso evita redirecionamento quando user fica temporariamente null durante navegação
  if (!user && !profile) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Se não tem profile em cache, aguardar carregamento
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Check if profile needs to be completed
  if (requireCompleteProfile && !isProfileComplete && profile.role !== 'admin') {
    return <Navigate to="/complete-profile" replace />
  }

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    // Redirect to appropriate dashboard based on role
    const redirectPath = profile.role === 'worker'
      ? '/worker'
      : profile.role === 'client'
        ? '/client'
        : '/admin'
    return <Navigate to={redirectPath} replace />
  }

  return <>{children}</>
}
