import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { supabaseUntyped } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [requiredWorkers, setRequiredWorkers] = useState("1");
  const [skills, setSkills] = useState<string[]>([]);

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
    if (!location.trim()) {
      setError("Localização é obrigatória");
      return;
    }
    if (!date) {
      setError("Data é obrigatória");
      return;
    }
    if (!startTime || !endTime) {
      setError("Horário de início e fim são obrigatórios");
      return;
    }
    if (!hourlyRate || parseFloat(hourlyRate) <= 0) {
      setError("Valor por hora deve ser maior que zero");
      return;
    }

    setLoading(true);

    try {
      const { error: insertError } = await supabaseUntyped.from('jobs').insert({
        client_id: clientId,
        title: title.trim(),
        description: description.trim() || null,
        location: location.trim(),
        date,
        start_time: startTime,
        end_time: endTime,
        hourly_rate: parseFloat(hourlyRate),
        required_workers: parseInt(requiredWorkers) || 1,
        skills_required: skills,
        status: 'open',
      });

      if (insertError) {
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

  // Get minimum date (today)
  const today = new Date().toISOString().split('T')[0];

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Nova Vaga (Admin)</h2>
        <p className="text-muted-foreground">Cadastre uma vaga em nome de uma empresa</p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Informações da Vaga</CardTitle>
          <CardDescription>Preencha os detalhes da vaga de trabalho</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 text-sm text-red-500 bg-red-50 border border-red-200 rounded-md">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="client">Empresa *</Label>
              {loadingClients ? (
                <p className="text-sm text-muted-foreground">Carregando empresas...</p>
              ) : clients.length === 0 ? (
                <p className="text-sm text-red-500">Nenhuma empresa cadastrada.</p>
              ) : (
                <select
                  id="client"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  disabled={loading}
                >
                  <option value="">Selecione uma empresa</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.company_name} - {client.users?.email}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Título da Vaga *</Label>
              <Input
                id="title"
                placeholder="Ex: Auxiliar de Carga"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <textarea
                id="description"
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Descreva as atividades e requisitos da vaga..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Localização *</Label>
              <Input
                id="location"
                placeholder="Ex: Rua das Flores, 123 - São Paulo, SP"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Data *</Label>
                <Input
                  id="date"
                  type="date"
                  min={today}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="start-time">Início *</Label>
                <Input
                  id="start-time"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-time">Fim *</Label>
                <Input
                  id="end-time"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hourly-rate">Valor por Hora (R$) *</Label>
                <Input
                  id="hourly-rate"
                  type="number"
                  min="1"
                  step="0.50"
                  placeholder="15.00"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="workers">Nº de Trabalhadores *</Label>
                <Input
                  id="workers"
                  type="number"
                  min="1"
                  value={requiredWorkers}
                  onChange={(e) => setRequiredWorkers(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Habilidades Necessárias</Label>
              <p className="text-sm text-muted-foreground">Selecione as habilidades requeridas para esta vaga</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {AVAILABLE_SKILLS.map((skill) => (
                  <Badge
                    key={skill}
                    variant={skills.includes(skill) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => !loading && toggleSkill(skill)}
                  >
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={loading}>
                {loading ? "Criando..." : "Criar Vaga"}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate("/admin")} disabled={loading}>
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
