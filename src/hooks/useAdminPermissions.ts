import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabaseUntyped } from '@/lib/supabase'

export type AdminModule = 'dashboard' | 'jobs' | 'clients' | 'workers' | 'monitoring' | 'withdrawals' | 'reports' | 'users'

export const ADMIN_MODULES: { key: AdminModule; label: string; description: string }[] = [
  { key: 'dashboard', label: 'Dashboard', description: 'Painel principal com estatísticas' },
  { key: 'jobs', label: 'Diárias', description: 'Criar e gerenciar diárias' },
  { key: 'clients', label: 'Clientes', description: 'Cadastro e gestão de empresas' },
  { key: 'workers', label: 'Prestadores', description: 'Gestão de prestadores de serviço' },
  { key: 'monitoring', label: 'Monitoramento', description: 'Monitoramento em tempo real' },
  { key: 'withdrawals', label: 'Desistências', description: 'Gestão de desistências' },
  { key: 'reports', label: 'Relatórios', description: 'Relatórios e exportações' },
  { key: 'users', label: 'Usuários', description: 'Gerenciar usuários e permissões' },
]

// Map route paths to module keys
const ROUTE_MODULE_MAP: Record<string, AdminModule> = {
  '/admin': 'dashboard',
  '/admin/jobs': 'jobs',
  '/admin/jobs/new': 'jobs',
  '/admin/clients': 'clients',
  '/admin/clients/new': 'clients',
  '/admin/workers': 'workers',
  '/admin/monitoring': 'monitoring',
  '/admin/withdrawals': 'withdrawals',
  '/admin/reports': 'reports',
  '/admin/users': 'users',
}

export function getModuleForRoute(path: string): AdminModule | null {
  // Direct match first
  if (ROUTE_MODULE_MAP[path]) return ROUTE_MODULE_MAP[path]

  // Check dynamic routes (e.g. /admin/clients/:id, /admin/jobs/:id/edit)
  if (path.startsWith('/admin/clients/')) return 'clients'
  if (path.startsWith('/admin/jobs/')) return 'jobs'

  return null
}

export function useAdminPermissions() {
  const { profile } = useAuth()
  const [permissions, setPermissions] = useState<AdminModule[]>([])
  const [loading, setLoading] = useState(true)

  const isSuperAdmin = profile?.is_super_admin === true

  useEffect(() => {
    if (profile?.role !== 'admin') {
      setPermissions([])
      setLoading(false)
      return
    }

    if (isSuperAdmin) {
      // Super admin has all permissions
      setPermissions(ADMIN_MODULES.map(m => m.key))
      setLoading(false)
      return
    }

    // Fetch permissions from database
    async function fetchPermissions() {
      const { data } = await supabaseUntyped
        .from('admin_permissions')
        .select('module')
        .eq('user_id', profile!.id)

      setPermissions((data || []).map((p: { module: string }) => p.module as AdminModule))
      setLoading(false)
    }

    fetchPermissions()
  }, [profile?.id, profile?.role, isSuperAdmin])

  function hasPermission(module: AdminModule): boolean {
    if (isSuperAdmin) return true
    return permissions.includes(module)
  }

  function canAccessRoute(path: string): boolean {
    if (isSuperAdmin) return true
    const module = getModuleForRoute(path)
    if (!module) return true // Unknown routes default to allowed
    return permissions.includes(module)
  }

  return {
    permissions,
    loading,
    isSuperAdmin,
    hasPermission,
    canAccessRoute,
  }
}
