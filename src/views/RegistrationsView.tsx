import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  UserPlus,
  Phone,
  MessageSquare,
  MapPin,
  CalendarClock,
  FileSpreadsheet,
  RefreshCw,
  CheckCircle2,
  Check,
  Mail,
  Search,
} from 'lucide-react';

export const RegistrationsView: React.FC = () => {
  const {
    customerRegistrations,
    approveCustomerRegistration,
    rejectCustomerRegistration,
    hasSheetsAuth,
    connectGoogleSheetsAccount,
    sheetTargets,
    syncOneTargetSheet,
    sheetsSyncState,
    markRegistrationsSyncedToSheet,
  } = useApp();

  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Approved' | 'Rejected'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmRegSheetSync, setConfirmRegSheetSync] = useState(false);
  const [isSyncingRegs, setIsSyncingRegs] = useState(false);

  const pendingCount = customerRegistrations.filter((r) => r.status === 'Pending').length;
  const approvedCount = customerRegistrations.filter((r) => r.status === 'Approved').length;
  const rejectedCount = customerRegistrations.filter((r) => r.status === 'Rejected').length;
  const sheetSavedCount = customerRegistrations.filter((r) => r.syncedToSheet).length;

  const filteredRegistrations = useMemo(() => {
    return customerRegistrations.filter((reg) => {
      if (statusFilter !== 'All' && reg.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          reg.shopName.toLowerCase().includes(q) ||
          reg.ownerName.toLowerCase().includes(q) ||
          reg.whatsapp.toLowerCase().includes(q) ||
          reg.address.toLowerCase().includes(q) ||
          reg.id.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [customerRegistrations, statusFilter, searchQuery]);

  const handleConfirmSyncRegistrationsToSheet = async () => {
    setIsSyncingRegs(true);
    try {
      let authed = hasSheetsAuth;
      if (!authed) {
        authed = await connectGoogleSheetsAccount();
      }
      if (!authed) {
        setConfirmRegSheetSync(false);
        return;
      }
      const ownerTarget = sheetTargets.find((t) => t.fileKey === 'owner-master') || sheetTargets[0];
      if (ownerTarget) {
        const res = await syncOneTargetSheet(ownerTarget, 'Manual');
        if (res) {
          markRegistrationsSyncedToSheet();
        }
      }
      setConfirmRegSheetSync(false);
    } finally {
      setIsSyncingRegs(false);
    }
  };

  return (
    <div className="space-y-4 pb-28">
      {/* Header Banner */}
      <div className="glass-card rounded-3xl p-4.5 border border-emerald-200/80 shadow-md bg-gradient-to-br from-emerald-50/70 via-white to-sky-50/50">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm shrink-0">
              <UserPlus className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider block">
                Full Detail • Retailer Onboarding
              </span>
              <h2 className="text-base sm:text-lg font-black text-slate-900 truncate">
                New Customer Registrations ({customerRegistrations.length})
              </h2>
              <p className="text-[11px] text-slate-600">
                Complete date/time, Dokan name, Owner, WhatsApp, Call icon, Address & Google Sheet sync
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setConfirmRegSheetSync(true)}
            disabled={isSyncingRegs || sheetsSyncState === 'syncing'}
            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold flex items-center gap-1 shadow-xs shrink-0 transition disabled:opacity-60"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Save to Sheet</span>
          </button>
        </div>

        {/* Summary Numbers Table */}
        <div className="mt-3 rounded-2xl border border-emerald-200/80 overflow-hidden bg-white">
          <table className="w-full text-center border-collapse">
            <thead>
              <tr className="bg-emerald-50/90 border-b border-emerald-200/70 text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">
                <th className="py-1.5 px-2">New Registered</th>
                <th className="py-1.5 px-2">Pending</th>
                <th className="py-1.5 px-2">Approved ID</th>
                <th className="py-1.5 px-2">Sheet Saved</th>
              </tr>
            </thead>
            <tbody>
              <tr className="text-sm font-black">
                <td className="py-2 px-2 text-slate-900 border-r border-slate-100">
                  {customerRegistrations.length}
                </td>
                <td className="py-2 px-2 text-amber-600 border-r border-slate-100">
                  {pendingCount}
                </td>
                <td className="py-2 px-2 text-emerald-700 border-r border-slate-100">
                  {approvedCount}
                  {rejectedCount > 0 && (
                    <span className="text-[10px] font-bold text-rose-500 ml-1">(-{rejectedCount})</span>
                  )}
                </td>
                <td className="py-2 px-2 text-sky-700">{sheetSavedCount}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {confirmRegSheetSync && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 space-y-2 shadow-xs">
          <p className="font-bold">
            Confirm syncing {customerRegistrations.length} Retailer Registration entries into Google Sheet (Customer_Registrations table)?
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setConfirmRegSheetSync(false)}
              className="flex-1 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-xs"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSyncingRegs}
              onClick={() => void handleConfirmSyncRegistrationsToSheet()}
              className="flex-1 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-1"
            >
              {isSyncingRegs ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              <span>Confirm Sync</span>
            </button>
          </div>
        </div>
      )}

      {/* Search & Status Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search shop name, owner, WhatsApp or address..."
            className="w-full pl-9 pr-3 py-2 rounded-2xl bg-white border border-slate-200 text-xs text-slate-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          {(['All', 'Pending', 'Approved', 'Rejected'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-2 rounded-xl text-[11px] font-extrabold border transition ${
                statusFilter === st
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Full Registration Cards */}
      <div className="space-y-2.5">
        {filteredRegistrations.map((reg) => {
          const waDigits = (reg.whatsapp || '').replace(/\D/g, '');
          return (
            <div
              key={reg.id}
              className={`glass-card rounded-2xl p-3.5 border space-y-2 shadow-xs ${
                reg.status === 'Pending'
                  ? 'border-emerald-200 bg-emerald-50/35'
                  : reg.status === 'Approved'
                  ? 'border-sky-200 bg-sky-50/30'
                  : 'border-slate-200 bg-slate-50/40'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-mono font-bold text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                      {reg.id}
                    </span>
                    <span className="text-[10px] font-bold text-sky-800 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200 flex items-center gap-1">
                      <CalendarClock className="w-2.5 h-2.5" />
                      {reg.registeredAtDisplay}
                    </span>
                    {reg.syncedToSheet && (
                      <span className="text-[9px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                        <FileSpreadsheet className="w-2.5 h-2.5" />
                        Sheet Saved
                      </span>
                    )}
                  </div>
                  <h3 className="font-extrabold text-sm text-slate-900 mt-1">{reg.shopName}</h3>
                  <div className="flex items-center gap-1.5 flex-wrap text-xs text-slate-700 font-semibold mt-0.5">
                    <span>Owner: {reg.ownerName}</span>
                    <span className="text-slate-300">•</span>
                    <a
                      href={`tel:+91${waDigits}`}
                      className="inline-flex items-center gap-1 text-sky-700 hover:text-sky-900 font-bold"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>+91 {reg.whatsapp}</span>
                    </a>
                  </div>
                  <p className="text-xs text-slate-600 flex items-start gap-1 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span>{reg.address}</span>
                  </p>
                  <div className="mt-2 pt-2 border-t border-slate-200/70 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] text-slate-600 bg-white/80 rounded-xl p-2">
                    <div>
                      <span className="font-bold text-slate-500">Form Source:</span>{' '}
                      <span className="font-semibold text-slate-800">{reg.source || 'Google Form'}</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-500">City / Area:</span>{' '}
                      <span className="font-semibold text-slate-800">{reg.city || 'Odisha'}</span>
                    </div>
                    {reg.email && (
                      <div className="flex items-center gap-1 truncate">
                        <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{reg.email}</span>
                      </div>
                    )}
                    <div>
                      <span className="font-bold text-slate-500">Google Sheet:</span>{' '}
                      <span className={`font-bold ${reg.syncedToSheet ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {reg.syncedToSheet
                          ? `Saved${reg.lastSyncedAt ? ` (${new Date(reg.lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})` : ''}`
                          : 'Pending Sheet Sync'}
                      </span>
                    </div>
                  </div>
                </div>

                <span
                  className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase shrink-0 ${
                    reg.status === 'Pending'
                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                      : reg.status === 'Approved'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {reg.status}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <a
                    href={`tel:+91${waDigits}`}
                    className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call</span>
                  </a>
                  <a
                    href={`https://wa.me/91${waDigits}?text=${encodeURIComponent(
                      `Namaste ${reg.ownerName} ji (${reg.shopName})! Rupam Wholesale Nuapatna me aapka Retailer registration receive hua hai.`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </a>
                </div>

                {reg.status === 'Pending' ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => rejectCustomerRegistration(reg.id)}
                      className="px-3 py-1.5 rounded-xl bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold transition"
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      onClick={() => approveCustomerRegistration(reg.id)}
                      className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-extrabold flex items-center gap-1 shadow-xs transition"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Approve & Add Retailer ID</span>
                    </button>
                  </div>
                ) : reg.approvedCustomerId ? (
                  <span className="text-xs font-mono font-bold text-sky-800">
                    Retailer ID Active: {reg.approvedCustomerId}
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {/* Complete Table View */}
      <div className="glass-card rounded-3xl border border-slate-200 overflow-hidden shadow-md bg-white">
        <div className="px-4 py-2.5 bg-slate-900 text-white flex items-center justify-between gap-2">
          <span className="text-xs font-extrabold">
            Full New Retailer Registration Table ({filteredRegistrations.length})
          </span>
          <span className="text-[10px] text-emerald-300 font-semibold">Complete Ledger</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[680px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold text-slate-600 uppercase">
                <th className="py-2 px-3"># / Reg ID</th>
                <th className="py-2 px-3">Date & Time</th>
                <th className="py-2 px-3">Dokan & Owner</th>
                <th className="py-2 px-3">WhatsApp & Call</th>
                <th className="py-2 px-3">Full Address</th>
                <th className="py-2 px-3">Source / Sheet</th>
                <th className="py-2 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredRegistrations.map((reg, idx) => {
                const waDigits = (reg.whatsapp || '').replace(/\D/g, '');
                return (
                  <tr key={reg.id} className="hover:bg-sky-50/40">
                    <td className="py-2 px-3 font-mono font-bold text-slate-700 whitespace-nowrap">
                      #{idx + 1} • {reg.id}
                    </td>
                    <td className="py-2 px-3 text-slate-700 whitespace-nowrap">
                      {reg.registeredAtDisplay}
                    </td>
                    <td className="py-2 px-3">
                      <span className="font-extrabold text-slate-900 block">{reg.shopName}</span>
                      <span className="text-[10px] text-slate-500 block">{reg.ownerName}</span>
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-800">+91 {reg.whatsapp}</span>
                        <a
                          href={`tel:+91${waDigits}`}
                          className="w-6 h-6 rounded-lg bg-sky-100 hover:bg-sky-600 text-sky-700 hover:text-white flex items-center justify-center transition"
                          title={`Call ${reg.whatsapp}`}
                        >
                          <Phone className="w-3 h-3" />
                        </a>
                        <a
                          href={`https://wa.me/91${waDigits}`}
                          target="_blank"
                          rel="noreferrer"
                          className="w-6 h-6 rounded-lg bg-emerald-100 hover:bg-emerald-600 text-emerald-700 hover:text-white flex items-center justify-center transition"
                          title={`WhatsApp ${reg.whatsapp}`}
                        >
                          <MessageSquare className="w-3 h-3" />
                        </a>
                      </div>
                    </td>
                    <td className="py-2 px-3 text-slate-600 max-w-[220px]">{reg.address}</td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      <span className="font-semibold text-slate-700 block">
                        {reg.source || 'Google Form'}
                      </span>
                      <span
                        className={`text-[10px] font-bold ${
                          reg.syncedToSheet ? 'text-emerald-700' : 'text-amber-700'
                        }`}
                      >
                        {reg.syncedToSheet ? 'Sheet Saved' : 'Pending Sync'}
                      </span>
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          reg.status === 'Pending'
                            ? 'bg-amber-100 text-amber-900'
                            : reg.status === 'Approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {reg.status}
                      </span>
                      {reg.approvedCustomerId && (
                        <span className="block text-[10px] font-mono text-sky-700 mt-0.5">
                          {reg.approvedCustomerId}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
