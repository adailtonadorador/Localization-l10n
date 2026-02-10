import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { supabaseUntyped } from "@/lib/supabase";
import { BRAZILIAN_STATES } from "@/lib/brazil-locations";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Users,
  Search,
  Star,
  Shield,
  Clock,
  CheckCircle2,
  Filter,
  Ban,
  UserCheck,
  Briefcase,
  Calendar,
  Building2
} from "lucide-react";

interface JobAssignment {
  id: string;
  job_id: string;
  status: string;
  jobs: {
    id: string;
    title: string;
    date: string;
    dates: string[] | null;
    start_time: string;
    end_time: string;
    daily_rate: number;
    status: string;
    location: string;
    clients: {
      company_name: string;
    };
  };
}

interface Worker {
  id: string;
  cpf: string;
  rating: number;
  total_jobs: number;
  documents_verified: boolean;
  is_active: boolean;
  deactivation_reason: string | null;
  deactivated_at: string | null;
  created_at: string;
  uf: string | null;
  users: {
    name: string;
    email: string;
    phone: string;
    avatar_url: string | null;
  };
  job_assignments: JobAssignment[];
}

export function AdminWorkersPage() {
  const location = useLocation();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUf, setSelectedUf] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Modal states
  const [disableWorkerDialogOpen, setDisableWorkerDialogOpen] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [disableReason, setDisableReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadWorkers();
  }, [location.pathname]);

  async function loadWorkers() {
    setLoading(true);
    try {
      const { data } = await supabaseUntyped
        .from('workers')
        .select(`
          *,
          users (name, email, phone, avatar_url),
          job_assignments (
            id,
            job_id,
            status,
            jobs (
              id,
              title,
              date,
              dates,
              start_time,
              end_time,
              daily_rate,
              status,
              location,
              clients (company_name)
            )
          )
        `)
        .order('created_at', { ascending: false });

      setWorkers(data || []);
    } catch (error) {
      console.error('Error loading workers:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyWorker(workerId: string) {
    try {
      await supabaseUntyped
        .from('workers')
        .update({ documents_verified: true })
        .eq('id', workerId);

      loadWorkers();
      toast.success('Trabalhador verificado com sucesso!');
    } catch (error) {
      console.error('Error verifying worker:', error);
      toast.error('Erro ao verificar trabalhador.');
    }
  }

  function openDisableWorkerDialog(worker: Worker) {
    setSelectedWorker(worker);
    setDisableReason("");
    setDisableWorkerDialogOpen(true);
  }

  async function handleDisableWorker() {
    if (!selectedWorker || !disableReason.trim()) {
      toast.warning('Por favor, informe o motivo da desabilitação.');
      return;
    }

    setActionLoading(true);
    try {
      await supabaseUntyped
        .from('workers')
        .update({
          is_active: false,
          deactivation_reason: disableReason.trim(),
          deactivated_at: new Date().toISOString()
        })
        .eq('id', selectedWorker.id);

      setDisableWorkerDialogOpen(false);
      loadWorkers();
      toast.success('Trabalhador desabilitado com sucesso!');
    } catch (error) {
      console.error('Error disabling worker:', error);
      toast.error('Erro ao desabilitar trabalhador.');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleEnableWorker(workerId: string) {
    if (!confirm('Tem certeza que deseja habilitar este trabalhador?')) {
      return;
    }

    setActionLoading(true);
    try {
      await supabaseUntyped
        .from('workers')
        .update({
          is_active: true,
          deactivation_reason: null,
          deactivated_at: null
        })
        .eq('id', workerId);

      loadWorkers();
      toast.success('Trabalhador habilitado com sucesso!');
    } catch (error) {
      console.error('Error enabling worker:', error);
      toast.error('Erro ao habilitar trabalhador.');
    } finally {
      setActionLoading(false);
    }
  }

  function formatCpf(cpf: string) {
    if (!cpf) return '';
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }

  function formatDateTime(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  }

  // Filters
  const filteredWorkers = workers.filter(worker => {
    const matchesSearch =
      worker.users?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      worker.users?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      worker.cpf?.includes(searchTerm.replace(/\D/g, ''));

    const matchesUf = selectedUf === "all" || worker.uf === selectedUf;

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "verified" && worker.documents_verified && worker.is_active !== false) ||
      (statusFilter === "pending" && !worker.documents_verified && worker.is_active !== false) ||
      (statusFilter === "disabled" && worker.is_active === false);

    return matchesSearch && matchesUf && matchesStatus;
  });

  // Stats
  const totalWorkers = workers.length;
  const verifiedWorkers = workers.filter(w => w.documents_verified && w.is_active !== false).length;
  const pendingWorkers = workers.filter(w => !w.documents_verified && w.is_active !== false).length;
  const disabledWorkers = workers.filter(w => w.is_active === false).length;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
            <p className="text-sm text-muted-foreground">Carregando trabalhadores...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Trabalhadores</h2>
        <p className="text-muted-foreground">Gerencie os trabalhadores cadastrados</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-4 mb-6">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-slate-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 font-medium">Total</p>
                <p className="text-3xl font-bold">{totalWorkers}</p>
              </div>
              <div className="p-3 bg-slate-100 rounded-xl">
                <Users className="h-6 w-6 text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-emerald-600 font-medium">Verificados</p>
                <p className="text-3xl font-bold">{verifiedWorkers}</p>
              </div>
              <div className="p-3 bg-emerald-100 rounded-xl">
                <Shield className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-600 font-medium">Pendentes</p>
                <p className="text-3xl font-bold">{pendingWorkers}</p>
              </div>
              <div className="p-3 bg-amber-100 rounded-xl">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-red-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600 font-medium">Bloqueados</p>
                <p className="text-3xl font-bold">{disabledWorkers}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-xl">
                <Ban className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, email ou CPF..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px] bg-white">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="verified">Verificados</SelectItem>
                  <SelectItem value="pending">Pendentes</SelectItem>
                  <SelectItem value="disabled">Bloqueados</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedUf} onValueChange={setSelectedUf}>
                <SelectTrigger className="w-[150px] bg-white">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos estados</SelectItem>
                  {BRAZILIAN_STATES.map((state) => (
                    <SelectItem key={state.uf} value={state.uf}>
                      {state.uf}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Workers List */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-6">
          <div className="space-y-3">
            {filteredWorkers.length > 0 ? (
              filteredWorkers.map((worker) => {
                // Get active job assignments (not cancelled, not completed)
                const activeJobs = worker.job_assignments?.filter(
                  (a) => a.jobs && ['open', 'assigned', 'in_progress'].includes(a.jobs.status)
                ) || [];

                return (
                  <div
                    key={worker.id}
                    className={`p-4 rounded-xl transition-colors ${
                      worker.is_active === false
                        ? 'bg-red-50 border-2 border-red-200'
                        : 'bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Avatar className={`h-12 w-12 ring-2 ring-white shadow ${worker.is_active === false ? 'opacity-60' : ''}`}>
                          <AvatarImage src={worker.users?.avatar_url || ''} />
                          <AvatarFallback className={`${worker.is_active === false ? 'bg-slate-400' : 'bg-emerald-500'} text-white font-medium`}>
                            {worker.users?.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '??'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h4 className={`font-semibold ${worker.is_active === false ? 'text-slate-500' : 'text-slate-900'}`}>
                              {worker.users?.name}
                            </h4>
                            {worker.is_active === false ? (
                              <Badge variant="destructive" className="gap-1">
                                <Ban className="h-3 w-3" />
                                Bloqueado
                              </Badge>
                            ) : (
                              <Badge
                                variant={worker.documents_verified ? "default" : "outline"}
                                className={worker.documents_verified ? "bg-emerald-500" : "border-amber-300 text-amber-700 bg-amber-50"}
                              >
                                {worker.documents_verified ? (
                                  <>
                                    <Shield className="h-3 w-3 mr-1" />
                                    Verificado
                                  </>
                                ) : (
                                  <>
                                    <Clock className="h-3 w-3 mr-1" />
                                    Pendente
                                  </>
                                )}
                              </Badge>
                            )}
                            {activeJobs.length > 0 && (
                              <Badge className="bg-blue-500 gap-1">
                                <Briefcase className="h-3 w-3" />
                                {activeJobs.length} vaga{activeJobs.length > 1 ? 's' : ''} ativa{activeJobs.length > 1 ? 's' : ''}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{worker.users?.email}</p>
                          <p className="text-sm text-muted-foreground">CPF: {formatCpf(worker.cpf)}</p>
                          {worker.is_active === false && worker.deactivation_reason && (
                            <p className="text-xs text-red-600 mt-1 bg-red-100 px-2 py-1 rounded">
                              <strong>Motivo:</strong> {worker.deactivation_reason}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right text-sm">
                          <p className="flex items-center justify-end gap-1 mb-1">
                            <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                            <span className="font-semibold">{worker.rating?.toFixed(1) || '0.0'}</span>
                          </p>
                          <p className="text-muted-foreground">{worker.total_jobs} trabalhos</p>
                          <p className="text-xs text-slate-400">
                            {formatDateTime(worker.created_at)}
                          </p>
                        </div>
                        <div className="flex flex-col gap-2">
                          {!worker.documents_verified && worker.is_active !== false && (
                            <Button
                              size="sm"
                              className="bg-emerald-500 hover:bg-emerald-600 gap-1"
                              onClick={() => handleVerifyWorker(worker.id)}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                              Verificar
                            </Button>
                          )}
                          {worker.is_active === false ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1 text-green-600 hover:text-green-700 hover:bg-green-50 border-green-300"
                              onClick={() => handleEnableWorker(worker.id)}
                              disabled={actionLoading}
                            >
                              <UserCheck className="h-4 w-4" />
                              Habilitar
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-300"
                              onClick={() => openDisableWorkerDialog(worker)}
                            >
                              <Ban className="h-4 w-4" />
                              Desabilitar
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Active Jobs */}
                    {activeJobs.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-200">
                        <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                          <Briefcase className="h-3 w-3" />
                          Vagas atribuídas:
                        </p>
                        <div className="space-y-2">
                          {activeJobs.map((assignment) => (
                            <div
                              key={assignment.id}
                              className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                                  <Building2 className="h-4 w-4 text-blue-600" />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium text-sm truncate">
                                    {assignment.jobs?.title}
                                  </p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {assignment.jobs?.clients?.company_name}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground flex-shrink-0">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {new Date(assignment.jobs?.date + 'T00:00:00').toLocaleDateString('pt-BR', {
                                    day: '2-digit',
                                    month: 'short'
                                  })}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {assignment.jobs?.start_time?.slice(0, 5)}
                                </span>
                                <Badge
                                  className={`text-xs ${
                                    assignment.jobs?.status === 'in_progress'
                                      ? 'bg-blue-500'
                                      : assignment.jobs?.status === 'assigned'
                                      ? 'bg-purple-500'
                                      : 'bg-emerald-500'
                                  }`}
                                >
                                  {assignment.jobs?.status === 'in_progress'
                                    ? 'Em andamento'
                                    : assignment.jobs?.status === 'assigned'
                                    ? 'Atribuída'
                                    : 'Aberta'}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-medium text-slate-900 mb-1">Nenhum trabalhador encontrado</h3>
                <p className="text-muted-foreground">
                  {searchTerm || selectedUf !== "all" || statusFilter !== "all"
                    ? "Tente ajustar os filtros de busca."
                    : "Os trabalhadores aparecerão aqui quando se cadastrarem."}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Disable Worker Dialog */}
      <Dialog open={disableWorkerDialogOpen} onOpenChange={setDisableWorkerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Ban className="h-5 w-5" />
              Desabilitar Trabalhador
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-700">
                Você está prestes a desabilitar o acesso de <strong>{selectedWorker?.users?.name}</strong> à plataforma.
                O trabalhador não conseguirá fazer login até que seja habilitado novamente.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="disable-reason">Motivo da desabilitação *</Label>
              <Textarea
                id="disable-reason"
                placeholder="Descreva o motivo pelo qual o trabalhador está sendo desabilitado..."
                value={disableReason}
                onChange={(e) => setDisableReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisableWorkerDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDisableWorker}
              disabled={actionLoading || !disableReason.trim()}
            >
              {actionLoading ? 'Desabilitando...' : 'Confirmar Desabilitação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
