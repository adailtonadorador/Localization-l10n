import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LandingPage } from "@/pages/LandingPage";
import { LoginPage } from "@/pages/auth/LoginPage";
import { RegisterPage } from "@/pages/auth/RegisterPage";
import { WorkerDashboard } from "@/pages/worker/WorkerDashboard";
import { ClientDashboard } from "@/pages/client/ClientDashboard";
import { AdminDashboard } from "@/pages/admin/AdminDashboard";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Worker routes */}
        <Route path="/worker" element={<WorkerDashboard />} />

        {/* Client routes */}
        <Route path="/client" element={<ClientDashboard />} />

        {/* Admin routes */}
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
