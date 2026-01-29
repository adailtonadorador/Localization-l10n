import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function RegisterPage() {
  const [activeTab, setActiveTab] = useState("worker");

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary">SAMA</h1>
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
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="worker">Sou Trabalhador</TabsTrigger>
                <TabsTrigger value="client">Sou Empresa</TabsTrigger>
              </TabsList>

              <TabsContent value="worker" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="worker-name">Nome Completo</Label>
                    <Input id="worker-name" placeholder="João Silva" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="worker-cpf">CPF</Label>
                    <Input id="worker-cpf" placeholder="000.000.000-00" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="worker-email">E-mail</Label>
                  <Input id="worker-email" type="email" placeholder="seu@email.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="worker-phone">Telefone</Label>
                  <Input id="worker-phone" placeholder="(11) 99999-9999" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="worker-password">Senha</Label>
                  <Input id="worker-password" type="password" placeholder="••••••••" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="worker-password-confirm">Confirmar Senha</Label>
                  <Input id="worker-password-confirm" type="password" placeholder="••••••••" />
                </div>
              </TabsContent>

              <TabsContent value="client" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="client-company">Nome da Empresa</Label>
                  <Input id="client-company" placeholder="Empresa LTDA" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="client-cnpj">CNPJ</Label>
                    <Input id="client-cnpj" placeholder="00.000.000/0000-00" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="client-phone">Telefone</Label>
                    <Input id="client-phone" placeholder="(11) 99999-9999" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client-name">Nome do Responsável</Label>
                  <Input id="client-name" placeholder="Nome completo" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client-email">E-mail</Label>
                  <Input id="client-email" type="email" placeholder="contato@empresa.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client-password">Senha</Label>
                  <Input id="client-password" type="password" placeholder="••••••••" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client-password-confirm">Confirmar Senha</Label>
                  <Input id="client-password-confirm" type="password" placeholder="••••••••" />
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button className="w-full">
              Criar Conta {activeTab === "worker" ? "de Trabalhador" : "Empresarial"}
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              Já tem uma conta?{" "}
              <a href="/login" className="text-primary hover:underline">
                Entrar
              </a>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
