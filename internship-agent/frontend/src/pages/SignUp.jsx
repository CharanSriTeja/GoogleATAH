import React, { useState } from 'react';
import { auth } from '../firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowLeft, Loader2 } from 'lucide-react';

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      // New users go to onboard
      navigate('/onboard');
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white/70 backdrop-blur-xl border border-white/40 shadow-xl rounded-2xl p-8 relative">
        <button onClick={() => navigate(-1)} className="absolute top-4 left-4 p-2 text-slate-400 hover:text-slate-700 bg-white/50 rounded-full hover:bg-white transition-all">
          <ArrowLeft size={20} />
        </button>
        <div className="mt-4">
          <h1 className="text-3xl font-bold bg-gradient-to-br from-blue-800 to-purple-600 bg-clip-text text-transparent mb-2">Create Account</h1>
          <p className="text-slate-500 mb-6">Join Internship Agent to automate your job hunt</p>
        </div>
        
        {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm mb-6 border border-red-200">{error}</div>}
        
        <form onSubmit={handleSignUp} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input 
              type="email" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required
              disabled={loading}
              className="w-full px-4 py-3 bg-white/80 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all disabled:opacity-50"
            />
          </div>
          <div className="relative">
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input 
              type={showPassword ? "text" : "password"} 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required
              disabled={loading}
              className="w-full px-4 py-3 bg-white/80 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all pr-10 disabled:opacity-50"
            />
            <button 
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              disabled={loading}
              className="absolute right-3 top-[34px] text-slate-400 hover:text-slate-600 focus:outline-none disabled:opacity-50"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <button type="submit" disabled={loading} className="w-full flex justify-center items-center bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg font-medium shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all mt-4 disabled:opacity-70 disabled:transform-none">
            {loading ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : null}
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>
        
        <div className="text-center text-sm text-slate-500 mt-6 pt-6 border-t border-slate-200/60">
          Already have an account? <Link to="/signin" className="text-blue-600 font-medium hover:underline">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
