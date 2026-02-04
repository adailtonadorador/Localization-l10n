import { useEffect, useState } from "react";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabaseUntyped } from "@/lib/supabase";
import { BRAZILIAN_STATES } from "@/lib/brazil-locations";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { MapPin, Search, Filter, Eye, Calendar, Clock, Building, Star, UserPlus } from "lucide-react";

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

export function WorkerJobsPage() {
  const { profile } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [appliedJobIds, setAppliedJobIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterUf, setFilterUf] = useState<string>("");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [assigning, setAssigning] = useState(false);

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

      // Load jobs the user has already taken
      if (profile?.id) {
        const { data: assignmentsData } = await supabaseUntyped
          .from('job_assignments')
          .select('job_id')
          .eq('worker_id', profile.id);

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

  async function handleAssignToMe() {
    if (!selectedJob || !profile?.id) return;

    setAssigning(true);
    try {
      // Criar assignment
      const { error: assignError } = await supabaseUntyped.from('job_assignments').insert({
        job_id: selectedJob.id,
        worker_id: profile.id,
        status: 'confirmed',
      });

      if (assignError) {
        console.error('Assignment error:', assignError);
        alert('Erro ao se atribuir à vaga. Tente novamente.');
        return;
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
      const { count: totalAssigned } = await supabaseUntyped
        .from('job_assignments')
        .select('*', { count: 'exact', head: true })
        .eq('job_id', selectedJob.id);

      if ((totalAssigned || 0) >= selectedJob.required_workers) {
        await supabaseUntyped
          .from('jobs')
          .update({ status: 'assigned' })
          .eq('id', selectedJob.id);
      }

      setAppliedJobIds([...appliedJobIds, selectedJob.id]);
      setDetailsOpen(false);
      alert('Vaga atribuída com sucesso! Acesse "Meus Trabalhos" para ver seus dias de trabalho.');
      loadJobs();
    } catch (error) {
      console.error('Error:', error);
      alert('Erro ao se atribuir à vaga. Tente novamente.');
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
        <h2 className="text-2xl font-bold mb-2">Vagas Disponíveis</h2>
        <p className="text-muted-foreground">Encontre oportunidades de trabalho perto de você</p>
      </div>

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
              <Card key={job.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{job.title}</CardTitle>
                      <CardDescription>{job.clients?.company_name}</CardDescription>
                    </div>
                    <Badge variant="secondary">{job.required_workers} vaga(s)</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>{formatJobDates(job.dates, job.date)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{formatTime(job.start_time)} - {formatTime(job.end_time)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span>{job.location}</span>
                    </div>
                    {job.description && (
                      <p className="text-muted-foreground mt-2 line-clamp-2">{job.description}</p>
                    )}
                    {job.skills_required?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {job.skills_required.map((skill, index) => (
                          <Badge key={index} variant="outline" className="text-xs">{skill}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <span className="text-lg font-bold">R$ {job.daily_rate}/dia</span>
                    <div className="flex items-center gap-2">
                      {hasApplied && (
                        <Badge variant="secondary">Confirmado</Badge>
                      )}
                      <Button variant="outline" size="sm" onClick={() => openJobDetails(job)}>
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
              <div className="p-6 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
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
                {/* Location */}
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-2 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Localização
                  </h3>
                  <p className="text-sm bg-slate-50 p-3 rounded-lg">{selectedJob.location}</p>
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
                      <Badge key={index} variant="outline" className="bg-emerald-50 border-emerald-200 text-emerald-700">
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
                      className="w-full gap-2 bg-emerald-500 hover:bg-emerald-600"
                      onClick={handleAssignToMe}
                      disabled={assigning}
                    >
                      <UserPlus className="h-4 w-4" />
                      {assigning ? 'Atribuindo...' : 'Atribuir para Mim'}
                    </Button>
                    <p className="text-xs text-muted-foreground text-center mt-2">
                      Ao se atribuir, você confirma presença nos dias agendados.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
