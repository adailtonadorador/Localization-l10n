import { useEffect, useState } from "react";
import { toast } from "sonner";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabaseUntyped } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface JobApplication {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  applied_at: string;
  jobs: {
    id: string;
    title: string;
    description: string;
    location: string;
    date: string;
    start_time: string;
    end_time: string;
    daily_rate: number;
    clients: {
      company_name: string;
    };
  };
}

export function WorkerApplicationsPage() {
  const { profile } = useAuth();
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.id) {
      loadApplications();
    }
  }, [profile?.id]);

  async function loadApplications() {
    setLoading(true);
    try {
      const { data } = await supabaseUntyped
        .from('job_applications')
        .select(`
          *,
          jobs (
            *,
            clients (company_name)
          )
        `)
        .eq('worker_id', profile?.id)
        .order('applied_at', { ascending: false });

      setApplications(data || []);
    } catch (error) {
      console.error('Error loading applications:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCancelApplication(applicationId: string) {
    if (!confirm('Tem certeza que deseja cancelar esta candidatura?')) return;

    try {
      const { error } = await supabaseUntyped
        .from('job_applications')
        .delete()
        .eq('id', applicationId);

      if (error) {
        toast.error('Erro ao cancelar candidatura.');
        return;
      }

      setApplications(applications.filter(a => a.id !== applicationId));
      toast.success('Candidatura cancelada.');
    } catch {
      toast.error('Erro ao cancelar candidatura.');
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR');
  }

  function formatTime(timeStr: string) {
    return timeStr.slice(0, 5);
  }

  function formatDateTime(dateStr: string) {
    return new Date(dateStr).toLocaleString('pt-BR');
  }

  const pendingApplications = applications.filter(a => a.status === 'pending');
  const approvedApplications = applications.filter(a => a.status === 'approved');
  const rejectedApplications = applications.filter(a => a.status === 'rejected');

  function getStatusBadge(status: string) {
    switch (status) {
      case 'pending':
        return <Badge variant="outline">Aguardando</Badge>;
      case 'approved':
        return <Badge variant="default">Aprovado</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Recusado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  }

  function ApplicationCard({ application, showCancel = false }: { application: JobApplication; showCancel?: boolean }) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg">{application.jobs.title}</CardTitle>
              <CardDescription>{application.jobs.clients?.company_name}</CardDescription>
            </div>
            {getStatusBadge(application.status)}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>{formatDate(application.jobs.date)}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{formatTime(application.jobs.start_time)} - {formatTime(application.jobs.end_time)}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>{application.jobs.location}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Candidatou em: {formatDateTime(application.applied_at)}
            </p>
          </div>
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <span className="text-lg font-bold">R$ {application.jobs.daily_rate}/dia</span>
            {showCancel && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleCancelApplication(application.id)}
              >
                Cancelar
              </Button>
            )}
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
        <h2 className="text-2xl font-bold mb-2">Minhas Candidaturas</h2>
        <p className="text-muted-foreground">Acompanhe o status das suas candidaturas</p>
      </div>

      <Tabs defaultValue="pending">
        <TabsList className="mb-6">
          <TabsTrigger value="pending">
            Pendentes ({pendingApplications.length})
          </TabsTrigger>
          <TabsTrigger value="approved">
            Aprovadas ({approvedApplications.length})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Recusadas ({rejectedApplications.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          {pendingApplications.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {pendingApplications.map((application) => (
                <ApplicationCard key={application.id} application={application} showCancel />
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
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
