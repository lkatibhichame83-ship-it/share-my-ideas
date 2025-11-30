import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import SelectAccountType from "./pages/SelectAccountType";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import Home from "./pages/Home";
import WorkerProfile from "./pages/WorkerProfile";
import ClientProfile from "./pages/ClientProfile";
import WorkerList from "./pages/WorkerList";
import WorkerDetails from "./pages/WorkerDetails";
import AdminDashboard from "./pages/AdminDashboard";
import ServiceRequests from "./pages/ServiceRequests";
import Messages from "./pages/Messages";
import Payments from "./pages/Payments";
import WorkerStats from "./pages/WorkerStats";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/select-account-type" element={<SelectAccountType />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/login" element={<Login />} />
            <Route path="/workers" element={<WorkerList />} />
            <Route path="/worker/:userId" element={<WorkerDetails />} />
            <Route path="/worker-profile" element={<ProtectedRoute><WorkerProfile /></ProtectedRoute>} />
            <Route path="/client-profile" element={<ProtectedRoute><ClientProfile /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
            <Route path="/service-requests" element={<ProtectedRoute><ServiceRequests /></ProtectedRoute>} />
            <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
            <Route path="/payments" element={<ProtectedRoute><Payments /></ProtectedRoute>} />
            <Route path="/worker-stats" element={<ProtectedRoute><WorkerStats /></ProtectedRoute>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
