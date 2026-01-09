
import React, { useState, useCallback } from 'react';
import { Upload, Mail, FileText, Send, CheckCircle, AlertCircle, Trash2, Edit3, Loader2 } from 'lucide-react';
import { Recipient, EmailDraft } from './types';
import { generatePersonalizedEmail } from './services/geminiService';

const App: React.FC = () => {
  const [serviceDescription, setServiceDescription] = useState('');
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [drafts, setDrafts] = useState<Record<string, EmailDraft>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      const emailIdx = headers.findIndex(h => h.includes('email'));
      const nameIdx = headers.findIndex(h => h.includes('name'));
      const companyIdx = headers.findIndex(h => h.includes('company'));
      const roleIdx = headers.findIndex(h => h.includes('role'));

      if (emailIdx === -1) {
        alert("CSV must contain an 'email' column.");
        return;
      }

      const parsedRecipients: Recipient[] = lines.slice(1)
        .filter(line => line.trim())
        .map((line, index) => {
          const values = line.split(',').map(v => v.trim());
          const customData: Record<string, string> = {};
          headers.forEach((h, i) => {
            customData[h] = values[i];
          });

          return {
            id: `rec-${index}`,
            email: values[emailIdx],
            name: nameIdx !== -1 ? values[nameIdx] : 'Subscriber',
            company: companyIdx !== -1 ? values[companyIdx] : undefined,
            role: roleIdx !== -1 ? values[roleIdx] : undefined,
            customData
          };
        });

      setRecipients(parsedRecipients);
    };
    reader.readAsText(file);
  };

  const generateDrafts = async () => {
    if (!serviceDescription) {
      alert("Please describe the service you are offering first.");
      return;
    }
    setIsGenerating(true);
    const currentDrafts = { ...drafts };

    for (const recipient of recipients) {
      // Check if draft already exists and is ready or sent
      const existing = currentDrafts[recipient.id];
      if (existing?.status === 'ready' || existing?.status === 'sent') continue;
      
      try {
        setDrafts(prev => ({
          ...prev,
          [recipient.id]: { recipientId: recipient.id, subject: '', body: '', status: 'generating' }
        }));

        const result = await generatePersonalizedEmail(recipient, serviceDescription);
        
        setDrafts(prev => ({
          ...prev,
          [recipient.id]: { recipientId: recipient.id, subject: result.subject, body: result.body, status: 'ready' }
        }));
      } catch (err) {
        setDrafts(prev => ({
          ...prev,
          [recipient.id]: { recipientId: recipient.id, subject: '', body: '', status: 'error' }
        }));
      }
    }
    setIsGenerating(false);
  };

  const sendAllEmails = async () => {
    setIsSending(true);
    // Simulate sending with a delay for each
    const readyIds = Object.keys(drafts).filter(id => drafts[id].status === 'ready');
    
    for (const id of readyIds) {
      await new Promise(resolve => setTimeout(resolve, 500));
      setDrafts(prev => ({
        ...prev,
        [id]: { ...prev[id], status: 'sent' }
      }));
    }
    setIsSending(false);
    alert("Campaign sent successfully!");
  };

  const removeRecipient = (id: string) => {
    setRecipients(prev => prev.filter(r => r.id !== id));
    setDrafts(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const updateDraft = (id: string, field: 'subject' | 'body', value: string) => {
    setDrafts(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value }
    }));
  };

  // Fixed: Cast Object.values(drafts) to EmailDraft[] to solve the 'unknown' property access error
  const allDrafts = Object.values(drafts) as EmailDraft[];
  const readyCount = allDrafts.filter(d => d.status === 'ready').length;
  const sentCount = allDrafts.filter(d => d.status === 'sent').length;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 p-2 rounded-lg">
            <Mail className="text-white w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">ReachFlow AI</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex text-sm text-gray-500 gap-6">
            <div className="flex items-center gap-1"><CheckCircle className="w-4 h-4 text-green-500" /> {sentCount} Sent</div>
            <div className="flex items-center gap-1"><FileText className="w-4 h-4 text-blue-500" /> {readyCount} Ready</div>
          </div>
          <button 
            onClick={sendAllEmails}
            disabled={readyCount === 0 || isSending}
            className={`flex items-center gap-2 px-6 py-2 rounded-full font-semibold transition-all ${
              readyCount === 0 || isSending
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200'
            }`}
          >
            {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Send Campaign
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Configuration */}
        <div className="lg:col-span-4 space-y-6">
          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Upload className="w-5 h-5 text-indigo-500" /> 1. Upload Leads
            </h2>
            <div className="relative group">
              <input 
                type="file" 
                accept=".csv" 
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center group-hover:border-indigo-400 transition-colors bg-gray-50">
                <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-700">Drop your CSV here</p>
                <p className="text-xs text-gray-500 mt-1">Email column is required</p>
              </div>
            </div>
            {recipients.length > 0 && (
              <p className="mt-4 text-sm text-green-600 font-medium flex items-center gap-1">
                <CheckCircle className="w-4 h-4" /> {recipients.length} leads imported
              </p>
            )}
          </section>

          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-indigo-500" /> 2. Service Description
            </h2>
            <textarea 
              value={serviceDescription}
              onChange={(e) => setServiceDescription(e.target.value)}
              placeholder="Example: I'm offering high-conversion landing page design for SaaS companies. We focus on speed and SEO..."
              className="w-full h-40 p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm outline-none transition-all"
            />
          </section>

          <button 
            onClick={generateDrafts}
            disabled={recipients.length === 0 || !serviceDescription || isGenerating}
            className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all ${
              recipients.length === 0 || !serviceDescription || isGenerating
                ? 'bg-gray-100 text-gray-400'
                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-xl shadow-indigo-100'
            }`}
          >
            {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mail className="w-5 h-5" />}
            Generate Personalized Emails
          </button>
        </div>

        {/* Right Column: Leads & Drafts */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between mb-2 px-2">
            <h2 className="text-xl font-bold text-gray-900">Review Your Outreach</h2>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">{recipients.length} RECIPIENTS</span>
          </div>

          <div className="space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto pr-2 pb-20">
            {recipients.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-100 text-gray-400">
                <FileText className="w-12 h-12 mb-4 opacity-20" />
                <p>Upload a CSV to start building your campaign</p>
              </div>
            ) : (
              recipients.map((recipient) => {
                const draft = drafts[recipient.id];

                return (
                  <div key={recipient.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden group transition-all hover:shadow-md">
                    <div className="p-5 flex items-start justify-between">
                      <div className="flex gap-4">
                        <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-lg">
                          {recipient.name[0]}
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900">{recipient.name}</h3>
                          <p className="text-sm text-gray-500">{recipient.email}</p>
                          {recipient.company && (
                            <span className="inline-block mt-1 text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-tight">
                              {recipient.company} • {recipient.role || 'Professional'}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {draft?.status === 'generating' && (
                          <span className="text-xs font-medium text-indigo-600 flex items-center gap-1 animate-pulse">
                            <Loader2 className="w-3 h-3 animate-spin" /> Generating...
                          </span>
                        )}
                        {draft?.status === 'ready' && (
                          <span className="text-xs font-medium text-green-600 flex items-center gap-1 bg-green-50 px-3 py-1 rounded-full border border-green-100">
                            <CheckCircle className="w-3 h-3" /> Ready
                          </span>
                        )}
                        {draft?.status === 'sent' && (
                          <span className="text-xs font-medium text-blue-600 flex items-center gap-1 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                            <Send className="w-3 h-3" /> Sent
                          </span>
                        )}
                        {draft?.status === 'error' && (
                          <span className="text-xs font-medium text-red-600 flex items-center gap-1 bg-red-50 px-3 py-1 rounded-full border border-red-100">
                            <AlertCircle className="w-3 h-3" /> Failed
                          </span>
                        )}
                        <button 
                          onClick={() => removeRecipient(recipient.id)}
                          className="p-2 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {(draft?.status === 'ready' || draft?.status === 'sent') ? (
                      <div className="border-t border-gray-50">
                        <div className="p-5 space-y-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Subject Line</label>
                            <input 
                              type="text"
                              value={draft.subject}
                              onChange={(e) => updateDraft(recipient.id, 'subject', e.target.value)}
                              disabled={draft.status === 'sent'}
                              className="w-full text-sm font-semibold text-gray-800 bg-gray-50 border-none rounded-lg p-2 focus:ring-1 focus:ring-indigo-300 outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Message Body</label>
                            <textarea 
                              value={draft.body}
                              onChange={(e) => updateDraft(recipient.id, 'body', e.target.value)}
                              disabled={draft.status === 'sent'}
                              className="w-full text-sm text-gray-600 bg-gray-50 border-none rounded-lg p-4 h-32 focus:ring-1 focus:ring-indigo-300 outline-none resize-none leading-relaxed"
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      !isGenerating && (
                        <div className="p-5 border-t border-gray-50 text-center">
                          <p className="text-sm text-gray-400">Draft will be generated here</p>
                        </div>
                      )
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>

      {/* Floating Action Hint */}
      {recipients.length > 0 && !isGenerating && !isSending && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-4 z-20 border border-gray-700">
           <p className="text-sm font-medium">Ready to send <span className="text-indigo-400 font-bold">{readyCount}</span> personalized emails?</p>
           <div className="w-px h-4 bg-gray-700" />
           <button 
             onClick={sendAllEmails}
             disabled={readyCount === 0}
             className="text-xs font-bold uppercase tracking-widest hover:text-indigo-300 disabled:opacity-30"
           >
             Blast Off
           </button>
        </div>
      )}
    </div>
  );
};

export default App;
