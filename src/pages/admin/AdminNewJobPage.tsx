import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { supabaseUntyped } from "@/lib/supabase";
import { BRAZILIAN_STATES, fetchCitiesByUF, type City } from "@/lib/brazil-locations";
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
  Loader2
} from "lucide-react";

const AVAILABLE_SKILLS = [
  'Limpeza',
  'Carga e Descarga',
  'Atendimento ao Cliente',
  'Vendas',
  'Recepção',
  'Estoque',
  'Cozinha',
  'Garçom',
  'Segurança',
  'Motorista',
  'Entrega',
  'Montagem',
  'Eventos',
  'Promoção',
];

interface Client {
  id: string;
  company_name: string;
  cnpj: string;
  users: {
    name: string;
    email: string;
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
  const [uf, setUf] = useState("");
  const [city, setCity] = useState("");
  const [cities, setCities] = useState<City[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [addressDetails, setAddressDetails] = useState("");
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [dailyRate, setDailyRate] = useState("");
  const [requiredWorkers, setRequiredWorkers] = useState("1");
  const [skills, setSkills] = useState<string[]>([]);

  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  useEffect(() => {
    loadClients();
  }, []);

  // Carregar cidades quando UF mudar
  useEffect(() => {
    if (uf) {
      setLoadingCities(true);
      setCity("");
      fetchCitiesByUF(uf).then((data) => {
        setCities(data);
        setLoadingCities(false);
      });
    } else {
      setCities([]);
      setCity("");
    }
  }, [uf]);

  async function loadClients() {
    try {
      const { data } = await supabaseUntyped
        .from('clients')
        .select(`
          id,
          company_name,
          cnpj,
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

  function toggleSkill(skill: string) {
    if (skills.includes(skill)) {
      setSkills(skills.filter(s => s !== skill));
    } else {
      setSkills([...skills, skill]);
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
    if (!uf) {
      setError("Selecione um estado");
      return;
    }
    if (!city) {
      setError("Selecione um município");
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

    // Montar localização completa
    const fullLocation = addressDetails.trim()
      ? `${addressDetails.trim()}, ${city} - ${uf}`
      : `${city} - ${uf}`;

    try {
      // Create a single job with multiple dates
      const { error: insertError } = await supabaseUntyped.from('jobs').insert({
        client_id: clientId,
        title: title.trim(),
        description: description.trim() || null,
        location: fullLocation,
        uf,
        city,
        date: selectedDates[0], // Keep first date for backward compatibility
        dates: selectedDates, // Array with all selected dates
        start_time: startTime,
        end_time: endTime,
        daily_rate: parseFloat(dailyRate),
        required_workers: parseInt(requiredWorkers) || 1,
        skills_required: skills,
        status: 'open',
      });

      if (insertError) {
        console.error('Insert error:', insertError);
        setError("Erro ao criar vaga. Tente novamente.");
        setLoading(false);
        return;
      }

      alert("Vaga criada com sucesso!");
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
                    <Select value={clientId} onValueChange={setClientId}>
                      <SelectTrigger className="bg-white">
                        {selectedClient ? (
                          <span>{selectedClient.company_name}</span>
                        ) : (
                          <SelectValue placeholder="Selecione uma empresa" />
                        )}
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.company_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {selectedClient && (
                    <p className="text-xs text-muted-foreground">
                      {selectedClient.users?.email}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">Título da Vaga *</Label>
                  <Input
                    id="title"
                    placeholder="Ex: Auxiliar de Carga e Descarga"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    disabled={loading}
                    className="bg-white"
                  />
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

                <div className="space-y-4">
                  <Label className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    Localização *
                  </Label>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="uf" className="text-sm">Estado</Label>
                      <Select value={uf} onValueChange={setUf}>
                        <SelectTrigger className="bg-white">
                          <SelectValue placeholder="Selecione o estado" />
                        </SelectTrigger>
                        <SelectContent>
                          {BRAZILIAN_STATES.map((state) => (
                            <SelectItem key={state.uf} value={state.uf}>
                              {state.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="city" className="text-sm">Município</Label>
                      <Select value={city} onValueChange={setCity} disabled={!uf || loadingCities}>
                        <SelectTrigger className="bg-white">
                          {loadingCities ? (
                            <span className="flex items-center gap-2 text-muted-foreground">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Carregando...
                            </span>
                          ) : (
                            <SelectValue placeholder={uf ? "Selecione o município" : "Selecione o estado primeiro"} />
                          )}
                        </SelectTrigger>
                        <SelectContent>
                          {cities.map((c) => (
                            <SelectItem key={c.id} value={c.nome}>
                              {c.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="addressDetails" className="text-sm">Endereço / Complemento (opcional)</Label>
                    <Input
                      id="addressDetails"
                      placeholder="Ex: Av. Paulista, 1000 - Bela Vista"
                      value={addressDetails}
                      onChange={(e) => setAddressDetails(e.target.value)}
                      disabled={loading}
                      className="bg-white"
                    />
                  </div>
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
                  <Label htmlFor="daily-rate">Valor por Dia (R$) *</Label>
                  <Input
                    id="daily-rate"
                    type="number"
                    min="1"
                    step="1"
                    placeholder="150.00"
                    value={dailyRate}
                    onChange={(e) => setDailyRate(e.target.value)}
                    disabled={loading}
                    className="bg-white text-lg font-semibold"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="workers" className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    Trabalhadores Necessários *
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
                  <div className="bg-emerald-50 rounded-lg p-3 mt-4">
                    <p className="text-xs text-emerald-600 font-medium mb-1">Valor por trabalhador/dia:</p>
                    <p className="text-xl font-bold text-emerald-700">
                      R$ {parseFloat(dailyRate).toFixed(2)}
                    </p>
                    <p className="text-xs text-emerald-600">
                      Jornada: {calculateHours(startTime, endTime).toFixed(1)}h
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Habilidades</CardTitle>
                <CardDescription>
                  Selecione as habilidades necessárias
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_SKILLS.map((skill) => (
                    <Badge
                      key={skill}
                      variant={skills.includes(skill) ? 'default' : 'outline'}
                      className={`cursor-pointer transition-all ${
                        skills.includes(skill)
                          ? 'bg-primary hover:bg-primary/90'
                          : 'hover:bg-slate-100'
                      }`}
                      onClick={() => !loading && toggleSkill(skill)}
                    >
                      {skill}
                    </Badge>
                  ))}
                </div>
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
                    <span className="text-muted-foreground">Trabalhadores:</span>
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
