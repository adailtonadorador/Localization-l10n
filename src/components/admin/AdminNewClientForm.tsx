import { useState } from "react";
import { supabaseUntyped } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  User,
  Phone,
  Mail,
  Lock,
  Building2,
  Search,
  Loader2,
  Home,
  Map,
  MapPin,
} from "lucide-react";

interface ViaCepResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

interface AdminNewClientFormProps {
  onSuccess: (clientId: string) => void;
  onCancel?: () => void;
}

export function AdminNewClientForm({ onSuccess, onCancel }: AdminNewClientFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchingCnpj, setFetchingCnpj] = useState(false);
  const [fetchingCep, setFetchingCep] = useState(false);

  // User credentials
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  // Basic info
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  // Company info
  const [cnpj, setCnpj] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [fantasia, setFantasia] = useState("");

  // Address
  const [cep, setCep] = useState("");
  const [logradouro, setLogradouro] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("");

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

  function formatCep(value: string) {
    const numbers = value.replace(/\D/g, '').slice(0, 8);
    return numbers.replace(/(\d{5})(\d)/, '$1-$2');
  }

  async function fetchCompanyByCnpj(cnpjValue: string) {
    const cleanCnpj = cnpjValue.replace(/\D/g, '');
    if (cleanCnpj.length !== 14) return;

    setFetchingCnpj(true);
    setError(null);
    try {
      // Usar BrasilAPI como fonte primária (gratuita e confiável)
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`);

      if (!response.ok) {
        if (response.status === 404) {
          setError("CNPJ não encontrado");
        } else {
          setError("Erro ao buscar CNPJ. Tente novamente.");
        }
        setFetchingCnpj(false);
        return;
      }

      const data = await response.json();

      // BrasilAPI retorna descricao_situacao_cadastral
      if (data.descricao_situacao_cadastral && data.descricao_situacao_cadastral !== 'ATIVA') {
        setError(`Empresa com situação: ${data.descricao_situacao_cadastral}. Apenas empresas ativas podem se cadastrar.`);
        setFetchingCnpj(false);
        return;
      }

      // BrasilAPI usa razao_social e nome_fantasia
      setCompanyName(data.razao_social || '');
      setFantasia(data.nome_fantasia || '');

      if (data.cep) {
        setCep(formatCep(data.cep));
      }
      setLogradouro(data.logradouro || '');
      setNumero(data.numero || '');
      setComplemento(data.complemento || '');
      setBairro(data.bairro || '');
      setCidade(data.municipio || '');
      setUf(data.uf || '');

      // BrasilAPI usa ddd_telefone_1
      if (data.ddd_telefone_1 && !phone) {
        const cleanPhone = data.ddd_telefone_1.replace(/\D/g, '').slice(0, 11);
        if (cleanPhone.length >= 10) {
          setPhone(formatPhone(cleanPhone));
        }
      }

      setError(null);
    } catch {
      setError("Erro ao buscar CNPJ. Tente novamente.");
    } finally {
      setFetchingCnpj(false);
    }
  }

  function handleCnpjChange(value: string) {
    const formatted = formatCnpj(value);
    setCnpj(formatted);

    const cleanCnpj = value.replace(/\D/g, '');
    if (cleanCnpj.length === 14) {
      fetchCompanyByCnpj(cleanCnpj);
    }
  }

  async function fetchAddressByCep(cepValue: string) {
    const cleanCep = cepValue.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;

    setFetchingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data: ViaCepResponse = await response.json();

      if (data.erro) {
        setError("CEP não encontrado");
        return;
      }

      setLogradouro(data.logradouro || '');
      setBairro(data.bairro || '');
      setCidade(data.localidade || '');
      setUf(data.uf || '');
      if (data.complemento) {
        setComplemento(data.complemento);
      }
      setError(null);
    } catch {
      setError("Erro ao buscar CEP. Tente novamente.");
    } finally {
      setFetchingCep(false);
    }
  }

  function handleCepChange(value: string) {
    const formatted = formatCep(value);
    setCep(formatted);

    const cleanCep = value.replace(/\D/g, '');
    if (cleanCep.length === 8) {
      fetchAddressByCep(cleanCep);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Validations
    if (password !== passwordConfirm) {
      setError("As senhas não coincidem");
      return;
    }

    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    const cleanCnpj = cnpj.replace(/\D/g, '');
    if (cleanCnpj.length !== 14) {
      setError("CNPJ deve ter 14 dígitos");
      return;
    }

    if (!companyName.trim()) {
      setError("Nome da empresa é obrigatório");
      return;
    }

    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setError("Telefone deve ter pelo menos 10 dígitos");
      return;
    }

    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) {
      setError("CEP deve ter 8 dígitos");
      return;
    }

    if (!logradouro || !numero || !bairro || !cidade || !uf) {
      setError("Preencha todos os campos obrigatórios do endereço");
      return;
    }

    setLoading(true);

    try {
      // Save current admin session before creating new user
      const { data: currentSession } = await supabaseUntyped.auth.getSession();
      const adminSession = currentSession?.session;

      if (!adminSession) {
        setError('Sessão expirada. Faça login novamente.');
        setLoading(false);
        return;
      }

      // Check if CNPJ already exists
      const { data: existingClient } = await supabaseUntyped
        .from('clients')
        .select('id')
        .eq('cnpj', cleanCnpj)
        .single();

      if (existingClient) {
        setError("Este CNPJ já está cadastrado");
        setLoading(false);
        return;
      }

      // Create user with Supabase Auth
      const { data: authData, error: signUpError } = await supabaseUntyped.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            role: 'client',
          },
        },
      });

      if (signUpError) {
        // Restore admin session if signup fails
        await supabaseUntyped.auth.setSession({
          access_token: adminSession.access_token,
          refresh_token: adminSession.refresh_token,
        });

        if (signUpError.message.includes('User already registered')) {
          setError('Este e-mail já está cadastrado');
        } else {
          setError('Erro ao criar usuário: ' + signUpError.message);
        }
        setLoading(false);
        return;
      }

      if (!authData.user) {
        // Restore admin session
        await supabaseUntyped.auth.setSession({
          access_token: adminSession.access_token,
          refresh_token: adminSession.refresh_token,
        });
        setError('Erro ao criar usuário');
        setLoading(false);
        return;
      }

      const newUserId = authData.user.id;

      // Immediately restore admin session to perform database operations
      await supabaseUntyped.auth.setSession({
        access_token: adminSession.access_token,
        refresh_token: adminSession.refresh_token,
      });

      // Build full address
      const fullAddress = `${logradouro}, ${numero}${complemento ? ` - ${complemento}` : ''}, ${bairro}, ${cidade} - ${uf}, CEP: ${cep}`;

      // Update user profile with phone
      const { error: userError } = await supabaseUntyped
        .from('users')
        .update({ phone: cleanPhone })
        .eq('id', newUserId);

      if (userError) {
        console.error('Error updating user:', userError);
        setError('Erro ao atualizar dados do usuário');
        setLoading(false);
        return;
      }

      // Create client profile
      const { error: clientError } = await supabaseUntyped
        .from('clients')
        .insert({
          id: newUserId,
          cnpj: cleanCnpj,
          company_name: companyName,
          fantasia: fantasia || null,
          address: fullAddress,
          cep: cleanCep,
          logradouro,
          numero,
          complemento: complemento || null,
          bairro,
          cidade,
          uf,
        });

      if (clientError) {
        console.error('Error creating client:', clientError);
        setError('Erro ao criar perfil do cliente');
        setLoading(false);
        return;
      }

      // Success!
      onSuccess(newUserId);
    } catch (err) {
      console.error('Error creating client:', err);
      setError('Erro ao criar cliente. Tente novamente.');
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <span className="text-red-600 text-xs">!</span>
          </div>
          {error}
        </div>
      )}

      {/* User Credentials Section */}
      <div className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
        <div className="flex items-center gap-2 mb-2">
          <User className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-slate-700">Credenciais de Acesso</h3>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium">E-mail *</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="contato@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              className="pl-10 h-10 bg-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">Senha *</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="pl-10 h-10 bg-white"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password-confirm" className="text-sm font-medium">Confirmar Senha *</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="password-confirm"
                type="password"
                placeholder="••••••••"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                required
                disabled={loading}
                className="pl-10 h-10 bg-white"
              />
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Estas credenciais serão usadas pelo cliente para fazer login na plataforma.
        </p>
      </div>

      {/* Basic Info Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <User className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-slate-700">Dados do Responsável</h3>
        </div>

        <div className="space-y-2">
          <Label htmlFor="name" className="text-sm font-medium">Nome do Responsável *</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="name"
              placeholder="Nome completo"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={loading}
              className="pl-10 h-10 bg-white"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone" className="text-sm font-medium">Telefone *</Label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="phone"
              placeholder="(11) 99999-9999"
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              required
              disabled={loading}
              className="pl-10 h-10 bg-white"
            />
          </div>
        </div>
      </div>

      {/* Company Info Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Building2 className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-slate-700">Dados da Empresa</h3>
        </div>

        <div className="space-y-2">
          <Label htmlFor="cnpj" className="text-sm font-medium">CNPJ *</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="cnpj"
              placeholder="00.000.000/0000-00"
              value={cnpj}
              onChange={(e) => handleCnpjChange(e.target.value)}
              required
              disabled={loading || fetchingCnpj}
              className="pl-10 h-10 bg-white"
            />
            {fetchingCnpj && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-primary" />
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Digite o CNPJ para buscar os dados da empresa automaticamente
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="company-name" className="text-sm font-medium">Razão Social *</Label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="company-name"
              placeholder="Razão Social da Empresa"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
              disabled={loading}
              className="pl-10 h-10 bg-white"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="fantasia" className="text-sm font-medium">Nome Fantasia</Label>
          <Input
            id="fantasia"
            placeholder="Nome Fantasia"
            value={fantasia}
            onChange={(e) => setFantasia(e.target.value)}
            disabled={loading}
            className="h-10 bg-white"
          />
        </div>
      </div>

      {/* Address Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <MapPin className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-slate-700">Endereço</h3>
        </div>

        <div className="space-y-2">
          <Label htmlFor="cep" className="text-sm font-medium">CEP *</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="cep"
              placeholder="00000-000"
              value={cep}
              onChange={(e) => handleCepChange(e.target.value)}
              required
              disabled={loading || fetchingCep}
              className="pl-10 h-10 bg-white"
            />
            {fetchingCep && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-primary" />
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2 space-y-2">
            <Label htmlFor="logradouro" className="text-sm font-medium">Logradouro *</Label>
            <div className="relative">
              <Home className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="logradouro"
                placeholder="Rua, Avenida..."
                value={logradouro}
                onChange={(e) => setLogradouro(e.target.value)}
                required
                disabled={loading}
                className="pl-10 h-10 bg-white"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="numero" className="text-sm font-medium">Número *</Label>
            <Input
              id="numero"
              placeholder="123"
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              required
              disabled={loading}
              className="h-10 bg-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="complemento" className="text-sm font-medium">Complemento</Label>
            <Input
              id="complemento"
              placeholder="Sala, Andar..."
              value={complemento}
              onChange={(e) => setComplemento(e.target.value)}
              disabled={loading}
              className="h-10 bg-white"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bairro" className="text-sm font-medium">Bairro *</Label>
            <Input
              id="bairro"
              placeholder="Bairro"
              value={bairro}
              onChange={(e) => setBairro(e.target.value)}
              required
              disabled={loading}
              className="h-10 bg-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2 space-y-2">
            <Label htmlFor="cidade" className="text-sm font-medium">Cidade *</Label>
            <div className="relative">
              <Map className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="cidade"
                placeholder="Cidade"
                value={cidade}
                onChange={(e) => setCidade(e.target.value)}
                required
                disabled={loading}
                className="pl-10 h-10 bg-white"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="uf" className="text-sm font-medium">UF *</Label>
            <Input
              id="uf"
              placeholder="SP"
              value={uf}
              onChange={(e) => setUf(e.target.value.toUpperCase().slice(0, 2))}
              required
              disabled={loading}
              maxLength={2}
              className="h-10 bg-white text-center"
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
            className="flex-1"
          >
            Cancelar
          </Button>
        )}
        <Button
          type="submit"
          disabled={loading || fetchingCnpj || fetchingCep}
          className="flex-1 bg-[#0A2A5A] hover:bg-[#082347]"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Criando Cliente...
            </span>
          ) : (
            "Criar Cliente"
          )}
        </Button>
      </div>
    </form>
  );
}
