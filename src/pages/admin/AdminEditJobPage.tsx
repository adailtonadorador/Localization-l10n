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
} from "lucide-react";

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

  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  useEffect(() => {
    loadData();
  }, [id]);

  async function loadData() {
    setLoadingJob(true);
    try {
      const [jobRes, clientsRes] = await Promise.all([
        supabaseUntyped
          .from('jobs')
          .select('*')
          .eq('id', id)
          .single(),
        supabaseUntyped
          .from('clients')
          .select('id, company_name, fantasia, filial, address, logradouro, numero, complemento, bairro, cidade, uf, cep')
          .order('company_name'),
      ]);

      if (jobRes.error || !jobRes.data) {
        toast.error('Diária não encontrada');
        navigate('/admin/jobs');
        return;
      }

      const job: JobData = jobRes.data;
      setClients(clientsRes.data || []);

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
