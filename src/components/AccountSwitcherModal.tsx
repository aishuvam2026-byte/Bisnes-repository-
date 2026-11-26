import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { BusinessProfile, Customer, Supplier } from '../types';
import {
  X,
  Shield,
  Store,
  Building2,
  Check,
  Search,
  Plus,
  Pencil,
  Save,
} from 'lucide-react';

interface AccountSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'owner' | 'customer' | 'supplier';
  initialEditMode?: boolean;
}

export const AccountSwitcherModal: React.FC<AccountSwitcherModalProps> = ({
  isOpen,
  onClose,
  initialTab,
  initialEditMode = false,
}) => {
  const {
    user,
    role,
    customers,
    suppliers,
    switchCustomerAccount,
    switchSupplierAccount,
    switchOwnerAccount,
    settings,
    businesses,
    activeBusinessId,
    switchBusiness,
    setIsCreateBusinessOpen,
    editOwnerIdProfile,
    editBusinessWithId,
    editCustomerWithId,
    editSupplierWithId,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'owner' | 'customer' | 'supplier'>(
    initialTab || (role === 'owner' ? 'owner' : role === 'customer' ? 'customer' : 'supplier')
  );
  const [searchQuery, setSearchQuery] = useState('');

  // Owner ID Master Edit State
  const [isEditingOwner, setIsEditingOwner] = useState(false);
  const [ownerForm, setOwnerForm] = useState({
    ownerName: settings.ownerName || 'Shuvam Behera',
    businessName: settings.businessName || 'Rupam',
    ownerPhone: settings.ownerPhone || '',
    businessAddress: settings.businessAddress || '',
    upiId: settings.upiId || '',
  });

  // Business ID Edit State
  const [editingBizId, setEditingBizId] = useState<string | null>(null);
  const [bizForm, setBizForm] = useState({
    newId: '',
    companyName: '',
    ownerName: '',
    phone: '',
    city: '',
    upiId: '',
  });

  // Retailer ID Edit State
  const [editingCustId, setEditingCustId] = useState<string | null>(null);
  const [custForm, setCustForm] = useState({
    newId: '',
    shopName: '',
    ownerName: '',
    phone: '',
    city: '',
    distanceKm: '0',
    upiId: '',
  });

  // Supplier ID Edit State
  const [editingSuppId, setEditingSuppId] = useState<string | null>(null);
  const [suppForm, setSuppForm] = useState({
    newId: '',
    name: '',
    contactPerson: '',
    phone: '',
    city: '',
    brandAuth: '',
    paymentTerms: '',
    upiId: '',
  });

  const startEditOwner = () => {
    setOwnerForm({
      ownerName: settings.ownerName || 'Shuvam Behera',
      businessName: settings.businessName || 'Rupam',
      ownerPhone: settings.ownerPhone || '',
      businessAddress: settings.businessAddress || '',
      upiId: settings.upiId || '',
    });
    setEditingBizId(null);
    setIsEditingOwner(true);
  };

  const startEditBiz = (biz: BusinessProfile) => {
    setIsEditingOwner(false);
    setEditingBizId(biz.id);
    setBizForm({
      newId: biz.id,
      companyName: biz.companyName || '',
      ownerName: biz.ownerName || '',
      phone: biz.phone || '',
      city: biz.city || '',
      upiId: biz.upiId || '',
    });
  };

  const startEditCust = (c: Customer) => {
    setEditingCustId(c.id);
    setCustForm({
      newId: c.id,
      shopName: c.shopName || '',
      ownerName: c.ownerName || '',
      phone: c.phone || '',
      city: c.villageOrTown || c.city || '',
      distanceKm: String(c.distanceKm ?? 0),
      upiId: c.upiId || '',
    });
  };

  const startEditSupp = (s: Supplier) => {
    setEditingSuppId(s.id);
    setSuppForm({
      newId: s.id,
      name: s.name || '',
      contactPerson: s.contactPerson || '',
      phone: s.phone || '',
      city: s.city || '',
      brandAuth: s.brandAuth || '',
      paymentTerms: s.paymentTerms || '',
      upiId: s.upiId || '',
    });
  };

  useEffect(() => {
    if (!isOpen) return;
    const targetTab =
      role === 'owner'
        ? initialTab || 'owner'
        : role === 'customer'
        ? 'customer'
        : 'supplier';
    setActiveTab(targetTab);
    setSearchQuery('');
    setIsEditingOwner(false);
    setEditingBizId(null);
    setEditingCustId(null);
    setEditingSuppId(null);

    if (initialEditMode) {
      if (targetTab === 'owner' && role === 'owner') {
        startEditOwner();
      } else if (targetTab === 'customer') {
        const targetCust = customers.find((c) => c.id === user?.customerId) || customers[0];
        if (targetCust) startEditCust(targetCust);
      } else if (targetTab === 'supplier') {
        const targetSupp = suppliers.find((s) => s.id === user?.supplierId) || suppliers[0];
        if (targetSupp) startEditSupp(targetSupp);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialTab, initialEditMode, role]);

  if (!isOpen) return null;

  const visibleCustomers =
    role === 'owner'
      ? customers
      : customers.filter((c) => c.id === user?.customerId);

  const visibleSuppliers =
    role === 'owner'
      ? suppliers
      : suppliers.filter((s) => s.id === user?.supplierId);

  const filteredCustomers = visibleCustomers.filter(
    (c) =>
      c.shopName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.ownerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery) ||
      (c.villageOrTown && c.villageOrTown.toLowerCase().includes(searchQuery.toLowerCase())) ||
      c.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSuppliers = visibleSuppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.contactPerson && s.contactPerson.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.city && s.city.toLowerCase().includes(searchQuery.toLowerCase())) ||
      s.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectCustomer = (customerId: string) => {
    switchCustomerAccount(customerId);
    onClose();
  };

  const handleSelectSupplier = (supplierId: string) => {
    switchSupplierAccount(supplierId);
    onClose();
  };

  const handleSelectOwner = () => {
    switchOwnerAccount();
    onClose();
  };

  const handleSaveOwnerProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownerForm.ownerName.trim()) return;
    editOwnerIdProfile({
      ownerName: ownerForm.ownerName.trim(),
      businessName: ownerForm.businessName.trim() || settings.businessName,
      ownerPhone: ownerForm.ownerPhone.trim(),
      businessAddress: ownerForm.businessAddress.trim(),
      upiId: ownerForm.upiId.trim(),
    });
    setIsEditingOwner(false);
  };

  const handleSaveBizEdit = (e: React.FormEvent, oldId: string) => {
    e.preventDefault();
    const ok = editBusinessWithId(oldId, {
      newId: bizForm.newId.trim(),
      companyName: bizForm.companyName.trim(),
      ownerName: bizForm.ownerName.trim(),
      phone: bizForm.phone.trim(),
      city: bizForm.city.trim(),
      upiId: bizForm.upiId.trim(),
    });
    if (ok) setEditingBizId(null);
  };

  const handleSaveCustEdit = (e: React.FormEvent, oldId: string) => {
    e.preventDefault();
    if (!custForm.shopName.trim()) return;
    const ok = editCustomerWithId(oldId, {
      newId: custForm.newId.trim(),
      shopName: custForm.shopName.trim(),
      ownerName: custForm.ownerName.trim() || custForm.shopName.trim(),
      phone: custForm.phone.trim(),
      city: custForm.city.trim(),
      villageOrTown: custForm.city.trim(),
      distanceKm: Math.max(0, Number(custForm.distanceKm) || 0),
      upiId: custForm.upiId.trim() || undefined,
    });
    if (ok) setEditingCustId(null);
  };

  const handleSaveSuppEdit = (e: React.FormEvent, oldId: string) => {
    e.preventDefault();
    if (!suppForm.name.trim()) return;
    const ok = editSupplierWithId(oldId, {
      newId: suppForm.newId.trim(),
      name: suppForm.name.trim(),
      contactPerson: suppForm.contactPerson.trim(),
      phone: suppForm.phone.trim(),
      city: suppForm.city.trim(),
      brandAuth: suppForm.brandAuth.trim(),
      paymentTerms: suppForm.paymentTerms.trim(),
      upiId: suppForm.upiId.trim() || undefined,
    });
    if (ok) setEditingSuppId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl w-full max-w-lg max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-3.5 sm:p-4 bg-gradient-to-r from-slate-900 via-slate-800 to-sky-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center font-bold shrink-0">
              <Store className="w-4 h-4 sm:w-5 sm:h-5 text-sky-400" />
            </div>
            <div className="min-w-0">
              <h3 className="font-extrabold text-sm sm:text-base leading-tight truncate">
                {role === 'owner'
                  ? 'All ID Options • Select & Edit ID'
                  : role === 'customer'
                  ? 'My Retailer Account'
                  : 'My Supplier Account'}
              </h3>
              <p className="text-[10px] sm:text-[11px] text-sky-200 truncate">
                {role === 'owner'
                  ? 'Owner ID, Retailer ID & Supplier ID manage aur edit karein'
                  : 'Apni saved ID profile details dekhein aur update karein'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current Active Account Indicator */}
        <div className="px-3.5 sm:px-4 py-2 bg-sky-50 border-b border-sky-100 flex items-center justify-between text-[11px] sm:text-xs shrink-0 gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="text-slate-600 font-semibold shrink-0">Active:</span>
            <span className="font-extrabold text-slate-900 truncate">
              {role === 'owner'
                ? `Owner: ${settings.ownerName || 'Shuvam Behera'}`
                : role === 'customer'
                ? `Retailer: ${user?.name || 'Retailer'}`
                : `Supplier: ${user?.name || 'Supplier'}`}
            </span>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-sky-200 text-sky-900 shrink-0">
            {role === 'customer' ? 'Retailer' : role}
          </span>
        </div>

        {/* Tab Switcher: ONLY visible to Owner ID */}
        {role === 'owner' && (
          <div className="grid grid-cols-3 p-1.5 sm:p-2 bg-slate-100 shrink-0 gap-1 text-[11px] sm:text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('owner')}
              className={`py-2 px-1.5 rounded-xl flex items-center justify-center gap-1 transition ${
                activeTab === 'owner'
                  ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="truncate">Owner ID</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('customer')}
              className={`py-2 px-1.5 rounded-xl flex items-center justify-center gap-1 transition ${
                activeTab === 'customer'
                  ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Store className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="truncate">Retailer ID ({customers.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('supplier')}
              className={`py-2 px-1.5 rounded-xl flex items-center justify-center gap-1 transition ${
                activeTab === 'supplier'
                  ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
              <span className="truncate">Supplier ID ({suppliers.length})</span>
            </button>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3">
          {activeTab === 'owner' && (
            <div className="space-y-3.5">
              {/* Owner Master Card + Edit Button */}
              <div className="p-3.5 rounded-2xl bg-blue-50/80 border border-blue-200 text-slate-800 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-lg shadow-md shrink-0">
                      {(settings.ownerName || 'R').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-extrabold text-sm sm:text-base text-slate-900 truncate">
                        {settings.ownerName} (Owner ID)
                      </h4>
                      <p className="text-[11px] text-blue-800 font-semibold truncate">
                        {settings.businessName} • {activeBusinessId}
                      </p>
                      <p className="text-[10px] text-slate-500 truncate">
                        Phone: {settings.ownerPhone || '9437123456'} • UPI: {settings.upiId}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => (isEditingOwner ? setIsEditingOwner(false) : startEditOwner())}
                    className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold text-[10px] flex items-center gap-1 shadow-2xs shrink-0 transition"
                  >
                    <Pencil className="w-3 h-3" />
                    <span>{isEditingOwner ? 'Close' : 'Edit ID'}</span>
                  </button>
                </div>

                {isEditingOwner ? (
                  <form onSubmit={handleSaveOwnerProfile} className="pt-2.5 border-t border-blue-200 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Owner Name</label>
                        <input
                          type="text"
                          required
                          value={ownerForm.ownerName}
                          onChange={(e) => setOwnerForm((p) => ({ ...p, ownerName: e.target.value }))}
                          className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-blue-200 text-xs font-semibold text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Company Name</label>
                        <input
                          type="text"
                          required
                          value={ownerForm.businessName}
                          onChange={(e) => setOwnerForm((p) => ({ ...p, businessName: e.target.value }))}
                          className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-blue-200 text-xs font-semibold text-slate-900"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Phone</label>
                        <input
                          type="text"
                          value={ownerForm.ownerPhone}
                          onChange={(e) => setOwnerForm((p) => ({ ...p, ownerPhone: e.target.value }))}
                          className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-blue-200 text-xs font-semibold text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Owner UPI ID</label>
                        <input
                          type="text"
                          value={ownerForm.upiId}
                          onChange={(e) => setOwnerForm((p) => ({ ...p, upiId: e.target.value }))}
                          className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-blue-200 text-xs font-semibold text-slate-900"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Hub Address</label>
                      <input
                        type="text"
                        value={ownerForm.businessAddress}
                        onChange={(e) => setOwnerForm((p) => ({ ...p, businessAddress: e.target.value }))}
                        className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-blue-200 text-xs font-semibold text-slate-900"
                      />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsEditingOwner(false)}
                        className="flex-1 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-xs"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex-1 py-1.5 rounded-xl bg-blue-600 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-xs"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Save Owner ID</span>
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="pt-2 border-t border-blue-200/60 text-[11px] text-slate-600 space-y-1">
                    <p className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>Full control over all {customers.length} Retailer shops, orders & dispatch</span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>All {suppliers.length} Suppliers network, POs & landed cost rules</span>
                    </p>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleSelectOwner}
                className="w-full py-2.5 px-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-extrabold text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 active:scale-95 transition"
              >
                <Shield className="w-4 h-4" />
                <span>Log In as Owner ID (Master Hub)</span>
              </button>

              {/* Owner Business IDs Section with Edit button on every Business ID */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h5 className="font-extrabold text-xs text-slate-900">
                      Owner Business IDs ({businesses.length})
                    </h5>
                    <p className="text-[10px] text-slate-500">
                      Switch active company, edit ID, or create new business ID
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      setIsCreateBusinessOpen(true);
                    }}
                    className="px-2.5 py-1 rounded-xl bg-indigo-600 text-white font-bold text-[10px] flex items-center gap-1 hover:bg-indigo-700 transition shrink-0"
                  >
                    <Plus className="w-3 h-3" />
                    <span>New Business ID</span>
                  </button>
                </div>

                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5">
                  {businesses.map((biz) => {
                    const isActive = biz.id === activeBusinessId;
                    const isEditingThis = editingBizId === biz.id;

                    return (
                      <div
                        key={biz.id}
                        className={`p-2.5 rounded-2xl border transition ${
                          isActive
                            ? 'bg-indigo-50 border-indigo-400 ring-1 ring-indigo-300'
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div
                            onClick={() => {
                              switchBusiness(biz.id);
                              if (role !== 'owner') switchOwnerAccount();
                              onClose();
                            }}
                            className="min-w-0 flex-1 cursor-pointer"
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[10px] font-black text-indigo-700 bg-indigo-100/80 px-1.5 py-0.5 rounded shrink-0">
                                {biz.id}
                              </span>
                              <span className="font-bold text-xs text-slate-900 truncate">
                                {biz.companyName}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 truncate mt-0.5">
                              {biz.ownerName} • {biz.city} • {biz.upiId}
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isEditingThis) setEditingBizId(null);
                                else startEditBiz(biz);
                              }}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-indigo-100 text-slate-700 hover:text-indigo-700 transition"
                              title="Edit Business ID"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            {isActive ? (
                              <span className="px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[9px] font-black uppercase tracking-wider">
                                Active
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  switchBusiness(biz.id);
                                  if (role !== 'owner') switchOwnerAccount();
                                  onClose();
                                }}
                                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 px-1"
                              >
                                Switch
                              </button>
                            )}
                          </div>
                        </div>

                        {isEditingThis && (
                          <form
                            onSubmit={(e) => handleSaveBizEdit(e, biz.id)}
                            className="mt-2.5 pt-2.5 border-t border-indigo-200 space-y-2"
                          >
                            <div className="grid grid-cols-2 gap-1.5">
                              <div>
                                <label className="text-[9px] font-bold text-slate-600 block">Business ID</label>
                                <input
                                  type="text"
                                  required
                                  value={bizForm.newId}
                                  onChange={(e) => setBizForm((p) => ({ ...p, newId: e.target.value }))}
                                  className="w-full px-2 py-1 rounded-lg bg-white border border-indigo-200 text-[11px] font-mono font-bold"
                                />
                              </div>
                              <div>
                                <label className="text-[9px] font-bold text-slate-600 block">Company Name</label>
                                <input
                                  type="text"
                                  required
                                  value={bizForm.companyName}
                                  onChange={(e) => setBizForm((p) => ({ ...p, companyName: e.target.value }))}
                                  className="w-full px-2 py-1 rounded-lg bg-white border border-indigo-200 text-[11px] font-semibold"
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-1.5">
                              <div>
                                <label className="text-[9px] font-bold text-slate-600 block">Owner Name</label>
                                <input
                                  type="text"
                                  value={bizForm.ownerName}
                                  onChange={(e) => setBizForm((p) => ({ ...p, ownerName: e.target.value }))}
                                  className="w-full px-2 py-1 rounded-lg bg-white border border-indigo-200 text-[11px]"
                                />
                              </div>
                              <div>
                                <label className="text-[9px] font-bold text-slate-600 block">City</label>
                                <input
                                  type="text"
                                  value={bizForm.city}
                                  onChange={(e) => setBizForm((p) => ({ ...p, city: e.target.value }))}
                                  className="w-full px-2 py-1 rounded-lg bg-white border border-indigo-200 text-[11px]"
                                />
                              </div>
                              <div>
                                <label className="text-[9px] font-bold text-slate-600 block">UPI ID</label>
                                <input
                                  type="text"
                                  value={bizForm.upiId}
                                  onChange={(e) => setBizForm((p) => ({ ...p, upiId: e.target.value }))}
                                  className="w-full px-2 py-1 rounded-lg bg-white border border-indigo-200 text-[11px]"
                                />
                              </div>
                            </div>
                            <div className="flex gap-1.5">
                              <button
                                type="button"
                                onClick={() => setEditingBizId(null)}
                                className="flex-1 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-bold text-slate-600"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                className="flex-1 py-1 rounded-lg bg-indigo-600 text-white text-[11px] font-bold flex items-center justify-center gap-1"
                              >
                                <Save className="w-3 h-3" />
                                <span>Save</span>
                              </button>
                            </div>
                          </form>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'customer' && (
            <div className="space-y-3">
              {role === 'owner' && (
                <>
                  {/* Search Box */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search Retailer by shop name, owner, village, or ID..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    />
                  </div>

                  <div className="p-2.5 rounded-2xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900">
                    Select a Retailer ID to log in, or tap <strong>Edit</strong> to update Retailer ID, shop name, phone & address.
                  </div>
                </>
              )}

              {/* Retailer List */}
              <div className="space-y-2">
                {filteredCustomers.map((c) => {
                  const isCurrent = role === 'customer' && user?.customerId === c.id;
                  const hasUdhaar = (c.pendingUdhaar || 0) > 0;
                  const isEditingThis = editingCustId === c.id;

                  return (
                    <div
                      key={c.id}
                      className={`p-3 rounded-2xl border transition ${
                        isCurrent
                          ? 'bg-amber-50/90 border-amber-400 ring-2 ring-amber-400/20 shadow-xs'
                          : 'bg-white hover:bg-slate-50/80 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div
                          onClick={() => handleSelectCustomer(c.id)}
                          className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
                        >
                          <div
                            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
                              isCurrent
                                ? 'bg-amber-600 text-white'
                                : 'bg-slate-100 text-slate-800'
                            }`}
                          >
                            {c.shopName.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-extrabold text-xs text-slate-900 truncate">
                                {c.shopName}
                              </span>
                              <span className="text-[10px] font-mono text-amber-800 bg-amber-100/70 px-1.5 py-0.2 rounded">
                                {c.id}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 truncate">
                              {c.ownerName} • {c.villageOrTown || c.city} ({c.distanceKm} km)
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {hasUdhaar ? (
                                <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                                  Udhaar: ₹{c.pendingUdhaar}
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">
                                  Udhaar: Clear
                                </span>
                              )}
                              <span className="text-[10px] text-slate-400">
                                {c.totalOrders || 0} orders
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isEditingThis) setEditingCustId(null);
                              else startEditCust(c);
                            }}
                            className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 font-bold text-[10px] flex items-center gap-1 transition"
                            title="Edit Retailer ID"
                          >
                            <Pencil className="w-3 h-3" />
                            <span>Edit</span>
                          </button>

                          {isCurrent ? (
                            <span className="px-2 py-1 rounded-lg bg-amber-600 text-white font-extrabold text-[10px] flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              <span>Active</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSelectCustomer(c.id)}
                              className="px-2 py-1 rounded-lg bg-slate-900 text-white text-[10px] font-bold hover:bg-slate-800 transition"
                            >
                              Select
                            </button>
                          )}
                        </div>
                      </div>

                      {isEditingThis && (
                        <form
                          onSubmit={(e) => handleSaveCustEdit(e, c.id)}
                          className="mt-2.5 pt-2.5 border-t border-amber-200 space-y-2"
                        >
                          <div className="grid grid-cols-2 gap-1.5">
                            <div>
                              <label className="text-[9px] font-bold text-slate-600 block">Retailer ID</label>
                              <input
                                type="text"
                                required
                                value={custForm.newId}
                                onChange={(e) => setCustForm((p) => ({ ...p, newId: e.target.value }))}
                                className="w-full px-2 py-1 rounded-lg bg-white border border-amber-200 text-[11px] font-mono font-bold"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-bold text-slate-600 block">Shop Name</label>
                              <input
                                type="text"
                                required
                                value={custForm.shopName}
                                onChange={(e) => setCustForm((p) => ({ ...p, shopName: e.target.value }))}
                                className="w-full px-2 py-1 rounded-lg bg-white border border-amber-200 text-[11px] font-semibold"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-1.5">
                            <div>
                              <label className="text-[9px] font-bold text-slate-600 block">Owner Name</label>
                              <input
                                type="text"
                                value={custForm.ownerName}
                                onChange={(e) => setCustForm((p) => ({ ...p, ownerName: e.target.value }))}
                                className="w-full px-2 py-1 rounded-lg bg-white border border-amber-200 text-[11px]"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-bold text-slate-600 block">Phone</label>
                              <input
                                type="text"
                                value={custForm.phone}
                                onChange={(e) => setCustForm((p) => ({ ...p, phone: e.target.value }))}
                                className="w-full px-2 py-1 rounded-lg bg-white border border-amber-200 text-[11px]"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-1.5">
                            <div>
                              <label className="text-[9px] font-bold text-slate-600 block">Village / City</label>
                              <input
                                type="text"
                                value={custForm.city}
                                onChange={(e) => setCustForm((p) => ({ ...p, city: e.target.value }))}
                                className="w-full px-2 py-1 rounded-lg bg-white border border-amber-200 text-[11px]"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-bold text-slate-600 block">Distance (km)</label>
                              <input
                                type="number"
                                min={0}
                                value={custForm.distanceKm}
                                onChange={(e) => setCustForm((p) => ({ ...p, distanceKm: e.target.value }))}
                                className="w-full px-2 py-1 rounded-lg bg-white border border-amber-200 text-[11px]"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-bold text-slate-600 block">UPI ID</label>
                              <input
                                type="text"
                                value={custForm.upiId}
                                onChange={(e) => setCustForm((p) => ({ ...p, upiId: e.target.value }))}
                                placeholder="optional"
                                className="w-full px-2 py-1 rounded-lg bg-white border border-amber-200 text-[11px]"
                              />
                            </div>
                          </div>
                          <div className="flex gap-1.5">
                            <button
                              type="button"
                              onClick={() => setEditingCustId(null)}
                              className="flex-1 py-1.5 rounded-lg bg-white border border-slate-200 text-[11px] font-bold text-slate-600"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              className="flex-1 py-1.5 rounded-lg bg-amber-600 text-white text-[11px] font-bold flex items-center justify-center gap-1"
                            >
                              <Save className="w-3 h-3" />
                              <span>Save Retailer ID</span>
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'supplier' && (
            <div className="space-y-3">
              {role === 'owner' && (
                <>
                  {/* Search Box */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search Supplier by name, city, or ID..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                    />
                  </div>

                  <div className="p-2.5 rounded-2xl bg-purple-50 border border-purple-200 text-[11px] text-purple-900">
                    Select a Supplier ID to log in, or tap <strong>Edit</strong> to update Supplier ID, company name, phone, terms & UPI ID.
                  </div>
                </>
              )}

              {/* Supplier List */}
              <div className="space-y-2">
                {filteredSuppliers.map((s) => {
                  const isCurrent = role === 'supplier' && user?.supplierId === s.id;
                  const dues = s.dueAmount || s.pendingDues || 0;
                  const isEditingThis = editingSuppId === s.id;

                  return (
                    <div
                      key={s.id}
                      className={`p-3 rounded-2xl border transition ${
                        isCurrent
                          ? 'bg-purple-50/90 border-purple-400 ring-2 ring-purple-400/20 shadow-xs'
                          : 'bg-white hover:bg-slate-50/80 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div
                          onClick={() => handleSelectSupplier(s.id)}
                          className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
                        >
                          <div
                            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
                              isCurrent
                                ? 'bg-purple-600 text-white'
                                : 'bg-slate-100 text-slate-800'
                            }`}
                          >
                            {s.name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-extrabold text-xs text-slate-900 truncate">
                                {s.name}
                              </span>
                              <span className="text-[10px] font-mono text-purple-800 bg-purple-100/70 px-1.5 py-0.2 rounded">
                                {s.id}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 truncate">
                              {s.contactPerson || 'Sales Desk'} • {s.city || 'Mandi'} ({s.brandAuth || s.type})
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {dues > 0 ? (
                                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                                  Owner Owes: ₹{dues.toLocaleString('en-IN')}
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">
                                  All Clear
                                </span>
                              )}
                              <span className="text-[10px] text-slate-400 truncate">
                                Terms: {s.paymentTerms || '15 Days Credit'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isEditingThis) setEditingSuppId(null);
                              else startEditSupp(s);
                            }}
                            className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-purple-100 text-slate-700 hover:text-purple-900 font-bold text-[10px] flex items-center gap-1 transition"
                            title="Edit Supplier ID"
                          >
                            <Pencil className="w-3 h-3" />
                            <span>Edit</span>
                          </button>

                          {isCurrent ? (
                            <span className="px-2 py-1 rounded-lg bg-purple-600 text-white font-extrabold text-[10px] flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              <span>Active</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSelectSupplier(s.id)}
                              className="px-2 py-1 rounded-lg bg-slate-900 text-white text-[10px] font-bold hover:bg-slate-800 transition"
                            >
                              Select
                            </button>
                          )}
                        </div>
                      </div>

                      {isEditingThis && (
                        <form
                          onSubmit={(e) => handleSaveSuppEdit(e, s.id)}
                          className="mt-2.5 pt-2.5 border-t border-purple-200 space-y-2"
                        >
                          <div className="grid grid-cols-2 gap-1.5">
                            <div>
                              <label className="text-[9px] font-bold text-slate-600 block">Supplier ID</label>
                              <input
                                type="text"
                                required
                                value={suppForm.newId}
                                onChange={(e) => setSuppForm((p) => ({ ...p, newId: e.target.value }))}
                                className="w-full px-2 py-1 rounded-lg bg-white border border-purple-200 text-[11px] font-mono font-bold"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-bold text-slate-600 block">Supplier Name</label>
                              <input
                                type="text"
                                required
                                value={suppForm.name}
                                onChange={(e) => setSuppForm((p) => ({ ...p, name: e.target.value }))}
                                className="w-full px-2 py-1 rounded-lg bg-white border border-purple-200 text-[11px] font-semibold"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-1.5">
                            <div>
                              <label className="text-[9px] font-bold text-slate-600 block">Contact Person</label>
                              <input
                                type="text"
                                value={suppForm.contactPerson}
                                onChange={(e) => setSuppForm((p) => ({ ...p, contactPerson: e.target.value }))}
                                className="w-full px-2 py-1 rounded-lg bg-white border border-purple-200 text-[11px]"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-bold text-slate-600 block">Phone</label>
                              <input
                                type="text"
                                value={suppForm.phone}
                                onChange={(e) => setSuppForm((p) => ({ ...p, phone: e.target.value }))}
                                className="w-full px-2 py-1 rounded-lg bg-white border border-purple-200 text-[11px]"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-1.5">
                            <div>
                              <label className="text-[9px] font-bold text-slate-600 block">City</label>
                              <input
                                type="text"
                                value={suppForm.city}
                                onChange={(e) => setSuppForm((p) => ({ ...p, city: e.target.value }))}
                                className="w-full px-2 py-1 rounded-lg bg-white border border-purple-200 text-[11px]"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-bold text-slate-600 block">Payment Terms</label>
                              <input
                                type="text"
                                value={suppForm.paymentTerms}
                                onChange={(e) => setSuppForm((p) => ({ ...p, paymentTerms: e.target.value }))}
                                className="w-full px-2 py-1 rounded-lg bg-white border border-purple-200 text-[11px]"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-bold text-slate-600 block">UPI ID</label>
                              <input
                                type="text"
                                value={suppForm.upiId}
                                onChange={(e) => setSuppForm((p) => ({ ...p, upiId: e.target.value }))}
                                className="w-full px-2 py-1 rounded-lg bg-white border border-purple-200 text-[11px]"
                              />
                            </div>
                          </div>
                          <div className="flex gap-1.5">
                            <button
                              type="button"
                              onClick={() => setEditingSuppId(null)}
                              className="flex-1 py-1.5 rounded-lg bg-white border border-slate-200 text-[11px] font-bold text-slate-600"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              className="flex-1 py-1.5 rounded-lg bg-purple-600 text-white text-[11px] font-bold flex items-center justify-center gap-1"
                            >
                              <Save className="w-3 h-3" />
                              <span>Save Supplier ID</span>
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
