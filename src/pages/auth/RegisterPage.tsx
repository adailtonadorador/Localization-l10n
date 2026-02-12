import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Mail, Lock, CheckCircle2, Shield, ArrowRight } from "lucide-react";

export function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  const { signUp } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== passwordConfirm) {
      setError("As senhas não coincidem");
      return;
    }

    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    setLoading(true);

    const { error } = await signUp(email, password, {
      name,
      role: 'worker',
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
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-green-50 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-200/30 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-green-200/20 rounded-full blur-3xl" />
        </div>

        <div className="w-full max-w-md relative z-10">
          <Card className="border-0 shadow-xl shadow-slate-200/50 backdrop-blur-sm bg-white/90">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <CardTitle className="text-2xl font-bold text-emerald-600">Conta criada com sucesso!</CardTitle>
              <CardDescription className="text-base mt-2">
                Enviamos um e-mail de confirmação para você. Por favor, verifique sua caixa de entrada e clique no link para ativar sua conta.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
                <p className="font-medium mb-1">Dica importante:</p>
                <p>Verifique também a pasta de spam caso não encontre o e-mail na caixa de entrada.</p>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={() => navigate('/login')} className="w-full h-11 font-medium bg-emerald-600 hover:bg-emerald-700">
                <span className="flex items-center gap-2">
                  Ir para Login
                  <ArrowRight className="h-4 w-4" />
                </span>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 flex items-center justify-center p-4 py-8 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-200/20 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex flex-col items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-14 h-14 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-600/25">
              <span className="text-2xl font-bold text-white">S</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">SAMA</h1>
              <p className="text-xs text-slate-500">Trabalhos Temporários</p>
            </div>
          </Link>
        </div>

        <Card className="border-0 shadow-xl shadow-slate-200/50 backdrop-blur-sm bg-white/90">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl font-bold text-center text-slate-900">Criar Conta de Trabalhador</CardTitle>
            <CardDescription className="text-center">
              Preencha seus dados básicos para começar
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-red-600 text-xs">!</span>
                </div>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium text-slate-700">Nome Completo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="name"
                    placeholder="João Silva"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    disabled={loading}
                    autoComplete="name"
                    className="pl-10 h-10 bg-white text-base"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-slate-700">E-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    autoComplete="email"
                    className="pl-10 h-10 bg-white text-base"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-slate-700">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading}
                      autoComplete="new-password"
                      className="pl-10 h-10 bg-white text-base"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password-confirm" className="text-sm font-medium text-slate-700">Confirmar</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="password-confirm"
                      type="password"
                      placeholder="••••••••"
                      value={passwordConfirm}
                      onChange={(e) => setPasswordConfirm(e.target.value)}
                      required
                      disabled={loading}
                      autoComplete="new-password"
                      className="pl-10 h-10 bg-white text-base"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 text-sm text-emerald-700">
                <p>Após o cadastro, você completará seu perfil com telefone, CPF, PIX e endereço.</p>
              </div>

              <Button
                type="submit"
                className="w-full h-11 font-medium bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/25 hover:shadow-emerald-600/40 transition-all"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Criando conta...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Criar Conta de Trabalhador
                    <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col gap-4 pt-0">
            <div className="relative w-full">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-400">ou</span>
              </div>
            </div>
            <p className="text-sm text-slate-600 text-center">
              Já tem uma conta?{" "}
              <Link to="/login" className="text-emerald-600 hover:text-emerald-700 font-semibold">
                Entrar
              </Link>
            </p>
          </CardFooter>
        </Card>

        {/* Security badge */}
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-500">
          <Shield className="h-4 w-4" />
          <span>Seus dados estão protegidos com criptografia</span>
        </div>
      </div>
    </div>
  );
}
