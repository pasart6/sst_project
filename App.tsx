
import React, { useState, useEffect, useRef } from 'react';
import { 
  Calendar, Users, Building2, MapPin, CheckCircle2, LayoutDashboard, 
  Trash2, Clock, ChevronDown, UserCircle2, Lock, X, Download, 
  Plus, FileUp, History, Database, Target, AlertTriangle, RefreshCw
} from 'lucide-react';
import { Reservation, Region, Referral, Room, Purpose, DATES, TIME_SLOTS, AdminLog } from './types';
import { parseComplexSchedule } from './services/geminiService';

const STORAGE_KEY = 'sst_reservations_v2';
const LOGS_KEY = 'sst_admin_logs_v1';
const ADMIN_PASSWORD = 'admin@123';

interface Conflict {
  incoming: Partial<Reservation>;
  existing: Reservation;
}

const App: React.FC = () => {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showAdminAuth, setShowAdminAuth] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [adminTab, setAdminTab] = useState<'DATA' | 'HISTORY'>('DATA');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState(false);
  
  // Import Flow States
  const [isParsing, setIsParsing] = useState(false);
  const [pendingConflicts, setPendingConflicts] = useState<Conflict[]>([]);
  const [pendingAdditions, setPendingAdditions] = useState<Reservation[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialFormState: Partial<Reservation> = {
    name: '', companyName: '', region: 'Asia', referral: 'Linkedin', attendees: 1, purpose: 'General Visit', date: 'Jan 6', room: 'Room1', timeSlot: ''
  };

  const [formData, setFormData] = useState<Partial<Reservation>>(initialFormState);
  const [manualData, setManualData] = useState<Partial<Reservation>>(initialFormState);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setReservations(JSON.parse(saved));
    const savedLogs = localStorage.getItem(LOGS_KEY);
    if (savedLogs) setLogs(JSON.parse(savedLogs));
  }, []);

  const saveReservations = (updated: Reservation[]) => {
    setReservations(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const addLog = (action: AdminLog['action'], details: string) => {
    const newLog: AdminLog = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      action,
      details
    };
    const updated = [newLog, ...logs].slice(0, 100);
    setLogs(updated);
    localStorage.setItem(LOGS_KEY, JSON.stringify(updated));
  };

  const isSlotTaken = (date: string, room: Room, slot: string) => {
    return reservations.find(r => r.date === date && r.room === room && r.timeSlot === slot);
  };

  // Fix: Added handleAdminToggle to manage admin mode switching
  const handleAdminToggle = () => {
    if (isAdmin) {
      setIsAdmin(false);
    } else {
      setShowAdminAuth(true);
    }
  };

  // Fix: Added handleAuthSubmit to handle the admin password verification
  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (authPassword === ADMIN_PASSWORD) {
      setIsAdmin(true);
      setShowAdminAuth(false);
      setAuthPassword('');
      setAuthError(false);
      addLog('LOGIN', 'Admin login successful');
    } else {
      setAuthError(true);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const parsedResults = await parseComplexSchedule(text);
      
      const additions: Reservation[] = [];
      const conflicts: Conflict[] = [];

      parsedResults.forEach(incoming => {
        const existing = isSlotTaken(incoming.date!, incoming.room as Room, incoming.timeSlot!);
        if (existing) {
          conflicts.push({ incoming, existing });
        } else {
          additions.push({
            ...incoming,
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString()
          } as Reservation);
        }
      });

      if (conflicts.length > 0) {
        setPendingConflicts(conflicts);
        setPendingAdditions(additions);
      } else if (additions.length > 0) {
        const updated = [...reservations, ...additions];
        saveReservations(updated);
        addLog('IMPORT', `Bulk imported ${additions.length} new records.`);
        alert(`Successfully imported ${additions.length} records.`);
      } else {
        alert("No valid new records found in the file.");
      }
      setIsParsing(false);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const resolveConflicts = (decisions: ('KEEP' | 'OVERWRITE')[]) => {
    let currentReservations = [...reservations];
    let overwritesCount = 0;
    let skipsCount = 0;

    pendingConflicts.forEach((conflict, index) => {
      if (decisions[index] === 'OVERWRITE') {
        currentReservations = currentReservations.filter(r => r.id !== conflict.existing.id);
        currentReservations.push({
          ...conflict.incoming,
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString()
        } as Reservation);
        overwritesCount++;
      } else {
        skipsCount++;
      }
    });

    const final = [...currentReservations, ...pendingAdditions];
    saveReservations(final);
    addLog('IMPORT', `Import complete. Added ${pendingAdditions.length}, Overwrote ${overwritesCount}, Skipped ${skipsCount}.`);
    
    setPendingConflicts([]);
    setPendingAdditions([]);
    alert("Import processing finished.");
  };

  const exportToExcel = () => {
    const headers = ["Name", "Company", "Region", "Referral", "Attendees", "Purpose", "Date", "Room", "Time", "Registered At"];
    const rows = reservations.map(r => [
      r.name, r.companyName, r.region, r.referral, r.attendees, r.purpose, r.date || '-', r.room || '-', r.timeSlot || '-', new Date(r.timestamp).toLocaleString()
    ]);
    const csvContent = [headers.join(","), ...rows.map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `SST_Export_${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
    addLog('EXPORT', `Exported ${reservations.length} records`);
  };

  const deleteReservation = (id: string) => {
    if (confirm('Delete this record?')) {
      const res = reservations.find(r => r.id === id);
      saveReservations(reservations.filter(r => r.id !== id));
      addLog('DELETE', `Deleted record for ${res?.name || 'Unknown'}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FC] flex flex-col font-sans text-slate-900">
      <input type="file" accept=".csv" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />

      {/* Conflict Resolution Modal */}
      {pendingConflicts.length > 0 && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md overflow-y-auto">
          <div className="bg-white w-full max-w-4xl rounded-[40px] shadow-2xl p-8 sm:p-10 space-y-8 my-8 animate-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 text-amber-600">
                <AlertTriangle size={32} />
                <div>
                  <h3 className="text-2xl font-black tracking-tight">Schedule Conflicts Found</h3>
                  <p className="text-slate-500 font-bold text-sm">{pendingConflicts.length} slots are already booked.</p>
                </div>
              </div>
              <button onClick={() => setPendingConflicts([])} className="p-2 text-slate-400 hover:bg-slate-50 rounded-full"><X size={24} /></button>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-4 custom-scrollbar">
              {pendingConflicts.map((conflict, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-2 gap-4 border border-slate-100 rounded-[24px] p-6 bg-slate-50/50">
                  <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Existing Record</span>
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                      <div className="font-bold text-slate-900">{conflict.existing.name}</div>
                      <div className="text-xs text-slate-500">{conflict.existing.companyName}</div>
                      <div className="mt-2 text-xs font-black text-indigo-600 uppercase">{conflict.existing.date} | {conflict.existing.timeSlot} | {conflict.existing.room}</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Incoming Import</span>
                    <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 shadow-sm">
                      <div className="font-bold text-indigo-900">{conflict.incoming.name}</div>
                      <div className="text-xs text-indigo-700">{conflict.incoming.companyName}</div>
                      <div className="mt-2 text-xs font-black text-indigo-600 uppercase">{conflict.incoming.date} | {conflict.incoming.timeSlot} | {conflict.incoming.room}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => resolveConflicts(pendingConflicts.map(() => 'KEEP'))} className="py-4 border-2 border-slate-200 rounded-2xl font-black text-slate-500 hover:bg-slate-50 transition-all">Skip All Conflicts</button>
              <button onClick={() => resolveConflicts(pendingConflicts.map(() => 'OVERWRITE'))} className="py-4 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all">Overwrite All Conflicts</button>
            </div>
          </div>
        </div>
      )}

      {/* Parsing Loader Overlay */}
      {isParsing && (
        <div className="fixed inset-0 z-[150] bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center space-y-4">
          <div className="animate-spin text-indigo-600"><RefreshCw size={48} /></div>
          <p className="font-black text-slate-900 uppercase tracking-widest animate-pulse">Gemini is analyzing your schedule...</p>
        </div>
      )}

      {/* Admin Auth Modal */}
      {showAdminAuth && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-[32px] p-8 shadow-2xl border border-slate-100 space-y-6 relative slide-in-from-bottom-4 duration-300">
            <button onClick={() => setShowAdminAuth(false)} className="absolute top-6 right-6 p-2 text-slate-400 hover:bg-slate-50 rounded-full transition-all"><X size={20} /></button>
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4"><Lock size={32} /></div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">Admin Access</h3>
            </div>
            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <input autoFocus type="password" value={authPassword} onChange={(e) => {setAuthPassword(e.target.value); setAuthError(false);}} placeholder="Password"
                className={`w-full p-4 bg-slate-50 border rounded-2xl outline-none transition-all font-medium text-center tracking-widest ${authError ? 'border-red-500 focus:ring-red-100 ring-4' : 'border-slate-200 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 focus:bg-white'}`}
              />
              <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">Unlock</button>
            </form>
          </div>
        </div>
      )}

      {/* Navbar */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center space-x-3">
          <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-100"><Calendar size={20} /></div>
          <div><h1 className="font-bold text-slate-900 tracking-tight">SST Booth Reservation</h1><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">CES 2025 Las Vegas</p></div>
        </div>
        <button onClick={handleAdminToggle} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border flex items-center space-x-2 ${isAdmin ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'}`}>
          {isAdmin ? <CheckCircle2 size={14} /> : <Lock size={14} />}<span>{isAdmin ? 'Exit Admin' : 'Admin'}</span>
        </button>
      </nav>

      {isAdmin ? (
        <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-1 p-1 bg-slate-100 rounded-2xl">
              <button onClick={() => setAdminTab('DATA')} className={`flex items-center space-x-2 px-6 py-2 rounded-xl text-sm font-bold transition-all ${adminTab === 'DATA' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                <Database size={16} /><span>Records</span>
              </button>
              <button onClick={() => setAdminTab('HISTORY')} className={`flex items-center space-x-2 px-6 py-2 rounded-xl text-sm font-bold transition-all ${adminTab === 'HISTORY' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                <History size={16} /><span>Activity Log</span>
              </button>
            </div>
            {adminTab === 'DATA' && (
              <div className="flex flex-wrap gap-2">
                <button onClick={() => fileInputRef.current?.click()} className="flex items-center space-x-2 px-4 py-2.5 bg-amber-500 text-white hover:bg-amber-600 rounded-xl text-sm font-bold shadow-lg shadow-amber-100 transition-all">
                  <FileUp size={16} /><span>Smart Import (CSV)</span>
                </button>
                <button onClick={exportToExcel} className="flex items-center space-x-2 px-4 py-2.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl text-sm font-bold shadow-lg shadow-indigo-100 transition-all">
                  <Download size={16} /><span>Export</span>
                </button>
              </div>
            )}
          </div>

          <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
            {adminTab === 'DATA' ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-widest"><tr className="border-b border-slate-100">
                    <th className="px-6 py-4">Guest</th>
                    <th className="px-6 py-4">Details</th>
                    <th className="px-6 py-4">Booking</th>
                    <th className="px-6 py-4 text-center">Action</th>
                  </tr></thead>
                  <tbody className="divide-y divide-slate-50 text-sm">
                    {reservations.length === 0 ? <tr><td colSpan={4} className="px-6 py-16 text-center text-slate-300 font-bold uppercase tracking-widest">No Data</td></tr> :
                    reservations.sort((a,b) => b.timestamp.localeCompare(a.timestamp)).map(r => (
                      <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900">{r.name}</div>
                          <div className="text-xs text-slate-400 font-medium">{r.companyName}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-black uppercase text-indigo-500">{r.region} | {r.referral}</span>
                            <span className="text-[10px] font-black uppercase text-slate-400">{r.attendees} Attendees</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900">{r.purpose}</div>
                          {r.purpose === 'To attend the meeting' && (
                            <div className="text-xs text-indigo-600 font-bold">{r.date} | {r.timeSlot} | {r.room}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center"><button onClick={() => deleteReservation(r.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={18} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-widest"><tr className="border-b border-slate-100"><th className="px-6 py-4">Time</th><th className="px-6 py-4">Action</th><th className="px-6 py-4">Details</th></tr></thead>
                  <tbody className="divide-y divide-slate-50 text-sm font-medium">
                    {logs.map(log => (
                      <tr key={log.id} className="hover:bg-slate-50/50">
                        <td className="px-6 py-4 text-slate-400">{new Date(log.timestamp).toLocaleString()}</td>
                        <td className="px-6 py-4"><span className="px-2 py-0.5 rounded text-[10px] font-black bg-slate-100 text-slate-600">{log.action}</span></td>
                        <td className="px-6 py-4 text-slate-600">{log.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      ) : isSubmitted ? (
        <main className="flex-1 p-6 flex items-center justify-center animate-in fade-in duration-500">
          <div className="max-w-md w-full text-center bg-white p-12 rounded-[48px] shadow-2xl border border-slate-100 space-y-8">
            <div className="w-24 h-24 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto ring-8 ring-green-50/50"><CheckCircle2 size={48} className="animate-pulse" /></div>
            <div className="space-y-4"><h2 className="text-3xl font-black text-slate-900">Registered!</h2><p className="text-slate-500 leading-relaxed font-medium">Your visit has been registered.</p></div>
            <button onClick={() => { setIsSubmitted(false); setFormData(initialFormState); }} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all">Back to Home</button>
          </div>
        </main>
      ) : (
        <main className="flex-1 p-4 sm:p-10 flex flex-col items-center">
          <form onSubmit={(e) => {
            e.preventDefault();
            const newRes: Reservation = { ...formData as Reservation, id: crypto.randomUUID(), timestamp: new Date().toISOString() };
            saveReservations([...reservations, newRes]);
            setIsSubmitted(true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }} className="w-full max-w-3xl space-y-8 mb-20 animate-in slide-in-from-bottom-4 duration-500">
            <div className="text-center space-y-2 mb-12">
              <span className="bg-indigo-50 text-indigo-600 px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest border border-indigo-100">CES 2025 · SST Booth</span>
              <h2 className="text-5xl font-black text-slate-900 tracking-tight">Visit Registration</h2>
              <p className="text-slate-500 font-medium">Please schedule your visit and tell us about your company.</p>
            </div>

            <div className="bg-white rounded-[40px] p-8 sm:p-10 shadow-sm border border-slate-200 space-y-10">
              <h3 className="flex items-center text-sm font-black text-slate-300 uppercase tracking-widest"><UserCircle2 className="mr-2" size={18} />Basic Survey</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-1.5"><label className="text-[11px] font-black text-slate-400 uppercase tracking-wider px-1">1. Your Name *</label><input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none transition-all font-medium" placeholder="E.g. John Doe" /></div>
                <div className="space-y-1.5"><label className="text-[11px] font-black text-slate-400 uppercase tracking-wider px-1">2. Company Name *</label><input required value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none transition-all font-medium" placeholder="E.g. Global Tech" /></div>
                <div className="space-y-1.5"><label className="text-[11px] font-black text-slate-400 uppercase tracking-wider px-1">3. Company Region *</label>
                  <div className="relative">
                    <select required value={formData.region} onChange={e => setFormData({...formData, region: e.target.value as Region})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none transition-all font-medium appearance-none">
                      {['Asia', 'Europe', 'US', 'Canada', 'Africa', 'Oceania', 'Middle East', 'Latin America', 'None of Above'].map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                  </div>
                </div>
                <div className="space-y-1.5"><label className="text-[11px] font-black text-slate-400 uppercase tracking-wider px-1">4. How did you hear about us? *</label>
                  <div className="relative">
                    <select required value={formData.referral} onChange={e => setFormData({...formData, referral: e.target.value as Referral})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none transition-all font-medium appearance-none">
                      {['Linkedin', 'Website', 'News', 'An acquaintance', 'Etc.'].map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                  </div>
                </div>
                <div className="space-y-1.5 sm:col-span-2"><label className="text-[11px] font-black text-slate-400 uppercase tracking-wider px-1">5. Total number of Attendees *</label><input required type="number" min="1" value={formData.attendees} onChange={e => setFormData({...formData, attendees: parseInt(e.target.value) || 1})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none transition-all font-medium" placeholder="E.g. 1" /></div>
              </div>

              <div className="space-y-4 pt-4">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider px-1">6. What is the purpose of your visit? *</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button type="button" onClick={() => setFormData({...formData, purpose: 'General Visit'})} className={`p-6 rounded-[32px] border-2 text-left flex items-center space-x-4 transition-all ${formData.purpose === 'General Visit' ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-100' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'}`}>
                    <Target size={24} />
                    <div className="flex flex-col"><span className="font-black text-lg">General Visit</span><span className="text-xs font-bold opacity-70">Exploring the booth</span></div>
                  </button>
                  <button type="button" onClick={() => setFormData({...formData, purpose: 'To attend the meeting'})} className={`p-6 rounded-[32px] border-2 text-left flex items-center space-x-4 transition-all ${formData.purpose === 'To attend the meeting' ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-100' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'}`}>
                    <Building2 size={24} />
                    <div className="flex flex-col"><span className="font-black text-lg">Meeting</span><span className="text-xs font-bold opacity-70">Request meeting room</span></div>
                  </button>
                </div>
              </div>
            </div>

            {formData.purpose === 'To attend the meeting' && (
              <div className="bg-white rounded-[40px] p-8 sm:p-10 shadow-sm border border-slate-200 space-y-10 animate-in slide-in-from-bottom-4 duration-500">
                <h3 className="flex items-center text-sm font-black text-slate-300 uppercase tracking-widest"><Calendar className="mr-2" size={18} />7. Meeting Room Booking</h3>
                <div className="space-y-4">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider px-1">Select Date</label>
                  <div className="grid grid-cols-4 gap-3">{DATES.map(d => (
                    <button key={d} type="button" onClick={() => setFormData({...formData, date: d})} className={`py-4 rounded-3xl border-2 font-black transition-all ${formData.date === d ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-slate-50 border-slate-50 text-slate-400 hover:border-slate-200'}`}>{d}</button>
                  ))}</div>
                </div>
                <div className="space-y-4">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider px-1">Select Time Slot</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar border-y border-slate-100 py-6">
                    {TIME_SLOTS.map(slot => {
                      // Fix: Added !! to convert Reservation | undefined to boolean
                      const taken = !!isSlotTaken(formData.date!, formData.room!, slot);
                      return <button key={slot} type="button" disabled={taken} onClick={() => setFormData({...formData, timeSlot: slot})} className={`p-4 rounded-2xl border-2 text-sm font-bold transition-all ${taken ? 'bg-slate-50 border-slate-50 text-slate-100 cursor-not-allowed' : formData.timeSlot === slot ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-slate-100 text-slate-600 hover:border-indigo-200'}`}><span>{slot.split(' - ')[0]}</span></button>;
                    })}
                  </div>
                </div>
              </div>
            )}

            <button type="submit" disabled={!formData.name || !formData.companyName || (formData.purpose === 'To attend the meeting' && !formData.timeSlot)} className="w-full py-6 bg-indigo-600 text-white rounded-[32px] font-black text-xl shadow-2xl shadow-indigo-200 hover:bg-indigo-700 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50">Register Visit</button>
          </form>
        </main>
      )}

      <footer className="mt-auto bg-white border-t border-slate-200 py-8 px-10 flex flex-col sm:flex-row items-center justify-between text-[11px] font-black text-slate-300 tracking-[0.2em] uppercase">
        <div className="flex items-center space-x-6 mb-4 sm:mb-0"><span className="flex items-center"><CheckCircle2 size={12} className="mr-2 text-green-500" /> Secure Data</span><span className="flex items-center"><MapPin size={12} className="mr-2" /> Las Vegas</span></div>
        <div>SST Booth @ CES 2025</div>
      </footer>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 20px; }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slide-up { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .animate-in { animation: fade-in 0.3s ease-out both; }
        .slide-in-from-bottom-4 { animation: slide-up 0.4s cubic-bezier(0, 0, 0.2, 1) both; }
      `}</style>
    </div>
  );
};

export default App;
