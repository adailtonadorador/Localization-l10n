import { useEffect, useState } from "react";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabaseUntyped } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

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

  async function handleRateWorker(assignmentId: string, rating: number, feedback: string) {
    try {
      await supabaseUntyped
        .from('job_assignments')
        .update({ rating, feedback })
        .eq('id', assignmentId);

      loadHistory();
      alert('Avaliação enviada!');
    } catch (error) {
      console.error('Error rating worker:', error);
      alert('Erro ao enviar avaliação.');
    }
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

  function RatingModal({ assignment, onRate }: { assignment: JobAssignment; onRate: (rating: number, feedback: string) => void }) {
    const [rating, setRating] = useState(5);
    const [feedback, setFeedback] = useState("");
    const [open, setOpen] = useState(false);

    if (!open) {
      return (
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          Avaliar
        </Button>
      );
    }

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setOpen(false)}>
        <Card className="w-full max-w-md" onClick={e => e.stopPropagation()}>
          <CardHeader>
            <CardTitle>Avaliar Trabalhador</CardTitle>
            <CardDescription>{assignment.workers?.users?.name}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">Nota</p>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(n)}
                    className={`text-2xl ${n <= rating ? 'text-yellow-500' : 'text-gray-300'}`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Feedback (opcional)</p>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Como foi o trabalho deste profissional?"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={() => { onRate(rating, feedback); setOpen(false); }}>Enviar Avaliação</Button>
            </div>
          </CardContent>
        </Card>
      </div>
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
        <h2 className="text-2xl font-bold mb-2">Histórico</h2>
        <p className="text-muted-foreground">Trabalhos concluídos e gastos</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Gasto</CardDescription>
            <CardTitle className="text-3xl">R$ {totalSpent.toFixed(2)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Trabalhadores Contratados</CardDescription>
            <CardTitle className="text-3xl">{totalWorkers}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Vagas Concluídas</CardDescription>
            <CardTitle className="text-3xl">{totalJobs}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {assignments.length > 0 ? (
        <div className="space-y-4">
          {assignments.map((assignment) => (
            <Card key={assignment.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        {assignment.workers?.users?.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '??'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold">{assignment.jobs?.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        Trabalhador: {assignment.workers?.users?.name}
                      </p>
                      <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                        <span>{formatDate(assignment.jobs?.date)}</span>
                        <span>{formatTime(assignment.jobs?.start_time)} - {formatTime(assignment.jobs?.end_time)}</span>
                        <span>{assignment.jobs?.location}</span>
                      </div>
                      {assignment.rating && (
                        <div className="mt-2">
                          <span className="text-yellow-500">{'★'.repeat(assignment.rating)}</span>
                          <span className="text-gray-300">{'★'.repeat(5 - assignment.rating)}</span>
                          {assignment.feedback && (
                            <p className="text-sm text-muted-foreground mt-1">"{assignment.feedback}"</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="default">Concluído</Badge>
                    <p className="text-lg font-bold mt-2">R$ {calculateCost(assignment).toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">Jornada: {calculateHours(assignment).toFixed(1)}h | R$ {assignment.jobs?.daily_rate}/dia</p>
                    {!assignment.rating && (
                      <div className="mt-2">
                        <RatingModal
                          assignment={assignment}
                          onRate={(rating, feedback) => handleRateWorker(assignment.id, rating, feedback)}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Nenhum trabalho concluído ainda.</p>
          </CardContent>
        </Card>
      )}
    </DashboardLayout>
  );
}
