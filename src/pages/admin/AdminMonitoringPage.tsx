import { useEffect, useState } from "react";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { supabaseUntyped } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Search, Users, Clock, CheckCircle, AlertCircle, Calendar, Eye, Mail, Phone, Star, FileSignature, MapPin, Building } from "lucide-react";
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

interface JobWithRecords {
  id: string;
  title: string;
  location: string;
  date: string;
  dates: string[] | null;
  start_time: string;
  end_time: string;
  status: string;
  clients: {
    company_name: string;
  };
  work_records: WorkRecord[];
}

export function AdminMonitoringPage() {
  const [jobs, setJobs] = useState<JobWithRecords[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDate, setFilterDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedJob, setSelectedJob] = useState<JobWithRecords | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    loadJobs();
  }, [filterDate]);

  async function loadJobs() {
    setLoading(true);
    try {
      const { data } = await supabaseUntyped
        .from('jobs')
        .select(`
          *,
          clients (company_name),
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
        .or(`date.eq.${filterDate},dates.cs.{${filterDate}}`)
        .order('date', { ascending: true });

      setJobs(data || []);
    } catch (error) {
      console.error('Error loading jobs:', error);
    } finally {
      setLoading(false);
    }
  }

  function formatTime(timeStr: string | null) {
    if (!timeStr) return '-';
    return new Date(timeStr).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function formatScheduleTime(timeStr: string) {
    return timeStr.slice(0, 5);
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

  function getJobStats(job: JobWithRecords) {
    const todayRecords = job.work_records.filter(r => r.work_date === filterDate);
    const total = todayRecords.length;
    const checkedIn = todayRecords.filter(r => r.check_in).length;
    const completed = todayRecords.filter(r => r.status === 'completed').length;
    const absent = todayRecords.filter(r => r.status === 'absent').length;

    return { total, checkedIn, completed, absent };
  }

  const filteredJobs = jobs.filter(job => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      job.title.toLowerCase().includes(search) ||
      job.location.toLowerCase().includes(search) ||
      job.clients?.company_name?.toLowerCase().includes(search)
    );
  });

  function openDetails(job: JobWithRecords) {
    setSelectedJob(job);
    setDetailsOpen(true);
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
        <h2 className="text-2xl font-bold mb-2">Monitoramento de Trabalhos</h2>
        <p className="text-muted-foreground">Acompanhe em tempo real o status dos trabalhos</p>
      </div>

      {/* Filtros */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por vaga, empresa ou local..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="w-full sm:w-48">
          <Input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
          />
        </div>
      </div>

      {/* Resumo do dia */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{filteredJobs.length}</p>
                <p className="text-sm text-muted-foreground">Vagas no dia</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">
                  {filteredJobs.reduce((acc, job) => acc + getJobStats(job).checkedIn, 0)}
                </p>
                <p className="text-sm text-muted-foreground">Trabalhando</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">
                  {filteredJobs.reduce((acc, job) => acc + getJobStats(job).completed, 0)}
                </p>
                <p className="text-sm text-muted-foreground">Concluídos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-2xl font-bold">
                  {filteredJobs.reduce((acc, job) => acc + getJobStats(job).absent, 0)}
                </p>
                <p className="text-sm text-muted-foreground">Faltas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de vagas */}
      {filteredJobs.length > 0 ? (
        <div className="grid gap-4">
          {filteredJobs.map((job) => {
            const stats = getJobStats(job);
            const isAssigned = job.status === 'assigned';
            return (
              <Card key={job.id} className={`transition-all ${
                isAssigned
                  ? 'border-2 border-purple-300 bg-gradient-to-r from-purple-50 to-white'
                  : ''
              }`}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">{job.title}</CardTitle>
                        {isAssigned && (
                          <Badge className="bg-purple-500 text-white">Atribuída</Badge>
                        )}
                      </div>
                      <CardDescription>{job.clients?.company_name} - {job.location}</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => openDetails(job)}>
                      <Eye className="h-4 w-4 mr-2" />
                      Detalhes
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {formatScheduleTime(job.start_time)} - {formatScheduleTime(job.end_time)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{stats.total} trabalhadores</span>
                    </div>
                    <div className="flex items-center gap-2 ml-auto">
                      <Badge variant="outline" className="bg-blue-50">
                        {stats.checkedIn} trabalhando
                      </Badge>
                      <Badge variant="outline" className="bg-green-50">
                        {stats.completed} concluídos
                      </Badge>
                      {stats.absent > 0 && (
                        <Badge variant="outline" className="bg-red-50">
                          {stats.absent} faltas
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Nenhuma vaga encontrada para esta data.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Dialog de detalhes */}
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
                    <div className="flex items-center gap-3 text-white/80 text-sm">
                      <span className="flex items-center gap-1">
                        <Building className="h-3.5 w-3.5" />
                        {selectedJob.clients?.company_name}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {selectedJob.location}
                      </span>
                    </div>
                  </div>
                  {selectedJob.status === 'assigned' && (
                    <Badge className="bg-white/20 text-white border-white/30">Atribuída</Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                  <div className="bg-white/10 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-white/70 text-xs mb-1">
                      <Calendar className="h-3 w-3" />
                      Data
                    </div>
                    <p className="font-semibold text-sm">{new Date(filterDate + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-white/70 text-xs mb-1">
                      <Clock className="h-3 w-3" />
                      Horário
                    </div>
                    <p className="font-semibold text-sm">{formatScheduleTime(selectedJob.start_time)} - {formatScheduleTime(selectedJob.end_time)}</p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-white/70 text-xs mb-1">
                      <Users className="h-3 w-3" />
                      Trabalhadores
                    </div>
                    <p className="font-semibold text-sm">{getJobStats(selectedJob).total} no dia</p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-white/70 text-xs mb-1">
                      <CheckCircle className="h-3 w-3" />
                      Concluídos
                    </div>
                    <p className="font-semibold text-sm">{getJobStats(selectedJob).completed}</p>
                  </div>
                </div>
              </div>

              {/* Conteúdo */}
              <div className="p-6">
                <h3 className="font-semibold text-sm text-muted-foreground mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Registros de Trabalho - {new Date(filterDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                </h3>

                {(() => {
                  const todayRecords = selectedJob.work_records.filter(r => r.work_date === filterDate);

                  if (todayRecords.length === 0) {
                    return (
                      <div className="text-center py-8 bg-slate-50 rounded-xl">
                        <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-3">
                          <Users className="h-6 w-6 text-slate-400" />
                        </div>
                        <p className="text-muted-foreground">Nenhum trabalhador registrado para esta data.</p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-4">
                      {todayRecords.map((record) => (
                        <div key={record.id} className="border rounded-xl overflow-hidden">
                          {/* Info do trabalhador */}
                          <div className={`p-4 ${
                            record.status === 'completed'
                              ? 'bg-gradient-to-r from-green-50 to-green-100'
                              : record.status === 'in_progress'
                              ? 'bg-gradient-to-r from-blue-50 to-blue-100'
                              : record.status === 'absent'
                              ? 'bg-gradient-to-r from-red-50 to-red-100'
                              : 'bg-gradient-to-r from-slate-50 to-slate-100'
                          }`}>
                            <div className="flex items-center gap-4">
                              <Avatar className="h-12 w-12 ring-2 ring-white shadow-lg">
                                <AvatarFallback className={`text-white text-lg font-bold ${
                                  record.status === 'completed' ? 'bg-green-500' :
                                  record.status === 'in_progress' ? 'bg-blue-500' :
                                  record.status === 'absent' ? 'bg-red-500' : 'bg-purple-500'
                                }`}>
                                  {record.workers?.users?.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '??'}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <h4 className="font-bold">{record.workers?.users?.name || 'N/A'}</h4>
                                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mt-1">
                                  {record.workers?.users?.email && (
                                    <span className="flex items-center gap-1">
                                      <Mail className="h-3.5 w-3.5" />
                                      {record.workers.users.email}
                                    </span>
                                  )}
                                  {record.workers?.users?.phone && (
                                    <span className="flex items-center gap-1">
                                      <Phone className="h-3.5 w-3.5" />
                                      {record.workers.users.phone}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="text-right flex flex-col items-end gap-2">
                                {getRecordStatusBadge(record.status)}
                                <div className="flex items-center gap-1">
                                  <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                                  <span className="font-bold text-sm">{record.workers?.rating?.toFixed(1) || '0.0'}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Registros de ponto e assinatura */}
                          <div className="p-4 space-y-3">
                            <div className="grid grid-cols-2 gap-4">
                              <div className={`p-3 rounded-lg border ${
                                record.check_in ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'
                              }`}>
                                <div className="flex items-center gap-2 mb-1">
                                  <div className={`w-2 h-2 rounded-full ${record.check_in ? 'bg-green-500' : 'bg-slate-300'}`} />
                                  <span className="text-sm font-medium">Entrada</span>
                                </div>
                                <p className="text-lg font-bold">{formatTime(record.check_in)}</p>
                              </div>
                              <div className={`p-3 rounded-lg border ${
                                record.check_out ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'
                              }`}>
                                <div className="flex items-center gap-2 mb-1">
                                  <div className={`w-2 h-2 rounded-full ${record.check_out ? 'bg-red-500' : 'bg-slate-300'}`} />
                                  <span className="text-sm font-medium">Saída</span>
                                </div>
                                <p className="text-lg font-bold">{formatTime(record.check_out)}</p>
                              </div>
                            </div>

                            {/* Assinatura */}
                            {record.signature_data && (
                              <div className="pt-3 border-t">
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
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
