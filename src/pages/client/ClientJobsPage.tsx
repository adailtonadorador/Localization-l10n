import { useEffect, useState } from "react";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabaseUntyped } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Eye, Users, Calendar, Clock, MapPin, Phone, Mail, Star, CheckCircle, XCircle, FileSignature, User } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface WorkRecord {
  id: string;
  work_date: string;
  check_in: string | null;
  check_out: string | null;
  signature_data: string | null;
  signed_at: string | null;
  status: string;
  workers: {
    id: string;
    rating: number;
    total_jobs: number;
    users: {
      name: string;
      email: string;
      phone: string | null;
    };
  };
}

interface Job {
  id: string;
  title: string;
  description: string | null;
  location: string;
  date: string;
  dates: string[] | null;
  start_time: string;
  end_time: string;
  hourly_rate: number;
  required_workers: number;
  skills_required: string[];
  status: string;
  created_at: string;
  job_assignments: { id: string }[];
  work_records: WorkRecord[];
}

export function ClientJobsPage() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

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
        .select(`
          *,
          job_assignments (id),
          work_records (
            id,
            work_date,
            check_in,
            check_out,
            signature_data,
            signed_at,
            status,
            workers (
              id,
              rating,
              total_jobs,
              users (name, email, phone)
            )
          )
        `)
        .eq('client_id', user?.id)
        .order('created_at', { ascending: false });

      setJobs((data || []) as Job[]);
    } catch (error) {
      console.error('Error loading jobs:', error);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short'
    });
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

  function formatDateTime(dateStr: string | null) {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'open':
        return <Badge className="bg-emerald-500">Aberta</Badge>;
      case 'assigned':
        return <Badge className="bg-purple-500 text-white">Atribuída</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-500">Em Andamento</Badge>;
      case 'completed':
        return <Badge className="bg-green-500">Concluída</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelada</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  }

  function getRecordStatusBadge(status: string) {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500">Concluído</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-500">Trabalhando</Badge>;
      case 'absent':
        return <Badge variant="destructive">Falta</Badge>;
      default:
        return <Badge variant="secondary">Pendente</Badge>;
    }
  }

  function openDetails(job: Job) {
    setSelectedJob(job);
    setDetailsOpen(true);
  }

  const openJobs = jobs.filter(j => j.status === 'open');
  const activeJobs = jobs.filter(j => ['assigned', 'in_progress'].includes(j.status));
  const completedJobs = jobs.filter(j => j.status === 'completed');
  const cancelledJobs = jobs.filter(j => j.status === 'cancelled');

  function JobCard({ job }: { job: Job }) {
    const isAssigned = job.status === 'assigned';
    const isInProgress = job.status === 'in_progress';

    return (
      <Card className={`transition-all ${
        isAssigned
          ? 'border-2 border-purple-300 bg-gradient-to-br from-purple-50 to-white shadow-purple-100 shadow-md'
          : isInProgress
          ? 'border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-white shadow-blue-100 shadow-md'
          : ''
      }`}>
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
              <Calendar className="h-4 w-4" />
              <span>{formatJobDates(job.dates, job.date)}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{formatTime(job.start_time)} - {formatTime(job.end_time)}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{job.job_assignments?.length || 0}/{job.required_workers} trabalhador(es)</span>
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
            <Button variant="outline" size="sm" onClick={() => openDetails(job)}>
              <Eye className="h-4 w-4 mr-1" />
              Ver Detalhes
            </Button>
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
        <h2 className="text-2xl font-bold mb-2">Minhas Vagas</h2>
        <p className="text-muted-foreground">Acompanhe as vagas criadas para sua empresa</p>
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
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Nenhuma vaga aberta.</p>
                <p className="text-sm text-muted-foreground mt-1">Entre em contato com o administrador para criar novas vagas.</p>
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

      {/* Job Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto p-0">
          {selectedJob && (
            <>
              {/* Header com gradiente */}
              <div className={`p-6 ${
                selectedJob.status === 'assigned'
                  ? 'bg-gradient-to-r from-purple-500 to-purple-600'
                  : selectedJob.status === 'in_progress'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600'
                  : selectedJob.status === 'completed'
                  ? 'bg-gradient-to-r from-green-500 to-green-600'
                  : 'bg-gradient-to-r from-slate-600 to-slate-700'
              } text-white`}>
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold mb-1">{selectedJob.title}</h2>
                    <p className="text-white/80 text-sm">{selectedJob.location}</p>
                  </div>
                  {getStatusBadge(selectedJob.status)}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                  <div className="bg-white/10 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-white/70 text-xs mb-1">
                      <Calendar className="h-3 w-3" />
                      Datas
                    </div>
                    <p className="font-semibold text-sm">{formatJobDates(selectedJob.dates, selectedJob.date)}</p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-white/70 text-xs mb-1">
                      <Clock className="h-3 w-3" />
                      Horário
                    </div>
                    <p className="font-semibold text-sm">{formatTime(selectedJob.start_time)} - {formatTime(selectedJob.end_time)}</p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-white/70 text-xs mb-1">
                      <Users className="h-3 w-3" />
                      Vagas
                    </div>
                    <p className="font-semibold text-sm">{selectedJob.job_assignments?.length || 0}/{selectedJob.required_workers} preenchidas</p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-white/70 text-xs mb-1">
                      <Star className="h-3 w-3" />
                      Valor/Hora
                    </div>
                    <p className="font-semibold text-sm">R$ {selectedJob.hourly_rate}</p>
                  </div>
                </div>
              </div>

              {/* Conteúdo */}
              <div className="p-6 space-y-6">
                {/* Descrição */}
                {selectedJob.description && (
                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground mb-2">Descrição</h3>
                    <p className="text-sm bg-slate-50 p-3 rounded-lg">{selectedJob.description}</p>
                  </div>
                )}

                {/* Skills */}
                {selectedJob.skills_required?.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground mb-2">Habilidades Requeridas</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedJob.skills_required.map((skill, index) => (
                        <Badge key={index} variant="secondary" className="bg-slate-100">{skill}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Trabalhadores */}
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-3 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Trabalhadores Atribuídos ({selectedJob.job_assignments?.length || 0})
                  </h3>

                  {selectedJob.work_records && selectedJob.work_records.length > 0 ? (
                    <div className="space-y-4">
                      {/* Agrupar por trabalhador */}
                      {(() => {
                        const workerRecords = selectedJob.work_records.reduce((acc, record) => {
                          const workerId = record.workers?.id || 'unknown';
                          if (!acc[workerId]) {
                            acc[workerId] = {
                              worker: record.workers,
                              records: []
                            };
                          }
                          acc[workerId].records.push(record);
                          return acc;
                        }, {} as Record<string, { worker: WorkRecord['workers'], records: WorkRecord[] }>);

                        return Object.entries(workerRecords).map(([workerId, data]) => (
                          <div key={workerId} className="border rounded-xl overflow-hidden">
                            {/* Info do trabalhador */}
                            <div className="bg-gradient-to-r from-slate-50 to-slate-100 p-4">
                              <div className="flex items-center gap-4">
                                <Avatar className="h-14 w-14 ring-2 ring-white shadow-lg">
                                  <AvatarFallback className="bg-purple-500 text-white text-lg font-bold">
                                    {data.worker?.users?.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '??'}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                  <h4 className="font-bold text-lg">{data.worker?.users?.name || 'N/A'}</h4>
                                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mt-1">
                                    {data.worker?.users?.email && (
                                      <span className="flex items-center gap-1">
                                        <Mail className="h-3.5 w-3.5" />
                                        {data.worker.users.email}
                                      </span>
                                    )}
                                    {data.worker?.users?.phone && (
                                      <span className="flex items-center gap-1">
                                        <Phone className="h-3.5 w-3.5" />
                                        {data.worker.users.phone}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="flex items-center gap-1 justify-end">
                                    <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                                    <span className="font-bold">{data.worker?.rating?.toFixed(1) || '0.0'}</span>
                                  </div>
                                  <p className="text-xs text-muted-foreground">{data.worker?.total_jobs || 0} trabalhos</p>
                                </div>
                              </div>
                            </div>

                            {/* Registros de trabalho */}
                            <div className="p-4 space-y-3">
                              <h5 className="text-sm font-medium text-muted-foreground">Registros de Ponto</h5>
                              {data.records.map((record) => (
                                <div
                                  key={record.id}
                                  className={`p-3 rounded-lg border ${
                                    record.status === 'completed'
                                      ? 'bg-green-50 border-green-200'
                                      : record.status === 'in_progress'
                                      ? 'bg-blue-50 border-blue-200'
                                      : record.status === 'absent'
                                      ? 'bg-red-50 border-red-200'
                                      : 'bg-slate-50 border-slate-200'
                                  }`}
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <Calendar className="h-4 w-4 text-muted-foreground" />
                                      <span className="font-medium">{formatDate(record.work_date)}</span>
                                    </div>
                                    {getRecordStatusBadge(record.status)}
                                  </div>

                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div className="flex items-center gap-2">
                                      <div className={`w-2 h-2 rounded-full ${record.check_in ? 'bg-green-500' : 'bg-slate-300'}`} />
                                      <span className="text-muted-foreground">Entrada:</span>
                                      <span className="font-medium">{formatDateTime(record.check_in)}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <div className={`w-2 h-2 rounded-full ${record.check_out ? 'bg-red-500' : 'bg-slate-300'}`} />
                                      <span className="text-muted-foreground">Saída:</span>
                                      <span className="font-medium">{formatDateTime(record.check_out)}</span>
                                    </div>
                                  </div>

                                  {/* Assinatura */}
                                  {record.signature_data && (
                                    <div className="mt-3 pt-3 border-t">
                                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                                        <FileSignature className="h-4 w-4" />
                                        <span>Assinatura Digital</span>
                                        {record.signed_at && (
                                          <span className="text-xs">
                                            ({new Date(record.signed_at).toLocaleString('pt-BR')})
                                          </span>
                                        )}
                                      </div>
                                      <div className="bg-white border rounded-lg p-2 inline-block">
                                        <img
                                          src={record.signature_data}
                                          alt="Assinatura"
                                          className="h-16 w-auto object-contain"
                                        />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-slate-50 rounded-xl">
                      <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Users className="h-6 w-6 text-slate-400" />
                      </div>
                      <p className="text-muted-foreground">Nenhum trabalhador atribuído ainda.</p>
                      <p className="text-sm text-muted-foreground mt-1">Aguardando trabalhadores pegarem a vaga.</p>
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
