import type { ReactNode } from "react";
import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabaseUntyped } from "@/lib/supabase";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { BottomNavBar } from "@/components/mobile/BottomNavBar";
import { NotificationDropdown } from "@/components/NotificationDropdown";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  Briefcase,
  Clock,
  User,
  Users,
  LogOut,
  Menu,
  X,
  Settings,
  ClipboardList,
  Activity,
  Building2,
  AlertTriangle,
  FileBarChart,
  Shield,
  Crown,
  Download,
  CheckCircle,
} from "lucide-react";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { useAdminPermissions, type AdminModule } from "@/hooks/useAdminPermissions";
import { useAdminLateAlerts } from "@/hooks/useAdminLateAlerts";

interface DashboardLayoutProps {
  children: ReactNode;
}

const menuItems = {
  worker: [
    { label: 'Dashboard', href: '/worker', icon: LayoutDashboard },
    { label: 'Diárias Disponíveis', href: '/worker/jobs', icon: Briefcase },
    { label: 'Minhas Diárias', href: '/worker/my-jobs', icon: ClipboardList },
    { label: 'Histórico', href: '/worker/history', icon: Clock },
    { label: 'Meu Perfil', href: '/worker/profile', icon: User },
  ],
  admin: [
    { label: 'Dashboard', href: '/admin', icon: LayoutDashboard, module: 'dashboard' as AdminModule },
    { label: 'Diárias', href: '/admin/jobs', icon: Briefcase, module: 'jobs' as AdminModule },
    { label: 'Clientes', href: '/admin/clients', icon: Building2, module: 'clients' as AdminModule },
    { label: 'Prestadores', href: '/admin/workers', icon: Users, module: 'workers' as AdminModule },
    { label: 'Monitoramento', href: '/admin/monitoring', icon: Activity, module: 'monitoring' as AdminModule },
    { label: 'Desistências', href: '/admin/withdrawals', icon: AlertTriangle, module: 'withdrawals' as AdminModule },
    { label: 'Relatórios', href: '/admin/reports', icon: FileBarChart, module: 'reports' as AdminModule },
    { label: 'Usuários', href: '/admin/users', icon: Shield, module: 'users' as AdminModule },
  ],
  client: [
    { label: 'Dashboard', href: '/client', icon: LayoutDashboard },
    { label: 'Minhas Diárias', href: '/client/jobs', icon: Briefcase },
    { label: 'Prestadores', href: '/client/workers', icon: Users },
    { label: 'Histórico', href: '/client/history', icon: Clock },
  ],
};

const roleColors = {
  worker: 'bg-gradient-to-r from-blue-600 to-blue-700',
  admin: 'bg-gradient-to-r from-purple-600 to-indigo-600',
  client: 'bg-gradient-to-r from-blue-700 to-indigo-700',
};

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [newWithdrawalsCount, setNewWithdrawalsCount] = useState(0);
  const { hasPermission, isSuperAdmin } = useAdminPermissions();
  const { count: lateAlertsCount } = useAdminLateAlerts(profile?.role === 'admin');
  const { canInstall, hasNativePrompt, isInstalled, isIOS, install } = usePWAInstall();
  const [installing, setInstalling] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // Buscar contagem de desistências recentes (últimas 24h) para admin
  useEffect(() => {
    if (profile?.role === 'admin') {
      loadWithdrawalsCount();
    }
  }, [profile?.role, location.pathname]);

  async function loadWithdrawalsCount() {
    try {
      const yesterday = new Date();
      yesterday.setHours(yesterday.getHours() - 24);

      const { count } = await supabaseUntyped
        .from('withdrawal_history')
        .select('*', { count: 'exact', head: true })
        .gte('withdrawn_at', yesterday.toISOString());

      setNewWithdrawalsCount(count || 0);
    } catch (error) {
      console.error('Error loading withdrawals count:', error);
    }
  }

  // Mostrar loading APENAS se não temos profile
  // Se temos profile (do cache), mostrar conteúdo mesmo durante atualização em background
  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  const allItems = menuItems[profile.role];
  // Filter admin menu items by permissions
  const items = profile.role === 'admin'
    ? allItems.filter(item => {
        const mod = (item as { module?: AdminModule }).module;
        return !mod || hasPermission(mod);
      })
    : allItems;
  const userName = profile.name;
  const initials = userName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  async function handleLogout() {
    await signOut();
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile menu backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - hidden on mobile when using bottom nav */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r shadow-sm transform transition-transform duration-200 ease-in-out md:translate-x-0 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b px-6">
          <Link to={`/${profile.role}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <img src="/logo.png" alt="Sama Conecta" className="w-9 h-9 object-contain" />
            <span className="text-xl font-bold text-blue-700">Sama Conecta</span>
          </Link>
          <button
            className="md:hidden p-2 hover:bg-slate-100 rounded-lg"
            onClick={() => setMobileMenuOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {profile.role === 'admin' && isSuperAdmin && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 mb-1 text-xs font-semibold text-amber-700 bg-amber-50 rounded-lg border border-amber-200">
              <Crown className="h-3.5 w-3.5" />
              Super Admin
            </div>
          )}
          <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Menu Principal
          </p>
          {items.map((item) => {
            const isActive = location.pathname === item.href;
            const Icon = item.icon;
            const showWithdrawalsBadge = item.href === '/admin/withdrawals' && newWithdrawalsCount > 0;
            const showLateAlertsBadge = item.href === '/admin/monitoring' && lateAlertsCount > 0;
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5" />
                  {item.label}
                </div>
                {showWithdrawalsBadge && (
                  <Badge className="text-xs bg-red-500 text-white hover:bg-red-600">
                    {newWithdrawalsCount}
                  </Badge>
                )}
                {showLateAlertsBadge && (
                  <Badge className="text-xs bg-orange-500 text-white hover:bg-orange-600">
                    {lateAlertsCount}
                  </Badge>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Install & Logout */}
        <div className="p-4 border-t space-y-1">
          {canInstall && (
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              disabled={installing}
              onClick={async () => {
                if (hasNativePrompt) {
                  setInstalling(true);
                  await install();
                  setInstalling(false);
                } else {
                  setShowIOSGuide(true);
                  setMobileMenuOpen(false);
                }
              }}
            >
              <Download className="h-5 w-5" />
              {installing ? 'Instalando...' : 'Instalar Aplicativo'}
            </Button>
          )}
          {isInstalled && (
            <div className="flex items-center gap-3 px-4 py-2 text-xs text-green-600">
              <CheckCircle className="h-4 w-4" />
              Aplicativo instalado
            </div>
          )}
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-slate-600 hover:text-red-600 hover:bg-red-50"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5" />
            Sair da Conta
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="md:pl-72">
        {/* Top header - Simplified on mobile */}
        <header className={`sticky top-0 z-30 border-b bg-white/80 backdrop-blur-sm flex items-center justify-between px-4 md:px-6 ${isMobile ? 'h-14' : 'h-16'}`}>
          {isMobile ? (
            // Mobile Header - Simplified
            <>
              <Link to={`/${profile.role}`} className="flex items-center gap-2">
                <img src="/logo.png" alt="Sama Conecta" className="w-8 h-8 object-contain" />
                <span className="text-lg font-bold text-blue-700">Sama Conecta</span>
              </Link>
              <div className="flex items-center gap-1">
                {canInstall && (
                  <button
                    className="p-2 hover:bg-blue-50 rounded-lg text-blue-600"
                    disabled={installing}
                    onClick={async () => {
                      if (hasNativePrompt) {
                        setInstalling(true);
                        await install();
                        setInstalling(false);
                      } else {
                        setShowIOSGuide(true);
                      }
                    }}
                    aria-label="Instalar aplicativo"
                  >
                    <Download className="h-5 w-5" />
                  </button>
                )}
                <NotificationDropdown />
                <button
                  className="p-2 hover:bg-slate-100 rounded-lg"
                  onClick={() => setMobileMenuOpen(true)}
                >
                  <Menu className="h-5 w-5" />
                </button>
              </div>
            </>
          ) : (
            // Desktop Header
            <>
              <div className="flex items-center gap-4">
                <div>
                  <h1 className="text-lg font-semibold text-slate-900">
                    {profile.role === 'worker' && 'Painel do Trabalhador'}
                    {profile.role === 'admin' && 'Painel Administrativo'}
                    {profile.role === 'client' && 'Painel da Empresa'}
                  </h1>
                  <p className="text-xs text-muted-foreground hidden sm:block">
                    Bem-vindo de volta, {userName.split(' ')[0]}!
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <NotificationDropdown />

                <Button variant="ghost" size="icon" className="hidden sm:flex">
                  <Settings className="h-5 w-5 text-slate-600" />
                  <span className="sr-only">Configurações</span>
                </Button>

                <div className="hidden sm:flex items-center gap-3 ml-2 pl-4 border-l">
                  <Avatar className="h-9 w-9 ring-2 ring-slate-100">
                    <AvatarImage src={profile.avatar_url || ''} />
                    <AvatarFallback className={`${roleColors[profile.role]} text-white text-sm font-medium`}>
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden lg:block">
                    <p className="text-sm font-medium">{userName}</p>
                    <p className="text-xs text-muted-foreground">{profile.email}</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </header>

        {/* Page content - Add padding bottom for mobile bottom nav */}
        <main className={`p-4 md:p-6 lg:p-8 ${isMobile ? 'pb-24' : ''}`}>
          {children}
        </main>
      </div>

      {/* Bottom Navigation - Mobile only */}
      {isMobile && <BottomNavBar />}

      {/* iOS / Manual Install Guide Modal */}
      {showIOSGuide && (
        <>
          <div className="fixed inset-0 bg-black/50 z-[60]" onClick={() => setShowIOSGuide(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-[61] bg-white rounded-t-2xl p-6 shadow-xl max-h-[80vh] overflow-y-auto animate-in slide-in-from-bottom">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Instalar Sama Conecta</h3>
              <button onClick={() => setShowIOSGuide(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>
            <div className="flex items-center gap-3 mb-5 p-3 bg-blue-50 rounded-xl">
              <img src="/pwa-192x192.png" alt="Sama Conecta" className="w-12 h-12 rounded-xl" />
              <div>
                <p className="font-medium text-slate-900">Sama Conecta</p>
                <p className="text-xs text-slate-500">Acesso rápido pela tela inicial</p>
              </div>
            </div>
            {isIOS ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold">1</span>
                  <p className="text-sm text-slate-700 pt-1">
                    Toque no ícone <strong>Compartilhar</strong> <span className="inline-block align-middle">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                    </span> na barra do Safari
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold">2</span>
                  <p className="text-sm text-slate-700 pt-1">
                    Role para baixo e toque em <strong>"Adicionar à Tela de Início"</strong>
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold">3</span>
                  <p className="text-sm text-slate-700 pt-1">
                    Toque em <strong>"Adicionar"</strong> para confirmar
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold">1</span>
                  <p className="text-sm text-slate-700 pt-1">
                    Toque no menu <strong>⋮</strong> (três pontos) no canto superior direito do navegador
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold">2</span>
                  <p className="text-sm text-slate-700 pt-1">
                    Toque em <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold">3</span>
                  <p className="text-sm text-slate-700 pt-1">
                    Confirme tocando em <strong>"Instalar"</strong>
                  </p>
                </div>
              </div>
            )}
            <Button
              className="w-full mt-6"
              onClick={() => setShowIOSGuide(false)}
            >
              Entendi
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
