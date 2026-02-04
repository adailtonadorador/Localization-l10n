import { useEffect, useState } from "react";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabaseUntyped } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Briefcase, DollarSign, Star, MapPin, Clock, Calendar, TrendingUp, Award } from "lucide-react";

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
    daily_rate: number;
    clients: {
      company_name: string;
    };
  };
}

export function WorkerHistoryPage() {
  const { profile } = useAuth();
  const [assignments, setAssignments] = useState<JobAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.id) {
      loadHistory();
    }
  }, [profile?.id]);

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
        .eq('worker_id', profile?.id)
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
      return hours * assignment.jobs.daily_rate;
    }
    const checkIn = new Date(assignment.check_in_time);
    const checkOut = new Date(assignment.check_out_time);
    const hours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
    return hours * assignment.jobs.daily_rate;
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
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Histórico de Trabalhos</h2>
        <p className="text-muted-foreground">Acompanhe seu desempenho e ganhos na plataforma</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-100 rounded-xl">
                <Briefcase className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-emerald-600">{completedJobs.length}</p>
                <p className="text-sm text-muted-foreground">Trabalhos Concluídos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-xl">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-green-600">R$ {totalEarnings.toFixed(0)}</p>
                <p className="text-sm text-muted-foreground">Total Ganho</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-100 rounded-xl">
                <Star className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-amber-600">
                  {avgRating > 0 ? avgRating.toFixed(1) : '-'}
                </p>
                <p className="text-sm text-muted-foreground">Avaliação Média</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-xl">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-blue-600">
                  R$ {completedJobs.length > 0 ? (totalEarnings / completedJobs.length).toFixed(0) : '0'}
                </p>
                <p className="text-sm text-muted-foreground">Média por Trabalho</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Jobs List */}
      {assignments.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 bg-slate-800 rounded-lg">
              <Clock className="h-4 w-4 text-white" />
            </div>
            <h3 className="text-lg font-semibold">Trabalhos Realizados</h3>
            <Badge variant="secondary">{assignments.length}</Badge>
          </div>

          {assignments.map((assignment) => (
            <Card key={assignment.id} className="border-0 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
              <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                assignment.status === 'completed' ? 'bg-green-500' : 'bg-red-500'
              }`} />
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                  {/* Main Info */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-lg text-slate-900">{assignment.jobs.title}</h3>
                        <p className="text-sm text-muted-foreground">{assignment.jobs.clients?.company_name}</p>
                      </div>
                      {getStatusBadge(assignment.status)}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Data</p>
                          <p className="font-medium text-sm">{formatDate(assignment.jobs.date)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Horário</p>
                          <p className="font-medium text-sm">
                            {formatTime(assignment.jobs.start_time)} - {formatTime(assignment.jobs.end_time)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Local</p>
                          <p className="font-medium text-sm truncate">{assignment.jobs.location}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Valor/hora</p>
                          <p className="font-medium text-sm">R$ {assignment.jobs.daily_rate}</p>
                        </div>
                      </div>
                    </div>

                    {assignment.feedback && (
                      <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-xl">
                        <p className="text-xs font-medium text-blue-700 mb-1">Feedback da empresa:</p>
                        <p className="text-sm text-blue-900">{assignment.feedback}</p>
                      </div>
                    )}
                  </div>

                  {/* Rating & Earnings */}
                  <div className="flex lg:flex-col items-center gap-4 p-4 bg-slate-50 rounded-xl min-w-[140px]">
                    {assignment.rating ? (
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
                          <span className="text-2xl font-bold">{assignment.rating}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">Avaliação</p>
                      </div>
                    ) : (
                      <div className="text-center">
                        <Award className="h-6 w-6 text-slate-300 mx-auto mb-1" />
                        <p className="text-xs text-muted-foreground">Sem avaliação</p>
                      </div>
                    )}

                    {assignment.status === 'completed' && (
                      <div className="text-center lg:border-t lg:pt-4 lg:mt-2">
                        <p className="text-xl font-bold text-green-600">
                          +R$ {calculateEarnings(assignment).toFixed(0)}
                        </p>
                        <p className="text-xs text-muted-foreground">Ganho</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Briefcase className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Nenhum trabalho realizado</h3>
            <p className="text-muted-foreground">
              Seu histórico de trabalhos aparecerá aqui após completar suas primeiras vagas.
            </p>
          </CardContent>
        </Card>
      )}
    </DashboardLayout>
  );
}
