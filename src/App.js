import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Toaster } from "./components/ui/toaster";
import { AuthProvider } from "./contexts/AuthContext";
import { DataProvider } from "./contexts/DataContext";
import { ThemeProvider } from "./components/theme-provider";
import ProtectedRoute from "./components/ProtectedRoute";

// Pages
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import PropertiesPage from "./pages/PropertiesPage";
import PropertyDetailsPage from "./pages/PropertyDetailsPage";
import AddPropertyPage from "./pages/AddPropertyPage";
import ApartmentsPage from "./pages/ApartmentsPage";
import ApartmentDetailsPage from "./pages/ApartmentDetailsPage";
import AddApartmentPage from "./pages/AddApartmentPage";
import ClientsPage from "./pages/ClientsPage";
import ClientDetailsPage from "./pages/ClientDetailsPage";
import AddClientPage from "./pages/AddClientPage";
import DocumentsPage from "./pages/DocumentsPage";
import PaymentsPage from "./pages/PaymentsPage";
import SuppliersPage from "./pages/SuppliersPage";
import SupplierDetailsPage from "./pages/SupplierDetailsPage";
import AddSupplierPage from "./pages/AddSupplierPage";
import ExpensesPage from "./pages/ExpensesPage";
import InvoicesPage from "./pages/InvoicesPage";
import ReportsPage from "./pages/ReportsPage";
import SettingsPage from "./pages/SettingsPage";
import UsersPage from "./pages/UsersPage";
import RolesPage from "./pages/RolesPage";
import AddRolePage from "./pages/AddRolePage";

function App() {
  const token = localStorage.getItem("access_token"); // Tokenni localStorage'dan olish

  return (
    <ThemeProvider defaultTheme="light">
      <AuthProvider>
        <DataProvider>
          <Router>
            <Routes>
              {/* Agar token mavjud bo'lmasa, foydalanuvchini login sahifasiga yo'naltirish */}
              {!token ? (
                <Route path="*" element={<Navigate to="/login" replace />} />
              ) : (
                <>
                  {/* Agar token mavjud bo'lsa, bosh sahifaga va boshqa marshrutlarga yo'naltirish */}
                  <Route path="/login" element={<Navigate to="/" replace />} />
                  <Route
                    path="/"
                    element={
                      <ProtectedRoute>
                        <DashboardPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/properties"
                    element={
                      <ProtectedRoute>
                        <PropertiesPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/properties/:id"
                    element={
                      <ProtectedRoute>
                        <PropertyDetailsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/properties/add"
                    element={
                      <ProtectedRoute requiredRole="admin">
                        <AddPropertyPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/apartments"
                    element={
                      <ProtectedRoute>
                        <ApartmentsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/apartments/:id"
                    element={
                      <ProtectedRoute>
                        <ApartmentDetailsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/apartments/add"
                    element={
                      <ProtectedRoute requiredRole="admin">
                        <AddApartmentPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/clients"
                    element={
                      <ProtectedRoute>
                        <ClientsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/clients/:id"
                    element={
                      <ProtectedRoute>
                        <ClientDetailsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/clients/add"
                    element={
                      <ProtectedRoute>
                        <AddClientPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/documents"
                    element={
                      <ProtectedRoute>
                        <DocumentsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/payments"
                    element={
                      <ProtectedRoute>
                        <PaymentsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/suppliers"
                    element={
                      <ProtectedRoute requiredRole="accountant">
                        <SuppliersPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/suppliers/:id"
                    element={
                      <ProtectedRoute requiredRole="accountant">
                        <SupplierDetailsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/suppliers/add"
                    element={
                      <ProtectedRoute requiredRole="accountant">
                        <AddSupplierPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/expenses"
                    element={
                      <ProtectedRoute requiredRole="accountant">
                        <ExpensesPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/invoices"
                    element={
                      <ProtectedRoute requiredRole="accountant">
                        <InvoicesPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/reports"
                    element={
                      <ProtectedRoute requiredRole="accountant">
                        <ReportsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/settings"
                    element={
                      <ProtectedRoute requiredRole="admin">
                        <SettingsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/settings/users"
                    element={
                      <ProtectedRoute requiredRole="admin">
                        <UsersPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/settings/roles"
                    element={
                      <ProtectedRoute requiredRole="admin">
                        <RolesPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/settings/roles/add"
                    element={
                      <ProtectedRoute requiredRole="admin">
                        <AddRolePage />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </>
              )}
            </Routes>
          </Router>
          <Toaster />
        </DataProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;