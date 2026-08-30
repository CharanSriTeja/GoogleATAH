import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Bot, Sparkles, Zap, Shield, ArrowRight, Briefcase } from 'lucide-react';
import { useAuth } from '../AuthContext';

export default function Landing() {
  const { user } = useAuth();

  // If user is already logged in, redirect them to the app
  if (user) {
    return <Navigate to="/app" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Navigation */}
      <nav className="glass-panel sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-xl mr-3 shadow-sm">
                <Briefcase className="h-6 w-6 text-white" />
              </div>
              <span className="font-bold text-2xl tracking-tight text-slate-900">Internship Agent</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link to="/signin" className="text-slate-600 hover:text-slate-900 font-medium px-4 py-2 transition-colors">
                Sign In
              </Link>
              <Link to="/signup" className="bg-slate-900 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-slate-800 transition-colors shadow-sm">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center">
          <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight mb-6 leading-tight">
            Automate Your <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Job Hunt</span>
          </h1>
          <p className="mt-4 max-w-2xl text-xl text-slate-600 mx-auto mb-10">
            Let our AI agent find, analyze, and apply to internships for you while you sleep. Stop filling out forms and start preparing for interviews.
          </p>
          <div className="flex justify-center space-x-4">
            <Link to="/signup" className="flex items-center bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-full font-bold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all">
              Start Automating Now
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </div>
          
          <div className="mt-20">
            <img 
              src="https://images.unsplash.com/photo-1498050108023-c5249f4df085?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80" 
              alt="Dashboard Preview" 
              className="rounded-2xl shadow-2xl border border-slate-200 mx-auto max-h-[500px] object-cover"
            />
          </div>
        </div>

        {/* Features Section */}
        <div className="bg-white py-20 border-t border-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-slate-900">Why use Internship Agent?</h2>
              <p className="mt-4 text-lg text-slate-500">Everything you need to secure your dream role faster.</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-10">
              <div className="bg-slate-50 rounded-2xl p-8 border border-slate-100 hover:shadow-md transition-shadow">
                <div className="bg-blue-100 w-14 h-14 rounded-xl flex items-center justify-center mb-6">
                  <Bot className="h-7 w-7 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">AI Powered Autofill</h3>
                <p className="text-slate-600 leading-relaxed">
                  Our bot reads application forms and intelligently fills them out using your resume and profile details.
                </p>
              </div>
              
              <div className="bg-slate-50 rounded-2xl p-8 border border-slate-100 hover:shadow-md transition-shadow">
                <div className="bg-purple-100 w-14 h-14 rounded-xl flex items-center justify-center mb-6">
                  <Sparkles className="h-7 w-7 text-purple-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">Smart Match Analysis</h3>
                <p className="text-slate-600 leading-relaxed">
                  Instantly know if you're a good fit for a role before spending time on the application process.
                </p>
              </div>
              
              <div className="bg-slate-50 rounded-2xl p-8 border border-slate-100 hover:shadow-md transition-shadow">
                <div className="bg-amber-100 w-14 h-14 rounded-xl flex items-center justify-center mb-6">
                  <Zap className="h-7 w-7 text-amber-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">Save Hundreds of Hours</h3>
                <p className="text-slate-600 leading-relaxed">
                  Focus on what matters: preparing for your technical interviews and networking.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 py-12 text-center text-slate-400">
        <p>&copy; {new Date().getFullYear()} Internship Agent. All rights reserved.</p>
      </footer>
    </div>
  );
}
