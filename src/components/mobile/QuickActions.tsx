import { Link } from 'react-router-dom';
import {
  Calendar,
  UserPlus,
  TrendingUp,
  Briefcase,
  type LucideIcon
} from 'lucide-react';

interface QuickAction {
  label: string;
  icon: LucideIcon;
  href: string;
  color: string;
  bgColor: string;
  show: boolean;
}

interface QuickActionsProps {
  profileCompleteness: number;
  hasUpcomingJobs?: boolean;
}

export function QuickActions({ profileCompleteness }: QuickActionsProps) {
  const actions: QuickAction[] = [
    {
      label: 'Ver Vagas',
      icon: Briefcase,
      href: '/worker/jobs',
      color: 'text-[#0A2A5A]',
      bgColor: 'bg-blue-100',
      show: true
    },
    {
      label: 'Meus Trabalhos',
      icon: Calendar,
      href: '/worker/my-jobs',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      show: true
    },
    {
      label: 'Completar Perfil',
      icon: UserPlus,
      href: '/worker/profile',
      color: 'text-amber-600',
      bgColor: 'bg-amber-100',
      show: profileCompleteness < 100
    },
    {
      label: 'Meus Ganhos',
      icon: TrendingUp,
      href: '/worker/history',
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      show: true
    },
  ].filter(action => action.show);

  return (
    <div className="mt-4 mb-6">
      <div className="flex items-center justify-between px-1 mb-3">
        <h3 className="text-sm font-semibold text-slate-700">
          Acesso Rápido
        </h3>
        <span className="text-xs text-slate-400">Deslize e explore</span>
      </div>
      <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
        <div
          className="flex gap-4 pb-2"
          style={{ scrollSnapType: 'x mandatory' }}
        >
          {actions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Link
                key={index}
                to={action.href}
                className="flex flex-col items-center justify-center
                          flex-shrink-0 cursor-pointer
                          active:scale-95 transition-transform"
                style={{ scrollSnapAlign: 'start' }}
              >
                <div className={`w-16 h-16 rounded-2xl ${action.bgColor}
                              flex items-center justify-center
                              shadow-sm`}>
                  <Icon className={`w-7 h-7 ${action.color}`} />
                </div>
                <span className="mt-2 text-[11px] font-medium text-slate-600
                               text-center leading-tight w-16">
                  {action.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
