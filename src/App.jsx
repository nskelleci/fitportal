import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import SplashScreen from "./components/SplashScreen";
import { useAuth } from "./contexts/AuthContext";

// Pages
import Login from "./pages/Login";
import Register from "./pages/Register";
import MemberDashboard from "./pages/MemberDashboard";
import TrainerDashboard from "./pages/TrainerDashboard";
import AdminDashboard from "./pages/AdminDashboard";

const Unauthorized = () => (
  <div className="h-screen flex flex-col items-center justify-center bg-slate-50">
    <h1 className="text-4xl font-bold text-red-500 mb-2">403</h1>
    <p className="text-slate-600">Bu sayfaya erişim yetkiniz yok.</p>
  </div>
);

const Home = () => {
  const { userProfile, loading, currentUser } = useAuth();
  
  if (loading) return <SplashScreen />;

  // Debugging output in case of empty screen
  if (!currentUser) return <Navigate to="/login" />;
  if (!userProfile) return <div className="p-8 text-center h-screen flex flex-col items-center justify-center">
    <p className="mb-4">Kullanıcı profili bekleniyor...</p> 
    <button onClick={() => window.location.href = '/login'} className="text-blue-500 underline">Giriş Ekranına Dön</button>
  </div>;

  if (userProfile.role === 'admin') return <Navigate to="/admin" />;
  if (userProfile.role === 'trainer') return <Navigate to="/trainer" />;
  return <Navigate to="/dashboard" />; // Member dashboard
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* Root Redirector */}
        <Route path="/" element={<Home />} />

        {/* Member Routes */}
        <Route path="/dashboard" element={
          <ProtectedRoute allowedRoles={['member']}>
            <MemberDashboard />
          </ProtectedRoute>
        } />

        {/* Trainer Routes */}
        <Route path="/trainer" element={
          <ProtectedRoute allowedRoles={['trainer']}>
            <TrainerDashboard />
          </ProtectedRoute>
        } />

        {/* Admin Routes */}
        <Route path="/admin" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        } />
      </Routes>
    </Router>
  );
}

export default App;
