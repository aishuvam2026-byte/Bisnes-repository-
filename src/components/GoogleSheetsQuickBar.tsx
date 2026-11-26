import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { tr } from '../data/translations';
import {
  FileSpreadsheet,
  Zap,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  X,
} from 'lucide-react';

export const GoogleSheetsQuickBar: React.FC = () => {
  const {
    role,
    language,
    hasSheetsAuth,
    sheetsSyncState,
    sheetsAutoSync,
    activeSheetTarget,
    sheetRegistry,
    sheetTargets,
    connectGoogleSheetsAccount,
    setSheetsAutoSyncEnabled,
    syncOneTargetSheet,
    getTablesForTarget,
    openMorePage,
  } = useApp();

  const [confirmMode, setConfirmMode] = useState<'autosync' | 'syncnow' | null>(null);

  if (!activeSheetTarget) return null;

  const activeRecord = sheetRegistry[activeSheetTarget.fileKey];
  const tables = getTablesForTarget(activeSheetTarget);

  const handleConfirm = async () => {
    const mode = confirmMode;
    setConfirmMode(null);
    if (!hasSheetsAuth) {
      const ok = await connectGoogleSheetsAccount();
      if (!ok) return;
    }
    if (mode === 'autosync') {
      setSheetsAutoSyncEnabled(true);
      await syncOneTargetSheet(activeSheetTarget, 'Auto Sync');
    } else if (mode === 'syncnow') {
      await syncOneTargetSheet(activeSheetTarget, 'Manual');
    }
  };

  return (
    <>
      <div className="glass-card rounded-2xl sm:rounded-3xl p-3 sm:p-4 border border-emerald-200/80 bg-gradient-to-br from-emerald-50/75 via-white to-teal-50/50 shadow-xs space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-green-500 text-white flex items-center justify-center shadow-xs shrink-0">
              <FileSpreadsheet className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-xs sm:text-sm font-black text-slate-900 truncate">
                  {tr('Google Sheets Sync', language)}
                </h3>
                <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {tables.length} Tables
                </span>
                {role === 'owner' && (
                  <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                    {sheetTargets.length} ID Files
                  </span>
                )}
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-600 truncate mt-0.5">
                {activeRecord
                  ? `Linked File • ${activeRecord.totalRows} rows synced`
                  : `${activeSheetTarget.label} • Separate Sheet File`}
              </p>
            </div>
          </div>

          {/* Auto Sync Toggle Button */}
          <button
            type="button"
            onClick={() => {
              if (sheetsAutoSync) {
                setSheetsAutoSyncEnabled(false);
              } else {
                setConfirmMode('autosync');
              }
            }}
            className={`px-2.5 py-1.5 rounded-xl text-[10px] sm:text-[11px] font-extrabold border flex items-center gap-1 shadow-2xs active:scale-95 transition shrink-0 ${
              sheetsAutoSync
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700'
                : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-300'
            }`}
          >
            <Zap className={`w-3 h-3 ${sheetsAutoSync ? 'fill-white' : 'text-amber-500'}`} />
            <span>{sheetsAutoSync ? tr('Auto Sync ON', language) : tr('Auto Sync OFF', language)}</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            disabled={sheetsSyncState === 'syncing'}
            onClick={() => setConfirmMode('syncnow')}
            className="flex-1 min-w-[110px] py-1.5 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-extrabold text-[11px] flex items-center justify-center gap-1 shadow-xs active:scale-95 transition"
          >
            <RefreshCw className={`w-3 h-3 ${sheetsSyncState === 'syncing' ? 'animate-spin' : ''}`} />
            <span>{activeRecord ? tr('Sync Now', language) : 'Create Sheet'}</span>
          </button>

          <button
            type="button"
            onClick={() => openMorePage('googleSheets')}
            className="flex-1 min-w-[120px] py-1.5 px-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] flex items-center justify-center gap-1 shadow-xs active:scale-95 transition"
          >
            <span>{tr('Live Sheet Preview', language)}</span>
            <ChevronRight className="w-3 h-3" />
          </button>

          {activeRecord?.spreadsheetUrl && (
            <a
              href={activeRecord.spreadsheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="py-1.5 px-2.5 rounded-xl bg-white hover:bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-[11px] flex items-center justify-center gap-1 transition"
            >
              <span>Open</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>

      {confirmMode && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-3.5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900">Confirm Google Sheets Sync</h4>
                  <p className="text-[10px] text-slate-500">Explicit approval required before updating Sheet</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConfirmMode(null)}
                className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 space-y-1">
              <p className="font-bold">
                {confirmMode === 'autosync'
                  ? `Turn ON Auto Sync & write "${activeSheetTarget.label}"?`
                  : activeRecord
                  ? `Update existing sheet "${activeSheetTarget.label}"?`
                  : `Create new Google Sheet "${activeSheetTarget.sheetTitle}"?`}
              </p>
              <p className="text-[11px] text-emerald-800">
                Will sync {tables.length} separate tables ({tables.reduce((s, t) => s + t.rows.length, 0)} rows).
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmMode(null)}
                className="px-3.5 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleConfirm()}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white font-extrabold text-xs"
              >
                {hasSheetsAuth ? 'Confirm & Sync' : 'Sign in & Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
