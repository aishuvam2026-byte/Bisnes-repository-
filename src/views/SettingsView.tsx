import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Settings, Shield, ToggleLeft, ToggleRight, Save, Database, History, RefreshCw, Cloud, ExternalLink, AlertCircle, CheckCircle2 } from 'lucide-react';
import { FIREBASE_PROJECT_INFO } from '../firebase';

export const SettingsView: React.FC = () => {
  const {
    settings,
    updateSettings,
    activityLogs,
    firebaseUser,
    firebaseSyncState,
    firebaseConnected,
    lastFirebaseSyncAt,
    lastFirebaseError,
    syncedCollectionsCount,
    connectAndSyncFirebase,
    syncToFirebase,
    pullFromFirebase,
    disconnectFirebase,
  } = useApp();

  const [minOrder, setMinOrder] = useState<number>(settings.minOrderValue);
  const [advanceAmt, setAdvanceAmt] = useState<number>(settings.advanceBookingAmount);
  const [freeRadius, setFreeRadius] = useState<number>(settings.freeDeliveryRadiusKm);
  const [maxShortage, setMaxShortage] = useState<number>(settings.maxUdhaarShortagePercent);
  const [gstEnabled, setGstEnabled] = useState<boolean>(settings.gstEnabled);
  const [upiId, setUpiId] = useState<string>(settings.upiId);

  const handleSaveRules = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      minOrderValue: Number(minOrder),
      advanceBookingAmount: Number(advanceAmt),
      freeDeliveryRadiusKm: Number(freeRadius),
      maxUdhaarShortagePercent: Number(maxShortage),
      gstEnabled,
      upiId,
    });
  };

  return (
    <div className="space-y-3 pb-24 sm:pb-28">
      {/* Header */}
      <div className="glass-card rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 border border-white/90 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl overflow-hidden bg-sky-50 border border-white shadow-xs shrink-0">
            <img
              src="/assets/aistudio/IMG_20261113_083134_a6a26f75.jpg"
              alt="Rupam App Icon"
              className="w-full h-full object-cover scale-[1.09]"
            />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900">Settings &amp; Admin Panel</h2>
            <p className="text-[11px] text-slate-500">Firebase cloud connection, business rules &amp; UPI</p>
          </div>
        </div>
      </div>

      {/* Firebase Cloud Firestore Connection Card */}
      <div className="glass-card rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 border border-amber-200/80 bg-gradient-to-br from-amber-50/80 via-white to-orange-50/70 shadow-sm space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs shrink-0">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-extrabold text-slate-900">Firebase Cloud Firestore</h3>
              <p className="text-[10px] text-slate-500 font-mono">
                {FIREBASE_PROJECT_INFO.projectId}
              </p>
            </div>
          </div>
          <span
            className={`text-[9px] sm:text-[10px] font-extrabold px-2 py-0.5 rounded-full border shrink-0 ${
              firebaseUser && firebaseSyncState === 'synced'
                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                : firebaseSyncState === 'syncing'
                ? 'bg-sky-100 text-sky-800 border-sky-200'
                : firebaseSyncState === 'error'
                ? 'bg-rose-100 text-rose-800 border-rose-200'
                : firebaseConnected
                ? 'bg-amber-100 text-amber-800 border-amber-200'
                : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}
          >
            {firebaseUser && firebaseSyncState === 'synced'
              ? 'Connected'
              : firebaseSyncState === 'syncing'
              ? 'Syncing...'
              : firebaseSyncState === 'error'
              ? 'Sync Error'
              : firebaseConnected
              ? 'Ready'
              : 'Offline'}
          </span>
        </div>

        <div className="p-2 rounded-xl bg-white/90 border border-amber-100 text-[10px] sm:text-[11px] space-y-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-500">Firestore DB:</span>
            <span className="font-mono text-slate-800 truncate max-w-[170px] sm:max-w-[220px]">
              {FIREBASE_PROJECT_INFO.databaseId}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-500">Google Auth:</span>
            <span className="font-bold text-slate-900 truncate max-w-[170px] sm:max-w-[220px]">
              {firebaseUser ? firebaseUser.email || firebaseUser.displayName : 'Not signed in'}
            </span>
          </div>
          {lastFirebaseSyncAt && (
            <div className="flex items-center justify-between gap-2 text-emerald-700 font-semibold">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Last Sync:
              </span>
              <span>
                {new Date(lastFirebaseSyncAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                {syncedCollectionsCount > 0 ? ` (${syncedCollectionsCount} cols)` : ''}
              </span>
            </div>
          )}
        </div>

        {lastFirebaseError && (
          <div className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-[10px] text-rose-800 flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
            <span className="break-all">{lastFirebaseError}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={firebaseSyncState === 'syncing'}
            onClick={() => void (firebaseUser ? syncToFirebase() : connectAndSyncFirebase())}
            className="py-2 px-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 disabled:opacity-60 text-white font-extrabold text-[11px] sm:text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition"
          >
            <Cloud className="w-3.5 h-3.5" />
            <span>{firebaseUser ? 'Sync Data Now' : 'Connect Firebase'}</span>
          </button>

          <a
            href={FIREBASE_PROJECT_INFO.consoleManageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="py-2 px-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-[11px] sm:text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition"
          >
            <span>Firebase Console</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {firebaseUser && (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={firebaseSyncState === 'syncing'}
              onClick={() => void pullFromFirebase()}
              className="py-1.5 px-2.5 rounded-xl bg-white hover:bg-amber-50 border border-amber-200 text-amber-900 font-bold text-[11px] flex items-center justify-center gap-1.5 transition"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Pull from Cloud</span>
            </button>
            <button
              type="button"
              onClick={() => void disconnectFirebase()}
              className="py-1.5 px-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-[11px] flex items-center justify-center transition"
            >
              Sign Out Cloud
            </button>
          </div>
        )}
      </div>

      {/* Business Rules Form */}
      <div className="glass-card rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 border border-white/90 shadow-sm">
        <h3 className="text-xs sm:text-sm font-bold text-slate-900 mb-2.5 flex items-center gap-1.5">
          <Shield className="w-4 h-4 text-sky-600" /> Configurable Wholesale Rules
        </h3>

        <form onSubmit={handleSaveRules} className="space-y-3">
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Min Order Value (₹)
              </label>
              <input
                type="number"
                value={minOrder}
                onChange={(e) => setMinOrder(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Booking Advance (₹)
              </label>
              <input
                type="number"
                value={advanceAmt}
                onChange={(e) => setAdvanceAmt(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Free Radius (km)
              </label>
              <input
                type="number"
                value={freeRadius}
                onChange={(e) => setFreeRadius(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Max Udhaar (%)
              </label>
              <input
                type="number"
                value={maxShortage}
                onChange={(e) => setMaxShortage(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">Business UPI ID</label>
            <input
              type="text"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-mono font-bold text-slate-800"
            />
          </div>

          {/* Resized GST Toggle */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <span className="text-xs font-bold text-slate-800 block">GST Billing Mode</span>
              <span className="text-[10px] text-slate-500">Show HSN &amp; CGST/SGST/IGST on invoices</span>
            </div>
            <button
              type="button"
              onClick={() => setGstEnabled(!gstEnabled)}
              className={`p-0.5 rounded-lg transition shrink-0 ${gstEnabled ? 'text-emerald-600' : 'text-slate-400'}`}
              aria-label="Toggle GST Billing Mode"
            >
              {gstEnabled ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
            </button>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs sm:text-sm shadow-sm active:scale-98 transition flex items-center justify-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" /> Save Business Rules
          </button>
        </form>
      </div>

      {/* Activity Log */}
      <div className="glass-card rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 border border-white/90 shadow-sm">
        <h3 className="text-xs sm:text-sm font-bold text-slate-900 mb-2 flex items-center gap-1.5">
          <History className="w-4 h-4 text-slate-600" /> Audit &amp; Activity Trail
        </h3>

        <div className="space-y-1.5 text-xs max-h-44 overflow-y-auto pr-1">
          {activityLogs.map((log) => (
            <div key={log.id} className="p-2 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-bold text-slate-900">{log.action}</span>
                <span className="text-slate-400">{log.timestamp}</span>
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5">{log.details}</p>
              {log.reason && <p className="text-slate-500 italic text-[10px]">Reason: {log.reason}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
