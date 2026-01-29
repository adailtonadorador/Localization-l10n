import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function RegisterPage() {
  const [activeTab, setActiveTab] = useState<"worker" | "client">("worker");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Worker fields
  const [workerName, setWorkerName] = useState("");
  const [workerCpf, setWorkerCpf] = useState("");
  const [workerEmail, setWorkerEmail] = useState("");
  const [workerPhone, setWorkerPhone] = useState("");
  const [workerPassword, setWorkerPassword] = useState("");
  const [workerPasswordConfirm, setWorkerPasswordConfirm] = useState("");

  // Client fields
  const [clientCompany, setClientCompany] = useState("");
  const [clientCnpj, setClientCnpj] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPassword, setClientPassword] = useState("");
  const [clientPasswordConfirm, setClientPasswordConfirm] = useState("");

  const { signUp } = useAuth();
  const navigate = useNavigate();

  function formatCpf(value: string) {
    const numbers = value.replace(/\D/g, '').slice(0, 11);
    return numbers
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }

  function formatCnpj(value: string) {
    const numbers = value.replace(/\D/g, '').slice(0, 14);
    return numbers
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
  }

  function formatPhone(value: string) {
    const numbers = value.replace(/\D/g, '').slice(0, 11);
    if (numbers.length <= 10) {
      return numbers
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{4})(\d)/, '$1-$2');
    }
    return numbers
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2');
  }

  async function handleWorkerSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (workerPassword !== workerPasswordConfirm) {
      setError("As senhas não coincidem");
      return;
    }

    if (workerPassword.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    setLoading(true);

    const { error } = await signUp(workerEmail, workerPassword, {
      name: workerName,
      role: 'worker',
      phone: workerPhone,
      cpf: workerCpf.replace(/\D/g, ''),
    });

    if (error) {
      setError(getErrorMessage(error.message));
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  async function handleClientSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (clientPassword !== clientPasswordConfirm) {
      setError("As senhas não coincidem");
      return;
    }

    if (clientPassword.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    setLoading(true);

    const { error } = await signUp(clientEmail, clientPassword, {
      name: clientName,
      role: 'client',
      phone: clientPhone,
      cnpj: clientCnpj.replace(/\D/g, ''),
      company_name: clientCompany,
    });

    if (error) {
      setError(getErrorMessage(error.message));
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  function getErrorMessage(message: string): string {
    if (message.includes('User already registered')) {
      return 'Este e-mail já está cadastrado';
    }
    if (message.includes('Password should be at least')) {
      return 'A senha deve ter pelo menos 6 caracteres';
    }
    if (message.includes('Invalid email')) {
      return 'E-mail inválido';
    }
    return 'Erro ao criar conta. Tente novamente.';
  }

  if (success) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader>
              <CardTitle className="text-green-600">Conta criada com sucesso!</CardTitle>
              <CardDescription>
                Enviamos um e-mail de confirmação para você. Por favor, verifique sua caixa de entrada e clique no link para ativar sua conta.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button onClick={() => navigate('/login')} className="w-full">
                Ir para Login
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <Link to="/">
            <h1 className="text-3xl font-bold text-primary">SAMA</h1>
          </Link>
          <p className="text-muted-foreground">Trabalhos Temporários</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Criar Conta</CardTitle>
            <CardDescription>
              Escolha o tipo de conta e preencha seus dados
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-3 text-sm text-red-500 bg-red-50 border border-red-200 rounded-md">
                {error}
              </div>
            )}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "worker" | "client")}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="worker">Sou Trabalhador</TabsTrigger>
                <TabsTrigger value="client">Sou Empresa</TabsTrigger>
              </TabsList>

              <TabsContent value="worker">
                <form onSubmit={handleWorkerSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="worker-name">Nome Completo</Label>
                      <Input
                        id="worker-name"
                        placeholder="João Silva"
                        value={workerName}
                        onChange={(e) => setWorkerName(e.target.value)}
                        required
                        disabled={loading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="worker-cpf">CPF</Label>
                      <Input
                        id="worker-cpf"
                        placeholder="000.000.000-00"
                        value={workerCpf}
                        onChange={(e) => setWorkerCpf(formatCpf(e.target.value))}
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="worker-email">E-mail</Label>
                    <Input
                      id="worker-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={workerEmail}
                      onChange={(e) => setWorkerEmail(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="worker-phone">Telefone</Label>
                    <Input
                      id="worker-phone"
                      placeholder="(11) 99999-9999"
                      value={workerPhone}
                      onChange={(e) => setWorkerPhone(formatPhone(e.target.value))}
                      required
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="worker-password">Senha</Label>
                    <Input
                      id="worker-password"
                      type="password"
                      placeholder="••••••••"
                      value={workerPassword}
                      onChange={(e) => setWorkerPassword(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="worker-password-confirm">Confirmar Senha</Label>
                    <Input
                      id="worker-password-confirm"
                      type="password"
                      placeholder="••••••••"
                      value={workerPasswordConfirm}
                      onChange={(e) => setWorkerPasswordConfirm(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Criando conta..." : "Criar Conta de Trabalhador"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="client">
                <form onSubmit={handleClientSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="client-company">Nome da Empresa</Label>
                    <Input
                      id="client-company"
                      placeholder="Empresa LTDA"
                      value={clientCompany}
                      onChange={(e) => setClientCompany(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="client-cnpj">CNPJ</Label>
                      <Input
                        id="client-cnpj"
                        placeholder="00.000.000/0000-00"
                        value={clientCnpj}
                        onChange={(e) => setClientCnpj(formatCnpj(e.target.value))}
                        required
                        disabled={loading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="client-phone">Telefone</Label>
                      <Input
                        id="client-phone"
                        placeholder="(11) 99999-9999"
                        value={clientPhone}
                        onChange={(e) => setClientPhone(formatPhone(e.target.value))}
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="client-name">Nome do Responsável</Label>
                    <Input
                      id="client-name"
                      placeholder="Nome completo"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="client-email">E-mail</Label>
                    <Input
                      id="client-email"
                      type="email"
                      placeholder="contato@empresa.com"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="client-password">Senha</Label>
                    <Input
                      id="client-password"
                      type="password"
                      placeholder="••••••••"
                      value={clientPassword}
                      onChange={(e) => setClientPassword(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="client-password-confirm">Confirmar Senha</Label>
                    <Input
                      id="client-password-confirm"
                      type="password"
                      placeholder="••••••••"
                      value={clientPasswordConfirm}
                      onChange={(e) => setClientPasswordConfirm(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Criando conta..." : "Criar Conta Empresarial"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground text-center">
              Já tem uma conta?{" "}
              <Link to="/login" className="text-primary hover:underline">
                Entrar
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
