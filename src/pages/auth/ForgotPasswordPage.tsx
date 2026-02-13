import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, ArrowLeft, CheckCircle2, Shield } from "lucide-react";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        setError(getErrorMessage(error.message));
      } else {
        setSuccess(true);
      }
    } catch {
      setError("Erro ao enviar e-mail. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  function getErrorMessage(message: string): string {
    if (message.includes("rate limit")) {
      return "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
    }
    if (message.includes("User not found")) {
      return "E-mail não encontrado.";
    }
    return "Erro ao enviar e-mail de recuperação. Tente novamente.";
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-blue-200/30 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-200/20 rounded-full blur-3xl" />
        </div>

        <div className="w-full max-w-md relative z-10">
          {/* Logo */}
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex flex-col items-center gap-2 hover:opacity-80 transition-opacity">
              <img src="/logo.png" alt="Sama Conecta" className="w-16 h-16 object-contain" />
            </Link>
          </div>

          <Card className="border-0 shadow-xl shadow-slate-200/50 backdrop-blur-sm bg-white/90">
            <CardContent className="pt-8 pb-8 text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-8 w-8 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">E-mail enviado!</h2>
              <p className="text-slate-600 mb-6">
                Enviamos um link de recuperação para <strong>{email}</strong>.
                Verifique sua caixa de entrada e spam.
              </p>
              <Link to="/login">
                <Button variant="outline" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Voltar para o login
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-200/20 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex flex-col items-center gap-3 hover:opacity-80 transition-opacity">
            <img src="/logo.png" alt="Sama Conecta" className="w-16 h-16 object-contain" />
            <div>
              <h1 className="text-2xl font-bold text-[#0A2A5A]">Sama Conecta</h1>
              <p className="text-sm text-slate-500">Conectando Oportunidades</p>
            </div>
          </Link>
        </div>

        <Card className="border-0 shadow-xl shadow-slate-200/50 backdrop-blur-sm bg-white/90">
          <form onSubmit={handleSubmit}>
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-2xl font-bold text-center text-slate-900">Recuperar senha</CardTitle>
              <CardDescription className="text-center">
                Digite seu e-mail para receber um link de recuperação
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <div className="p-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-red-600 text-xs">!</span>
                  </div>
                  {error}
                </div>
              )}

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
                    className="pl-10 h-11 bg-white border-slate-200 focus:border-blue-500 focus:ring-blue-500 text-base"
                  />
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-4 pt-2">
              <Button
                type="submit"
                className="w-full h-11 text-base font-medium bg-[#0A2A5A] hover:bg-[#082347] shadow-lg shadow-[#0A2A5A]/25 hover:shadow-[#0A2A5A]/40 transition-all"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Enviando...
                  </span>
                ) : (
                  "Enviar link de recuperação"
                )}
              </Button>

              <Link to="/login" className="w-full">
                <Button variant="ghost" className="w-full gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Voltar para o login
                </Button>
              </Link>
            </CardFooter>
          </form>
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
