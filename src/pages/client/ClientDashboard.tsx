import { DashboardLayout } from "@/layouts/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Mock data
const activeJobs = [
  {
    id: "1",
    title: "Auxiliar de Carga",
    date: "2025-01-30",
    time: "08:00 - 17:00",
    location: "Galpão Principal",
    workers_needed: 5,
    workers_confirmed: 4,
    status: "open",
  },
  {
    id: "2",
    title: "Promotor de Vendas",
    date: "2025-02-01",
    time: "09:00 - 18:00",
    location: "Loja Centro",
    workers_needed: 3,
    workers_confirmed: 3,
    status: "filled",
  },
];

const recentWorkers = [
  { id: "1", name: "João Silva", role: "Auxiliar de Carga", rating: 4.9, jobs: 45 },
  { id: "2", name: "Maria Santos", role: "Promotora", rating: 4.8, jobs: 32 },
  { id: "3", name: "Carlos Oliveira", role: "Estoquista", rating: 4.7, jobs: 28 },
];

const pendingApplications = [
  { id: "1", worker: "Ana Costa", job: "Auxiliar de Carga", applied_at: "2025-01-28 10:30" },
  { id: "2", worker: "Pedro Lima", job: "Auxiliar de Carga", applied_at: "2025-01-28 09:15" },
];

export function ClientDashboard() {
  return (
    <DashboardLayout>
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Vagas Ativas</CardDescription>
            <CardTitle className="text-3xl">8</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Trabalhadores Este Mês</CardDescription>
            <CardTitle className="text-3xl">34</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Gasto Este Mês</CardDescription>
            <CardTitle className="text-3xl">R$ 12.540</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Candidaturas Pendentes</CardDescription>
            <CardTitle className="text-3xl">5</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Vagas Ativas */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Minhas Vagas</CardTitle>
                <CardDescription>Vagas publicadas recentemente</CardDescription>
              </div>
              <Button>Nova Vaga</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeJobs.map((job) => (
                <div key={job.id} className="flex items-start justify-between p-4 border rounded-lg">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{job.title}</h4>
                      <Badge variant={job.status === "filled" ? "success" : "secondary"}>
                        {job.status === "filled" ? "Completo" : "Aberto"}
                      </Badge>
                    </div>
                    <div className="flex gap-2 mt-2 text-sm text-muted-foreground">
                      <span>{new Date(job.date).toLocaleDateString('pt-BR')}</span>
                      <span>•</span>
                      <span>{job.time}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{job.location}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm">
                      <span className="font-semibold">{job.workers_confirmed}</span>
                      <span className="text-muted-foreground">/{job.workers_needed} trabalhadores</span>
                    </p>
                    <Button variant="outline" size="sm" className="mt-2">Gerenciar</Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Candidaturas Pendentes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Candidaturas Pendentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingApplications.map((app) => (
                  <div key={app.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{app.worker}</p>
                      <p className="text-xs text-muted-foreground">{app.job}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline">Rejeitar</Button>
                      <Button size="sm">Aprovar</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Trabalhadores Frequentes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Trabalhadores Frequentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentWorkers.map((worker) => (
                  <div key={worker.id} className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src="" />
                      <AvatarFallback>{worker.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{worker.name}</p>
                      <p className="text-xs text-muted-foreground">{worker.role}</p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="font-medium">{worker.rating} ⭐</p>
                      <p className="text-xs text-muted-foreground">{worker.jobs} trabalhos</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
