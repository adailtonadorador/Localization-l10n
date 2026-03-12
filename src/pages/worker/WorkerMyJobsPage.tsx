import { useEffect, useState } from "react";
import { toast } from "sonner";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabaseUntyped } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { PhotoCaptureDialog } from "@/components/PhotoCaptureDialog";
import { WithdrawalDialog } from "@/components/WithdrawalDialog";
import { notifyJobAvailableAfterWithdrawal, notifyAdminEarlyCheckout } from "@/lib/notifications";
import {
  Clock, MapPin, CheckCircle, Calendar, Building, Play, LogOut,
  Briefcase, ArrowRight, XCircle, ChevronDown, ChevronUp, DollarSign,
  AlertCircle, Eye, ShieldAlert
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getLocalToday } from "@/lib/date-utils";

interface WorkRecord {
  id: string;
  job_id: string;
  work_date: string;
  check_in: string | null;
  check_out: string | null;
  check_in_photo: string | null;
  signature_data: string | null;
  signed_at: string | null;
  status: string;
  jobs: {
    id: string;
    title: string;
    location: string;
    start_time: string;
    end_time: string;
    daily_rate: number;
    clients: {
      company_name: string;
    };
  };
}

type TabFilter = 'today' | 'upcoming' | 'history';

export function WorkerMyJobsPage() {
  const { profile, workerProfile } = useAuth();
  const [records, setRecords] = useState<WorkRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [photoCaptureOpen, setPhotoCaptureOpen] = useState(false);
  const [photoType, setPhotoType] = useState<'checkin' | 'checkout'>('checkin');
  const [selectedRecord, setSelectedRecord] = useState<WorkRecord | null>(null);
  const [withdrawalDialogOpen, setWithdrawalDialogOpen] = useState(false);
  const [selectedJobForWithdrawal, setSelectedJobForWithdrawal] = useState<{ id: string; title: string; job_id: string } | null>(null);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabFilter>('today');
  const [earlyCheckoutDialog, setEarlyCheckoutDialog] = useState<{ record: WorkRecord; expectedTime: string } | null>(null);

  useEffect(() => {
    if (profile?.id) {
      loadRecords();
    }
  }, [profile?.id]);

  // Auto-select best tab based on data
  useEffect(() => {
    const today = getLocalToday();
    const hasTodayRecords = records.some(r => r.work_date === today);
    const hasUpcoming = records.some(r => r.work_date > today);
    if (hasTodayRecords) {
      setActiveTab('today');
    } else if (hasUpcoming) {
      setActiveTab('upcoming');
    } else if (records.length > 0) {
      setActiveTab('history');
    }
  }, [records]);

  async function loadRecords() {
    setLoading(true);
    try {
      const { data } = await supabaseUntyped
        .from('work_records')
        .select(`
          *,
          jobs (
            id,
            title,
            location,
            start_time,
            end_time,
            daily_rate,
            clients (company_name)
          )
        `)
        .eq('worker_id', profile?.id)
        .gte('work_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('work_date', { ascending: false });

      setRecords(data || []);
    } catch (error) {
      console.error('Error loading records:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleCheckIn(record: WorkRecord) {
    setSelectedRecord(record);
    setPhotoType('checkin');
    setPhotoCaptureOpen(true);
  }

  function handleCheckOut(record: WorkRecord) {
    // Check if it's an early checkout
    const job = record.jobs;
    if (job?.end_time) {
      const [endH, endM] = job.end_time.split(':').map(Number);
      const expectedEnd = new Date();
      expectedEnd.setHours(endH, endM, 0, 0);

      if (new Date() < expectedEnd) {
        setEarlyCheckoutDialog({ record, expectedTime: job.end_time.slice(0, 5) });
        return;
      }
    }

    proceedWithCheckOut(record);
  }

  function proceedWithCheckOut(record: WorkRecord) {
    setEarlyCheckoutDialog(null);
    setSelectedRecord(record);
    setPhotoType('checkout');
    setPhotoCaptureOpen(true);
  }

  function getCurrentPosition(): Promise<{ latitude: number; longitude: number } | null> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  }

  async function handlePhotoSubmit(photoData: string) {
    if (!selectedRecord) return;

    try {
      const location = await getCurrentPosition();

      if (photoType === 'checkin') {
        const { error } = await supabaseUntyped
          .from('work_records')
          .update({
            check_in: new Date().toISOString(),
            check_in_photo: photoData,
            status: 'in_progress',
            ...(location && {
              check_in_latitude: location.latitude,
              check_in_longitude: location.longitude,
            }),
          })
          .eq('id', selectedRecord.id);
        if (error) throw error;
        toast.success('Entrada registrada com sucesso!');
      } else {
        const checkOutTime = new Date();
        const job = selectedRecord.jobs;
        let earlyCheckoutNote = '';

        // Detect early checkout
        if (job?.end_time) {
          const [endH, endM] = job.end_time.split(':').map(Number);
          const expectedEnd = new Date();
          expectedEnd.setHours(endH, endM, 0, 0);

          if (checkOutTime < expectedEnd) {
            const checkOutStr = checkOutTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            const expectedStr = job.end_time.slice(0, 5);
            earlyCheckoutNote = `Saída antecipada: ${checkOutStr} (previsto: ${expectedStr})`;
          }
        }

        const { error } = await supabaseUntyped
          .from('work_records')
          .update({
            check_out: checkOutTime.toISOString(),
            signature_data: photoData,
            signed_at: checkOutTime.toISOString(),
            status: 'completed',
            ...(location && {
              check_out_latitude: location.latitude,
              check_out_longitude: location.longitude,
            }),
            ...(earlyCheckoutNote && { notes: earlyCheckoutNote }),
          })
          .eq('id', selectedRecord.id);
        if (error) throw error;

        // Notify admin about early checkout
        if (earlyCheckoutNote) {
          notifyAdminEarlyCheckout(
            profile?.name || 'Prestador',
            job?.title || '',
            selectedRecord.work_date,
            earlyCheckoutNote
          );
        }

        toast.success('Saída registrada com sucesso!');
      }
      setPhotoCaptureOpen(false);
      setSelectedRecord(null);
      loadRecords();
    } catch (error) {
      console.error('Error saving photo:', error);
      toast.error('Erro ao salvar foto. Tente novamente.');
    }
  }

  function handleWithdrawClick(record: WorkRecord) {
    setSelectedJobForWithdrawal({
      id: record.id,
      title: record.jobs.title,
      job_id: record.job_id
    });
    setWithdrawalDialogOpen(true);
  }

  async function handleWithdrawalSubmit(reason: string) {
    if (!selectedJobForWithdrawal || !profile?.id) return;

    try {
      const { data: assignments, error: fetchError } = await supabaseUntyped
        .from('job_assignments')
        .select('id, status')
        .eq('job_id', selectedJobForWithdrawal.job_id)
        .eq('worker_id', profile.id)
        .limit(1);

      if (fetchError) throw fetchError;

      if (!assignments || assignments.length === 0) {
        toast.error('Atribuição não encontrada.');
        return;
      }

      const assignment = assignments[0];
      const withdrawnAt = new Date().toISOString();

      await supabaseUntyped
        .from('withdrawal_history')
        .insert({
          job_assignment_id: assignment.id,
          job_id: selectedJobForWithdrawal.job_id,
          worker_id: profile.id,
          withdrawal_reason: reason,
          withdrawn_at: withdrawnAt
        });

      const { error: assignmentError } = await supabaseUntyped
        .from('job_assignments')
        .update({
          status: 'withdrawn',
          withdrawal_reason: reason,
          withdrawn_at: withdrawnAt
        })
        .eq('id', assignment.id)
        .select();

      if (assignmentError) {
        if (assignmentError.message?.includes('invalid input value') || assignmentError.code === '22P02') {
          toast.error('Erro: Status de desistência não configurado no banco de dados.', {
            description: 'Entre em contato com o administrador.'
          });
          return;
        }
        throw assignmentError;
      }

      const { error: deleteError } = await supabaseUntyped
        .from('work_records')
        .delete()
        .eq('job_id', selectedJobForWithdrawal.job_id)
        .eq('worker_id', profile.id);

      if (deleteError) {
        console.error('Erro ao deletar work_records:', deleteError);
      }

      const { data: jobData } = await supabaseUntyped
        .from('jobs')
        .select('required_workers, status')
        .eq('id', selectedJobForWithdrawal.job_id)
        .single();

      const { count: activeCount } = await supabaseUntyped
        .from('job_assignments')
        .select('*', { count: 'exact', head: true })
        .eq('job_id', selectedJobForWithdrawal.job_id)
        .in('status', ['pending', 'confirmed']);

      const requiredWorkers = jobData?.required_workers || 1;
      if ((activeCount || 0) < requiredWorkers && jobData?.status !== 'open') {
        await supabaseUntyped
          .from('jobs')
          .update({ status: 'open' })
          .eq('id', selectedJobForWithdrawal.job_id);

        notifyJobAvailableAfterWithdrawal(selectedJobForWithdrawal.title);
      }

      setWithdrawalDialogOpen(false);
      setSelectedJobForWithdrawal(null);
      toast.success('Desistência registrada com sucesso!', {
        description: 'A vaga ficou disponível novamente para outros trabalhadores.'
      });
      loadRecords();
    } catch (error) {
      console.error('Erro ao confirmar desistência:', error);
      toast.error('Erro ao registrar desistência. Tente novamente.');
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR', {
      weekday: 'short',
      day: '2-digit',
      month: 'short'
    });
  }

  function formatDateLong(dateStr: string) {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long'
    });
  }

  function formatTime(timeStr: string | null) {
    if (!timeStr) return '-';
    return new Date(timeStr).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function formatScheduleTime(timeStr: string) {
    return timeStr.slice(0, 5);
  }

  function getStatusConfig(status: string) {
    switch (status) {
      case 'completed':
        return { label: 'Concluído', color: 'bg-green-500', border: 'border-l-green-500', bg: 'from-green-50', icon: CheckCircle, textColor: 'text-green-600' };
      case 'in_progress':
        return { label: 'Em andamento', color: 'bg-blue-500', border: 'border-l-blue-500', bg: 'from-blue-50', icon: Play, textColor: 'text-blue-600' };
      case 'absent':
        return { label: 'Falta', color: 'bg-red-500', border: 'border-l-red-500', bg: 'from-red-50', icon: AlertCircle, textColor: 'text-red-600' };
      default:
        return { label: 'Pendente', color: 'bg-slate-400', border: 'border-l-slate-400', bg: 'from-slate-50', icon: Clock, textColor: 'text-slate-600' };
    }
  }

  function toggleCard(id: string) {
    setExpandedCard(prev => prev === id ? null : id);
  }

  // Separate records by category
  const today = getLocalToday();
  const todayRecords = records.filter(r => r.work_date === today);
  const upcomingRecords = records.filter(r => r.work_date > today);
  const pastRecords = records.filter(r => r.work_date < today);

  const tabs: { key: TabFilter; label: string; count: number; icon: typeof Clock }[] = [
    { key: 'today', label: 'Hoje', count: todayRecords.length, icon: Clock },
    { key: 'upcoming', label: 'Próximas', count: upcomingRecords.length, icon: Calendar },
    { key: 'history', label: 'Histórico', count: pastRecords.length, icon: Eye },
  ];

  const activeRecords = activeTab === 'today' ? todayRecords
    : activeTab === 'upcoming' ? upcomingRecords
    : pastRecords;

  const totalEarnings = records
    .filter(r => r.status === 'completed')
    .reduce((sum, r) => sum + (r.jobs?.daily_rate || 0), 0);

  // Block access for unapproved workers
  if (workerProfile && workerProfile.approval_status !== 'approved') {
    return (
      <DashboardLayout>
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-900 mb-1">Minhas Diárias</h2>
          <p className="text-sm text-muted-foreground">Gerencie seus dias de trabalho e registre presença</p>
        </div>
        <Alert className={`mb-6 ${workerProfile.approval_status === 'rejected' ? 'border-red-300 bg-red-50' : 'border-blue-300 bg-blue-50'}`}>
          <ShieldAlert className={`h-5 w-5 ${workerProfile.approval_status === 'rejected' ? 'text-red-600' : 'text-blue-600'}`} />
          <AlertTitle className={workerProfile.approval_status === 'rejected' ? 'text-red-800' : 'text-blue-800'}>
            {workerProfile.approval_status === 'pending' ? 'Conta em Análise' : 'Conta Rejeitada'}
          </AlertTitle>
          <AlertDescription className={workerProfile.approval_status === 'rejected' ? 'text-red-700' : 'text-blue-700'}>
            {workerProfile.approval_status === 'pending'
              ? 'Sua conta está sendo analisada pelo administrador. Aguarde a aprovação para acessar suas diárias.'
              : 'Sua conta foi rejeitada. Entre em contato com o suporte para mais informações.'}
          </AlertDescription>
        </Alert>
        <Card>
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldAlert className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">Acesso Restrito</h3>
            <p className="text-muted-foreground">
              {workerProfile.approval_status === 'pending'
                ? 'Aguarde a aprovação da sua conta para acessar suas diárias.'
                : 'Sua conta foi rejeitada. Entre em contato com o suporte.'}
            </p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  function renderRecordCard(record: WorkRecord) {
    const isExpanded = expandedCard === record.id;
    const statusConfig = getStatusConfig(record.status);
    const isActionable = record.work_date === today && ['pending', 'in_progress'].includes(record.status);
    const canWithdraw = record.status === 'pending' && record.work_date >= today;

    return (
      <Card
        key={record.id}
        className={`border-0 shadow-sm overflow-hidden transition-all duration-200 cursor-pointer active:scale-[0.98] border-l-4 ${statusConfig.border} ${
          isExpanded ? 'shadow-md ring-1 ring-slate-200' : 'hover:shadow-md'
        }`}
        onClick={() => toggleCard(record.id)}
      >
        <CardContent className="p-0">
          {/* Main card content - always visible */}
          <div className="p-4 sm:p-5">
            <div className="flex items-start gap-3">
              {/* Status icon */}
              <div className={`p-2 rounded-xl ${statusConfig.bg} bg-gradient-to-br to-white flex-shrink-0 mt-0.5`}>
                <statusConfig.icon className={`h-5 w-5 ${statusConfig.textColor}`} />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-semibold text-slate-900 text-base leading-tight truncate">{record.jobs.title}</h4>
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Building className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="truncate">{record.jobs.clients?.company_name}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {/* Quick info row */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(record.work_date)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {formatScheduleTime(record.jobs.start_time)} - {formatScheduleTime(record.jobs.end_time)}
                  </span>
                  <span className="flex items-center gap-1 font-medium text-green-600">
                    <DollarSign className="h-3.5 w-3.5" />
                    R$ {record.jobs.daily_rate}
                  </span>
                </div>

                {/* Check-in/out summary (inline, non-expanded) */}
                {!isExpanded && record.check_in && (
                  <div className="flex items-center gap-2 mt-2 text-sm">
                    <span className="text-green-600 font-medium">{formatTime(record.check_in)}</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <span className={record.check_out ? 'text-red-600 font-medium' : 'text-slate-400'}>
                      {record.check_out ? formatTime(record.check_out) : '--:--'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Expanded content */}
          {isExpanded && (
            <div className="border-t border-slate-100 bg-slate-50/50 animate-in slide-in-from-top-2 duration-200">
              {/* Details grid */}
              <div className="p-4 sm:p-5 space-y-4">
                {/* Location */}
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700">{record.jobs.location}</span>
                </div>

                {/* Date full */}
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-slate-700 capitalize">{formatDateLong(record.work_date)}</span>
                </div>

                {/* Check-in / Check-out */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white rounded-xl p-3 text-center shadow-sm">
                    <p className="text-xs text-muted-foreground mb-1">Entrada</p>
                    <p className={`font-bold text-lg ${record.check_in ? 'text-green-600' : 'text-slate-300'}`}>
                      {record.check_in ? formatTime(record.check_in) : '--:--'}
                    </p>
                  </div>
                  <div className="bg-white rounded-xl p-3 text-center shadow-sm">
                    <p className="text-xs text-muted-foreground mb-1">Saída</p>
                    <p className={`font-bold text-lg ${record.check_out ? 'text-red-600' : 'text-slate-300'}`}>
                      {record.check_out ? formatTime(record.check_out) : '--:--'}
                    </p>
                  </div>
                </div>

                {/* Daily rate highlight */}
                <div className="bg-white rounded-xl p-3 flex items-center justify-between shadow-sm">
                  <span className="text-sm text-muted-foreground">Valor da diária</span>
                  <span className="font-bold text-lg text-green-600">R$ {record.jobs.daily_rate}</span>
                </div>

                {/* Action buttons */}
                <div className="flex flex-col gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                  {isActionable && !record.check_in && record.status === 'pending' && (
                    <Button
                      onClick={() => handleCheckIn(record)}
                      className="w-full gap-2 bg-green-500 hover:bg-green-600 h-12 text-base font-semibold rounded-xl"
                    >
                      <Play className="h-5 w-5" />
                      Registrar Entrada
                    </Button>
                  )}
                  {isActionable && record.check_in && !record.check_out && record.status !== 'completed' && (
                    <Button
                      onClick={() => handleCheckOut(record)}
                      className="w-full gap-2 bg-red-500 hover:bg-red-600 h-12 text-base font-semibold rounded-xl"
                    >
                      <LogOut className="h-5 w-5" />
                      Registrar Saída
                    </Button>
                  )}
                  {record.status === 'completed' && (
                    <div className="flex items-center justify-center gap-2 text-green-600 bg-green-50 p-3 rounded-xl">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-semibold">Diária Concluída</span>
                    </div>
                  )}
                  {record.status === 'absent' && (
                    <div className="flex items-center justify-center gap-2 text-red-600 bg-red-50 p-3 rounded-xl">
                      <AlertCircle className="h-5 w-5" />
                      <span className="font-semibold">Falta Registrada</span>
                    </div>
                  )}
                  {canWithdraw && (
                    <Button
                      variant="outline"
                      onClick={() => handleWithdrawClick(record)}
                      className="w-full gap-2 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 h-11 rounded-xl"
                    >
                      <XCircle className="h-4 w-4" />
                      Desistir da Diária
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-1">Minhas Diárias</h2>
        <p className="text-sm text-muted-foreground">Gerencie seus dias de trabalho e registre presença</p>
      </div>

      {/* Compact Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-white rounded-xl p-3 shadow-sm border border-blue-100/50">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-500" />
            <span className="text-xs text-muted-foreground">Hoje</span>
          </div>
          <p className="text-xl font-bold text-blue-600 mt-1">{todayRecords.length}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-white rounded-xl p-3 shadow-sm border border-purple-100/50">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-purple-500" />
            <span className="text-xs text-muted-foreground">Próximas</span>
          </div>
          <p className="text-xl font-bold text-purple-600 mt-1">{upcomingRecords.length}</p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-white rounded-xl p-3 shadow-sm border border-green-100/50">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-xs text-muted-foreground">Concluídos</span>
          </div>
          <p className="text-xl font-bold text-green-600 mt-1">{records.filter(r => r.status === 'completed').length}</p>
        </div>
        <div className="bg-gradient-to-br from-amber-50 to-white rounded-xl p-3 shadow-sm border border-amber-100/50">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-amber-500" />
            <span className="text-xs text-muted-foreground">Ganhos</span>
          </div>
          <p className="text-xl font-bold text-amber-600 mt-1">
            R$ {totalEarnings.toLocaleString('pt-BR')}
          </p>
        </div>
      </div>

      {/* Tab Navigation - Mobile-friendly pill style */}
      <div className="flex bg-slate-100 rounded-xl p-1 mb-6 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap min-w-0 ${
              activeTab === tab.key
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-muted-foreground hover:text-slate-700'
            }`}
          >
            <tab.icon className="h-4 w-4 flex-shrink-0" />
            <span>{tab.label}</span>
            {tab.count > 0 && (
              <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs font-semibold ${
                activeTab === tab.key
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-slate-200 text-slate-600'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Records list */}
      {activeRecords.length > 0 ? (
        <div className="grid gap-3">
          {activeRecords.map((record) => renderRecordCard(record))}
        </div>
      ) : (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center">
            <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              {activeTab === 'today' ? (
                <Clock className="h-7 w-7 text-slate-400" />
              ) : activeTab === 'upcoming' ? (
                <Calendar className="h-7 w-7 text-slate-400" />
              ) : (
                <Briefcase className="h-7 w-7 text-slate-400" />
              )}
            </div>
            <h3 className="font-semibold text-base mb-1">
              {activeTab === 'today'
                ? 'Nenhuma diária para hoje'
                : activeTab === 'upcoming'
                ? 'Nenhuma diária agendada'
                : 'Nenhum registro no histórico'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {activeTab === 'today'
                ? 'Verifique as diárias disponíveis para encontrar oportunidades.'
                : activeTab === 'upcoming'
                ? 'Candidate-se a diárias disponíveis para agendar trabalhos.'
                : 'Seus registros dos últimos 30 dias aparecerão aqui.'}
            </p>
          </CardContent>
        </Card>
      )}

      <PhotoCaptureDialog
        open={photoCaptureOpen}
        onOpenChange={setPhotoCaptureOpen}
        onSubmit={handlePhotoSubmit}
        title={photoType === 'checkin' ? 'Foto de Entrada' : 'Foto de Saída'}
        description={
          photoType === 'checkin'
            ? 'Tire uma foto para registrar sua entrada no local de trabalho.'
            : 'Tire uma foto para confirmar o fim do expediente.'
        }
      />

      <WithdrawalDialog
        open={withdrawalDialogOpen}
        onOpenChange={setWithdrawalDialogOpen}
        onSubmit={handleWithdrawalSubmit}
        jobTitle={selectedJobForWithdrawal?.title || ''}
      />

      {/* Early Checkout Confirmation Dialog */}
      <Dialog open={!!earlyCheckoutDialog} onOpenChange={(open) => !open && setEarlyCheckoutDialog(null)}>
        <DialogContent className="max-w-sm mx-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertCircle className="h-5 w-5" />
              Saída Antecipada
            </DialogTitle>
            <DialogDescription className="pt-2 text-base">
              O horário previsto de término é <strong>{earlyCheckoutDialog?.expectedTime}</strong>.
              Deseja registrar a saída agora? O administrador será notificado.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setEarlyCheckoutDialog(null)}
            >
              Cancelar
            </Button>
            <Button
              variant="default"
              className="bg-amber-600 hover:bg-amber-700"
              onClick={() => earlyCheckoutDialog && proceedWithCheckOut(earlyCheckoutDialog.record)}
            >
              Confirmar Saída
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
