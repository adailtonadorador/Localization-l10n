import { useEffect, useState } from "react";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabaseUntyped } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface JobApplication {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  applied_at: string;
  job_id: string;
  worker_id: string;
  workers: {
    id: string;
    cpf: string;
    rating: number;
    total_jobs: number;
    skills: string[];
    users: {
      name: string;
      email: string;
      phone: string;
    };
  };
  jobs: {
    id: string;
    title: string;
    date: string;
    hourly_rate: number;
  };
}

export function ClientCandidatesPage() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadApplications();
    }
  }, [user]);

  async function loadApplications() {
    setLoading(true);
    try {
      // First get client's job IDs
      const { data: jobsData } = await supabaseUntyped
        .from('jobs')
        .select('id')
        .eq('client_id', user?.id);

      const jobIds = (jobsData || []).map((j: { id: string }) => j.id);

      if (jobIds.length === 0) {
        setApplications([]);
        setLoading(false);
        return;
      }

      // Get applications for those jobs
      const { data } = await supabaseUntyped
        .from('job_applications')
        .select(`
          *,
          workers (
            id,
            cpf,
            rating,
            total_jobs,
            skills,
            users (name, email, phone)
          ),
          jobs (id, title, date, hourly_rate)
        `)
        .in('job_id', jobIds)
        .order('applied_at', { ascending: false });

      setApplications(data || []);
    } catch (error) {
      console.error('Error loading applications:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(applicationId: string, jobId: string, workerId: string) {
    try {
      await supabaseUntyped
        .from('job_applications')
        .update({ status: 'approved' })
        .eq('id', applicationId);

      await supabaseUntyped.from('job_assignments').insert({
        job_id: jobId,
        worker_id: workerId,
        status: 'pending',
      });

      loadApplications();
      alert('Candidatura aprovada!');
    } catch (error) {
      console.error('Error approving:', error);
      alert('Erro ao aprovar candidatura.');
    }
  }

  async function handleReject(applicationId: string) {
    try {
      await supabaseUntyped
        .from('job_applications')
        .update({ status: 'rejected' })
        .eq('id', applicationId);

      loadApplications();
      alert('Candidatura recusada.');
    } catch (error) {
      console.error('Error rejecting:', error);
      alert('Erro ao recusar candidatura.');
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR');
  }

  function formatDateTime(dateStr: string) {
    return new Date(dateStr).toLocaleString('pt-BR');
  }

  const pendingApplications = applications.filter(a => a.status === 'pending');
  const approvedApplications = applications.filter(a => a.status === 'approved');
  const rejectedApplications = applications.filter(a => a.status === 'rejected');

  function ApplicationCard({ application, showActions = false }: { application: JobApplication; showActions?: boolean }) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <Avatar className="h-12 w-12">
              <AvatarFallback>
                {application.workers?.users?.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '??'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{application.workers?.users?.name}</h3>
                  <p className="text-sm text-muted-foreground">{application.workers?.users?.email}</p>
                  {application.workers?.users?.phone && (
                    <p className="text-sm text-muted-foreground">{application.workers?.users?.phone}</p>
                  )}
                </div>
                <Badge variant={
                  application.status === 'pending' ? 'outline' :
                  application.status === 'approved' ? 'default' : 'destructive'
                }>
                  {application.status === 'pending' ? 'Pendente' :
                   application.status === 'approved' ? 'Aprovado' : 'Recusado'}
                </Badge>
              </div>

              <div className="mt-3 p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium">Vaga: {application.jobs?.title}</p>
                <p className="text-xs text-muted-foreground">
                  Data: {formatDate(application.jobs?.date)} • R$ {application.jobs?.hourly_rate}/h
                </p>
              </div>

              <div className="flex items-center gap-4 mt-3 text-sm">
                <span className="flex items-center gap-1">
                  <span className="text-yellow-500">★</span>
                  {application.workers?.rating?.toFixed(1) || 'N/A'}
                </span>
                <span className="text-muted-foreground">
                  {application.workers?.total_jobs || 0} trabalhos
                </span>
              </div>

              {application.workers?.skills?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {application.workers.skills.slice(0, 4).map((skill, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">{skill}</Badge>
                  ))}
                  {application.workers.skills.length > 4 && (
                    <Badge variant="secondary" className="text-xs">+{application.workers.skills.length - 4}</Badge>
                  )}
                </div>
              )}

              <p className="text-xs text-muted-foreground mt-3">
                Candidatou em: {formatDateTime(application.applied_at)}
              </p>

              {showActions && (
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleReject(application.id)}
                  >
                    Recusar
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleApprove(application.id, application.job_id, application.worker_id)}
                  >
                    Aprovar
                  </Button>
                </div>
              )}
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
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Candidatos</h2>
        <p className="text-muted-foreground">Gerencie as candidaturas para suas vagas</p>
      </div>

      <Tabs defaultValue="pending">
        <TabsList className="mb-6">
          <TabsTrigger value="pending">Pendentes ({pendingApplications.length})</TabsTrigger>
          <TabsTrigger value="approved">Aprovados ({approvedApplications.length})</TabsTrigger>
          <TabsTrigger value="rejected">Recusados ({rejectedApplications.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          {pendingApplications.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {pendingApplications.map((application) => (
                <ApplicationCard key={application.id} application={application} showActions />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Nenhuma candidatura pendente.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="approved">
          {approvedApplications.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {approvedApplications.map((application) => (
                <ApplicationCard key={application.id} application={application} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Nenhuma candidatura aprovada.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="rejected">
          {rejectedApplications.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {rejectedApplications.map((application) => (
                <ApplicationCard key={application.id} application={application} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Nenhuma candidatura recusada.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
