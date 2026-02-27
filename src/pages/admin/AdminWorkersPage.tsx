import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { supabaseUntyped } from "@/lib/supabase";
import { notifyWorkerApproved } from "@/lib/notifications";
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
  Building2,
  ThumbsUp,
  ThumbsDown,
  ChevronDown,
  ChevronUp,
  X,
  Mail,
  Phone,
  MapPin,
  Eye,
  FileText,
  History
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
  approval_status: 'pending' | 'approved' | 'rejected';
  approval_date: string | null;
  approval_notes: string | null;
  rejected_reason: string | null;
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
  const [approvalFilter, setApprovalFilter] = useState<string>("all");

  // Modal states
  const [disableWorkerDialogOpen, setDisableWorkerDialogOpen] = useState(false);
  const [approveWorkerDialogOpen, setApproveWorkerDialogOpen] = useState(false);
  const [rejectWorkerDialogOpen, setRejectWorkerDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [disableReason, setDisableReason] = useState("");
  const [approvalNotes, setApprovalNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Filter expansion state
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Active card filter (for stats card clicks)
  const [activeCardFilter, setActiveCardFilter] = useState<string | null>(null);

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

  function openApproveWorkerDialog(worker: Worker) {
    setSelectedWorker(worker);
    setApprovalNotes("");
    setApproveWorkerDialogOpen(true);
  }

  async function handleApproveWorker() {
    if (!selectedWorker) return;

    setActionLoading(true);
    try {
      await supabaseUntyped
        .from('workers')
        .update({
          approval_status: 'approved',
          approval_date: new Date().toISOString(),
          approval_notes: approvalNotes.trim() || null
        })
        .eq('id', selectedWorker.id);

      // Notifica o trabalhador sobre a aprovação
      notifyWorkerApproved(selectedWorker.id);

      setApproveWorkerDialogOpen(false);
      loadWorkers();
      toast.success('Trabalhador aprovado com sucesso!');
    } catch (error) {
      console.error('Error approving worker:', error);
      toast.error('Erro ao aprovar trabalhador.');
    } finally {
      setActionLoading(false);
    }
  }

  function openRejectWorkerDialog(worker: Worker) {
    setSelectedWorker(worker);
    setRejectionReason("");
    setRejectWorkerDialogOpen(true);
  }

  function openDetailsDialog(worker: Worker) {
    setSelectedWorker(worker);
    setDetailsDialogOpen(true);
  }

  async function handleRejectWorker() {
    if (!selectedWorker || !rejectionReason.trim()) {
      toast.warning('Por favor, informe o motivo da rejeição.');
      return;
    }

    setActionLoading(true);
    try {
      await supabaseUntyped
        .from('workers')
        .update({
          approval_status: 'rejected',
          approval_date: new Date().toISOString(),
          rejected_reason: rejectionReason.trim()
        })
        .eq('id', selectedWorker.id);

      setRejectWorkerDialogOpen(false);
      loadWorkers();
      toast.success('Trabalhador rejeitado.');
    } catch (error) {
      console.error('Error rejecting worker:', error);
      toast.error('Erro ao rejeitar trabalhador.');
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

    const matchesApproval =
      approvalFilter === "all" ||
      (approvalFilter === "pending_approval" && worker.approval_status === 'pending') ||
      (approvalFilter === "approved" && worker.approval_status === 'approved') ||
      (approvalFilter === "rejected" && worker.approval_status === 'rejected');

    return matchesSearch && matchesUf && matchesStatus && matchesApproval;
  });

  // Stats - Consolidated
  const pendingApprovalWorkers = workers.filter(w => w.approval_status === 'pending' && w.is_active !== false).length;
  const pendingDocsInPending = workers.filter(w => w.approval_status === 'pending' && !w.documents_verified && w.is_active !== false).length;

  const activeWorkers = workers.filter(w => w.approval_status === 'approved' && w.is_active !== false).length;
  const verifiedInActive = workers.filter(w => w.approval_status === 'approved' && w.documents_verified && w.is_active !== false).length;

  const rejectedWorkers = workers.filter(w => w.approval_status === 'rejected' && w.is_active !== false).length;

  const disabledWorkers = workers.filter(w => w.is_active === false).length;

  // Count active filters
  const activeFiltersCount = [
    approvalFilter !== 'all' ? 1 : 0,
    statusFilter !== 'all' ? 1 : 0,
    selectedUf !== 'all' ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  // Handle card click to apply filter
  function handleCardClick(cardType: string) {
    // Reset all filters first
    setSearchTerm("");
    setSelectedUf("all");

    if (activeCardFilter === cardType) {
      // If clicking the same card, clear the filter
      setActiveCardFilter(null);
      setApprovalFilter("all");
      setStatusFilter("all");
    } else {
      setActiveCardFilter(cardType);

      switch (cardType) {
        case 'pending':
          setApprovalFilter("pending_approval");
          setStatusFilter("all");
          break;
        case 'active':
          setApprovalFilter("approved");
          setStatusFilter("all");
          break;
        case 'rejected':
          setApprovalFilter("rejected");
          setStatusFilter("all");
          break;
        case 'blocked':
          setApprovalFilter("all");
          setStatusFilter("disabled");
          break;
      }
    }
  }

  // Clear all filters
  function clearAllFilters() {
    setSearchTerm("");
    setSelectedUf("all");
    setStatusFilter("all");
    setApprovalFilter("all");
    setActiveCardFilter(null);
  }

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

      {/* Stats Cards - Consolidated (4 cards) */}
      <div className="grid gap-4 sm:grid-cols-4 mb-6">
        {/* Pendentes de Aprovação */}
        <Card
          className={`border-0 shadow-sm bg-gradient-to-br from-blue-50 to-white cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] ${
            activeCardFilter === 'pending' ? 'ring-2 ring-blue-500 ring-offset-2' : ''
          }`}
          onClick={() => handleCardClick('pending')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Pendentes</p>
                <p className="text-3xl font-bold">{pendingApprovalWorkers}</p>
                {pendingDocsInPending > 0 && (
                  <p className="text-xs text-blue-500 mt-1">{pendingDocsInPending} sem docs</p>
                )}
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ativos (Aprovados) */}
        <Card
          className={`border-0 shadow-sm bg-gradient-to-br from-green-50 to-white cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] ${
            activeCardFilter === 'active' ? 'ring-2 ring-green-500 ring-offset-2' : ''
          }`}
          onClick={() => handleCardClick('active')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Ativos</p>
                <p className="text-3xl font-bold">{activeWorkers}</p>
                <p className="text-xs text-green-500 mt-1">{verifiedInActive} verificados</p>
              </div>
              <div className="p-3 bg-green-100 rounded-xl">
                <ThumbsUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Rejeitados */}
        <Card
          className={`border-0 shadow-sm bg-gradient-to-br from-red-50 to-white cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] ${
            activeCardFilter === 'rejected' ? 'ring-2 ring-red-500 ring-offset-2' : ''
          }`}
          onClick={() => handleCardClick('rejected')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600 font-medium">Rejeitados</p>
                <p className="text-3xl font-bold">{rejectedWorkers}</p>
                <p className="text-xs text-red-400 mt-1">
                  {rejectedWorkers > 0 ? 'Cadastros negados' : 'Nenhum'}
                </p>
              </div>
              <div className="p-3 bg-red-100 rounded-xl">
                <ThumbsDown className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bloqueados */}
        <Card
          className={`border-0 shadow-sm bg-gradient-to-br from-slate-50 to-white cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] ${
            activeCardFilter === 'blocked' ? 'ring-2 ring-slate-500 ring-offset-2' : ''
          }`}
          onClick={() => handleCardClick('blocked')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 font-medium">Bloqueados</p>
                <p className="text-3xl font-bold">{disabledWorkers}</p>
                <p className="text-xs text-slate-400 mt-1">Acesso negado</p>
              </div>
              <div className="p-3 bg-slate-200 rounded-xl">
                <Ban className="h-6 w-6 text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters - Compact with expansion */}
      <Card className="border-0 shadow-sm mb-6">
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Main row: Search + Advanced Filters toggle */}
            <div className="flex flex-col sm:flex-row gap-3">
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className="gap-2"
                >
                  <Filter className="h-4 w-4" />
                  Filtros
                  {activeFiltersCount > 0 && (
                    <Badge className="bg-blue-500 text-white h-5 w-5 p-0 flex items-center justify-center text-xs">
                      {activeFiltersCount}
                    </Badge>
                  )}
                  {showAdvancedFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
                {(activeFiltersCount > 0 || activeCardFilter || searchTerm) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllFilters}
                    className="gap-1 text-slate-500 hover:text-slate-700"
                  >
                    <X className="h-4 w-4" />
                    Limpar
                  </Button>
                )}
              </div>
            </div>

            {/* Active filter indicator */}
            {activeCardFilter && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Filtro ativo:</span>
                <Badge variant="secondary" className="gap-1">
                  {activeCardFilter === 'pending' && 'Pendentes de aprovação'}
                  {activeCardFilter === 'active' && 'Trabalhadores ativos'}
                  {activeCardFilter === 'rejected' && 'Rejeitados'}
                  {activeCardFilter === 'blocked' && 'Bloqueados'}
                  <button onClick={() => { setActiveCardFilter(null); clearAllFilters(); }} className="ml-1 hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              </div>
            )}

            {/* Advanced filters - expandable */}
            {showAdvancedFilters && (
              <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t">
                <Select value={approvalFilter} onValueChange={(v) => { setApprovalFilter(v); setActiveCardFilter(null); }}>
                  <SelectTrigger className="w-full sm:w-[170px] bg-white">
                    <SelectValue placeholder="Aprovação" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas aprovações</SelectItem>
                    <SelectItem value="pending_approval">Aguardando</SelectItem>
                    <SelectItem value="approved">Aprovados</SelectItem>
                    <SelectItem value="rejected">Rejeitados</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setActiveCardFilter(null); }}>
                  <SelectTrigger className="w-full sm:w-[150px] bg-white">
                    <SelectValue placeholder="Documentos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos docs</SelectItem>
                    <SelectItem value="verified">Verificados</SelectItem>
                    <SelectItem value="pending">Pendentes</SelectItem>
                    <SelectItem value="disabled">Bloqueados</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={selectedUf} onValueChange={setSelectedUf}>
                  <SelectTrigger className="w-full sm:w-[150px] bg-white">
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
            )}
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
                      <div
                        className="flex items-center gap-4 cursor-pointer group/worker"
                        onClick={() => openDetailsDialog(worker)}
                      >
                        <Avatar className={`h-12 w-12 ring-2 ring-white shadow ${worker.is_active === false ? 'opacity-60' : ''} group-hover/worker:ring-blue-300 transition-all`}>
                          <AvatarImage src={worker.users?.avatar_url || ''} />
                          <AvatarFallback className={`${worker.is_active === false ? 'bg-slate-400' : 'bg-blue-500'} text-white font-medium`}>
                            {worker.users?.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '??'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h4 className={`font-semibold ${worker.is_active === false ? 'text-slate-500' : 'text-slate-900'} group-hover/worker:text-blue-600 transition-colors`}>
                              {worker.users?.name}
                            </h4>
                            <Eye className="h-4 w-4 text-slate-400 opacity-0 group-hover/worker:opacity-100 transition-opacity" />

                            {/* Primary Badge: Approval Status OR Blocked */}
                            {worker.is_active === false ? (
                              <Badge variant="outline" className="border-slate-400 text-slate-600 bg-slate-100 gap-1">
                                <Ban className="h-3 w-3" />
                                Bloqueado
                              </Badge>
                            ) : worker.approval_status === 'pending' ? (
                              <Badge variant="outline" className="border-blue-300 text-blue-700 bg-blue-50 gap-1">
                                <Clock className="h-3 w-3" />
                                Aguardando
                              </Badge>
                            ) : worker.approval_status === 'rejected' ? (
                              <Badge variant="destructive" className="gap-1">
                                <ThumbsDown className="h-3 w-3" />
                                Rejeitado
                              </Badge>
                            ) : null}

                            {/* Secondary Badge: Docs status (only if approved and active) */}
                            {worker.approval_status === 'approved' && worker.is_active !== false && !worker.documents_verified && (
                              <Badge variant="outline" className="border-amber-300 text-amber-700 bg-amber-50 gap-1">
                                <Shield className="h-3 w-3" />
                                Docs pendentes
                              </Badge>
                            )}

                            {/* Active Jobs - as text, not badge */}
                            {activeJobs.length > 0 && (
                              <span className="text-xs text-blue-600 flex items-center gap-1">
                                <Briefcase className="h-3 w-3" />
                                {activeJobs.length} vaga{activeJobs.length > 1 ? 's' : ''}
                              </span>
                            )}
                          </div>

                          {/* Contact info in single line */}
                          <p className="text-sm text-muted-foreground">
                            {worker.users?.email} • CPF: {formatCpf(worker.cpf)}
                          </p>

                          {/* Rating and jobs as inline text */}
                          <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                            <span className="flex items-center gap-1">
                              <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                              {worker.rating?.toFixed(1) || '0.0'}
                            </span>
                            <span>•</span>
                            <span>{worker.total_jobs} trabalhos</span>
                            <span>•</span>
                            <span>{formatDateTime(worker.created_at)}</span>
                            {worker.documents_verified && worker.approval_status === 'approved' && worker.is_active !== false && (
                              <>
                                <span>•</span>
                                <span className="text-blue-600 flex items-center gap-1">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Verificado
                                </span>
                              </>
                            )}
                          </p>

                          {/* Rejection/Block reason as tooltip-like compact display */}
                          {worker.is_active === false && worker.deactivation_reason && (
                            <p className="text-xs text-slate-500 mt-1 italic truncate max-w-md" title={worker.deactivation_reason}>
                              Bloqueio: {worker.deactivation_reason}
                            </p>
                          )}
                          {worker.approval_status === 'rejected' && worker.rejected_reason && (
                            <p className="text-xs text-red-500 mt-1 italic truncate max-w-md" title={worker.rejected_reason}>
                              Rejeição: {worker.rejected_reason}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col gap-2">
                          {/* Approval Actions */}
                          {worker.approval_status === 'pending' && worker.is_active !== false && (
                            <>
                              <Button
                                size="sm"
                                className="bg-green-500 hover:bg-green-600 gap-1"
                                onClick={() => openApproveWorkerDialog(worker)}
                                disabled={actionLoading}
                              >
                                <ThumbsUp className="h-4 w-4" />
                                Aprovar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-300"
                                onClick={() => openRejectWorkerDialog(worker)}
                                disabled={actionLoading}
                              >
                                <ThumbsDown className="h-4 w-4" />
                                Rejeitar
                              </Button>
                            </>
                          )}

                          {/* Document Verification */}
                          {!worker.documents_verified && worker.is_active !== false && worker.approval_status !== 'pending' && (
                            <Button
                              size="sm"
                              className="bg-blue-500 hover:bg-blue-600 gap-1"
                              onClick={() => handleVerifyWorker(worker.id)}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                              Verificar Docs
                            </Button>
                          )}

                          {/* Enable/Disable Actions */}
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
                          ) : worker.approval_status !== 'pending' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1 text-gray-600 hover:text-gray-700 hover:bg-gray-50 border-gray-300"
                              onClick={() => openDisableWorkerDialog(worker)}
                            >
                              <Ban className="h-4 w-4" />
                              Bloquear
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
                                      : 'bg-blue-500'
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

      {/* Approve Worker Dialog */}
      <Dialog open={approveWorkerDialogOpen} onOpenChange={setApproveWorkerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <ThumbsUp className="h-5 w-5" />
              Aprovar Trabalhador
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-700">
                Você está aprovando <strong>{selectedWorker?.users?.name}</strong> para acessar a plataforma.
                Após a aprovação, o trabalhador poderá visualizar e se candidatar a vagas de trabalho.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="approval-notes">Notas (opcional)</Label>
              <Textarea
                id="approval-notes"
                placeholder="Adicione notas sobre a aprovação, se necessário..."
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveWorkerDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-green-500 hover:bg-green-600"
              onClick={handleApproveWorker}
              disabled={actionLoading}
            >
              {actionLoading ? 'Aprovando...' : 'Confirmar Aprovação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Worker Dialog */}
      <Dialog open={rejectWorkerDialogOpen} onOpenChange={setRejectWorkerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <ThumbsDown className="h-5 w-5" />
              Rejeitar Trabalhador
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-700">
                Você está rejeitando o cadastro de <strong>{selectedWorker?.users?.name}</strong>.
                O trabalhador não conseguirá acessar vagas até que seja aprovado.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">Motivo da rejeição *</Label>
              <Textarea
                id="rejection-reason"
                placeholder="Descreva o motivo pelo qual o trabalhador está sendo rejeitado..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectWorkerDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectWorker}
              disabled={actionLoading || !rejectionReason.trim()}
            >
              {actionLoading ? 'Rejeitando...' : 'Confirmar Rejeição'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disable Worker Dialog */}
      <Dialog open={disableWorkerDialogOpen} onOpenChange={setDisableWorkerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Ban className="h-5 w-5" />
              Bloquear Trabalhador
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-700">
                Você está prestes a bloquear o acesso de <strong>{selectedWorker?.users?.name}</strong> à plataforma.
                O trabalhador não conseguirá fazer login até que seja desbloqueado novamente.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="disable-reason">Motivo do bloqueio *</Label>
              <Textarea
                id="disable-reason"
                placeholder="Descreva o motivo pelo qual o trabalhador está sendo bloqueado..."
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
              {actionLoading ? 'Bloqueando...' : 'Confirmar Bloqueio'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Worker Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedWorker && (
            <>
              <DialogHeader>
                <div className="flex items-start gap-4">
                  <Avatar className={`h-16 w-16 ring-2 ${selectedWorker.is_active === false ? 'ring-red-200' : 'ring-blue-200'} shadow-lg`}>
                    <AvatarImage src={selectedWorker.users?.avatar_url || ''} />
                    <AvatarFallback className={`${selectedWorker.is_active === false ? 'bg-slate-400' : 'bg-blue-500'} text-white text-xl font-medium`}>
                      {selectedWorker.users?.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '??'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <DialogTitle className="text-xl">{selectedWorker.users?.name}</DialogTitle>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {/* Status badges */}
                      {selectedWorker.is_active === false ? (
                        <Badge variant="outline" className="border-slate-400 text-slate-600 bg-slate-100 gap-1">
                          <Ban className="h-3 w-3" />
                          Bloqueado
                        </Badge>
                      ) : selectedWorker.approval_status === 'pending' ? (
                        <Badge variant="outline" className="border-blue-300 text-blue-700 bg-blue-50 gap-1">
                          <Clock className="h-3 w-3" />
                          Aguardando Aprovação
                        </Badge>
                      ) : selectedWorker.approval_status === 'rejected' ? (
                        <Badge variant="destructive" className="gap-1">
                          <ThumbsDown className="h-3 w-3" />
                          Rejeitado
                        </Badge>
                      ) : (
                        <Badge className="bg-green-500 gap-1">
                          <ThumbsUp className="h-3 w-3" />
                          Aprovado
                        </Badge>
                      )}
                      {selectedWorker.documents_verified && selectedWorker.is_active !== false && (
                        <Badge variant="outline" className="border-blue-300 text-blue-700 bg-blue-50 gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Verificado
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* Contact Info */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      <Mail className="h-3 w-3" /> Email
                    </p>
                    <p className="font-medium text-sm">{selectedWorker.users?.email}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      <Phone className="h-3 w-3" /> Telefone
                    </p>
                    <p className="font-medium text-sm">{selectedWorker.users?.phone || 'Não informado'}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      <FileText className="h-3 w-3" /> CPF
                    </p>
                    <p className="font-medium text-sm">{formatCpf(selectedWorker.cpf)}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> Estado
                    </p>
                    <p className="font-medium text-sm">{selectedWorker.uf || 'Não informado'}</p>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid gap-4 grid-cols-3">
                  <div className="p-4 bg-amber-50 rounded-lg text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
                      <span className="text-2xl font-bold text-amber-600">{selectedWorker.rating?.toFixed(1) || '0.0'}</span>
                    </div>
                    <p className="text-xs text-amber-600">Avaliação</p>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg text-center">
                    <p className="text-2xl font-bold text-blue-600">{selectedWorker.total_jobs}</p>
                    <p className="text-xs text-blue-600">Trabalhos</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg text-center">
                    <p className="text-2xl font-bold text-slate-600">
                      {selectedWorker.job_assignments?.filter(a => ['pending', 'confirmed'].includes(a.status)).length || 0}
                    </p>
                    <p className="text-xs text-slate-600">Vagas Ativas</p>
                  </div>
                </div>

                {/* Dates */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> Cadastro
                    </p>
                    <p className="font-medium text-sm">{formatDateTime(selectedWorker.created_at)}</p>
                  </div>
                  {selectedWorker.approval_date && (
                    <div className="p-4 bg-slate-50 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {selectedWorker.approval_status === 'approved' ? 'Aprovado em' : 'Rejeitado em'}
                      </p>
                      <p className="font-medium text-sm">{formatDateTime(selectedWorker.approval_date)}</p>
                    </div>
                  )}
                </div>

                {/* Notes/Reasons */}
                {selectedWorker.approval_notes && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-xs text-green-600 mb-1 font-medium">Notas de aprovação:</p>
                    <p className="text-sm text-green-700">{selectedWorker.approval_notes}</p>
                  </div>
                )}

                {selectedWorker.rejected_reason && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-xs text-red-600 mb-1 font-medium">Motivo da rejeição:</p>
                    <p className="text-sm text-red-700">{selectedWorker.rejected_reason}</p>
                  </div>
                )}

                {selectedWorker.is_active === false && selectedWorker.deactivation_reason && (
                  <div className="p-4 bg-slate-100 border border-slate-300 rounded-lg">
                    <p className="text-xs text-slate-600 mb-1 font-medium">Motivo do bloqueio:</p>
                    <p className="text-sm text-slate-700">{selectedWorker.deactivation_reason}</p>
                    {selectedWorker.deactivated_at && (
                      <p className="text-xs text-slate-500 mt-2">
                        Bloqueado em: {formatDateTime(selectedWorker.deactivated_at)}
                      </p>
                    )}
                  </div>
                )}

                {/* Job History */}
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <History className="h-4 w-4" />
                    Histórico de Vagas ({selectedWorker.job_assignments?.length || 0})
                  </h4>

                  {selectedWorker.job_assignments && selectedWorker.job_assignments.length > 0 ? (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {selectedWorker.job_assignments.map((assignment) => (
                        <div
                          key={assignment.id}
                          className={`flex items-center justify-between p-3 rounded-lg border ${
                            assignment.status === 'withdrawn'
                              ? 'bg-red-50 border-red-200'
                              : assignment.status === 'completed'
                              ? 'bg-green-50 border-green-200'
                              : ['pending', 'confirmed'].includes(assignment.status)
                              ? 'bg-blue-50 border-blue-200'
                              : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              assignment.status === 'withdrawn'
                                ? 'bg-red-100'
                                : assignment.status === 'completed'
                                ? 'bg-green-100'
                                : 'bg-blue-100'
                            }`}>
                              <Building2 className={`h-5 w-5 ${
                                assignment.status === 'withdrawn'
                                  ? 'text-red-600'
                                  : assignment.status === 'completed'
                                  ? 'text-green-600'
                                  : 'text-blue-600'
                              }`} />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{assignment.jobs?.title}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {assignment.jobs?.clients?.company_name}
                              </p>
                              <p className="text-xs text-muted-foreground flex items-center gap-2">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {new Date(assignment.jobs?.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                                </span>
                                <span>•</span>
                                <span>R$ {assignment.jobs?.daily_rate}</span>
                              </p>
                            </div>
                          </div>
                          <Badge
                            className={`text-xs flex-shrink-0 ${
                              assignment.status === 'completed' ? 'bg-green-500' :
                              assignment.status === 'confirmed' ? 'bg-blue-500' :
                              assignment.status === 'pending' ? 'bg-amber-500' :
                              assignment.status === 'withdrawn' ? 'bg-red-500' :
                              'bg-slate-500'
                            }`}
                          >
                            {assignment.status === 'pending' && 'Pendente'}
                            {assignment.status === 'confirmed' && 'Confirmado'}
                            {assignment.status === 'completed' && 'Concluído'}
                            {assignment.status === 'withdrawn' && 'Desistiu'}
                            {assignment.status === 'no_show' && 'Faltou'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 bg-slate-50 rounded-lg">
                      <Briefcase className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Nenhuma vaga no histórico</p>
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter className="mt-6">
                <Button variant="outline" onClick={() => setDetailsDialogOpen(false)}>
                  Fechar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
