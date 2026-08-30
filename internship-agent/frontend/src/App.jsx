import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import { AuthProvider, useAuth } from './AuthContext';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import Onboard from './pages/Onboard';
import Profile from './pages/Profile';
import Dashboard from './pages/Dashboard';
import NewApplication from './pages/NewApplication';
import ChatAssistant from './components/ChatAssistant';
import ApplicationDetail from './pages/ApplicationDetail';
import './App.css';
import './index.css';

// Protected Route Wrapper
const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/signin" replace />;
  return children;
};

// Route wrapper to check if user has profile
const EnsureProfile = ({ children }) => {
  const [hasProfile, setHasProfile] = React.useState(null);
  const { user } = useAuth();

  React.useEffect(() => {
    if (user) {
      user.getIdToken().then(token => {
        axios.get('http://localhost:8000/profile', {
          headers: { Authorization: `Bearer ${token}` }
        })
          .then(() => setHasProfile(true))
          .catch((error) => {
            console.error("Error fetching profile:", error);
            // Strictly redirect to onboard if profile cannot be verified
            setHasProfile(false);
          });
      });
    }
  }, [user]);

  if (hasProfile === null) return <div className="loading-screen flex items-center justify-center min-h-screen">Checking profile...</div>;
  if (!hasProfile) return <Navigate to="/onboard" replace />;
  return children;
};


function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/signin" element={<SignIn />} />
      <Route path="/signup" element={<SignUp />} />
      
      <Route path="/onboard" element={<ProtectedRoute><Onboard /></ProtectedRoute>} />
      
      <Route path="/app" element={<ProtectedRoute><EnsureProfile><Layout /></EnsureProfile></ProtectedRoute>}>
        <Route index element={<Navigate to="chat" replace />} />
        <Route path="profile" element={<Profile />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="applications/new" element={<NewApplication />} />
        <Route path="applications/:id" element={<ApplicationDetail />} />
        <Route path="chat" element={<ChatAssistant />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

