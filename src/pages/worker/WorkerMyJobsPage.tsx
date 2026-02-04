import { useEffect, useState } from "react";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabaseUntyped } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SignatureDialog } from "@/components/SignatureDialog";
import { Clock, MapPin, CheckCircle, Calendar, Building, Play, LogOut, Briefcase, ArrowRight } from "lucide-react";

interface WorkRecord {
  id: string;
  job_id: string;
  work_date: string;
  check_in: string | null;
  check_out: string | null;
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

export function WorkerMyJobsPage() {
  const { profile } = useAuth();
  const [records, setRecords] = useState<WorkRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<WorkRecord | null>(null);

  useEffect(() => {
    if (profile?.id) {
      loadRecords();
    }
  }, [profile?.id]);

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
        .gte('work_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('work_date', { ascending: true });

      setRecords(data || []);
    } catch (error) {
      console.error('Error loading records:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckIn(record: WorkRecord) {
    try {
      const { error } = await supabaseUntyped
        .from('work_records')
        .update({
          check_in: new Date().toISOString(),
          status: 'in_progress'
        })
        .eq('id', record.id);

      if (error) throw error;
      loadRecords();
    } catch (error) {
      console.error('Error checking in:', error);
      alert('Erro ao registrar entrada. Tente novamente.');
    }
  }

  async function handleCheckOut(record: WorkRecord) {
    setSelectedRecord(record);
    setSignatureDialogOpen(true);
  }

  async function handleSignatureSubmit(signatureData: string) {
    if (!selectedRecord) return;

    try {
      const { error } = await supabaseUntyped
        .from('work_records')
        .update({
          check_out: new Date().toISOString(),
          signature_data: signatureData,
          signed_at: new Date().toISOString(),
          status: 'completed'
        })
        .eq('id', selectedRecord.id);

      if (error) throw error;
      setSignatureDialogOpen(false);
      setSelectedRecord(null);
      loadRecords();
    } catch (error) {
      console.error('Error checking out:', error);
      alert('Erro ao registrar saída. Tente novamente.');
    }
  }

  function formatDate(dateStr: string) {
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

  function isToday(dateStr: string) {
    const today = new Date().toISOString().split('T')[0];
    return dateStr === today;
  }

  function getStatusBadge(record: WorkRecord) {
    switch (record.status) {
      case 'completed':
        return <Badge className="bg-green-500">Concluído</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-500">Em andamento</Badge>;
      case 'absent':
        return <Badge variant="destructive">Falta</Badge>;
      default:
        return <Badge variant="secondary">Pendente</Badge>;
    }
  }

  // Separar registros por status
  const todayRecords = records.filter(r => isToday(r.work_date));
  const upcomingRecords = records.filter(r => !isToday(r.work_date) && r.work_date > new Date().toISOString().split('T')[0]);
  const pastRecords = records.filter(r => r.work_date < new Date().toISOString().split('T')[0]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Meus Trabalhos</h2>
        <p className="text-muted-foreground">Gerencie seus dias de trabalho e registre presença</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{todayRecords.length}</p>
                <p className="text-sm text-muted-foreground">Hoje</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Calendar className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-600">{upcomingRecords.length}</p>
                <p className="text-sm text-muted-foreground">Próximos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {records.filter(r => r.status === 'completed').length}
                </p>
                <p className="text-sm text-muted-foreground">Concluídos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Briefcase className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-600">{records.length}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trabalhos de Hoje */}
      {todayRecords.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 bg-blue-500 rounded-lg">
              <Clock className="h-4 w-4 text-white" />
            </div>
            <h3 className="text-lg font-semibold">Trabalhos de Hoje</h3>
            <Badge className="bg-blue-500">{todayRecords.length}</Badge>
          </div>
          <div className="grid gap-4">
            {todayRecords.map((record) => (
              <Card key={record.id} className="border-0 shadow-md bg-gradient-to-r from-blue-50 via-white to-white overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500" />
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                    {/* Info */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-bold text-lg text-slate-900">{record.jobs.title}</h4>
                          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                            <Building className="h-3.5 w-3.5" />
                            {record.jobs.clients?.company_name}
                          </p>
                        </div>
                        {getStatusBadge(record)}
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span>{record.jobs.location}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>{formatScheduleTime(record.jobs.start_time)} - {formatScheduleTime(record.jobs.end_time)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Check-in/out */}
                    <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                      <div className="text-center px-4 border-r">
                        <p className="text-xs text-muted-foreground mb-1">Entrada</p>
                        <p className={`font-bold text-lg ${record.check_in ? 'text-green-600' : 'text-slate-400'}`}>
                          {record.check_in ? formatTime(record.check_in) : '--:--'}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <div className="text-center px-4">
                        <p className="text-xs text-muted-foreground mb-1">Saída</p>
                        <p className={`font-bold text-lg ${record.check_out ? 'text-red-600' : 'text-slate-400'}`}>
                          {record.check_out ? formatTime(record.check_out) : '--:--'}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      {!record.check_in && record.status === 'pending' && (
                        <Button
                          onClick={() => handleCheckIn(record)}
                          className="gap-2 bg-green-500 hover:bg-green-600"
                        >
                          <Play className="h-4 w-4" />
                          Registrar Entrada
                        </Button>
                      )}
                      {record.check_in && !record.check_out && (
                        <Button
                          onClick={() => handleCheckOut(record)}
                          className="gap-2 bg-red-500 hover:bg-red-600"
                        >
                          <LogOut className="h-4 w-4" />
                          Registrar Saída
                        </Button>
                      )}
                      {record.status === 'completed' && (
                        <div className="flex items-center gap-2 text-green-600 bg-green-50 px-4 py-2 rounded-lg">
                          <CheckCircle className="h-5 w-5" />
                          <span className="font-medium">Concluído</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Próximos Trabalhos */}
      {upcomingRecords.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 bg-purple-500 rounded-lg">
              <Calendar className="h-4 w-4 text-white" />
            </div>
            <h3 className="text-lg font-semibold">Próximos Trabalhos</h3>
            <Badge className="bg-purple-500">{upcomingRecords.length}</Badge>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {upcomingRecords.map((record) => (
              <Card key={record.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-slate-900">{record.jobs.title}</h4>
                      <p className="text-xs text-muted-foreground">{record.jobs.clients?.company_name}</p>
                    </div>
                    {getStatusBadge(record)}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-purple-500" />
                      <span className="font-medium">{formatDate(record.work_date)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{formatScheduleTime(record.jobs.start_time)} - {formatScheduleTime(record.jobs.end_time)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span className="truncate">{record.jobs.location}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Histórico Recente */}
      {pastRecords.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 bg-slate-500 rounded-lg">
              <Clock className="h-4 w-4 text-white" />
            </div>
            <h3 className="text-lg font-semibold">Histórico Recente</h3>
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {pastRecords.map((record) => (
              <Card key={record.id} className="border-0 shadow-sm bg-slate-50/50">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-medium text-slate-700">{record.jobs.title}</h4>
                      <p className="text-xs text-muted-foreground">{formatDate(record.work_date)}</p>
                    </div>
                    {getStatusBadge(record)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {record.check_in && record.check_out ? (
                      <div className="flex items-center gap-2">
                        <span className="text-green-600">{formatTime(record.check_in)}</span>
                        <ArrowRight className="h-3 w-3" />
                        <span className="text-red-600">{formatTime(record.check_out)}</span>
                      </div>
                    ) : (
                      <span className="text-slate-400">Sem registro</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {records.length === 0 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Briefcase className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Nenhum trabalho agendado</h3>
            <p className="text-muted-foreground">
              Vá em "Vagas Disponíveis" para encontrar oportunidades de trabalho.
            </p>
          </CardContent>
        </Card>
      )}

      <SignatureDialog
        open={signatureDialogOpen}
        onOpenChange={setSignatureDialogOpen}
        onSubmit={handleSignatureSubmit}
      />
    </DashboardLayout>
  );
}
