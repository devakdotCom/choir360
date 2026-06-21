import React, { useState } from 'react';
import { Mass, Payment, Member, ShareCalculation, Language } from '../types';
import {
  BookOpen,
  Calendar,
  DollarSign,
  Briefcase,
  Layers,
  Sparkles,
  Calculator,
  Lock,
  Unlock,
  Bell,
  ArrowUpRight,
  Download,
  CheckCircle,
  HelpCircle,
  UserCheck
} from 'lucide-react';
import { MULTILINGUAL_DICTIONARY } from '../data/mockData';

interface MassManagementProps {
  currentLang: Language;
  masses: Mass[];
  payments: Payment[];
  members: Member[];
  onAddMass: (newMass: Mass) => void;
  onUpdatePayment: (paymentId: string, receivedAmount: number, status: 'Pending' | 'Received') => void;
}

export const MassManagement: React.FC<MassManagementProps> = ({
  currentLang,
  masses,
  payments,
  members,
  onAddMass,
  onUpdatePayment
}) => {
  const dict = MULTILINGUAL_DICTIONARY[currentLang] || MULTILINGUAL_DICTIONARY.en;

  // Mass Form States
  const [newMassName, setNewMassName] = useState('');
  const [newMassCategory, setNewMassCategory] = useState<Mass['category']>('Sunday Mass');
  const [newMassDate, setNewMassDate] = useState('2026-06-21');
  const [newMassTime, setNewMassTime] = useState('06:30 AM');
  const [newMassLang, setNewMassLang] = useState('Tamil');
  const [massSuccess, setMassSuccess] = useState('');

  // Share calculation engine active states
  const [selectedPaymentId, setSelectedPaymentId] = useState<string>(payments[0]?.id || '');
  const [singerPresentCount, setSingerPresentCount] = useState<number>(6);
  const [instrumentPresentCount, setInstrumentPresentCount] = useState<number>(2);
  const [lockedCalculations, setLockedCalculations] = useState<Record<string, {
    singers: number;
    instruments: number;
    totalUnits: number;
    unitValue: number;
    singerShare: number;
    instrumentShare: number;
  }>>({});
  
  // Notification logs simulation
  const [notifLogged, setNotifLogged] = useState<string | null>(null);

  const handleAddMass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMassName) return;

    const added: Mass = {
      id: `MS${String(masses.length + 1).padStart(3, '0')}`,
      name: newMassName,
      category: newMassCategory,
      date: newMassDate,
      time: newMassTime,
      language: newMassLang
    };

    onAddMass(added);
    setNewMassName('');
    setMassSuccess(`Successfully created liturgy ${added.name}`);
    setTimeout(() => setMassSuccess(''), 4000);
  };

  // Find active selected payment definition
  const activePayment = payments.find(p => p.id === selectedPaymentId) || payments[0];

  // Engine Math Calculation
  const calculateEngine = (totalAmount: number) => {
    const totalUnits = (singerPresentCount * 1) + (instrumentPresentCount * 2);
    const unitValue = totalUnits > 0 ? (totalAmount / totalUnits) : 0;
    const singerShare = Math.round(unitValue * 1);
    const instrumentalistShare = Math.round(unitValue * 2);

    return {
      totalUnits,
      unitValue: Math.round(unitValue),
      singerShare,
      instrumentalistShare
    };
  };

  const currentCalc = calculateEngine(activePayment?.promisedAmount || 6000);

  // Trigger locked index
  const handleLockCalculation = () => {
    if (!activePayment) return;
    setLockedCalculations({
      ...lockedCalculations,
      [activePayment.id]: {
        singers: singerPresentCount,
        instruments: instrumentPresentCount,
        totalUnits: currentCalc.totalUnits,
        unitValue: currentCalc.unitValue,
        singerShare: currentCalc.singerShare,
        instrumentShare: currentCalc.instrumentalistShare
      }
    });

    onUpdatePayment(activePayment.id, activePayment.promisedAmount, 'Received');
    alert(`Calculation Engine status: LOCKED! Accounts for ${activePayment.partyName} are completed. Total distributed share is ₹${activePayment.promisedAmount}`);
  };

  const handleUnlockCalculation = () => {
    if (!activePayment) return;
    const copy = { ...lockedCalculations };
    delete copy[activePayment.id];
    setLockedCalculations(copy);
  };

  const isCurrentLocked = activePayment ? !!lockedCalculations[activePayment.id] : false;

  // Notification simulation
  const triggerOverdueReminder = (p: Payment) => {
    setNotifLogged(`Reminder alert sent successfully to "${p.partyName}" (${p.mobile})! Enforcing due payments for ${p.massType} on channels: [WhatsApp, Email, SMS]`);
    setTimeout(() => setNotifLogged(null), 7000);
  };

  return (
    <div className="space-y-8" id="mass-management-component">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between border-b border-slate-200 pb-3 gap-3">
        <div>
          <h2 className="font-sans font-bold text-xl text-slate-800">Parish Masses & Accounts Desk</h2>
          <p className="text-xs text-slate-500">Log traditional parish liturgical rites and invoke our automated choral split calculations.</p>
        </div>
        <div className="flex items-center gap-1 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 font-bold text-xs text-emerald-800">
          <Calculator className="w-3.5 h-3.5" /> Singer Weight: 1 • Instrumentalist Weight: 2
        </div>
      </div>

      {notifLogged && (
        <div className="bg-amber-50 text-amber-800 p-4 rounded-xl border border-amber-200 text-xs font-semibold flex items-center justify-between gap-2" id="notif-toast">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-600 animate-swing" />
            <span>{notifLogged}</span>
          </div>
          <span className="text-[9px] bg-amber-200 text-amber-900 border border-amber-300 font-mono px-2 py-0.5 rounded-full">SENT</span>
        </div>
      )}

      {/* 2. Top columns: Mass registration & Collection database */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Create liturgy form */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4" id="liturgy-creator-panel">
          <h3 className="font-sans font-bold text-slate-900 text-sm flex items-center gap-1.5 pb-2 border-b border-slate-100">
            <BookOpen className="w-4 h-4 text-emerald-600" />
            Setup Upcoming Liturgies
          </h3>

          {massSuccess && (
            <p className="text-xs p-2 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded font-medium">
              {massSuccess}
            </p>
          )}

          <form onSubmit={handleAddMass} className="space-y-4 text-xs" id="mass-form">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Mass Name / Description</label>
              <input
                type="text"
                required
                value={newMassName}
                onChange={e => setNewMassName(e.target.value)}
                placeholder="e.g. Wedding Solemn Mass of Dr. Joseph"
                className="w-full px-3 py-3 min-h-[44px] rounded-lg border border-slate-200"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Liturgical Rite Category</label>
              <select
                value={newMassCategory}
                onChange={e => setNewMassCategory(e.target.value as Mass['category'])}
                className="w-full px-3 py-3 min-h-[44px] rounded-lg border border-slate-200"
              >
                <option value="Sunday Mass">Sunday Mass (Communal)</option>
                <option value="Weekday Mass">Regular Weekday Mass</option>
                <option value="Special Mass">Special Mass (Marriage, Feast, Ordination)</option>
                <option value="Death Mass">Death Mass (Funeral Requiem)</option>
                <option value="Death Anniversary Mass">Death Anniversary Mass (Memorial)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Date</label>
                <input type="date" value={newMassDate} onChange={e => setNewMassDate(e.target.value)} className="w-full px-3 py-3 min-h-[44px] border border-slate-200 rounded" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Start Time</label>
                <input type="text" value={newMassTime} onChange={e => setNewMassTime(e.target.value)} placeholder="e.g. 06:30 AM" className="w-full px-3 py-3 min-h-[44px] border border-slate-200 rounded" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Principal Language</label>
              <select value={newMassLang} onChange={e => setNewMassLang(e.target.value)} className="w-full px-3 py-3 min-h-[44px] border border-slate-200 rounded">
                <option>Tamil</option>
                <option>English</option>
                <option>Malayalam</option>
                <option>Telugu</option>
                <option>Hindi</option>
              </select>
            </div>

            <button
              type="submit"
              id="submit-mass-btn"
              className="w-full py-3 min-h-[44px] bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1 cursor-pointer transition shadow"
            >
              Log Liturgy Mass
            </button>
          </form>
        </div>

        {/* Collections Ledger Dashboard */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4" id="collections-dashboard-panel">
          <h3 className="font-sans font-bold text-slate-900 text-sm flex items-center gap-1.5 pb-2 border-b border-slate-100">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            Special Mass Payments Database
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left" id="payments-table">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] text-slate-400 font-bold uppercase">
                  <th className="py-2.5">Sponsor / Party</th>
                  <th className="py-2.5">Solemn Rite Rites</th>
                  <th className="py-2.5 text-right">Promised</th>
                  <th className="py-2.5 text-right">Pending</th>
                  <th className="py-2.5 text-center">Receipts Mode</th>
                  <th className="py-2.5 text-right">Invoice Reminder</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs">
                {payments.map((p) => {
                  const hasPending = p.pendingAmount > 0;
                  const isLocked = !!lockedCalculations[p.id];
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3.5">
                        <p className="font-bold text-slate-800">{p.partyName}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{p.mobile}</p>
                      </td>
                      <td className="py-3.5">
                        <p className="font-semibold text-slate-700">{p.massType}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{p.massDate} at {p.massTime}</p>
                      </td>
                      <td className="py-3.5 text-right font-bold font-mono">₹{p.promisedAmount}</td>
                      <td className={`py-3.5 text-right font-bold font-mono ${hasPending ? 'text-rose-600' : 'text-slate-400'}`}>
                        ₹{isLocked ? 0 : p.pendingAmount}
                      </td>
                      <td className="py-3.5 text-center">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${
                          isLocked || p.status === 'Received'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-100'
                            : 'bg-amber-50 text-amber-800 border-amber-100'
                        }`}>
                          {isLocked || p.status === 'Received' ? 'Received & Cleared' : 'Unresolved'}
                        </span>
                      </td>
                      <td className="py-3.5">
                        <div className="flex items-center justify-end gap-1.5">
                          {hasPending && !isLocked && (
                            <button
                              onClick={() => triggerOverdueReminder(p)}
                              className="p-1 text-amber-600 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded cursor-pointer transition flex items-center gap-0.5 text-[9px] font-bold"
                            >
                              <Bell className="w-3 h-3" /> Remind
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedPaymentId(p.id)}
                            className={`p-1.5 rounded cursor-pointer transition flex items-center gap-1 text-[10px] font-bold ${
                              selectedPaymentId === p.id
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            Calculate <ArrowUpRight className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 3. AUTOMATIC SHARE CALCULATION ENGINE */}
      {activePayment && (
        <div className="bg-slate-900 text-slate-100 p-6 md:p-8 rounded-3xl border border-slate-800 shadow-xl space-y-6" id="choral-calculator-engine">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-slate-805 pb-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-950 border border-emerald-800 text-emerald-400 p-2 rounded-xl">
                <Calculator className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-sans font-bold text-md text-white flex items-center gap-2">
                  Share Calculation Engine
                  <span className="text-[10px] font-mono tracking-wider bg-slate-800 border border-slate-700 px-2 py-0.5 rounded-full font-bold uppercase text-amber-400">
                    {isCurrentLocked ? 'CALCULATIONS LOCKED' : 'LIVE CALCULATOR'}
                  </span>
                </h3>
                <p className="text-xs text-slate-400 leading-normal">
                  Settle choral earnings for requested liturgy: <strong className="text-slate-200">{activePayment.massType}</strong>, sponsored by {activePayment.partyName}.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isCurrentLocked ? (
                <button
                  onClick={handleUnlockCalculation}
                  className="px-4 py-3 min-h-[44px] bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-300 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition"
                >
                  <Unlock className="w-4 h-4" /> Unlock Editing
                </button>
              ) : (
                <button
                  onClick={handleLockCalculation}
                  className="px-4 py-3 min-h-[44px] bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition shadow"
                >
                  <Lock className="w-4 h-4" /> Lock Calculation & Disburse
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Left Controls: set counts */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider font-mono">Present Attendees Parameters</h4>
              
              <div className="space-y-3 text-xs">
                <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-800 space-y-1">
                  <div className="flex justify-between items-center text-slate-300">
                    <span>Present Singers Count (Weight = 1)</span>
                    <span className="font-mono font-bold text-white text-md">{singerPresentCount}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="15"
                    disabled={isCurrentLocked}
                    value={singerPresentCount}
                    onChange={e => setSingerPresentCount(Number(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  />
                </div>

                <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-800 space-y-1">
                  <div className="flex justify-between items-center text-slate-300">
                    <span>Present Instrumentalists (Weight = 2)</span>
                    <span className="font-mono font-bold text-white text-md">{instrumentPresentCount}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="6"
                    disabled={isCurrentLocked}
                    value={instrumentPresentCount}
                    onChange={e => setInstrumentPresentCount(Number(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-800/30 rounded-xl border border-slate-800 text-[10px] text-slate-400 leading-relaxed font-sans">
                <strong>Dynamic Roster Balance:</strong> If <strong>Amal (Keyboardist)</strong> and <strong>Kevin (Flute)</strong> are checked in, they consume 2 weights each (4 units).
              </div>
            </div>

            {/* Middle panel: Big Math Calculations readout */}
            <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-800 flex flex-col justify-between" id="math-display-panel">
              <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider font-mono mb-3">Choral Split Summary</h4>
              
              <div className="space-y-4 font-sans text-xs">
                <div className="flex justify-between border-b border-slate-700/50 pb-2">
                  <span className="text-slate-400">Gross Promised Amount</span>
                  <span className="font-bold text-white font-mono text-sm">₹{activePayment.promisedAmount.toLocaleString()}</span>
                </div>
                
                <div className="flex justify-between border-b border-slate-700/50 pb-2">
                  <span className="text-slate-400 flex items-center gap-1">
                    Choral Unit Weight
                    <HelpCircle className="w-3.5 h-3.5 text-slate-500 shrink-0" title="Calculated as (Singers * 1) + (Instrumentalists * 2)" />
                  </span>
                  <span className="font-bold text-slate-200 font-mono">
                    {isCurrentLocked ? lockedCalculations[activePayment.id]?.totalUnits : currentCalc.totalUnits} Units
                  </span>
                </div>

                <div className="flex justify-between border-b border-slate-700/50 pb-2">
                  <span className="text-slate-400">Unit Weight Cash Value</span>
                  <span className="font-extrabold text-emerald-400 font-mono text-sm">
                    ₹{isCurrentLocked ? lockedCalculations[activePayment.id]?.unitValue : currentCalc.unitValue}
                  </span>
                </div>
              </div>

              <div className="bg-emerald-950/40 p-3 rounded-lg border border-emerald-900/60 text-[10px] text-emerald-300/80 leading-normal font-mono mt-4">
                Formula: ₹{activePayment.promisedAmount} / (({isCurrentLocked ? lockedCalculations[activePayment.id]?.singers : singerPresentCount} Singers × 1) + ({isCurrentLocked ? lockedCalculations[activePayment.id]?.instruments : instrumentPresentCount} Instrumentalists × 2))
              </div>
            </div>

            {/* Right Display: Big visual Cards for shares */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider font-mono">Personal Disbursement Shares</h4>

              <div className="grid grid-cols-2 gap-3" id="disbursement-shares-visual">
                {/* Singer Share Card */}
                <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 text-center space-y-1">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Per Singer</p>
                  <p className="text-lg font-extrabold text-white font-mono">
                    ₹{isCurrentLocked ? lockedCalculations[activePayment.id]?.singerShare : currentCalc.singerShare}
                  </p>
                  <p className="text-[9px] text-emerald-500">Weight Factor: 1x</p>
                </div>

                {/* Instrumentalist Share Card */}
                <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 text-center space-y-1">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Per Musician</p>
                  <p className="text-lg font-extrabold text-yellow-400 font-mono">
                    ₹{isCurrentLocked ? lockedCalculations[activePayment.id]?.instrumentShare : currentCalc.instrumentalistShare}
                  </p>
                  <p className="text-[9px] text-yellow-500">Weight Factor: 2x</p>
                </div>
              </div>

              {/* PDF Preview trigger */}
              <button
                onClick={() => {
                  alert(`Generating Diocesan Standard Financial Audit for ${activePayment.partyName}...\n\nSponsors Offering: ₹${activePayment.promisedAmount}\nDisbursed to: ${singerPresentCount} Singers, ${instrumentPresentCount} Instrumentalists.\n\nApproved securely via Choir360 financial ledger module!`);
                }}
                className="w-full py-3 min-h-[44px] bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer border border-slate-700 transition"
              >
                <Download className="w-3.5 h-3.5" /> Export Audit Report (Print/PDF)
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
