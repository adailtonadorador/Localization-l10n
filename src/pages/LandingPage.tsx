import { MainLayout } from "@/layouts/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function LandingPage() {
  return (
    <MainLayout>
      {/* Hero Section */}
      <section className="py-20 md:py-32 bg-gradient-to-b from-primary/5 to-background">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              Conectamos <span className="text-primary">Talentos</span> a{" "}
              <span className="text-primary">Oportunidades</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              A plataforma que facilita a contratação de trabalhadores temporários.
              Rápido, seguro e eficiente.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="text-lg px-8">
                Sou Trabalhador
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8">
                Sou Empresa
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20 bg-muted/50">
        <div className="container">
          <h2 className="text-3xl font-bold text-center mb-12">Como Funciona</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <span className="text-2xl font-bold text-primary">1</span>
                </div>
                <CardTitle>Cadastre-se</CardTitle>
                <CardDescription>
                  Crie sua conta gratuitamente em poucos minutos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Trabalhadores cadastram suas habilidades e disponibilidade.
                  Empresas cadastram suas necessidades.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <span className="text-2xl font-bold text-primary">2</span>
                </div>
                <CardTitle>Encontre</CardTitle>
                <CardDescription>
                  Busque oportunidades ou trabalhadores
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Trabalhadores encontram vagas compatíveis.
                  Empresas encontram profissionais qualificados.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <span className="text-2xl font-bold text-primary">3</span>
                </div>
                <CardTitle>Trabalhe</CardTitle>
                <CardDescription>
                  Realize o trabalho e receba seu pagamento
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Check-in e check-out pelo app.
                  Pagamento garantido após a conclusão do trabalho.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">Para Trabalhadores</h2>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <span className="text-primary">✓</span>
                  <span>Flexibilidade de horários - trabalhe quando quiser</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary">✓</span>
                  <span>Diversas oportunidades em diferentes áreas</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary">✓</span>
                  <span>Pagamento rápido e seguro</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary">✓</span>
                  <span>Construa sua reputação e ganhe mais</span>
                </li>
              </ul>
              <Button className="mt-6">Criar Conta de Trabalhador</Button>
            </div>

            <div>
              <h2 className="text-3xl font-bold mb-6">Para Empresas</h2>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <span className="text-primary">✓</span>
                  <span>Acesso a profissionais verificados</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary">✓</span>
                  <span>Contratação rápida para demandas urgentes</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary">✓</span>
                  <span>Gestão simplificada de trabalhadores temporários</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary">✓</span>
                  <span>Relatórios e controle de presença</span>
                </li>
              </ul>
              <Button variant="outline" className="mt-6">Criar Conta Empresarial</Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl md:text-5xl font-bold mb-2">5.000+</div>
              <div className="text-primary-foreground/80">Trabalhadores Cadastrados</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-bold mb-2">500+</div>
              <div className="text-primary-foreground/80">Empresas Parceiras</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-bold mb-2">10.000+</div>
              <div className="text-primary-foreground/80">Trabalhos Realizados</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-bold mb-2">4.8</div>
              <div className="text-primary-foreground/80">Avaliação Média</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container">
          <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="py-12 text-center">
              <h2 className="text-3xl font-bold mb-4">Comece Agora</h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                Cadastre-se gratuitamente e comece a encontrar oportunidades ou
                contratar trabalhadores temporários hoje mesmo.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg">Criar Conta Gratuita</Button>
                <Button size="lg" variant="outline">Falar com Consultor</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </MainLayout>
  );
}
