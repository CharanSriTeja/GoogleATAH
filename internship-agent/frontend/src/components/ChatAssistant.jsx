import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Send, Loader2, Bot, User as UserIcon, CheckCircle2, Wrench } from 'lucide-react';
import { auth } from '../firebase';

export default function ChatAssistant() {
  const [messages, setMessages] = useState([
    { 
      id: 'welcome',
      role: 'agent', 
      type: 'text',
      content: "Hi! I am your Internship Agent. You can paste a job link/description here, ask to autofill an application, or draft an outreach email for a specific company." 
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Maintain session ID in sessionStorage
  const [sessionId] = useState(() => {
    const existing = sessionStorage.getItem('agent_session_id');
    if (existing) return existing;
    const newId = "chat-" + Math.random().toString(36).substring(2, 15);
    sessionStorage.setItem('agent_session_id', newId);
    return newId;
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const getHumanLabel = (toolName) => {
    const labels = {
      fetch_jd_text: "Fetching job description",
      parse_jd: "Parsing requirements",
      tailor_resume: "Tailoring resume bullets",
      save_application: "Saving application",
      autofill_greenhouse_form: "Running autofill",
      find_applications: "Searching your applications",
      send_outreach_email: "Sending outreach email",
      check_thread_for_reply: "Checking email thread",
      update_status: "Updating status",
      get_application: "Loading application data"
    };
    return labels[toolName] || `Using ${toolName}`;
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userText = input.trim();
    setInput('');
    
    // Add user message to UI
    const userMsgId = Date.now().toString();
    setMessages(prev => [...prev, { id: userMsgId, role: 'user', type: 'text', content: userText }]);
    setLoading(true);

    try {
      const token = await auth.currentUser?.getIdToken();
      
      const response = await fetch('http://localhost:8000/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          session_id: sessionId,
          message: userText
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
        console.log(lines);
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6));
              
              if (data.type === 'tool_call') {
                setMessages(prev => [...prev, { 
                  id: `tool-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                  role: 'agent', 
                  type: 'tool', 
                  status: 'working',
                  label: getHumanLabel(data.name) 
                }]);
              } else if (data.type === 'tool_result') {
                setMessages(prev => {
                  const newMsgs = [...prev];
                  const lastToolIdx = newMsgs.findLastIndex(m => m.type === 'tool' && m.status === 'working');
                  if (lastToolIdx !== -1) {
                    newMsgs[lastToolIdx] = { ...newMsgs[lastToolIdx], status: 'done' };
                  }
                  return newMsgs;
                });
              } else if (data.type === 'agent_message') {
                agentReply += data.text;
                setMessages(prev => {
                  const newMsgs = [...prev];
                  const lastAgentMsg = newMsgs.findLast(m => m.role === 'agent' && m.type === 'text');
                  
                  // If we already added a text node in this stream, append to it
                  if (lastAgentMsg && lastAgentMsg.id === `reply-${userMsgId}`) {
                    lastAgentMsg.content = agentReply;
                  } else {
                    newMsgs.push({
                      id: `reply-${userMsgId}`,
                      role: 'agent',
                      type: 'text',
                      content: agentReply
                    });
                  }
                  return newMsgs;
                });
              }
            } catch (e) {
              console.error("Parse error", e);
            }
          }
        }
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { 
        id: `err-${Date.now()}`,
        role: 'agent', 
        type: 'text', 
        content: "Sorry, I encountered an error communicating with the server." 
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto h-[80vh] flex flex-col animate-fade-in">
      <div className="mb-4">
        <h1 className="text-3xl font-bold gradient-text">Chat Assistant</h1>
        <p className="text-slate-500">Your AI co-pilot for applications and outreach.</p>
      </div>

      <div className="glass-panel flex-1 overflow-hidden flex flex-col relative border-t-4 border-t-purple-500">
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
          {messages.map((msg, i) => (
            <div key={msg.id || i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              
              {msg.role === 'agent' && msg.type !== 'tool' && (
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mr-3 mt-1 shadow-sm flex-shrink-0">
                  <Bot className="h-5 w-5 text-white" />
                </div>
              )}
              
              {msg.type === 'text' ? (
                <div className={`max-w-[80%] rounded-2xl px-5 py-3 ${
                  msg.role === 'user' 
                    ? 'bg-blue-600 text-white rounded-br-none shadow-md' 
                    : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-sm prose prose-sm'
                }`}>
                  {msg.role === 'user' ? (
                    <p className="whitespace-pre-wrap m-0">{msg.content}</p>
                  ) : (
                    // Using basic paragraph splitting for agent markdown formatting
                    <div className="space-y-2">
                      {msg.content.split('\n').map((line, idx) => (
                        line ? <p key={idx} className="m-0 leading-relaxed">{line}</p> : <br key={idx} />
                      ))}
                    </div>
                  )}
                </div>
              ) : msg.type === 'tool' ? (
                <div className="ml-11 flex items-center text-xs font-medium bg-white border border-slate-200 px-3 py-1.5 rounded-full shadow-sm text-slate-600">
                  {msg.status === 'working' ? (
                    <Loader2 className="h-3.5 w-3.5 mr-2 text-blue-500 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5 mr-2 text-green-500" />
                  )}
                  {msg.label}
                </div>
              ) : null}

            </div>
          ))}
          {loading && !messages.find(m => m.id && m.id.startsWith('reply-') && m.content) && (
             <div className="flex justify-start">
               <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mr-3 mt-1 shadow-sm flex-shrink-0">
                  <Bot className="h-5 w-5 text-white" />
                </div>
               <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none px-5 py-3 shadow-sm flex items-center space-x-2">
                 <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce"></div>
                 <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{animationDelay: "0.15s"}}></div>
                 <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{animationDelay: "0.3s"}}></div>
               </div>
             </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        
        <form onSubmit={handleSend} className="p-4 bg-white border-t border-slate-200">
          <div className="relative flex items-center max-w-4xl mx-auto">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask the agent to autofill an application, check status, or parse a job..."
              className="w-full pl-5 pr-14 py-3 bg-slate-100 border border-slate-200 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm"
              disabled={loading}
            />
            <button 
              type="submit" 
              disabled={loading || !input.trim()}
              className="absolute right-2 p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          <div className="text-center mt-2 text-xs text-slate-400 font-medium">
            Agent memory persists for this session. It will ask for confirmation before submitting forms or sending emails.
          </div>
        </form>
      </div>
    </div>
  );
}
