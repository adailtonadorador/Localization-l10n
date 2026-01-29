import type { ReactNode } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

interface DashboardLayoutProps {
  children: ReactNode;
  userRole: 'worker' | 'admin' | 'client';
  userName: string;
}

const menuItems = {
  worker: [
    { label: 'Dashboard', href: '/worker' },
    { label: 'Vagas Disponíveis', href: '/worker/jobs' },
    { label: 'Minhas Candidaturas', href: '/worker/applications' },
    { label: 'Histórico', href: '/worker/history' },
    { label: 'Perfil', href: '/worker/profile' },
  ],
  admin: [
    { label: 'Dashboard', href: '/admin' },
    { label: 'Vagas', href: '/admin/jobs' },
    { label: 'Trabalhadores', href: '/admin/workers' },
    { label: 'Empresas', href: '/admin/clients' },
    { label: 'Relatórios', href: '/admin/reports' },
  ],
  client: [
    { label: 'Dashboard', href: '/client' },
    { label: 'Minhas Vagas', href: '/client/jobs' },
    { label: 'Nova Vaga', href: '/client/jobs/new' },
    { label: 'Trabalhadores', href: '/client/workers' },
    { label: 'Histórico', href: '/client/history' },
  ],
};

export function DashboardLayout({ children, userRole, userName }: DashboardLayoutProps) {
  const items = menuItems[userRole];
  const initials = userName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-background border-r hidden md:block">
        <div className="flex h-16 items-center border-b px-6">
          <span className="text-xl font-bold text-primary">SAMA</span>
        </div>

        <nav className="p-4 space-y-2">
          {items.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              {item.label}
            </a>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <div className="md:pl-64">
        {/* Top header */}
        <header className="sticky top-0 z-40 h-16 border-b bg-background flex items-center justify-between px-6">
          <h1 className="text-lg font-semibold">
            {userRole === 'worker' && 'Painel do Trabalhador'}
            {userRole === 'admin' && 'Painel Administrativo'}
            {userRole === 'client' && 'Painel da Empresa'}
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
                <AvatarImage src="" />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">{userName}</span>
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
