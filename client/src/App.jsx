import React from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/auth.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import SignupPage from "./pages/SignupPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import NewOrderPage from "./pages/NewOrderPage.jsx";
import MyOrdersPage from "./pages/MyOrdersPage.jsx";
import AdminPage from "./pages/AdminPage.jsx";
import AppShell from "./components/AppShell.jsx";

function RequireAuth({ children, mode }) {
  const { isAuthed, activeMode, user } = useAuth();
  const loc = useLocation();
  if (!isAuthed) return <Navigate to="/" replace state={{ from: loc.pathname }} />;
  if (mode && activeMode !== mode) {
    // wrong session selected
    return <Navigate to="/" replace state={{ from: loc.pathname }} />;
  }
  if (mode === "admin" && user?.role !== "admin") {
    return <Navigate to="/" replace state={{ from: loc.pathname }} />;
  }
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        <Route
          path="/app"
          element={
            <RequireAuth mode="user">
              <AppShell>
                <DashboardPage />
              </AppShell>
            </RequireAuth>
          }
        />
        <Route
          path="/app/new"
          element={
            <RequireAuth mode="user">
              <AppShell>
                <NewOrderPage />
              </AppShell>
            </RequireAuth>
          }
        />
        <Route
          path="/app/orders"
          element={
            <RequireAuth mode="user">
              <AppShell>
                <MyOrdersPage />
              </AppShell>
            </RequireAuth>
          }
        />
        <Route
          path="/admin"
          element={
            <RequireAuth mode="admin">
              <AppShell>
                <AdminPage />
              </AppShell>
            </RequireAuth>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
