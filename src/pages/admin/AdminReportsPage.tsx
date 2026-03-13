import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { supabaseUntyped } from "@/lib/supabase";
import { getLocalToday } from "@/lib/date-utils";
import { exportToExcel, exportToPdf } from "@/lib/report-export";
import type { ExportColumn } from "@/lib/report-export";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  Briefcase,
  DollarSign,
  Clock,
  FileSpreadsheet,
  FileText,
  Search,
  TrendingUp,
  CheckCircle2,
  XCircle,
  AlertCircle,
  MapPin,
  BarChart3,
  PieChart as PieChartIcon,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  AreaChart,
  Area,
} from "recharts";

// ─── Types ───────────────────────────────────────────────────────────────────

interface WorkRecordRaw {
  id: string;
  job_id: string;
  worker_id: string;
  work_date: string;
  check_in: string | null;
  check_out: string | null;
  status: string;
  notes: string | null;
  check_in_latitude: number | null;
  check_in_longitude: number | null;
  check_out_latitude: number | null;
  check_out_longitude: number | null;
  workers: {
    id: string;
    funcao: string | null;
    rating: number | null;
    users: { name: string; email: string; phone: string | null };
  } | null;
  jobs: {
    id: string;
    title: string;
    daily_rate: number;
    date: string;
    start_time: string;
    end_time: string;
    required_workers: number;
    status: string;
    clients: { id: string; company_name: string; fantasia?: string | null } | null;
  } | null;
}

interface JobRaw {
  id: string;
  title: string;
  location: string;
  date: string;
  dates: string[] | null;
  start_time: string;
  end_time: string;
  daily_rate: number;
  required_workers: number;
  status: string;
  created_at: string;
  clients: { id: string; company_name: string; fantasia?: string | null } | null;
  job_assignments: { id: string; status: string; worker_id: string }[];
}

interface WorkerOption {
  id: string;
  funcao: string | null;
  users: { name: string };
}

interface ClientOption {
  id: string;
  company_name: string;
  fantasia?: string | null;
}

const CHART_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#ec4899', '#14b8a6'];

const STATUS_LABELS: Record<string, string> = {
  open: 'Aberta',
  assigned: 'Atribuída',
  in_progress: 'Em Andamento',
  completed: 'Concluída',
  cancelled: 'Cancelada',
  unfilled: 'Não Preenchida',
  pending: 'Pendente',
  absent: 'Ausente',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function calcHours(checkIn: string | null, checkOut: string | null): number {
  if (!checkIn || !checkOut) return 0;
  const toMin = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };
  const diff = toMin(checkOut) - toMin(checkIn);
  return diff > 0 ? +(diff / 60).toFixed(2) : 0;
}

function formatCurrency(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDateBR(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

function formatTimeBR(t: string | null): string {
  if (!t) return '--:--';
  return t.slice(0, 5);
}

function getFirstOfMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function AdminReportsPage() {
  // Filters
  const [startDate, setStartDate] = useState(getFirstOfMonth());
  const [endDate, setEndDate] = useState(getLocalToday());
  const [workerFilter, setWorkerFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('prestadores');

  // Raw data
  const [workRecords, setWorkRecords] = useState<WorkRecordRaw[]>([]);
  const [jobs, setJobs] = useState<JobRaw[]>([]);
  const [workerOptions, setWorkerOptions] = useState<WorkerOption[]>([]);
  const [clientOptions, setClientOptions] = useState<ClientOption[]>([]);

  const [loading, setLoading] = useState(false);
  const [hasData, setHasData] = useState(false);

  // Load filter options on mount
  useEffect(() => {
    loadFilterOptions();
  }, []);

  async function loadFilterOptions() {
    const [w, c] = await Promise.all([
      supabaseUntyped.from('workers').select('id, funcao, users(name)').eq('is_active', true).order('id'),
      supabaseUntyped.from('clients').select('id, company_name, fantasia').order('company_name'),
    ]);
    setWorkerOptions(w.data || []);
    setClientOptions(c.data || []);
  }

  async function loadReportData() {
    setLoading(true);
    try {
      const [recordsRes, jobsRes] = await Promise.all([
        supabaseUntyped
          .from('work_records')
          .select(`
            id, job_id, worker_id, work_date, check_in, check_out, status, notes,
            check_in_latitude, check_in_longitude, check_out_latitude, check_out_longitude,
            workers(id, funcao, rating, users(name, email, phone)),
            jobs(id, title, daily_rate, date, start_time, end_time, required_workers, status,
              clients(id, company_name, fantasia))
          `)
          .gte('work_date', startDate)
          .lte('work_date', endDate)
          .order('work_date', { ascending: false }),
        supabaseUntyped
          .from('jobs')
          .select(`
            id, title, location, date, dates, start_time, end_time, daily_rate,
            required_workers, status, created_at,
            clients(id, company_name, fantasia),
            job_assignments(id, status, worker_id)
          `)
          .gte('date', startDate)
          .lte('date', endDate)
          .order('date', { ascending: false }),
      ]);

      setWorkRecords(recordsRes.data || []);
      setJobs(jobsRes.data || []);
      setHasData(true);
    } catch (err) {
      console.error('Error loading report data:', err);
      toast.error('Erro ao carregar dados do relatório');
    } finally {
      setLoading(false);
    }
  }

  // ─── Filtered data ──────────────────────────────────────────────────────────

  const filteredRecords = useMemo(() => {
    let data = workRecords;
    if (workerFilter !== 'all') data = data.filter(r => r.worker_id === workerFilter);
    if (clientFilter !== 'all') data = data.filter(r => r.jobs?.clients?.id === clientFilter);
    return data;
  }, [workRecords, workerFilter, clientFilter]);

  const filteredJobs = useMemo(() => {
    let data = jobs;
    if (clientFilter !== 'all') data = data.filter(j => j.clients?.id === clientFilter);
    return data;
  }, [jobs, clientFilter]);

  // ─── Tab 1: Prestadores Aggregation ─────────────────────────────────────────

  const workerStats = useMemo(() => {
    const map = new Map<string, {
      name: string;
      funcao: string;
      completed: number;
      absent: number;
      totalRecords: number;
      totalHours: number;
      totalEarnings: number;
      rating: number | null;
    }>();

    for (const r of filteredRecords) {
      const wId = r.worker_id;
      const wName = r.workers?.users?.name || 'Desconhecido';
      const wFunc = r.workers?.funcao || '-';
      const wRating = r.workers?.rating || null;

      if (!map.has(wId)) {
        map.set(wId, { name: wName, funcao: wFunc, completed: 0, absent: 0, totalRecords: 0, totalHours: 0, totalEarnings: 0, rating: wRating });
      }
      const s = map.get(wId)!;
      s.totalRecords++;
      if (r.status === 'completed') {
        s.completed++;
        s.totalHours += calcHours(r.check_in, r.check_out);
        s.totalEarnings += r.jobs?.daily_rate || 0;
      }
      if (r.status === 'absent') s.absent++;
    }

    return Array.from(map.entries()).map(([id, s]) => ({
      id,
      ...s,
      attendanceRate: s.totalRecords > 0 ? +((s.completed / s.totalRecords) * 100).toFixed(1) : 0,
    })).sort((a, b) => b.totalHours - a.totalHours);
  }, [filteredRecords]);

  const workerSummary = useMemo(() => {
    const total = workerStats.length;
    const totalHours = workerStats.reduce((sum, w) => sum + w.totalHours, 0);
    const totalCompleted = filteredRecords.filter(r => r.status === 'completed').length;
    const totalAbsent = filteredRecords.filter(r => r.status === 'absent').length;
    const totalPending = filteredRecords.filter(r => r.status === 'pending' || r.status === 'in_progress').length;
    const avgRate = total > 0 ? +(workerStats.reduce((s, w) => s + w.attendanceRate, 0) / total).toFixed(1) : 0;
    const avgRating = workerStats.filter(w => w.rating).length > 0
      ? +(workerStats.filter(w => w.rating).reduce((s, w) => s + (w.rating || 0), 0) / workerStats.filter(w => w.rating).length).toFixed(1)
      : 0;
    return { total, totalHours: +totalHours.toFixed(1), avgRate, avgRating, totalCompleted, totalAbsent, totalPending };
  }, [workerStats, filteredRecords]);

  // ─── Tab 2: Diárias Aggregation ─────────────────────────────────────────────

  const jobSummary = useMemo(() => {
    const total = filteredJobs.length;
    const byStatus: Record<string, number> = {};
    let totalFilled = 0;
    let totalRequired = 0;

    for (const j of filteredJobs) {
      byStatus[j.status] = (byStatus[j.status] || 0) + 1;
      const active = j.job_assignments.filter(a => ['pending', 'confirmed', 'completed'].includes(a.status)).length;
      totalFilled += Math.min(active, j.required_workers);
      totalRequired += j.required_workers;
    }

    const fillRate = totalRequired > 0 ? +((totalFilled / totalRequired) * 100).toFixed(1) : 0;
    const completionRate = total > 0 ? +(((byStatus['completed'] || 0) / total) * 100).toFixed(1) : 0;
    const cancelled = (byStatus['cancelled'] || 0) + (byStatus['unfilled'] || 0);

    return { total, byStatus, fillRate, completionRate, cancelled };
  }, [filteredJobs]);

  const jobsByStatusChart = useMemo(() => {
    return Object.entries(jobSummary.byStatus).map(([status, count]) => ({
      name: STATUS_LABELS[status] || status,
      value: count,
    }));
  }, [jobSummary]);

  const jobsOverTimeChart = useMemo(() => {
    const weekMap = new Map<string, number>();
    for (const j of filteredJobs) {
      const d = new Date(j.date + 'T00:00:00');
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const key = weekStart.toISOString().split('T')[0];
      weekMap.set(key, (weekMap.get(key) || 0) + 1);
    }
    return Array.from(weekMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, count]) => ({ name: formatDateBR(week), diarias: count }));
  }, [filteredJobs]);

  // ─── Tab 3: Financeiro Aggregation ──────────────────────────────────────────

  const financialStats = useMemo(() => {
    let totalPaid = 0;
    const byClient = new Map<string, { name: string; total: number; count: number }>();
    const byWorker = new Map<string, { name: string; total: number; count: number }>();
    const weeklySpend = new Map<string, number>();

    for (const r of filteredRecords) {
      if (r.status !== 'completed') continue;
      const rate = r.jobs?.daily_rate || 0;
      totalPaid += rate;

      const cId = r.jobs?.clients?.id || 'unknown';
      const cName = r.jobs?.clients?.fantasia || r.jobs?.clients?.company_name || 'Desconhecido';
      if (!byClient.has(cId)) byClient.set(cId, { name: cName, total: 0, count: 0 });
      const cs = byClient.get(cId)!;
      cs.total += rate;
      cs.count++;

      const wId = r.worker_id;
      const wName = r.workers?.users?.name || 'Desconhecido';
      if (!byWorker.has(wId)) byWorker.set(wId, { name: wName, total: 0, count: 0 });
      const ws = byWorker.get(wId)!;
      ws.total += rate;
      ws.count++;

      const d = new Date(r.work_date + 'T00:00:00');
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const key = weekStart.toISOString().split('T')[0];
      weeklySpend.set(key, (weeklySpend.get(key) || 0) + rate);
    }

    const completedCount = filteredRecords.filter(r => r.status === 'completed').length;
    const avgCost = completedCount > 0 ? totalPaid / completedCount : 0;

    return {
      totalPaid,
      avgCost,
      clientCount: byClient.size,
      workerCount: byWorker.size,
      byClient: Array.from(byClient.values()).sort((a, b) => b.total - a.total),
      byWorker: Array.from(byWorker.values()).sort((a, b) => b.total - a.total),
      weeklySpend: Array.from(weeklySpend.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([week, total]) => ({ name: formatDateBR(week), total })),
    };
  }, [filteredRecords]);

  // ─── Tab 4: Presença Aggregation ────────────────────────────────────────────

  const attendanceStats = useMemo(() => {
    const totalRecords = filteredRecords.length;
    const checkIns = filteredRecords.filter(r => r.check_in).length;
    const absences = filteredRecords.filter(r => r.status === 'absent').length;

    // Average check-in time
    const checkInMinutes = filteredRecords
      .filter(r => r.check_in)
      .map(r => {
        const [h, m] = r.check_in!.split(':').map(Number);
        return h * 60 + m;
      });
    const avgCheckInMin = checkInMinutes.length > 0
      ? Math.round(checkInMinutes.reduce((a, b) => a + b, 0) / checkInMinutes.length)
      : 0;
    const avgCheckIn = checkInMinutes.length > 0
      ? `${String(Math.floor(avgCheckInMin / 60)).padStart(2, '0')}:${String(avgCheckInMin % 60).padStart(2, '0')}`
      : '--:--';

    // Daily breakdown
    const dailyMap = new Map<string, { completed: number; absent: number; pending: number }>();
    for (const r of filteredRecords) {
      if (!dailyMap.has(r.work_date)) dailyMap.set(r.work_date, { completed: 0, absent: 0, pending: 0 });
      const d = dailyMap.get(r.work_date)!;
      if (r.status === 'completed') d.completed++;
      else if (r.status === 'absent') d.absent++;
      else d.pending++;
    }
    const dailyChart = Array.from(dailyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, counts]) => ({ name: formatDateBR(date), ...counts }));

    return { totalRecords, checkIns, absences, avgCheckIn, dailyChart };
  }, [filteredRecords]);

  // ─── Export handlers ────────────────────────────────────────────────────────

  function handleExportExcel() {
    const { data, columns, filename } = getExportData();
    if (data.length === 0) { toast.error('Nenhum dado para exportar'); return; }
    exportToExcel(data, columns, filename);
    toast.success('Excel exportado com sucesso!');
  }

  function handleExportPdf() {
    const { data, columns, filename, title } = getExportData();
    if (data.length === 0) { toast.error('Nenhum dado para exportar'); return; }
    exportToPdf(data, columns, title, filename, { start: startDate, end: endDate });
    toast.success('PDF exportado com sucesso!');
  }

  function getExportData(): { data: Record<string, unknown>[]; columns: ExportColumn[]; filename: string; title: string } {
    switch (activeTab) {
      case 'prestadores': {
        const columns: ExportColumn[] = [
          { header: 'Nome', key: 'name', width: 25 },
          { header: 'Função', key: 'funcao', width: 15 },
          { header: 'Diárias Trabalhadas', key: 'completed', width: 12 },
          { header: 'Horas Totais', key: 'totalHours', width: 12 },
          { header: 'Faltas', key: 'absent', width: 8 },
          { header: 'Taxa Presença (%)', key: 'attendanceRate', width: 12 },
          { header: 'Avaliação', key: 'rating', width: 10 },
          { header: 'Ganhos (R$)', key: 'earnings', width: 15 },
        ];
        const data = workerStats.map(w => ({
          name: w.name,
          funcao: w.funcao,
          completed: w.completed,
          totalHours: w.totalHours,
          absent: w.absent,
          attendanceRate: w.attendanceRate,
          rating: w.rating?.toFixed(1) || 'N/A',
          earnings: formatCurrency(w.totalEarnings),
        }));
        return { data, columns, filename: `relatorio-prestadores-${startDate}`, title: 'Relatório de Prestadores' };
      }
      case 'diarias': {
        const columns: ExportColumn[] = [
          { header: 'Título', key: 'title', width: 25 },
          { header: 'Cliente', key: 'client', width: 20 },
          { header: 'Data', key: 'date', width: 12 },
          { header: 'Horário', key: 'time', width: 14 },
          { header: 'Diária (R$)', key: 'rate', width: 12 },
          { header: 'Vagas', key: 'slots', width: 12 },
          { header: 'Status', key: 'status', width: 15 },
        ];
        const data = filteredJobs.map(j => {
          const active = j.job_assignments.filter(a => ['pending', 'confirmed', 'completed'].includes(a.status)).length;
          return {
            title: j.title,
            client: j.clients?.fantasia || j.clients?.company_name || '-',
            date: formatDateBR(j.date),
            time: `${j.start_time.slice(0, 5)} - ${j.end_time.slice(0, 5)}`,
            rate: formatCurrency(j.daily_rate),
            slots: `${active}/${j.required_workers}`,
            status: STATUS_LABELS[j.status] || j.status,
          };
        });
        return { data, columns, filename: `relatorio-diarias-${startDate}`, title: 'Relatório de Diárias' };
      }
      case 'financeiro': {
        const columns: ExportColumn[] = [
          { header: 'Cliente', key: 'name', width: 25 },
          { header: 'Diárias', key: 'count', width: 10 },
          { header: 'Total (R$)', key: 'total', width: 15 },
          { header: 'Média/Diária (R$)', key: 'avg', width: 15 },
        ];
        const data = financialStats.byClient.map(c => ({
          name: c.name,
          count: c.count,
          total: formatCurrency(c.total),
          avg: formatCurrency(c.count > 0 ? c.total / c.count : 0),
        }));
        return { data, columns, filename: `relatorio-financeiro-${startDate}`, title: 'Relatório Financeiro' };
      }
      case 'presenca': {
        const columns: ExportColumn[] = [
          { header: 'Data', key: 'date', width: 12 },
          { header: 'Prestador', key: 'worker', width: 25 },
          { header: 'Diária', key: 'job', width: 20 },
          { header: 'Cliente', key: 'client', width: 20 },
          { header: 'Check-in', key: 'checkIn', width: 10 },
          { header: 'Check-out', key: 'checkOut', width: 10 },
          { header: 'Horas', key: 'hours', width: 8 },
          { header: 'Status', key: 'status', width: 12 },
          { header: 'GPS', key: 'gps', width: 6 },
        ];
        const data = filteredRecords.map(r => ({
          date: formatDateBR(r.work_date),
          worker: r.workers?.users?.name || '-',
          job: r.jobs?.title || '-',
          client: r.jobs?.clients?.fantasia || r.jobs?.clients?.company_name || '-',
          checkIn: formatTimeBR(r.check_in),
          checkOut: formatTimeBR(r.check_out),
          hours: calcHours(r.check_in, r.check_out).toFixed(1),
          status: STATUS_LABELS[r.status] || r.status,
          gps: r.check_in_latitude ? 'Sim' : 'Não',
        }));
        return { data, columns, filename: `relatorio-presenca-${startDate}`, title: 'Relatório de Presença' };
      }
      default:
        return { data: [], columns: [], filename: 'relatorio', title: 'Relatório' };
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Relatórios</h2>
        <p className="text-muted-foreground mt-1">Gere relatórios detalhados com exportação para Excel e PDF</p>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[140px]">
              <Label className="text-xs text-muted-foreground mb-1.5 block">De</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-white" />
            </div>
            <div className="flex-1 min-w-[140px]">
              <Label className="text-xs text-muted-foreground mb-1.5 block">Até</Label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-white" />
            </div>
            <div className="flex-1 min-w-[180px]">
              <Label className="text-xs text-muted-foreground mb-1.5 block">Prestador</Label>
              <Select value={workerFilter} onValueChange={setWorkerFilter}>
                <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Prestadores</SelectItem>
                  {workerOptions.map(w => (
                    <SelectItem key={w.id} value={w.id}>{w.users?.name || w.id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[180px]">
              <Label className="text-xs text-muted-foreground mb-1.5 block">Cliente</Label>
              <Select value={clientFilter} onValueChange={setClientFilter}>
                <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Clientes</SelectItem>
                  {clientOptions.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.fantasia || c.company_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={loadReportData} disabled={loading} className="gap-2">
              <Search className="h-4 w-4" />
              {loading ? 'Carregando...' : 'Gerar Relatório'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Loading */}
      {loading && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
          <Skeleton className="h-80 rounded-xl" />
        </div>
      )}

      {/* No data */}
      {!loading && !hasData && (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-16 text-center">
            <BarChart3 className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-lg font-medium text-slate-600">Selecione o período e clique em "Gerar Relatório"</p>
            <p className="text-sm text-muted-foreground mt-1">Os dados serão exibidos aqui com gráficos e tabelas</p>
          </CardContent>
        </Card>
      )}

      {/* Content */}
      {!loading && hasData && (
        <>
          {/* Export Buttons */}
          <div className="flex justify-end gap-2 mb-4">
            <Button variant="outline" size="sm" onClick={handleExportExcel} className="gap-2">
              <FileSpreadsheet className="h-4 w-4 text-green-600" />
              Exportar Excel
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPdf} className="gap-2">
              <FileText className="h-4 w-4 text-red-600" />
              Exportar PDF
            </Button>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 mb-6">
              <TabsTrigger value="prestadores" className="gap-2 text-xs sm:text-sm">
                <Users className="h-4 w-4" /> Prestadores
              </TabsTrigger>
              <TabsTrigger value="diarias" className="gap-2 text-xs sm:text-sm">
                <Briefcase className="h-4 w-4" /> Diárias
              </TabsTrigger>
              <TabsTrigger value="financeiro" className="gap-2 text-xs sm:text-sm">
                <DollarSign className="h-4 w-4" /> Financeiro
              </TabsTrigger>
              <TabsTrigger value="presenca" className="gap-2 text-xs sm:text-sm">
                <Clock className="h-4 w-4" /> Presença
              </TabsTrigger>
            </TabsList>

            {/* ═══ Tab 1: Prestadores ═══ */}
            <TabsContent value="prestadores" className="space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Prestadores" value={workerSummary.total} icon={Users} color="blue" />
                <StatCard label="Horas Trabalhadas" value={`${workerSummary.totalHours}h`} icon={Clock} color="green" />
                <StatCard label="Taxa de Presença" value={`${workerSummary.avgRate}%`} icon={CheckCircle2} color="purple" />
                <StatCard label="Avaliação Média" value={workerSummary.avgRating > 0 ? workerSummary.avgRating.toString() : 'N/A'} icon={TrendingUp} color="amber" />
              </div>

              {/* Charts */}
              <div className="grid lg:grid-cols-2 gap-6">
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-blue-500" />
                      Top Prestadores por Horas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {workerStats.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={workerStats.slice(0, 10)} margin={{ left: 0, right: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-25} textAnchor="end" height={60} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip formatter={(v) => [`${v}h`, 'Horas']} />
                          <Bar dataKey="totalHours" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Horas" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <EmptyChart />}
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <PieChartIcon className="h-4 w-4 text-purple-500" />
                      Distribuição de Presença
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {filteredRecords.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Concluído', value: workerSummary.totalCompleted },
                              { name: 'Ausente', value: workerSummary.totalAbsent },
                              { name: 'Pendente', value: workerSummary.totalPending },
                            ].filter(d => d.value > 0)}
                            cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                          >
                            {['#10b981', '#ef4444', '#f59e0b'].map((c, i) => <Cell key={i} fill={c} />)}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : <EmptyChart />}
                  </CardContent>
                </Card>
              </div>

              {/* Table */}
              <Card className="border-0 shadow-sm overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Detalhamento por Prestador</CardTitle>
                  <CardDescription>{workerStats.length} prestadores no período</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-slate-50">
                          <th className="text-left p-3 font-medium text-slate-600">Nome</th>
                          <th className="text-left p-3 font-medium text-slate-600">Função</th>
                          <th className="text-center p-3 font-medium text-slate-600">Diárias</th>
                          <th className="text-center p-3 font-medium text-slate-600">Horas</th>
                          <th className="text-center p-3 font-medium text-slate-600">Faltas</th>
                          <th className="text-center p-3 font-medium text-slate-600">Presença</th>
                          <th className="text-center p-3 font-medium text-slate-600">Avaliação</th>
                          <th className="text-right p-3 font-medium text-slate-600">Ganhos</th>
                        </tr>
                      </thead>
                      <tbody>
                        {workerStats.map(w => (
                          <tr key={w.id} className="border-b hover:bg-slate-50 transition-colors">
                            <td className="p-3 font-medium">{w.name}</td>
                            <td className="p-3 text-muted-foreground">{w.funcao}</td>
                            <td className="p-3 text-center">{w.completed}</td>
                            <td className="p-3 text-center">{w.totalHours}h</td>
                            <td className="p-3 text-center">
                              {w.absent > 0 ? <span className="text-red-600 font-medium">{w.absent}</span> : '0'}
                            </td>
                            <td className="p-3 text-center">
                              <Badge variant="outline" className={w.attendanceRate >= 80 ? 'border-green-200 text-green-700 bg-green-50' : w.attendanceRate >= 50 ? 'border-amber-200 text-amber-700 bg-amber-50' : 'border-red-200 text-red-700 bg-red-50'}>
                                {w.attendanceRate}%
                              </Badge>
                            </td>
                            <td className="p-3 text-center">{w.rating?.toFixed(1) || 'N/A'}</td>
                            <td className="p-3 text-right font-medium text-blue-700">{formatCurrency(w.totalEarnings)}</td>
                          </tr>
                        ))}
                        {workerStats.length === 0 && (
                          <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Nenhum registro encontrado</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ═══ Tab 2: Diárias ═══ */}
            <TabsContent value="diarias" className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Diárias" value={jobSummary.total} icon={Briefcase} color="blue" />
                <StatCard label="Taxa Preenchimento" value={`${jobSummary.fillRate}%`} icon={CheckCircle2} color="green" />
                <StatCard label="Taxa Conclusão" value={`${jobSummary.completionRate}%`} icon={TrendingUp} color="purple" />
                <StatCard label="Cancelamentos" value={jobSummary.cancelled} icon={XCircle} color="red" />
              </div>

              <div className="grid lg:grid-cols-2 gap-6">
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-blue-500" />
                      Diárias por Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {jobsByStatusChart.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={jobsByStatusChart}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                          <Tooltip />
                          <Bar dataKey="value" radius={[4, 4, 0, 0]} name="Quantidade">
                            {jobsByStatusChart.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <EmptyChart />}
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      Diárias ao Longo do Tempo
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {jobsOverTimeChart.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={jobsOverTimeChart}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                          <Tooltip />
                          <Line type="monotone" dataKey="diarias" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} name="Diárias" />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : <EmptyChart />}
                  </CardContent>
                </Card>
              </div>

              <Card className="border-0 shadow-sm overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Detalhamento de Diárias</CardTitle>
                  <CardDescription>{filteredJobs.length} diárias no período</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-slate-50">
                          <th className="text-left p-3 font-medium text-slate-600">Título</th>
                          <th className="text-left p-3 font-medium text-slate-600">Cliente</th>
                          <th className="text-center p-3 font-medium text-slate-600">Data</th>
                          <th className="text-center p-3 font-medium text-slate-600">Horário</th>
                          <th className="text-right p-3 font-medium text-slate-600">Diária</th>
                          <th className="text-center p-3 font-medium text-slate-600">Vagas</th>
                          <th className="text-center p-3 font-medium text-slate-600">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredJobs.map(j => {
                          const active = j.job_assignments.filter(a => ['pending', 'confirmed', 'completed'].includes(a.status)).length;
                          return (
                            <tr key={j.id} className="border-b hover:bg-slate-50 transition-colors">
                              <td className="p-3 font-medium">{j.title}</td>
                              <td className="p-3 text-muted-foreground">{j.clients?.fantasia || j.clients?.company_name || '-'}</td>
                              <td className="p-3 text-center">{formatDateBR(j.date)}</td>
                              <td className="p-3 text-center">{j.start_time.slice(0, 5)} - {j.end_time.slice(0, 5)}</td>
                              <td className="p-3 text-right font-medium text-blue-700">{formatCurrency(j.daily_rate)}</td>
                              <td className="p-3 text-center">
                                <Badge variant="outline" className={active >= j.required_workers ? 'border-green-200 text-green-700 bg-green-50' : 'border-amber-200 text-amber-700 bg-amber-50'}>
                                  {active}/{j.required_workers}
                                </Badge>
                              </td>
                              <td className="p-3 text-center">
                                <Badge variant="outline" className="text-xs">{STATUS_LABELS[j.status] || j.status}</Badge>
                              </td>
                            </tr>
                          );
                        })}
                        {filteredJobs.length === 0 && (
                          <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Nenhuma diária encontrada</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ═══ Tab 3: Financeiro ═══ */}
            <TabsContent value="financeiro" className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Pago" value={formatCurrency(financialStats.totalPaid)} icon={DollarSign} color="green" />
                <StatCard label="Custo Médio/Diária" value={formatCurrency(financialStats.avgCost)} icon={TrendingUp} color="blue" />
                <StatCard label="Clientes Ativos" value={financialStats.clientCount} icon={Briefcase} color="purple" />
                <StatCard label="Prestadores Pagos" value={financialStats.workerCount} icon={Users} color="amber" />
              </div>

              <div className="grid lg:grid-cols-2 gap-6">
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-green-500" />
                      Top Clientes por Custo
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {financialStats.byClient.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={financialStats.byClient.slice(0, 10)} margin={{ left: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-25} textAnchor="end" height={60} />
                          <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `R$${v}`} />
                          <Tooltip formatter={(v) => [formatCurrency(Number(v)), 'Total']} />
                          <Bar dataKey="total" fill="#10b981" radius={[4, 4, 0, 0]} name="Total" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <EmptyChart />}
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-blue-500" />
                      Gastos ao Longo do Tempo
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {financialStats.weeklySpend.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={financialStats.weeklySpend}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `R$${v}`} />
                          <Tooltip formatter={(v) => [formatCurrency(Number(v)), 'Total']} />
                          <Area type="monotone" dataKey="total" stroke="#3b82f6" fill="#dbeafe" strokeWidth={2} name="Total" />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : <EmptyChart />}
                  </CardContent>
                </Card>
              </div>

              {/* Two tables: by client and by worker */}
              <div className="grid lg:grid-cols-2 gap-6">
                <Card className="border-0 shadow-sm overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Por Cliente</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-slate-50">
                            <th className="text-left p-3 font-medium text-slate-600">Cliente</th>
                            <th className="text-center p-3 font-medium text-slate-600">Diárias</th>
                            <th className="text-right p-3 font-medium text-slate-600">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {financialStats.byClient.map((c, i) => (
                            <tr key={i} className="border-b hover:bg-slate-50 transition-colors">
                              <td className="p-3 font-medium">{c.name}</td>
                              <td className="p-3 text-center">{c.count}</td>
                              <td className="p-3 text-right font-medium text-green-700">{formatCurrency(c.total)}</td>
                            </tr>
                          ))}
                          {financialStats.byClient.length === 0 && (
                            <tr><td colSpan={3} className="p-6 text-center text-muted-foreground">Sem dados</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Por Prestador</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-slate-50">
                            <th className="text-left p-3 font-medium text-slate-600">Prestador</th>
                            <th className="text-center p-3 font-medium text-slate-600">Diárias</th>
                            <th className="text-right p-3 font-medium text-slate-600">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {financialStats.byWorker.map((w, i) => (
                            <tr key={i} className="border-b hover:bg-slate-50 transition-colors">
                              <td className="p-3 font-medium">{w.name}</td>
                              <td className="p-3 text-center">{w.count}</td>
                              <td className="p-3 text-right font-medium text-blue-700">{formatCurrency(w.total)}</td>
                            </tr>
                          ))}
                          {financialStats.byWorker.length === 0 && (
                            <tr><td colSpan={3} className="p-6 text-center text-muted-foreground">Sem dados</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ═══ Tab 4: Presença ═══ */}
            <TabsContent value="presenca" className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Registros" value={attendanceStats.totalRecords} icon={Clock} color="blue" />
                <StatCard label="Check-ins Realizados" value={attendanceStats.checkIns} icon={CheckCircle2} color="green" />
                <StatCard label="Ausências" value={attendanceStats.absences} icon={AlertCircle} color="red" />
                <StatCard label="Média Check-in" value={attendanceStats.avgCheckIn} icon={Clock} color="purple" />
              </div>

              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-blue-500" />
                    Presença Diária
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {attendanceStats.dailyChart.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={attendanceStats.dailyChart}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="completed" stackId="a" fill="#10b981" name="Concluído" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="absent" stackId="a" fill="#ef4444" name="Ausente" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="pending" stackId="a" fill="#f59e0b" name="Pendente" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <EmptyChart />}
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Registros de Ponto</CardTitle>
                  <CardDescription>{filteredRecords.length} registros no período</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-slate-50">
                          <th className="text-left p-3 font-medium text-slate-600">Data</th>
                          <th className="text-left p-3 font-medium text-slate-600">Prestador</th>
                          <th className="text-left p-3 font-medium text-slate-600">Diária</th>
                          <th className="text-left p-3 font-medium text-slate-600">Cliente</th>
                          <th className="text-center p-3 font-medium text-slate-600">Check-in</th>
                          <th className="text-center p-3 font-medium text-slate-600">Check-out</th>
                          <th className="text-center p-3 font-medium text-slate-600">Horas</th>
                          <th className="text-center p-3 font-medium text-slate-600">Status</th>
                          <th className="text-center p-3 font-medium text-slate-600">GPS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRecords.map(r => {
                          const hours = calcHours(r.check_in, r.check_out);
                          const hasGps = !!r.check_in_latitude;
                          return (
                            <tr key={r.id} className="border-b hover:bg-slate-50 transition-colors">
                              <td className="p-3">{formatDateBR(r.work_date)}</td>
                              <td className="p-3 font-medium">{r.workers?.users?.name || '-'}</td>
                              <td className="p-3 text-muted-foreground">{r.jobs?.title || '-'}</td>
                              <td className="p-3 text-muted-foreground">{r.jobs?.clients?.fantasia || r.jobs?.clients?.company_name || '-'}</td>
                              <td className="p-3 text-center">{formatTimeBR(r.check_in)}</td>
                              <td className="p-3 text-center">{formatTimeBR(r.check_out)}</td>
                              <td className="p-3 text-center">{hours > 0 ? `${hours}h` : '-'}</td>
                              <td className="p-3 text-center">
                                <Badge variant="outline" className={
                                  r.status === 'completed' ? 'border-green-200 text-green-700 bg-green-50' :
                                  r.status === 'absent' ? 'border-red-200 text-red-700 bg-red-50' :
                                  r.status === 'in_progress' ? 'border-blue-200 text-blue-700 bg-blue-50' :
                                  'border-amber-200 text-amber-700 bg-amber-50'
                                }>
                                  {STATUS_LABELS[r.status] || r.status}
                                </Badge>
                              </td>
                              <td className="p-3 text-center">
                                {hasGps ? (
                                  <a
                                    href={`https://www.google.com/maps?q=${r.check_in_latitude},${r.check_in_longitude}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline"
                                  >
                                    <MapPin className="h-4 w-4 inline" />
                                  </a>
                                ) : (
                                  <span className="text-slate-300">-</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                        {filteredRecords.length === 0 && (
                          <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">Nenhum registro encontrado</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </DashboardLayout>
  );
}

// ─── Reusable Components ──────────────────────────────────────────────────────

const colorMap = {
  blue: { bg: 'from-blue-50 to-white', text: 'text-blue-600', iconBg: 'bg-blue-100' },
  green: { bg: 'from-green-50 to-white', text: 'text-green-600', iconBg: 'bg-green-100' },
  purple: { bg: 'from-purple-50 to-white', text: 'text-purple-600', iconBg: 'bg-purple-100' },
  amber: { bg: 'from-amber-50 to-white', text: 'text-amber-600', iconBg: 'bg-amber-100' },
  red: { bg: 'from-red-50 to-white', text: 'text-red-600', iconBg: 'bg-red-100' },
};

function StatCard({ label, value, icon: Icon, color }: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color: keyof typeof colorMap;
}) {
  const c = colorMap[color];
  return (
    <Card className={`border-0 shadow-sm bg-gradient-to-br ${c.bg}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardDescription className={`${c.text} font-medium text-xs`}>{label}</CardDescription>
          <div className={`p-2 ${c.iconBg} rounded-lg`}>
            <Icon className={`h-4 w-4 ${c.text}`} />
          </div>
        </div>
        <CardTitle className="text-2xl lg:text-3xl font-bold">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}

function EmptyChart() {
  return (
    <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
      Sem dados para exibir
    </div>
  );
}
