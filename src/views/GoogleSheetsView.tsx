import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { tr } from '../data/translations';
import {
  FileSpreadsheet,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Table2,
  Layers,
  Link2,
  ShieldCheck,
  X,
  Download,
  Zap,
  History,
  FolderKanban,
  Store,
  Factory,
  Crown,
  Building2,
} from 'lucide-react';
import { SheetTargetDescriptor } from '../services/googleSheetsSync';

type PendingConfirmAction =
  | { type: 'sync-one'; target: SheetTargetDescriptor }
  | { type: 'sync-all' }
  | { type: 'enable-autosync'; target: SheetTargetDescriptor };

export const GoogleSheetsView: React.FC = () => {
  const {
    role,
    language,
    hasSheetsAuth,
    sheetsSyncState,
    sheetsAutoSync,
    lastSheetsError,
    sheetRegistry,
    sheetHistory,
    sheetTargets,
    activeSheetTarget,
    firebaseUser,
    connectGoogleSheetsAccount,
    disconnectGoogleSheetsAccount,
    setSheetsAutoSyncEnabled,
    syncOneTargetSheet,
    syncAllTargetsForOwner,
    linkExistingSpreadsheetForTarget,
    pullTableFromGoogleSheet,
    getTablesForTarget,
  } = useApp();

  const [selectedFileKey, setSelectedFileKey] = useState<string>(
    activeSheetTarget?.fileKey || sheetTargets[0]?.fileKey || ''
  );
  const [selectedTableName, setSelectedTableName] = useState<string>('');
  const [ownerFilterGroup, setOwnerFilterGroup] = useState<'all' | 'owner' | 'business' | 'customer' | 'supplier'>('all');
  const [linkInput, setLinkInput] = useState<string>('');
  const [showLinkBox, setShowLinkBox] = useState<boolean>(false);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirmAction | null>(null);
  const [liveSheetPullData, setLiveSheetPullData] = useState<{
    spreadsheetId: string;
    sheetTitle: string;
    rows: string[][];
  } | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);

  const inspectedTarget = useMemo(() => {
    const found = sheetTargets.find((t) => t.fileKey === selectedFileKey);
    return found || activeSheetTarget || sheetTargets[0] || null;
  }, [sheetTargets, selectedFileKey, activeSheetTarget]);

  const tablesForInspected = useMemo(() => {
    if (!inspectedTarget) return [];
    return getTablesForTarget(inspectedTarget);
  }, [inspectedTarget, getTablesForTarget]);

  const activeTable = useMemo(() => {
    return (
      tablesForInspected.find((t) => t.tableName === selectedTableName) ||
      tablesForInspected[0] ||
      null
    );
  }, [tablesForInspected, selectedTableName]);

  const inspectedRecord = inspectedTarget ? sheetRegistry[inspectedTarget.fileKey] : undefined;

  const filteredTargets = useMemo(() => {
    if (role !== 'owner') return sheetTargets;
    if (ownerFilterGroup === 'all') return sheetTargets;
    return sheetTargets.filter((t) => t.targetRole === ownerFilterGroup);
  }, [sheetTargets, role, ownerFilterGroup]);

  const handleGoogleSignIn = async () => {
    setIsConnecting(true);
    try {
      await connectGoogleSheetsAccount();
    } finally {
      setIsConnecting(false);
    }
  };

  const handleAutoSyncButtonClick = () => {
    if (sheetsAutoSync) {
      setSheetsAutoSyncEnabled(false);
      return;
    }
    if (!activeSheetTarget) return;
    setPendingConfirm({ type: 'enable-autosync', target: activeSheetTarget });
  };

  const handleConfirmAction = async () => {
    if (!pendingConfirm) return;
    const action = pendingConfirm;
    setPendingConfirm(null);

    if (!hasSheetsAuth) {
      const ok = await connectGoogleSheetsAccount();
      if (!ok) return;
    }

    if (action.type === 'enable-autosync') {
      setSheetsAutoSyncEnabled(true);
      await syncOneTargetSheet(action.target, 'Auto Sync');
    } else if (action.type === 'sync-one') {
      await syncOneTargetSheet(action.target, 'Manual');
    } else if (action.type === 'sync-all') {
      await syncAllTargetsForOwner();
    }
  };

  const handlePullLiveTable = async () => {
    if (!inspectedRecord?.spreadsheetId || !activeTable) return;
    const pulled = await pullTableFromGoogleSheet(
      inspectedRecord.spreadsheetId,
      activeTable.tableName
    );
    if (pulled) {
      setLiveSheetPullData({
        spreadsheetId: inspectedRecord.spreadsheetId,
        sheetTitle: pulled.sheetTitle,
        rows: pulled.rows,
      });
    }
  };

  const handleLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectedTarget || !linkInput.trim()) return;
    const ok = await linkExistingSpreadsheetForTarget(inspectedTarget, linkInput);
    if (ok) {
      setLinkInput('');
      setShowLinkBox(false);
    }
  };

  const getRoleBadge = (targetRole: SheetTargetDescriptor['targetRole']) => {
    switch (targetRole) {
      case 'owner':
        return { label: 'Owner Master', cls: 'bg-amber-100 text-amber-800 border-amber-200', Icon: Crown };
      case 'business':
        return { label: 'Business ID', cls: 'bg-sky-100 text-sky-800 border-sky-200', Icon: Building2 };
      case 'supplier':
        return { label: 'Supplier ID', cls: 'bg-purple-100 text-purple-800 border-purple-200', Icon: Factory };
      default:
        return { label: 'Retailer ID', cls: 'bg-orange-100 text-orange-800 border-orange-200', Icon: Store };
    }
  };

  const isShowingPulledLive =
    liveSheetPullData &&
    inspectedRecord &&
    liveSheetPullData.spreadsheetId === inspectedRecord.spreadsheetId &&
    activeTable &&
    liveSheetPullData.sheetTitle.toLowerCase() === activeTable.tableName.toLowerCase();

  return (
    <div className="space-y-4 pb-24 sm:pb-28">
      {/* Top Hero Header Card */}
      <div className="glass-card rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-emerald-200/80 bg-gradient-to-br from-emerald-50/80 via-white to-sky-50/60 shadow-sm space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-green-500 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 shrink-0">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 className="text-base sm:text-xl font-black text-slate-900 tracking-tight">
                  {tr('Google Sheets Sync', language)}
                </h2>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                    sheetsSyncState === 'syncing'
                      ? 'bg-sky-100 text-sky-800 border-sky-200'
                      : sheetsSyncState === 'error'
                      ? 'bg-rose-100 text-rose-800 border-rose-200'
                      : hasSheetsAuth
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  {sheetsSyncState === 'syncing'
                    ? 'Syncing...'
                    : sheetsSyncState === 'error'
                    ? 'Sync Error'
                    : hasSheetsAuth
                    ? 'Google Connected'
                    : 'Sign-In Required'}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-600 mt-0.5">
                {role === 'owner'
                  ? 'Owner Master + Separate Google Sheet files for every Business, Retailer, and Supplier ID with separate data tables.'
                  : 'Your dedicated Google Sheet file with separate tables scoped exclusively to your logged-in ID.'}
              </p>
            </div>
          </div>

          {/* Google Sign-In or Connected User + Auto Sync Button */}
          <div className="flex flex-wrap items-center gap-2">
            {!hasSheetsAuth ? (
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isConnecting}
                className="gsi-material-button"
              >
                <div className="gsi-material-button-state"></div>
                <div className="gsi-material-button-content-wrapper">
                  <div className="gsi-material-button-icon">
                    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block' }}>
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                      <path fill="none" d="M0 0h48v48H0z" />
                    </svg>
                  </div>
                  <span className="gsi-material-button-contents">
                    {isConnecting ? 'Connecting...' : 'Sign in with Google'}
                  </span>
                </div>
              </button>
            ) : (
              <div className="px-3 py-1.5 rounded-full bg-white border border-emerald-200 text-[11px] font-bold text-emerald-900 flex items-center gap-1.5 shadow-2xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="truncate max-w-[160px]">{firebaseUser?.email || 'Google Sheets Ready'}</span>
                <button
                  type="button"
                  onClick={disconnectGoogleSheetsAccount}
                  className="ml-1 text-[10px] font-extrabold text-rose-600 hover:underline shrink-0"
                  title="Disconnect / Switch Gmail ID"
                >
                  Switch
                </button>
              </div>
            )}

            {/* Prominent Auto Sync Toggle Button */}
            <button
              type="button"
              onClick={handleAutoSyncButtonClick}
              className={`px-3.5 py-2 rounded-xl font-extrabold text-xs flex items-center gap-1.5 border shadow-xs active:scale-95 transition ${
                sheetsAutoSync
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700'
                  : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-300'
              }`}
            >
              <Zap className={`w-3.5 h-3.5 ${sheetsAutoSync ? 'fill-white' : 'text-amber-500'}`} />
              <span>{sheetsAutoSync ? tr('Auto Sync ON', language) : tr('Auto Sync OFF', language)}</span>
            </button>
          </div>
        </div>

        {/* Last Error Banner (if any) */}
        {lastSheetsError && (
          <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start justify-between gap-2">
            <div className="flex items-start gap-2 min-w-0">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="break-words">{lastSheetsError}</span>
            </div>
            {!hasSheetsAuth && (
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-bold text-[10px] shrink-0"
              >
                Reconnect
              </button>
            )}
          </div>
        )}
      </div>

      {/* Owner All-IDs File Manager OR Active Role Single File Card */}
      {role === 'owner' && (
        <div className="glass-card rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 border border-white/90 shadow-sm space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <FolderKanban className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-black text-slate-900">
                  {tr('Separate Sheet Files', language)} ({Object.keys(sheetRegistry).length}/{sheetTargets.length} Linked)
                </h3>
                <p className="text-[10px] text-slate-500">
                  Owner sees Master All-Data Sheet + every Business, Retailer & Supplier ID sheet file
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={sheetsSyncState === 'syncing'}
              onClick={() => setPendingConfirm({ type: 'sync-all' })}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-60 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-xs active:scale-95 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${sheetsSyncState === 'syncing' ? 'animate-spin' : ''}`} />
              <span>{tr('Sync All IDs', language)} ({sheetTargets.length})</span>
            </button>
          </div>

          {/* Group Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            {(
              [
                { id: 'all', label: `All IDs (${sheetTargets.length})` },
                { id: 'owner', label: 'Owner Master' },
                { id: 'business', label: 'Business IDs' },
                { id: 'customer', label: 'Retailer IDs' },
                { id: 'supplier', label: 'Supplier IDs' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setOwnerFilterGroup(tab.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap border transition ${
                  ownerFilterGroup === tab.id
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Horizontal Selector Cards for Separate ID Files */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-60 overflow-y-auto pr-0.5">
            {filteredTargets.map((tgt) => {
              const rec = sheetRegistry[tgt.fileKey];
              const isSelected = inspectedTarget?.fileKey === tgt.fileKey;
              const badge = getRoleBadge(tgt.targetRole);
              const BadgeIcon = badge.Icon;

              return (
                <div
                  key={tgt.fileKey}
                  onClick={() => {
                    setSelectedFileKey(tgt.fileKey);
                    setSelectedTableName('');
                    setLiveSheetPullData(null);
                  }}
                  className={`p-2.5 rounded-xl border text-left cursor-pointer transition space-y-1.5 ${
                    isSelected
                      ? 'bg-emerald-50/90 border-emerald-400 ring-1 ring-emerald-300 shadow-xs'
                      : 'bg-white/90 border-slate-200 hover:border-emerald-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-extrabold border inline-flex items-center gap-1 ${badge.cls}`}>
                      <BadgeIcon className="w-2.5 h-2.5" />
                      {badge.label}
                    </span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                        rec
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {rec ? `${rec.tables.length} Tables • ${rec.totalRows} Rows` : 'Ready'}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-extrabold text-slate-900 truncate">{tgt.label}</h4>
                    <p className="text-[10px] text-slate-500 truncate">{tgt.subtitle}</p>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px]">
                    <span className="font-mono text-slate-400 truncate max-w-[120px]">
                      {rec ? rec.spreadsheetId : 'Not created yet'}
                    </span>
                    {rec?.spreadsheetUrl && (
                      <a
                        href={rec.spreadsheetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="font-bold text-emerald-700 hover:underline inline-flex items-center gap-0.5 shrink-0"
                      >
                        Open <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected ID Sheet File Control & Separate Tables Viewer */}
      {inspectedTarget && (
        <div className="glass-card rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-white/90 shadow-md space-y-3.5">
          {/* Selected File Header & Actions */}
          <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="min-w-0">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 block">
                Active ID Spreadsheet File
              </span>
              <h3 className="text-sm sm:text-base font-black text-slate-900 truncate">
                {inspectedTarget.label}
              </h3>
              <p className="text-[11px] text-slate-500 truncate">{inspectedTarget.sheetTitle}</p>
              {inspectedRecord ? (
                <p className="text-[10px] font-mono text-emerald-700 mt-0.5 truncate">
                  Sheet ID: {inspectedRecord.spreadsheetId} • Synced:{' '}
                  {new Date(inspectedRecord.lastSyncedAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              ) : (
                <p className="text-[10px] text-amber-700 font-semibold mt-0.5">
                  No Google Sheet file created yet for this ID — click &quot;Sync Now&quot; to create &amp; populate all tables.
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                disabled={sheetsSyncState === 'syncing'}
                onClick={() => setPendingConfirm({ type: 'sync-one', target: inspectedTarget })}
                className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-xs active:scale-95 transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${sheetsSyncState === 'syncing' ? 'animate-spin' : ''}`} />
                <span>{inspectedRecord ? tr('Sync Now', language) : 'Create & Sync Sheet'}</span>
              </button>

              {inspectedRecord?.spreadsheetUrl && (
                <>
                  <a
                    href={inspectedRecord.spreadsheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition"
                  >
                    <span>{tr('Open Google Sheet', language)}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  <button
                    type="button"
                    disabled={sheetsSyncState === 'syncing'}
                    onClick={handlePullLiveTable}
                    className="px-2.5 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-800 font-bold text-xs flex items-center gap-1 transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{tr('Pull from Sheet', language)}</span>
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => setShowLinkBox((v) => !v)}
                className="px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1 transition"
                title="Link existing Google Sheet URL or ID"
              >
                <Link2 className="w-3.5 h-3.5" />
                <span>Link URL</span>
              </button>
            </div>
          </div>

          {/* Link Existing Google Sheet Box */}
          {showLinkBox && (
            <form onSubmit={handleLinkSubmit} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap gap-2 items-center">
              <input
                type="text"
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
                placeholder="Paste Google Sheet URL or Spreadsheet ID..."
                className="flex-1 min-w-[200px] px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs"
              >
                Attach Sheet
              </button>
            </form>
          )}

          {/* Separate Tables Tabs */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold text-slate-600 flex items-center gap-1.5">
                <Table2 className="w-3.5 h-3.5 text-emerald-600" />
                {tr('Separate Tables', language)} ({tablesForInspected.length} Tabs in this Sheet)
              </span>
              {activeTable && (
                <span className="text-[10px] font-semibold text-slate-500">
                  {activeTable.description}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {tablesForInspected.map((tbl) => {
                const isActive = activeTable?.tableName === tbl.tableName;
                return (
                  <button
                    key={tbl.tableName}
                    type="button"
                    onClick={() => setSelectedTableName(tbl.tableName)}
                    className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap border flex items-center gap-1.5 transition ${
                      isActive
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>{tbl.label}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ${
                        isActive ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {tbl.rows.length}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Data Table Preview (Shows Pulled Live Sheet Values if pulled, otherwise Live Scoped App Data) */}
          {activeTable && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 font-bold text-slate-700">
                  <Layers className="w-3.5 h-3.5 text-sky-600" />
                  <span>
                    Table Tab: <code className="px-1.5 py-0.5 rounded bg-slate-100 font-mono">{activeTable.tableName}</code>
                  </span>
                  {isShowingPulledLive && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-sky-100 text-sky-800 border border-sky-200">
                      Live Pulled from Google Sheet
                    </span>
                  )}
                </div>
                {isShowingPulledLive && (
                  <button
                    type="button"
                    onClick={() => setLiveSheetPullData(null)}
                    className="text-[10px] font-bold text-slate-500 hover:text-slate-900 underline"
                  >
                    Show App Dataset
                  </button>
                )}
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white max-h-[340px]">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead className="sticky top-0 bg-emerald-50 border-b border-emerald-200 text-emerald-950 font-extrabold whitespace-nowrap z-10">
                    <tr>
                      <th className="py-2 px-2.5 text-slate-400 font-bold">#</th>
                      {(isShowingPulledLive && liveSheetPullData.rows[0]
                        ? liveSheetPullData.rows[0]
                        : activeTable.headers
                      ).map((h, i) => (
                        <th key={i} className="py-2 px-2.5">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {isShowingPulledLive ? (
                      liveSheetPullData.rows.slice(1).length === 0 ? (
                        <tr>
                          <td colSpan={20} className="py-6 text-center text-slate-400">
                            This Google Sheet table tab has no data rows yet.
                          </td>
                        </tr>
                      ) : (
                        liveSheetPullData.rows.slice(1).map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-slate-50/80">
                            <td className="py-1.5 px-2.5 text-slate-400 font-mono">{rIdx + 1}</td>
                            {row.map((val, cIdx) => (
                              <td key={cIdx} className="py-1.5 px-2.5 text-slate-800 whitespace-nowrap max-w-[220px] truncate">
                                {val}
                              </td>
                            ))}
                          </tr>
                        ))
                      )
                    ) : activeTable.rows.length === 0 ? (
                      <tr>
                        <td colSpan={activeTable.headers.length + 1} className="py-6 text-center text-slate-400">
                          No records found in this table for the selected ID.
                        </td>
                      </tr>
                    ) : (
                      activeTable.rows.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-slate-50/80">
                          <td className="py-1.5 px-2.5 text-slate-400 font-mono">{rIdx + 1}</td>
                          {row.map((val, cIdx) => (
                            <td key={cIdx} className="py-1.5 px-2.5 text-slate-800 whitespace-nowrap max-w-[220px] truncate">
                              {String(val)}
                            </td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recorded Sync History & File Registry Log */}
      <div className="glass-card rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 border border-white/90 shadow-sm space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-slate-900">
                File Record & Sync Audit Log
              </h3>
              <p className="text-[10px] text-slate-500">
                Records every separate Sheet file created/updated, table counts, and errors
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold text-slate-500">
            {sheetHistory.length} events
          </span>
        </div>

        {sheetHistory.length === 0 ? (
          <p className="text-[11px] text-slate-400 py-3 text-center">
            No Google Sheets sync events recorded yet. Click &quot;Create &amp; Sync Sheet&quot; above to begin.
          </p>
        ) : (
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
            {sheetHistory.slice(0, 15).map((entry) => (
              <div
                key={entry.id}
                className={`p-2 rounded-xl border text-[11px] flex items-center justify-between gap-2 ${
                  entry.status === 'Success'
                    ? 'bg-emerald-50/60 border-emerald-200/70'
                    : 'bg-rose-50/70 border-rose-200'
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-extrabold text-slate-900 truncate">{entry.label}</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-white border border-slate-200 text-slate-600">
                      {entry.mode}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-600 truncate">{entry.message}</p>
                </div>
                <span className="text-[10px] font-mono text-slate-500 shrink-0">
                  {new Date(entry.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Explicit Confirmation Modal for Mutating Google Sheets Operations */}
      {pendingConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900">
                    Confirm Google Sheets Update
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Explicit permission check before modifying Google Sheets
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPendingConfirm(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {pendingConfirm.type === 'sync-all' ? (
              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-950 space-y-1.5">
                <p className="font-bold">
                  Create or overwrite {sheetTargets.length} separate Google Sheet files for all IDs?
                </p>
                <p className="text-[11px] text-amber-800">
                  This will update Owner Master (all 13 tables) plus every Business ID, Retailer ID, and Supplier ID spreadsheet in your Google account with fresh app data.
                </p>
              </div>
            ) : (
              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 space-y-1.5">
                <p className="font-bold">
                  {pendingConfirm.type === 'enable-autosync'
                    ? `Enable Auto Sync and update Google Sheet for "${pendingConfirm.target.label}"?`
                    : sheetRegistry[pendingConfirm.target.fileKey]
                    ? `Update existing Google Sheet "${pendingConfirm.target.label}"?`
                    : `Create new Google Sheet file "${pendingConfirm.target.sheetTitle}"?`}
                </p>
                <p className="text-[11px] text-emerald-800">
                  Tables to write ({getTablesForTarget(pendingConfirm.target).length}):{' '}
                  {getTablesForTarget(pendingConfirm.target)
                    .map((t) => t.tableName)
                    .join(', ')}
                </p>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setPendingConfirm(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmAction()}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-sm"
              >
                {hasSheetsAuth ? 'Confirm & Sync' : 'Sign in & Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
