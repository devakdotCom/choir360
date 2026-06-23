import React, { useState } from 'react';
import { Mass, Payment, Member, Language } from '../types';
import {
  BookOpen, Calculator, Lock, Unlock, Bell,
  ArrowUpRight, Download, HelpCircle, IndianRupee,
  CheckCircle2, Clock, AlertCircle,
} from 'lucide-react';
import { MULTILINGUAL_DICTIONARY } from '../data/mockData';
import { formatINR } from '../utils/currency';

const PAYMENT_MASS_TYPES: Mass['category'][] = [
  'Special Mass', 'Death Mass', 'Death Anniversary Mass',
];
const isPaymentMass = (cat: Mass['category']) => PAYMENT_MASS_TYPES.includes(cat);

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
  onUpdatePayment,
}) => {
  const dict = MULTILINGUAL_DICTIONARY[currentLang] || MULTILINGUAL_DICTIONARY.en;

  // ── Mass form ──────────────────────────────────────────────────────────────
  const [massName,     setMassName]     = useState('');
  const [massCategory, setMassCategory] = useState<Mass['category']>('Sunday Mass');
  const [massDate,     setMassDate]     = useState(new Date().toISOString().slice(0, 10));
  const [massTime,     setMassTime]     = useState('06:30 AM');
  const [massLang,     setMassLang]     = useState('Tamil');

  // Payment fields (only for Special / Death / Death Anniversary)
  const [partyName,        setPartyName]        = useState('');
  const [amountProposed,   setAmountProposed]   = useState<number>(0);
  const [amountReceived,   setAmountReceived]   = useState<boolean>(false);
  const [receivedAmount,   setReceivedAmount]   = useState<number>(0);
  const [dateReceived,     setDateReceived]     = useState('');
  const [whoPaid,          setWhoPaid]          = useState('');
  const [paymentMode,      setPaymentMode]      = useState('Cash');
  const [receiptNo,        setReceiptNo]        = useState('');
  const [paymentRemarks,   setPaymentRemarks]   = useState('');

  const [massSuccess, setMassSuccess] = useState('');

  // ── Share calculator ────────────────────────────────────────────────────────
  const [selectedPaymentId,     setSelectedPaymentId]     = useState<string>(payments[0]?.id || '');
  const [singerCount,           setSingerCount]           = useState(6);
  const [instrumentalistCount,  setInstrumentalistCount]  = useState(2);
  const [lockedCalcs, setLockedCalcs] = useState<Record<string, {
    singers: number; instruments: number;
    totalUnits: number; unitValue: number;
    singerShare: number; instrumentShare: number;
  }>>({});
  const [notifMsg, setNotifMsg] = useState<string | null>(null);

  // ── Derived ─────────────────────────────────────────────────────────────────
  const activePayment = payments.find((p) => p.id === selectedPaymentId) || payments[0];
  const isLocked      = activePayment ? !!lockedCalcs[activePayment.id] : false;

  const calcEngine = (amount: number) => {
    const totalUnits  = singerCount * 1 + instrumentalistCount * 2;
    const unitValue   = totalUnits > 0 ? amount / totalUnits : 0;
    return {
      totalUnits,
      unitValue:         Math.round(unitValue),
      singerShare:       Math.round(unitValue),
      instrumentalistShare: Math.round(unitValue * 2),
    };
  };

  const calc = calcEngine(activePayment?.promisedAmount || 0);

  const paymentStatus = (proposed: number, received: boolean, recvAmt: number): 'Pending' | 'Received' => {
    if (!received) return 'Pending';
    return recvAmt >= proposed ? 'Received' : 'Pending';
  };

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleAddMass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!massName) return;

    const id = `MS${String(masses.length + 1).padStart(3, '0')}`;
    const newMass: Mass = { id, name: massName, category: massCategory, date: massDate, time: massTime, language: massLang };
    onAddMass(newMass);

    // If a payment mass, create payment record too
    if (isPaymentMass(massCategory) && partyName && amountProposed > 0) {
      const status = paymentStatus(amountProposed, amountReceived, receivedAmount);
      const recvAmt = amountReceived ? receivedAmount : 0;
      const pending = Math.max(amountProposed - recvAmt, 0);
      const pid = `PAY${String(payments.length + 1).padStart(3, '0')}`;
      onUpdatePayment(pid, recvAmt, status);
    }

    setMassName('');
    setPartyName('');
    setAmountProposed(0);
    setAmountReceived(false);
    setReceivedAmount(0);
    setDateReceived('');
    setWhoPaid('');
    setPaymentMode('Cash');
    setReceiptNo('');
    setPaymentRemarks('');
    setMassSuccess(`✓ Logged: ${massName}`);
    setTimeout(() => setMassSuccess(''), 4000);
  };

  const handleLock = () => {
    if (!activePayment) return;
    setLockedCalcs({ ...lockedCalcs, [activePayment.id]: {
      singers: singerCount, instruments: instrumentalistCount,
      totalUnits: calc.totalUnits, unitValue: calc.unitValue,
      singerShare: calc.singerShare, instrumentShare: calc.instrumentalistShare,
    }});
    onUpdatePayment(activePayment.id, activePayment.receivedAmount || activePayment.promisedAmount, 'Received');
    alert(`Settlement locked for ${activePayment.partyName}.\nTotal distributed: ${formatINR(activePayment.promisedAmount)}`);
  };

  const handleUnlock = () => {
    if (!activePayment) return;
    const copy = { ...lockedCalcs };
    delete copy[activePayment.id];
    setLockedCalcs(copy);
  };

  const sendReminder = (p: Payment) => {
    setNotifMsg(`Reminder sent to "${p.partyName}" (${p.mobile}) for ${p.massType} — pending ${formatINR(p.pendingAmount)}`);
    setTimeout(() => setNotifMsg(null), 6000);
  };

  const specialMasses = masses.filter((m) => isPaymentMass(m.category));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-200 pb-3 gap-3">
        <div>
          <h2 className="font-bold text-xl text-slate-800">Parish Masses & Accounts Desk</h2>
          <p className="text-xs text-slate-500">Log liturgical rites and manage choral split calculations.</p>
        </div>
        <div className="flex items-center gap-1 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 font-bold text-xs text-emerald-800">
          <Calculator className="w-3.5 h-3.5" /> Singer Weight: 1 · Instrumentalist Weight: 2
        </div>
      </div>

      {notifMsg && (
        <div className="bg-amber-50 text-amber-800 p-4 rounded-xl border border-amber-200 text-xs font-semibold flex items-center gap-2">
          <Bell className="w-4 h-4 text-amber-600 shrink-0" />
          {notifMsg}
        </div>
      )}

      {/* Form + Payments table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* ── Mass Form ── */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5 pb-2 border-b border-slate-100">
            <BookOpen className="w-4 h-4 text-emerald-600" /> Setup Upcoming Liturgies
          </h3>

          {massSuccess && (
            <p className="text-xs p-2 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded font-medium">{massSuccess}</p>
          )}

          <form onSubmit={handleAddMass} className="space-y-3 text-xs">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Mass Name / Description</label>
              <input required value={massName} onChange={(e) => setMassName(e.target.value)}
                placeholder="e.g. Wedding Solemn Mass of Dr. Joseph"
                className="w-full px-3 py-2.5 min-h-[44px] rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-400" />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Liturgical Rite Category</label>
              <select value={massCategory} onChange={(e) => setMassCategory(e.target.value as Mass['category'])}
                className="w-full px-3 py-2.5 min-h-[44px] rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-400">
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
                <input type="date" value={massDate} onChange={(e) => setMassDate(e.target.value)}
                  className="w-full px-3 py-2.5 min-h-[44px] border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-400" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Start Time</label>
                <input value={massTime} onChange={(e) => setMassTime(e.target.value)} placeholder="06:30 AM"
                  className="w-full px-3 py-2.5 min-h-[44px] border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-400" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Principal Language</label>
              <select value={massLang} onChange={(e) => setMassLang(e.target.value)}
                className="w-full px-3 py-2.5 min-h-[44px] border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-emerald-400">
                {['Tamil','English','Malayalam','Telugu','Hindi'].map((l) => <option key={l}>{l}</option>)}
              </select>
            </div>

            {/* ── Special Mass Payment Fields ── */}
            {isPaymentMass(massCategory) && (
              <div className="space-y-3 border-t border-amber-100 pt-3 mt-2">
                <p className="text-[10px] font-bold text-amber-700 uppercase flex items-center gap-1">
                  <IndianRupee className="w-3 h-3" /> Payment Details
                </p>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Sponsor / Party Name</label>
                  <input value={partyName} onChange={(e) => setPartyName(e.target.value)} placeholder="e.g. Joseph Family"
                    className="w-full px-3 py-2.5 min-h-[44px] border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-400" />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Amount Proposed (₹)</label>
                  <input type="number" min={0} value={amountProposed || ''} onChange={(e) => setAmountProposed(Number(e.target.value))}
                    placeholder="0"
                    className="w-full px-3 py-2.5 min-h-[44px] border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-400" />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Amount Received?</label>
                  <div className="flex gap-2">
                    {[true, false].map((v) => (
                      <button key={String(v)} type="button"
                        onClick={() => setAmountReceived(v)}
                        className={`flex-1 py-2 rounded-lg border text-xs font-bold transition ${amountReceived === v
                          ? v ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-rose-100 text-rose-700 border-rose-300'
                          : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                        {v ? 'Yes' : 'No'}
                      </button>
                    ))}
                  </div>
                </div>

                {amountReceived && (
                  <>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Amount Received (₹)</label>
                      <input type="number" min={0} value={receivedAmount || ''} onChange={(e) => setReceivedAmount(Number(e.target.value))}
                        className="w-full px-3 py-2.5 min-h-[44px] border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-400" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Date Received</label>
                        <input type="date" value={dateReceived} onChange={(e) => setDateReceived(e.target.value)}
                          className="w-full px-3 py-2.5 min-h-[44px] border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-400" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Payment Mode</label>
                        <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}
                          className="w-full px-3 py-2.5 min-h-[44px] border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-emerald-400">
                          {['Cash','UPI','Bank Transfer','Cheque','DD'].map((m) => <option key={m}>{m}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Who Paid</label>
                      <input value={whoPaid} onChange={(e) => setWhoPaid(e.target.value)} placeholder="Payer name"
                        className="w-full px-3 py-2.5 min-h-[44px] border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-400" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Receipt No. (optional)</label>
                      <input value={receiptNo} onChange={(e) => setReceiptNo(e.target.value)}
                        className="w-full px-3 py-2.5 min-h-[44px] border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-400" />
                    </div>
                  </>
                )}

                {/* Payment status preview */}
                <div className={`text-[10px] font-bold px-3 py-1.5 rounded-lg ${
                  !amountReceived ? 'bg-amber-50 text-amber-800 border border-amber-200'
                  : receivedAmount >= amountProposed ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-orange-50 text-orange-800 border border-orange-200'
                }`}>
                  Status:{' '}
                  {!amountReceived ? 'Pending'
                    : receivedAmount >= amountProposed ? 'Received (Full)'
                    : `Partial — ${formatINR(Math.max(amountProposed - receivedAmount, 0))} pending`}
                </div>
              </div>
            )}

            <button type="submit"
              className="w-full py-3 min-h-[44px] bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition">
              Log Liturgy Mass
            </button>
          </form>
        </div>

        {/* ── Special Mass Payments Table ── */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5 pb-2 border-b border-slate-100">
            <IndianRupee className="w-4 h-4 text-emerald-600" /> Special Mass Payments Database
          </h3>

          {/* All logged masses summary */}
          {masses.length > 0 && (
            <div className="mb-2">
              <p className="text-[10px] text-slate-400 uppercase font-bold mb-2">All Logged Masses ({masses.length})</p>
              <div className="flex flex-wrap gap-2">
                {masses.map((m) => (
                  <span key={m.id} className={`px-2 py-1 rounded-lg text-[10px] font-semibold border ${
                    isPaymentMass(m.category) ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}>
                    {m.name} · {m.date}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] text-slate-400 font-bold uppercase">
                  <th className="py-2.5">Sponsor / Party</th>
                  <th className="py-2.5">Solemn Rite</th>
                  <th className="py-2.5 text-right">Proposed</th>
                  <th className="py-2.5 text-right">Pending</th>
                  <th className="py-2.5 text-center">Status</th>
                  <th className="py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs">
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 text-sm">
                      No special mass payments logged yet. Select Special Mass / Death Mass above to add one.
                    </td>
                  </tr>
                ) : payments.map((p) => {
                  const locked  = !!lockedCalcs[p.id];
                  const pending = locked ? 0 : p.pendingAmount;
                  const received = p.status === 'Received' || locked;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition">
                      <td className="py-3">
                        <p className="font-bold text-slate-800">{p.partyName}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{p.mobile}</p>
                      </td>
                      <td className="py-3">
                        <p className="font-semibold text-slate-700">{p.massType}</p>
                        <p className="text-[10px] text-slate-400">{p.massDate} · {p.massTime}</p>
                      </td>
                      <td className="py-3 text-right font-bold font-mono">{formatINR(p.promisedAmount)}</td>
                      <td className={`py-3 text-right font-bold font-mono ${pending > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                        {formatINR(pending)}
                      </td>
                      <td className="py-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${
                          received ? 'bg-emerald-50 text-emerald-800 border-emerald-100' : 'bg-amber-50 text-amber-800 border-amber-100'
                        }`}>
                          {received ? 'Received' : 'Pending'}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          {!received && (
                            <button onClick={() => sendReminder(p)}
                              className="p-1 text-amber-700 hover:text-amber-900 bg-amber-50 border border-amber-200 rounded text-[9px] font-bold flex items-center gap-0.5 transition">
                              <Bell className="w-3 h-3" /> Remind
                            </button>
                          )}
                          <button onClick={() => setSelectedPaymentId(p.id)}
                            className={`p-1.5 rounded text-[10px] font-bold flex items-center gap-1 transition ${
                              selectedPaymentId === p.id ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
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

      {/* ── Share Calculation Engine ── */}
      {activePayment && (
        <div className="bg-slate-900 text-slate-100 p-6 md:p-8 rounded-3xl border border-slate-800 shadow-xl space-y-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-slate-700 pb-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-950 border border-emerald-800 text-emerald-400 p-2 rounded-xl">
                <Calculator className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-white flex items-center gap-2">
                  Share Calculation Engine
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                    isLocked ? 'bg-emerald-900 text-emerald-300' : 'bg-slate-800 text-amber-400'}`}>
                    {isLocked ? 'LOCKED' : 'LIVE'}
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  {activePayment.massType} · Sponsor: <strong className="text-slate-200">{activePayment.partyName}</strong>
                </p>
              </div>
            </div>
            <div>
              {isLocked ? (
                <button onClick={handleUnlock}
                  className="px-4 py-2.5 min-h-[44px] bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-300 font-bold text-xs rounded-xl flex items-center gap-1.5 transition">
                  <Unlock className="w-4 h-4" /> Unlock Editing
                </button>
              ) : (
                <button onClick={handleLock}
                  className="px-4 py-2.5 min-h-[44px] bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition">
                  <Lock className="w-4 h-4" /> Lock & Disburse
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Controls */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-emerald-400 uppercase font-mono">Attendance Parameters</h4>
              {[
                { label: 'Present Singers (Weight = 1)', val: singerCount, set: setSingerCount, max: 20 },
                { label: 'Present Instrumentalists (Weight = 2)', val: instrumentalistCount, set: setInstrumentalistCount, max: 10 },
              ].map(({ label, val, set, max }) => (
                <div key={label} className="bg-slate-800 p-3.5 rounded-xl border border-slate-700 space-y-2">
                  <div className="flex justify-between text-xs text-slate-300">
                    <span>{label}</span>
                    <span className="font-mono font-bold text-white text-sm">{val}</span>
                  </div>
                  <input type="range" min={0} max={max} value={val} disabled={isLocked}
                    onChange={(e) => set(Number(e.target.value))}
                    className="w-full accent-emerald-500 disabled:opacity-40" />
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 flex flex-col justify-between">
              <h4 className="text-xs font-bold text-emerald-400 uppercase font-mono mb-4">Choral Split Summary</h4>
              <div className="space-y-3 text-xs">
                {[
                  { label: 'Gross Amount',    val: formatINR(activePayment.promisedAmount), cls: 'text-white' },
                  { label: 'Total Units',     val: `${isLocked ? lockedCalcs[activePayment.id]?.totalUnits : calc.totalUnits} units`, cls: 'text-slate-200' },
                  { label: 'Unit Value',      val: formatINR(isLocked ? lockedCalcs[activePayment.id]?.unitValue : calc.unitValue), cls: 'text-emerald-400 text-sm font-extrabold' },
                ].map(({ label, val, cls }) => (
                  <div key={label} className="flex justify-between border-b border-slate-700 pb-2">
                    <span className="text-slate-400">{label}</span>
                    <span className={`font-bold font-mono ${cls}`}>{val}</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-emerald-300/70 font-mono mt-4 bg-emerald-950 p-2 rounded">
                {formatINR(activePayment.promisedAmount)} / ({singerCount}×1 + {instrumentalistCount}×2)
              </p>
            </div>

            {/* Per-member shares */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-emerald-400 uppercase font-mono">Disbursement Shares</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 text-center space-y-1">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Per Singer</p>
                  <p className="text-xl font-extrabold text-white font-mono">
                    {formatINR(isLocked ? lockedCalcs[activePayment.id]?.singerShare : calc.singerShare)}
                  </p>
                  <p className="text-[9px] text-emerald-400">Weight 1×</p>
                </div>
                <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 text-center space-y-1">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Per Musician</p>
                  <p className="text-xl font-extrabold text-amber-400 font-mono">
                    {formatINR(isLocked ? lockedCalcs[activePayment.id]?.instrumentShare : calc.instrumentalistShare)}
                  </p>
                  <p className="text-[9px] text-amber-400">Weight 2×</p>
                </div>
              </div>

              {/* Total distributed */}
              <div className="bg-slate-800 p-3 rounded-xl border border-slate-700 text-xs text-center">
                <p className="text-slate-400">Total distributed</p>
                <p className="text-lg font-extrabold text-emerald-400 font-mono">
                  {formatINR(
                    (isLocked ? lockedCalcs[activePayment.id]?.singerShare : calc.singerShare) * singerCount +
                    (isLocked ? lockedCalcs[activePayment.id]?.instrumentShare : calc.instrumentalistShare) * instrumentalistCount
                  )}
                </p>
              </div>

              <button
                onClick={() => alert(`Audit for ${activePayment.partyName}\nProposed: ${formatINR(activePayment.promisedAmount)}\nSingers (${singerCount}): ${formatINR(calc.singerShare)} each\nInstrumentalists (${instrumentalistCount}): ${formatINR(calc.instrumentalistShare)} each`)}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 border border-slate-700 transition">
                <Download className="w-3.5 h-3.5" /> Export Audit Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logged masses list */}
      {masses.length > 0 && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-900 text-sm pb-3 border-b border-slate-100 mb-4">
            All Logged Liturgies
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="text-[10px] text-slate-400 font-bold uppercase border-b border-slate-100">
                  <th className="pb-2">Name</th>
                  <th className="pb-2">Category</th>
                  <th className="pb-2">Date</th>
                  <th className="pb-2">Time</th>
                  <th className="pb-2">Language</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {masses.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="py-2.5 font-semibold text-slate-800">{m.name}</td>
                    <td className="py-2.5">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                        isPaymentMass(m.category) ? 'bg-amber-50 text-amber-800 border border-amber-100' : 'bg-slate-100 text-slate-600'
                      }`}>{m.category}</span>
                    </td>
                    <td className="py-2.5 font-mono text-slate-500">{m.date}</td>
                    <td className="py-2.5 text-slate-500">{m.time}</td>
                    <td className="py-2.5 text-slate-500">{m.language}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
