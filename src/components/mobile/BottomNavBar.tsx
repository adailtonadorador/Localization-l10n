import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  Briefcase,
  ClipboardList,
  Clock,
  User,
  Building2,
  Users,
  FileText,
  AlertTriangle,
  type LucideIcon
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
}

const WORKER_NAV_ITEMS: NavItem[] = [
  {
    label: 'Início',
    href: '/worker',
    icon: LayoutDashboard,
  },
  {
    label: 'Vagas',
    href: '/worker/jobs',
    icon: Briefcase,
  },
  {
    label: 'Trabalhos',
    href: '/worker/my-jobs',
    icon: ClipboardList,
  },
  {
    label: 'Histórico',
    href: '/worker/history',
    icon: Clock,
  },
  {
    label: 'Perfil',
    href: '/worker/profile',
    icon: User,
  },
];

const CLIENT_NAV_ITEMS: NavItem[] = [
  {
    label: 'Início',
    href: '/client',
    icon: LayoutDashboard,
  },
  {
    label: 'Vagas',
    href: '/client/jobs',
    icon: Briefcase,
  },
  {
    label: 'Trabalhadores',
    href: '/client/workers',
    icon: Users,
  },
  {
    label: 'Histórico',
    href: '/client/history',
    icon: Clock,
  },
];

const ADMIN_NAV_ITEMS: NavItem[] = [
  {
    label: 'Início',
    href: '/admin',
    icon: LayoutDashboard,
  },
  {
    label: 'Clientes',
    href: '/admin/clients',
    icon: Building2,
  },
  {
    label: 'Equipe',
    href: '/admin/workers',
    icon: Users,
  },
  {
    label: 'Desistências',
    href: '/admin/withdrawals',
    icon: AlertTriangle,
  },
  {
    label: 'Monitor',
    href: '/admin/monitoring',
    icon: FileText,
  },
];

export function BottomNavBar() {
  const location = useLocation();
  const { profile } = useAuth();

  if (!profile) return null;

  const navItems = profile.role === 'worker'
    ? WORKER_NAV_ITEMS
    : profile.role === 'client'
      ? CLIENT_NAV_ITEMS
      : ADMIN_NAV_ITEMS;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden
                 bg-white/95 backdrop-blur-md border-t border-slate-200
                 shadow-[0_-1px_3px_rgba(0,0,0,0.1)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      role="navigation"
      aria-label="Navegação principal"
    >
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href ||
            (item.href !== '/worker' && item.href !== '/client' && item.href !== '/admin' &&
              location.pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              to={item.href}
              className={`flex flex-col items-center justify-center
                         flex-1 h-full gap-0.5 relative
                         transition-colors duration-150
                         active:scale-95 transform
                         ${isActive ? 'text-blue-700' : 'text-slate-400'}`}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              {item.badge && item.badge > 0 && (
                <span className="absolute top-2 left-1/2 ml-2
                                 w-4 h-4 bg-red-500 rounded-full
                                 flex items-center justify-center
                                 text-white text-[10px] font-bold">
                  {item.badge > 9 ? '9+' : item.badge}
                </span>
              )}
              <Icon
                className={`w-6 h-6 transition-all duration-150 ${isActive ? 'scale-110' : ''}`}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span className={`text-[10px] font-medium transition-opacity duration-150
                               ${isActive ? 'opacity-100' : 'opacity-70'}`}>
                {item.label}
              </span>
              {isActive && (
                <span className="absolute -bottom-0 left-1/2 -translate-x-1/2
                                w-1 h-1 bg-blue-700 rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
