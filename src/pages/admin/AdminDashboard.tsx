import { DashboardLayout } from "@/layouts/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Mock data
const recentJobs = [
  { id: "1", title: "Auxiliar de Carga", company: "Transportadora ABC", status: "active", workers: 5, date: "2025-01-30" },
  { id: "2", title: "Promotor de Vendas", company: "Supermercado XYZ", status: "active", workers: 3, date: "2025-02-01" },
  { id: "3", title: "Recepcionista", company: "Hotel Central", status: "pending", workers: 2, date: "2025-02-06" },
];

const recentWorkers = [
  { id: "1", name: "João Silva", email: "joao@email.com", status: "verified", jobs: 45 },
  { id: "2", name: "Maria Santos", email: "maria@email.com", status: "pending", jobs: 0 },
  { id: "3", name: "Carlos Oliveira", email: "carlos@email.com", status: "verified", jobs: 28 },
];

const recentClients = [
  { id: "1", name: "Transportadora ABC", cnpj: "12.345.678/0001-90", status: "active", jobs: 23 },
  { id: "2", name: "Supermercado XYZ", cnpj: "98.765.432/0001-10", status: "active", jobs: 15 },
  { id: "3", name: "Hotel Central", cnpj: "11.222.333/0001-44", status: "pending", jobs: 0 },
];

export function AdminDashboard() {
  return (
    <DashboardLayout userRole="admin" userName="Admin">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Trabalhadores</CardDescription>
            <CardTitle className="text-3xl">5.234</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Empresas</CardDescription>
            <CardTitle className="text-3xl">523</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Vagas Ativas</CardDescription>
            <CardTitle className="text-3xl">147</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Trabalhos Hoje</CardDescription>
            <CardTitle className="text-3xl">89</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pendentes</CardDescription>
            <CardTitle className="text-3xl text-yellow-600">12</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Main Content with Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Gerenciamento</CardTitle>
          <CardDescription>Gerencie vagas, trabalhadores e empresas</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="jobs">
            <TabsList className="mb-4">
              <TabsTrigger value="jobs">Vagas</TabsTrigger>
              <TabsTrigger value="workers">Trabalhadores</TabsTrigger>
              <TabsTrigger value="clients">Empresas</TabsTrigger>
            </TabsList>

            <TabsContent value="jobs">
              <div className="space-y-4">
                {recentJobs.map((job) => (
                  <div key={job.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{job.title}</h4>
                          <Badge variant={job.status === "active" ? "success" : "warning"}>
                            {job.status === "active" ? "Ativa" : "Pendente"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{job.company}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right text-sm">
                        <p>{new Date(job.date).toLocaleDateString('pt-BR')}</p>
                        <p className="text-muted-foreground">{job.workers} trabalhadores</p>
                      </div>
                      <Button variant="outline" size="sm">Ver Detalhes</Button>
                    </div>
                  </div>
                ))}
                <Button variant="outline" className="w-full">Ver Todas as Vagas</Button>
              </div>
            </TabsContent>

            <TabsContent value="workers">
              <div className="space-y-4">
                {recentWorkers.map((worker) => (
                  <div key={worker.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <Avatar>
                        <AvatarImage src="" />
                        <AvatarFallback>{worker.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{worker.name}</h4>
                          <Badge variant={worker.status === "verified" ? "success" : "warning"}>
                            {worker.status === "verified" ? "Verificado" : "Pendente"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{worker.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right text-sm">
                        <p>{worker.jobs} trabalhos</p>
                      </div>
                      <Button variant="outline" size="sm">Ver Perfil</Button>
                      {worker.status === "pending" && (
                        <Button size="sm">Verificar</Button>
                      )}
                    </div>
                  </div>
                ))}
                <Button variant="outline" className="w-full">Ver Todos os Trabalhadores</Button>
              </div>
            </TabsContent>

            <TabsContent value="clients">
              <div className="space-y-4">
                {recentClients.map((client) => (
                  <div key={client.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{client.name}</h4>
                        <Badge variant={client.status === "active" ? "success" : "warning"}>
                          {client.status === "active" ? "Ativo" : "Pendente"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">CNPJ: {client.cnpj}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right text-sm">
                        <p>{client.jobs} vagas publicadas</p>
                      </div>
                      <Button variant="outline" size="sm">Ver Detalhes</Button>
                      {client.status === "pending" && (
                        <Button size="sm">Aprovar</Button>
                      )}
                    </div>
                  </div>
                ))}
                <Button variant="outline" className="w-full">Ver Todas as Empresas</Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
