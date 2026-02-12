import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { AdminNewClientForm } from "@/components/admin/AdminNewClientForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AdminNewClientPage() {
  const navigate = useNavigate();

  function handleSuccess(_clientId: string) {
    // Show success message and redirect to clients list
    toast.success('Cliente cadastrado com sucesso!', {
      description: 'O cliente já pode acessar a plataforma com as credenciais criadas.'
    });
    navigate('/admin/clients');
  }

  function handleCancel() {
    navigate('/admin/clients');
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header with back button */}
        <div className="mb-6 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCancel}
            className="h-10 w-10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="h-6 w-6 text-primary" />
              Cadastrar Novo Cliente
            </h2>
            <p className="text-muted-foreground">
              Preencha os dados do cliente e crie suas credenciais de acesso
            </p>
          </div>
        </div>

        {/* Breadcrumb */}
        <div className="mb-6 text-sm text-muted-foreground">
          <span className="hover:text-primary cursor-pointer" onClick={() => navigate('/admin')}>
            Dashboard
          </span>
          {" / "}
          <span className="hover:text-primary cursor-pointer" onClick={() => navigate('/admin/clients')}>
            Clientes
          </span>
          {" / "}
          <span className="text-slate-900 font-medium">Novo Cliente</span>
        </div>

        {/* Info Card */}
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <p className="text-sm text-blue-800">
              <strong>Importante:</strong> O cliente receberá as credenciais de acesso que você definir aqui.
              Certifique-se de informar o email e senha ao cliente após o cadastro.
            </p>
          </CardContent>
        </Card>

        {/* Form Card */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Dados do Cliente</CardTitle>
            <CardDescription>
              Todos os campos marcados com * são obrigatórios
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AdminNewClientForm
              onSuccess={handleSuccess}
              onCancel={handleCancel}
            />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
