import { useEffect, useState } from "react";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabaseUntyped } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Briefcase, DollarSign, Star, MapPin, Clock, Calendar, TrendingUp, Award } from "lucide-react";

interface WorkRecord {
  id: string;
  work_date: string;
  status: string;
  check_in: string | null;
  check_out: string | null;
  job_id: string;
  worker_id: string;
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
  // Rating from job_assignment
  rating?: number | null;
  feedback?: string | null;
}

export function WorkerHistoryPage() {
  const { profile } = useAuth();
  const [records, setRecords] = useState<WorkRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.id) {
      loadHistory();
    }
  }, [profile?.id]);

  async function loadHistory() {
    setLoading(true);
    try {
      // Fetch completed work records
      const { data: workRecords } = await supabaseUntyped
        .from('work_records')
        .select(`
          *,
          jobs (
            *,
            clients (company_name)
          )
        `)
        .eq('worker_id', profile?.id)
        .eq('status', 'completed')
        .order('work_date', { ascending: false });

      if (!workRecords || workRecords.length === 0) {
        setRecords([]);
        setLoading(false);
        return;
      }

      // Fetch ratings from job_assignments
      const jobIds = [...new Set(workRecords.map((r: any) => r.job_id))];
      const { data: assignments } = await supabaseUntyped
        .from('job_assignments')
        .select('job_id, rating, feedback')
        .eq('worker_id', profile?.id)
        .in('job_id', jobIds);

      // Merge ratings with work records
      const ratingsMap = new Map<string, { rating: number | null; feedback: string | null }>();
      (assignments || []).forEach((a: any) => {
        ratingsMap.set(a.job_id, { rating: a.rating, feedback: a.feedback });
      });

      const recordsWithRatings = workRecords.map((r: any) => ({
        ...r,
        rating: ratingsMap.get(r.job_id)?.rating || null,
        feedback: ratingsMap.get(r.job_id)?.feedback || null,
      }));

      setRecords(recordsWithRatings);
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

  function calculateEarnings(record: WorkRecord) {
    if (!record.check_in || !record.check_out) {
      // Estimate based on job hours
      const start = new Date(`2000-01-01T${record.jobs.start_time}`);
      const end = new Date(`2000-01-01T${record.jobs.end_time}`);
      const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      return hours * record.jobs.daily_rate;
    }
    const checkIn = new Date(record.check_in);
    const checkOut = new Date(record.check_out);
    const hours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
    return hours * record.jobs.daily_rate;
  }

  // Calculate stats
  const completedRecords = records.filter(r => r.status === 'completed');
  const totalEarnings = completedRecords.reduce((sum, r) => sum + calculateEarnings(r), 0);
  const avgRating = completedRecords.filter(r => r.rating).reduce((sum, r, _, arr) => sum + (r.rating || 0) / arr.length, 0);

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
        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-xl">
                <Briefcase className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-blue-600">{completedRecords.length}</p>
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
                  R$ {completedRecords.length > 0 ? (totalEarnings / completedRecords.length).toFixed(0) : '0'}
                </p>
                <p className="text-sm text-muted-foreground">Média por Trabalho</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Jobs List */}
      {records.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 bg-slate-800 rounded-lg">
              <Clock className="h-4 w-4 text-white" />
            </div>
            <h3 className="text-lg font-semibold">Trabalhos Realizados</h3>
            <Badge variant="secondary">{records.length}</Badge>
          </div>

          {records.map((record) => (
            <Card key={record.id} className="border-0 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
              <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                record.status === 'completed' ? 'bg-green-500' : 'bg-red-500'
              }`} />
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                  {/* Main Info */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-lg text-slate-900">{record.jobs.title}</h3>
                        <p className="text-sm text-muted-foreground">{record.jobs.clients?.company_name}</p>
                      </div>
                      {getStatusBadge(record.status)}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Data</p>
                          <p className="font-medium text-sm">{formatDate(record.work_date)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Horário</p>
                          <p className="font-medium text-sm">
                            {formatTime(record.jobs.start_time)} - {formatTime(record.jobs.end_time)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Local</p>
                          <p className="font-medium text-sm truncate">{record.jobs.location}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Valor/hora</p>
                          <p className="font-medium text-sm">R$ {record.jobs.daily_rate}</p>
                        </div>
                      </div>
                    </div>

                    {record.feedback && (
                      <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-xl">
                        <p className="text-xs font-medium text-blue-700 mb-1">Feedback da empresa:</p>
                        <p className="text-sm text-blue-900">{record.feedback}</p>
                      </div>
                    )}
                  </div>

                  {/* Rating & Earnings */}
                  <div className="flex lg:flex-col items-center gap-4 p-4 bg-slate-50 rounded-xl min-w-[140px]">
                    {record.rating ? (
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
                          <span className="text-2xl font-bold">{record.rating}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">Avaliação</p>
                      </div>
                    ) : (
                      <div className="text-center">
                        <Award className="h-6 w-6 text-slate-300 mx-auto mb-1" />
                        <p className="text-xs text-muted-foreground">Sem avaliação</p>
                      </div>
                    )}

                    {record.status === 'completed' && (
                      <div className="text-center lg:border-t lg:pt-4 lg:mt-2">
                        <p className="text-xl font-bold text-green-600">
                          +R$ {calculateEarnings(record).toFixed(0)}
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
