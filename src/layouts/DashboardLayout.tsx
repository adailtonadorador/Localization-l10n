import type { ReactNode } from "react";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Briefcase,
  Clock,
  User,
  Users,
  PlusCircle,
  LogOut,
  Bell,
  Menu,
  X,
  Settings,
  ClipboardList,
  Activity
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
    { label: 'Nova Vaga', href: '/admin/jobs/new', icon: PlusCircle },
    { label: 'Monitoramento', href: '/admin/monitoring', icon: Activity },
  ],
  client: [
    { label: 'Dashboard', href: '/client', icon: LayoutDashboard },
    { label: 'Minhas Vagas', href: '/client/jobs', icon: Briefcase },
    { label: 'Candidatos', href: '/client/candidates', icon: Users },
    { label: 'Histórico', href: '/client/history', icon: Clock },
  ],
};

const roleColors = {
  worker: 'bg-emerald-500',
  admin: 'bg-purple-500',
  client: 'bg-blue-500',
};

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    navigate('/');
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

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r shadow-sm transform transition-transform duration-200 ease-in-out md:translate-x-0 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b px-6">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <span className="text-lg font-bold text-primary-foreground">S</span>
            </div>
            <span className="text-xl font-bold">SAMA</span>
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
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.label}
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
        {/* Top header */}
        <header className="sticky top-0 z-30 h-16 border-b bg-white/80 backdrop-blur-sm flex items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-4">
            <button
              className="md:hidden p-2 hover:bg-slate-100 rounded-lg"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
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
        </header>

        {/* Page content */}
        <main className="p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
