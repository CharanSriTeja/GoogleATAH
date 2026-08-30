import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Briefcase, MessageSquare, Home, Plus, Settings, LogOut, ArrowLeft } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate('/signin');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Navigation */}
      <nav className="glass-panel sticky top-0 z-30 rounded-none border-x-0 border-t-0 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-xl mr-3 shadow-sm">
                  <Briefcase className="h-5 w-5 text-white" />
                </div>
                <Link to="/" className="font-bold text-xl tracking-tight text-slate-900">Internship Agent</Link>
              </div>
              <div className="hidden sm:ml-8 sm:flex sm:space-x-8">
                <Link to="/app/chat" className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors ${location.pathname === '/app/chat' ? 'border-blue-600 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                  <MessageSquare className="h-4 w-4 mr-1" /> Chat
                </Link>
                <Link to="/app/dashboard" className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors ${location.pathname === '/app/dashboard' ? 'border-blue-600 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                  <Home className="h-4 w-4 mr-1" /> Dashboard
                </Link>
                <Link to="/app/applications/new" className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors ${location.pathname === '/app/applications/new' ? 'border-blue-600 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                  <Plus className="h-4 w-4 mr-1" /> New App
                </Link>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link to="/app/profile" className="text-slate-500 hover:text-slate-800 px-3 py-2 rounded-md text-sm font-medium flex items-center transition-colors">
                <Settings className="h-4 w-4 mr-1" /> Profile
              </Link>
              <button onClick={handleSignOut} className="text-slate-500 hover:text-red-600 px-3 py-2 rounded-md text-sm font-medium flex items-center transition-colors">
                <LogOut className="h-4 w-4 mr-1" /> Sign out
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
        <div className="mb-4">
          <button onClick={() => navigate(-1)} className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-800 bg-white border border-slate-200 shadow-sm px-3 py-1.5 rounded-lg transition-all hover:shadow">
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
          </button>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
