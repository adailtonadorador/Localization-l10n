import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { supabaseUntyped } from "@/lib/supabase";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Building2,
  MapPin,
  Clock,
  DollarSign,
  Users,
  Calendar,
  ChevronLeft,
  ChevronRight,
  X,
  Plus,
  Briefcase,
  CheckCircle2,
  Mail,
  Phone,
  FileText,
  Eye,
  Star
} from "lucide-react";

const AVAILABLE_SKILLS = [
  'Limpeza', 'Carga e Descarga', 'Atendimento ao Cliente', 'Vendas',
  'Recepção', 'Estoque', 'Cozinha', 'Garçom', 'Segurança',
  'Motorista', 'Entrega', 'Montagem', 'Eventos', 'Promoção',
];

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

interface Client {
  id: string;
  cnpj: string;
  company_name: string;
  fantasia: string | null;
  address: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  cep: string | null;
  created_at: string;
  users: {
    name: string;
    email: string;
    phone: string;
  };
}

interface JobAssignment {
  id: string;
  worker_id: string;
  workers: {
    id: string;
    rating: number;
    users: {
      name: string;
      email: string;
      phone: string | null;
      avatar_url: string | null;
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
  daily_rate: number;
  required_workers: number;
  skills_required: string[];
  status: string;
  created_at: string;
  job_assignments: JobAssignment[];
}

export function AdminClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [client, setClient] = useState<Client | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("jobs");

  // Job form state
  const [showJobForm, setShowJobForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [addressComplement, setAddressComplement] = useState("");
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [dailyRate, setDailyRate] = useState("");
  const [requiredWorkers, setRequiredWorkers] = useState("1");
  const [skills, setSkills] = useState<string[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  // Job details modal
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    if (id) {
      loadClientData();
    }
  }, [id]);

  async function loadClientData() {
    setLoading(true);
    try {
      // Load client
      const { data: clientData } = await supabaseUntyped
        .from('clients')
        .select(`
          *,
          users (name, email, phone)
        `)
        .eq('id', id)
        .single();

      setClient(clientData);

      // Load jobs with worker info
      const { data: jobsData } = await supabaseUntyped
        .from('jobs')
        .select(`
          *,
          job_assignments (
            id,
            worker_id,
            workers (
              id,
              rating,
              users (name, email, phone, avatar_url)
            )
          )
        `)
        .eq('client_id', id)
        .order('created_at', { ascending: false });

      setJobs(jobsData || []);
    } catch (error) {
      console.error('Error loading client data:', error);
    } finally {
      setLoading(false);
    }
  }

  function formatCnpj(cnpj: string) {
    if (!cnpj) return '';
    return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short'
    });
  }

  function formatJobDates(dates: string[] | null, date: string) {
    const allDates = dates && dates.length > 0 ? dates : [date];
    if (allDates.length === 1) return formatDate(allDates[0]);
    if (allDates.length === 2) return `${formatDate(allDates[0])} e ${formatDate(allDates[1])}`;
    return `${formatDate(allDates[0])} +${allDates.length - 1} dias`;
  }

  function formatTime(timeStr: string) {
    return timeStr?.slice(0, 5) || '';
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
        return <Badge className="bg-slate-500">Concluída</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelada</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  }

  function getClientAddress() {
    if (!client) return 'Endereço não cadastrado';
    if (client.address) return client.address;
    if (client.logradouro) {
      let addr = `${client.logradouro}, ${client.numero || 'S/N'}`;
      if (client.complemento) addr += ` - ${client.complemento}`;
      if (client.bairro) addr += `, ${client.bairro}`;
      if (client.cidade) addr += `, ${client.cidade}`;
      if (client.uf) addr += ` - ${client.uf}`;
      return addr;
    }
    return 'Endereço não cadastrado';
  }

  // Calendar functions
  function getDaysInMonth(month: number, year: number) {
    return new Date(year, month + 1, 0).getDate();
  }

  function getFirstDayOfMonth(month: number, year: number) {
    return new Date(year, month, 1).getDay();
  }

  function formatDateKey(day: number, month: number, year: number) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  function isDateSelectable(day: number, month: number, year: number) {
    const date = new Date(year, month, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date >= today;
  }

  function toggleDate(day: number, month: number, year: number) {
    if (!isDateSelectable(day, month, year)) return;
    const dateKey = formatDateKey(day, month, year);
    if (selectedDates.includes(dateKey)) {
      setSelectedDates(selectedDates.filter(d => d !== dateKey));
    } else {
      setSelectedDates([...selectedDates, dateKey].sort());
    }
  }

  function formatDisplayDate(dateKey: string) {
    const [year, month, day] = dateKey.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('pt-BR', {
      day: '2-digit', month: 'short', weekday: 'short'
    });
  }

  function prevMonth() {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  }

  function nextMonth() {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  }

  function renderCalendar() {
    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
    const days = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-9" />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = formatDateKey(day, currentMonth, currentYear);
      const isSelected = selectedDates.includes(dateKey);
      const isSelectable = isDateSelectable(day, currentMonth, currentYear);

      days.push(
        <button
          key={day}
          type="button"
          onClick={() => toggleDate(day, currentMonth, currentYear)}
          disabled={!isSelectable}
          className={`
            h-9 w-9 rounded-full text-sm font-medium transition-all
            ${isSelected
              ? 'bg-primary text-primary-foreground shadow-md'
              : isSelectable
                ? 'hover:bg-slate-100 text-slate-700'
                : 'text-slate-300 cursor-not-allowed'
            }
          `}
        >
          {day}
        </button>
      );
    }
    return days;
  }

  function toggleSkill(skill: string) {
    if (skills.includes(skill)) {
      setSkills(skills.filter(s => s !== skill));
    } else {
      setSkills([...skills, skill]);
    }
  }

  function calculateHours(start: string, end: string): number {
    if (!start || !end) return 0;
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    return Math.max(0, (endMinutes - startMinutes) / 60);
  }

  function resetForm() {
    setTitle("");
    setDescription("");
    setAddressComplement("");
    setSelectedDates([]);
    setStartTime("");
    setEndTime("");
    setDailyRate("");
    setRequiredWorkers("1");
    setSkills([]);
    setFormError(null);
  }

  async function handleCreateJob(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!title.trim()) {
      setFormError("Título é obrigatório");
      return;
    }
    if (!client?.address && !client?.logradouro) {
      setFormError("A empresa não possui endereço cadastrado");
      return;
    }
    if (selectedDates.length === 0) {
      setFormError("Selecione pelo menos uma data");
      return;
    }
    if (!startTime || !endTime) {
      setFormError("Horário de início e fim são obrigatórios");
      return;
    }
    if (!dailyRate || parseFloat(dailyRate) <= 0) {
      setFormError("Valor por dia deve ser maior que zero");
      return;
    }

    setFormLoading(true);

    let fullLocation = getClientAddress();
    if (addressComplement.trim()) {
      fullLocation = `${addressComplement.trim()} - ${fullLocation}`;
    }

    try {
      const { error: insertError } = await supabaseUntyped.from('jobs').insert({
        client_id: id,
        title: title.trim(),
        description: description.trim() || null,
        location: fullLocation,
        uf: client?.uf || null,
        city: client?.cidade || null,
        date: selectedDates[0],
        dates: selectedDates,
        start_time: startTime,
        end_time: endTime,
        daily_rate: parseFloat(dailyRate),
        required_workers: parseInt(requiredWorkers) || 1,
        skills_required: skills,
        status: 'open',
      });

      if (insertError) {
        setFormError("Erro ao criar vaga. Tente novamente.");
        setFormLoading(false);
        return;
      }

      resetForm();
      setShowJobForm(false);
      loadClientData();
      alert("Vaga criada com sucesso!");
    } catch {
      setFormError("Erro ao criar vaga. Tente novamente.");
    } finally {
      setFormLoading(false);
    }
  }

  // Stats
  const jobStats = {
    total: jobs.length,
    open: jobs.filter(j => j.status === 'open').length,
    inProgress: jobs.filter(j => j.status === 'in_progress' || j.status === 'assigned').length,
    completed: jobs.filter(j => j.status === 'completed').length,
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
            <p className="text-sm text-muted-foreground">Carregando...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!client) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h2 className="text-xl font-bold text-slate-900 mb-2">Cliente não encontrado</h2>
          <Link to="/admin/clients">
            <Button>Voltar para Clientes</Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <Link to="/admin/clients">
          <Button variant="ghost" size="icon" className="mt-1">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">{client.company_name}</h2>
              {client.fantasia && client.fantasia !== client.company_name && (
                <p className="text-sm text-muted-foreground">{client.fantasia}</p>
              )}
            </div>
          </div>
        </div>
        <Button onClick={() => setShowJobForm(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Vaga
        </Button>
      </div>

      {/* Client Info Card */}
      <Card className="border-0 shadow-sm mb-6">
        <CardContent className="pt-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <p className="text-xs text-muted-foreground mb-1">CNPJ</p>
              <p className="font-medium">{formatCnpj(client.cnpj)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <Mail className="h-3 w-3" /> Contato
              </p>
              <p className="font-medium">{client.users?.name}</p>
              <p className="text-sm text-muted-foreground">{client.users?.email}</p>
            </div>
            {client.users?.phone && (
              <div>
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <Phone className="h-3 w-3" /> Telefone
                </p>
                <p className="font-medium">{client.users.phone}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <MapPin className="h-3 w-3" /> Endereço
              </p>
              <p className="font-medium text-sm">{getClientAddress()}</p>
              {client.cep && <p className="text-xs text-muted-foreground">CEP: {client.cep}</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4 mb-6">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-slate-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 font-medium">Total de Vagas</p>
                <p className="text-3xl font-bold">{jobStats.total}</p>
              </div>
              <div className="p-3 bg-slate-100 rounded-xl">
                <Briefcase className="h-6 w-6 text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-emerald-600 font-medium">Abertas</p>
                <p className="text-3xl font-bold">{jobStats.open}</p>
              </div>
              <div className="p-3 bg-emerald-100 rounded-xl">
                <Clock className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Em Andamento</p>
                <p className="text-3xl font-bold">{jobStats.inProgress}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">Concluídas</p>
                <p className="text-3xl font-bold">{jobStats.completed}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-xl">
                <CheckCircle2 className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Card className="border-0 shadow-sm">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <CardHeader className="pb-0">
            <TabsList className="h-11 p-1 bg-slate-100">
              <TabsTrigger
                value="jobs"
                className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm px-4"
              >
                <Briefcase className="h-4 w-4" />
                Vagas ({jobs.length})
              </TabsTrigger>
              <TabsTrigger
                value="info"
                className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm px-4"
              >
                <FileText className="h-4 w-4" />
                Informações
              </TabsTrigger>
            </TabsList>
          </CardHeader>

          <CardContent className="pt-6">
            <TabsContent value="jobs" className="mt-0">
              {jobs.length > 0 ? (
                <div className="space-y-4">
                  {jobs.map((job) => (
                    <div
                      key={job.id}
                      className={`p-4 rounded-xl transition-all ${
                        job.status === 'assigned'
                          ? 'bg-purple-50 border-2 border-purple-200'
                          : job.status === 'in_progress'
                          ? 'bg-blue-50 border-2 border-blue-200'
                          : 'bg-slate-50 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-slate-900 truncate">{job.title}</h4>
                            {getStatusBadge(job.status)}
                          </div>
                          <div className="flex items-center gap-3 text-sm text-slate-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              {formatJobDates(job.dates, job.date)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {formatTime(job.start_time)} - {formatTime(job.end_time)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right text-sm">
                            <p className="font-bold text-lg text-emerald-600">R$ {job.daily_rate}/dia</p>
                            <p className="text-muted-foreground">
                              {job.job_assignments?.length || 0}/{job.required_workers} trabalhador(es)
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1"
                            onClick={() => {
                              setSelectedJob(job);
                              setDetailsOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                            Ver
                          </Button>
                        </div>
                      </div>

                      {/* Workers assigned */}
                      {job.job_assignments && job.job_assignments.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-200">
                          <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            Trabalhadores atribuídos:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {job.job_assignments.map((assignment) => (
                              <div
                                key={assignment.id}
                                className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border"
                              >
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={assignment.workers?.users?.avatar_url || ''} />
                                  <AvatarFallback className="bg-purple-500 text-white text-xs">
                                    {assignment.workers?.users?.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '??'}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <p className="font-medium text-sm truncate">
                                    {assignment.workers?.users?.name || 'N/A'}
                                  </p>
                                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                                    {assignment.workers?.rating?.toFixed(1) || '0.0'}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Briefcase className="h-8 w-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-900 mb-1">Nenhuma vaga cadastrada</h3>
                  <p className="text-muted-foreground mb-4">
                    Crie a primeira vaga para esta empresa.
                  </p>
                  <Button onClick={() => setShowJobForm(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Criar Vaga
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="info" className="mt-0">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-slate-900">Dados da Empresa</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Razão Social</p>
                      <p className="font-medium">{client.company_name}</p>
                    </div>
                    {client.fantasia && (
                      <div>
                        <p className="text-xs text-muted-foreground">Nome Fantasia</p>
                        <p className="font-medium">{client.fantasia}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-muted-foreground">CNPJ</p>
                      <p className="font-medium">{formatCnpj(client.cnpj)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Data de Cadastro</p>
                      <p className="font-medium">
                        {new Date(client.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-slate-900">Endereço Completo</h3>
                  <div className="space-y-3">
                    {client.logradouro && (
                      <div>
                        <p className="text-xs text-muted-foreground">Logradouro</p>
                        <p className="font-medium">{client.logradouro}, {client.numero || 'S/N'}</p>
                      </div>
                    )}
                    {client.complemento && (
                      <div>
                        <p className="text-xs text-muted-foreground">Complemento</p>
                        <p className="font-medium">{client.complemento}</p>
                      </div>
                    )}
                    {client.bairro && (
                      <div>
                        <p className="text-xs text-muted-foreground">Bairro</p>
                        <p className="font-medium">{client.bairro}</p>
                      </div>
                    )}
                    {client.cidade && (
                      <div>
                        <p className="text-xs text-muted-foreground">Cidade/UF</p>
                        <p className="font-medium">{client.cidade} - {client.uf}</p>
                      </div>
                    )}
                    {client.cep && (
                      <div>
                        <p className="text-xs text-muted-foreground">CEP</p>
                        <p className="font-medium">{client.cep}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>

      {/* Job Form Modal */}
      <Dialog open={showJobForm} onOpenChange={setShowJobForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Nova Vaga para {client.company_name}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateJob} className="p-6 pt-4">
            {formError && (
              <div className="mb-4 p-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
                {formError}
              </div>
            )}

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Left Column */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Título da Vaga *</Label>
                  <Input
                    id="title"
                    placeholder="Ex: Auxiliar de Carga e Descarga"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    disabled={formLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    placeholder="Descreva as atividades e requisitos..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={formLoading}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    Local de Trabalho
                  </Label>
                  <div className="p-3 bg-slate-50 rounded-lg border text-sm">
                    <p className="font-medium">{getClientAddress()}</p>
                  </div>
                  <Input
                    placeholder="Complemento adicional (opcional)"
                    value={addressComplement}
                    onChange={(e) => setAddressComplement(e.target.value)}
                    disabled={formLoading}
                  />
                </div>

                {/* Calendar */}
                <div className="space-y-2">
                  <Label>Datas de Trabalho *</Label>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-3">
                      <button type="button" onClick={prevMonth} className="p-1 hover:bg-white rounded">
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <span className="font-medium text-sm">{MONTHS[currentMonth]} {currentYear}</span>
                      <button type="button" onClick={nextMonth} className="p-1 hover:bg-white rounded">
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-7 gap-1 mb-1">
                      {WEEKDAYS.map((day) => (
                        <div key={day} className="h-8 flex items-center justify-center text-xs text-slate-500">
                          {day}
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {renderCalendar()}
                    </div>
                  </div>
                  {selectedDates.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {selectedDates.map((dateKey) => (
                        <Badge key={dateKey} variant="secondary" className="text-xs">
                          {formatDisplayDate(dateKey)}
                          <button
                            type="button"
                            onClick={() => setSelectedDates(selectedDates.filter(d => d !== dateKey))}
                            className="ml-1"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Time */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1 text-sm">
                      <Clock className="h-3 w-3" /> Início *
                    </Label>
                    <Input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      disabled={formLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1 text-sm">
                      <Clock className="h-3 w-3" /> Término *
                    </Label>
                    <Input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      disabled={formLoading}
                    />
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4" /> Valor/Dia *
                    </Label>
                    <Input
                      type="number"
                      min="1"
                      step="1"
                      placeholder="150.00"
                      value={dailyRate}
                      onChange={(e) => setDailyRate(e.target.value)}
                      disabled={formLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      <Users className="h-4 w-4" /> Trabalhadores *
                    </Label>
                    <Input
                      type="number"
                      min="1"
                      value={requiredWorkers}
                      onChange={(e) => setRequiredWorkers(e.target.value)}
                      disabled={formLoading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Habilidades</Label>
                  <div className="flex flex-wrap gap-2">
                    {AVAILABLE_SKILLS.map((skill) => (
                      <Badge
                        key={skill}
                        variant={skills.includes(skill) ? 'default' : 'outline'}
                        className={`cursor-pointer text-xs ${
                          skills.includes(skill) ? 'bg-primary' : 'hover:bg-slate-100'
                        }`}
                        onClick={() => !formLoading && toggleSkill(skill)}
                      >
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Summary */}
                {selectedDates.length > 0 && dailyRate && (
                  <Card className="bg-slate-50 border-0">
                    <CardContent className="pt-4">
                      <h4 className="font-semibold mb-3">Resumo</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Dias:</span>
                          <span className="font-medium">{selectedDates.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Trabalhadores:</span>
                          <span className="font-medium">{requiredWorkers}</span>
                        </div>
                        {startTime && endTime && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Jornada:</span>
                            <span className="font-medium">{calculateHours(startTime, endTime).toFixed(1)}h</span>
                          </div>
                        )}
                        <div className="border-t pt-2 mt-2">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Custo Total:</span>
                            <span className="font-bold text-primary">
                              R$ {(selectedDates.length * parseInt(requiredWorkers) * parseFloat(dailyRate)).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      resetForm();
                      setShowJobForm(false);
                    }}
                    disabled={formLoading}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={formLoading || selectedDates.length === 0}
                    className="flex-1"
                  >
                    {formLoading ? "Criando..." : "Criar Vaga"}
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Job Details Modal */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-lg">
          {selectedJob && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selectedJob.title}
                  {getStatusBadge(selectedJob.status)}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {selectedJob.description && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Descrição</p>
                    <p className="text-sm bg-slate-50 p-3 rounded-lg">{selectedJob.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Datas</p>
                    <p className="font-medium">{formatJobDates(selectedJob.dates, selectedJob.date)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Horário</p>
                    <p className="font-medium">{formatTime(selectedJob.start_time)} - {formatTime(selectedJob.end_time)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Valor/Dia</p>
                    <p className="font-medium text-emerald-600">R$ {selectedJob.daily_rate}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Trabalhadores</p>
                    <p className="font-medium">
                      {selectedJob.job_assignments?.length || 0}/{selectedJob.required_workers}
                    </p>
                  </div>
                </div>

                {selectedJob.skills_required?.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Habilidades</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedJob.skills_required.map((skill, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">{skill}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-xs text-muted-foreground mb-1">Local</p>
                  <p className="text-sm">{selectedJob.location}</p>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setDetailsOpen(false)}
                  >
                    Fechar
                  </Button>
                  <Link to="/admin" className="flex-1">
                    <Button className="w-full gap-2">
                      <Eye className="h-4 w-4" />
                      Ver no Dashboard
                    </Button>
                  </Link>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
