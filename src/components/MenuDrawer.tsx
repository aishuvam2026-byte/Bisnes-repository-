import React from 'react';
import { useApp } from '../context/AppContext';
import {
  X,
  Shield,
  Store,
  Building2,
  Settings,
  MapPin,
  Contact,
  Calculator,
  FileText,
  LogOut,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  UserCheck,
  Cloud,
  Database,
  AlertCircle,
  Pencil,
  FileSpreadsheet,
  Zap,
} from 'lucide-react';
import { Language, UserRole } from '../types';
import { AccountSwitcherModal } from './AccountSwitcherModal';
import { FIREBASE_PROJECT_INFO } from '../firebase';
import { tr } from '../data/translations';

export const MenuDrawer: React.FC = () => {
  const {
    isMenuDrawerOpen,
    setIsMenuDrawerOpen,
    user,
    role,
    switchRole,
    language,
    setLanguage,
    t,
    settings,
    openMorePage,
    setActiveTab,
    logout,
    resetToDemoData,
    showToast,
    customers,
    suppliers,
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
    hasSheetsAuth,
    sheetsSyncState,
    sheetsAutoSync,
    activeSheetTarget,
    sheetRegistry,
    sheetTargets,
    getTablesForTarget,
    connectGoogleSheetsAccount,
    setSheetsAutoSyncEnabled,
  } = useApp();

  const [isAccountModalOpen, setIsAccountModalOpen] = React.useState(false);
  const [accountModalTab, setAccountModalTab] = React.useState<'owner' | 'customer' | 'supplier'>('owner');
  const [accountModalEditMode, setAccountModalEditMode] = React.useState(false);

  const openAccountModal = (tab: 'owner' | 'customer' | 'supplier', editMode = false) => {
    setAccountModalTab(tab);
    setAccountModalEditMode(editMode);
    setIsAccountModalOpen(true);
  };

  if (!isMenuDrawerOpen) return null;

  const loggedInCustomer = customers.find((c) => c.id === user?.customerId) || customers[0];
  const loggedInSupplier = suppliers.find((s) => s.id === user?.supplierId) || suppliers[0];

  const handleSelectRole = (newRole: UserRole) => {
    switchRole(newRole);
    setIsMenuDrawerOpen(false);
  };

  const handleSelectLanguage = (lang: Language) => {
    setLanguage(lang);
    showToast(
      lang === 'en'
        ? 'Language switched to English'
        : lang === 'hi'
        ? 'Bhasha Hinglish me badal gayi'
        : 'Bhasa Odia re badaligala'
    );
  };

  const navigateTo = (page: string, isTab = false) => {
    setIsMenuDrawerOpen(false);
    if (isTab) {
      setActiveTab(page);
    } else {
      openMorePage(page);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      {/* Drawer content sliding in from left */}
      <div
        className="w-[85%] max-w-sm bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-left duration-200 border-r border-slate-100"
        role="dialog"
        aria-label="Navigation Menu"
      >
        <div>
          {/* Top Profile Header */}
          <div className="p-3.5 sm:p-4 bg-gradient-to-br from-sky-500 via-sky-600 to-blue-700 text-white relative">
            <button
              onClick={() => setIsMenuDrawerOpen(false)}
              className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition"
              aria-label="Close Menu"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            <div className="flex items-center gap-2.5">
              <div className="relative w-10 h-10 shrink-0">
                <div className="w-10 h-10 rounded-xl overflow-hidden bg-sky-50 shadow-md border-2 border-white/70">
                  <img
                    src="/assets/aistudio/IMG_20261113_083134_a6a26f75.jpg"
                    alt="Rupam App Icon"
                    className="w-full h-full object-cover scale-[1.09]"
                  />
                </div>
                <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-md bg-slate-900 text-white text-[9px] font-black flex items-center justify-center border border-white shadow-xs">
                  {role === 'owner' ? 'O' : role === 'supplier' ? 'S' : 'D'}
                </span>
              </div>
              <div className="min-w-0 pr-6">
                <span className="text-[9px] font-bold uppercase tracking-wider text-sky-100 block">
                  {role === 'owner'
                    ? 'Wholesale Owner Account'
                    : role === 'supplier'
                    ? 'Supplier & Dealer Account'
                    : 'Retailer Bhai Account'}
                </span>
                <h3 className="font-extrabold text-white text-sm leading-snug truncate">
                  {role === 'owner'
                    ? settings.ownerName
                    : role === 'supplier'
                    ? loggedInSupplier.name
                    : loggedInCustomer.shopName}
                </h3>
                <p className="text-[11px] text-sky-100 mt-0.5 truncate">
                  {role === 'owner'
                    ? 'Nuapatna, Cuttack 754035'
                    : role === 'supplier'
                    ? `Authorized C&F • ID: ${loggedInSupplier.id}`
                    : `${loggedInCustomer.ownerName} • ID: ${loggedInCustomer.id}`}
                </p>
              </div>
            </div>
          </div>

          <div className="p-3.5 sm:p-4 space-y-3.5">
            {/* All IDs & Login Portals — strictly visible to Owner ID only */}
            {role === 'owner' && (
              <div>
                <div className="flex items-center justify-between mb-1.5 px-0.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    {tr('All IDs & Login Portals', language)}
                  </span>
                  <span className="text-[9px] text-slate-400 font-semibold">
                    {customers.length + suppliers.length + 1} IDs
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  <div
                    onClick={() => handleSelectRole('owner')}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && handleSelectRole('owner')}
                    className="p-2 rounded-xl border text-left transition cursor-pointer relative bg-blue-50 border-blue-500 ring-1 ring-blue-500/20 shadow-xs"
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openAccountModal('owner', true);
                      }}
                      className="absolute top-1.5 right-1.5 w-5 h-5 rounded-md bg-white/90 hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-200 flex items-center justify-center shadow-2xs transition"
                      title="Edit Owner ID"
                      aria-label="Edit Owner ID"
                    >
                      <Pencil className="w-2.5 h-2.5" />
                    </button>
                    <div className="w-6 h-6 rounded-md bg-blue-600 text-white flex items-center justify-center mb-1 shadow-2xs">
                      <Shield className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[11px] font-bold text-slate-900 block truncate">{t.ownerId}</span>
                    <span className="text-[9px] text-slate-500 truncate block">Master Hub</span>
                  </div>

                  <div
                    onClick={() => handleSelectRole('customer')}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && handleSelectRole('customer')}
                    className="p-2 rounded-xl border text-left transition cursor-pointer relative bg-slate-50 border-slate-200 hover:bg-slate-100/70"
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openAccountModal('customer', true);
                      }}
                      className="absolute top-1.5 right-1.5 w-5 h-5 rounded-md bg-white/90 hover:bg-amber-600 text-amber-700 hover:text-white border border-amber-200 flex items-center justify-center shadow-2xs transition"
                      title="Edit Retailer ID"
                      aria-label="Edit Retailer ID"
                    >
                      <Pencil className="w-2.5 h-2.5" />
                    </button>
                    <div className="w-6 h-6 rounded-md bg-amber-600 text-white flex items-center justify-center mb-1 shadow-2xs">
                      <Store className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[11px] font-bold text-slate-900 block truncate">{t.dukaniId}</span>
                    <span className="text-[9px] text-slate-500 truncate block">{customers.length} Retailers</span>
                  </div>

                  <div
                    onClick={() => handleSelectRole('supplier')}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && handleSelectRole('supplier')}
                    className="p-2 rounded-xl border text-left transition cursor-pointer relative bg-slate-50 border-slate-200 hover:bg-slate-100/70"
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openAccountModal('supplier', true);
                      }}
                      className="absolute top-1.5 right-1.5 w-5 h-5 rounded-md bg-white/90 hover:bg-purple-600 text-purple-700 hover:text-white border border-purple-200 flex items-center justify-center shadow-2xs transition"
                      title="Edit Supplier ID"
                      aria-label="Edit Supplier ID"
                    >
                      <Pencil className="w-2.5 h-2.5" />
                    </button>
                    <div className="w-6 h-6 rounded-md bg-purple-600 text-white flex items-center justify-center mb-1 shadow-2xs">
                      <Building2 className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[11px] font-bold text-slate-900 block truncate">{t.supplierId}</span>
                    <span className="text-[9px] text-slate-500 truncate block">{suppliers.length} Dealers</span>
                  </div>
                </div>

                {/* Dedicated All ID Option button */}
                <button
                  type="button"
                  onClick={() => openAccountModal('owner', false)}
                  className="w-full mt-1.5 py-2 px-2.5 rounded-xl bg-gradient-to-r from-slate-900 to-indigo-950 hover:from-slate-800 hover:to-indigo-900 text-white text-[11px] font-bold flex items-center justify-center gap-1.5 shadow-xs transition"
                >
                  <UserCheck className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span className="truncate">{tr('All ID Options: Select Retailer / Supplier ID →', language)}</span>
                </button>
              </div>
            )}

            {/* Section 2: Language Selector */}
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 px-0.5">
                {tr('Select Language', language)}
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { code: 'en', label: 'English' },
                  { code: 'hi', label: 'Hinglish' },
                  { code: 'or', label: 'Odia' },
                ].map((l) => (
                  <button
                    key={l.code}
                    onClick={() => handleSelectLanguage(l.code as Language)}
                    className={`py-1.5 px-1 rounded-lg text-[11px] font-bold border transition ${
                      language === l.code
                        ? 'bg-sky-600 text-white border-sky-600 shadow-2xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Section 3: Navigation Menu Links */}
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 px-0.5">
                {tr('Quick Shortcuts', language)}
              </span>
              <div className="space-y-1">
                {role === 'owner' ? (
                  <>
                    <button
                      onClick={() => navigateTo('customerHub')}
                      className="w-full flex items-center justify-between p-2 rounded-xl bg-sky-50/70 hover:bg-sky-100/80 text-left transition text-slate-800 text-[11px] font-semibold border border-sky-200/60"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-lg bg-sky-600 text-white flex items-center justify-center shrink-0">
                          <Store className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-sky-900 block truncate">
                            {tr('Retailer & Shopkeeper Hub', language)}
                          </span>
                          <span className="text-[9px] text-sky-700 block truncate">Retailer Bhai & Supplier Network</span>
                        </div>
                      </div>
                      <span className="text-[9px] bg-sky-600 text-white px-1.5 py-0.5 rounded-full font-bold shrink-0">New</span>
                    </button>

                    <button
                      onClick={() => navigateTo('map')}
                      className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-100 text-left transition text-slate-800 text-[11px] font-semibold"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-cyan-100 text-cyan-700 flex items-center justify-center shrink-0">
                          <MapPin className="w-3.5 h-3.5" />
                        </div>
                        <span>{tr('Retailer Map & 150 km Radius', language)}</span>
                      </div>
                      <span className="text-[9px] text-slate-400 font-bold">{tr('Open', language)}</span>
                    </button>

                    <button
                      onClick={() => navigateTo('invoices')}
                      className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-100 text-left transition text-slate-800 text-[11px] font-semibold"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                          <FileText className="w-3.5 h-3.5" />
                        </div>
                        <span>{tr('Invoices, Bills & GST', language)}</span>
                      </div>
                      <span className="text-[9px] text-slate-400 font-bold">{tr('Open', language)}</span>
                    </button>

                    <button
                      onClick={() => navigateTo('contacts')}
                      className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-100 text-left transition text-slate-800 text-[11px] font-semibold"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center shrink-0">
                          <Contact className="w-3.5 h-3.5" />
                        </div>
                        <span>{tr('Saved Contacts (vCard Export)', language)}</span>
                      </div>
                      <span className="text-[9px] text-slate-400 font-bold">{tr('Open', language)}</span>
                    </button>

                    <button
                      onClick={() => navigateTo('landedCost')}
                      className="w-full flex items-center justify-between p-2 rounded-xl bg-teal-50/80 hover:bg-teal-100/80 text-left transition text-teal-950 text-[11px] font-semibold border border-teal-200/80"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-lg bg-teal-600 text-white flex items-center justify-center shrink-0">
                          <Calculator className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold block truncate">{tr('Landed Cost Calculator', language)}</span>
                          <span className="text-[9px] text-teal-700 block truncate">
                            {tr('Owner ID Rule Settings Table', language)}
                          </span>
                        </div>
                      </div>
                      <span className="text-[9px] bg-teal-600 text-white px-1.5 py-0.5 rounded-full font-bold shrink-0">Tool</span>
                    </button>

                    <button
                      onClick={() => navigateTo('taxHelper')}
                      className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-100 text-left transition text-slate-800 text-[11px] font-semibold"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                          <Calculator className="w-3.5 h-3.5" />
                        </div>
                        <span>{tr('GST & Tax Helper', language)}</span>
                      </div>
                      <span className="text-[9px] text-slate-400 font-bold">{tr('Open', language)}</span>
                    </button>

                    <button
                      onClick={() => navigateTo('landing')}
                      className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-100 text-left transition text-slate-800 text-[11px] font-semibold"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-green-100 text-green-700 flex items-center justify-center shrink-0">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </div>
                        <span>{tr('Public SEO Landing Page', language)}</span>
                      </div>
                      <span className="text-[9px] text-slate-400 font-bold">{tr('Preview', language)}</span>
                    </button>

                    <button
                      onClick={() => navigateTo('settings')}
                      className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-100 text-left transition text-slate-800 text-[11px] font-semibold"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-slate-200 text-slate-800 flex items-center justify-center shrink-0">
                          <Settings className="w-3.5 h-3.5" />
                        </div>
                        <span>{tr('Admin & Business Rules', language)}</span>
                      </div>
                      <span className="text-[9px] text-slate-400 font-bold">{tr('Configure', language)}</span>
                    </button>
                  </>
                ) : (
                  <>
                    {/* My Account Section (Supplier ID / Retailer ID) */}
                    <button
                      type="button"
                      onClick={() => openAccountModal(role === 'customer' ? 'customer' : 'supplier', true)}
                      className="w-full flex items-center justify-between p-2 rounded-xl bg-sky-50/80 hover:bg-sky-100/80 text-left transition text-slate-900 text-[11px] font-semibold border border-sky-200/80"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-lg bg-sky-600 text-white flex items-center justify-center shrink-0">
                          <UserCheck className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold block truncate">{tr('My Account', language)}</span>
                          <span className="text-[9px] text-sky-700 block truncate">
                            {role === 'supplier'
                              ? `${loggedInSupplier.name} • ID: ${loggedInSupplier.id}`
                              : `${loggedInCustomer.shopName} • ID: ${loggedInCustomer.id}`}
                          </span>
                        </div>
                      </div>
                      <span className="text-[9px] bg-sky-600 text-white px-1.5 py-0.5 rounded-full font-bold shrink-0">
                        {tr('Edit', language)}
                      </span>
                    </button>

                    {/* Invoice Bill Section */}
                    <button
                      onClick={() => navigateTo('invoices')}
                      className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-100 text-left transition text-slate-800 text-[11px] font-semibold"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                          <FileText className="w-3.5 h-3.5" />
                        </div>
                        <span>{tr('Invoices & Bills', language)}</span>
                      </div>
                      <span className="text-[9px] text-slate-400 font-bold">{tr('Open', language)}</span>
                    </button>

                    {/* Landed Cost Section */}
                    <button
                      onClick={() => navigateTo('landedCost')}
                      className="w-full flex items-center justify-between p-2 rounded-xl bg-teal-50/80 hover:bg-teal-100/80 text-left transition text-teal-950 text-[11px] font-semibold border border-teal-200/80"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-lg bg-teal-600 text-white flex items-center justify-center shrink-0">
                          <Calculator className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold block truncate">{tr('Landed Cost Calculator', language)}</span>
                          <span className="text-[9px] text-teal-700 block truncate">
                            {role === 'supplier'
                              ? tr('Supplier ID Rule Settings Table', language)
                              : tr('Retailer ID Rule Settings Table', language)}
                          </span>
                        </div>
                      </div>
                      <span className="text-[9px] bg-teal-600 text-white px-1.5 py-0.5 rounded-full font-bold shrink-0">Tool</span>
                    </button>

                    {/* Landing Page Section */}
                    <button
                      onClick={() => navigateTo('landing')}
                      className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-100 text-left transition text-slate-800 text-[11px] font-semibold"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-green-100 text-green-700 flex items-center justify-center shrink-0">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </div>
                        <span>{tr('Landing Page', language)}</span>
                      </div>
                      <span className="text-[9px] text-slate-400 font-bold">{tr('Preview', language)}</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Section 4: Firebase Firestore Backend Sync & Manage Console */}
            <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-50/90 via-white to-orange-50/80 border border-amber-200/90 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center shadow-2xs">
                    <Database className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-extrabold text-slate-900 block">
                      {tr('Firebase Firestore Cloud', language)}
                    </span>
                    <span className="text-[10px] text-slate-500 block font-mono truncate max-w-[165px]">
                      {FIREBASE_PROJECT_INFO.projectId}
                    </span>
                  </div>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    firebaseSyncState === 'synced'
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
                  {firebaseSyncState === 'synced'
                    ? tr('Synced', language)
                    : firebaseSyncState === 'syncing'
                    ? tr('Syncing...', language)
                    : firebaseSyncState === 'error'
                    ? 'Error'
                    : firebaseConnected
                    ? tr('Ready', language)
                    : tr('Offline', language)}
                </span>
              </div>

              {firebaseUser ? (
                <div className="text-[11px] bg-white/90 px-2.5 py-1.5 rounded-xl border border-amber-100 flex items-center justify-between gap-2">
                  <span className="truncate text-slate-700 font-medium">
                    Google: <strong className="text-slate-900">{firebaseUser.email || firebaseUser.displayName}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => void disconnectFirebase()}
                    className="text-[10px] font-bold text-rose-600 hover:underline shrink-0"
                  >
                    Sign out
                  </button>
                </div>
              ) : (
                <p className="text-[11px] text-slate-600 leading-snug">
                  Tap <strong>{tr('Connect Firebase', language)}</strong> below to sign in with Google and sync all business data with Cloud Firestore.
                </p>
              )}

              {lastFirebaseSyncAt && (
                <p className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>
                    Last synced: {new Date(lastFirebaseSyncAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {syncedCollectionsCount > 0 ? ` (${syncedCollectionsCount} collections)` : ''}
                  </span>
                </p>
              )}

              {lastFirebaseError && (
                <div className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-[10px] text-rose-800 flex items-start gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                  <span className="break-all line-clamp-3">{lastFirebaseError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 pt-0.5">
                <button
                  type="button"
                  disabled={firebaseSyncState === 'syncing'}
                  onClick={() => void (firebaseUser ? syncToFirebase() : connectAndSyncFirebase())}
                  className="py-2 px-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 disabled:opacity-60 text-white font-extrabold text-[11px] flex items-center justify-center gap-1.5 shadow-xs active:scale-95 transition"
                >
                  <Cloud className={`w-3.5 h-3.5 ${firebaseSyncState === 'syncing' ? 'animate-pulse' : ''}`} />
                  <span className="truncate">
                    {firebaseSyncState === 'syncing'
                      ? tr('Syncing...', language)
                      : firebaseUser
                      ? tr('Firebase Data Sync', language)
                      : tr('Connect Firebase', language)}
                  </span>
                </button>

                <a
                  href={FIREBASE_PROJECT_INFO.consoleManageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2 px-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-[11px] flex items-center justify-center gap-1.5 shadow-xs active:scale-95 transition"
                >
                  <span className="truncate">{tr('Firebase Manage', language)}</span>
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              </div>

              {firebaseUser && (
                <button
                  type="button"
                  disabled={firebaseSyncState === 'syncing'}
                  onClick={() => void pullFromFirebase()}
                  className="w-full py-1.5 px-2.5 rounded-xl bg-white hover:bg-amber-50 border border-amber-200 text-amber-900 font-bold text-[11px] flex items-center justify-center gap-1.5 transition"
                >
                  <RefreshCw className={`w-3 h-3 ${firebaseSyncState === 'syncing' ? 'animate-spin' : ''}`} />
                  <span>{tr('Pull Latest Cloud Data', language)}</span>
                </button>
              )}
            </div>

            {/* Section 5: Google Sheets Separate File & Auto Sync (Shown in Menu) */}
            {(() => {
              const activeRecord = activeSheetTarget ? sheetRegistry[activeSheetTarget.fileKey] : undefined;
              const activeTables = activeSheetTarget ? getTablesForTarget(activeSheetTarget) : [];
              const totalRowsCount = activeTables.reduce((sum, tbl) => sum + tbl.rows.length, 0);
              return (
                <div className="p-3 rounded-2xl bg-white border border-emerald-200/90 shadow-xs space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                        <FileSpreadsheet className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-extrabold text-slate-900 block truncate">
                          {tr('Google Sheets', language)}
                        </span>
                        <span className="text-[10px] text-slate-500 block truncate tabular-nums">
                          {activeTables.length} Tables · {totalRowsCount} Rows
                          {role === 'owner' ? ` · ${sheetTargets.length} Files` : ''}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={async () => {
                        if (sheetsAutoSync) {
                          setSheetsAutoSyncEnabled(false);
                          return;
                        }
                        if (!hasSheetsAuth) {
                          const ok = await connectGoogleSheetsAccount();
                          if (!ok) return;
                        }
                        if (activeSheetTarget) {
                          navigateTo('googleSheets');
                        }
                      }}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold border flex items-center gap-1 shrink-0 transition ${
                        sheetsAutoSync
                          ? 'bg-emerald-600 text-white border-emerald-700'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      <Zap className="w-3 h-3" />
                      <span>{sheetsAutoSync ? 'Auto ON' : 'Auto OFF'}</span>
                    </button>
                  </div>

                  {/* Compact Clickable Sheet Summary Counts */}
                  <div
                    onClick={() => navigateTo('googleSheets')}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && navigateTo('googleSheets')}
                    className="grid grid-cols-3 rounded-xl border border-slate-100 bg-slate-50/70 divide-x divide-slate-200/70 text-center cursor-pointer hover:bg-emerald-50/40 transition"
                  >
                    <div className="py-1.5 px-1">
                      <span className="text-xs font-black text-slate-900 tabular-nums block">
                        {activeTables.length}
                      </span>
                      <span className="text-[9px] font-medium text-slate-500">Tables</span>
                    </div>
                    <div className="py-1.5 px-1">
                      <span className="text-xs font-black text-emerald-700 tabular-nums block">
                        {activeRecord ? activeRecord.totalRows : totalRowsCount}
                      </span>
                      <span className="text-[9px] font-medium text-slate-500">Rows</span>
                    </div>
                    <div className="py-1.5 px-1">
                      <span className="text-xs font-black text-sky-700 tabular-nums block">
                        {role === 'owner' ? sheetTargets.length : 1}
                      </span>
                      <span className="text-[9px] font-medium text-slate-500">Files</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => navigateTo('googleSheets')}
                      className="py-1.5 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center justify-center gap-1 transition"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>Open Tables</span>
                    </button>

                    {activeRecord?.spreadsheetUrl ? (
                      <a
                        href={activeRecord.spreadsheetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-1.5 px-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] flex items-center justify-center gap-1 transition"
                      >
                        <span>Open File</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    ) : (
                      <button
                        type="button"
                        disabled={sheetsSyncState === 'syncing' || !activeSheetTarget}
                        onClick={() => navigateTo('googleSheets')}
                        className="py-1.5 px-2 rounded-xl bg-slate-50 hover:bg-emerald-50 border border-slate-200 text-slate-800 font-bold text-[11px] flex items-center justify-center gap-1 transition"
                      >
                        <RefreshCw className={`w-3 h-3 ${sheetsSyncState === 'syncing' ? 'animate-spin' : ''}`} />
                        <span>Setup Sheet</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Bottom Actions Footer */}
        <div className="p-3 border-t border-slate-100 bg-slate-50 space-y-1.5">
          {role === 'owner' && (
            <button
              onClick={() => {
                resetToDemoData();
                setIsMenuDrawerOpen(false);
              }}
              className="w-full py-1.5 px-3 rounded-xl bg-white border border-slate-200 text-slate-700 text-[11px] font-bold flex items-center justify-center gap-1.5 hover:bg-slate-100 transition"
            >
              <RefreshCw className="w-3 h-3" /> {tr('Restore Demo Data', language)}
            </button>
          )}

          <button
            onClick={() => {
              setIsMenuDrawerOpen(false);
              logout();
            }}
            className="w-full py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-[11px] font-bold flex items-center justify-center gap-1.5 transition"
          >
            <LogOut className="w-3.5 h-3.5" /> {t.logout}
          </button>
        </div>
      </div>

      <AccountSwitcherModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        initialTab={accountModalTab}
        initialEditMode={accountModalEditMode}
      />
    </div>
  );
};
