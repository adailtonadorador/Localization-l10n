import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabaseUntyped } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AvatarUpload } from "@/components/ui/avatar-upload";
import {
  User,
  Phone,
  FileText,
  CreditCard,
  MapPin,
  Building2,
  Search,
  CheckCircle2,
  Loader2,
  Home,
  Map,
  Camera
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

interface ReceitaWsResponse {
  status: string;
  nome: string;
  fantasia: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  municipio: string;
  uf: string;
  cep: string;
  telefone: string;
  email: string;
  situacao: string;
  message?: string;
}

export function CompleteProfilePage() {
  const { profile, user, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [profileComplete, setProfileComplete] = useState(false);
  const [fetchingCep, setFetchingCep] = useState(false);

  // Worker fields
  const [phone, setPhone] = useState("");
  const [cpf, setCpf] = useState("");
  const [pix, setPix] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  // Address fields (worker)
  const [cep, setCep] = useState("");
  const [logradouro, setLogradouro] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("");

  // Client fields
  const [clientPhone, setClientPhone] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [fantasia, setFantasia] = useState("");
  const [fetchingCnpj, setFetchingCnpj] = useState(false);

  // Client address fields
  const [clientCep, setClientCep] = useState("");
  const [clientLogradouro, setClientLogradouro] = useState("");
  const [clientNumero, setClientNumero] = useState("");
  const [clientComplemento, setClientComplemento] = useState("");
  const [clientBairro, setClientBairro] = useState("");
  const [clientCidade, setClientCidade] = useState("");
  const [clientUf, setClientUf] = useState("");
  const [fetchingClientCep, setFetchingClientCep] = useState(false);

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

  // Fetch company data by CNPJ
  async function fetchCompanyByCnpj(cnpjValue: string) {
    const cleanCnpj = cnpjValue.replace(/\D/g, '');
    if (cleanCnpj.length !== 14) return;

    setFetchingCnpj(true);
    setError(null);
    try {
      const token = import.meta.env.VITE_RECEITAWS_TOKEN;
      const url = token
        ? `https://www.receitaws.com.br/v1/cnpj/${cleanCnpj}?token=${token}`
        : `https://www.receitaws.com.br/v1/cnpj/${cleanCnpj}`;
      const response = await fetch(url);
      const data: ReceitaWsResponse = await response.json();

      if (data.status === 'ERROR' || data.message) {
        setError(data.message || "CNPJ não encontrado");
        setFetchingCnpj(false);
        return;
      }

      if (data.situacao !== 'ATIVA') {
        setError(`Empresa com situação: ${data.situacao}. Apenas empresas ativas podem se cadastrar.`);
        setFetchingCnpj(false);
        return;
      }

      // Fill company data
      setCompanyName(data.nome || '');
      setFantasia(data.fantasia || '');

      // Fill address data
      if (data.cep) {
        setClientCep(formatCep(data.cep));
      }
      setClientLogradouro(data.logradouro || '');
      setClientNumero(data.numero || '');
      setClientComplemento(data.complemento || '');
      setClientBairro(data.bairro || '');
      setClientCidade(data.municipio || '');
      setClientUf(data.uf || '');

      // Fill phone if available and not already set
      if (data.telefone && !clientPhone) {
        // ReceitaWS returns phone in format like "1199999999" or "(11) 9999-9999"
        const cleanPhone = data.telefone.split('/')[0].replace(/\D/g, '').slice(0, 11);
        if (cleanPhone.length >= 10) {
          setClientPhone(formatPhone(cleanPhone));
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

  // Fetch client address by CEP
  async function fetchClientAddressByCep(cepValue: string) {
    const cleanCep = cepValue.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;

    setFetchingClientCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data: ViaCepResponse = await response.json();

      if (data.erro) {
        setError("CEP não encontrado");
        return;
      }

      setClientLogradouro(data.logradouro || '');
      setClientBairro(data.bairro || '');
      setClientCidade(data.localidade || '');
      setClientUf(data.uf || '');
      if (data.complemento) {
        setClientComplemento(data.complemento);
      }
      setError(null);
    } catch {
      setError("Erro ao buscar CEP. Tente novamente.");
    } finally {
      setFetchingClientCep(false);
    }
  }

  function handleClientCepChange(value: string) {
    const formatted = formatCep(value);
    setClientCep(formatted);

    const cleanCep = value.replace(/\D/g, '');
    if (cleanCep.length === 8) {
      fetchClientAddressByCep(cleanCep);
    }
  }

  async function handleWorkerSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    setError(null);
    setLoading(true);

    // Validate photo
    if (!avatarUrl) {
      setError("A foto é obrigatória");
      setLoading(false);
      return;
    }

    const cleanCpf = cpf.replace(/\D/g, '');
    if (cleanCpf.length !== 11) {
      setError("CPF deve ter 11 dígitos");
      setLoading(false);
      return;
    }

    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setError("Telefone deve ter pelo menos 10 dígitos");
      setLoading(false);
      return;
    }

    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) {
      setError("CEP deve ter 8 dígitos");
      setLoading(false);
      return;
    }

    if (!logradouro || !numero || !bairro || !cidade || !uf) {
      setError("Preencha todos os campos obrigatórios do endereço");
      setLoading(false);
      return;
    }

    // Build full address string
    const fullAddress = `${logradouro}, ${numero}${complemento ? ` - ${complemento}` : ''}, ${bairro}, ${cidade} - ${uf}, CEP: ${cep}`;

    try {
      // Update user profile with phone and avatar
      const { error: userError } = await supabaseUntyped
        .from('users')
        .update({ phone: cleanPhone, avatar_url: avatarUrl })
        .eq('id', user.id);

      if (userError) throw userError;

      // Create worker profile
      const { error: insertError } = await supabaseUntyped.from('workers').insert({
        id: user.id,
        cpf: cleanCpf,
        pix_key: pix || null,
        address: fullAddress,
        cep: cleanCep,
        logradouro,
        numero,
        complemento: complemento || null,
        bairro,
        cidade,
        uf,
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

    const cleanPhone = clientPhone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setError("Telefone deve ter pelo menos 10 dígitos");
      setLoading(false);
      return;
    }

    const cleanClientCep = clientCep.replace(/\D/g, '');
    if (cleanClientCep.length !== 8) {
      setError("CEP deve ter 8 dígitos");
      setLoading(false);
      return;
    }

    if (!clientLogradouro || !clientNumero || !clientBairro || !clientCidade || !clientUf) {
      setError("Preencha todos os campos obrigatórios do endereço");
      setLoading(false);
      return;
    }

    // Build full address string
    const fullAddress = `${clientLogradouro}, ${clientNumero}${clientComplemento ? ` - ${clientComplemento}` : ''}, ${clientBairro}, ${clientCidade} - ${clientUf}, CEP: ${clientCep}`;

    try {
      // Update user profile with phone
      const { error: userError } = await supabaseUntyped
        .from('users')
        .update({ phone: cleanPhone })
        .eq('id', user.id);

      if (userError) throw userError;

      // Create client profile
      const { error: insertError } = await supabaseUntyped.from('clients').insert({
        id: user.id,
        cnpj: cleanCnpj,
        company_name: companyName,
        fantasia: fantasia || null,
        address: fullAddress,
        cep: cleanClientCep,
        logradouro: clientLogradouro,
        numero: clientNumero,
        complemento: clientComplemento || null,
        bairro: clientBairro,
        cidade: clientCidade,
        uf: clientUf,
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Verificando perfil...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-0 shadow-xl">
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4 py-8 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-lg relative z-10">
        {/* Logo */}
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex flex-col items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/25">
              <span className="text-2xl font-bold text-primary-foreground">S</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">SAMA</h1>
              <p className="text-xs text-muted-foreground">Trabalhos Temporários</p>
            </div>
          </Link>
        </div>

        <Card className="border-0 shadow-xl shadow-slate-200/50 backdrop-blur-sm bg-white/90">
          <CardHeader className="space-y-1 pb-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span className="text-sm text-green-600 font-medium">Conta criada!</span>
            </div>
            <CardTitle className="text-2xl font-bold text-center">Complete seu Perfil</CardTitle>
            <CardDescription className="text-center">
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
                  <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-red-600 text-xs">!</span>
                    </div>
                    {error}
                  </div>
                )}

                {/* Photo Upload */}
                <div className="flex flex-col items-center pb-4 border-b">
                  <div className="flex items-center gap-2 mb-3">
                    <Camera className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold text-slate-700">Foto de Perfil *</span>
                  </div>
                  <AvatarUpload
                    userId={user?.id || ""}
                    currentAvatarUrl={avatarUrl}
                    name={profile.name}
                    onUploadComplete={setAvatarUrl}
                    onError={setError}
                    size="lg"
                    required
                  />
                </div>

                {/* User info display */}
                <div className="p-3 bg-slate-50 rounded-lg border">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{profile.name}</span>
                    <span className="text-muted-foreground">({profile.email})</span>
                  </div>
                </div>

                {/* Phone and CPF */}
                <div className="grid grid-cols-2 gap-4">
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
                  <div className="space-y-2">
                    <Label htmlFor="cpf" className="text-sm font-medium">CPF *</Label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="cpf"
                        placeholder="000.000.000-00"
                        value={cpf}
                        onChange={(e) => setCpf(formatCpf(e.target.value))}
                        required
                        disabled={loading}
                        className="pl-10 h-10 bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* PIX */}
                <div className="space-y-2">
                  <Label htmlFor="pix" className="text-sm font-medium">Chave PIX</Label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="pix"
                      placeholder="CPF, E-mail, Telefone ou Chave Aleatória"
                      value={pix}
                      onChange={(e) => setPix(e.target.value)}
                      disabled={loading}
                      className="pl-10 h-10 bg-white"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Usada para receber pagamentos</p>
                </div>

                {/* Address Section */}
                <div className="pt-2">
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold text-slate-700">Endereço</span>
                  </div>

                  {/* CEP with auto-search */}
                  <div className="space-y-2 mb-4">
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
                    <p className="text-xs text-muted-foreground">Digite o CEP para buscar o endereço automaticamente</p>
                  </div>

                  {/* Street and Number */}
                  <div className="grid grid-cols-3 gap-3 mb-3">
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

                  {/* Complement and Neighborhood */}
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="space-y-2">
                      <Label htmlFor="complemento" className="text-sm font-medium">Complemento</Label>
                      <Input
                        id="complemento"
                        placeholder="Apto, Bloco..."
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

                  {/* City and State */}
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
              </CardContent>
              <CardFooter>
                <Button
                  type="submit"
                  className="w-full h-11 font-medium shadow-lg shadow-primary/25"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Salvando...
                    </span>
                  ) : (
                    "Completar Cadastro"
                  )}
                </Button>
              </CardFooter>
            </form>
          ) : (
            <form onSubmit={handleClientSubmit}>
              <CardContent className="space-y-4">
                {error && (
                  <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-red-600 text-xs">!</span>
                    </div>
                    {error}
                  </div>
                )}

                {/* User info display */}
                <div className="p-3 bg-slate-50 rounded-lg border">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{profile.name}</span>
                    <span className="text-muted-foreground">({profile.email})</span>
                  </div>
                </div>

                {/* CNPJ with auto-search */}
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
                  <p className="text-xs text-muted-foreground">Digite o CNPJ para buscar os dados da empresa automaticamente</p>
                </div>

                {/* Company Data Section */}
                <div className="pt-2">
                  <div className="flex items-center gap-2 mb-3">
                    <Building2 className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold text-slate-700">Dados da Empresa</span>
                  </div>

                  {/* Company Name */}
                  <div className="space-y-2 mb-3">
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

                  {/* Trade Name and Phone */}
                  <div className="grid grid-cols-2 gap-3">
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
                    <div className="space-y-2">
                      <Label htmlFor="client-phone" className="text-sm font-medium">Telefone *</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="client-phone"
                          placeholder="(11) 99999-9999"
                          value={clientPhone}
                          onChange={(e) => setClientPhone(formatPhone(e.target.value))}
                          required
                          disabled={loading}
                          className="pl-10 h-10 bg-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Address Section */}
                <div className="pt-2">
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold text-slate-700">Endereço</span>
                  </div>

                  {/* CEP with auto-search */}
                  <div className="space-y-2 mb-4">
                    <Label htmlFor="client-cep" className="text-sm font-medium">CEP *</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="client-cep"
                        placeholder="00000-000"
                        value={clientCep}
                        onChange={(e) => handleClientCepChange(e.target.value)}
                        required
                        disabled={loading || fetchingClientCep}
                        className="pl-10 h-10 bg-white"
                      />
                      {fetchingClientCep && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-primary" />
                      )}
                    </div>
                  </div>

                  {/* Street and Number */}
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="client-logradouro" className="text-sm font-medium">Logradouro *</Label>
                      <div className="relative">
                        <Home className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="client-logradouro"
                          placeholder="Rua, Avenida..."
                          value={clientLogradouro}
                          onChange={(e) => setClientLogradouro(e.target.value)}
                          required
                          disabled={loading}
                          className="pl-10 h-10 bg-white"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="client-numero" className="text-sm font-medium">Número *</Label>
                      <Input
                        id="client-numero"
                        placeholder="123"
                        value={clientNumero}
                        onChange={(e) => setClientNumero(e.target.value)}
                        required
                        disabled={loading}
                        className="h-10 bg-white"
                      />
                    </div>
                  </div>

                  {/* Complement and Neighborhood */}
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="space-y-2">
                      <Label htmlFor="client-complemento" className="text-sm font-medium">Complemento</Label>
                      <Input
                        id="client-complemento"
                        placeholder="Sala, Andar..."
                        value={clientComplemento}
                        onChange={(e) => setClientComplemento(e.target.value)}
                        disabled={loading}
                        className="h-10 bg-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="client-bairro" className="text-sm font-medium">Bairro *</Label>
                      <Input
                        id="client-bairro"
                        placeholder="Bairro"
                        value={clientBairro}
                        onChange={(e) => setClientBairro(e.target.value)}
                        required
                        disabled={loading}
                        className="h-10 bg-white"
                      />
                    </div>
                  </div>

                  {/* City and State */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="client-cidade" className="text-sm font-medium">Cidade *</Label>
                      <div className="relative">
                        <Map className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="client-cidade"
                          placeholder="Cidade"
                          value={clientCidade}
                          onChange={(e) => setClientCidade(e.target.value)}
                          required
                          disabled={loading}
                          className="pl-10 h-10 bg-white"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="client-uf" className="text-sm font-medium">UF *</Label>
                      <Input
                        id="client-uf"
                        placeholder="SP"
                        value={clientUf}
                        onChange={(e) => setClientUf(e.target.value.toUpperCase().slice(0, 2))}
                        required
                        disabled={loading}
                        maxLength={2}
                        className="h-10 bg-white text-center"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  type="submit"
                  className="w-full h-11 font-medium shadow-lg shadow-primary/25"
                  disabled={loading || fetchingCnpj}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Salvando...
                    </span>
                  ) : (
                    "Completar Cadastro"
                  )}
                </Button>
              </CardFooter>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
