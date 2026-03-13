import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { toast } from "sonner";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { supabaseUntyped } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Save,
  UserPlus,
  Search,
  Star,
  UserMinus,
  AlertTriangle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Client {
  id: string;
  company_name: string;
  fantasia: string | null;
  filial: number | null;
  address: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  cep: string | null;
}

interface JobData {
  id: string;
  client_id: string;
  title: string;
  description: string | null;
  location: string;
  date: string;
  dates: string[] | null;
  start_time: string;
  end_time: string;
  daily_rate: number;
  required_workers: number;
  status: string;
}

interface JobAssignment {
  id: string;
  status: string;
  worker_id: string;
  workers: {
    id: string;
    users: { name: string };
  };
}

interface AvailableWorker {
  id: string;
  funcao: string;
  rating: number;
  total_jobs: number;
  users: {
    name: string;
    phone: string | null;
  };
}

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function AdminEditJobPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loadingJob, setLoadingJob] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);

  // Form state
  const [clientId, setClientId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [dailyRate, setDailyRate] = useState("110");
  const [requiredWorkers, setRequiredWorkers] = useState("1");
  const [jobStatus, setJobStatus] = useState("");

  // Worker assignment state
  const [assignments, setAssignments] = useState<JobAssignment[]>([]);
  const [availableWorkers, setAvailableWorkers] = useState<AvailableWorker[]>([]);
  const [selectedWorkerIds, setSelectedWorkerIds] = useState<string[]>([]);
  const [workerSearch, setWorkerSearch] = useState("");
  const [loadingWorkers, setLoadingWorkers] = useState(false);
  const [assigningWorkers, setAssigningWorkers] = useState(false);

  // Unassign dialog state
  const [unassignDialogOpen, setUnassignDialogOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<JobAssignment | null>(null);
  const [unassignLoading, setUnassignLoading] = useState(false);

  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  useEffect(() => {
    loadData();
  }, [id]);

  async function loadData() {
    setLoadingJob(true);
    try {
      const [jobRes, clientsRes, assignmentsRes] = await Promise.all([
        supabaseUntyped
          .from('jobs')
          .select('*')
          .eq('id', id)
          .single(),
        supabaseUntyped
          .from('clients')
          .select('id, company_name, fantasia, filial, address, logradouro, numero, complemento, bairro, cidade, uf, cep')
          .order('company_name'),
        supabaseUntyped
          .from('job_assignments')
          .select('id, status, worker_id, workers(id, users(name))')
          .eq('job_id', id),
      ]);

      if (jobRes.error || !jobRes.data) {
        toast.error('Diária não encontrada');
        navigate('/admin/jobs');
        return;
      }

      const job: JobData = jobRes.data;
      setClients(clientsRes.data || []);
      setAssignments(assignmentsRes.data || []);

      // Populate form
      setClientId(job.client_id);
      setTitle(job.title);
      setDescription(job.description || "");
      setSelectedDates(job.dates && job.dates.length > 0 ? job.dates : [job.date]);
      setStartTime(job.start_time.slice(0, 5));
      setEndTime(job.end_time.slice(0, 5));
      setDailyRate(String(job.daily_rate));
      setRequiredWorkers(String(job.required_workers));
      setJobStatus(job.status);

      // Set calendar to first date's month
      const firstDate = job.dates?.[0] || job.date;
      if (firstDate) {
        const [year, month] = firstDate.split('-').map(Number);
        setCurrentMonth(month - 1);
        setCurrentYear(year);
      }
    } catch (err) {
      console.error('Error loading job:', err);
      toast.error('Erro ao carregar diária');
      navigate('/admin/jobs');
    } finally {
      setLoadingJob(false);
    }
  }

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

  function removeDate(dateKey: string) {
    setSelectedDates(selectedDates.filter(d => d !== dateKey));
  }

  function formatDisplayDate(dateKey: string) {
    const [year, month, day] = dateKey.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      weekday: 'short'
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
      days.push(<div key={`empty-${i}`} className="h-10" />);
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
            h-10 w-10 rounded-full text-sm font-medium transition-all
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

  // Load available workers when title or client changes
  useEffect(() => {
    const clientUf = clients.find(c => c.id === clientId)?.uf;
    if (title && clientUf) {
      loadAvailableWorkers(title, clientUf);
    } else {
      setAvailableWorkers([]);
    }
    setSelectedWorkerIds([]);
  }, [title, clientId]);

  async function loadAvailableWorkers(funcao: string, uf: string) {
    setLoadingWorkers(true);
    try {
      const { data } = await supabaseUntyped
        .from('workers')
        .select('id, funcao, rating, total_jobs, users(name, phone)')
        .eq('approval_status', 'approved')
        .eq('is_active', true)
        .eq('funcao', funcao)
        .eq('uf', uf);

      setAvailableWorkers(data || []);
    } catch (error) {
      console.error('Error loading workers:', error);
    } finally {
      setLoadingWorkers(false);
    }
  }

  const activeAssignments = assignments.filter(a =>
    ['pending', 'confirmed', 'in_progress', 'checked_in'].includes(a.status)
  );
  const inactiveAssignments = assignments.filter(a =>
    !['pending', 'confirmed', 'in_progress', 'checked_in'].includes(a.status)
  );

  // Filter out already-assigned workers from available list
  const assignedWorkerIds = new Set(activeAssignments.map(a => a.worker_id));
  const unassignedWorkers = availableWorkers.filter(w => !assignedWorkerIds.has(w.id));
  const filteredWorkers = unassignedWorkers.filter(w =>
    w.users?.name?.toLowerCase().includes(workerSearch.toLowerCase())
  );

  const maxWorkers = parseInt(requiredWorkers) || 1;
  const remainingSlots = maxWorkers - activeAssignments.length;

  function toggleWorkerSelection(workerId: string) {
    setSelectedWorkerIds(prev => {
      if (prev.includes(workerId)) {
        return prev.filter(id => id !== workerId);
      }
      if (prev.length >= remainingSlots) {
        toast.error(`Apenas ${remainingSlots} vaga(s) disponível(is)`);
        return prev;
      }
      return [...prev, workerId];
    });
  }

  async function handleAssignWorkers() {
    if (selectedWorkerIds.length === 0 || !id) return;

    setAssigningWorkers(true);
    try {
      // Create job_assignments
      const newAssignments = selectedWorkerIds.map(workerId => ({
        job_id: id,
        worker_id: workerId,
        status: 'confirmed',
      }));
      await supabaseUntyped.from('job_assignments').insert(newAssignments);

      // Create work_records for each worker x each date
      const dates = selectedDates.length > 0 ? selectedDates : [];
      const workRecords = selectedWorkerIds.flatMap(workerId =>
        dates.map(date => ({
          job_id: id,
          worker_id: workerId,
          work_date: date,
          status: 'pending',
        }))
      );
      if (workRecords.length > 0) {
        await supabaseUntyped.from('work_records').insert(workRecords);
      }

      // Check if all slots are now filled → update job status to 'assigned'
      const newActiveCount = activeAssignments.length + selectedWorkerIds.length;
      if (newActiveCount >= maxWorkers && jobStatus === 'open') {
        await supabaseUntyped
          .from('jobs')
          .update({ status: 'assigned' })
          .eq('id', id);
        setJobStatus('assigned');
      }

      toast.success(`${selectedWorkerIds.length} prestador(es) atribuído(s) com sucesso!`);
      setSelectedWorkerIds([]);
      // Reload assignments
      const { data } = await supabaseUntyped
        .from('job_assignments')
        .select('id, status, worker_id, workers(id, users(name))')
        .eq('job_id', id);
      setAssignments(data || []);
    } catch (error) {
      console.error('Error assigning workers:', error);
      toast.error('Erro ao atribuir prestadores');
    } finally {
      setAssigningWorkers(false);
    }
  }

  async function handleUnassignWorker() {
    if (!selectedAssignment || !id) return;

    setUnassignLoading(true);
    try {
      await supabaseUntyped
        .from('job_assignments')
        .update({ status: 'unassigned_by_admin' })
        .eq('id', selectedAssignment.id);

      await supabaseUntyped
        .from('work_records')
        .delete()
        .eq('job_id', id)
        .eq('worker_id', selectedAssignment.worker_id);

      // If active count drops below required, reopen job
      const newActiveCount = activeAssignments.length - 1;
      if (newActiveCount < maxWorkers && jobStatus !== 'open') {
        await supabaseUntyped
          .from('jobs')
          .update({ status: 'open' })
          .eq('id', id);
        setJobStatus('open');
      }

      toast.success('Prestador removido com sucesso!');
      setUnassignDialogOpen(false);

      // Reload assignments
      const { data } = await supabaseUntyped
        .from('job_assignments')
        .select('id, status, worker_id, workers(id, users(name))')
        .eq('job_id', id);
      setAssignments(data || []);
    } catch (error) {
      console.error('Error unassigning worker:', error);
      toast.error('Erro ao remover prestador');
    } finally {
      setUnassignLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!clientId) {
      setError("Selecione uma empresa");
      return;
    }
    if (!title.trim()) {
      setError("Título é obrigatório");
      return;
    }
    if (selectedDates.length === 0) {
      setError("Selecione pelo menos uma data");
      return;
    }
    if (!startTime || !endTime) {
      setError("Horário de início e fim são obrigatórios");
      return;
    }

    setLoading(true);

    // Build location from client address
    const selectedClient = clients.find(c => c.id === clientId);
    let fullLocation = selectedClient?.address || '';
    if (!fullLocation && selectedClient?.logradouro) {
      fullLocation = `${selectedClient.logradouro}, ${selectedClient.numero || 'S/N'}`;
      if (selectedClient.complemento) fullLocation += ` - ${selectedClient.complemento}`;
      if (selectedClient.bairro) fullLocation += `, ${selectedClient.bairro}`;
      if (selectedClient.cidade) fullLocation += `, ${selectedClient.cidade}`;
      if (selectedClient.uf) fullLocation += ` - ${selectedClient.uf}`;
    }

    try {
      const { error: updateError } = await supabaseUntyped
        .from('jobs')
        .update({
          client_id: clientId,
          title: title.trim(),
          description: description.trim() || null,
          location: fullLocation,
          uf: selectedClient?.uf || null,
          city: selectedClient?.cidade || null,
          date: selectedDates[0],
          dates: selectedDates,
          start_time: startTime,
          end_time: endTime,
          daily_rate: parseFloat(dailyRate),
          required_workers: parseInt(requiredWorkers) || 1,
        })
        .eq('id', id);

      if (updateError) {
        console.error('Update error:', updateError);
        setError("Erro ao atualizar diária. Tente novamente.");
        setLoading(false);
        return;
      }

      toast.success("Diária atualizada com sucesso!");
      navigate("/admin/jobs");
    } catch {
      setError("Erro ao atualizar diária. Tente novamente.");
      setLoading(false);
    }
  }

  const selectedClient = clients.find(c => c.id === clientId);

  if (loadingJob) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
            <p className="text-sm text-muted-foreground">Carregando diária...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link to="/admin/jobs">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-slate-900">Editar Diária</h2>
          <p className="text-muted-foreground">Altere as informações da diária</p>
        </div>
        {jobStatus && (
          <Badge className={
            jobStatus === 'open' ? 'bg-blue-500' :
            jobStatus === 'assigned' ? 'bg-purple-500' :
            jobStatus === 'in_progress' ? 'bg-amber-500' :
            jobStatus === 'completed' ? 'bg-green-500' :
            'bg-slate-500'
          }>
            {jobStatus === 'open' && 'Aberta'}
            {jobStatus === 'assigned' && 'Atribuída'}
            {jobStatus === 'in_progress' && 'Em Andamento'}
            {jobStatus === 'completed' && 'Concluída'}
            {jobStatus === 'cancelled' && 'Cancelada'}
          </Badge>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        {error && (
          <div className="mb-6 p-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
            {error}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Main Info */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Building2 className="h-5 w-5 text-primary" />
                  Informações Básicas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Empresa *</Label>
                  <Select value={clientId} onValueChange={setClientId}>
                    <SelectTrigger className="bg-white">
                      {selectedClient ? (
                        <span>
                          {selectedClient.fantasia || selectedClient.company_name}
                          {selectedClient.filial != null && ` · Filial ${selectedClient.filial}`}
                        </span>
                      ) : (
                        <SelectValue placeholder="Selecione uma empresa" />
                      )}
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.fantasia || client.company_name}
                          {client.filial != null && ` · Filial ${client.filial}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Título da Vaga *</Label>
                  <Select value={title} onValueChange={setTitle} disabled={loading}>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Selecione o título da vaga" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Operador Caixa">Operador Caixa</SelectItem>
                      <SelectItem value="Repositor">Repositor</SelectItem>
                      <SelectItem value="Empacotador">Empacotador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    placeholder="Descreva as atividades, requisitos e informações adicionais..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={loading}
                    rows={4}
                    className="bg-white"
                  />
                </div>

                {/* Localização */}
                <div className="space-y-4">
                  <Label className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    Localização
                  </Label>

                  {selectedClient ? (
                    <div className="p-4 bg-slate-50 rounded-lg border">
                      <p className="text-xs text-muted-foreground mb-1">Endereço da Empresa:</p>
                      <p className="font-medium text-slate-900">
                        {selectedClient.address || (selectedClient.logradouro
                          ? `${selectedClient.logradouro}, ${selectedClient.numero || 'S/N'}${selectedClient.complemento ? ` - ${selectedClient.complemento}` : ''}, ${selectedClient.bairro || ''}, ${selectedClient.cidade || ''} - ${selectedClient.uf || ''}`
                          : 'Endereço não cadastrado'
                        )}
                      </p>
                      {selectedClient.cep && (
                        <p className="text-xs text-muted-foreground mt-1">CEP: {selectedClient.cep}</p>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 bg-slate-50 rounded-lg border border-dashed">
                      <p className="text-sm text-muted-foreground text-center">
                        Selecione uma empresa para exibir o endereço
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Calendar className="h-5 w-5 text-primary" />
                  Datas de Trabalho
                </CardTitle>
                <CardDescription>
                  Selecione os dias em que o trabalho será realizado
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Calendar */}
                <div className="bg-slate-50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-4">
                    <button
                      type="button"
                      onClick={prevMonth}
                      className="p-2 hover:bg-white rounded-lg transition-colors"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <h3 className="font-semibold text-slate-900">
                      {MONTHS[currentMonth]} {currentYear}
                    </h3>
                    <button
                      type="button"
                      onClick={nextMonth}
                      className="p-2 hover:bg-white rounded-lg transition-colors"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {WEEKDAYS.map((day) => (
                      <div key={day} className="h-10 flex items-center justify-center text-xs font-medium text-slate-500">
                        {day}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-1">
                    {renderCalendar()}
                  </div>
                </div>

                {/* Selected Dates */}
                {selectedDates.length > 0 && (
                  <div className="mt-4">
                    <Label className="text-sm text-muted-foreground mb-2 block">
                      {selectedDates.length} data(s) selecionada(s):
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {selectedDates.map((dateKey) => (
                        <Badge
                          key={dateKey}
                          variant="secondary"
                          className="pl-3 pr-1 py-1 flex items-center gap-1"
                        >
                          {formatDisplayDate(dateKey)}
                          <button
                            type="button"
                            onClick={() => removeDate(dateKey)}
                            className="ml-1 p-0.5 hover:bg-slate-300 rounded"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Time Range */}
                <div className="grid grid-cols-2 gap-4 mt-6">
                  <div className="space-y-2">
                    <Label htmlFor="start-time" className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      Horário de Início *
                    </Label>
                    <Input
                      id="start-time"
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      disabled={loading}
                      className="bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end-time" className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      Horário de Término *
                    </Label>
                    <Input
                      id="end-time"
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      disabled={loading}
                      className="bg-white"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Payment & Summary */}
          <div className="space-y-6">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <DollarSign className="h-5 w-5 text-primary" />
                  Pagamento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="daily-rate">Valor por Dia (R$)</Label>
                  <Input
                    id="daily-rate"
                    type="number"
                    value={dailyRate}
                    onChange={(e) => setDailyRate(e.target.value)}
                    disabled={loading}
                    className="bg-white text-lg font-semibold"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="workers" className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    Prestadores Necessários *
                  </Label>
                  <Input
                    id="workers"
                    type="number"
                    min="1"
                    value={requiredWorkers}
                    onChange={(e) => setRequiredWorkers(e.target.value)}
                    disabled={loading}
                    className="bg-white"
                  />
                </div>

                {dailyRate && startTime && endTime && (
                  <div className="bg-blue-50 rounded-lg p-3 mt-4">
                    <p className="text-xs text-blue-600 font-medium mb-1">Valor por trabalhador/dia:</p>
                    <p className="text-xl font-bold text-blue-700">
                      R$ {parseFloat(dailyRate).toFixed(2)}
                    </p>
                    <p className="text-xs text-blue-600">
                      Jornada: {calculateHours(startTime, endTime).toFixed(1)}h
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Worker Assignment */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <UserPlus className="h-5 w-5 text-primary" />
                  Prestadores
                </CardTitle>
                <CardDescription>
                  {activeAssignments.length}/{maxWorkers} atribuído(s)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Current assignments */}
                {activeAssignments.length > 0 && (
                  <div className="space-y-1.5">
                    {activeAssignments.map(a => (
                      <div
                        key={a.id}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-blue-50 border border-blue-200"
                      >
                        <span className="text-sm font-medium">{a.workers?.users?.name || 'Prestador'}</span>
                        <div className="flex items-center gap-1.5">
                          <Badge
                            variant="secondary"
                            className={
                              a.status === 'confirmed' ? 'bg-blue-100 text-blue-700 text-[10px]' :
                              a.status === 'pending' ? 'bg-amber-100 text-amber-700 text-[10px]' :
                              'text-[10px]'
                            }
                          >
                            {a.status === 'pending' ? 'Pendente' : a.status === 'confirmed' ? 'Confirmado' : a.status}
                          </Badge>
                          <button
                            type="button"
                            onClick={() => { setSelectedAssignment(a); setUnassignDialogOpen(true); }}
                            className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                            title="Remover prestador"
                          >
                            <UserMinus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Inactive (removed/withdrawn) */}
                {inactiveAssignments.length > 0 && (
                  <div className="space-y-1">
                    {inactiveAssignments.map(a => (
                      <div
                        key={a.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-red-50 border border-red-100 opacity-60"
                      >
                        <span className="text-sm text-red-600 line-through">{a.workers?.users?.name || 'Prestador'}</span>
                        <Badge variant="destructive" className="text-[10px]">
                          {a.status === 'withdrawn' ? 'Desistiu' : a.status === 'unassigned_by_admin' ? 'Removido' : a.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add workers - only if slots available */}
                {remainingSlots > 0 && (
                  <>
                    <div className="border-t pt-3 mt-2">
                      <p className="text-xs text-muted-foreground mb-2">
                        {remainingSlots} vaga(s) disponível(is) — selecione prestadores:
                      </p>
                    </div>

                    {!title || !clientId ? (
                      <p className="text-sm text-muted-foreground text-center py-3">
                        Selecione a empresa e título para ver prestadores
                      </p>
                    ) : loadingWorkers ? (
                      <div className="flex items-center justify-center py-3">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
                      </div>
                    ) : unassignedWorkers.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-3">
                        Nenhum prestador disponível com função "{title}"
                      </p>
                    ) : (
                      <>
                        {selectedWorkerIds.length > 0 && (
                          <div className="flex items-center justify-between px-3 py-2 bg-blue-50 rounded-lg">
                            <span className="text-sm font-medium text-blue-700">
                              {selectedWorkerIds.length} selecionado(s)
                            </span>
                            <button
                              type="button"
                              onClick={() => setSelectedWorkerIds([])}
                              className="text-xs text-blue-600 hover:text-blue-800"
                            >
                              Limpar
                            </button>
                          </div>
                        )}

                        {unassignedWorkers.length > 3 && (
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Buscar por nome..."
                              value={workerSearch}
                              onChange={(e) => setWorkerSearch(e.target.value)}
                              className="pl-9 bg-white h-9 text-sm"
                            />
                          </div>
                        )}

                        <div className="max-h-48 overflow-y-auto space-y-1">
                          {filteredWorkers.map((worker) => {
                            const isSelected = selectedWorkerIds.includes(worker.id);
                            return (
                              <div
                                key={worker.id}
                                onClick={() => toggleWorkerSelection(worker.id)}
                                className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${
                                  isSelected ? 'bg-blue-50 border border-blue-200' : 'hover:bg-slate-50 border border-transparent'
                                }`}
                              >
                                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 text-[10px] leading-none ${
                                  isSelected ? 'bg-primary border-primary text-white' : 'border-slate-300'
                                }`}>
                                  {isSelected && '✓'}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{worker.users?.name}</p>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-0.5">
                                      <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                                      {worker.rating?.toFixed(1) || 'N/A'}
                                    </span>
                                    <span>{worker.total_jobs || 0} trabalhos</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                          {filteredWorkers.length === 0 && workerSearch && (
                            <p className="text-sm text-muted-foreground text-center py-2">
                              Nenhum resultado para "{workerSearch}"
                            </p>
                          )}
                        </div>

                        {selectedWorkerIds.length > 0 && (
                          <Button
                            type="button"
                            onClick={handleAssignWorkers}
                            disabled={assigningWorkers}
                            className="w-full mt-2"
                            size="sm"
                          >
                            {assigningWorkers ? 'Atribuindo...' : `Atribuir ${selectedWorkerIds.length} Prestador(es)`}
                          </Button>
                        )}
                      </>
                    )}
                  </>
                )}

                {remainingSlots <= 0 && activeAssignments.length > 0 && (
                  <p className="text-xs text-green-600 text-center py-1">
                    Todas as vagas estão preenchidas
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Summary & Submit */}
            <Card className="border-0 shadow-sm bg-slate-50">
              <CardContent className="pt-6">
                <h3 className="font-semibold text-slate-900 mb-3">Resumo</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Dias de trabalho:</span>
                    <span className="font-medium">{selectedDates.length} dia{selectedDates.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Prestadores:</span>
                    <span className="font-medium">{requiredWorkers}</span>
                  </div>
                  {selectedDates.length > 0 && dailyRate && startTime && endTime && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Jornada por dia:</span>
                        <span className="font-medium">{calculateHours(startTime, endTime).toFixed(1)}h</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Valor por dia:</span>
                        <span className="font-medium">R$ {parseFloat(dailyRate).toFixed(2)}</span>
                      </div>
                      <div className="border-t pt-2 mt-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Custo total estimado:</span>
                          <span className="font-bold text-primary">
                            R$ {(
                              selectedDates.length *
                              parseInt(requiredWorkers) *
                              parseFloat(dailyRate)
                            ).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex flex-col gap-3 mt-6">
                  <Button
                    type="submit"
                    disabled={loading || selectedDates.length === 0}
                    className="w-full h-11 font-medium"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Salvando...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Save className="h-4 w-4" />
                        Salvar Alterações
                      </span>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/admin/jobs")}
                    disabled={loading}
                    className="w-full"
                  >
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>

      {/* Unassign Confirmation Dialog */}
      <Dialog open={unassignDialogOpen} onOpenChange={setUnassignDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Remover Prestador
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Remover <strong className="text-foreground">{selectedAssignment?.workers?.users?.name}</strong> desta diária?
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-800 text-sm">
              <ul className="list-disc list-inside space-y-1">
                <li>Registros de trabalho pendentes serão excluídos</li>
                <li>A vaga será reaberta para outros prestadores</li>
              </ul>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setUnassignDialogOpen(false)} disabled={unassignLoading}>
              Cancelar
            </Button>
            <Button onClick={handleUnassignWorker} disabled={unassignLoading} className="bg-red-500 hover:bg-red-600">
              {unassignLoading ? 'Removendo...' : 'Confirmar Remoção'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

function calculateHours(start: string, end: string): number {
  if (!start || !end) return 0;
  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  return Math.max(0, (endMinutes - startMinutes) / 60);
}
