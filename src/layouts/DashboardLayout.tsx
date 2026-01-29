import type { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

interface DashboardLayoutProps {
  children: ReactNode;
}

const menuItems = {
  worker: [
    { label: 'Dashboard', href: '/worker' },
    { label: 'Vagas Disponíveis', href: '/worker/jobs' },
    { label: 'Minhas Candidaturas', href: '/worker/applications' },
    { label: 'Histórico', href: '/worker/history' },
    { label: 'Meu Perfil', href: '/worker/profile' },
  ],
  admin: [
    { label: 'Dashboard', href: '/admin' },
    { label: 'Nova Vaga', href: '/admin/jobs/new' },
  ],
  client: [
    { label: 'Dashboard', href: '/client' },
    { label: 'Minhas Vagas', href: '/client/jobs' },
    { label: 'Nova Vaga', href: '/client/jobs/new' },
    { label: 'Candidatos', href: '/client/candidates' },
    { label: 'Histórico', href: '/client/history' },
  ],
};

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (!profile) return null;

  const items = menuItems[profile.role];
  const userName = profile.name;
  const initials = userName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  async function handleLogout() {
    await signOut();
    navigate('/');
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-background border-r hidden md:flex md:flex-col">
        <div className="flex h-16 items-center border-b px-6">
          <Link to="/" className="text-xl font-bold text-primary">SAMA</Link>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {items.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t">
          <Button variant="ghost" className="w-full justify-start text-muted-foreground" onClick={handleLogout}>
            Sair
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="md:pl-64">
        {/* Top header */}
        <header className="sticky top-0 z-40 h-16 border-b bg-background flex items-center justify-between px-6">
          <h1 className="text-lg font-semibold">
            {profile.role === 'worker' && 'Painel do Trabalhador'}
            {profile.role === 'admin' && 'Painel Administrativo'}
            {profile.role === 'client' && 'Painel da Empresa'}
          </h1>

          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon">
              <span className="sr-only">Notificações</span>
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </Button>

            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={profile.avatar_url || ''} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium hidden sm:inline">{userName}</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
