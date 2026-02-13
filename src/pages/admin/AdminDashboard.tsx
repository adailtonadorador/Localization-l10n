import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { supabaseUntyped } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton, SkeletonStatsCard } from "@/components/ui/skeleton";
import {
  Users,
  Building2,
  Briefcase,
  CheckCircle2,
  TrendingUp,
  ChevronRight,
  Activity,
  MapPin,
  Calendar,
  AlertTriangle,
  Clock,
  FileText
} from "lucide-react";

interface Stats {
  totalWorkers: number;
  totalClients: number;
  totalJobs: number;
  openJobs: number;
  pendingVerifications: number;
  completedJobs: number;
}

interface RecentJob {
  id: string;
  title: string;
  status: string;
  created_at: string;
  clients: {
    company_name: string;
  };
}

interface RecentClient {
  id: string;
  company_name: string;
  cidade: string | null;
  uf: string | null;
  created_at: string;
}

interface JobsByStatus {
  open: number;
  assigned: number;
  in_progress: number;
  completed: number;
  cancelled: number;
}

interface RecentWithdrawal {
  id: string;
  withdrawal_reason: string;
  withdrawn_at: string;
  workers: {
    users: {
      name: string;
    };
  };
  jobs: {
    title: string;
    clients: {
      company_name: string;
    };
  };
}

export function AdminDashboard() {
  const location = useLocation();
  const [stats, setStats] = useState<Stats>({
    totalWorkers: 0,
    totalClients: 0,
    totalJobs: 0,
    openJobs: 0,
    pendingVerifications: 0,
    completedJobs: 0,
  });
  const [recentJobs, setRecentJobs] = useState<RecentJob[]>([]);
  const [recentClients, setRecentClients] = useState<RecentClient[]>([]);
  const [recentWithdrawals, setRecentWithdrawals] = useState<RecentWithdrawal[]>([]);
  const [jobsByStatus, setJobsByStatus] = useState<JobsByStatus>({
    open: 0,
    assigned: 0,
    in_progress: 0,
    completed: 0,
    cancelled: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [location.pathname]);

  async function loadData() {
    setLoading(true);
    try {
      // Load stats
      const [workersRes, clientsRes, jobsRes, openJobsRes, pendingRes, completedRes] = await Promise.all([
        supabaseUntyped.from('workers').select('id', { count: 'exact', head: true }),
        supabaseUntyped.from('clients').select('id', { count: 'exact', head: true }),
        supabaseUntyped.from('jobs').select('id', { count: 'exact', head: true }),
        supabaseUntyped.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'open'),
        supabaseUntyped.from('workers').select('id', { count: 'exact', head: true }).eq('documents_verified', false),
        supabaseUntyped.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
      ]);

      setStats({
        totalWorkers: workersRes.count || 0,
        totalClients: clientsRes.count || 0,
        totalJobs: jobsRes.count || 0,
        openJobs: openJobsRes.count || 0,
        pendingVerifications: pendingRes.count || 0,
        completedJobs: completedRes.count || 0,
      });

      // Load jobs by status for chart
      const [assignedRes, inProgressRes, cancelledRes] = await Promise.all([
        supabaseUntyped.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'assigned'),
        supabaseUntyped.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'in_progress'),
        supabaseUntyped.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'cancelled'),
      ]);

      setJobsByStatus({
        open: openJobsRes.count || 0,
        assigned: assignedRes.count || 0,
        in_progress: inProgressRes.count || 0,
        completed: completedRes.count || 0,
        cancelled: cancelledRes.count || 0,
      });

      // Load recent jobs
      const { data: jobsData } = await supabaseUntyped
        .from('jobs')
        .select(`
          id,
          title,
          status,
          created_at,
          clients (company_name)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      setRecentJobs(jobsData || []);

      // Load recent clients
      const { data: clientsData } = await supabaseUntyped
        .from('clients')
        .select(`
          id,
          company_name,
          cidade,
          uf,
          created_at
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      setRecentClients(clientsData || []);

      // Load recent withdrawals from history
      const { data: withdrawalsData } = await supabaseUntyped
        .from('withdrawal_history')
        .select(`
          id,
          withdrawal_reason,
          withdrawn_at,
          workers (
            users (
              name
            )
          ),
          jobs (
            title,
            clients (
              company_name
            )
          )
        `)
        .order('withdrawn_at', { ascending: false })
        .limit(5);

      setRecentWithdrawals(withdrawalsData || []);

    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setLoading(false);
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'open':
        return <Badge className="bg-emerald-500">Aberta</Badge>;
      case 'assigned':
        return <Badge className="bg-purple-500 text-white">Atribuída</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-500">Em Andamento</Badge>;
      case 'completed':
        return <Badge className="bg-slate-500">Concluída</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelada</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short'
    });
  }

  function formatDateTime(dateStr: string) {
    return new Date(dateStr).toLocaleString('pt-BR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  if (loading) {
    return (
      <DashboardLayout>
        {/* Header */}
        <div className="mb-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48 mt-2" />
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 mb-8">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonStatsCard key={i} />
          ))}
        </div>

        {/* Content Skeleton */}
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2 border-0 shadow-sm">
            <CardHeader>
              <Skeleton className="h-5 w-40" />
            </CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full rounded" />
              ))}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const totalJobsForChart = Object.values(jobsByStatus).reduce((a, b) => a + b, 0);

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Painel Administrativo</h2>
        <p className="text-muted-foreground">Visão geral da plataforma SAMA</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 mb-8">
        <Link to="/admin/workers">
          <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-white hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="text-emerald-600 font-medium">Trabalhadores</CardDescription>
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <Users className="h-4 w-4 text-emerald-600" />
                </div>
              </div>
              <CardTitle className="text-3xl font-bold">{stats.totalWorkers}</CardTitle>
            </CardHeader>
          </Card>
        </Link>

        <Link to="/admin/clients">
          <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-white hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="text-blue-600 font-medium">Empresas</CardDescription>
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Building2 className="h-4 w-4 text-blue-600" />
                </div>
              </div>
              <CardTitle className="text-3xl font-bold">{stats.totalClients}</CardTitle>
            </CardHeader>
          </Card>
        </Link>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-purple-600 font-medium">Total Vagas</CardDescription>
              <div className="p-2 bg-purple-100 rounded-lg">
                <Briefcase className="h-4 w-4 text-purple-600" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold">{stats.totalJobs}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-green-600 font-medium">Vagas Abertas</CardDescription>
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold">{stats.openJobs}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-slate-50 to-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-slate-600 font-medium">Concluídas</CardDescription>
              <div className="p-2 bg-slate-100 rounded-lg">
                <CheckCircle2 className="h-4 w-4 text-slate-600" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold">{stats.completedJobs}</CardTitle>
          </CardHeader>
        </Card>

      </div>

      {/* Charts and Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2 mb-8">
        {/* Jobs by Status Chart */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Vagas por Status
            </CardTitle>
            <CardDescription>Distribuição das vagas cadastradas</CardDescription>
          </CardHeader>
          <CardContent>
            {totalJobsForChart > 0 ? (
              <div className="space-y-4">
                {[
                  { label: 'Abertas', count: jobsByStatus.open, color: 'bg-emerald-500' },
                  { label: 'Atribuídas', count: jobsByStatus.assigned, color: 'bg-purple-500' },
                  { label: 'Em Andamento', count: jobsByStatus.in_progress, color: 'bg-blue-500' },
                  { label: 'Concluídas', count: jobsByStatus.completed, color: 'bg-slate-500' },
                  { label: 'Canceladas', count: jobsByStatus.cancelled, color: 'bg-red-500' },
                ].map((item) => {
                  const percentage = totalJobsForChart > 0 ? (item.count / totalJobsForChart) * 100 : 0;
                  return (
                    <div key={item.label} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{item.label}</span>
                        <span className="text-muted-foreground">{item.count} vagas</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${item.color} rounded-full transition-all`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">Nenhuma vaga cadastrada</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Atividade Recente</CardTitle>
              <CardDescription>Últimas vagas cadastradas</CardDescription>
            </div>
            <Link to="/admin/clients">
              <Button variant="ghost" size="sm" className="gap-1">
                Ver tudo
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentJobs.length > 0 ? (
              <div className="space-y-3">
                {recentJobs.map((job) => (
                  <div key={job.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{job.title}</p>
                      <p className="text-xs text-muted-foreground">{job.clients?.company_name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(job.status)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">Nenhuma atividade recente</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Withdrawals Alert Card */}
      {recentWithdrawals.length > 0 && (
        <Card className="border-0 shadow-sm border-l-4 border-l-red-500 mb-6">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Desistências Recentes</CardTitle>
                <CardDescription>Trabalhadores que desistiram de diárias</CardDescription>
              </div>
            </div>
            <Link to="/admin/withdrawals">
              <Button variant="outline" size="sm" className="gap-1 text-red-600 border-red-200 hover:bg-red-50">
                Ver Todas
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentWithdrawals.map((withdrawal) => (
                <div key={withdrawal.id} className="flex items-start gap-3 p-3 bg-red-50/50 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-slate-900">
                      {withdrawal.workers?.users?.name || 'Trabalhador'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {withdrawal.jobs?.title} - {withdrawal.jobs?.clients?.company_name}
                    </p>
                    <div className="mt-2 p-2 bg-white rounded border border-red-100">
                      <p className="text-xs text-red-700 flex items-start gap-1">
                        <FileText className="h-3 w-3 mt-0.5 flex-shrink-0" />
                        <span className="line-clamp-2">{withdrawal.withdrawal_reason}</span>
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <Badge variant="outline" className="text-xs bg-red-50 border-red-200 text-red-700">
                      <Clock className="h-3 w-3 mr-1" />
                      {formatDateTime(withdrawal.withdrawn_at)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Access Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Clients */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-500" />
                Últimas Empresas
              </CardTitle>
              <CardDescription>Empresas cadastradas recentemente</CardDescription>
            </div>
            <Link to="/admin/clients">
              <Button variant="outline" size="sm" className="gap-1">
                Gerenciar
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentClients.length > 0 ? (
              <div className="space-y-3">
                {recentClients.map((client) => (
                  <Link key={client.id} to={`/admin/clients/${client.id}`}>
                    <div className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{client.company_name}</p>
                          {client.cidade && client.uf && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {client.cidade} - {client.uf}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(client.created_at)}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">Nenhuma empresa cadastrada</p>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Acesso Rápido</CardTitle>
            <CardDescription>Ações comuns da plataforma</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link to="/admin/clients">
              <div className="flex items-center justify-between p-4 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium">Gerenciar Clientes</p>
                    <p className="text-sm text-muted-foreground">Ver empresas e criar vagas</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-blue-500" />
              </div>
            </Link>

            <Link to="/admin/workers">
              <div className="flex items-center justify-between p-4 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500 flex items-center justify-center">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium">Gerenciar Trabalhadores</p>
                    <p className="text-sm text-muted-foreground">
                      Verificar documentos e perfis
                      {stats.pendingVerifications > 0 && (
                        <Badge className="ml-2 bg-amber-500">{stats.pendingVerifications} pendentes</Badge>
                      )}
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-emerald-500" />
              </div>
            </Link>

            <Link to="/admin/monitoring">
              <div className="flex items-center justify-between p-4 bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-500 flex items-center justify-center">
                    <Activity className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium">Monitoramento</p>
                    <p className="text-sm text-muted-foreground">Acompanhar check-ins em tempo real</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-purple-500" />
              </div>
            </Link>

            <Link to="/admin/withdrawals">
              <div className="flex items-center justify-between p-4 bg-red-50 hover:bg-red-100 rounded-xl transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-red-500 flex items-center justify-center">
                    <AlertTriangle className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium">Desistências</p>
                    <p className="text-sm text-muted-foreground">
                      Ver histórico de desistências
                      {recentWithdrawals.length > 0 && (
                        <Badge className="ml-2 bg-red-500">{recentWithdrawals.length} recentes</Badge>
                      )}
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-red-500" />
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
