import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { supabaseUntyped } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  Search,
  Calendar,
  Clock,
  User,
  Building,
  MapPin,
  Eye,
  ArrowLeft,
  Filter,
  FileText
} from "lucide-react";

interface Withdrawal {
  id: string;
  withdrawal_reason: string;
  withdrawn_at: string;
  worker_id: string;
  job_id: string;
  workers: {
    id: string;
    users: {
      name: string;
      email: string;
      phone: string | null;
    };
  };
  jobs: {
    id: string;
    title: string;
    date: string;
    start_time: string;
    end_time: string;
    location: string;
    clients: {
      company_name: string;
    };
  };
}

export function AdminWithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPeriod, setFilterPeriod] = useState<string>("all");
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    loadWithdrawals();
  }, []);

  async function loadWithdrawals() {
    setLoading(true);
    try {
      const { data, error } = await supabaseUntyped
        .from('withdrawal_history')
        .select(`
          id,
          withdrawal_reason,
          withdrawn_at,
          worker_id,
          job_id,
          workers (
            id,
            users (
              name,
              email,
              phone
            )
          ),
          jobs (
            id,
            title,
            date,
            start_time,
            end_time,
            location,
            clients (
              company_name
            )
          )
        `)
        .order('withdrawn_at', { ascending: false });

      if (error) throw error;
      setWithdrawals(data || []);
    } catch (error) {
      console.error('Error loading withdrawals:', error);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  function formatDateTime(dateStr: string) {
    return new Date(dateStr).toLocaleString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function formatTime(timeStr: string) {
    return timeStr.slice(0, 5);
  }

  function getFilteredWithdrawals() {
    let filtered = withdrawals;

    // Filter by period
    if (filterPeriod !== "all") {
      const now = new Date();
      let startDate: Date;

      switch (filterPeriod) {
        case "today":
          startDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case "week":
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case "month":
          startDate = new Date(now.setMonth(now.getMonth() - 1));
          break;
        default:
          startDate = new Date(0);
      }

      filtered = filtered.filter(w => new Date(w.withdrawn_at) >= startDate);
    }

    // Filter by search term
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(w =>
        w.workers?.users?.name?.toLowerCase().includes(search) ||
        w.jobs?.title?.toLowerCase().includes(search) ||
        w.jobs?.clients?.company_name?.toLowerCase().includes(search) ||
        w.withdrawal_reason?.toLowerCase().includes(search)
      );
    }

    return filtered;
  }

  function openDetails(withdrawal: Withdrawal) {
    setSelectedWithdrawal(withdrawal);
    setDetailsOpen(true);
  }

  const filteredWithdrawals = getFilteredWithdrawals();

  if (loading) {
    return (
      <DashboardLayout>
        <div className="mb-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-2">
          <Link to="/admin">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-100 rounded-lg">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Desistências</h2>
            <p className="text-muted-foreground">
              Histórico de trabalhadores que desistiram de diárias
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-red-50 to-white">
          <CardHeader className="pb-2">
            <CardDescription className="text-red-600 font-medium">Total de Desistências</CardDescription>
            <CardTitle className="text-3xl font-bold">{withdrawals.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-white">
          <CardHeader className="pb-2">
            <CardDescription className="text-amber-600 font-medium">Esta Semana</CardDescription>
            <CardTitle className="text-3xl font-bold">
              {withdrawals.filter(w => {
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                return new Date(w.withdrawn_at) >= weekAgo;
              }).length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-0 shadow-sm bg-gradient-to-br from-orange-50 to-white">
          <CardHeader className="pb-2">
            <CardDescription className="text-orange-600 font-medium">Hoje</CardDescription>
            <CardTitle className="text-3xl font-bold">
              {withdrawals.filter(w => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                return new Date(w.withdrawn_at) >= today;
              }).length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por trabalhador, vaga ou empresa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterPeriod} onValueChange={setFilterPeriod}>
          <SelectTrigger className="w-full sm:w-48 bg-white">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Período" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os períodos</SelectItem>
            <SelectItem value="today">Hoje</SelectItem>
            <SelectItem value="week">Última semana</SelectItem>
            <SelectItem value="month">Último mês</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground mb-4">
        {filteredWithdrawals.length} desistência(s) encontrada(s)
      </p>

      {/* Withdrawals List */}
      {filteredWithdrawals.length > 0 ? (
        <div className="space-y-4">
          {filteredWithdrawals.map((withdrawal) => (
            <Card key={withdrawal.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    {/* Worker info */}
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                        <User className="h-5 w-5 text-red-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">
                          {withdrawal.workers?.users?.name || 'Trabalhador'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {withdrawal.workers?.users?.email}
                        </p>
                      </div>
                    </div>

                    {/* Job info */}
                    <div className="pl-13 space-y-1">
                      <p className="font-medium text-slate-700">
                        {withdrawal.jobs?.title}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Building className="h-3.5 w-3.5" />
                          {withdrawal.jobs?.clients?.company_name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatDate(withdrawal.jobs?.date)}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {withdrawal.jobs?.location}
                        </span>
                      </div>
                    </div>

                    {/* Reason preview */}
                    <div className="pl-13">
                      <div className="bg-red-50 border border-red-100 rounded-lg p-3">
                        <p className="text-sm text-red-800 flex items-start gap-2">
                          <FileText className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <span className="line-clamp-2">{withdrawal.withdrawal_reason}</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Right side */}
                  <div className="flex flex-col items-end gap-3">
                    <Badge variant="destructive" className="gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDateTime(withdrawal.withdrawn_at)}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDetails(withdrawal)}
                      className="gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      Ver Detalhes
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">Nenhuma desistência encontrada</h3>
            <p className="text-muted-foreground">
              {searchTerm || filterPeriod !== "all"
                ? "Tente ajustar os filtros de busca."
                : "Ainda não há registros de desistências."}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Detalhes da Desistência
            </DialogTitle>
          </DialogHeader>

          {selectedWithdrawal && (
            <div className="space-y-6">
              {/* Worker */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Trabalhador</h4>
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="font-semibold">{selectedWithdrawal.workers?.users?.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedWithdrawal.workers?.users?.email}</p>
                  {selectedWithdrawal.workers?.users?.phone && (
                    <p className="text-sm text-muted-foreground">{selectedWithdrawal.workers?.users?.phone}</p>
                  )}
                </div>
              </div>

              {/* Job */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Vaga</h4>
                <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                  <p className="font-semibold">{selectedWithdrawal.jobs?.title}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Building className="h-4 w-4" />
                    {selectedWithdrawal.jobs?.clients?.company_name}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {formatDate(selectedWithdrawal.jobs?.date)}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {formatTime(selectedWithdrawal.jobs?.start_time)} - {formatTime(selectedWithdrawal.jobs?.end_time)}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {selectedWithdrawal.jobs?.location}
                  </div>
                </div>
              </div>

              {/* Withdrawal info */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Justificativa</h4>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800">{selectedWithdrawal.withdrawal_reason}</p>
                  <p className="text-xs text-red-600 mt-3 pt-3 border-t border-red-200">
                    Registrado em {formatDateTime(selectedWithdrawal.withdrawn_at)}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setDetailsOpen(false)}>
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
