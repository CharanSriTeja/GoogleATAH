import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FileText, Link as LinkIcon, Send, Loader2, CheckCircle2, ChevronRight, Activity, Terminal } from 'lucide-react';
import { auth } from '../firebase';

export default function NewApplication() {
  const [inputType, setInputType] = useState('url'); // 'url' or 'text'
  const [jobUrl, setJobUrl] = useState('');
  const [jdText, setJdText] = useState('');
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [events, setEvents] = useState([]);
  const [result, setResult] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!jobUrl && !jdText) return;
    
    setIsProcessing(true);
    setEvents([]);
    setResult(null);

    const message = inputType === 'url' 
      ? `I want to apply for this job: ${jobUrl}`
      : `I want to apply for this job description:\n\n${jdText}`;

    // Generate a temporary session ID for this flow
    const sessionId = `new-app-${Date.now()}`;

    try {
      const token = await auth.currentUser?.getIdToken();
      
      const response = await fetch('http://localhost:8000/applications/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          session_id: sessionId,
          message: message
        })
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      let agentReply = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6));
              if (data.type === 'tool_call') {
                setEvents(prev => [...prev, { type: 'working', label: getHumanLabel(data.name) }]);
              } else if (data.type === 'tool_result') {
                setEvents(prev => {
                  const newEvents = [...prev];
                  const lastWorking = newEvents.findLastIndex(e => e.type === 'working');
                  if (lastWorking !== -1) {
                    newEvents[lastWorking] = { ...newEvents[lastWorking], type: 'done' };
                  }
                  return newEvents;
                });
              } else if (data.type === 'agent_message') {
                agentReply += data.text;
              }
            } catch (e) {
              console.error("Parse error", e);
            }
          }
        }
      }
      
      // Attempt to find the application we just created to redirect
      // Since the agent reply is just text, we can't easily extract the ID.
      // But we can check the latest application in Dashboard.
      setResult(agentReply);
      setIsProcessing(false);

    } catch (err) {
      console.error(err);
      setIsProcessing(false);
      alert("Error starting application flow.");
    }
  };

  const getHumanLabel = (toolName) => {
    const labels = {
      fetch_jd_text: "Fetching job description...",
      parse_jd: "Parsing requirements...",
      tailor_resume: "Tailoring resume bullets...",
      save_application: "Saving application to dashboard...",
      autofill_greenhouse_form: "Attempting to autofill application form..."
    };
    return labels[toolName] || `Running ${toolName}...`;
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold gradient-text">New Application</h1>
        <p className="text-slate-500">Provide a job description to let the agent tailor your resume.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Column */}
        <div className="glass-panel p-6 border-t-4 border-t-blue-500">
          <div className="flex space-x-2 p-1 bg-slate-100 rounded-lg mb-6 w-fit">
            <button 
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${inputType === 'url' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
              onClick={() => setInputType('url')}
            >
              <LinkIcon className="h-4 w-4 inline mr-1" />
              Link
            </button>
            <button 
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${inputType === 'text' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
              onClick={() => setInputType('text')}
            >
              <FileText className="h-4 w-4 inline mr-1" />
              Paste Text
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {inputType === 'url' ? (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Job Posting URL</label>
                <input 
                  type="url" 
                  required
                  placeholder="https://jobs.greenhouse.io/..."
                  className="premium-input"
                  value={jobUrl}
                  onChange={e => setJobUrl(e.target.value)}
                  disabled={isProcessing}
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Job Description Text</label>
                <textarea 
                  required
                  rows={8}
                  placeholder="Paste the full job description here..."
                  className="premium-input"
                  value={jdText}
                  onChange={e => setJdText(e.target.value)}
                  disabled={isProcessing}
                />
              </div>
            )}

            <button 
              type="submit" 
              disabled={isProcessing || (!jobUrl && !jdText)}
              className="primary-btn w-full mt-4 flex justify-center items-center"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Agent Working...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Start Agent
                </>
              )}
            </button>
          </form>
        </div>

        {/* Output Column */}
        <div className="glass-panel p-6 bg-slate-900 text-white min-h-[400px] flex flex-col relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500"></div>
          
          <div className="flex items-center mb-6 text-slate-300 border-b border-slate-700 pb-4">
            <Terminal className="h-5 w-5 mr-2 text-blue-400" />
            <span className="font-mono text-sm tracking-wide">AGENT_EXECUTION_LOG</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4">
            {events.length === 0 && !result && (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-3">
                <Activity className="h-8 w-8 opacity-50" />
                <p className="text-sm font-mono">Waiting for input...</p>
              </div>
            )}
            
            {events.map((ev, i) => (
              <div key={i} className="flex items-start animate-fade-in">
                {ev.type === 'working' ? (
                  <Loader2 className="h-5 w-5 mr-3 text-blue-400 animate-spin flex-shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 mr-3 text-green-400 flex-shrink-0 mt-0.5" />
                )}
                <span className={`font-mono text-sm ${ev.type === 'working' ? 'text-blue-100' : 'text-slate-400'}`}>
                  {ev.label}
                </span>
              </div>
            ))}

            {result && (
              <div className="mt-8 p-4 bg-slate-800 rounded-lg border border-slate-700 animate-fade-in">
                <div className="flex items-center text-green-400 font-medium mb-2">
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                  Agent Finished
                </div>
                <div className="prose prose-invert prose-sm max-w-none">
                  {result.split('\n').map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
                <div className="mt-6 pt-4 border-t border-slate-700 text-center">
                  <Link to="/dashboard" className="text-blue-400 hover:text-blue-300 font-medium text-sm inline-flex items-center">
                    View in Dashboard <ChevronRight className="h-4 w-4 ml-1" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
