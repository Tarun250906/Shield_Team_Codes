import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./lib/auth";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./layout/AppLayout";
import Login from "./pages/Login";
import Overview from "./pages/Overview";
import Alerts from "./pages/Alerts";
import Accounts from "./pages/Accounts";
import AccountDetail from "./pages/AccountDetail";
import NetworkPage from "./pages/NetworkPage";
import Investigations from "./pages/Investigations";
import SarQueue from "./pages/SarQueue";
import Validate from "./pages/Validate";
import ModelMonitor from "./pages/ModelMonitor";
import DataFeeds from "./pages/DataFeeds";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/overview" replace />} />
            <Route path="/overview" element={<Overview />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/accounts" element={<Accounts />} />
            <Route path="/accounts/:id" element={<AccountDetail />} />
            <Route path="/network" element={<NetworkPage />} />
            <Route path="/investigations" element={<Investigations />} />
            <Route path="/sar" element={<SarQueue />} />
            <Route path="/validate" element={<Validate />} />
            <Route path="/model-monitor" element={<ModelMonitor />} />
            <Route path="/data-feeds" element={<DataFeeds />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
}
