import { DashboardLayout } from "@/layouts/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// Mock data para demonstração
const upcomingJobs = [
  {
    id: "1",
    title: "Auxiliar de Carga",
    company: "Transportadora ABC",
    date: "2025-01-30",
    time: "08:00 - 17:00",
    location: "São Paulo, SP",
    rate: 15,
  },
  {
    id: "2",
    title: "Promotor de Vendas",
    company: "Supermercado XYZ",
    date: "2025-02-01",
    time: "09:00 - 18:00",
    location: "Guarulhos, SP",
    rate: 12,
  },
];

const availableJobs = [
  {
    id: "3",
    title: "Auxiliar de Limpeza",
    company: "CleanPro Serviços",
    date: "2025-02-05",
    time: "07:00 - 15:00",
    location: "Osasco, SP",
    rate: 14,
    slots: 5,
  },
  {
    id: "4",
    title: "Recepcionista",
    company: "Hotel Central",
    date: "2025-02-06",
    time: "14:00 - 22:00",
    location: "São Paulo, SP",
    rate: 16,
    slots: 2,
  },
  {
    id: "5",
    title: "Estoquista",
    company: "Magazine Store",
    date: "2025-02-07",
    time: "06:00 - 14:00",
    location: "Campinas, SP",
    rate: 13,
    slots: 10,
  },
];

export function WorkerDashboard() {
  return (
    <DashboardLayout userRole="worker" userName="João Silva">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Trabalhos Este Mês</CardDescription>
            <CardTitle className="text-3xl">12</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Ganhos Este Mês</CardDescription>
            <CardTitle className="text-3xl">R$ 1.440</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avaliação Média</CardDescription>
            <CardTitle className="text-3xl">4.8 ⭐</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Candidaturas Pendentes</CardDescription>
            <CardTitle className="text-3xl">3</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Próximos Trabalhos */}
        <Card>
          <CardHeader>
            <CardTitle>Próximos Trabalhos</CardTitle>
            <CardDescription>Trabalhos agendados para os próximos dias</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingJobs.length > 0 ? (
              <div className="space-y-4">
                {upcomingJobs.map((job) => (
                  <div key={job.id} className="flex items-start justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{job.title}</h4>
                      <p className="text-sm text-muted-foreground">{job.company}</p>
                      <div className="flex gap-2 mt-2 text-sm text-muted-foreground">
                        <span>{new Date(job.date).toLocaleDateString('pt-BR')}</span>
                        <span>•</span>
                        <span>{job.time}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{job.location}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="success">Confirmado</Badge>
                      <p className="mt-2 font-semibold">R$ {job.rate}/h</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                Nenhum trabalho agendado
              </p>
            )}
          </CardContent>
        </Card>

        {/* Vagas Disponíveis */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Vagas Disponíveis</CardTitle>
                <CardDescription>Oportunidades compatíveis com seu perfil</CardDescription>
              </div>
              <Button variant="outline" size="sm">Ver Todas</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {availableJobs.map((job) => (
                <div key={job.id} className="flex items-start justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">{job.title}</h4>
                    <p className="text-sm text-muted-foreground">{job.company}</p>
                    <div className="flex gap-2 mt-2 text-sm text-muted-foreground">
                      <span>{new Date(job.date).toLocaleDateString('pt-BR')}</span>
                      <span>•</span>
                      <span>{job.time}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{job.location}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary">{job.slots} vagas</Badge>
                    <p className="mt-2 font-semibold">R$ {job.rate}/h</p>
                    <Button size="sm" className="mt-2">Candidatar</Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
