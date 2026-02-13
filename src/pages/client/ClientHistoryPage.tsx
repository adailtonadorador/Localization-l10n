import { useEffect, useState } from "react";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabaseUntyped } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { RatingDialog, RatingDisplay } from "@/components/RatingDialog";
import { Calendar, MapPin, Clock, DollarSign, Users, Briefcase } from "lucide-react";

interface JobAssignment {
  id: string;
  status: string;
  check_in_time: string | null;
  check_out_time: string | null;
  rating: number | null;
  feedback: string | null;
  workers: {
    id: string;
    users: {
      name: string;
    };
  };
  jobs: {
    id: string;
    title: string;
    date: string;
    start_time: string;
    end_time: string;
    daily_rate: number;
    location: string;
  };
}

export function ClientHistoryPage() {
  const { profile } = useAuth();
  const [assignments, setAssignments] = useState<JobAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  // Rating dialog state
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<JobAssignment | null>(null);

  useEffect(() => {
    if (profile?.id) {
      loadHistory();
    }
  }, [profile?.id]);

  async function loadHistory() {
    setLoading(true);
    try {
      // Get client's job IDs
      const { data: jobsData } = await supabaseUntyped
        .from('jobs')
        .select('id')
        .eq('client_id', profile?.id);

      const jobIds = (jobsData || []).map((j: { id: string }) => j.id);

      if (jobIds.length === 0) {
        setAssignments([]);
        setLoading(false);
        return;
      }

      // Get completed assignments
      const { data } = await supabaseUntyped
        .from('job_assignments')
        .select(`
          *,
          workers (
            id,
            users (name)
          ),
          jobs (id, title, date, start_time, end_time, daily_rate, location)
        `)
        .in('job_id', jobIds)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      setAssignments(data || []);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  }

  function openRatingDialog(assignment: JobAssignment) {
    setSelectedAssignment(assignment);
    setRatingDialogOpen(true);
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR');
  }

  function formatTime(timeStr: string) {
    return timeStr.slice(0, 5);
  }

  function calculateHours(assignment: JobAssignment) {
    const start = new Date(`2000-01-01T${assignment.jobs.start_time}`);
    const end = new Date(`2000-01-01T${assignment.jobs.end_time}`);
    return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  }

  function calculateCost(assignment: JobAssignment) {
    // Agora daily_rate representa o valor por dia
    return assignment.jobs.daily_rate;
  }

  // Calculate totals
  const totalSpent = assignments.reduce((sum, a) => sum + calculateCost(a), 0);
  const totalWorkers = new Set(assignments.map(a => a.workers?.id)).size;
  const totalJobs = new Set(assignments.map(a => a.jobs?.id)).size;

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
        <h2 className="text-2xl font-bold text-slate-900">Histórico</h2>
        <p className="text-muted-foreground">Trabalhos concluídos e avaliações</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Total Gasto</p>
                <p className="text-3xl font-bold text-blue-700">R$ {totalSpent.toFixed(2)}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Trabalhadores</p>
                <p className="text-3xl font-bold text-blue-700">{totalWorkers}</p>
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
                <p className="text-sm text-purple-600 font-medium">Vagas Concluídas</p>
                <p className="text-3xl font-bold text-purple-700">{totalJobs}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-xl">
                <Briefcase className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {assignments.length > 0 ? (
        <div className="space-y-4">
          {assignments.map((assignment) => (
            <Card key={assignment.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-12 w-12 ring-2 ring-white shadow">
                      <AvatarFallback className="bg-blue-500 text-white font-medium">
                        {assignment.workers?.users?.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '??'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                      <h3 className="font-semibold text-slate-900">{assignment.jobs?.title}</h3>
                      <p className="text-sm text-slate-600">
                        {assignment.workers?.users?.name}
                      </p>
                      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mt-2">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatDate(assignment.jobs?.date)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {formatTime(assignment.jobs?.start_time)} - {formatTime(assignment.jobs?.end_time)}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {assignment.jobs?.location}
                        </span>
                      </div>

                      {/* Rating Display */}
                      <div className="mt-3 pt-3 border-t">
                        <RatingDisplay
                          rating={assignment.rating}
                          feedback={assignment.feedback}
                          onEdit={() => openRatingDialog(assignment)}
                          showEditButton={true}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex flex-col items-end gap-2">
                    <Badge className="bg-blue-500">Concluído</Badge>
                    <p className="text-xl font-bold text-slate-900">R$ {calculateCost(assignment).toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">
                      {calculateHours(assignment).toFixed(1)}h | R$ {assignment.jobs?.daily_rate}/dia
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Briefcase className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-1">Nenhum trabalho concluído</h3>
            <p className="text-muted-foreground">Os trabalhos concluídos aparecerão aqui.</p>
          </CardContent>
        </Card>
      )}

      {/* Rating Dialog */}
      {selectedAssignment && (
        <RatingDialog
          open={ratingDialogOpen}
          onOpenChange={setRatingDialogOpen}
          assignmentId={selectedAssignment.id}
          workerId={selectedAssignment.workers?.id || ""}
          workerName={selectedAssignment.workers?.users?.name || "Trabalhador"}
          jobTitle={selectedAssignment.jobs?.title}
          currentRating={selectedAssignment.rating}
          currentFeedback={selectedAssignment.feedback}
          onSuccess={loadHistory}
        />
      )}
    </DashboardLayout>
  );
}
