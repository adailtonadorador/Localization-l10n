import { useEffect, useState } from "react";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabaseUntyped } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Star, MapPin, Clock, Calendar, Award } from "lucide-react";

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
      // Fetch completed work records with job_assignment data directly
      const { data: workRecords, error: workRecordsError } = await supabaseUntyped
        .from('work_records')
        .select(`
          *,
          jobs (
            *,
            clients (company_name)
          ),
          job_assignments!work_records_job_assignment_id_fkey (
            id,
            rating,
            feedback
          )
        `)
        .eq('worker_id', profile?.id)
        .eq('status', 'completed')
        .order('work_date', { ascending: false });

      if (workRecordsError) {
        console.error('[WorkerHistory] Error loading work records:', workRecordsError);
      }

      if (!workRecords || workRecords.length === 0) {
        setRecords([]);
        setLoading(false);
        return;
      }

      // Map records with rating/feedback from job_assignments
      const recordsWithRatings = workRecords.map((r: any) => {
        // Try to get from direct relation first
        const directAssignment = r.job_assignments;

        return {
          ...r,
          rating: directAssignment?.rating ?? null,
          feedback: directAssignment?.feedback ?? null,
        };
      });

      // If no ratings found via direct relation, try fetching separately
      const recordsWithoutRatings = recordsWithRatings.filter((r: any) => r.rating === null);
      if (recordsWithoutRatings.length > 0) {
        const jobIds = [...new Set(recordsWithoutRatings.map((r: any) => r.job_id))];
        const { data: assignments } = await supabaseUntyped
          .from('job_assignments')
          .select('job_id, rating, feedback')
          .eq('worker_id', profile?.id)
          .in('job_id', jobIds);

        if (assignments && assignments.length > 0) {
          const ratingsMap = new Map<string, { rating: number | null; feedback: string | null }>();
          assignments.forEach((a: any) => {
            ratingsMap.set(a.job_id, { rating: a.rating, feedback: a.feedback });
          });

          // Update records that didn't have ratings from direct relation
          recordsWithRatings.forEach((r: any) => {
            if (r.rating === null && ratingsMap.has(r.job_id)) {
              r.rating = ratingsMap.get(r.job_id)?.rating ?? null;
              r.feedback = ratingsMap.get(r.job_id)?.feedback ?? null;
            }
          });
        }
      }

      setRecords(recordsWithRatings);
    } catch (error) {
      console.error('[WorkerHistory] Error loading history:', error);
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

  // Calculate stats
  const completedRecords = records.filter(r => r.status === 'completed');
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
        <p className="text-muted-foreground">Acompanhe seu desempenho na plataforma</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 mb-8">
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

                    <div className="space-y-3 mt-4">
                      {/* Data, Horário e Valor */}
                      <div className="flex flex-wrap gap-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-sm">
                            <span className="text-muted-foreground">Data: </span>
                            <span className="font-medium">{formatDate(record.work_date)}</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-sm">
                            <span className="text-muted-foreground">Horário: </span>
                            <span className="font-medium">
                              {formatTime(record.jobs.start_time)} - {formatTime(record.jobs.end_time)}
                            </span>
                          </span>
                        </div>
                      </div>
                      {/* Local em linha separada */}
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                        <span className="text-sm">
                          <span className="text-muted-foreground">Local: </span>
                          <span className="font-medium">{record.jobs.location}</span>
                        </span>
                      </div>
                    </div>

                    {record.feedback && (
                      <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-xl">
                        <p className="text-xs font-medium text-blue-700 mb-1">Feedback da empresa:</p>
                        <p className="text-sm text-blue-900">{record.feedback}</p>
                      </div>
                    )}
                  </div>

                  {/* Rating */}
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
