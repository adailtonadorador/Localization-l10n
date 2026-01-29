import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabaseUntyped } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Job {
  id: string;
  title: string;
  description: string;
  location: string;
  date: string;
  start_time: string;
  end_time: string;
  hourly_rate: number;
  required_workers: number;
  skills_required: string[];
  status: string;
  clients: {
    company_name: string;
  };
}

interface JobApplication {
  id: string;
  status: string;
  jobs: Job;
}

interface JobAssignment {
  id: string;
  status: string;
  jobs: Job;
}

export function WorkerDashboard() {
  const { user, workerProfile } = useAuth();
  const [availableJobs, setAvailableJobs] = useState<Job[]>([]);
  const [upcomingJobs, setUpcomingJobs] = useState<JobAssignment[]>([]);
  const [pendingApplications, setPendingApplications] = useState<JobApplication[]>([]);
  const [stats, setStats] = useState({
    totalJobs: 0,
    monthlyEarnings: 0,
    rating: 0,
    pendingCount: 0,
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
      // Load available jobs (open status)
      const { data: jobsData } = await supabaseUntyped
        .from('jobs')
        .select(`
          *,
          clients (company_name)
        `)
        .eq('status', 'open')
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: true })
        .limit(5);

      setAvailableJobs(jobsData || []);

      // Load upcoming assigned jobs
      const { data: assignmentsData } = await supabaseUntyped
        .from('job_assignments')
        .select(`
          *,
          jobs (
            *,
            clients (company_name)
          )
        `)
        .eq('worker_id', user?.id)
        .in('status', ['pending', 'confirmed'])
        .order('created_at', { ascending: false })
        .limit(5);

      setUpcomingJobs(assignmentsData || []);

      // Load pending applications
      const { data: applicationsData } = await supabaseUntyped
        .from('job_applications')
        .select(`
          *,
          jobs (
            *,
            clients (company_name)
          )
        `)
        .eq('worker_id', user?.id)
        .eq('status', 'pending')
        .order('applied_at', { ascending: false });

      setPendingApplications(applicationsData || []);

      // Calculate stats
      const { data: completedJobs } = await supabaseUntyped
        .from('job_assignments')
        .select('id')
        .eq('worker_id', user?.id)
        .eq('status', 'completed');

      setStats({
        totalJobs: workerProfile?.total_jobs || completedJobs?.length || 0,
        monthlyEarnings: 0, // Would need to calculate from completed jobs
        rating: workerProfile?.rating || 0,
        pendingCount: applicationsData?.length || 0,
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleApply(jobId: string) {
    try {
      const { error } = await supabaseUntyped.from('job_applications').insert({
        job_id: jobId,
        worker_id: user?.id,
        status: 'pending',
      });

      if (error) {
        if (error.message.includes('duplicate')) {
          alert('Você já se candidatou a esta vaga.');
        } else {
          alert('Erro ao candidatar. Tente novamente.');
        }
        return;
      }

      // Reload data
      loadDashboardData();
      alert('Candidatura enviada com sucesso!');
    } catch {
      alert('Erro ao candidatar. Tente novamente.');
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR');
  }

  function formatTime(timeStr: string) {
    return timeStr.slice(0, 5);
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
            <CardDescription>Total de Trabalhos</CardDescription>
            <CardTitle className="text-3xl">{stats.totalJobs}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Ganhos Este Mês</CardDescription>
            <CardTitle className="text-3xl">R$ {stats.monthlyEarnings.toFixed(2)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avaliação Média</CardDescription>
            <CardTitle className="text-3xl">
              {stats.rating > 0 ? `${stats.rating.toFixed(1)} ★` : 'N/A'}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Candidaturas Pendentes</CardDescription>
            <CardTitle className="text-3xl">{stats.pendingCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Próximos Trabalhos */}
        <Card>
          <CardHeader>
            <CardTitle>Próximos Trabalhos</CardTitle>
            <CardDescription>Trabalhos confirmados para os próximos dias</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingJobs.length > 0 ? (
              <div className="space-y-4">
                {upcomingJobs.map((assignment) => (
                  <div key={assignment.id} className="flex items-start justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{assignment.jobs.title}</h4>
                      <p className="text-sm text-muted-foreground">{assignment.jobs.clients?.company_name}</p>
                      <div className="flex gap-2 mt-2 text-sm text-muted-foreground">
                        <span>{formatDate(assignment.jobs.date)}</span>
                        <span>•</span>
                        <span>{formatTime(assignment.jobs.start_time)} - {formatTime(assignment.jobs.end_time)}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{assignment.jobs.location}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant={assignment.status === 'confirmed' ? 'default' : 'secondary'}>
                        {assignment.status === 'confirmed' ? 'Confirmado' : 'Pendente'}
                      </Badge>
                      <p className="mt-2 font-semibold">R$ {assignment.jobs.hourly_rate}/h</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                Nenhum trabalho agendado
              </p>
            )}
          </CardContent>
        </Card>

        {/* Vagas Disponíveis */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Vagas Disponíveis</CardTitle>
                <CardDescription>Oportunidades abertas para candidatura</CardDescription>
              </div>
              <Link to="/worker/jobs">
                <Button variant="outline" size="sm">Ver Todas</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {availableJobs.length > 0 ? (
              <div className="space-y-4">
                {availableJobs.map((job) => (
                  <div key={job.id} className="flex items-start justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{job.title}</h4>
                      <p className="text-sm text-muted-foreground">{job.clients?.company_name}</p>
                      <div className="flex gap-2 mt-2 text-sm text-muted-foreground">
                        <span>{formatDate(job.date)}</span>
                        <span>•</span>
                        <span>{formatTime(job.start_time)} - {formatTime(job.end_time)}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{job.location}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary">{job.required_workers} vaga(s)</Badge>
                      <p className="mt-2 font-semibold">R$ {job.hourly_rate}/h</p>
                      <Button size="sm" className="mt-2" onClick={() => handleApply(job.id)}>
                        Candidatar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                Nenhuma vaga disponível no momento
              </p>
            )}
          </CardContent>
        </Card>

        {/* Candidaturas Pendentes */}
        {pendingApplications.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Candidaturas Pendentes</CardTitle>
              <CardDescription>Aguardando resposta das empresas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {pendingApplications.map((application) => (
                  <div key={application.id} className="p-4 border rounded-lg">
                    <h4 className="font-medium">{application.jobs.title}</h4>
                    <p className="text-sm text-muted-foreground">{application.jobs.clients?.company_name}</p>
                    <div className="flex gap-2 mt-2 text-sm text-muted-foreground">
                      <span>{formatDate(application.jobs.date)}</span>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <Badge variant="outline">Aguardando</Badge>
                      <span className="font-semibold">R$ {application.jobs.hourly_rate}/h</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
