import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import {
  Briefcase,
  Star,
  TrendingUp,
  ChevronRight
} from 'lucide-react';

interface WelcomeCardProps {
  userName: string;
  avatarUrl?: string | null;
  role: 'worker' | 'admin' | 'client';
  profileCompleteness: number;
  approvalStatus?: 'approved' | 'pending' | 'rejected';
  stats: {
    totalJobs: number;
    rating: number;
    monthlyEarnings: number;
  };
  profileLink: string;
}

function getTimeBasedGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatCurrency(value: number): string {
  if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(1)}k`;
  }
  return `R$ ${value}`;
}

export function WelcomeCard({
  userName,
  avatarUrl,
  role,
  profileCompleteness,
  approvalStatus,
  stats,
  profileLink
}: WelcomeCardProps) {
  const greeting = getTimeBasedGreeting();
  const firstName = userName?.split(' ')[0] || 'Usuário';

  const roleColors = {
    worker: 'from-blue-600 via-blue-700 to-cyan-600',
    admin: 'from-purple-600 via-purple-700 to-indigo-600',
    client: 'from-blue-700 via-indigo-700 to-purple-700',
  };

  const showProfileProgress = profileCompleteness < 100 && role === 'worker';

  return (
    <Card className="border-0 shadow-md overflow-hidden">
      {/* Gradiente Header */}
      <div className={`bg-gradient-to-r ${roleColors[role]} p-4 text-white`}>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm opacity-90">{greeting},</p>
            <h2 className="text-xl font-bold mt-0.5">
              {firstName}!
            </h2>
            {approvalStatus && approvalStatus !== 'approved' && (
              <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full
                ${approvalStatus === 'pending'
                  ? 'bg-white/20 text-white'
                  : 'bg-red-500/80 text-white'}`}>
                {approvalStatus === 'pending' ? 'Conta em análise' : 'Conta rejeitada'}
              </span>
            )}
          </div>
          <div className="w-14 h-14 rounded-full bg-white/20
                          flex items-center justify-center
                          ring-2 ring-white/30 overflow-hidden">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={userName}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-xl font-bold text-white">
                {getInitials(userName)}
              </span>
            )}
          </div>
        </div>

        {/* Progress Bar de Perfil */}
        {showProfileProgress && (
          <Link to={profileLink} className="block mt-3">
            <div className="flex items-center gap-3 bg-white/10 rounded-lg p-2">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium">Complete seu perfil</span>
                  <span className="text-xs font-bold">{profileCompleteness}%</span>
                </div>
                <div className="bg-white/20 rounded-full h-1.5">
                  <div
                    className="bg-white h-full rounded-full transition-all"
                    style={{ width: `${profileCompleteness}%` }}
                  />
                </div>
              </div>
              <ChevronRight className="w-4 h-4 opacity-70" />
            </div>
          </Link>
        )}
      </div>

      {/* Stats Footer */}
      {role === 'worker' && (
        <CardContent className="p-4">
          <div className="flex items-center justify-around text-center">
            <div className="flex-1">
              <div className="flex items-center justify-center gap-1.5 text-slate-900">
                <Briefcase className="w-4 h-4 text-blue-700" />
                <span className="font-bold text-lg">{stats.totalJobs}</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">Trabalhos</p>
            </div>

            <div className="w-px h-10 bg-slate-200" />

            <div className="flex-1">
              <div className="flex items-center justify-center gap-1.5 text-slate-900">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span className="font-bold text-lg">
                  {stats.rating > 0 ? stats.rating.toFixed(1) : 'N/A'}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">Avaliação</p>
            </div>

            <div className="w-px h-10 bg-slate-200" />

            <div className="flex-1">
              <div className="flex items-center justify-center gap-1.5 text-slate-900">
                <TrendingUp className="w-4 h-4 text-purple-600" />
                <span className="font-bold text-lg">
                  {formatCurrency(stats.monthlyEarnings)}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">Este mês</p>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
