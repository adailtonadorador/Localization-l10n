import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { PWAUpdatePrompt } from "@/components/PWAUpdatePrompt";
import { initOneSignal } from "@/lib/onesignal";
import { useNotifications, useRealtimeSubscription } from "@/hooks/useNotifications";
import { LandingPage } from "@/pages/LandingPage";
import { LoginPage } from "@/pages/auth/LoginPage";
import { RegisterPage } from "@/pages/auth/RegisterPage";
import { ForgotPasswordPage } from "@/pages/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "@/pages/auth/ResetPasswordPage";
import { CompleteProfilePage } from "@/pages/auth/CompleteProfilePage";

// Worker pages
import { WorkerDashboard } from "@/pages/worker/WorkerDashboard";
import { WorkerJobsPage } from "@/pages/worker/WorkerJobsPage";
import { WorkerMyJobsPage } from "@/pages/worker/WorkerMyJobsPage";
import { WorkerProfilePage } from "@/pages/worker/WorkerProfilePage";
import { WorkerHistoryPage } from "@/pages/worker/WorkerHistoryPage";

// Client pages
import { ClientDashboard } from "@/pages/client/ClientDashboard";
import { ClientJobsPage } from "@/pages/client/ClientJobsPage";
// ClientNewJobPage removido - somente admin cria vagas
import { ClientWorkersPage } from "@/pages/client/ClientWorkersPage";
import { ClientHistoryPage } from "@/pages/client/ClientHistoryPage";

// Admin pages
import { AdminDashboard } from "@/pages/admin/AdminDashboard";
import { AdminNewJobPage } from "@/pages/admin/AdminNewJobPage";
import { AdminMonitoringPage } from "@/pages/admin/AdminMonitoringPage";
import { AdminClientsPage } from "@/pages/admin/AdminClientsPage";
import { AdminClientDetailPage } from "@/pages/admin/AdminClientDetailPage";
import { AdminNewClientPage } from "@/pages/admin/AdminNewClientPage";
import { AdminWorkersPage } from "@/pages/admin/AdminWorkersPage";
import { AdminWithdrawalsPage } from "@/pages/admin/AdminWithdrawalsPage";

function AuthRedirect({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, isProfileComplete } = useAuth();

  // Se está carregando e não tem profile em cache, mostrar loading
  if (loading && !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Redireciona para dashboard se tem usuário OU profile em cache
  // Isso evita que usuário logado veja tela de login durante navegação
  if (user || profile) {
    if (profile) {
      if (!isProfileComplete && profile.role !== 'admin') {
        return <Navigate to="/complete-profile" replace />;
      }

      const redirectPath = profile.role === 'worker'
        ? '/worker'
        : profile.role === 'client'
          ? '/client'
          : '/admin';
      return <Navigate to={redirectPath} replace />;
    }

    // Tem user mas não tem profile, aguardar carregamento
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <>{children}</>;
}

// Componente para gerenciar notificações (inicialização e realtime)
function NotificationManager() {
  // Hook que gerencia o estado das notificações e registra o usuário
  useNotifications();
  // Hook que inscreve em eventos realtime do Supabase
  useRealtimeSubscription();
  return null;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<LandingPage />} />
      <Route
        path="/login"
        element={
          <AuthRedirect>
            <LoginPage />
          </AuthRedirect>
        }
      />
      <Route
        path="/register"
        element={
          <AuthRedirect>
            <RegisterPage />
          </AuthRedirect>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <AuthRedirect>
            <ForgotPasswordPage />
          </AuthRedirect>
        }
      />
      <Route
        path="/reset-password"
        element={<ResetPasswordPage />}
      />

      {/* Complete Profile route */}
      <Route
        path="/complete-profile"
        element={
          <ProtectedRoute requireCompleteProfile={false}>
            <CompleteProfilePage />
          </ProtectedRoute>
        }
      />

      {/* Worker routes */}
      <Route
        path="/worker"
        element={
          <ProtectedRoute allowedRoles={['worker']}>
            <WorkerDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/worker/jobs"
        element={
          <ProtectedRoute allowedRoles={['worker']}>
            <WorkerJobsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/worker/my-jobs"
        element={
          <ProtectedRoute allowedRoles={['worker']}>
            <WorkerMyJobsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/worker/history"
        element={
          <ProtectedRoute allowedRoles={['worker']}>
            <WorkerHistoryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/worker/profile"
        element={
          <ProtectedRoute allowedRoles={['worker']}>
            <WorkerProfilePage />
          </ProtectedRoute>
        }
      />

      {/* Client routes */}
      <Route
        path="/client"
        element={
          <ProtectedRoute allowedRoles={['client']}>
            <ClientDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/client/jobs"
        element={
          <ProtectedRoute allowedRoles={['client']}>
            <ClientJobsPage />
          </ProtectedRoute>
        }
      />
{/* Rota de criação de vagas removida - somente admin cria vagas */}
      <Route
        path="/client/workers"
        element={
          <ProtectedRoute allowedRoles={['client']}>
            <ClientWorkersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/client/history"
        element={
          <ProtectedRoute allowedRoles={['client']}>
            <ClientHistoryPage />
          </ProtectedRoute>
        }
      />

      {/* Admin routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/clients"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminClientsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/clients/new"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminNewClientPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/clients/:id"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminClientDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/workers"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminWorkersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/jobs/new"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminNewJobPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/monitoring"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminMonitoringPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/withdrawals"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminWithdrawalsPage />
          </ProtectedRoute>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  // Inicializa o OneSignal uma vez quando o app carrega
  useEffect(() => {
    initOneSignal().catch((error) => {
      console.error('[App] Erro ao inicializar OneSignal:', error);
    });
  }, []);

  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <NotificationManager />
        <PWAUpdatePrompt />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
