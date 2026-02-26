import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { supabaseUntyped } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Briefcase,
  Search,
  MapPin,
  Calendar,
  Clock,
  Users,
  Building2,
  Filter,
  Plus,
  Eye,
  CheckCircle,
} from "lucide-react";

interface Job {
  id: string;
  title: string;
  description: string | null;
  location: string;
  date: string;
  dates: string[] | null;
  start_time: string;
  end_time: string;
  daily_rate: number;
  required_workers: number;
  status: string;
  created_at: string;
  clients: {
    id: string;
    company_name: string;
  };
  job_assignments: {
    id: string;
    status: string;
    worker_id: string;
    workers: {
      id: string;
      users: {
        name: string;
      };
    };
  }[];
}

export function AdminJobsPage() {
  const location = useLocation();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    loadJobs();
  }, [location.pathname]);

  async function loadJobs() {
    setLoading(true);
    try {
      const { data, error } = await supabaseUntyped
        .from('jobs')
        .select(`
          *,
          clients (id, company_name),
          job_assignments (
            id,
            status,
            worker_id,
            workers (
              id,
              users (name)
            )
          )
        `)
        .order('date', { ascending: false });

      if (error) {
        console.error('[AdminJobs] Error:', error);
      }

      setJobs(data || []);
    } catch (error) {
      console.error('Error loading jobs:', error);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR');
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

  function formatTime(timeStr: string) {
    return timeStr.slice(0, 5);
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'open':
        return <Badge className="bg-blue-500">Aberta</Badge>;
      case 'assigned':
        return <Badge className="bg-purple-500">Atribuída</Badge>;
      case 'in_progress':
        return <Badge className="bg-amber-500">Em Andamento</Badge>;
      case 'completed':
        return <Badge className="bg-green-500">Concluída</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelada</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  }

  function getAssignmentStats(assignments: Job['job_assignments']) {
    const active = assignments?.filter(a => ['pending', 'confirmed'].includes(a.status)).length || 0;
    const completed = assignments?.filter(a => a.status === 'completed').length || 0;
    const withdrawn = assignments?.filter(a => a.status === 'withdrawn').length || 0;
    return { active, completed, withdrawn, total: assignments?.length || 0 };
  }

  function openDetails(job: Job) {
    setSelectedJob(job);
    setDetailsOpen(true);
  }

  // Filtros
  const filteredJobs = jobs.filter(job => {
    const matchesSearch =
      job.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.clients?.company_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || job.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Estatísticas
  const totalJobs = jobs.length;
  const openJobs = jobs.filter(j => j.status === 'open').length;
  const assignedJobs = jobs.filter(j => j.status === 'assigned').length;
  const completedJobs = jobs.filter(j => j.status === 'completed').length;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
            <p className="text-sm text-muted-foreground">Carregando vagas...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Vagas</h2>
          <p className="text-muted-foreground">Gerencie todas as vagas da plataforma</p>
        </div>
        <Link to="/admin/jobs/new">
          <Button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-600/25">
            <Plus className="h-4 w-4 mr-2" />
            Nova Vaga
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-6">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-slate-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 font-medium">Total</p>
                <p className="text-3xl font-bold">{totalJobs}</p>
              </div>
              <div className="p-3 bg-slate-100 rounded-xl">
                <Briefcase className="h-6 w-6 text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Abertas</p>
                <p className="text-3xl font-bold text-blue-600">{openJobs}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">Atribuídas</p>
                <p className="text-3xl font-bold text-purple-600">{assignedJobs}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-xl">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Concluídas</p>
                <p className="text-3xl font-bold text-green-600">{completedJobs}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-xl">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por título, local ou empresa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px] bg-white">
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="open">Abertas</SelectItem>
                  <SelectItem value="assigned">Atribuídas</SelectItem>
                  <SelectItem value="in_progress">Em Andamento</SelectItem>
                  <SelectItem value="completed">Concluídas</SelectItem>
                  <SelectItem value="cancelled">Canceladas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Jobs List */}
      <div className="space-y-4">
        {filteredJobs.length > 0 ? (
          filteredJobs.map((job) => {
            const stats = getAssignmentStats(job.job_assignments);
            return (
              <Card key={job.id} className="border-0 shadow-sm hover:shadow-md transition-all">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    {/* Main Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-3 mb-2">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                          <Briefcase className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-lg text-slate-900 truncate">{job.title}</h3>
                            {getStatusBadge(job.status)}
                          </div>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Building2 className="h-3.5 w-3.5" />
                            {job.clients?.company_name}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm text-slate-600 ml-15">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-blue-500" />
                          {formatJobDates(job.dates, job.date)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4 text-cyan-500" />
                          {formatTime(job.start_time)} - {formatTime(job.end_time)}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-4 w-4 text-purple-500" />
                          <span className="truncate max-w-[200px]">{job.location}</span>
                        </span>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-4 lg:gap-6">
                      <div className="flex items-center gap-3">
                        <div className="text-center px-3 py-2 bg-slate-50 rounded-lg">
                          <p className="text-xl font-bold text-slate-900">{stats.active}/{job.required_workers}</p>
                          <p className="text-xs text-muted-foreground">Trabalhadores</p>
                        </div>
                        <div className="text-center px-3 py-2 bg-green-50 rounded-lg">
                          <p className="text-xl font-bold text-green-600">R$ {job.daily_rate}</p>
                          <p className="text-xs text-green-600">por dia</p>
                        </div>
                      </div>

                      <Button variant="outline" size="sm" onClick={() => openDetails(job)}>
                        <Eye className="h-4 w-4 mr-1" />
                        Detalhes
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-12">
              <div className="text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Briefcase className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-medium text-slate-900 mb-1">Nenhuma vaga encontrada</h3>
                <p className="text-muted-foreground">
                  {searchTerm || statusFilter !== "all"
                    ? "Tente ajustar os filtros de busca."
                    : "As vagas aparecerão aqui quando forem criadas."}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Job Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedJob && (
            <>
              <DialogHeader>
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                    <Briefcase className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl">{selectedJob.title}</DialogTitle>
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <Building2 className="h-3.5 w-3.5" />
                      {selectedJob.clients?.company_name}
                    </p>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* Status e Info */}
                <div className="flex flex-wrap gap-2">
                  {getStatusBadge(selectedJob.status)}
                  <Badge variant="outline">{selectedJob.required_workers} vagas</Badge>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    R$ {selectedJob.daily_rate}/dia
                  </Badge>
                </div>

                {/* Detalhes */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Data(s)</p>
                    <p className="font-medium flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-blue-500" />
                      {formatJobDates(selectedJob.dates, selectedJob.date)}
                    </p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Horário</p>
                    <p className="font-medium flex items-center gap-2">
                      <Clock className="h-4 w-4 text-cyan-500" />
                      {formatTime(selectedJob.start_time)} - {formatTime(selectedJob.end_time)}
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Local</p>
                  <p className="font-medium flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-purple-500" />
                    {selectedJob.location}
                  </p>
                </div>

                {selectedJob.description && (
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Descrição</p>
                    <p className="text-sm">{selectedJob.description}</p>
                  </div>
                )}

                {/* Trabalhadores */}
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Trabalhadores Atribuídos
                  </h4>

                  {selectedJob.job_assignments && selectedJob.job_assignments.length > 0 ? (
                    <div className="space-y-2">
                      {selectedJob.job_assignments.map((assignment) => (
                        <div
                          key={assignment.id}
                          className={`flex items-center justify-between p-3 rounded-lg border ${
                            assignment.status === 'withdrawn'
                              ? 'bg-red-50 border-red-200'
                              : assignment.status === 'completed'
                              ? 'bg-green-50 border-green-200'
                              : 'bg-blue-50 border-blue-200'
                          }`}
                        >
                          <span className="font-medium">
                            {assignment.workers?.users?.name || 'Trabalhador'}
                          </span>
                          <Badge
                            variant={
                              assignment.status === 'withdrawn' ? 'destructive' :
                              assignment.status === 'completed' ? 'default' : 'secondary'
                            }
                            className={
                              assignment.status === 'completed' ? 'bg-green-500' :
                              assignment.status === 'confirmed' ? 'bg-blue-500' : ''
                            }
                          >
                            {assignment.status === 'pending' && 'Pendente'}
                            {assignment.status === 'confirmed' && 'Confirmado'}
                            {assignment.status === 'completed' && 'Concluído'}
                            {assignment.status === 'withdrawn' && 'Desistiu'}
                            {assignment.status === 'no_show' && 'Faltou'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 bg-slate-50 rounded-lg">
                      <Users className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Nenhum trabalhador atribuído</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
