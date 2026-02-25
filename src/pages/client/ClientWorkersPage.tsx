import { useEffect, useState, useMemo } from "react";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabaseUntyped } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar, Star, Briefcase, Phone, Mail, Users, MapPin, Clock } from "lucide-react";

interface JobApplication {
  id: string;
  applied_at: string;
  job_id: string;
  worker_id: string;
  workers: {
    id: string;
    cpf: string;
    rating: number;
    total_jobs: number;
    skills: string[];
    users: {
      name: string;
      email: string;
      phone: string;
      avatar_url: string | null;
    };
  };
  jobs: {
    id: string;
    title: string;
    date: string;
    daily_rate: number;
    location?: string;
    start_time?: string;
    end_time?: string;
  };
}

export function ClientWorkersPage() {
  const { profile } = useAuth();
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorker, setSelectedWorker] = useState<JobApplication | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (profile?.id) {
      loadApplications();
    }
  }, [profile?.id]);

  async function loadApplications() {
    setLoading(true);
    try {
      // Buscar IDs das vagas do cliente
      const { data: jobsData } = await supabaseUntyped
        .from('jobs')
        .select('id')
        .eq('client_id', profile?.id);

      const jobIds = (jobsData || []).map((j: { id: string }) => j.id);

      if (jobIds.length === 0) {
        setApplications([]);
        setLoading(false);
        return;
      }

      // Buscar trabalhadores atribuídos às vagas
      const { data } = await supabaseUntyped
        .from('job_applications')
        .select(`
          *,
          workers (
            id,
            cpf,
            rating,
            total_jobs,
            skills,
            users (name, email, phone, avatar_url)
          ),
          jobs (id, title, date, daily_rate, location, start_time, end_time)
        `)
        .in('job_id', jobIds)
        .order('applied_at', { ascending: false });

      setApplications(data || []);
    } catch (error) {
      console.error('Error loading applications:', error);
    } finally {
      setLoading(false);
    }
  }

  function formatDateWithWeekday(dateStr: string) {
    const date = new Date(dateStr + 'T00:00:00');
    const weekday = date.toLocaleDateString('pt-BR', { weekday: 'long' });
    const formattedDate = date.toLocaleDateString('pt-BR');
    return `${weekday.charAt(0).toUpperCase() + weekday.slice(1)}, ${formattedDate}`;
  }

  function formatTime(timeStr: string) {
    return timeStr?.slice(0, 5) || '';
  }

  function openWorkerDialog(application: JobApplication) {
    setSelectedWorker(application);
    setDialogOpen(true);
  }

  // Agrupar trabalhadores por data
  const groupedByDate = useMemo(() => {
    const grouped: Record<string, JobApplication[]> = {};

    applications.forEach(app => {
      const date = app.jobs?.date || 'sem-data';
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(app);
    });

    // Ordenar por data (mais próxima primeiro)
    const sortedDates = Object.keys(grouped).sort((a, b) => {
      if (a === 'sem-data') return 1;
      if (b === 'sem-data') return -1;
      return new Date(a).getTime() - new Date(b).getTime();
    });

    return sortedDates.map(date => ({
      date,
      applications: grouped[date]
    }));
  }, [applications]);

  // Componente de linha compacta para cada trabalhador
  function WorkerRow({ application }: { application: JobApplication }) {
    const worker = application.workers;
    const job = application.jobs;

    const initials = worker?.users?.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '??';

    return (
      <div
        className="flex items-center gap-4 p-4 bg-card border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
        onClick={() => openWorkerDialog(application)}
      >
        {/* Avatar */}
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarImage src={worker?.users?.avatar_url || ''} className="object-cover" />
          <AvatarFallback className="text-sm bg-gradient-to-r from-blue-600 to-blue-700 text-white">
            {initials}
          </AvatarFallback>
        </Avatar>

        {/* Info Principal */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-medium truncate">{worker?.users?.name}</h4>
            <Badge variant="secondary" className="text-xs shrink-0">
              <Briefcase className="w-3 h-3 mr-1" />
              {job?.title}
            </Badge>
          </div>
          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
              {worker?.rating?.toFixed(1) || 'N/A'}
            </span>
            <span>{worker?.total_jobs || 0} trabalhos</span>
            <span>R$ {job?.daily_rate}/dia</span>
          </div>
        </div>

        {/* Contato (visível em telas maiores) */}
        <div className="hidden md:flex flex-col gap-1 text-xs text-muted-foreground shrink-0">
          <span className="flex items-center gap-1">
            <Mail className="w-3 h-3" />
            {worker?.users?.email}
          </span>
          {worker?.users?.phone && (
            <span className="flex items-center gap-1">
              <Phone className="w-3 h-3" />
              {worker?.users?.phone}
            </span>
          )}
        </div>
      </div>
    );
  }

  // Componente de grupo por data
  function DateGroup({ date, applications: apps }: {
    date: string;
    applications: JobApplication[];
  }) {
    return (
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-lg">
            {date === 'sem-data' ? 'Sem data definida' : formatDateWithWeekday(date)}
          </h3>
          <Badge variant="outline" className="ml-2">
            {apps.length} {apps.length === 1 ? 'trabalhador' : 'trabalhadores'}
          </Badge>
        </div>
        <div className="space-y-2 pl-7">
          {apps.map((application) => (
            <WorkerRow key={application.id} application={application} />
          ))}
        </div>
      </div>
    );
  }

  // Worker Detail Dialog
  function WorkerDialog() {
    if (!selectedWorker) return null;

    const worker = selectedWorker.workers;
    const job = selectedWorker.jobs;
    const initials = worker?.users?.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '??';

    return (
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md mx-4">
          <DialogHeader>
            <DialogTitle>Detalhes do Trabalhador</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {/* Worker Info */}
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={worker?.users?.avatar_url || ''} className="object-cover" />
                <AvatarFallback className="text-lg bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-lg font-semibold">{worker?.users?.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  <span className="font-medium">{worker?.rating?.toFixed(1) || 'N/A'}</span>
                  <span className="text-muted-foreground">
                    ({worker?.total_jobs || 0} trabalhos)
                  </span>
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                Contato
              </h4>
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{worker?.users?.email}</span>
                </div>
                {worker?.users?.phone && (
                  <a
                    href={`tel:${worker.users.phone}`}
                    className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                  >
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{worker.users.phone}</span>
                  </a>
                )}
              </div>
            </div>

            {/* Skills */}
            {worker?.skills && worker.skills.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                  Habilidades
                </h4>
                <div className="flex flex-wrap gap-2">
                  {worker.skills.map((skill, index) => (
                    <Badge key={index} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Job Info */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                Vaga Atribuída
              </h4>
              <div className="p-4 bg-blue-50 rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-blue-600" />
                  <span className="font-medium text-blue-900">{job?.title}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-blue-700">
                  <Calendar className="w-4 h-4" />
                  <span>{job?.date ? formatDateWithWeekday(job.date) : 'Data não definida'}</span>
                </div>
                {job?.start_time && job?.end_time && (
                  <div className="flex items-center gap-2 text-sm text-blue-700">
                    <Clock className="w-4 h-4" />
                    <span>{formatTime(job.start_time)} - {formatTime(job.end_time)}</span>
                  </div>
                )}
                {job?.location && (
                  <div className="flex items-center gap-2 text-sm text-blue-700">
                    <MapPin className="w-4 h-4" />
                    <span>{job.location}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-blue-200 mt-2">
                  <span className="text-lg font-bold text-blue-900">
                    R$ {job?.daily_rate}/dia
                  </span>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
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

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Trabalhadores</h2>
        <p className="text-muted-foreground">
          Veja quem estará trabalhando em suas vagas por dia
        </p>
      </div>

      {/* Resumo */}
      {applications.length > 0 && (
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-primary" />
              <span className="text-sm">
                <strong>{applications.length}</strong> {applications.length === 1 ? 'trabalhador atribuído' : 'trabalhadores atribuídos'} em{' '}
                <strong>{groupedByDate.length}</strong> {groupedByDate.length === 1 ? 'dia' : 'dias'}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista agrupada por data */}
      {groupedByDate.length > 0 ? (
        <div>
          {groupedByDate.map((group) => (
            <DateGroup
              key={group.date}
              date={group.date}
              applications={group.applications}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">Nenhum trabalhador atribuído às suas vagas ainda.</p>
          </CardContent>
        </Card>
      )}

      {/* Worker Dialog */}
      <WorkerDialog />
    </DashboardLayout>
  );
}
