import { Link } from "react-router-dom";
import { MainLayout } from "@/layouts/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Building2, Briefcase, Clock, DollarSign, Star, Shield, MapPin, CheckCircle, ArrowRight, Zap } from "lucide-react";

export function LandingPage() {
  return (
    <MainLayout>
      {/* Hero Section */}
      <section className="relative py-16 md:py-24 lg:py-32 overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-blue-50" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-200/20 rounded-full blur-3xl" />

        <div className="container relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-blue-100 text-[#082347] px-4 py-2 rounded-full text-sm font-medium mb-6">
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              Mais de 5.000 trabalhadores cadastrados
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 mb-6">
              Conectamos{" "}
              <span className="text-[#0A2A5A]">Talentos</span>{" "}
              a{" "}
              <span className="text-[#0A2A5A]">Oportunidades</span>
            </h1>

            <p className="text-lg md:text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
              A plataforma que facilita a contratação de trabalhadores temporários.
              Rápido, seguro e eficiente.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register">
                <Button size="lg" className="w-full sm:w-auto text-base px-8 h-12 rounded-xl bg-[#0A2A5A] hover:bg-[#082347] shadow-lg shadow-[#0A2A5A]/25 hover:shadow-xl hover:shadow-[#0A2A5A]/30 transition-all" >
                  <Users className="w-5 h-5 mr-2" />
                  Cadastre-se como Trabalhador
                </Button>
              </Link>
            </div>

            {/* Trust badges */}
            <div className="mt-12 flex flex-wrap items-center justify-center gap-6 md:gap-10">
              <div className="flex items-center gap-2 text-slate-600">
                <CheckCircle className="w-5 h-5 text-blue-500" />
                <span className="text-sm font-medium">Cadastro gratuito</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Shield className="w-5 h-5 text-blue-500" />
                <span className="text-sm font-medium">Pagamento seguro</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Clock className="w-5 h-5 text-blue-500" />
                <span className="text-sm font-medium">Suporte 24/7</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="como-funciona" className="py-16 md:py-24 bg-white">
        <div className="container">
          <div className="text-center mb-12 md:mb-16">
            <span className="text-[#0A2A5A] font-semibold text-sm uppercase tracking-wider">Simples e rápido</span>
            <h2 className="text-3xl md:text-4xl font-bold mt-2 text-slate-900">Como Funciona</h2>
            <p className="text-slate-600 mt-4 max-w-2xl mx-auto">
              Em apenas 3 passos você começa a trabalhar ou contratar
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 md:gap-8 max-w-5xl mx-auto">
            {[
              {
                step: "1",
                icon: <Users className="w-7 h-7" />,
                title: "Cadastre-se",
                description: "Crie sua conta gratuitamente em poucos minutos. Trabalhadores informam habilidades, empresas suas necessidades.",
                color: "blue"
              },
              {
                step: "2",
                icon: <Briefcase className="w-7 h-7" />,
                title: "Encontre",
                description: "Trabalhadores encontram vagas compatíveis. Empresas encontram profissionais qualificados e verificados.",
                color: "blue"
              },
              {
                step: "3",
                icon: <CheckCircle className="w-7 h-7" />,
                title: "Trabalhe",
                description: "Check-in e check-out pelo app. Pagamento garantido após a conclusão do trabalho.",
                color: "purple"
              },
            ].map((item, index) => (
              <Card key={index} className="relative border border-slate-200 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 bg-white overflow-visible">
                <CardContent className="pt-10 pb-6 px-6">
                  <div className="absolute -top-5 left-6">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg ${
                      item.color === 'blue' ? 'bg-[#0A2A5A] shadow-[#0A2A5A]/30' :
                      item.color === 'blue' ? 'bg-blue-600 shadow-blue-600/30' :
                      'bg-purple-600 shadow-purple-600/30'
                    }`}>
                      {item.icon}
                    </div>
                  </div>
                  <span className="text-6xl font-bold text-slate-100 absolute top-4 right-6">{item.step}</span>
                  <h3 className="text-xl font-bold mb-3 text-slate-900">{item.title}</h3>
                  <p className="text-slate-600 leading-relaxed">{item.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits - Workers */}
      <section id="para-trabalhadores" className="py-16 md:py-24 bg-slate-50">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center max-w-6xl mx-auto">
            <div>
              <span className="text-[#0A2A5A] font-semibold text-sm uppercase tracking-wider">Para Trabalhadores</span>
              <h2 className="text-3xl md:text-4xl font-bold mt-2 mb-6 text-slate-900">
                Encontre trabalhos que se encaixam na sua rotina
              </h2>
              <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                Tenha liberdade para escolher quando e onde trabalhar. Acesse centenas de oportunidades de trabalho temporário na sua região.
              </p>

              <div className="space-y-4">
                {[
                  { icon: <Clock className="w-5 h-5" />, title: "Flexibilidade de horários", desc: "Trabalhe quando quiser, sem compromissos fixos" },
                  { icon: <DollarSign className="w-5 h-5" />, title: "Pagamento rápido", desc: "Receba seu pagamento de forma segura e rápida" },
                  { icon: <Star className="w-5 h-5" />, title: "Construa sua reputação", desc: "Avaliações positivas aumentam suas chances" },
                  { icon: <MapPin className="w-5 h-5" />, title: "Trabalhos na sua região", desc: "Encontre oportunidades perto de você" },
                ].map((item, index) => (
                  <div key={index} className="flex items-start gap-4 p-4 rounded-xl bg-white border border-slate-200 hover:border-blue-200 hover:shadow-sm transition-all">
                    <div className="p-2 bg-blue-100 rounded-lg text-[#0A2A5A]">
                      {item.icon}
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900">{item.title}</h4>
                      <p className="text-sm text-slate-600">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Link to="/register" className="inline-block mt-8">
                <Button size="lg" className="rounded-xl bg-[#0A2A5A] hover:bg-[#082347]">
                  Cadastrar como Trabalhador
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>

            <div className="relative order-first lg:order-last">
              <div className="aspect-square bg-gradient-to-br from-blue-100 to-blue-50 rounded-3xl flex items-center justify-center p-8">
                <div className="text-center">
                  <div className="w-28 h-28 mx-auto mb-6 bg-[#0A2A5A] rounded-full flex items-center justify-center shadow-xl shadow-[#0A2A5A]/30">
                    <Users className="w-14 h-14 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">Milhares de vagas</h3>
                  <p className="text-slate-600">Encontre a oportunidade perfeita para você</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits - Companies */}
      <section id="para-empresas" className="py-16 md:py-24 bg-white">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center max-w-6xl mx-auto">
            <div className="relative">
              <div className="aspect-square bg-gradient-to-br from-blue-100 to-blue-50 rounded-3xl flex items-center justify-center p-8">
                <div className="text-center">
                  <div className="w-28 h-28 mx-auto mb-6 bg-blue-600 rounded-full flex items-center justify-center shadow-xl shadow-blue-600/30">
                    <Building2 className="w-14 h-14 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">Contratação ágil</h3>
                  <p className="text-slate-600">Encontre profissionais em minutos</p>
                </div>
              </div>
            </div>

            <div>
              <span className="text-blue-600 font-semibold text-sm uppercase tracking-wider">Para Empresas</span>
              <h2 className="text-3xl md:text-4xl font-bold mt-2 mb-6 text-slate-900">
                Contrate trabalhadores temporários de forma simples
              </h2>
              <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                Publique suas vagas e encontre profissionais qualificados e verificados. Gerencie tudo pela plataforma.
              </p>

              <div className="space-y-4">
                {[
                  { icon: <Shield className="w-5 h-5" />, title: "Profissionais verificados", desc: "Todos os trabalhadores passam por verificação" },
                  { icon: <Zap className="w-5 h-5" />, title: "Contratação rápida", desc: "Encontre profissionais em minutos, não dias" },
                  { icon: <Briefcase className="w-5 h-5" />, title: "Gestão simplificada", desc: "Controle de presença e relatórios completos" },
                  { icon: <DollarSign className="w-5 h-5" />, title: "Pagamento seguro", desc: "Pagamentos processados de forma segura" },
                ].map((item, index) => (
                  <div key={index} className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-blue-200 hover:shadow-sm transition-all">
                    <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                      {item.icon}
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900">{item.title}</h4>
                      <p className="text-sm text-slate-600">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <p className="text-sm text-blue-800">
                  <strong>Empresas:</strong> Entre em contato conosco para criar sua conta e começar a contratar trabalhadores temporários.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 md:py-20 bg-[#0A2A5A] text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
        <div className="container relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto text-center">
            {[
              { value: "5.000+", label: "Trabalhadores Cadastrados" },
              { value: "500+", label: "Empresas Parceiras" },
              { value: "10.000+", label: "Trabalhos Realizados" },
              { value: "4.8", label: "Avaliação Média" },
            ].map((stat, index) => (
              <div key={index} className="p-4">
                <div className="text-3xl md:text-4xl lg:text-5xl font-bold mb-2">{stat.value}</div>
                <div className="text-blue-100 text-sm md:text-base">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-24 bg-slate-50">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 text-slate-900">
              Pronto para começar?
            </h2>
            <p className="text-lg md:text-xl text-slate-600 mb-10 leading-relaxed">
              Cadastre-se gratuitamente e comece a encontrar oportunidades ou contratar trabalhadores temporários hoje mesmo.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register">
                <Button size="lg" className="w-full sm:w-auto text-base px-10 h-12 rounded-xl bg-[#0A2A5A] hover:bg-[#082347] shadow-lg shadow-[#0A2A5A]/25">
                  Cadastrar como Trabalhador
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="w-full sm:w-auto text-base px-10 h-12 rounded-xl border-2">
                Sou Empresa - Falar com Consultor
              </Button>
            </div>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
