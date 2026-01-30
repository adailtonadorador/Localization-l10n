import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { supabaseUntyped } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Users,
  Building2,
  Briefcase,
  CheckCircle2,
  Clock,
  AlertCircle,
  Search,
  Star,
  MapPin,
  Calendar,
  Shield,
  TrendingUp,
  XCircle,
  Plus,
  Eye,
  RotateCcw,
  UserPlus,
  Mail,
  Phone
} from "lucide-react";

interface Stats {
  totalWorkers: number;
  totalClients: number;
  totalJobs: number;
  openJobs: number;
  pendingVerifications: number;
  completedJobs: number;
}

interface Worker {
  id: string;
  cpf: string;
  rating: number;
  total_jobs: number;
  documents_verified: boolean;
  created_at: string;
  users: {
    name: string;
    email: string;
    phone: string;
  };
}

interface Client {
  id: string;
  cnpj: string;
  company_name: string;
  created_at: string;
  users: {
    name: string;
    email: string;
    phone: string;
  };
}

interface WorkRecord {
  id: string;
  work_date: string;
  check_in: string | null;
  check_out: string | null;
  status: string;
  workers: {
    id: string;
    rating: number;
    total_jobs: number;
    users: {
      name: string;
      email: string;
      phone: string | null;
    };
  };
}

interface Job {
  id: string;
  title: string;
  description: string | null;
  location: string;
  date: string;
  dates: string[] | null;
  start_time: string;
  end_time: string;
  hourly_rate: number;
  required_workers: number;
  skills_required: string[];
  status: string;
  cancel_reason: string | null;
  reactivation_reason: string | null;
  created_at: string;
  clients: {
    company_name: string;
  };
  job_assignments: { id: string; worker_id: string }[];
  work_records: WorkRecord[];
}

export function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalWorkers: 0,
    totalClients: 0,
    totalJobs: 0,
    openJobs: 0,
    pendingVerifications: 0,
    completedJobs: 0,
  });
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Modal states
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [reactivateDialogOpen, setReactivateDialogOpen] = useState(false);
  const [actionReason, setActionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // For assigning workers
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [availableWorkers, setAvailableWorkers] = useState<Worker[]>([]);

  useEffect(() => {
    loadData();
  }, []);

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

      // Load workers with user info
      const { data: workersData } = await supabaseUntyped
        .from('workers')
        .select(`
          *,
          users (name, email, phone)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      setWorkers(workersData || []);

      // Load clients with user info
      const { data: clientsData } = await supabaseUntyped
        .from('clients')
        .select(`
          *,
          users (name, email, phone)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      setClients(clientsData || []);

      // Load jobs with client info, assignments and work records
      const { data: jobsData } = await supabaseUntyped
        .from('jobs')
        .select(`
          *,
          clients (company_name),
          job_assignments (id, worker_id),
          work_records (
            id,
            work_date,
            check_in,
            check_out,
            status,
            workers (
              id,
              rating,
              total_jobs,
              users (name, email, phone)
            )
          )
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      setJobs(jobsData || []);

    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyWorker(workerId: string) {
    try {
      await supabaseUntyped
        .from('workers')
        .update({ documents_verified: true })
        .eq('id', workerId);

      loadData();
      alert('Trabalhador verificado com sucesso!');
    } catch (error) {
      console.error('Error verifying worker:', error);
      alert('Erro ao verificar trabalhador.');
    }
  }

  function openJobDetails(job: Job) {
    setSelectedJob(job);
    setDetailsOpen(true);
  }

  function openCancelDialog(job: Job) {
    setSelectedJob(job);
    setActionReason("");
    setCancelDialogOpen(true);
  }

  function openReactivateDialog(job: Job) {
    setSelectedJob(job);
    setActionReason("");
    setReactivateDialogOpen(true);
  }

  async function openAssignDialog(job: Job) {
    setSelectedJob(job);
    // Get workers not already assigned to this job
    const assignedWorkerIds = job.job_assignments?.map(a => a.worker_id) || [];
    const available = workers.filter(w =>
      w.documents_verified && !assignedWorkerIds.includes(w.id)
    );
    setAvailableWorkers(available);
    setAssignDialogOpen(true);
  }

  async function handleCancelJob() {
    if (!selectedJob || !actionReason.trim()) {
      alert('Por favor, descreva o motivo do cancelamento.');
      return;
    }

    setActionLoading(true);
    try {
      await supabaseUntyped
        .from('jobs')
        .update({
          status: 'cancelled',
          cancel_reason: actionReason.trim()
        })
        .eq('id', selectedJob.id);

      setCancelDialogOpen(false);
      setDetailsOpen(false);
      loadData();
      alert('Vaga cancelada com sucesso.');
    } catch (error) {
      console.error('Error cancelling job:', error);
      alert('Erro ao cancelar vaga.');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReactivateJob() {
    if (!selectedJob || !actionReason.trim()) {
      alert('Por favor, descreva o motivo da reativação.');
      return;
    }

    setActionLoading(true);
    try {
      await supabaseUntyped
        .from('jobs')
        .update({
          status: 'open',
          reactivation_reason: actionReason.trim()
        })
        .eq('id', selectedJob.id);

      setReactivateDialogOpen(false);
      setDetailsOpen(false);
      loadData();
      alert('Vaga reativada com sucesso.');
    } catch (error) {
      console.error('Error reactivating job:', error);
      alert('Erro ao reativar vaga.');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleAssignWorker(workerId: string) {
    if (!selectedJob) return;

    setActionLoading(true);
    try {
      // Create assignment
      const { error: assignError } = await supabaseUntyped.from('job_assignments').insert({
        job_id: selectedJob.id,
        worker_id: workerId,
        status: 'confirmed',
      });

      if (assignError) throw assignError;

      // Create work_records for each day
      const dates = selectedJob.dates && selectedJob.dates.length > 0
        ? selectedJob.dates
        : [selectedJob.date];

      const workRecords = dates.map(date => ({
        job_id: selectedJob.id,
        worker_id: workerId,
        work_date: date,
        status: 'pending',
      }));

      await supabaseUntyped.from('work_records').insert(workRecords);

      // Check if all positions are filled
      const { count: totalAssigned } = await supabaseUntyped
        .from('job_assignments')
        .select('*', { count: 'exact', head: true })
        .eq('job_id', selectedJob.id);

      if ((totalAssigned || 0) >= selectedJob.required_workers) {
        await supabaseUntyped
          .from('jobs')
          .update({ status: 'assigned' })
          .eq('id', selectedJob.id);
      }

      setAssignDialogOpen(false);
      setDetailsOpen(false);
      loadData();
      alert('Trabalhador atribuído com sucesso!');
    } catch (error) {
      console.error('Error assigning worker:', error);
      alert('Erro ao atribuir trabalhador.');
    } finally {
      setActionLoading(false);
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short'
    });
  }

  function formatJobDates(dates: string[] | null, date: string) {
    const allDates = dates && dates.length > 0 ? dates : [date];
    if (allDates.length === 1) {
      return formatDate(allDates[0]);
    }
    if (allDates.length === 2) {
      return `${formatDate(allDates[0])} e ${formatDate(allDates[1])}`;
    }
    return `${formatDate(allDates[0])} +${allDates.length - 1} dias`;
  }

  function formatDateTime(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  }

  function formatTime(timeStr: string) {
    return timeStr?.slice(0, 5) || '';
  }

  function formatCheckTime(timeStr: string | null) {
    if (!timeStr) return '-';
    return new Date(timeStr).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function getRecordStatusBadge(status: string) {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500">Concluído</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-500">Trabalhando</Badge>;
      case 'absent':
        return <Badge variant="destructive">Falta</Badge>;
      default:
        return <Badge variant="secondary">Pendente</Badge>;
    }
  }

  function formatCpf(cpf: string) {
    if (!cpf) return '';
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }

  function formatCnpj(cnpj: string) {
    if (!cnpj) return '';
    return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
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

  // Filter functions
  const filteredWorkers = workers.filter(w =>
    w.users?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.users?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.cpf?.includes(searchTerm)
  );

  const filteredClients = clients.filter(c =>
    c.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.users?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.cnpj?.includes(searchTerm)
  );

  const filteredJobs = jobs.filter(j =>
    j.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    j.clients?.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    j.location?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
            <p className="text-sm text-muted-foreground">Carregando...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Header with action */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Painel Administrativo</h2>
          <p className="text-muted-foreground">Gerencie a plataforma SAMA</p>
        </div>
        <Link to="/admin/jobs/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Nova Vaga
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6 mb-8">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-white">
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

        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-white">
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

        <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-amber-600 font-medium">Pendentes</CardDescription>
              <div className="p-2 bg-amber-100 rounded-lg">
                <AlertCircle className="h-4 w-4 text-amber-600" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold">{stats.pendingVerifications}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Chart Section */}
      <div className="grid gap-6 lg:grid-cols-2 mb-8">
        {/* Jobs by Status Chart */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Vagas por Status</CardTitle>
            <CardDescription>Distribuição das vagas cadastradas</CardDescription>
          </CardHeader>
          <CardContent>
            {jobs.length > 0 ? (
              <div className="space-y-4">
                {[
                  { label: 'Abertas', status: 'open', color: 'bg-emerald-500' },
                  { label: 'Atribuídas', status: 'assigned', color: 'bg-purple-500' },
                  { label: 'Em Andamento', status: 'in_progress', color: 'bg-blue-500' },
                  { label: 'Concluídas', status: 'completed', color: 'bg-slate-500' },
                  { label: 'Canceladas', status: 'cancelled', color: 'bg-red-500' },
                ].map((item) => {
                  const count = jobs.filter(j => j.status === item.status).length;
                  const percentage = jobs.length > 0 ? (count / jobs.length) * 100 : 0;
                  return (
                    <div key={item.status} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{item.label}</span>
                        <span className="text-muted-foreground">{count} vagas</span>
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
          <CardHeader>
            <CardTitle className="text-lg">Atividade Recente</CardTitle>
            <CardDescription>Ultimas vagas por empresa</CardDescription>
          </CardHeader>
          <CardContent>
            {jobs.slice(0, 5).length > 0 ? (
              <div className="space-y-3">
                {jobs.slice(0, 5).map((job) => (
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

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, email, CPF, CNPJ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white"
          />
        </div>
      </div>

      {/* Main Content with Tabs */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Gerenciamento</CardTitle>
          <CardDescription>Gerencie vagas, trabalhadores e empresas</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="workers">
            <TabsList className="mb-6 h-11 p-1 bg-slate-100">
              <TabsTrigger
                value="workers"
                className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm px-4"
              >
                <Users className="h-4 w-4" />
                Trabalhadores ({filteredWorkers.length})
              </TabsTrigger>
              <TabsTrigger
                value="clients"
                className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm px-4"
              >
                <Building2 className="h-4 w-4" />
                Empresas ({filteredClients.length})
              </TabsTrigger>
              <TabsTrigger
                value="jobs"
                className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm px-4"
              >
                <Briefcase className="h-4 w-4" />
                Vagas ({filteredJobs.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="workers">
              <div className="space-y-3">
                {filteredWorkers.length > 0 ? (
                  filteredWorkers.map((worker) => (
                    <div
                      key={worker.id}
                      className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12 ring-2 ring-white shadow">
                          <AvatarFallback className="bg-emerald-500 text-white font-medium">
                            {worker.users?.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '??'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-slate-900">{worker.users?.name}</h4>
                            <Badge
                              variant={worker.documents_verified ? "default" : "outline"}
                              className={worker.documents_verified ? "bg-emerald-500" : "border-amber-300 text-amber-700 bg-amber-50"}
                            >
                              {worker.documents_verified ? (
                                <>
                                  <Shield className="h-3 w-3 mr-1" />
                                  Verificado
                                </>
                              ) : (
                                <>
                                  <Clock className="h-3 w-3 mr-1" />
                                  Pendente
                                </>
                              )}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{worker.users?.email}</p>
                          <p className="text-sm text-muted-foreground">CPF: {formatCpf(worker.cpf)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right text-sm">
                          <p className="flex items-center justify-end gap-1 mb-1">
                            <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                            <span className="font-semibold">{worker.rating?.toFixed(1) || '0.0'}</span>
                          </p>
                          <p className="text-muted-foreground">{worker.total_jobs} trabalhos</p>
                          <p className="text-xs text-slate-400">
                            {formatDateTime(worker.created_at)}
                          </p>
                        </div>
                        {!worker.documents_verified && (
                          <Button
                            size="sm"
                            className="bg-emerald-500 hover:bg-emerald-600 gap-1"
                            onClick={() => handleVerifyWorker(worker.id)}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            Verificar
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Users className="h-6 w-6 text-slate-400" />
                    </div>
                    <p className="text-muted-foreground">Nenhum trabalhador encontrado.</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="clients">
              <div className="space-y-3">
                {filteredClients.length > 0 ? (
                  filteredClients.map((client) => (
                    <div
                      key={client.id}
                      className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                          <Building2 className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-slate-900">{client.company_name}</h4>
                            <Badge className="bg-blue-500">Ativo</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">CNPJ: {formatCnpj(client.cnpj)}</p>
                          <p className="text-sm text-muted-foreground">
                            {client.users?.name} - {client.users?.email}
                          </p>
                        </div>
                      </div>
                      <div className="text-right text-sm">
                        <p className="text-xs text-slate-400">
                          Cadastro: {formatDateTime(client.created_at)}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Building2 className="h-6 w-6 text-slate-400" />
                    </div>
                    <p className="text-muted-foreground">Nenhuma empresa encontrada.</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="jobs">
              <div className="space-y-3">
                {filteredJobs.length > 0 ? (
                  filteredJobs.map((job) => (
                    <div
                      key={job.id}
                      className={`flex items-center justify-between p-4 rounded-xl transition-all ${
                        job.status === 'assigned'
                          ? 'bg-purple-50 border-2 border-purple-200 hover:border-purple-300'
                          : job.status === 'in_progress'
                          ? 'bg-blue-50 border-2 border-blue-200 hover:border-blue-300'
                          : 'bg-slate-50 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-slate-900 truncate">{job.title}</h4>
                          {getStatusBadge(job.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">{job.clients?.company_name}</p>
                        <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {job.location}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatJobDates(job.dates, job.date)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right text-sm">
                          <p className="font-bold text-lg text-emerald-600">R$ {job.hourly_rate}/h</p>
                          <p className="text-muted-foreground">
                            {job.job_assignments?.length || 0}/{job.required_workers} trabalhador(es)
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          onClick={() => openJobDetails(job)}
                        >
                          <Eye className="h-4 w-4" />
                          Detalhes
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Briefcase className="h-6 w-6 text-slate-400" />
                    </div>
                    <p className="text-muted-foreground">Nenhuma vaga encontrada.</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Job Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto p-0">
          {selectedJob && (
            <>
              {/* Header */}
              <div className={`p-6 ${
                selectedJob.status === 'assigned'
                  ? 'bg-gradient-to-r from-purple-500 to-purple-600'
                  : selectedJob.status === 'in_progress'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600'
                  : selectedJob.status === 'completed'
                  ? 'bg-gradient-to-r from-green-500 to-green-600'
                  : selectedJob.status === 'cancelled'
                  ? 'bg-gradient-to-r from-red-500 to-red-600'
                  : 'bg-gradient-to-r from-emerald-500 to-emerald-600'
              } text-white`}>
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold mb-1">{selectedJob.title}</h2>
                    <p className="text-white/80 text-sm">{selectedJob.clients?.company_name} - {selectedJob.location}</p>
                  </div>
                  {getStatusBadge(selectedJob.status)}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                  <div className="bg-white/10 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-white/70 text-xs mb-1">
                      <Calendar className="h-3 w-3" />
                      Datas
                    </div>
                    <p className="font-semibold text-sm">{formatJobDates(selectedJob.dates, selectedJob.date)}</p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-white/70 text-xs mb-1">
                      <Clock className="h-3 w-3" />
                      Horário
                    </div>
                    <p className="font-semibold text-sm">{formatTime(selectedJob.start_time)} - {formatTime(selectedJob.end_time)}</p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-white/70 text-xs mb-1">
                      <Users className="h-3 w-3" />
                      Vagas
                    </div>
                    <p className="font-semibold text-sm">{selectedJob.job_assignments?.length || 0}/{selectedJob.required_workers}</p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-white/70 text-xs mb-1">
                      <Star className="h-3 w-3" />
                      Valor
                    </div>
                    <p className="font-semibold text-sm">R$ {selectedJob.hourly_rate}/h</p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Description */}
                {selectedJob.description && (
                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground mb-2">Descrição</h3>
                    <p className="text-sm bg-slate-50 p-3 rounded-lg">{selectedJob.description}</p>
                  </div>
                )}

                {/* Skills */}
                {selectedJob.skills_required?.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground mb-2">Habilidades Requeridas</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedJob.skills_required.map((skill, index) => (
                        <Badge key={index} variant="secondary" className="bg-slate-100">{skill}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Cancel/Reactivation Reason */}
                {selectedJob.cancel_reason && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h3 className="font-semibold text-sm text-red-700 mb-1">Motivo do Cancelamento</h3>
                    <p className="text-sm text-red-600">{selectedJob.cancel_reason}</p>
                  </div>
                )}

                {selectedJob.reactivation_reason && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h3 className="font-semibold text-sm text-green-700 mb-1">Motivo da Reativação</h3>
                    <p className="text-sm text-green-600">{selectedJob.reactivation_reason}</p>
                  </div>
                )}

                {/* Workers */}
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-3 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Trabalhadores Atribuídos ({selectedJob.job_assignments?.length || 0})
                  </h3>

                  {selectedJob.work_records && selectedJob.work_records.length > 0 ? (
                    <div className="space-y-3">
                      {(() => {
                        // Group by worker
                        const workerRecords = selectedJob.work_records.reduce((acc, record) => {
                          const workerId = record.workers?.id || 'unknown';
                          if (!acc[workerId]) {
                            acc[workerId] = {
                              worker: record.workers,
                              records: []
                            };
                          }
                          acc[workerId].records.push(record);
                          return acc;
                        }, {} as Record<string, { worker: WorkRecord['workers'], records: WorkRecord[] }>);

                        return Object.entries(workerRecords).map(([workerId, data]) => (
                          <div key={workerId} className="border rounded-xl overflow-hidden">
                            <div className="bg-gradient-to-r from-slate-50 to-slate-100 p-4">
                              <div className="flex items-center gap-4">
                                <Avatar className="h-12 w-12 ring-2 ring-white shadow-lg">
                                  <AvatarFallback className="bg-purple-500 text-white text-lg font-bold">
                                    {data.worker?.users?.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '??'}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                  <h4 className="font-bold">{data.worker?.users?.name || 'N/A'}</h4>
                                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mt-1">
                                    {data.worker?.users?.email && (
                                      <span className="flex items-center gap-1">
                                        <Mail className="h-3.5 w-3.5" />
                                        {data.worker.users.email}
                                      </span>
                                    )}
                                    {data.worker?.users?.phone && (
                                      <span className="flex items-center gap-1">
                                        <Phone className="h-3.5 w-3.5" />
                                        {data.worker.users.phone}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="flex items-center gap-1 justify-end">
                                    <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                                    <span className="font-bold">{data.worker?.rating?.toFixed(1) || '0.0'}</span>
                                  </div>
                                  <p className="text-xs text-muted-foreground">{data.worker?.total_jobs || 0} trabalhos</p>
                                </div>
                              </div>
                            </div>

                            <div className="p-4">
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {data.records.map((record) => (
                                  <div
                                    key={record.id}
                                    className={`p-2 rounded-lg text-sm border ${
                                      record.status === 'completed'
                                        ? 'bg-green-50 border-green-200'
                                        : record.status === 'in_progress'
                                        ? 'bg-blue-50 border-blue-200'
                                        : 'bg-slate-50 border-slate-200'
                                    }`}
                                  >
                                    <p className="font-medium">{formatDate(record.work_date)}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {formatCheckTime(record.check_in)} - {formatCheckTime(record.check_out)}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  ) : (
                    <div className="text-center py-6 bg-slate-50 rounded-xl">
                      <Users className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-muted-foreground text-sm">Nenhum trabalhador atribuído ainda.</p>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3 pt-4 border-t">
                  {selectedJob.status === 'open' && (
                    <>
                      <Button
                        className="gap-2 bg-purple-500 hover:bg-purple-600"
                        onClick={() => openAssignDialog(selectedJob)}
                      >
                        <UserPlus className="h-4 w-4" />
                        Atribuir Trabalhador
                      </Button>
                      <Button
                        variant="outline"
                        className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => openCancelDialog(selectedJob)}
                      >
                        <XCircle className="h-4 w-4" />
                        Cancelar Vaga
                      </Button>
                    </>
                  )}

                  {selectedJob.status === 'assigned' && (
                    <Button
                      variant="outline"
                      className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => openCancelDialog(selectedJob)}
                    >
                      <XCircle className="h-4 w-4" />
                      Cancelar Vaga
                    </Button>
                  )}

                  {selectedJob.status === 'cancelled' && (
                    <Button
                      className="gap-2 bg-green-500 hover:bg-green-600"
                      onClick={() => openReactivateDialog(selectedJob)}
                    >
                      <RotateCcw className="h-4 w-4" />
                      Reativar Vaga
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              Cancelar Vaga
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Você está prestes a cancelar a vaga <strong>{selectedJob?.title}</strong>.
              Por favor, informe o motivo do cancelamento.
            </p>
            <div className="space-y-2">
              <Label htmlFor="cancel-reason">Motivo do cancelamento *</Label>
              <Textarea
                id="cancel-reason"
                placeholder="Descreva o motivo do cancelamento..."
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
              Voltar
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelJob}
              disabled={actionLoading || !actionReason.trim()}
            >
              {actionLoading ? 'Cancelando...' : 'Confirmar Cancelamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reactivate Dialog */}
      <Dialog open={reactivateDialogOpen} onOpenChange={setReactivateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <RotateCcw className="h-5 w-5" />
              Reativar Vaga
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Você está prestes a reativar a vaga <strong>{selectedJob?.title}</strong>.
              Por favor, informe o motivo da reativação.
            </p>
            <div className="space-y-2">
              <Label htmlFor="reactivate-reason">Motivo da reativação *</Label>
              <Textarea
                id="reactivate-reason"
                placeholder="Descreva o motivo da reativação..."
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReactivateDialogOpen(false)}>
              Voltar
            </Button>
            <Button
              className="bg-green-500 hover:bg-green-600"
              onClick={handleReactivateJob}
              disabled={actionLoading || !actionReason.trim()}
            >
              {actionLoading ? 'Reativando...' : 'Confirmar Reativação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Worker Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-purple-500" />
              Atribuir Trabalhador
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Selecione um trabalhador verificado para atribuir à vaga <strong>{selectedJob?.title}</strong>.
            </p>

            {availableWorkers.length > 0 ? (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {availableWorkers.map((worker) => (
                  <div
                    key={worker.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-emerald-500 text-white">
                          {worker.users?.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '??'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{worker.users?.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                            {worker.rating?.toFixed(1) || '0.0'}
                          </span>
                          <span>{worker.total_jobs} trabalhos</span>
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleAssignWorker(worker.id)}
                      disabled={actionLoading}
                    >
                      Atribuir
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-slate-50 rounded-lg">
                <Users className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">
                  Nenhum trabalhador verificado disponível.
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
