import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { User, Mail, Phone, Code, Code2, Link as LinkIcon, FileText, CheckCircle } from 'lucide-react';
import { useAuth } from '../AuthContext';

export default function Profile() {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    linkedin_url: '',
    github_url: '',
    education: '',
    skills: '',
    base_resume_text: ''
  });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      try {
        setFetching(true);
        const token = await user.getIdToken();
        const res = await axios.get('http://localhost:8000/profile', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = res.data;
        setFormData({
          ...data,
          skills: data.skills ? data.skills.join(', ') : ''
        });
      } catch (err) {
        console.error(err);
      } finally {
        setFetching(false);
      }
    };
    
    fetchProfile();
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    
    const payload = {
      ...formData,
      skills: formData.skills.split(',').map(s => s.trim()).filter(Boolean),
    };

    try {
      const token = await user.getIdToken();
      await axios.patch('http://localhost:8000/profile', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert('Error saving profile');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full pl-10 pr-4 py-3 bg-white/80 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all text-slate-700";

  if (fetching) return <div className="loading-screen">Loading profile...</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in pb-10">
      <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl border border-white/40 overflow-hidden mt-8">
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 px-6 py-8 text-white border-b border-slate-700">
          <h1 className="text-2xl font-bold mb-2">Edit Profile</h1>
          <p className="text-slate-300">Update your baseline information.</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
              <div className="relative">
                <User className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                <input required type="text" className={inputClass} value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
              <div className="relative">
                <User className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                <input required type="text" className={inputClass} value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                <input required type="email" className={inputClass} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                <input required type="text" className={inputClass} value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">LinkedIn URL</label>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                <input required type="text" className={inputClass} value={formData.linkedin_url} onChange={e => setFormData({...formData, linkedin_url: e.target.value})} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">GitHub URL</label>
              <div className="relative">
                <Code2 className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                <input required type="text" className={inputClass} value={formData.github_url} onChange={e => setFormData({...formData, github_url: e.target.value})} />
              </div>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Education</label>
            <div className="relative">
              <FileText className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
              <input required type="text" className={inputClass} value={formData.education} onChange={e => setFormData({...formData, education: e.target.value})} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Skills (comma separated)</label>
            <div className="relative">
              <Code className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
              <input required type="text" className={inputClass} value={formData.skills} onChange={e => setFormData({...formData, skills: e.target.value})} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Base Resume Text</label>
            <div className="relative">
              <FileText className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
              <textarea required rows={6} className={inputClass} value={formData.base_resume_text} onChange={e => setFormData({...formData, base_resume_text: e.target.value})} />
            </div>
          </div>

          <div className="pt-6 border-t border-slate-200/60 flex items-center justify-between">
            {success ? (
              <span className="flex items-center text-green-600 font-medium text-sm">
                <CheckCircle className="h-5 w-5 mr-1" /> Profile updated successfully
              </span>
            ) : <span />}
            <button type="submit" disabled={loading} className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-3 rounded-lg font-medium shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:transform-none">
              {loading ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
