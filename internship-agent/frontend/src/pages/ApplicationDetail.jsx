import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Loader2, Bot, Mail, ShieldAlert, Check, X, Building, Link as LinkIcon, Edit2, CheckCircle2, Plus, FileText } from 'lucide-react';
import { auth } from '../firebase';

export default function ApplicationDetail() {
  const { id } = useParams();
  const [app, setApp] = useState(null);
  
  const [autofillLoading, setAutofillLoading] = useState(false);
  const [autofillResult, setAutofillResult] = useState(null);
  
  const [draftLoading, setDraftLoading] = useState(false);
  const [draft, setDraft] = useState(null);
  const [editedDraft, setEditedDraft] = useState({ subject: '', body: '' });
  
  const [sendLoading, setSendLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const [addingLink, setAddingLink] = useState(false);
  const [newJobUrl, setNewJobUrl] = useState('');

  useEffect(() => {
    const fetchApp = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/applications/${id}`);
        setApp(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchApp();
  }, [id, sent, addingLink]);

  const handleAddLink = async (e) => {
    e.preventDefault();
    if (!newJobUrl) return;
    setAddingLink(true);
    try {
      await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/applications/${id}/add-link`, { job_url: newJobUrl });
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/applications/${id}`);
      setApp(res.data);
      setNewJobUrl('');
    } catch (err) {
      console.error(err);
      alert('Failed to add link');
    } finally {
      setAddingLink(false);
    }
  };

  const runAutofill = async () => {
    setAutofillLoading(true);
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/applications/${id}/autofill`);
      setAutofillResult(res.data);
    } catch (err) {
      console.error(err);
      alert('Autofill failed.');
    } finally {
      setAutofillLoading(false);
    }
  };

  const generateDraft = async () => {
    setDraftLoading(true);
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/applications/${id}/outreach/draft`);
      setDraft(res.data);
      setEditedDraft(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setDraftLoading(false);
    }
  };

  const sendEmail = async () => {
    setSendLoading(true);
    try {
      await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/applications/${id}/outreach/send`, editedDraft);
      setSent(true);
      alert('Email sent successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to send email.');
    } finally {
      setSendLoading(false);
    }
  };

  if (!app) return <div className="text-center py-12"><Loader2 className="animate-spin h-8 w-8 border-b-2 border-blue-600 mx-auto" /></div>;

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12 animate-fade-in">
      {/* Header Info */}
      <div className="glass-panel p-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">{app.role}</h1>
            <div className="flex items-center text-slate-600 text-lg">
              <Building className="h-5 w-5 mr-2" />
              {app.company}
              {app.job_url ? (
                <a href={app.job_url} target="_blank" rel="noreferrer" className="ml-4 text-blue-600 hover:underline flex items-center text-sm">
                  <LinkIcon className="h-4 w-4 mr-1" /> View Job
                </a>
              ) : (
                <span className="ml-4 text-slate-400 text-sm italic">No link saved</span>
              )}
            </div>
          </div>
          <div className="bg-slate-50 px-6 py-4 rounded-xl border border-slate-200 text-center">
            <div className="text-sm font-medium text-slate-500 mb-1">Match Score</div>
            <div className={`text-3xl font-bold ${app.match_score > 0.7 ? 'text-green-600' : 'text-orange-600'}`}>
              {Math.round(app.match_score * 100)}%
            </div>
          </div>
        </div>
        
        {app.resume_pdf_url && (
          <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-800">Tailored Resume</h3>
              <p className="text-sm text-slate-500">Generated in Jake's format specifically for this role.</p>
            </div>
            <button 
              onClick={() => {
                window.open(app.resume_pdf_url, "_blank");
              }}
              className="primary-btn flex items-center"
            >
              <FileText className="h-4 w-4 mr-2" />
              View PDF
            </button>
          </div>
        )}
        
        {app.skill_gaps?.length > 0 && (
          <div className="mt-6 bg-orange-50 border border-orange-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-orange-800 flex items-center mb-2">
              <ShieldAlert className="h-4 w-4 mr-1.5" /> Honest Skill Gaps
            </h3>
            <div className="flex flex-wrap gap-2">
              {app.skill_gaps.map((gap, i) => (
                <span key={i} className="bg-white text-orange-700 border border-orange-200 px-2 py-1 rounded text-xs font-medium shadow-sm">{gap}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add Link Section if no job_url */}
      {!app.job_url && (
        <div className="glass-panel p-6 border-l-4 border-l-blue-500">
          <h3 className="font-semibold text-slate-800 mb-2 flex items-center">
            <LinkIcon className="h-4 w-4 mr-2 text-blue-500" />
            Add Application Link
          </h3>
          <p className="text-sm text-slate-600 mb-4">You started this application using raw text. Add the actual job link to enable autofill.</p>
          <form onSubmit={handleAddLink} className="flex gap-4">
            <input 
              type="url" 
              required
              placeholder="https://..."
              className="premium-input flex-1"
              value={newJobUrl}
              onChange={e => setNewJobUrl(e.target.value)}
              disabled={addingLink}
            />
            <button type="submit" disabled={addingLink} className="primary-btn whitespace-nowrap">
              {addingLink ? 'Adding...' : 'Add Link'}
            </button>
          </form>
        </div>
      )}

      {/* Autofill Section */}
      <div className="glass-panel overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50/50 px-6 py-4 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-slate-800 flex items-center">
            <Bot className="h-5 w-5 mr-2 text-blue-600" /> Autofill Application
          </h2>
          <button 
            onClick={runAutofill} 
            disabled={autofillLoading || !app.job_url}
            title={!app.job_url ? "Add a job link first" : ""}
            className="primary-btn flex items-center disabled:opacity-50"
          >
            {autofillLoading ? <><Loader2 className="animate-spin h-4 w-4 mr-2" /> Running...</> : 'Run Autofill'}
          </button>
        </div>
        
        {autofillResult && (
          <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <h3 className="font-medium text-slate-900 mb-3 flex items-center"><Check className="text-green-500 mr-2 h-4 w-4"/> Successfully Filled</h3>
              <ul className="space-y-2 text-sm text-slate-600 mb-6">
                {autofillResult.filled_fields.map((f, i) => <li key={i} className="flex items-center"><div className="w-1.5 h-1.5 rounded-full bg-green-500 mr-2"></div>{f}</li>)}
                {autofillResult.filled_fields.length === 0 && <li className="italic">None</li>}
              </ul>
              
              <h3 className="font-medium text-slate-900 mb-3 flex items-center"><X className="text-red-500 mr-2 h-4 w-4"/> Could Not Fill</h3>
              <ul className="space-y-2 text-sm text-slate-600">
                {autofillResult.unfilled_fields.map((f, i) => <li key={i} className="flex items-center"><div className="w-1.5 h-1.5 rounded-full bg-red-400 mr-2"></div>{f}</li>)}
                {autofillResult.unfilled_fields.length === 0 && <li className="italic">None</li>}
              </ul>
            </div>
            
            {autofillResult.screenshot_base64 && (
              <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-100 flex items-center justify-center relative group">
                <img src={`data:image/png;base64,${autofillResult.screenshot_base64}`} alt="Browser Screenshot" className="max-h-64 object-contain" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Outreach Section */}
      <div className="glass-panel overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50/50 px-6 py-4 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-slate-800 flex items-center">
            <Mail className="h-5 w-5 mr-2 text-indigo-600" /> Recruiter Outreach
          </h2>
          {!draft && (
            <button 
              onClick={generateDraft} 
              disabled={draftLoading}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-indigo-700 disabled:opacity-50 flex items-center"
            >
              {draftLoading ? <><Loader2 className="animate-spin h-4 w-4 mr-2" /> Drafting...</> : 'Generate Draft'}
            </button>
          )}
        </div>

        {draft && (
          <div className="p-6 space-y-4">
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4 text-sm text-blue-800 flex items-start rounded-r-lg">
              <ShieldAlert className="h-5 w-5 mr-2 flex-shrink-0" />
              <p>The agent has drafted this email. It will <strong>NOT</strong> be sent until you explicitly confirm by clicking the Send button below.</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
              <input 
                type="text" 
                className="premium-input" 
                value={editedDraft.subject} 
                onChange={e => setEditedDraft({...editedDraft, subject: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center">
                <Edit2 className="h-3 w-3 mr-1" /> Message Body
              </label>
              <textarea 
                rows={8} 
                className="premium-input" 
                value={editedDraft.body} 
                onChange={e => setEditedDraft({...editedDraft, body: e.target.value})}
              />
            </div>
            
            <div className="pt-4 flex justify-end">
              {sent ? (
                <span className="flex items-center text-green-600 font-bold px-6 py-2.5">
                  <CheckCircle2 className="h-5 w-5 mr-2" /> Email Sent
                </span>
              ) : (
                <button 
                  onClick={sendEmail} 
                  disabled={sendLoading}
                  className="bg-red-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-red-700 disabled:opacity-50 flex items-center shadow-lg hover:shadow-red-500/30 transition-all transform hover:-translate-y-0.5"
                >
                  {sendLoading ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : <Mail className="h-5 w-5 mr-2" />}
                  Confirm & Send Email
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
