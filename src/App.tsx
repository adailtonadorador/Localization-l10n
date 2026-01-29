import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { LandingPage } from "@/pages/LandingPage";
import { LoginPage } from "@/pages/auth/LoginPage";
import { RegisterPage } from "@/pages/auth/RegisterPage";
import { CompleteProfilePage } from "@/pages/auth/CompleteProfilePage";
import { WorkerDashboard } from "@/pages/worker/WorkerDashboard";
import { ClientDashboard } from "@/pages/client/ClientDashboard";
import { AdminDashboard } from "@/pages/admin/AdminDashboard";

function AuthRedirect({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, isProfileComplete } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (user && profile) {
    // If profile is not complete, redirect to complete profile page
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

  return <>{children}</>;
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
        path="/worker/*"
        element={
          <ProtectedRoute allowedRoles={['worker']}>
            <WorkerDashboard />
          </ProtectedRoute>
        }
      />

      {/* Client routes */}
      <Route
        path="/client/*"
        element={
          <ProtectedRoute allowedRoles={['client']}>
            <ClientDashboard />
          </ProtectedRoute>
        }
      />

      {/* Admin routes */}
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
