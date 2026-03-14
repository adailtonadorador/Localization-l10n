import { useEffect, useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { supabaseUntyped } from "@/lib/supabase";
import { notifyNewJob, notifyJobAssignment } from "@/lib/notifications";
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
  Search,
  Star,
  UserPlus,
} from "lucide-react";


interface Client {
  id: string;
  company_name: string;
  fantasia: string | null;
  filial: number | null;
  cnpj: string;
  address: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  cep: string | null;
  users: {
    name: string;
    email: string;
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

export function AdminNewJobPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);

  // Form state
  const [clientId, setClientId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [addressComplement, setAddressComplement] = useState("");
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const dailyRate = "110";
  const [requiredWorkers, setRequiredWorkers] = useState("1");

  // Client search state
  const [clientSearch, setClientSearch] = useState("");
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
  const clientDropdownRef = useRef<HTMLDivElement>(null);

  // Worker assignment state
  const [availableWorkers, setAvailableWorkers] = useState<AvailableWorker[]>([]);
  const [selectedWorkerIds, setSelectedWorkerIds] = useState<string[]>([]);
  const [workerSearch, setWorkerSearch] = useState("");
  const [loadingWorkers, setLoadingWorkers] = useState(false);

  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  useEffect(() => {
    loadClients();
  }, []);

  async function loadClients() {
    try {
      const { data } = await supabaseUntyped
        .from('clients')
        .select(`
          id,
          company_name,
          fantasia,
          filial,
          cnpj,
          address,
          logradouro,
          numero,
          complemento,
          bairro,
          cidade,
          uf,
          cep,
          users (name, email)
        `)
        .order('company_name');

      setClients(data || []);
    } catch (error) {
      console.error('Error loading clients:', error);
    } finally {
      setLoadingClients(false);
    }
  }


  // Close client dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(e.target as Node)) {
        setClientDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredClients = clients.filter(c => {
    if (!clientSearch.trim()) return true;
    const term = clientSearch.toLowerCase();
    const displayName = (c.fantasia || c.company_name).toLowerCase();
    const cnpj = c.cnpj || '';
    return displayName.includes(term) || cnpj.includes(term);
  });

  // Load workers when title or client changes
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

  function toggleWorkerSelection(workerId: string) {
    setSelectedWorkerIds(prev => {
      if (prev.includes(workerId)) {
        return prev.filter(id => id !== workerId);
      }
      const maxWorkers = parseInt(requiredWorkers) || 1;
      if (prev.length >= maxWorkers) {
        toast.error(`Máximo de ${maxWorkers} prestador(es) para esta vaga`);
        return prev;
      }
      return [...prev, workerId];
    });
  }

  const filteredWorkers = availableWorkers.filter(w =>
    w.users?.name?.toLowerCase().includes(workerSearch.toLowerCase())
  );

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

    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-10" />);
    }

    // Days of month
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

    // Validation
    if (!clientId) {
      setError("Selecione uma empresa");
      return;
    }
    if (!title.trim()) {
      setError("Título é obrigatório");
      return;
    }
    if (!selectedClient?.address && !selectedClient?.logradouro) {
      setError("A empresa selecionada não possui endereço cadastrado");
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
    if (!dailyRate || parseFloat(dailyRate) <= 0) {
      setError("Valor por dia deve ser maior que zero");
      return;
    }

    setLoading(true);

    // Montar localização completa usando endereço da empresa
    let fullLocation = selectedClient?.address || '';
    if (!fullLocation && selectedClient?.logradouro) {
      fullLocation = `${selectedClient.logradouro}, ${selectedClient.numero || 'S/N'}`;
      if (selectedClient.complemento) fullLocation += ` - ${selectedClient.complemento}`;
      if (selectedClient.bairro) fullLocation += `, ${selectedClient.bairro}`;
      if (selectedClient.cidade) fullLocation += `, ${selectedClient.cidade}`;
      if (selectedClient.uf) fullLocation += ` - ${selectedClient.uf}`;
    }
    if (addressComplement.trim()) {
      fullLocation = `${addressComplement.trim()} - ${fullLocation}`;
    }

    try {
      const numRequired = parseInt(requiredWorkers) || 1;
      const allSlotsFilled = selectedWorkerIds.length >= numRequired;
      const initialStatus = allSlotsFilled ? 'assigned' : 'open';

      // Create a single job with multiple dates
      const { data: newJob, error: insertError } = await supabaseUntyped
        .from('jobs')
        .insert({
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
          required_workers: numRequired,
          skills_required: [],
          status: initialStatus,
        })
        .select('id')
        .single();

      if (insertError || !newJob) {
        console.error('Insert error:', insertError);
        setError("Erro ao criar vaga. Tente novamente.");
        setLoading(false);
        return;
      }

      // Create assignments and work_records for pre-assigned workers
      if (selectedWorkerIds.length > 0) {
        // Create job_assignments
        const assignments = selectedWorkerIds.map(workerId => ({
          job_id: newJob.id,
          worker_id: workerId,
          status: 'confirmed',
        }));
        await supabaseUntyped.from('job_assignments').insert(assignments);

        // Create work_records for each worker x each date
        const workRecords = selectedWorkerIds.flatMap(workerId =>
          selectedDates.map(date => ({
            job_id: newJob.id,
            worker_id: workerId,
            work_date: date,
            status: 'pending',
          }))
        );
        await supabaseUntyped.from('work_records').insert(workRecords);

        // Notify each assigned worker
        for (const workerId of selectedWorkerIds) {
          notifyJobAssignment(workerId, title.trim(), selectedDates[0]);
        }
      }

      // Only notify other workers if there are unfilled slots
      if (!allSlotsFilled) {
        notifyNewJob(title.trim(), selectedClient?.cidade || undefined);
      }

      toast.success("Vaga criada com sucesso!");
      navigate("/admin");
    } catch {
      setError("Erro ao criar vaga. Tente novamente.");
      setLoading(false);
    }
  }

  const selectedClient = clients.find(c => c.id === clientId);

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link to="/admin">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Nova Vaga</h2>
          <p className="text-muted-foreground">Cadastre uma nova oportunidade de trabalho</p>
        </div>
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
                  {loadingClients ? (
                    <p className="text-sm text-muted-foreground">Carregando empresas...</p>
                  ) : clients.length === 0 ? (
                    <p className="text-sm text-red-500">Nenhuma empresa cadastrada.</p>
                  ) : (
                    <div className="relative" ref={clientDropdownRef}>
                      <button
                        type="button"
                        onClick={() => { setClientDropdownOpen(!clientDropdownOpen); setClientSearch(""); }}
                        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      >
                        <span className={selectedClient ? 'text-foreground' : 'text-muted-foreground'}>
                          {selectedClient
                            ? `${selectedClient.fantasia || selectedClient.company_name}${selectedClient.filial != null ? ` · Filial ${selectedClient.filial}` : ''}`
                            : 'Selecione uma empresa'}
                        </span>
                        <Search className="h-4 w-4 text-muted-foreground" />
                      </button>
                      {clientDropdownOpen && (
                        <div className="absolute z-50 mt-1 w-full rounded-md border bg-white shadow-lg">
                          <div className="p-2 border-b">
                            <div className="relative">
                              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <input
                                type="text"
                                placeholder="Buscar empresa..."
                                value={clientSearch}
                                onChange={(e) => setClientSearch(e.target.value)}
                                className="w-full pl-8 pr-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                                autoFocus
                              />
                            </div>
                          </div>
                          <div className="max-h-60 overflow-y-auto p-1">
                            {filteredClients.length > 0 ? (
                              filteredClients.map((client) => (
                                <button
                                  key={client.id}
                                  type="button"
                                  onClick={() => {
                                    setClientId(client.id);
                                    setClientDropdownOpen(false);
                                    setClientSearch("");
                                  }}
                                  className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                                    client.id === clientId
                                      ? 'bg-primary text-primary-foreground'
                                      : 'hover:bg-slate-100'
                                  }`}
                                >
                                  <span className="font-medium">
                                    {client.fantasia || client.company_name}
                                    {client.filial != null && ` · Filial ${client.filial}`}
                                  </span>
                                  {client.cnpj && (
                                    <span className={`block text-xs ${client.id === clientId ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                                      CNPJ: {client.cnpj}
                                    </span>
                                  )}
                                </button>
                              ))
                            ) : (
                              <p className="px-3 py-4 text-sm text-muted-foreground text-center">
                                Nenhuma empresa encontrada
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {selectedClient && (
                    <p className="text-xs text-muted-foreground">
                      {selectedClient.users?.email}
                    </p>
                  )}
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
                    placeholder="Descreva as atividades, requisitos e informações adicionais da vaga..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={loading}
                    rows={4}
                    className="bg-white"
                  />
                </div>

                {/* Localização - Endereço da Empresa */}
                <div className="space-y-4">
                  <Label className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    Localização
                  </Label>

                  {selectedClient ? (
                    <div className="space-y-3">
                      {/* Endereço da empresa */}
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

                      {/* Complemento adicional */}
                      <div className="space-y-2">
                        <Label htmlFor="addressComplement" className="text-sm">Complemento adicional (opcional)</Label>
                        <Input
                          id="addressComplement"
                          placeholder="Ex: Galpão 3, Setor de Cargas"
                          value={addressComplement}
                          onChange={(e) => setAddressComplement(e.target.value)}
                          disabled={loading}
                          className="bg-white"
                        />
                        <p className="text-xs text-muted-foreground">
                          Adicione informações extras sobre o local de trabalho
                        </p>
                      </div>
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
                              className="ml-1 p-0.5 rounded hover:bg-slate-300"
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

          {/* Right Column - Payment & Skills */}
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
                    readOnly
                    className="bg-slate-100 text-lg font-semibold cursor-not-allowed"
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

            {/* Worker Assignment (Optional) */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <UserPlus className="h-5 w-5 text-primary" />
                  Atribuir Prestadores
                </CardTitle>
                <CardDescription>
                  Opcional — selecione prestadores para atribuir à vaga
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {!title || !clientId ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Selecione a empresa e o título da vaga para ver prestadores disponíveis
                  </p>
                ) : loadingWorkers ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
                  </div>
                ) : availableWorkers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum prestador aprovado com função "{title}"
                  </p>
                ) : (
                  <>
                    {/* Selected count */}
                    {selectedWorkerIds.length > 0 && (
                      <div className="flex items-center justify-between px-3 py-2 bg-blue-50 rounded-lg">
                        <span className="text-sm font-medium text-blue-700">
                          {selectedWorkerIds.length} de {requiredWorkers} selecionado(s)
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

                    {/* Search */}
                    {availableWorkers.length > 3 && (
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

                    {/* Worker list */}
                    <div className="max-h-60 overflow-y-auto space-y-1">
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
                              <p className="text-sm font-medium truncate">
                                {worker.users?.name}
                              </p>
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
                  </>
                )}
              </CardContent>
            </Card>

            {/* Summary & Submit */}
            <Card className="border-0 shadow-sm bg-slate-50">
              <CardContent className="pt-6">
                <h3 className="font-semibold text-slate-900 mb-3">Resumo da Vaga</h3>
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
                        <span className="font-medium">
                          R$ {parseFloat(dailyRate).toFixed(2)}
                        </span>
                      </div>
                      <div className="border-t pt-2 mt-2">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>Por trabalhador ({selectedDates.length} dia{selectedDates.length !== 1 ? 's' : ''}):</span>
                          <span>
                            R$ {(selectedDates.length * parseFloat(dailyRate)).toFixed(2)}
                          </span>
                        </div>
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
                        Criando...
                      </span>
                    ) : (
                      "Criar Vaga"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/admin")}
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
