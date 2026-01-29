import { useEffect, useState } from "react";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { supabaseUntyped } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";

interface Stats {
  totalWorkers: number;
  totalClients: number;
  totalJobs: number;
  openJobs: number;
  pendingVerifications: number;
  completedJobs: number;
}

interface Worker {
  id: string;
  cpf: string;
  rating: number;
  total_jobs: number;
  documents_verified: boolean;
  created_at: string;
  users: {
    name: string;
    email: string;
    phone: string;
  };
}

interface Client {
  id: string;
  cnpj: string;
  company_name: string;
  created_at: string;
  users: {
    name: string;
    email: string;
    phone: string;
  };
}

interface Job {
  id: string;
  title: string;
  location: string;
  date: string;
  hourly_rate: number;
  required_workers: number;
  status: string;
  created_at: string;
  clients: {
    company_name: string;
  };
}

export function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalWorkers: 0,
    totalClients: 0,
    totalJobs: 0,
    openJobs: 0,
    pendingVerifications: 0,
    completedJobs: 0,
  });
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      // Load stats
      const [workersRes, clientsRes, jobsRes, openJobsRes, pendingRes, completedRes] = await Promise.all([
        supabaseUntyped.from('workers').select('id', { count: 'exact', head: true }),
        supabaseUntyped.from('clients').select('id', { count: 'exact', head: true }),
        supabaseUntyped.from('jobs').select('id', { count: 'exact', head: true }),
        supabaseUntyped.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'open'),
        supabaseUntyped.from('workers').select('id', { count: 'exact', head: true }).eq('documents_verified', false),
        supabaseUntyped.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
      ]);

      setStats({
        totalWorkers: workersRes.count || 0,
        totalClients: clientsRes.count || 0,
        totalJobs: jobsRes.count || 0,
        openJobs: openJobsRes.count || 0,
        pendingVerifications: pendingRes.count || 0,
        completedJobs: completedRes.count || 0,
      });

      // Load workers with user info
      const { data: workersData } = await supabaseUntyped
        .from('workers')
        .select(`
          *,
          users (name, email, phone)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      setWorkers(workersData || []);

      // Load clients with user info
      const { data: clientsData } = await supabaseUntyped
        .from('clients')
        .select(`
          *,
          users (name, email, phone)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      setClients(clientsData || []);

      // Load jobs with client info
      const { data: jobsData } = await supabaseUntyped
        .from('jobs')
        .select(`
          *,
          clients (company_name)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      setJobs(jobsData || []);

    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyWorker(workerId: string) {
    try {
      await supabaseUntyped
        .from('workers')
        .update({ documents_verified: true })
        .eq('id', workerId);

      loadData();
      alert('Trabalhador verificado com sucesso!');
    } catch (error) {
      console.error('Error verifying worker:', error);
      alert('Erro ao verificar trabalhador.');
    }
  }

  async function handleCancelJob(jobId: string) {
    if (!confirm('Tem certeza que deseja cancelar esta vaga?')) return;

    try {
      await supabaseUntyped
        .from('jobs')
        .update({ status: 'cancelled' })
        .eq('id', jobId);

      loadData();
      alert('Vaga cancelada.');
    } catch (error) {
      console.error('Error cancelling job:', error);
      alert('Erro ao cancelar vaga.');
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR');
  }

  function formatDateTime(dateStr: string) {
    return new Date(dateStr).toLocaleString('pt-BR');
  }

  function formatCpf(cpf: string) {
    if (!cpf) return '';
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }

  function formatCnpj(cnpj: string) {
    if (!cnpj) return '';
    return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'open':
        return <Badge variant="default">Aberta</Badge>;
      case 'assigned':
        return <Badge variant="secondary">Atribuída</Badge>;
      case 'in_progress':
        return <Badge variant="outline">Em Andamento</Badge>;
      case 'completed':
        return <Badge className="bg-green-500">Concluída</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelada</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  }

  // Filter functions
  const filteredWorkers = workers.filter(w =>
    w.users?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.users?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.cpf?.includes(searchTerm)
  );

  const filteredClients = clients.filter(c =>
    c.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.users?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.cnpj?.includes(searchTerm)
  );

  const filteredJobs = jobs.filter(j =>
    j.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    j.clients?.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    j.location?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        <h2 className="text-2xl font-bold mb-2">Painel Administrativo</h2>
        <p className="text-muted-foreground">Gerencie a plataforma SAMA</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Trabalhadores</CardDescription>
            <CardTitle className="text-3xl">{stats.totalWorkers}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Empresas</CardDescription>
            <CardTitle className="text-3xl">{stats.totalClients}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Vagas</CardDescription>
            <CardTitle className="text-3xl">{stats.totalJobs}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Vagas Abertas</CardDescription>
            <CardTitle className="text-3xl text-green-600">{stats.openJobs}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Concluídas</CardDescription>
            <CardTitle className="text-3xl">{stats.completedJobs}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pendentes Verificação</CardDescription>
            <CardTitle className="text-3xl text-yellow-600">{stats.pendingVerifications}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Search */}
      <div className="mb-6">
        <Input
          placeholder="Buscar por nome, email, CPF, CNPJ, título da vaga..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
      </div>

      {/* Main Content with Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Gerenciamento</CardTitle>
          <CardDescription>Gerencie vagas, trabalhadores e empresas</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="workers">
            <TabsList className="mb-4">
              <TabsTrigger value="workers">Trabalhadores ({filteredWorkers.length})</TabsTrigger>
              <TabsTrigger value="clients">Empresas ({filteredClients.length})</TabsTrigger>
              <TabsTrigger value="jobs">Vagas ({filteredJobs.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="workers">
              <div className="space-y-4">
                {filteredWorkers.length > 0 ? (
                  filteredWorkers.map((worker) => (
                    <div key={worker.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <Avatar>
                          <AvatarFallback>
                            {worker.users?.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '??'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{worker.users?.name}</h4>
                            <Badge variant={worker.documents_verified ? "default" : "outline"}>
                              {worker.documents_verified ? "Verificado" : "Pendente"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{worker.users?.email}</p>
                          <p className="text-sm text-muted-foreground">CPF: {formatCpf(worker.cpf)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right text-sm">
                          <p className="flex items-center gap-1">
                            <span className="text-yellow-500">★</span>
                            {worker.rating?.toFixed(1) || '0.0'}
                          </p>
                          <p className="text-muted-foreground">{worker.total_jobs} trabalhos</p>
                          <p className="text-xs text-muted-foreground">
                            Cadastro: {formatDateTime(worker.created_at)}
                          </p>
                        </div>
                        {!worker.documents_verified && (
                          <Button size="sm" onClick={() => handleVerifyWorker(worker.id)}>
                            Verificar
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-8">Nenhum trabalhador encontrado.</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="clients">
              <div className="space-y-4">
                {filteredClients.length > 0 ? (
                  filteredClients.map((client) => (
                    <div key={client.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{client.company_name}</h4>
                          <Badge variant="default">Ativo</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">CNPJ: {formatCnpj(client.cnpj)}</p>
                        <p className="text-sm text-muted-foreground">
                          Responsável: {client.users?.name} ({client.users?.email})
                        </p>
                      </div>
                      <div className="text-right text-sm">
                        <p className="text-xs text-muted-foreground">
                          Cadastro: {formatDateTime(client.created_at)}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-8">Nenhuma empresa encontrada.</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="jobs">
              <div className="space-y-4">
                {filteredJobs.length > 0 ? (
                  filteredJobs.map((job) => (
                    <div key={job.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{job.title}</h4>
                            {getStatusBadge(job.status)}
                          </div>
                          <p className="text-sm text-muted-foreground">{job.clients?.company_name}</p>
                          <p className="text-sm text-muted-foreground">{job.location}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right text-sm">
                          <p>{formatDate(job.date)}</p>
                          <p className="text-muted-foreground">{job.required_workers} trabalhador(es)</p>
                          <p className="font-medium">R$ {job.hourly_rate}/h</p>
                        </div>
                        {job.status === 'open' && (
                          <Button variant="destructive" size="sm" onClick={() => handleCancelJob(job.id)}>
                            Cancelar
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-8">Nenhuma vaga encontrada.</p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
