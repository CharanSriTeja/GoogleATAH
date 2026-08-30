import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Briefcase, Clock, CheckCircle, XCircle, ChevronRight, Inbox, Plus } from 'lucide-react';
import { auth } from '../firebase';
import { useAuth } from '../AuthContext';

const StatusBadge = ({ status }) => {
  const colors = {
    drafted: 'bg-slate-100 text-slate-800 border-slate-200',
    form_in_progress: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    submitted: 'bg-blue-50 text-blue-700 border-blue-200',
    awaiting_reply: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    interview: 'bg-green-50 text-green-700 border-green-200',
    rejected: 'bg-red-50 text-red-700 border-red-200',
    no_response: 'bg-orange-50 text-orange-700 border-orange-200',
  };
  
  const icons = {
    drafted: <Briefcase className="h-3 w-3 mr-1" />,
    form_in_progress: <Briefcase className="h-3 w-3 mr-1" />,
    submitted: <CheckCircle className="h-3 w-3 mr-1" />,
    awaiting_reply: <Clock className="h-3 w-3 mr-1" />,
    interview: <CheckCircle className="h-3 w-3 mr-1" />,
    rejected: <XCircle className="h-3 w-3 mr-1" />,
    no_response: <Inbox className="h-3 w-3 mr-1" />
  };

  const style = colors[status] || colors.drafted;
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${style} capitalize`}>
      {icons[status] || icons.drafted}
      {status.replace(/_/g, ' ')}
    </span>
  );
};

export default function Dashboard() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchApps = async () => {
    try {
      if (!user) return;
      const token = await user.getIdToken();
      const res = await axios.get('http://localhost:8000/applications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setApps(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    
    setLoading(true);
    fetchApps();
    const interval = setInterval(fetchApps, 10000);
    return () => clearInterval(interval);
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-slate-500 font-medium">Loading your applications from the database...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Dashboard</h1>
          <p className="text-slate-500">Track and manage your applications</p>
        </div>
        <Link to="/app/applications/new" className="primary-btn flex items-center">
          <Plus className="h-4 w-4 mr-2" />
          New Application
        </Link>
      </div>

      {apps.length === 0 ? (
        <div className="glass-panel p-16 text-center border-dashed">
          <Briefcase className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-slate-800">No applications yet</h3>
          <p className="text-slate-500 mt-2">Let the agent tailor a resume for your first job.</p>
          <Link to="/app/applications/new" className="primary-btn mt-6 inline-block">
            Start First Application
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {apps.map(app => (
            <Link key={app.application_id} to={`/app/applications/${app.application_id}`} className="block group">
              <div className="glass-panel p-6 h-full flex flex-col hover:border-blue-300 hover:-translate-y-1 transition-all duration-300 cursor-pointer">
                <div className="flex justify-between items-start mb-4">
                  <StatusBadge status={app.status} />
                  <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-blue-500 transition-colors" />
                </div>
                <h3 className="font-bold text-lg text-slate-900 truncate" title={app.role}>{app.role}</h3>
                <p className="text-slate-600 text-sm mb-6 flex-1">{app.company}</p>
                
                <div className="flex items-center justify-between text-sm pt-4 border-t border-slate-100">
                  <span className="text-slate-500 flex items-center">
                    Match Score: 
                    <span className="ml-2 font-bold text-slate-800 px-2 py-1 bg-slate-100 rounded-md">
                      {Math.round((app.match_score || 0) * 100)}%
                    </span>
                  </span>
                  {app.follow_up_date && new Date(app.follow_up_date) < new Date() && (
                    <span className="text-orange-600 flex items-center text-xs bg-orange-50 px-2 py-1 rounded font-medium border border-orange-100">
                      <Clock className="h-3 w-3 mr-1" />
                      Follow up due
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
