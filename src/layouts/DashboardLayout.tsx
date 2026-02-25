import type { ReactNode } from "react";
import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabaseUntyped } from "@/lib/supabase";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { BottomNavBar } from "@/components/mobile/BottomNavBar";
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
  Bell,
  Menu,
  X,
  Settings,
  ClipboardList,
  Activity,
  Building2,
  AlertTriangle
} from "lucide-react";

interface DashboardLayoutProps {
  children: ReactNode;
}

const menuItems = {
  worker: [
    { label: 'Dashboard', href: '/worker', icon: LayoutDashboard },
    { label: 'Vagas Disponíveis', href: '/worker/jobs', icon: Briefcase },
    { label: 'Meus Trabalhos', href: '/worker/my-jobs', icon: ClipboardList },
    { label: 'Histórico', href: '/worker/history', icon: Clock },
    { label: 'Meu Perfil', href: '/worker/profile', icon: User },
  ],
  admin: [
    { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { label: 'Clientes', href: '/admin/clients', icon: Building2 },
    { label: 'Trabalhadores', href: '/admin/workers', icon: Users },
    { label: 'Monitoramento', href: '/admin/monitoring', icon: Activity },
    { label: 'Desistências', href: '/admin/withdrawals', icon: AlertTriangle },
  ],
  client: [
    { label: 'Dashboard', href: '/client', icon: LayoutDashboard },
    { label: 'Minhas Vagas', href: '/client/jobs', icon: Briefcase },
    { label: 'Trabalhadores', href: '/client/workers', icon: Users },
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

  const items = menuItems[profile.role];
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
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
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
          <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Menu Principal
          </p>
          {items.map((item) => {
            const isActive = location.pathname === item.href;
            const Icon = item.icon;
            const showWithdrawalsBadge = item.href === '/admin/withdrawals' && newWithdrawalsCount > 0;
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
              </Link>
            );
          })}
        </nav>

        {/* Logout button */}
        <div className="p-4 border-t">
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
              <Link to="/" className="flex items-center gap-2">
                <img src="/logo.png" alt="Sama Conecta" className="w-8 h-8 object-contain" />
                <span className="text-lg font-bold text-blue-700">Sama Conecta</span>
              </Link>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="relative h-9 w-9">
                  <Bell className="h-5 w-5 text-slate-600" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                </Button>
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
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5 text-slate-600" />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
                  <span className="sr-only">Notificações</span>
                </Button>

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
    </div>
  );
}
