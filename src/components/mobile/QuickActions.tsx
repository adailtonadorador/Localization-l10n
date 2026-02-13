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
      color: 'text-blue-700',
      bgColor: 'bg-gradient-to-br from-blue-100 to-blue-200 shadow-lg shadow-blue-200/50',
      show: true
    },
    {
      label: 'Meus Trabalhos',
      icon: Calendar,
      href: '/worker/my-jobs',
      color: 'text-cyan-700',
      bgColor: 'bg-gradient-to-br from-cyan-100 to-sky-200 shadow-lg shadow-cyan-200/50',
      show: true
    },
    {
      label: 'Completar Perfil',
      icon: UserPlus,
      href: '/worker/profile',
      color: 'text-orange-700',
      bgColor: 'bg-gradient-to-br from-orange-100 to-amber-200 shadow-lg shadow-orange-200/50',
      show: profileCompleteness < 100
    },
    {
      label: 'Meus Ganhos',
      icon: TrendingUp,
      href: '/worker/history',
      color: 'text-purple-700',
      bgColor: 'bg-gradient-to-br from-purple-100 to-purple-200 shadow-lg shadow-purple-200/50',
      show: true
    },
  ].filter(action => action.show);

  return (
    <div className="mt-6 mb-6">
      <div className="flex items-center justify-between px-1 mb-4">
        <h3 className="text-sm font-semibold text-slate-700">
          Acesso Rápido
        </h3>
      </div>
      <div className="flex gap-5">
        {actions.map((action, index) => {
          const Icon = action.icon;
          return (
            <Link
              key={index}
              to={action.href}
              className="flex flex-col items-center cursor-pointer active:scale-95 transition-transform w-16"
            >
              <div className={`w-16 h-16 rounded-2xl ${action.bgColor} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-7 h-7 ${action.color}`} />
              </div>
              <span className="mt-2 text-xs font-medium text-slate-600 text-center leading-tight h-8 flex items-start justify-center">
                {action.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
