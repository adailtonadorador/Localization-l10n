import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { supabaseUntyped } from "@/lib/supabase";
import { BRAZILIAN_STATES } from "@/lib/brazil-locations";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building2,
  Search,
  MapPin,
  Briefcase,
  CheckCircle2,
  Clock,
  ChevronRight,
  Filter,
  Plus
} from "lucide-react";

interface Client {
  id: string;
  cnpj: string;
  company_name: string;
  fantasia: string | null;
  uf: string | null;
  cidade: string | null;
  created_at: string;
  users: {
    name: string;
    email: string;
    phone: string;
  };
  jobs: {
    id: string;
    status: string;
  }[];
}

export function AdminClientsPage() {
  const location = useLocation();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUf, setSelectedUf] = useState<string>("all");

  useEffect(() => {
    loadClients();
  }, [location.pathname]);

  async function loadClients() {
    setLoading(true);
    try {
      const { data } = await supabaseUntyped
        .from('clients')
        .select(`
          id,
          cnpj,
          company_name,
          fantasia,
          uf,
          cidade,
          created_at,
          users (name, email, phone),
          jobs (id, status)
        `)
        .order('company_name');

      setClients(data || []);
    } catch (error) {
      console.error('Error loading clients:', error);
    } finally {
      setLoading(false);
    }
  }

  function formatCnpj(cnpj: string) {
    if (!cnpj) return '';
    return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }

  function getJobStats(jobs: { id: string; status: string }[]) {
    const total = jobs?.length || 0;
    const open = jobs?.filter(j => j.status === 'open').length || 0;
    const completed = jobs?.filter(j => j.status === 'completed').length || 0;
    const inProgress = jobs?.filter(j => j.status === 'in_progress' || j.status === 'assigned').length || 0;
    return { total, open, completed, inProgress };
  }

  // Filtros
  const filteredClients = clients.filter(client => {
    const matchesSearch =
      client.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.fantasia?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.cnpj?.includes(searchTerm.replace(/\D/g, '')) ||
      client.users?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.cidade?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesUf = selectedUf === "all" || client.uf === selectedUf;

    return matchesSearch && matchesUf;
  });

  // Estatísticas
  const totalClients = clients.length;
  const clientsWithJobs = clients.filter(c => c.jobs?.length > 0).length;
  const totalJobs = clients.reduce((acc, c) => acc + (c.jobs?.length || 0), 0);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
            <p className="text-sm text-muted-foreground">Carregando clientes...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Clientes</h2>
          <p className="text-muted-foreground">Gerencie empresas e suas vagas</p>
        </div>
        <Link to="/admin/clients/new">
          <Button className="bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/25">
            <Plus className="h-4 w-4 mr-2" />
            Cadastrar Cliente
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Total de Empresas</p>
                <p className="text-3xl font-bold">{totalClients}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <Building2 className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-emerald-600 font-medium">Com Vagas Ativas</p>
                <p className="text-3xl font-bold">{clientsWithJobs}</p>
              </div>
              <div className="p-3 bg-emerald-100 rounded-xl">
                <Briefcase className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">Total de Vagas</p>
                <p className="text-3xl font-bold">{totalJobs}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-xl">
                <CheckCircle2 className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, CNPJ, email ou cidade..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={selectedUf} onValueChange={setSelectedUf}>
                <SelectTrigger className="w-[180px] bg-white">
                  <SelectValue placeholder="Filtrar por estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os estados</SelectItem>
                  {BRAZILIAN_STATES.map((state) => (
                    <SelectItem key={state.uf} value={state.uf}>
                      {state.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Clients List */}
      <div className="space-y-4">
        {filteredClients.length > 0 ? (
          filteredClients.map((client) => {
            const jobStats = getJobStats(client.jobs);
            return (
              <Link key={client.id} to={`/admin/clients/${client.id}`}>
                <Card className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer group">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                          <Building2 className="h-7 w-7 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="font-bold text-lg text-slate-900 truncate">
                              {client.company_name}
                            </h3>
                            {client.fantasia && client.fantasia !== client.company_name && (
                              <Badge variant="outline" className="text-xs">
                                {client.fantasia}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            CNPJ: {formatCnpj(client.cnpj)}
                          </p>
                          {client.cidade && client.uf && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                              <MapPin className="h-3.5 w-3.5" />
                              {client.cidade} - {client.uf}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        {/* Job Stats */}
                        <div className="hidden md:flex items-center gap-4">
                          <div className="text-center px-3">
                            <p className="text-2xl font-bold text-slate-900">{jobStats.total}</p>
                            <p className="text-xs text-muted-foreground">Vagas</p>
                          </div>
                          {jobStats.open > 0 && (
                            <Badge className="bg-emerald-500 gap-1">
                              <Clock className="h-3 w-3" />
                              {jobStats.open} abertas
                            </Badge>
                          )}
                          {jobStats.inProgress > 0 && (
                            <Badge className="bg-blue-500 gap-1">
                              {jobStats.inProgress} em andamento
                            </Badge>
                          )}
                          {jobStats.completed > 0 && (
                            <Badge variant="secondary" className="gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              {jobStats.completed} concluídas
                            </Badge>
                          )}
                        </div>

                        <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-primary transition-colors" />
                      </div>
                    </div>

                    {/* Mobile Stats */}
                    <div className="flex md:hidden items-center gap-2 mt-4 pt-4 border-t">
                      <Badge variant="outline">{jobStats.total} vagas</Badge>
                      {jobStats.open > 0 && (
                        <Badge className="bg-emerald-500">{jobStats.open} abertas</Badge>
                      )}
                      {jobStats.completed > 0 && (
                        <Badge variant="secondary">{jobStats.completed} concluídas</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })
        ) : (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-12">
              <div className="text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Building2 className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-medium text-slate-900 mb-1">Nenhuma empresa encontrada</h3>
                <p className="text-muted-foreground">
                  {searchTerm || selectedUf !== "all"
                    ? "Tente ajustar os filtros de busca."
                    : "As empresas aparecerão aqui quando se cadastrarem."}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
