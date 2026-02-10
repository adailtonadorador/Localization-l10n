import { useState } from "react";
import { toast } from "sonner";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabaseUntyped } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
// Avatar components not used - AvatarUpload handles avatar display
import { AvatarUpload } from "@/components/ui/avatar-upload";
import { ProfileCompleteness } from "@/components/ProfileCompleteness";
import {
  User,
  Mail,
  Phone,
  CreditCard,
  Star,
  Briefcase,
  Shield,
  CheckCircle,
  Edit3,
  Save,
  X,
  MapPin,
  Search,
  Loader2,
  Home,
  Map,
  Wallet
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

const AVAILABLE_SKILLS = [
  'Limpeza',
  'Carga e Descarga',
  'Atendimento ao Cliente',
  'Vendas',
  'Recepção',
  'Estoque',
  'Cozinha',
  'Garçom',
  'Segurança',
  'Motorista',
  'Entrega',
  'Montagem',
  'Eventos',
  'Promoção',
];

export function WorkerProfilePage() {
  const { profile, workerProfile, refreshProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchingCep, setFetchingCep] = useState(false);
  // uploadingAvatar state removed - handled by AvatarUpload component
  const [avatarError, setAvatarError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState(profile?.name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [skills, setSkills] = useState<string[]>(workerProfile?.skills || []);
  const [pix, setPix] = useState(workerProfile?.pix_key || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');

  // Address fields
  const [cep, setCep] = useState(workerProfile?.cep || '');
  const [logradouro, setLogradouro] = useState(workerProfile?.logradouro || '');
  const [numero, setNumero] = useState(workerProfile?.numero || '');
  const [complemento, setComplemento] = useState(workerProfile?.complemento || '');
  const [bairro, setBairro] = useState(workerProfile?.bairro || '');
  const [cidade, setCidade] = useState(workerProfile?.cidade || '');
  const [uf, setUf] = useState(workerProfile?.uf || '');

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

      if (!data.erro) {
        setLogradouro(data.logradouro || '');
        setBairro(data.bairro || '');
        setCidade(data.localidade || '');
        setUf(data.uf || '');
        if (data.complemento) {
          setComplemento(data.complemento);
        }
      }
    } catch {
      // Silently fail, user can enter manually
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

  async function handleAvatarUpload(url: string) {
    setAvatarError(null);
    setAvatarUrl(url);

    // Save immediately when avatar changes
    try {
      const { error } = await supabaseUntyped
        .from('users')
        .update({ avatar_url: url })
        .eq('id', profile?.id);

      if (error) throw error;
      await refreshProfile();
    } catch (error) {
      console.error('Error updating avatar:', error);
      setAvatarError('Erro ao salvar foto. Tente novamente.');
    }
  }

  async function handleSave() {
    setLoading(true);
    try {
      // Build full address string
      const fullAddress = logradouro && numero && cidade && uf
        ? `${logradouro}, ${numero}${complemento ? ` - ${complemento}` : ''}, ${bairro}, ${cidade} - ${uf}, CEP: ${cep}`
        : null;

      // Update user profile
      const { error: userError } = await supabaseUntyped
        .from('users')
        .update({ name, phone: phone.replace(/\D/g, ''), avatar_url: avatarUrl })
        .eq('id', profile?.id);

      if (userError) throw userError;

      // Update worker profile
      const { error: workerError } = await supabaseUntyped
        .from('workers')
        .update({
          skills,
          pix_key: pix || null,
          address: fullAddress,
          cep: cep.replace(/\D/g, '') || null,
          logradouro: logradouro || null,
          numero: numero || null,
          complemento: complemento || null,
          bairro: bairro || null,
          cidade: cidade || null,
          uf: uf || null,
        })
        .eq('id', profile?.id);

      if (workerError) throw workerError;

      await refreshProfile();
      setEditing(false);
      toast.success('Perfil atualizado com sucesso!');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Erro ao atualizar perfil.');
    } finally {
      setLoading(false);
    }
  }

  function toggleSkill(skill: string) {
    if (skills.includes(skill)) {
      setSkills(skills.filter(s => s !== skill));
    } else {
      setSkills([...skills, skill]);
    }
  }

  function formatCpf(cpf: string) {
    if (!cpf) return '';
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
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

  function formatDisplayPhone(phoneNumber: string) {
    if (!phoneNumber) return 'Não informado';
    const numbers = phoneNumber.replace(/\D/g, '');
    if (numbers.length <= 10) {
      return numbers
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{4})(\d)/, '$1-$2');
    }
    return numbers
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2');
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Meu Perfil</h2>
        <p className="text-muted-foreground">Gerencie suas informações pessoais e habilidades</p>
      </div>

      {/* Profile Header Card */}
      <Card className="border-0 shadow-sm mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Avatar with upload option */}
            <div className="flex flex-col items-center gap-2">
              <AvatarUpload
                userId={profile?.id || ""}
                currentAvatarUrl={avatarUrl || profile?.avatar_url}
                name={profile?.name}
                onUploadComplete={handleAvatarUpload}
                onError={setAvatarError}
                size="lg"
              />
              {avatarError && (
                <p className="text-xs text-red-500">{avatarError}</p>
              )}
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h3 className="text-xl font-bold text-slate-900">{profile?.name}</h3>
              <p className="text-muted-foreground">{profile?.email}</p>
              <div className="mt-2">
                {workerProfile?.documents_verified ? (
                  <Badge className="bg-emerald-500 gap-1">
                    <Shield className="h-3 w-3" />
                    Verificado
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1 border-amber-300 text-amber-700 bg-amber-50">
                    <Shield className="h-3 w-3" />
                    Pendente
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-100 rounded-xl">
                <Briefcase className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-emerald-600">{workerProfile?.total_jobs || 0}</p>
                <p className="text-sm text-muted-foreground">Trabalhos Realizados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-100 rounded-xl">
                <Star className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-amber-600">
                  {workerProfile?.rating ? workerProfile.rating.toFixed(1) : '-'}
                </p>
                <p className="text-sm text-muted-foreground">Avaliação Média</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-white">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-xl">
                <CheckCircle className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-blue-600">
                  {workerProfile?.skills?.length || 0}
                </p>
                <p className="text-sm text-muted-foreground">Habilidades</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Profile Completeness - only show when not 100% complete */}
      <ProfileCompleteness
        profile={profile}
        workerProfile={workerProfile}
        variant="full"
        showEditButton={false}
        className="mb-6"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Personal Info Card */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="border-b bg-slate-50/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-slate-600" />
                <CardTitle className="text-lg">Informações Pessoais</CardTitle>
              </div>
              {!editing ? (
                <Button variant="ghost" size="sm" onClick={() => setEditing(true)} className="gap-1">
                  <Edit3 className="h-4 w-4" />
                  Editar
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSave} disabled={loading} className="gap-1">
                    <Save className="h-4 w-4" />
                    {loading ? 'Salvando...' : 'Salvar'}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={loading}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {editing ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    Nome Completo
                  </Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={loading}
                    className="bg-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    E-mail
                  </Label>
                  <Input
                    id="email"
                    value={profile?.email || ''}
                    disabled
                    className="bg-slate-50"
                  />
                  <p className="text-xs text-muted-foreground">O e-mail não pode ser alterado.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    Telefone
                  </Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(formatPhone(e.target.value))}
                    placeholder="(11) 99999-9999"
                    disabled={loading}
                    className="bg-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cpf" className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    CPF
                  </Label>
                  <Input
                    id="cpf"
                    value={formatCpf(workerProfile?.cpf || '')}
                    disabled
                    className="bg-slate-50"
                  />
                  <p className="text-xs text-muted-foreground">O CPF não pode ser alterado.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pix" className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                    Chave PIX
                  </Label>
                  <Input
                    id="pix"
                    value={pix}
                    onChange={(e) => setPix(e.target.value)}
                    placeholder="CPF, E-mail, Telefone ou Chave Aleatória"
                    disabled={loading}
                    className="bg-white"
                  />
                  <p className="text-xs text-muted-foreground">Usada para receber pagamentos</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <User className="h-5 w-5 text-slate-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Nome</p>
                    <p className="font-medium">{profile?.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <Mail className="h-5 w-5 text-slate-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">E-mail</p>
                    <p className="font-medium">{profile?.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <Phone className="h-5 w-5 text-slate-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Telefone</p>
                    <p className="font-medium">{formatDisplayPhone(profile?.phone || '')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <CreditCard className="h-5 w-5 text-slate-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">CPF</p>
                    <p className="font-medium">{formatCpf(workerProfile?.cpf || '')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <Wallet className="h-5 w-5 text-slate-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Chave PIX</p>
                    <p className="font-medium">{workerProfile?.pix_key || 'Não informada'}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Skills Card */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="border-b bg-slate-50/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-slate-600" />
                <CardTitle className="text-lg">Habilidades Profissionais</CardTitle>
              </div>
              {!editing && (
                <Button variant="ghost" size="sm" onClick={() => setEditing(true)} className="gap-1">
                  <Edit3 className="h-4 w-4" />
                  Editar
                </Button>
              )}
            </div>
            <CardDescription>
              {editing ? 'Clique para selecionar ou remover habilidades' : 'Suas competências profissionais'}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {editing ? (
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_SKILLS.map((skill) => (
                  <Badge
                    key={skill}
                    variant={skills.includes(skill) ? 'default' : 'outline'}
                    className={`cursor-pointer transition-all ${
                      skills.includes(skill)
                        ? 'bg-emerald-500 hover:bg-emerald-600'
                        : 'hover:bg-slate-100'
                    }`}
                    onClick={() => toggleSkill(skill)}
                  >
                    {skills.includes(skill) && <CheckCircle className="h-3 w-3 mr-1" />}
                    {skill}
                  </Badge>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {workerProfile?.skills && workerProfile.skills.length > 0 ? (
                  workerProfile.skills.map((skill) => (
                    <Badge key={skill} className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                      {skill}
                    </Badge>
                  ))
                ) : (
                  <div className="w-full text-center py-8">
                    <Briefcase className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-muted-foreground">Nenhuma habilidade cadastrada.</p>
                    <Button variant="outline" size="sm" className="mt-3" onClick={() => setEditing(true)}>
                      Adicionar Habilidades
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Address Card */}
      <Card className="border-0 shadow-sm mt-6">
        <CardHeader className="border-b bg-slate-50/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-slate-600" />
              <CardTitle className="text-lg">Endereço</CardTitle>
            </div>
            {!editing && (
              <Button variant="ghost" size="sm" onClick={() => setEditing(true)} className="gap-1">
                <Edit3 className="h-4 w-4" />
                Editar
              </Button>
            )}
          </div>
          <CardDescription>
            {editing ? 'Digite o CEP para buscar automaticamente' : 'Seu endereço cadastrado'}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {editing ? (
            <div className="space-y-4">
              {/* CEP with auto-search */}
              <div className="space-y-2">
                <Label htmlFor="cep" className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  CEP
                </Label>
                <div className="relative max-w-[200px]">
                  <Input
                    id="cep"
                    placeholder="00000-000"
                    value={cep}
                    onChange={(e) => handleCepChange(e.target.value)}
                    disabled={loading || fetchingCep}
                    className="bg-white pr-10"
                  />
                  {fetchingCep && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-primary" />
                  )}
                </div>
              </div>

              {/* Street and Number */}
              <div className="grid grid-cols-4 gap-3">
                <div className="col-span-3 space-y-2">
                  <Label htmlFor="logradouro" className="flex items-center gap-2">
                    <Home className="h-4 w-4 text-muted-foreground" />
                    Logradouro
                  </Label>
                  <Input
                    id="logradouro"
                    placeholder="Rua, Avenida..."
                    value={logradouro}
                    onChange={(e) => setLogradouro(e.target.value)}
                    disabled={loading}
                    className="bg-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="numero">Número</Label>
                  <Input
                    id="numero"
                    placeholder="123"
                    value={numero}
                    onChange={(e) => setNumero(e.target.value)}
                    disabled={loading}
                    className="bg-white"
                  />
                </div>
              </div>

              {/* Complement and Neighborhood */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="complemento">Complemento</Label>
                  <Input
                    id="complemento"
                    placeholder="Apto, Bloco..."
                    value={complemento}
                    onChange={(e) => setComplemento(e.target.value)}
                    disabled={loading}
                    className="bg-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bairro">Bairro</Label>
                  <Input
                    id="bairro"
                    placeholder="Bairro"
                    value={bairro}
                    onChange={(e) => setBairro(e.target.value)}
                    disabled={loading}
                    className="bg-white"
                  />
                </div>
              </div>

              {/* City and State */}
              <div className="grid grid-cols-4 gap-3">
                <div className="col-span-3 space-y-2">
                  <Label htmlFor="cidade" className="flex items-center gap-2">
                    <Map className="h-4 w-4 text-muted-foreground" />
                    Cidade
                  </Label>
                  <Input
                    id="cidade"
                    placeholder="Cidade"
                    value={cidade}
                    onChange={(e) => setCidade(e.target.value)}
                    disabled={loading}
                    className="bg-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="uf">UF</Label>
                  <Input
                    id="uf"
                    placeholder="SP"
                    value={uf}
                    onChange={(e) => setUf(e.target.value.toUpperCase().slice(0, 2))}
                    disabled={loading}
                    maxLength={2}
                    className="bg-white text-center"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div>
              {workerProfile?.address ? (
                <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg">
                  <MapPin className="h-5 w-5 text-slate-500 mt-0.5" />
                  <div>
                    <p className="font-medium">{workerProfile.address}</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <MapPin className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-muted-foreground">Nenhum endereço cadastrado.</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => setEditing(true)}>
                    Adicionar Endereço
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
