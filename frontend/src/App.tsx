import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./state/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Home from "./pages/Home";
import SavedComparisons from "./pages/SavedComparisons";
import SavedComparisonDetail from "./pages/SavedComparisonDetail";
import Cards from "./pages/Cards";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />
          <Route
            path="/saved"
            element={
              <ProtectedRoute>
                <SavedComparisons />
              </ProtectedRoute>
            }
          />
          <Route
            path="/saved/:id"
            element={
              <ProtectedRoute>
                <SavedComparisonDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/cards"
            element={
              <ProtectedRoute>
                <Cards />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
