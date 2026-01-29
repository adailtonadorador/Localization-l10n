import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabaseUntyped } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface Job {
  id: string;
  title: string;
  location: string;
  date: string;
  start_time: string;
  end_time: string;
  hourly_rate: number;
  required_workers: number;
  status: string;
}

interface JobApplication {
  id: string;
  status: string;
  applied_at: string;
  job_id: string;
  workers: {
    id: string;
    users: {
      name: string;
      email: string;
    };
    rating: number;
    total_jobs: number;
  };
  jobs: {
    title: string;
  };
}

export function ClientDashboard() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [pendingApplications, setPendingApplications] = useState<JobApplication[]>([]);
  const [stats, setStats] = useState({
    activeJobs: 0,
    totalWorkers: 0,
    monthlySpending: 0,
    pendingApplications: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  async function loadDashboardData() {
    setLoading(true);
    try {
      // Load client's jobs
      const { data: jobsData } = await supabaseUntyped
        .from('jobs')
        .select('*')
        .eq('client_id', user?.id)
        .order('date', { ascending: true })
        .limit(5);

      setJobs(jobsData || []);

      // Load pending applications for client's jobs
      const { data: applicationsData } = await supabaseUntyped
        .from('job_applications')
        .select(`
          *,
          workers (
            id,
            rating,
            total_jobs,
            users (name, email)
          ),
          jobs (title)
        `)
        .eq('status', 'pending')
        .in('job_id', (jobsData || []).map((j: Job) => j.id))
        .order('applied_at', { ascending: false })
        .limit(5);

      setPendingApplications(applicationsData || []);

      // Calculate stats
      const activeJobs = (jobsData || []).filter((j: Job) => j.status === 'open').length;

      const { data: assignmentsData } = await supabaseUntyped
        .from('job_assignments')
        .select('id, jobs!inner(client_id)')
        .eq('jobs.client_id', user?.id)
        .eq('status', 'completed');

      setStats({
        activeJobs,
        totalWorkers: assignmentsData?.length || 0,
        monthlySpending: 0,
        pendingApplications: applicationsData?.length || 0,
      });
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleApproveApplication(applicationId: string, jobId: string, workerId: string) {
    try {
      // Update application status
      await supabaseUntyped
        .from('job_applications')
        .update({ status: 'approved' })
        .eq('id', applicationId);

      // Create job assignment
      await supabaseUntyped.from('job_assignments').insert({
        job_id: jobId,
        worker_id: workerId,
        status: 'pending',
      });

      loadDashboardData();
      alert('Candidatura aprovada!');
    } catch (error) {
      console.error('Error approving application:', error);
      alert('Erro ao aprovar candidatura.');
    }
  }

  async function handleRejectApplication(applicationId: string) {
    try {
      await supabaseUntyped
        .from('job_applications')
        .update({ status: 'rejected' })
        .eq('id', applicationId);

      loadDashboardData();
      alert('Candidatura recusada.');
    } catch (error) {
      console.error('Error rejecting application:', error);
      alert('Erro ao recusar candidatura.');
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR');
  }

  function formatTime(timeStr: string) {
    return timeStr.slice(0, 5);
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'open':
        return <Badge variant="default">Aberta</Badge>;
      case 'assigned':
        return <Badge variant="secondary">Atribuída</Badge>;
      case 'in_progress':
        return <Badge variant="outline">Em Andamento</Badge>;
      case 'completed':
        return <Badge variant="default">Concluída</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelada</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Vagas Ativas</CardDescription>
            <CardTitle className="text-3xl">{stats.activeJobs}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Trabalhadores Contratados</CardDescription>
            <CardTitle className="text-3xl">{stats.totalWorkers}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Gasto Este Mês</CardDescription>
            <CardTitle className="text-3xl">R$ {stats.monthlySpending.toFixed(2)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Candidaturas Pendentes</CardDescription>
            <CardTitle className="text-3xl">{stats.pendingApplications}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Minhas Vagas */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Minhas Vagas</CardTitle>
                <CardDescription>Vagas publicadas recentemente</CardDescription>
              </div>
              <Link to="/client/jobs/new">
                <Button>Nova Vaga</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {jobs.length > 0 ? (
              <div className="space-y-4">
                {jobs.map((job) => (
                  <div key={job.id} className="flex items-start justify-between p-4 border rounded-lg">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{job.title}</h4>
                        {getStatusBadge(job.status)}
                      </div>
                      <div className="flex gap-2 mt-2 text-sm text-muted-foreground">
                        <span>{formatDate(job.date)}</span>
                        <span>•</span>
                        <span>{formatTime(job.start_time)} - {formatTime(job.end_time)}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{job.location}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm">
                        <span className="font-semibold">{job.required_workers}</span>
                        <span className="text-muted-foreground"> trabalhadores</span>
                      </p>
                      <p className="font-semibold mt-1">R$ {job.hourly_rate}/h</p>
                      <Link to={`/client/jobs/${job.id}`}>
                        <Button variant="outline" size="sm" className="mt-2">Gerenciar</Button>
                      </Link>
                    </div>
                  </div>
                ))}
                <Link to="/client/jobs">
                  <Button variant="outline" className="w-full">Ver Todas as Vagas</Button>
                </Link>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">Nenhuma vaga publicada ainda.</p>
                <Link to="/client/jobs/new">
                  <Button>Criar Primeira Vaga</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Candidaturas Pendentes */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Candidaturas Pendentes</CardTitle>
              <Link to="/client/candidates">
                <Button variant="ghost" size="sm">Ver Todas</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {pendingApplications.length > 0 ? (
              <div className="space-y-3">
                {pendingApplications.map((app) => (
                  <div key={app.id} className="p-3 border rounded-lg">
                    <div className="flex items-center gap-3 mb-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {app.workers?.users?.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '??'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{app.workers?.users?.name}</p>
                        <p className="text-xs text-muted-foreground">{app.jobs?.title}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                      <span>{app.workers?.rating?.toFixed(1) || 'N/A'} ★</span>
                      <span>{app.workers?.total_jobs || 0} trabalhos</span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleRejectApplication(app.id)}
                      >
                        Recusar
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => handleApproveApplication(app.id, app.job_id, app.workers?.id)}
                      >
                        Aprovar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4 text-sm">
                Nenhuma candidatura pendente.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
