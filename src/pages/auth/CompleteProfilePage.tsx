import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabaseUntyped } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CompleteProfilePage() {
  const { profile, user, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [profileComplete, setProfileComplete] = useState(false);

  // Worker fields
  const [cpf, setCpf] = useState("");

  // Client fields
  const [cnpj, setCnpj] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [address, setAddress] = useState("");

  useEffect(() => {
    checkProfileComplete();
  }, [profile, user]);

  async function checkProfileComplete() {
    if (!user || !profile) {
      setCheckingProfile(false);
      return;
    }

    try {
      if (profile.role === 'worker') {
        const { data } = await supabaseUntyped
          .from('workers')
          .select('id')
          .eq('id', user.id)
          .single();

        if (data) {
          setProfileComplete(true);
          navigate('/worker');
        }
      } else if (profile.role === 'client') {
        const { data } = await supabaseUntyped
          .from('clients')
          .select('id')
          .eq('id', user.id)
          .single();

        if (data) {
          setProfileComplete(true);
          navigate('/client');
        }
      } else if (profile.role === 'admin') {
        navigate('/admin');
      }
    } catch {
      // Profile not complete, stay on page
    } finally {
      setCheckingProfile(false);
    }
  }

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

  async function handleWorkerSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    setError(null);
    setLoading(true);

    const cleanCpf = cpf.replace(/\D/g, '');
    if (cleanCpf.length !== 11) {
      setError("CPF deve ter 11 dígitos");
      setLoading(false);
      return;
    }

    try {
      const { error: insertError } = await supabaseUntyped.from('workers').insert({
        id: user.id,
        cpf: cleanCpf,
      });

      if (insertError) {
        if (insertError.message.includes('duplicate')) {
          setError("Este CPF já está cadastrado");
        } else {
          setError("Erro ao salvar perfil. Tente novamente.");
        }
        setLoading(false);
        return;
      }

      await refreshProfile();
      navigate('/worker');
    } catch {
      setError("Erro ao salvar perfil. Tente novamente.");
      setLoading(false);
    }
  }

  async function handleClientSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    setError(null);
    setLoading(true);

    const cleanCnpj = cnpj.replace(/\D/g, '');
    if (cleanCnpj.length !== 14) {
      setError("CNPJ deve ter 14 dígitos");
      setLoading(false);
      return;
    }

    if (!companyName.trim()) {
      setError("Nome da empresa é obrigatório");
      setLoading(false);
      return;
    }

    try {
      const { error: insertError } = await supabaseUntyped.from('clients').insert({
        id: user.id,
        cnpj: cleanCnpj,
        company_name: companyName,
        address: address || null,
      });

      if (insertError) {
        if (insertError.message.includes('duplicate')) {
          setError("Este CNPJ já está cadastrado");
        } else {
          setError("Erro ao salvar perfil. Tente novamente.");
        }
        setLoading(false);
        return;
      }

      await refreshProfile();
      navigate('/client');
    } catch {
      setError("Erro ao salvar perfil. Tente novamente.");
      setLoading(false);
    }
  }

  if (checkingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Erro</CardTitle>
            <CardDescription>
              Não foi possível carregar seu perfil.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Link to="/login" className="w-full">
              <Button className="w-full">Voltar ao Login</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (profileComplete) {
    return null;
  }

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary">SAMA</h1>
          <p className="text-muted-foreground">Trabalhos Temporários</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Complete seu Perfil</CardTitle>
            <CardDescription>
              {profile.role === 'worker'
                ? "Precisamos de algumas informações adicionais para completar seu cadastro de trabalhador."
                : "Precisamos de algumas informações adicionais para completar seu cadastro empresarial."
              }
            </CardDescription>
          </CardHeader>

          {profile.role === 'worker' ? (
            <form onSubmit={handleWorkerSubmit}>
              <CardContent className="space-y-4">
                {error && (
                  <div className="p-3 text-sm text-red-500 bg-red-50 border border-red-200 rounded-md">
                    {error}
                  </div>
                )}

                <div className="p-3 bg-muted rounded-md">
                  <p className="text-sm"><strong>Nome:</strong> {profile.name}</p>
                  <p className="text-sm"><strong>E-mail:</strong> {profile.email}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cpf">CPF *</Label>
                  <Input
                    id="cpf"
                    placeholder="000.000.000-00"
                    value={cpf}
                    onChange={(e) => setCpf(formatCpf(e.target.value))}
                    required
                    disabled={loading}
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Salvando..." : "Completar Cadastro"}
                </Button>
              </CardFooter>
            </form>
          ) : (
            <form onSubmit={handleClientSubmit}>
              <CardContent className="space-y-4">
                {error && (
                  <div className="p-3 text-sm text-red-500 bg-red-50 border border-red-200 rounded-md">
                    {error}
                  </div>
                )}

                <div className="p-3 bg-muted rounded-md">
                  <p className="text-sm"><strong>Responsável:</strong> {profile.name}</p>
                  <p className="text-sm"><strong>E-mail:</strong> {profile.email}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company-name">Nome da Empresa *</Label>
                  <Input
                    id="company-name"
                    placeholder="Empresa LTDA"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cnpj">CNPJ *</Label>
                  <Input
                    id="cnpj"
                    placeholder="00.000.000/0000-00"
                    value={cnpj}
                    onChange={(e) => setCnpj(formatCnpj(e.target.value))}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Endereço</Label>
                  <Input
                    id="address"
                    placeholder="Rua, número, bairro, cidade - UF"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Salvando..." : "Completar Cadastro"}
                </Button>
              </CardFooter>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
