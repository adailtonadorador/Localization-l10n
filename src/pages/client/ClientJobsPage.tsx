import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabaseUntyped } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Job {
  id: string;
  title: string;
  description: string | null;
  location: string;
  date: string;
  start_time: string;
  end_time: string;
  hourly_rate: number;
  required_workers: number;
  skills_required: string[];
  status: string;
  created_at: string;
}

export function ClientJobsPage() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadJobs();
    }
  }, [user]);

  async function loadJobs() {
    setLoading(true);
    try {
      const { data } = await supabaseUntyped
        .from('jobs')
        .select('*')
        .eq('client_id', user?.id)
        .order('created_at', { ascending: false });

      setJobs(data || []);
    } catch (error) {
      console.error('Error loading jobs:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCancelJob(jobId: string) {
    if (!confirm('Tem certeza que deseja cancelar esta vaga?')) return;

    try {
      await supabaseUntyped
        .from('jobs')
        .update({ status: 'cancelled' })
        .eq('id', jobId);

      loadJobs();
      alert('Vaga cancelada.');
    } catch {
      alert('Erro ao cancelar vaga.');
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
        return <Badge className="bg-green-500">Concluída</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelada</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  }

  const openJobs = jobs.filter(j => j.status === 'open');
  const activeJobs = jobs.filter(j => ['assigned', 'in_progress'].includes(j.status));
  const completedJobs = jobs.filter(j => j.status === 'completed');
  const cancelledJobs = jobs.filter(j => j.status === 'cancelled');

  function JobCard({ job, showCancel = false }: { job: Job; showCancel?: boolean }) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg">{job.title}</CardTitle>
              <CardDescription>{job.location}</CardDescription>
            </div>
            {getStatusBadge(job.status)}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>{formatDate(job.date)}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{formatTime(job.start_time)} - {formatTime(job.end_time)}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span>{job.required_workers} trabalhador(es)</span>
            </div>
            {job.skills_required?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {job.skills_required.slice(0, 3).map((skill, index) => (
                  <Badge key={index} variant="outline" className="text-xs">{skill}</Badge>
                ))}
                {job.skills_required.length > 3 && (
                  <Badge variant="outline" className="text-xs">+{job.skills_required.length - 3}</Badge>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <span className="text-lg font-bold">R$ {job.hourly_rate}/h</span>
            <div className="flex gap-2">
              {showCancel && (
                <Button variant="destructive" size="sm" onClick={() => handleCancelJob(job.id)}>
                  Cancelar
                </Button>
              )}
              <Link to={`/client/jobs/${job.id}`}>
                <Button variant="outline" size="sm">Ver Detalhes</Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    );
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">Minhas Vagas</h2>
          <p className="text-muted-foreground">Gerencie suas vagas publicadas</p>
        </div>
        <Link to="/client/jobs/new">
          <Button>Nova Vaga</Button>
        </Link>
      </div>

      <Tabs defaultValue="open">
        <TabsList className="mb-6">
          <TabsTrigger value="open">Abertas ({openJobs.length})</TabsTrigger>
          <TabsTrigger value="active">Em Andamento ({activeJobs.length})</TabsTrigger>
          <TabsTrigger value="completed">Concluídas ({completedJobs.length})</TabsTrigger>
          <TabsTrigger value="cancelled">Canceladas ({cancelledJobs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="open">
          {openJobs.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {openJobs.map((job) => (
                <JobCard key={job.id} job={job} showCancel />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground mb-4">Nenhuma vaga aberta.</p>
                <Link to="/client/jobs/new">
                  <Button>Criar Nova Vaga</Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="active">
          {activeJobs.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {activeJobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Nenhuma vaga em andamento.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="completed">
          {completedJobs.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {completedJobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Nenhuma vaga concluída.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="cancelled">
          {cancelledJobs.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {cancelledJobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Nenhuma vaga cancelada.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
