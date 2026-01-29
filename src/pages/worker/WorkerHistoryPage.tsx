import { useEffect, useState } from "react";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabaseUntyped } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface JobAssignment {
  id: string;
  status: 'pending' | 'confirmed' | 'completed' | 'no_show';
  check_in_time: string | null;
  check_out_time: string | null;
  rating: number | null;
  feedback: string | null;
  created_at: string;
  jobs: {
    id: string;
    title: string;
    location: string;
    date: string;
    start_time: string;
    end_time: string;
    hourly_rate: number;
    clients: {
      company_name: string;
    };
  };
}

export function WorkerHistoryPage() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<JobAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadHistory();
    }
  }, [user]);

  async function loadHistory() {
    setLoading(true);
    try {
      const { data } = await supabaseUntyped
        .from('job_assignments')
        .select(`
          *,
          jobs (
            *,
            clients (company_name)
          )
        `)
        .eq('worker_id', user?.id)
        .in('status', ['completed', 'no_show'])
        .order('created_at', { ascending: false });

      setAssignments(data || []);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
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
      case 'completed':
        return <Badge variant="default">Concluído</Badge>;
      case 'no_show':
        return <Badge variant="destructive">Não Compareceu</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  }

  function calculateEarnings(assignment: JobAssignment) {
    if (!assignment.check_in_time || !assignment.check_out_time) {
      // Estimate based on job hours
      const start = new Date(`2000-01-01T${assignment.jobs.start_time}`);
      const end = new Date(`2000-01-01T${assignment.jobs.end_time}`);
      const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      return hours * assignment.jobs.hourly_rate;
    }
    const checkIn = new Date(assignment.check_in_time);
    const checkOut = new Date(assignment.check_out_time);
    const hours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
    return hours * assignment.jobs.hourly_rate;
  }

  // Calculate stats
  const completedJobs = assignments.filter(a => a.status === 'completed');
  const totalEarnings = completedJobs.reduce((sum, a) => sum + calculateEarnings(a), 0);
  const avgRating = completedJobs.filter(a => a.rating).reduce((sum, a, _, arr) => sum + (a.rating || 0) / arr.length, 0);

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
        <h2 className="text-2xl font-bold mb-2">Histórico de Trabalhos</h2>
        <p className="text-muted-foreground">Seus trabalhos realizados</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total de Trabalhos</CardDescription>
            <CardTitle className="text-3xl">{completedJobs.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Ganho</CardDescription>
            <CardTitle className="text-3xl">R$ {totalEarnings.toFixed(2)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avaliação Média</CardDescription>
            <CardTitle className="text-3xl">
              {avgRating > 0 ? `${avgRating.toFixed(1)} ★` : 'N/A'}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {assignments.length > 0 ? (
        <div className="space-y-4">
          {assignments.map((assignment) => (
            <Card key={assignment.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">{assignment.jobs.title}</h3>
                      {getStatusBadge(assignment.status)}
                    </div>
                    <p className="text-muted-foreground">{assignment.jobs.clients?.company_name}</p>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Data</p>
                        <p className="font-medium">{formatDate(assignment.jobs.date)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Horário</p>
                        <p className="font-medium">
                          {formatTime(assignment.jobs.start_time)} - {formatTime(assignment.jobs.end_time)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Local</p>
                        <p className="font-medium">{assignment.jobs.location}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Valor/hora</p>
                        <p className="font-medium">R$ {assignment.jobs.hourly_rate}</p>
                      </div>
                    </div>

                    {assignment.feedback && (
                      <div className="mt-4 p-3 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">Feedback da empresa:</p>
                        <p className="text-sm mt-1">{assignment.feedback}</p>
                      </div>
                    )}
                  </div>

                  <div className="text-right ml-4">
                    {assignment.rating && (
                      <div className="mb-2">
                        <span className="text-2xl font-bold">{assignment.rating}</span>
                        <span className="text-yellow-500"> ★</span>
                      </div>
                    )}
                    {assignment.status === 'completed' && (
                      <p className="text-lg font-bold text-green-600">
                        + R$ {calculateEarnings(assignment).toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Nenhum trabalho realizado ainda.</p>
          </CardContent>
        </Card>
      )}
    </DashboardLayout>
  );
}
