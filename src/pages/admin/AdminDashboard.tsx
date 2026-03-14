import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabaseUntyped } from "@/lib/supabase";
import { runAutoUpdates } from "@/lib/job-status-updater";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton, SkeletonStatsCard } from "@/components/ui/skeleton";
import { NotificationPrompt } from "@/components/NotificationPrompt";
import {
  Users,
  Building2,
  Briefcase,
  CheckCircle2,
  TrendingUp,
  ChevronRight,
  Activity,
  MapPin,
  Calendar as CalendarIcon,
  AlertTriangle,
  Clock,
  FileText,
  CalendarDays
} from "lucide-react";

interface Stats {
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
    fantasia: string | null;
  };
}

interface RecentClient {
  id: string;
  company_name: string;
  fantasia: string | null;
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
      fantasia: string | null;
    };
  };
}

// Helper to get Monday of current week
function getCurrentWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
  const monday = new Date(now.setDate(diff));
  return monday.toISOString().split('T')[0];
}

// Helper to get Sunday of current week
function getCurrentWeekEnd(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? 0 : 7); // Sunday
  const sunday = new Date(now.setDate(diff));
  return sunday.toISOString().split('T')[0];
}

export function AdminDashboard() {
  const location = useLocation();
  useAuth();
  const [stats, setStats] = useState<Stats>({
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
  const [dateFrom, setDateFrom] = useState(getCurrentWeekStart());
  const [dateTo, setDateTo] = useState(getCurrentWeekEnd());
  const [activeFilter, setActiveFilter] = useState<'week' | 'month' | 'all' | 'custom'>('week');
  const [clientsList, setClientsList] = useState<{ id: string; company_name: string; fantasia: string | null }[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');

  const isDateRangeInvalid = dateFrom && dateTo && dateTo < dateFrom;

  function formatDateLabel(dateStr: string) {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  }

  function getFilterLabel() {
    if (activeFilter === 'all') return 'Todos os registros';
    if (!dateFrom && !dateTo) return 'Todos os registros';
    if (dateFrom && dateTo) return `${formatDateLabel(dateFrom)} — ${formatDateLabel(dateTo)}`;
    if (dateFrom) return `A partir de ${formatDateLabel(dateFrom)}`;
    if (dateTo) return `Até ${formatDateLabel(dateTo)}`;
    return '';
  }

  useEffect(() => {
    loadClientsList();
    runAutoUpdates().then(() => loadData());
  }, [location.pathname]);

  // Reload stats when date filters or client filter change
  useEffect(() => {
    if (!loading && !isDateRangeInvalid) {
      loadData();
    }
  }, [dateFrom, dateTo, selectedClientId]);

  async function loadClientsList() {
    const { data } = await supabaseUntyped
      .from('clients')
      .select('id, company_name, fantasia')
      .order('company_name');
    setClientsList(data || []);
  }

  async function loadData() {
    setLoading(true);
    try {
      // Load stats - filter jobs by date range
      let jobsQuery = supabaseUntyped
        .from('jobs')
        .select('id, status, dates, date, required_workers, job_assignments(id, status)');

      if (dateFrom) {
        jobsQuery = jobsQuery.gte('date', dateFrom);
      }
      if (dateTo) {
        jobsQuery = jobsQuery.lte('date', dateTo);
      }
      if (selectedClientId) {
        jobsQuery = jobsQuery.eq('client_id', selectedClientId);
      }

      const [allJobsRes, pendingRes] = await Promise.all([
        jobsQuery,
        supabaseUntyped.from('workers').select('id', { count: 'exact', head: true }).eq('documents_verified', false),
      ]);

      // Calculate diárias considering actual assignments
      const allJobs: { id: string; status: string; dates: string[] | null; date: string; required_workers: number; job_assignments: { id: string; status: string }[] }[] = allJobsRes.data || [];

      const getNumDates = (job: typeof allJobs[0]) =>
        job.dates && job.dates.length > 0 ? job.dates.length : 1;

      const countDiarias = (jobs: typeof allJobs) =>
        jobs.reduce((sum, job) => sum + getNumDates(job) * (job.required_workers || 1), 0);

      // Count diárias based on assignments, not just job status
      let totalOpen = 0;
      let totalAssigned = 0;
      let totalInProgress = 0;
      let totalCompleted = 0;
      let totalCancelled = 0;

      for (const job of allJobs) {
        const numDates = getNumDates(job);
        const required = job.required_workers || 1;
        const totalJobDiarias = numDates * required;

        if (job.status === 'completed') {
          totalCompleted += totalJobDiarias;
        } else if (job.status === 'cancelled') {
          totalCancelled += totalJobDiarias;
        } else if (job.status === 'in_progress') {
          totalInProgress += totalJobDiarias;
        } else {
          // For open/assigned jobs, split by actual active assignments
          const activeAssignments = (job.job_assignments || []).filter(
            a => ['pending', 'confirmed', 'in_progress', 'checked_in'].includes(a.status)
          ).length;
          const assignedDiarias = numDates * Math.min(activeAssignments, required);
          const openDiarias = totalJobDiarias - assignedDiarias;
          totalAssigned += assignedDiarias;
          totalOpen += openDiarias;
        }
      }

      setStats({
        totalJobs: countDiarias(allJobs),
        openJobs: totalOpen,
        pendingVerifications: pendingRes.count || 0,
        completedJobs: totalCompleted,
      });

      setJobsByStatus({
        open: totalOpen,
        assigned: totalAssigned,
        in_progress: totalInProgress,
        completed: totalCompleted,
        cancelled: totalCancelled,
      });

      // Load recent jobs
      const { data: jobsData } = await supabaseUntyped
        .from('jobs')
        .select(`
          id,
          title,
          status,
          created_at,
          clients (company_name, fantasia)
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
          fantasia,
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
              company_name,
              fantasia
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
        return <Badge className="bg-blue-500">Aberta</Badge>;
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

        {/* Filter Skeleton */}
        <div className="flex gap-4 mb-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-48" />
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 mb-8">
          {Array.from({ length: 3 }).map((_, i) => (
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
      {/* Notification Prompt */}
      <NotificationPrompt variant="banner" />

      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Painel Administrativo</h2>
        <p className="text-muted-foreground">Visão geral da plataforma SAMA</p>
      </div>

      {/* Date Range Filter */}
      <Card className="border-0 shadow-sm mb-6 overflow-hidden">
        <div className="border-l-4 border-l-blue-500">
          <CardContent className="py-4">
            <div className="flex flex-col gap-4">
              {/* Header row with title and quick filters */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-blue-100 rounded-lg">
                    <CalendarDays className="h-4 w-4 text-blue-600" />
                  </div>
                  <span className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Período</span>
                </div>

                {/* Segmented control */}
                <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden bg-slate-50">
                  {([
                    { key: 'week' as const, label: 'Semana' },
                    { key: 'month' as const, label: 'Mês' },
                    { key: 'all' as const, label: 'Tudo' },
                  ]).map((item, idx) => (
                    <button
                      key={item.key}
                      className={`px-4 py-2 text-sm font-medium transition-all ${
                        idx < 2 ? 'border-r border-slate-200' : ''
                      } ${
                        activeFilter === item.key
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-sm'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                      onClick={() => {
                        setActiveFilter(item.key);
                        if (item.key === 'week') {
                          setDateFrom(getCurrentWeekStart());
                          setDateTo(getCurrentWeekEnd());
                        } else if (item.key === 'month') {
                          const now = new Date();
                          setDateFrom(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]);
                          setDateTo(new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]);
                        } else {
                          setDateFrom('');
                          setDateTo('');
                        }
                      }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date inputs + Client filter row */}
              <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                <div className="grid grid-cols-2 gap-3 sm:flex sm:gap-3">
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="dateFrom" className="text-xs font-medium text-slate-500 uppercase tracking-wide">Início</Label>
                    <Input
                      id="dateFrom"
                      type="date"
                      value={dateFrom}
                      onChange={(e) => {
                        setDateFrom(e.target.value);
                        setActiveFilter('custom');
                        if (dateTo && e.target.value && dateTo < e.target.value) {
                          setDateTo(e.target.value);
                        }
                      }}
                      className="w-full sm:w-44 h-10 rounded-lg border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500/30 transition-colors"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="dateTo" className="text-xs font-medium text-slate-500 uppercase tracking-wide">Fim</Label>
                    <Input
                      id="dateTo"
                      type="date"
                      value={dateTo}
                      min={dateFrom || undefined}
                      onChange={(e) => {
                        setDateTo(e.target.value);
                        setActiveFilter('custom');
                      }}
                      className={`w-full sm:w-44 h-10 rounded-lg transition-colors ${
                        isDateRangeInvalid
                          ? 'border-red-400 ring-2 ring-red-400/30 bg-red-50 focus:ring-red-500/30'
                          : 'border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500/30'
                      }`}
                    />
                    {isDateRangeInvalid && (
                      <p className="text-xs text-red-500 mt-0.5">Data final deve ser após a data inicial</p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <Label htmlFor="clientFilter" className="text-xs font-medium text-slate-500 uppercase tracking-wide">Cliente</Label>
                  <select
                    id="clientFilter"
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 focus:bg-white focus:ring-2 focus:ring-blue-500/30 focus:outline-none transition-colors min-w-[180px] sm:w-52"
                  >
                    <option value="">Todos os clientes</option>
                    {clientsList.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.fantasia || client.company_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Active filter pills */}
                <div className="sm:ml-2 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 rounded-full px-3 py-2 text-xs font-medium">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {getFilterLabel()}
                  </span>
                  {selectedClientId && (
                    <span className="inline-flex items-center gap-1.5 bg-purple-50 text-purple-700 rounded-full px-3 py-2 text-xs font-medium">
                      <Building2 className="h-3.5 w-3.5" />
                      {clientsList.find(c => c.id === selectedClientId)?.fantasia ||
                       clientsList.find(c => c.id === selectedClientId)?.company_name}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </div>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-purple-600 font-medium">Total Diárias</CardDescription>
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
              <CardDescription className="text-green-600 font-medium">Diárias Abertas</CardDescription>
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
              Diárias por Status
            </CardTitle>
            <CardDescription>Distribuição das diárias cadastradas</CardDescription>
          </CardHeader>
          <CardContent>
            {totalJobsForChart > 0 ? (
              <div className="space-y-4">
                {[
                  { label: 'Abertas', count: jobsByStatus.open, color: 'bg-blue-500' },
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
                        <span className="text-muted-foreground">{item.count} diárias</span>
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
          <CardHeader className="flex flex-row items-start sm:items-center justify-between gap-2">
            <div className="min-w-0">
              <CardTitle className="text-lg">Atividade Recente</CardTitle>
              <CardDescription>Últimas diárias cadastradas</CardDescription>
            </div>
            <Link to="/admin/clients" className="flex-shrink-0">
              <Button variant="ghost" size="sm" className="gap-1">
                <span className="hidden sm:inline">Ver tudo</span>
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
                      <p className="text-xs text-muted-foreground">{job.clients?.fantasia || job.clients?.company_name}</p>
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
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Desistências Recentes</CardTitle>
                <CardDescription>Prestadores que desistiram de diárias</CardDescription>
              </div>
            </div>
            <Link to="/admin/withdrawals">
              <Button variant="outline" size="sm" className="gap-1 text-red-600 border-red-200 hover:bg-red-50 flex-shrink-0">
                Ver Todas
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentWithdrawals.map((withdrawal) => (
                <div key={withdrawal.id} className="flex flex-col sm:flex-row items-start gap-3 p-3 bg-red-50/50 rounded-lg">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-slate-900">
                        {withdrawal.workers?.users?.name || 'Trabalhador'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {withdrawal.jobs?.title} - {withdrawal.jobs?.clients?.fantasia || withdrawal.jobs?.clients?.company_name}
                      </p>
                      <div className="mt-2 p-2 bg-white rounded border border-red-100">
                        <p className="text-xs text-red-700 flex items-start gap-1">
                          <FileText className="h-3 w-3 mt-0.5 flex-shrink-0" />
                          <span className="line-clamp-2">{withdrawal.withdrawal_reason}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex-shrink-0 self-start sm:self-auto">
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
          <CardHeader className="flex flex-row items-start sm:items-center justify-between gap-2">
            <div className="min-w-0">
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-500 flex-shrink-0" />
                Últimas Empresas
              </CardTitle>
              <CardDescription>Empresas cadastradas recentemente</CardDescription>
            </div>
            <Link to="/admin/clients" className="flex-shrink-0">
              <Button variant="outline" size="sm" className="gap-1">
                <span className="hidden sm:inline">Gerenciar</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentClients.length > 0 ? (
              <div className="space-y-3">
                {recentClients.map((client) => (
                  <Link key={client.id} to={`/admin/clients/${client.id}`}>
                    <div className="flex items-center justify-between gap-2 p-3 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <Building2 className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{client.fantasia || client.company_name}</p>
                          {client.cidade && client.uf && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3 flex-shrink-0" />
                              {client.cidade} - {client.uf}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <CalendarIcon className="h-3 w-3" />
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
                    <p className="text-sm text-muted-foreground">Ver empresas e criar diárias</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-blue-500" />
              </div>
            </Link>

            <Link to="/admin/workers">
              <div className="flex items-center justify-between p-4 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium">Gerenciar Prestadores</p>
                    <p className="text-sm text-muted-foreground">
                      Ver lista e perfis dos prestadores
                      {stats.pendingVerifications > 0 && (
                        <Badge className="ml-2 bg-amber-500">{stats.pendingVerifications} pendentes</Badge>
                      )}
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-blue-500" />
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
