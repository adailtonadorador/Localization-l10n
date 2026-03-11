import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { toast } from "sonner";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { supabaseUntyped } from "@/lib/supabase";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  Users,
  Calendar,
  Pencil,
  Briefcase,
  CheckCircle2,
  Mail,
  Phone,
  FileText,
  Eye,
  Star,
  Map,
  Save,
  Loader2,
} from "lucide-react";
import { LocationMap } from "@/components/ui/map";

interface Client {
  id: string;
  cnpj: string;
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

  // Edit client state
  const [showEditForm, setShowEditForm] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editCompanyName, setEditCompanyName] = useState("");
  const [editFantasia, setEditFantasia] = useState("");
  const [editCnpj, setEditCnpj] = useState("");
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editFilial, setEditFilial] = useState<string>("");
  const [editLogradouro, setEditLogradouro] = useState("");
  const [editNumero, setEditNumero] = useState("");
  const [editComplemento, setEditComplemento] = useState("");
  const [editBairro, setEditBairro] = useState("");
  const [editCidade, setEditCidade] = useState("");
  const [editUf, setEditUf] = useState("");
  const [editCep, setEditCep] = useState("");

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
      const { data: clientData } = await supabaseUntyped
        .from('clients')
        .select(`*, users (name, email, phone)`)
        .eq('id', id)
        .single();

      setClient(clientData);

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

  function openEditForm() {
    if (!client) return;
    setEditCompanyName(client.company_name || "");
    setEditFantasia(client.fantasia || "");
    setEditCnpj(client.cnpj || "");
    setEditName(client.users?.name || "");
    setEditPhone(client.users?.phone || "");
    setEditFilial(client.filial != null ? String(client.filial) : "");
    setEditLogradouro(client.logradouro || "");
    setEditNumero(client.numero || "");
    setEditComplemento(client.complemento || "");
    setEditBairro(client.bairro || "");
    setEditCidade(client.cidade || "");
    setEditUf(client.uf || "");
    setEditCep(client.cep || "");
    setEditError(null);
    setShowEditForm(true);
  }

  async function handleSaveClient(e: React.FormEvent) {
    e.preventDefault();
    setEditError(null);

    if (!editCompanyName.trim()) {
      setEditError("Razão social é obrigatória");
      return;
    }

    setEditLoading(true);
    try {
      const { error: updateError } = await supabaseUntyped
        .from('clients')
        .update({
          company_name: editCompanyName.trim(),
          fantasia: editFantasia.trim() || null,
          cnpj: editCnpj.trim(),
          filial: editFilial.trim() !== "" ? parseInt(editFilial.trim(), 10) : null,
          logradouro: editLogradouro.trim() || null,
          numero: editNumero.trim() || null,
          complemento: editComplemento.trim() || null,
          bairro: editBairro.trim() || null,
          cidade: editCidade.trim() || null,
          uf: editUf.trim() || null,
          cep: editCep.trim() || null,
        })
        .eq('id', id);

      if (updateError) {
        setEditError("Erro ao salvar. Tente novamente.");
        setEditLoading(false);
        return;
      }

      // Update name and phone in users table
      if (client?.users) {
        await supabaseUntyped
          .from('users')
          .update({
            name: editName.trim() || undefined,
            phone: editPhone.trim() || null,
          })
          .eq('id', id);
      }

      toast.success("Cliente atualizado com sucesso!");
      setShowEditForm(false);
      loadClientData();
    } catch {
      setEditError("Erro ao salvar. Tente novamente.");
    } finally {
      setEditLoading(false);
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
        return <Badge className="bg-blue-500">Aberta</Badge>;
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
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold text-slate-900">
                  {client.fantasia || client.company_name}
                </h2>
                {client.filial != null && (
                  <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 text-sm font-semibold">
                    Filial {client.filial}
                  </span>
                )}
              </div>
              {client.fantasia && (
                <p className="text-sm text-muted-foreground">{client.company_name}</p>
              )}
            </div>
          </div>
        </div>
        <Button onClick={openEditForm} variant="outline" className="gap-2">
          <Pencil className="h-4 w-4" />
          Editar Cliente
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
                <p className="text-sm text-slate-600 font-medium">Total de Diárias</p>
                <p className="text-3xl font-bold">{jobStats.total}</p>
              </div>
              <div className="p-3 bg-slate-100 rounded-xl">
                <Briefcase className="h-6 w-6 text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Abertas</p>
                <p className="text-3xl font-bold">{jobStats.open}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <Clock className="h-6 w-6 text-blue-600" />
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
                Diárias ({jobs.length})
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
                            <p className="font-bold text-lg text-[#4A90E2]">R$ {job.daily_rate}/dia</p>
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

                      {job.job_assignments && job.job_assignments.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-200">
                          <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            Prestadores atribuídos:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {job.job_assignments.map((assignment) => (
                              <div
                                key={assignment.id}
                                className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border"
                              >
                                <Avatar className="h-8 w-8">
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
                  <h3 className="text-lg font-medium text-slate-900 mb-1">Nenhuma diária cadastrada</h3>
                  <p className="text-muted-foreground">As diárias deste cliente aparecerão aqui.</p>
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

              <div className="mt-6 pt-6 border-t">
                <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Map className="h-4 w-4 text-primary" />
                  Localização no Mapa
                </h3>
                <LocationMap
                  address={getClientAddress()}
                  cep={client.cep || undefined}
                  title={client.company_name}
                  showUserLocation={false}
                  height="350px"
                />
              </div>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>

      {/* Edit Client Modal */}
      <Dialog open={showEditForm} onOpenChange={setShowEditForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" />
              Editar Cliente
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveClient} className="space-y-4 pt-2">
            {editError && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
                {editError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label>Razão Social *</Label>
                <Input
                  value={editCompanyName}
                  onChange={(e) => setEditCompanyName(e.target.value)}
                  disabled={editLoading}
                />
              </div>
              <div className="space-y-2">
                <Label>Nome Fantasia</Label>
                <Input
                  value={editFantasia}
                  onChange={(e) => setEditFantasia(e.target.value)}
                  disabled={editLoading}
                />
              </div>
              <div className="space-y-2">
                <Label>CNPJ</Label>
                <Input
                  value={editCnpj}
                  onChange={(e) => setEditCnpj(e.target.value)}
                  disabled={editLoading}
                />
              </div>
              <div className="space-y-2">
                <Label>Filial</Label>
                <Input
                  type="number"
                  min="0"
                  value={editFilial}
                  onChange={(e) => setEditFilial(e.target.value)}
                  placeholder="Nº da filial"
                  disabled={editLoading}
                />
              </div>
              <div className="space-y-2">
                <Label>Nome do Responsável</Label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  disabled={editLoading}
                />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  disabled={editLoading}
                />
              </div>
              <div className="space-y-2">
                <Label>CEP</Label>
                <Input
                  value={editCep}
                  onChange={(e) => setEditCep(e.target.value)}
                  disabled={editLoading}
                />
              </div>
              <div className="space-y-2">
                <Label>Logradouro</Label>
                <Input
                  value={editLogradouro}
                  onChange={(e) => setEditLogradouro(e.target.value)}
                  disabled={editLoading}
                />
              </div>
              <div className="space-y-2">
                <Label>Número</Label>
                <Input
                  value={editNumero}
                  onChange={(e) => setEditNumero(e.target.value)}
                  disabled={editLoading}
                />
              </div>
              <div className="space-y-2">
                <Label>Complemento</Label>
                <Input
                  value={editComplemento}
                  onChange={(e) => setEditComplemento(e.target.value)}
                  disabled={editLoading}
                />
              </div>
              <div className="space-y-2">
                <Label>Bairro</Label>
                <Input
                  value={editBairro}
                  onChange={(e) => setEditBairro(e.target.value)}
                  disabled={editLoading}
                />
              </div>
              <div className="space-y-2">
                <Label>Cidade</Label>
                <Input
                  value={editCidade}
                  onChange={(e) => setEditCidade(e.target.value)}
                  disabled={editLoading}
                />
              </div>
              <div className="space-y-2">
                <Label>UF</Label>
                <Input
                  value={editUf}
                  maxLength={2}
                  onChange={(e) => setEditUf(e.target.value.toUpperCase())}
                  disabled={editLoading}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowEditForm(false)}
                disabled={editLoading}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={editLoading} className="flex-1 gap-2">
                {editLoading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Salvando...</>
                ) : (
                  <><Save className="h-4 w-4" /> Salvar</>
                )}
              </Button>
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
                    <p className="font-medium text-[#4A90E2]">R$ {selectedJob.daily_rate}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Prestadores</p>
                    <p className="font-medium">
                      {selectedJob.job_assignments?.length || 0}/{selectedJob.required_workers}
                    </p>
                  </div>
                </div>

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
