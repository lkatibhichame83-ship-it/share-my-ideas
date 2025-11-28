import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
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
            <Route path="/worker-profile" element={<WorkerProfile />} />
            <Route path="/client-profile" element={<ClientProfile />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/service-requests" element={<ServiceRequests />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/payments" element={<Payments />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
