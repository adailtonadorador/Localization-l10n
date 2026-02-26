import { useEffect, useState } from "react";
import { toast } from "sonner";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabaseUntyped } from "@/lib/supabase";
import { BRAZILIAN_STATES } from "@/lib/brazil-locations";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { MapPin, Search, Filter, Eye, Calendar, Clock, Building, Star, UserPlus, AlertTriangle, ShieldAlert, Map } from "lucide-react";
import { LocationMap } from "@/components/ui/map";

interface Job {
  id: string;
  title: string;
  description: string;
  location: string;
  uf: string | null;
  city: string | null;
  date: string;
  dates: string[] | null;
  start_time: string;
  end_time: string;
  daily_rate: number;
  required_workers: number;
  skills_required: string[];
  status: string;
  clients: {
    company_name: string;
  };
}

interface ConflictInfo {
  selectedJob: Job;
  conflictingJob: {
    title: string;
    company_name?: string;
    dates: string[];
    start_time: string;
    end_time: string;
    location?: string;
  };
  conflictDates: string[];
}

export function WorkerJobsPage() {
  const { profile, workerProfile } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [appliedJobIds, setAppliedJobIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterUf, setFilterUf] = useState<string>("");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [conflictInfo, setConflictInfo] = useState<ConflictInfo | null>(null);
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);

  useEffect(() => {
    if (profile?.id) {
      loadJobs();
    }
  }, [profile?.id]);

  async function loadJobs() {
    setLoading(true);
    try {
      // Load all open jobs
      const { data: jobsData } = await supabaseUntyped
        .from('jobs')
        .select(`
          *,
          clients (company_name)
        `)
        .eq('status', 'open')
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: true });

      setJobs(jobsData || []);

      // Load jobs the user has already taken (excluding withdrawn)
      if (profile?.id) {
        const { data: assignmentsData } = await supabaseUntyped
          .from('job_assignments')
          .select('job_id')
          .eq('worker_id', profile.id)
          .in('status', ['pending', 'confirmed']);

        setAppliedJobIds(assignmentsData?.map((a: { job_id: string }) => a.job_id) || []);
      }
    } catch (error) {
      console.error('Error loading jobs:', error);
    } finally {
      setLoading(false);
    }
  }

  function openJobDetails(job: Job) {
    setSelectedJob(job);
    setDetailsOpen(true);
  }

  // Verifica se dois intervalos de tempo se sobrepõem
  function timeRangesOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
    // Converter para minutos desde meia-noite para facilitar comparação
    const toMinutes = (time: string) => {
      const [h, m] = time.split(':').map(Number);
      return h * 60 + m;
    };

    const s1 = toMinutes(start1);
    const e1 = toMinutes(end1);
    const s2 = toMinutes(start2);
    const e2 = toMinutes(end2);

    // Intervalos se sobrepõem se um começa antes do outro terminar
    return s1 < e2 && s2 < e1;
  }

  async function handleAssignToMe() {
    if (!selectedJob || !profile?.id) return;

    // Check if worker is approved
    if (workerProfile?.approval_status !== 'approved') {
      toast.error('Você precisa ser aprovado pelo administrador antes de se candidatar a vagas.');
      return;
    }

    setAssigning(true);
    try {
      // Obter as datas da vaga selecionada
      const selectedJobDates = selectedJob.dates && selectedJob.dates.length > 0
        ? selectedJob.dates
        : [selectedJob.date];

      // Buscar todas as vagas já atribuídas ao trabalhador
      const { data: existingAssignments } = await supabaseUntyped
        .from('job_assignments')
        .select(`
          job_id,
          jobs (
            id,
            date,
            dates,
            start_time,
            end_time,
            title,
            location,
            clients (company_name)
          )
        `)
        .eq('worker_id', profile.id)
        .in('status', ['pending', 'confirmed']);

      // Verificar conflito de datas e horários
      if (existingAssignments && existingAssignments.length > 0) {
        for (const assignment of existingAssignments) {
          const existingJob = assignment.jobs as {
            id: string;
            date: string;
            dates: string[] | null;
            start_time: string;
            end_time: string;
            title: string;
            location?: string;
            clients?: { company_name: string };
          };

          if (!existingJob) continue;

          const existingJobDates = existingJob.dates && existingJob.dates.length > 0
            ? existingJob.dates
            : [existingJob.date];

          // Verificar se há datas em comum
          const commonDates = selectedJobDates.filter(date => existingJobDates.includes(date));

          if (commonDates.length > 0) {
            // Verificar se os horários se sobrepõem
            const hasTimeConflict = timeRangesOverlap(
              selectedJob.start_time,
              selectedJob.end_time,
              existingJob.start_time,
              existingJob.end_time
            );

            if (hasTimeConflict) {
              // Mostrar diálogo de conflito com detalhes
              setConflictInfo({
                selectedJob,
                conflictingJob: {
                  title: existingJob.title,
                  company_name: existingJob.clients?.company_name,
                  dates: existingJobDates,
                  start_time: existingJob.start_time,
                  end_time: existingJob.end_time,
                  location: existingJob.location,
                },
                conflictDates: commonDates,
              });
              setConflictDialogOpen(true);
              setAssigning(false);
              return;
            }
          }
        }
      }

      // Verificar se já existe um assignment (pode estar withdrawn)
      const { data: existingAssignment } = await supabaseUntyped
        .from('job_assignments')
        .select('id, status')
        .eq('job_id', selectedJob.id)
        .eq('worker_id', profile.id)
        .limit(1);

      if (existingAssignment && existingAssignment.length > 0) {
        // Atualizar assignment existente
        const { error: updateError } = await supabaseUntyped
          .from('job_assignments')
          .update({
            status: 'confirmed',
            withdrawal_reason: null,
            withdrawn_at: null
          })
          .eq('id', existingAssignment[0].id);

        if (updateError) {
          console.error('Update assignment error:', updateError);
          toast.error('Erro ao se atribuir à vaga. Tente novamente.');
          return;
        }
      } else {
        // Criar novo assignment
        const { error: assignError } = await supabaseUntyped.from('job_assignments').insert({
          job_id: selectedJob.id,
          worker_id: profile.id,
          status: 'confirmed',
        });

        if (assignError) {
          console.error('Assignment error:', assignError);
          toast.error('Erro ao se atribuir à vaga. Tente novamente.');
          return;
        }
      }

      // Criar work_records para cada dia da vaga
      const dates = selectedJob.dates && selectedJob.dates.length > 0 ? selectedJob.dates : [selectedJob.date];
      const workRecords = dates.map(date => ({
        job_id: selectedJob.id,
        worker_id: profile.id,
        work_date: date,
        status: 'pending',
      }));

      const { error: recordsError } = await supabaseUntyped.from('work_records').insert(workRecords);

      if (recordsError) {
        console.error('Work records error:', recordsError);
      }

      // Verificar se todas as vagas foram preenchidas e atualizar status
      // Conta apenas assignments ativos (pending/confirmed), excluindo withdrawn
      const { count: totalAssigned } = await supabaseUntyped
        .from('job_assignments')
        .select('*', { count: 'exact', head: true })
        .eq('job_id', selectedJob.id)
        .in('status', ['pending', 'confirmed']);

      if ((totalAssigned || 0) >= selectedJob.required_workers) {
        await supabaseUntyped
          .from('jobs')
          .update({ status: 'assigned' })
          .eq('id', selectedJob.id);
      }

      setAppliedJobIds([...appliedJobIds, selectedJob.id]);
      setDetailsOpen(false);
      toast.success('Vaga atribuída com sucesso!', {
        description: 'Acesse "Meus Trabalhos" para ver seus dias de trabalho.',
      });
      loadJobs();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erro ao se atribuir à vaga. Tente novamente.');
    } finally {
      setAssigning(false);
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

  const filteredJobs = jobs.filter(job => {
    // Filtro por UF
    if (filterUf && job.uf !== filterUf) {
      return false;
    }
    // Filtro por texto
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        job.title.toLowerCase().includes(search) ||
        job.location.toLowerCase().includes(search) ||
        job.city?.toLowerCase().includes(search) ||
        job.clients?.company_name?.toLowerCase().includes(search)
      );
    }
    return true;
  });

  // Contar vagas por estado
  const jobsByState = jobs.reduce((acc, job) => {
    if (job.uf) {
      acc[job.uf] = (acc[job.uf] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  // Check worker approval status
  const approvalStatus = workerProfile?.approval_status;
  const isApproved = approvalStatus === 'approved';

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
        <h2 className="text-2xl font-bold mb-2 text-slate-900">Vagas Disponíveis</h2>
        <p className="text-slate-600">Encontre oportunidades de trabalho perto de você</p>
      </div>

      {/* Approval Status Alert */}
      {!isApproved && (
        <Alert className={`mb-6 ${approvalStatus === 'rejected' ? 'border-red-300 bg-red-50' : 'border-blue-300 bg-blue-50'}`}>
          <ShieldAlert className={`h-5 w-5 ${approvalStatus === 'rejected' ? 'text-red-600' : 'text-blue-600'}`} />
          <AlertTitle className={approvalStatus === 'rejected' ? 'text-red-800' : 'text-blue-800'}>
            {approvalStatus === 'pending' && 'Conta em Análise'}
            {approvalStatus === 'rejected' && 'Conta Rejeitada'}
          </AlertTitle>
          <AlertDescription className={approvalStatus === 'rejected' ? 'text-red-700' : 'text-blue-700'}>
            {approvalStatus === 'pending' && (
              <>
                Sua conta está sendo analisada pelo administrador. Você poderá acessar e se candidatar às vagas assim que sua conta for aprovada.
                <br />
                <span className="text-sm font-medium mt-2 block">Aguarde o contato da equipe.</span>
              </>
            )}
            {approvalStatus === 'rejected' && (
              <>
                Sua conta foi rejeitada.
                {workerProfile?.rejected_reason && (
                  <>
                    <br />
                    <span className="font-semibold">Motivo:</span> {workerProfile.rejected_reason}
                  </>
                )}
                <br />
                <span className="text-sm font-medium mt-2 block">Entre em contato com o suporte para mais informações.</span>
              </>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Hide job listings if not approved */}
      {!isApproved ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldAlert className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">Acesso Restrito</h3>
            <p className="text-muted-foreground">
              {approvalStatus === 'pending'
                ? 'Aguarde a aprovação da sua conta para acessar as vagas.'
                : 'Sua conta foi rejeitada. Entre em contato com o suporte.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Original content - only show if approved */}

      {/* Filtros */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por título, empresa ou cidade..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="w-full sm:w-64">
          <Select value={filterUf} onValueChange={setFilterUf}>
            <SelectTrigger className="bg-white">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Filtrar por estado" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos os estados</SelectItem>
              {BRAZILIAN_STATES.filter(state => jobsByState[state.uf]).map((state) => (
                <SelectItem key={state.uf} value={state.uf}>
                  {state.name} ({jobsByState[state.uf] || 0})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Indicador de filtro ativo */}
      {filterUf && (
        <div className="mb-4 flex items-center gap-2">
          <Badge variant="secondary" className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {BRAZILIAN_STATES.find(s => s.uf === filterUf)?.name}
            <button
              onClick={() => setFilterUf("")}
              className="ml-1 hover:text-destructive"
            >
              ×
            </button>
          </Badge>
          <span className="text-sm text-muted-foreground">
            {filteredJobs.length} vaga(s) encontrada(s)
          </span>
        </div>
      )}

      {filteredJobs.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredJobs.map((job) => {
            const hasApplied = appliedJobIds.includes(job.id);
            return (
              <Card key={job.id} className="overflow-hidden border-0 shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50/50 border-b">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg text-slate-900">{job.title}</CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-1">
                        <Building className="h-3.5 w-3.5" />
                        {job.clients?.company_name}
                      </CardDescription>
                    </div>
                    <Badge className="whitespace-nowrap flex-shrink-0 bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm">{job.required_workers} vaga(s)</Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Calendar className="h-4 w-4 text-blue-600" />
                      <span className="font-medium">{formatJobDates(job.dates, job.date)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <Clock className="h-4 w-4 text-cyan-600" />
                      <span>{formatTime(job.start_time)} - {formatTime(job.end_time)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <MapPin className="h-4 w-4 text-purple-600" />
                      <span className="truncate">{job.location}</span>
                    </div>
                    {job.description && (
                      <p className="text-slate-500 mt-2 line-clamp-2">{job.description}</p>
                    )}
                    {job.skills_required?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {job.skills_required.map((skill, index) => (
                          <Badge key={index} variant="outline" className="text-xs bg-blue-50 border-blue-200 text-blue-700">{skill}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <span className="text-lg font-bold text-blue-700">R$ {job.daily_rate}/dia</span>
                    <div className="flex items-center gap-2">
                      {hasApplied && (
                        <Badge className="bg-gradient-to-r from-green-500 to-green-600 text-white">Confirmado</Badge>
                      )}
                      <Button size="sm" onClick={() => openJobDetails(job)} className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-sm">
                        <Eye className="h-4 w-4 mr-1" />
                        Ver Detalhes
                      </Button>
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
              {searchTerm ? 'Nenhuma vaga encontrada para sua busca.' : 'Nenhuma vaga disponível no momento.'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Job Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-0">
          {selectedJob && (
            <>
              {/* Header */}
              <div className="p-6 bg-gradient-to-r from-blue-500 to-blue-700 text-white">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold mb-1">{selectedJob.title}</h2>
                    <p className="text-white/80 text-sm flex items-center gap-1">
                      <Building className="h-3.5 w-3.5" />
                      {selectedJob.clients?.company_name}
                    </p>
                  </div>
                  <Badge className="bg-white/20 text-white border-white/30">
                    {selectedJob.required_workers} vaga(s)
                  </Badge>
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
                      <MapPin className="h-3 w-3" />
                      Local
                    </div>
                    <p className="font-semibold text-sm truncate">{selectedJob.city || selectedJob.location}</p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-white/70 text-xs mb-1">
                      <Star className="h-3 w-3" />
                      Valor
                    </div>
                    <p className="font-semibold text-sm">R$ {selectedJob.daily_rate}/dia</p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Location with Map */}
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-2 flex items-center gap-2">
                    <Map className="h-4 w-4" />
                    Localização
                  </h3>
                  <p className="text-sm bg-slate-50 p-3 rounded-lg mb-3">{selectedJob.location}</p>
                  <LocationMap
                    address={selectedJob.location}
                    title={selectedJob.title}
                    showUserLocation={true}
                    height="250px"
                  />
                </div>

                {/* Description */}
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

                {/* All dates */}
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-2 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Datas de Trabalho
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {(selectedJob.dates && selectedJob.dates.length > 0 ? selectedJob.dates : [selectedJob.date]).map((date, index) => (
                      <Badge key={index} variant="outline" className="bg-blue-50 border-blue-200 text-blue-700">
                        {formatDate(date)}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Action button */}
                {appliedJobIds.includes(selectedJob.id) ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm text-green-700 font-medium">
                      Você já está confirmado para esta vaga! Acesse "Meus Trabalhos" para ver seus dias de trabalho.
                    </p>
                  </div>
                ) : (
                  <div className="pt-4 border-t">
                    <Button
                      className="w-full gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                      onClick={handleAssignToMe}
                      disabled={assigning}
                    >
                      <UserPlus className="h-4 w-4" />
                      {assigning ? 'Aceitando...' : 'Aceitar a Diária'}
                    </Button>
                    <p className="text-xs text-muted-foreground text-center mt-2">
                      Ao aceitar, você confirma presença nos dias agendados.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Conflict Dialog */}
      <Dialog open={conflictDialogOpen} onOpenChange={setConflictDialogOpen}>
        <DialogContent className="max-w-lg">
          {conflictInfo && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-start gap-4">
                <div className="p-3 bg-red-100 rounded-full">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Conflito de Horário</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Você já tem um trabalho atribuído que conflita com esta vaga.
                  </p>
                </div>
              </div>

              {/* Conflict dates */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm font-medium text-red-800 mb-2">Datas em conflito:</p>
                <div className="flex flex-wrap gap-2">
                  {conflictInfo.conflictDates.map((date, i) => (
                    <Badge key={i} variant="outline" className="bg-red-100 border-red-300 text-red-700">
                      {new Date(date + 'T00:00:00').toLocaleDateString('pt-BR', {
                        weekday: 'short',
                        day: '2-digit',
                        month: 'short'
                      })}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Jobs comparison */}
              <div className="grid gap-4">
                {/* Conflicting job (existing) */}
                <div className="border border-red-200 rounded-lg p-4 bg-red-50/50">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="destructive" className="text-xs">Trabalho Atribuído</Badge>
                  </div>
                  <h3 className="font-semibold text-slate-900">{conflictInfo.conflictingJob.title}</h3>
                  {conflictInfo.conflictingJob.company_name && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <Building className="h-3.5 w-3.5" />
                      {conflictInfo.conflictingJob.company_name}
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-red-500" />
                      <span className="font-medium">
                        {conflictInfo.conflictingJob.start_time.slice(0, 5)} - {conflictInfo.conflictingJob.end_time.slice(0, 5)}
                      </span>
                    </div>
                    {conflictInfo.conflictingJob.location && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span className="truncate">{conflictInfo.conflictingJob.location}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Selected job (new) */}
                <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="secondary" className="text-xs">Vaga Selecionada</Badge>
                  </div>
                  <h3 className="font-semibold text-slate-900">{conflictInfo.selectedJob.title}</h3>
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                    <Building className="h-3.5 w-3.5" />
                    {conflictInfo.selectedJob.clients?.company_name}
                  </p>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-slate-500" />
                      <span className="font-medium">
                        {conflictInfo.selectedJob.start_time.slice(0, 5)} - {conflictInfo.selectedJob.end_time.slice(0, 5)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span className="truncate">{conflictInfo.selectedJob.location}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action */}
              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setConflictDialogOpen(false)}>
                  Entendi
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
        </>
      )}
    </DashboardLayout>
  );
}
