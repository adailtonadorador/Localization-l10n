import { useEffect, useState } from "react";
import { toast } from "sonner";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabaseUntyped } from "@/lib/supabase";
import { ADMIN_MODULES, type AdminModule } from "@/hooks/useAdminPermissions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Users,
  Search,
  Shield,
  ShieldCheck,
  UserPlus,
  Mail,
  Phone,
  Calendar,
  Loader2,
  AlertTriangle,
  Crown,
  Settings2,
  Check,
} from "lucide-react";

interface UserRecord {
  id: string;
  email: string;
  name: string;
  role: "admin" | "worker" | "client";
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  is_super_admin: boolean;
}

const roleLabels: Record<string, string> = {
  admin: "Administrador",
  worker: "Prestador",
  client: "Cliente",
};

const roleBadgeColors: Record<string, string> = {
  admin: "bg-purple-100 text-purple-700 border-purple-200",
  worker: "bg-blue-100 text-blue-700 border-blue-200",
  client: "bg-green-100 text-green-700 border-green-200",
};

export function AdminUsersPage() {
  const { profile } = useAuth();
  const currentIsSuperAdmin = profile?.is_super_admin === true;

  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");

  // Create user dialog
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "",
    role: "admin" as string,
  });
  const [newUserPermissions, setNewUserPermissions] = useState<AdminModule[]>(
    ADMIN_MODULES.map((m) => m.key)
  );

  // Change role dialog
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [newRole, setNewRole] = useState("");
  const [changingRole, setChangingRole] = useState(false);

  // Permissions dialog
  const [showPermDialog, setShowPermDialog] = useState(false);
  const [permUser, setPermUser] = useState<UserRecord | null>(null);
  const [userPermissions, setUserPermissions] = useState<AdminModule[]>([]);
  const [savingPerms, setSavingPerms] = useState(false);
  const [loadingPerms, setLoadingPerms] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);
    try {
      const { data, error } = await supabaseUntyped
        .from("users")
        .select("id, email, name, role, phone, avatar_url, created_at, is_super_admin")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error("Error loading users:", error);
      toast.error("Erro ao carregar usuários");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);

    try {
      if (!newUser.name.trim() || !newUser.email.trim() || !newUser.password) {
        toast.error("Preencha todos os campos");
        setCreating(false);
        return;
      }

      if (newUser.password.length < 6) {
        toast.error("A senha deve ter pelo menos 6 caracteres");
        setCreating(false);
        return;
      }

      // Save current admin session
      const { data: currentSession } = await supabaseUntyped.auth.getSession();
      const adminSession = currentSession?.session;

      if (!adminSession) {
        toast.error("Sessão expirada. Faça login novamente.");
        setCreating(false);
        return;
      }

      const { data: signUpData, error: signUpError } =
        await supabaseUntyped.auth.signUp({
          email: newUser.email,
          password: newUser.password,
          options: {
            data: { name: newUser.name, role: newUser.role },
          },
        });

      if (signUpError) {
        // Restore admin session
        await supabaseUntyped.auth.setSession({
          access_token: adminSession.access_token,
          refresh_token: adminSession.refresh_token,
        });

        if (signUpError.message.includes("already registered")) {
          toast.error("Este e-mail já está cadastrado");
        } else {
          toast.error("Erro ao criar usuário: " + signUpError.message);
        }
        setCreating(false);
        return;
      }

      // Restore admin session immediately
      await supabaseUntyped.auth.setSession({
        access_token: adminSession.access_token,
        refresh_token: adminSession.refresh_token,
      });

      if (signUpData?.user?.id) {
        // Ensure role is set correctly
        await supabaseUntyped
          .from("users")
          .update({ role: newUser.role })
          .eq("id", signUpData.user.id);

        // If creating an admin user, save their permissions
        if (newUser.role === "admin" && newUserPermissions.length > 0) {
          const permRecords = newUserPermissions.map((module) => ({
            user_id: signUpData.user!.id,
            module,
          }));
          await supabaseUntyped.from("admin_permissions").insert(permRecords);
        }
      }

      toast.success(`Usuário ${newUser.name} criado com sucesso`);
      setShowCreateDialog(false);
      setNewUser({ name: "", email: "", password: "", role: "admin" });
      setNewUserPermissions(ADMIN_MODULES.map((m) => m.key));
      loadUsers();
    } catch (error) {
      console.error("Error creating user:", error);
      toast.error("Erro ao criar usuário");
    } finally {
      setCreating(false);
    }
  }

  function openRoleDialog(user: UserRecord) {
    setSelectedUser(user);
    setNewRole(user.role);
    setShowRoleDialog(true);
  }

  async function handleChangeRole() {
    if (!selectedUser || newRole === selectedUser.role) return;
    setChangingRole(true);

    try {
      const { error } = await supabaseUntyped
        .from("users")
        .update({ role: newRole })
        .eq("id", selectedUser.id);

      if (error) throw error;

      // If changing to admin, grant all permissions by default
      if (newRole === "admin") {
        const permRecords = ADMIN_MODULES.map((m) => ({
          user_id: selectedUser.id,
          module: m.key,
        }));
        await supabaseUntyped
          .from("admin_permissions")
          .upsert(permRecords, { onConflict: "user_id,module" });
      }

      // If changing from admin, remove permissions
      if (selectedUser.role === "admin" && newRole !== "admin") {
        await supabaseUntyped
          .from("admin_permissions")
          .delete()
          .eq("user_id", selectedUser.id);
      }

      toast.success(
        `Permissão de ${selectedUser.name} alterada para ${roleLabels[newRole]}`
      );
      setShowRoleDialog(false);
      setSelectedUser(null);
      loadUsers();
    } catch (error) {
      console.error("Error changing role:", error);
      toast.error("Erro ao alterar permissão");
    } finally {
      setChangingRole(false);
    }
  }

  async function openPermDialog(user: UserRecord) {
    setPermUser(user);
    setShowPermDialog(true);
    setLoadingPerms(true);

    const { data } = await supabaseUntyped
      .from("admin_permissions")
      .select("module")
      .eq("user_id", user.id);

    setUserPermissions(
      (data || []).map((p: { module: string }) => p.module as AdminModule)
    );
    setLoadingPerms(false);
  }

  function togglePermission(module: AdminModule) {
    setUserPermissions((prev) =>
      prev.includes(module)
        ? prev.filter((m) => m !== module)
        : [...prev, module]
    );
  }

  async function handleSavePermissions() {
    if (!permUser) return;
    setSavingPerms(true);

    try {
      // Delete all existing permissions
      await supabaseUntyped
        .from("admin_permissions")
        .delete()
        .eq("user_id", permUser.id);

      // Insert new permissions
      if (userPermissions.length > 0) {
        const permRecords = userPermissions.map((module) => ({
          user_id: permUser.id,
          module,
        }));
        await supabaseUntyped.from("admin_permissions").insert(permRecords);
      }

      toast.success(`Permissões de ${permUser.name} atualizadas`);
      setShowPermDialog(false);
      setPermUser(null);
    } catch (error) {
      console.error("Error saving permissions:", error);
      toast.error("Erro ao salvar permissões");
    } finally {
      setSavingPerms(false);
    }
  }

  async function toggleSuperAdmin(user: UserRecord) {
    const newValue = !user.is_super_admin;
    const action = newValue ? "promover a" : "remover de";

    try {
      const { error } = await supabaseUntyped
        .from("users")
        .update({ is_super_admin: newValue })
        .eq("id", user.id);

      if (error) throw error;

      toast.success(
        `${user.name} ${newValue ? "promovido a" : "removido de"} Super Admin`
      );
      loadUsers();
    } catch (error) {
      console.error("Error toggling super admin:", error);
      toast.error(`Erro ao ${action} Super Admin`);
    }
  }

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === "all" || user.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const adminCount = users.filter((u) => u.role === "admin").length;
  const workerCount = users.filter((u) => u.role === "worker").length;
  const clientCount = users.filter((u) => u.role === "client").length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Gerenciar Usuários
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {currentIsSuperAdmin
                ? "Cadastre usuários e gerencie permissões de acesso aos módulos"
                : "Visualize os usuários do sistema"}
            </p>
          </div>
          {currentIsSuperAdmin && (
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="gap-2"
            >
              <UserPlus className="h-4 w-4" />
              Novo Administrador
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <ShieldCheck className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{adminCount}</p>
                <p className="text-xs text-muted-foreground">Admins</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{workerCount}</p>
                <p className="text-xs text-muted-foreground">Prestadores</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{clientCount}</p>
                <p className="text-xs text-muted-foreground">Clientes</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou e-mail..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterRole} onValueChange={setFilterRole}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filtrar por tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="admin">Administradores</SelectItem>
              <SelectItem value="worker">Prestadores</SelectItem>
              <SelectItem value="client">Clientes</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Users list */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-12 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">
                Nenhum usuário encontrado
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filteredUsers.map((user) => (
              <Card
                key={user.id}
                className="border-0 shadow-sm hover:shadow-md transition-shadow"
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                          user.role === "admin"
                            ? "bg-purple-100 text-purple-700"
                            : user.role === "worker"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {user.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-slate-900 truncate">
                            {user.name}
                          </p>
                          {user.is_super_admin && (
                            <Badge className="bg-amber-100 text-amber-700 border-amber-200 gap-1 text-[10px] px-1.5 py-0">
                              <Crown className="h-3 w-3" />
                              Super
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1 truncate">
                            <Mail className="h-3 w-3 flex-shrink-0" />
                            {user.email}
                          </span>
                          {user.phone && (
                            <span className="hidden sm:flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {user.phone}
                            </span>
                          )}
                          <span className="hidden sm:flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(user.created_at).toLocaleDateString(
                              "pt-BR"
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge
                        variant="outline"
                        className={roleBadgeColors[user.role]}
                      >
                        {user.role === "admin" && (
                          <Shield className="h-3 w-3 mr-1" />
                        )}
                        {roleLabels[user.role]}
                      </Badge>
                      {currentIsSuperAdmin && (
                        <>
                          {user.role === "admin" &&
                            !user.is_super_admin &&
                            user.id !== profile?.id && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openPermDialog(user)}
                                className="text-xs gap-1"
                              >
                                <Settings2 className="h-3.5 w-3.5" />
                                Módulos
                              </Button>
                            )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openRoleDialog(user)}
                            className="text-xs"
                          >
                            Alterar
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create User Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo Administrador</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-name">Nome Completo *</Label>
              <Input
                id="new-name"
                placeholder="Nome do usuário"
                value={newUser.name}
                onChange={(e) =>
                  setNewUser({ ...newUser, name: e.target.value })
                }
                required
                disabled={creating}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-email">E-mail *</Label>
              <Input
                id="new-email"
                type="email"
                placeholder="email@exemplo.com"
                value={newUser.email}
                onChange={(e) =>
                  setNewUser({ ...newUser, email: e.target.value })
                }
                required
                disabled={creating}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">Senha *</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={newUser.password}
                onChange={(e) =>
                  setNewUser({ ...newUser, password: e.target.value })
                }
                required
                disabled={creating}
                minLength={6}
              />
            </div>

            {/* Module permissions */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Settings2 className="h-4 w-4" />
                Permissões de Módulos
              </Label>
              <div className="border rounded-lg divide-y">
                {ADMIN_MODULES.map((mod) => {
                  const isChecked = newUserPermissions.includes(mod.key);
                  return (
                    <label
                      key={mod.key}
                      className="flex items-center gap-3 p-3 cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                          isChecked
                            ? "bg-primary border-primary text-white"
                            : "border-slate-300"
                        }`}
                        onClick={() => {
                          setNewUserPermissions((prev) =>
                            prev.includes(mod.key)
                              ? prev.filter((m) => m !== mod.key)
                              : [...prev, mod.key]
                          );
                        }}
                      >
                        {isChecked && <Check className="h-3 w-3" />}
                      </div>
                      <div
                        className="flex-1"
                        onClick={() => {
                          setNewUserPermissions((prev) =>
                            prev.includes(mod.key)
                              ? prev.filter((m) => m !== mod.key)
                              : [...prev, mod.key]
                          );
                        }}
                      >
                        <p className="text-sm font-medium">{mod.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {mod.description}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() =>
                    setNewUserPermissions(ADMIN_MODULES.map((m) => m.key))
                  }
                >
                  Selecionar todos
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => setNewUserPermissions([])}
                >
                  Limpar
                </Button>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
                disabled={creating}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Criando...
                  </span>
                ) : (
                  "Criar Administrador"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Change Role Dialog */}
      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Permissão</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="font-medium">{selectedUser.name}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedUser.email}
                </p>
                <p className="text-sm mt-1">
                  Permissão atual:{" "}
                  <Badge
                    variant="outline"
                    className={roleBadgeColors[selectedUser.role]}
                  >
                    {roleLabels[selectedUser.role]}
                  </Badge>
                </p>
              </div>

              <div className="space-y-2">
                <Label>Nova Permissão</Label>
                <Select value={newRole} onValueChange={setNewRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="worker">Prestador</SelectItem>
                    <SelectItem value="client">Cliente</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {newRole === "admin" && selectedUser.role !== "admin" && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <p>
                    Este usuário receberá acesso ao painel administrativo.
                    Você poderá configurar os módulos depois.
                  </p>
                </div>
              )}

              {/* Super Admin toggle - only for admin users, only super admin can toggle */}
              {currentIsSuperAdmin &&
                selectedUser.role === "admin" &&
                newRole === "admin" &&
                selectedUser.id !== profile?.id && (
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <label className="flex items-center justify-between cursor-pointer">
                      <div className="flex items-center gap-2">
                        <Crown className="h-4 w-4 text-amber-600" />
                        <div>
                          <p className="text-sm font-medium">Super Admin</p>
                          <p className="text-xs text-muted-foreground">
                            Acesso total a todos os módulos e gerenciamento de
                            usuários
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleSuperAdmin(selectedUser)}
                        className={`relative w-11 h-6 rounded-full transition-colors ${
                          selectedUser.is_super_admin
                            ? "bg-amber-500"
                            : "bg-slate-300"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                            selectedUser.is_super_admin
                              ? "translate-x-5"
                              : ""
                          }`}
                        />
                      </button>
                    </label>
                  </div>
                )}

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowRoleDialog(false)}
                  disabled={changingRole}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleChangeRole}
                  disabled={changingRole || newRole === selectedUser.role}
                >
                  {changingRole ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Alterando...
                    </span>
                  ) : (
                    "Confirmar Alteração"
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Permissions Dialog */}
      <Dialog open={showPermDialog} onOpenChange={setShowPermDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Permissões de Módulos
            </DialogTitle>
          </DialogHeader>
          {permUser && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="font-medium">{permUser.name}</p>
                <p className="text-sm text-muted-foreground">
                  {permUser.email}
                </p>
              </div>

              {loadingPerms ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <>
                  <div className="border rounded-lg divide-y">
                    {ADMIN_MODULES.map((mod) => {
                      const isChecked = userPermissions.includes(mod.key);
                      return (
                        <label
                          key={mod.key}
                          className="flex items-center gap-3 p-3 cursor-pointer hover:bg-slate-50 transition-colors"
                        >
                          <div
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                              isChecked
                                ? "bg-primary border-primary text-white"
                                : "border-slate-300"
                            }`}
                            onClick={() => togglePermission(mod.key)}
                          >
                            {isChecked && <Check className="h-3 w-3" />}
                          </div>
                          <div
                            className="flex-1"
                            onClick={() => togglePermission(mod.key)}
                          >
                            <p className="text-sm font-medium">{mod.label}</p>
                            <p className="text-xs text-muted-foreground">
                              {mod.description}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() =>
                        setUserPermissions(ADMIN_MODULES.map((m) => m.key))
                      }
                    >
                      Selecionar todos
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => setUserPermissions([])}
                    >
                      Limpar
                    </Button>
                  </div>
                </>
              )}

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowPermDialog(false)}
                  disabled={savingPerms}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSavePermissions}
                  disabled={savingPerms || loadingPerms}
                >
                  {savingPerms ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Salvando...
                    </span>
                  ) : (
                    "Salvar Permissões"
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
