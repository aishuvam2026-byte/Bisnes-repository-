import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Customer, Order, UdhaarRecord, ReturnRequest } from '../types';
import {
  Search,
  Plus,
  Phone,
  MessageSquare,
  MapPin,
  Clock,
  ShoppingBag,
  AlertTriangle,
  CheckCircle2,
  Share2,
  X,
  Truck,
  FileText,
  RotateCcw,
  ShieldCheck,
  AlertOctagon,
  ChevronRight,
  Calendar,
  ExternalLink,
  User,
  Store,
  Receipt,
  Video,
  Navigation,
  ArrowRight,
  Sparkles,
  Pencil,
} from 'lucide-react';

type CustomerListFilter = 'all' | 'udhaar' | 'within150' | 'outside150' | 'regular';
type CustomerDetailCategory = 'personal' | 'udhaar' | 'dispatch' | 'orders' | 'returns';

export const CustomersView: React.FC<{
  isNewCustomerOpenDirect?: boolean;
  onCloseNewCustomerDirect?: () => void;
}> = ({ isNewCustomerOpenDirect = false, onCloseNewCustomerDirect }) => {
  const {
    customers,
    addCustomer,
    editCustomerWithId,
    orders,
    udhaar,
    returns,
    settings,
    showToast,
    clearUdhaarEntry,
    openMorePage,
    setActiveTab,
    setActiveSubPage,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<CustomerListFilter>('all');
  const [selectedCust, setSelectedCust] = useState<Customer | null>(null);
  const [activeCustTab, setActiveCustTab] = useState<CustomerDetailCategory>('personal');
  const [isAddingCust, setIsAddingCust] = useState(isNewCustomerOpenDirect);

  // New Customer Form states
  const [shopName, setShopName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [city, setCity] = useState('Cuttack');
  const [category, setCategory] = useState('Cosmetics & Fancy');
  const [distanceKm, setDistanceKm] = useState<number>(25);
  const [gstNumber, setGstNumber] = useState('');

  // Edit Retailer ID Form states
  const [editingCust, setEditingCust] = useState<Customer | null>(null);
  const [editIdVal, setEditIdVal] = useState('');
  const [editShopVal, setEditShopVal] = useState('');
  const [editOwnerVal, setEditOwnerVal] = useState('');
  const [editPhoneVal, setEditPhoneVal] = useState('');
  const [editCityVal, setEditCityVal] = useState('');
  const [editDistVal, setEditDistVal] = useState('25');

  const openEditCust = (c: Customer) => {
    setEditingCust(c);
    setEditIdVal(c.id);
    setEditShopVal(c.shopName);
    setEditOwnerVal(c.ownerName);
    setEditPhoneVal(c.phone);
    setEditCityVal(c.villageOrTown || c.city);
    setEditDistVal(String(c.distanceKm));
  };

  const handleSaveEditCust = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCust) return;
    const ok = editCustomerWithId(editingCust.id, {
      newId: editIdVal.trim() || editingCust.id,
      shopName: editShopVal.trim() || editingCust.shopName,
      ownerName: editOwnerVal.trim() || editingCust.ownerName,
      phone: editPhoneVal.trim() || editingCust.phone,
      city: editCityVal.trim() || editingCust.city,
      villageOrTown: editCityVal.trim() || editingCust.villageOrTown,
      distanceKm: Number(editDistVal) || editingCust.distanceKm,
    });
    if (ok) {
      if (selectedCust?.id === editingCust.id) {
        setSelectedCust({
          ...selectedCust,
          id: editIdVal.trim() || editingCust.id,
          shopName: editShopVal.trim() || editingCust.shopName,
          ownerName: editOwnerVal.trim() || editingCust.ownerName,
          phone: editPhoneVal.trim() || editingCust.phone,
          city: editCityVal.trim() || editingCust.city,
          villageOrTown: editCityVal.trim() || editingCust.villageOrTown,
          distanceKm: Number(editDistVal) || editingCust.distanceKm,
        });
      }
      setEditingCust(null);
    }
  };

  // Filtered customer list
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      // Search matching
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        c.shopName.toLowerCase().includes(q) ||
        c.ownerName.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.city.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q);

      if (!matchSearch) return false;

      // Category / Tab matching
      if (selectedFilter === 'udhaar') return c.pendingUdhaar > 0;
      if (selectedFilter === 'within150') return c.distanceKm <= 150;
      if (selectedFilter === 'outside150') return c.distanceKm > 150;
      if (selectedFilter === 'regular') return c.tags === 'Regular';

      return true;
    });
  }, [customers, searchQuery, selectedFilter]);

  // Customer specific records
  const custOrders = useMemo(() => {
    if (!selectedCust) return [];
    return orders.filter((o) => o.customerId === selectedCust.id || o.shopName === selectedCust.shopName);
  }, [orders, selectedCust]);

  const custUdhaar = useMemo(() => {
    if (!selectedCust) return [];
    return udhaar.filter((u) => u.customerId === selectedCust.id || u.shopName === selectedCust.shopName);
  }, [udhaar, selectedCust]);

  const custReturns = useMemo(() => {
    if (!selectedCust) return [];
    return returns.filter((r) => r.customerId === selectedCust.id || r.shopName === selectedCust.shopName);
  }, [returns, selectedCust]);

  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopName.trim() || !phone.trim()) {
      showToast('Shop name and phone are required', 'error');
      return;
    }

    addCustomer({
      shopName,
      ownerName: ownerName || shopName,
      phone,
      whatsapp: phone,
      address,
      landmark,
      city,
      state: 'Odisha',
      lat: 20.4856 + (Math.random() - 0.5) * 0.2,
      lng: 85.8344 + (Math.random() - 0.5) * 0.2,
      distanceKm: Number(distanceKm),
      category,
      tags: 'New',
      gstNumber: gstNumber.trim() || undefined,
    });

    setIsAddingCust(false);
    onCloseNewCustomerDirect?.();
    showToast('Naya retailer successfully register ho gaya!', 'success');
  };

  const handleSendCatalogue = (c: Customer) => {
    const text = `Namaste ${c.shopName} (${c.ownerName})!\nHere is the latest wholesale price list from Rupam Cosmetics (Nuapatna, Cuttack).\n\n• Minimum wholesale order: ₹1,000 in full packets (6/12 pcs)\n• Advance booking: ₹1,000\n• Free delivery within 150 km of Nuapatna\n• View catalogue & book online: ${window.location.origin}`;
    window.open(`https://wa.me/91${c.phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="space-y-4 pb-28">
      {/* Top Banner */}
      <div className="glass-card rounded-3xl p-4.5 border border-white/90 shadow-md relative overflow-hidden bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-transparent">
        <div className="flex items-center justify-between gap-2">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100/90 px-2 py-0.5 rounded-full inline-block mb-1">
              Retailer Directory Hub
            </span>
            <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
              Retailer &amp; Shop Directory
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Retailer ID, personal details, udhaar, dispatch, aur order details section-wise
            </p>
          </div>
          <button
            onClick={() => setIsAddingCust(true)}
            className="px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-sky-600/30 shrink-0 active:scale-95 transition"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Retailer</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="mt-3 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search shop, owner name, city, or phone..."
            className="w-full pl-9 pr-9 py-2.5 rounded-2xl bg-white/90 border border-slate-200 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40 shadow-xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Quick Filter Chips */}
      <div className="overflow-x-auto no-scrollbar flex items-center gap-2 pb-1">
        {[
          { id: 'all', label: `All Shops (${customers.length})` },
          { id: 'udhaar', label: `Udhaar Pending (${customers.filter((c) => c.pendingUdhaar > 0).length})` },
          { id: 'within150', label: `Inside 150km (${customers.filter((c) => c.distanceKm <= 150).length})` },
          { id: 'outside150', label: `Outside 150km (${customers.filter((c) => c.distanceKm > 150).length})` },
          { id: 'regular', label: `Regular (${customers.filter((c) => c.tags === 'Regular').length})` },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setSelectedFilter(f.id as CustomerListFilter)}
            className={`px-3 py-2 rounded-2xl text-xs whitespace-nowrap transition-all font-bold ${
              selectedFilter === f.id
                ? 'bg-slate-900 text-white shadow-xs scale-[1.02]'
                : 'bg-white/80 hover:bg-white text-slate-600 border border-slate-200/80'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Customer Cards List */}
      <div className="space-y-3">
        {filteredCustomers.length === 0 ? (
          <div className="glass-card rounded-3xl p-8 text-center border border-dashed border-slate-300">
            <User className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-700">No retailers found</h4>
            <p className="text-xs text-slate-500 mt-1">Try another filter or tap Add Retailer.</p>
          </div>
        ) : (
          filteredCustomers.map((c) => {
            const hasUdhaar = c.pendingUdhaar > 0;
            const isOutsideRadius = c.distanceKm > 150;
            return (
              <div
                key={c.id}
                onClick={() => {
                  setSelectedCust(c);
                  setActiveCustTab('personal');
                }}
                className="glass-card rounded-3xl p-4 border border-white/90 shadow-xs hover:shadow-md transition cursor-pointer relative overflow-hidden bg-white/85 group active:scale-98"
              >
                {/* Header Row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200">
                        ID: {c.id}
                      </span>
                      <h3 className="font-black text-slate-900 text-sm leading-tight truncate">
                        {c.shopName}
                      </h3>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          c.tags === 'Regular'
                            ? 'bg-emerald-100 text-emerald-800'
                            : c.tags === 'Risky'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-sky-100 text-sky-800'
                        }`}
                      >
                        {c.tags}
                      </span>
                      {hasUdhaar && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-500 text-white animate-pulse">
                          Udhaar: ₹{c.pendingUdhaar.toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-semibold text-slate-600 mt-0.5">
                      {c.ownerName} • 📞 {c.phone}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{c.city}</span>
                      <span className="text-slate-300">•</span>
                      <span className={isOutsideRadius ? 'text-amber-700 font-bold' : 'text-emerald-700 font-bold'}>
                        {c.distanceKm} km {isOutsideRadius ? '(Freight Charged)' : '(Free Delivery)'}
                      </span>
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Total Sales</span>
                    <span className="text-sm font-black text-slate-900 block leading-tight">
                      ₹{c.totalSales.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      {c.totalOrders} Orders
                    </span>
                  </div>
                </div>

                {/* Section Quick Jump Pills */}
                <div className="grid grid-cols-4 gap-1.5 mt-3 pt-2.5 border-t border-slate-100 text-center text-[10px] font-bold">
                  <div className="p-1.5 rounded-xl bg-slate-50 text-slate-700 border border-slate-200/60">
                    <User className="w-3 h-3 mx-auto mb-0.5 text-slate-500" />
                    <span>Personal</span>
                  </div>
                  <div
                    className={`p-1.5 rounded-xl border ${
                      hasUdhaar ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}
                  >
                    <Receipt className="w-3 h-3 mx-auto mb-0.5" />
                    <span>{hasUdhaar ? `₹${c.pendingUdhaar}` : 'Clear 0'}</span>
                  </div>
                  <div className="p-1.5 rounded-xl bg-sky-50 text-sky-700 border border-sky-200">
                    <Truck className="w-3 h-3 mx-auto mb-0.5" />
                    <span>Dispatch</span>
                  </div>
                  <div className="p-1.5 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200">
                    <ShoppingBag className="w-3 h-3 mx-auto mb-0.5" />
                    <span>{c.totalOrders} Orders</span>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div
                  className="flex items-center justify-between mt-2.5 text-xs"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => handleSendCatalogue(c)}
                    className="text-sky-600 font-bold flex items-center gap-1 text-[11px] hover:underline"
                  >
                    <Share2 className="w-3.5 h-3.5" /> Share Catalogue
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openEditCust(c)}
                      className="px-2 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold text-[11px] flex items-center gap-1 transition"
                      title="Edit Retailer ID"
                    >
                      <Pencil className="w-3 h-3" />
                      <span>Edit ID</span>
                    </button>
                    <a
                      href={`tel:${c.phone}`}
                      className="w-8 h-8 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center hover:bg-sky-100 transition"
                      title="Call Shop"
                    >
                      <Phone className="w-4 h-4" />
                    </a>
                    <a
                      href={`https://wa.me/91${c.phone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center hover:bg-emerald-100 transition"
                      title="WhatsApp"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </a>
                    <button
                      onClick={() => {
                        setSelectedCust(c);
                        setActiveCustTab('personal');
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-900 text-white font-bold text-[11px] flex items-center gap-1"
                    >
                      <span>Details</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* CATEGORIZED CUSTOMER PROFILE MODAL */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {selectedCust && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto space-y-4 animate-in slide-in-from-bottom-5">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 text-white flex items-center justify-center font-black text-lg shadow-md shadow-sky-500/25 shrink-0">
                  {selectedCust.shopName.charAt(0)}
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base leading-tight">
                    {selectedCust.shopName}
                  </h3>
                  <p className="text-xs font-bold text-slate-600 mt-0.5">
                    {selectedCust.ownerName} • 📞 {selectedCust.phone}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    ID: <span className="font-mono font-bold text-slate-700">{selectedCust.id}</span> • {selectedCust.city} • {selectedCust.category}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => openEditCust(selectedCust)}
                  className="px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold text-[11px] flex items-center gap-1 transition"
                >
                  <Pencil className="w-3 h-3" />
                  <span>Edit ID</span>
                </button>
                <button
                  onClick={() => setSelectedCust(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Category Navigation Bar (5 Category Tabs) */}
            <div className="overflow-x-auto no-scrollbar flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl">
              {[
                { id: 'personal', label: '👤 Personal', icon: User },
                { id: 'udhaar', label: '💰 Udhaar & Khata', icon: Receipt },
                { id: 'dispatch', label: '🚚 Dispatch & Delivery', icon: Truck },
                { id: 'orders', label: '📦 Orders History', icon: ShoppingBag },
                { id: 'returns', label: '📹 Returns & Claims', icon: Video },
              ].map((tab) => {
                const isActive = activeCustTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveCustTab(tab.id as CustomerDetailCategory)}
                    className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs whitespace-nowrap font-bold transition-all ${
                      isActive
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* ════════════════════════════════════════════════════════════ */}
            {/* SECTION 1: Personal & Shop Details */}
            {/* ════════════════════════════════════════════════════════════ */}
            {activeCustTab === 'personal' && (
              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                    Shop & Owner Information (Personal Info)
                  </span>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Owner Name:</span>
                      <span className="font-bold text-slate-800">{selectedCust.ownerName}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Shop Name:</span>
                      <span className="font-bold text-slate-800">{selectedCust.shopName}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Mobile:</span>
                      <span className="font-bold text-slate-800">{selectedCust.phone}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">WhatsApp:</span>
                      <span className="font-bold text-emerald-700">{selectedCust.whatsapp || selectedCust.phone}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Business Category:</span>
                      <span className="font-bold text-slate-800">{selectedCust.category}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Retailer Tag:</span>
                      <span className="font-bold text-sky-700">{selectedCust.tags}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-400 block text-[11px]">GSTIN Number:</span>
                      <span className="font-bold text-slate-800">
                        {selectedCust.gstNumber || 'Non-GST (Composition / Unregistered)'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Address Sub-card */}
                <div className="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                    Shop Address & Location
                  </span>
                  <p className="text-xs font-bold text-slate-800">
                    {selectedCust.address}, {selectedCust.landmark}
                  </p>
                  <p className="text-xs text-slate-600">
                    City: {selectedCust.city}, Odisha | Nuapatna distance: <strong>{selectedCust.distanceKm} km</strong>
                  </p>
                  <div className="flex gap-2 pt-1">
                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent(`${selectedCust.shopName}, ${selectedCust.city}, Odisha`)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-bold text-sky-600 flex items-center gap-1 hover:underline"
                    >
                      <Navigation className="w-3.5 h-3.5" /> View on Google Maps
                    </a>
                  </div>
                </div>

                {/* Direct Action Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <a
                    href={`tel:${selectedCust.phone}`}
                    className="py-2.5 px-3 rounded-2xl bg-sky-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition"
                  >
                    <Phone className="w-4 h-4" /> Call Shop
                  </a>
                  <a
                    href={`https://wa.me/91${selectedCust.phone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="py-2.5 px-3 rounded-2xl bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition"
                  >
                    <MessageSquare className="w-4 h-4" /> WhatsApp Chat
                  </a>
                </div>
              </div>
            )}

            {/* ════════════════════════════════════════════════════════════ */}
            {/* SECTION 2: Khata, Udhaar & Payments */}
            {/* ════════════════════════════════════════════════════════════ */}
            {activeCustTab === 'udhaar' && (
              <div className="space-y-3">
                {/* Udhaar Status Banner */}
                <div
                  className={`p-4 rounded-2xl border space-y-2 ${
                    selectedCust.pendingUdhaar > 0
                      ? 'bg-rose-50 border-rose-300 text-rose-950'
                      : 'bg-emerald-50 border-emerald-300 text-emerald-950'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider block">
                        Khata Status (Udhaar & Balance)
                      </span>
                      <span className="text-2xl font-black block mt-0.5">
                        ₹{selectedCust.pendingUdhaar.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div
                      className={`px-3 py-1 rounded-full text-xs font-black ${
                        selectedCust.pendingUdhaar > 0
                          ? 'bg-rose-600 text-white'
                          : 'bg-emerald-600 text-white'
                      }`}
                    >
                      {selectedCust.pendingUdhaar > 0 ? 'Udhaar Dues (Blocked)' : 'All Clear'}
                    </div>
                  </div>

                  <p className="text-xs leading-relaxed">
                    {selectedCust.pendingUdhaar > 0
                      ? '⚠️ Rupam Business Rule: Purana udhaar baki hone par naya order dispatch nahi ho sakta jab tak hisab clear na ho jaye.'
                      : '✓ Koi udhaar baki nahi hai. Naya wholesale order lene ke liye taiyyar.'}
                  </p>
                </div>

                {/* 10% Shortage Rule Explanation */}
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                  <span className="font-bold text-slate-800 flex items-center gap-1">
                    <ShieldCheck className="w-4 h-4 text-sky-600" /> Rupam Udhaar Rule (10% Limit):
                  </span>
                  <p className="text-[11px] text-slate-600">
                    Delivery ke time par max 10% shortage allowed as udhaar. 10% se jyada shortage hone par parcel delivery hold ki jati hai.
                  </p>
                </div>

                {/* Customer Udhaar Entries List */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-700 block">
                    Udhaar Entries ({custUdhaar.length})
                  </span>

                  {custUdhaar.length === 0 ? (
                    <div className="p-4 rounded-xl bg-slate-50 text-center text-xs text-slate-500">
                      Is dukandar ka koi pending udhaar nahi hai.
                    </div>
                  ) : (
                    custUdhaar.map((u) => (
                      <div
                        key={u.id}
                        className="p-3 rounded-2xl bg-white border border-slate-200 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-bold text-slate-900 block">{u.orderNumber}</span>
                          <span className="text-[11px] text-slate-500">
                            Date: {u.date} • Bill: ₹{u.billAmount} ({u.shortagePct}% shortage)
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-black text-rose-600 block text-sm">
                            ₹{u.shortageAmount}
                          </span>
                          {u.status === 'Pending' ? (
                            <button
                              onClick={() => {
                                clearUdhaarEntry(u.id);
                                showToast('Udhaar clear ho gaya!', 'success');
                              }}
                              className="mt-1 px-2 py-0.5 rounded-lg bg-emerald-600 text-white font-bold text-[10px]"
                            >
                              Clear Dues
                            </button>
                          ) : (
                            <span className="text-[10px] font-bold text-emerald-600">Cleared ✅</span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Direct Khata Button */}
                <button
                  onClick={() => {
                    setSelectedCust(null);
                    setActiveTab('khata');
                  }}
                  className="w-full py-2.5 rounded-2xl bg-slate-900 text-white font-bold text-xs"
                >
                  Open Full Khata Ledger
                </button>
              </div>
            )}

            {/* ════════════════════════════════════════════════════════════ */}
            {/* SECTION 3: Dispatch, Transport & Delivery */}
            {/* ════════════════════════════════════════════════════════════ */}
            {activeCustTab === 'dispatch' && (
              <div className="space-y-3">
                {/* Distance & Delivery Radius Box */}
                <div
                  className={`p-4 rounded-2xl border space-y-1.5 ${
                    selectedCust.distanceKm <= 150
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                      : 'bg-amber-50 border-amber-300 text-amber-950'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase">
                      Distance from Nuapatna: {selectedCust.distanceKm} km
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                        selectedCust.distanceKm <= 150 ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'
                      }`}
                    >
                      {selectedCust.distanceKm <= 150 ? 'Free Delivery Zone' : 'Extra Freight Applicable'}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed">
                    {selectedCust.distanceKm <= 150
                      ? '✓ Nuapatna se 150 km radius me 1-5 din me bus ya delivery van se free delivery available.'
                      : '⚠️ 150 km radius se bahar hai. Order par bus transport bhada alag se lagega.'}
                  </p>
                </div>

                {/* Transport & Dispatch Details */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                    Dispatch & Transport Info
                  </span>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Preferred Transport:</span>
                      <span className="font-bold text-slate-800">Local Bus / Delivery Van</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Delivery Time:</span>
                      <span className="font-bold text-slate-800">1 - 5 Working Days</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Confirmation Call:</span>
                      <span className="font-bold text-sky-700">Dispatch Day Morning Call</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Balance Payment Rule:</span>
                      <span className="font-bold text-slate-800">Dispatch only after balance confirmed</span>
                    </div>
                  </div>
                </div>

                {/* Unboxing Video Mandatory Rule */}
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Continuous Unboxing Video Rule:</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Parcel delivery lene ke baad box kholte samay uncut continuous unboxing video banana dukandar ke liye mandatory hai.
                  </p>
                </div>

                {/* Jump to Delivery Kanban */}
                <button
                  onClick={() => {
                    setSelectedCust(null);
                    openMorePage('delivery');
                  }}
                  className="w-full py-2.5 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-xs"
                >
                  Open Delivery Board
                </button>
              </div>
            )}

            {/* ════════════════════════════════════════════════════════════ */}
            {/* SECTION 4: Orders & Purchases */}
            {/* ════════════════════════════════════════════════════════════ */}
            {activeCustTab === 'orders' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                    <span className="text-[10px] text-slate-500 font-bold block uppercase">Total Orders</span>
                    <span className="text-xl font-black text-slate-900">{custOrders.length}</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                    <span className="text-[10px] text-slate-500 font-bold block uppercase">Total Sales</span>
                    <span className="text-xl font-black text-sky-700">
                      ₹{selectedCust.totalSales.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Orders List */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-700 block">
                    Previous Orders ({custOrders.length})
                  </span>

                  {custOrders.length === 0 ? (
                    <div className="p-4 rounded-xl bg-slate-50 text-center text-xs text-slate-500">
                      Is dukandar ka koi purana order nahi hai.
                    </div>
                  ) : (
                    custOrders.map((o) => (
                      <div
                        key={o.id}
                        className="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-1.5 text-xs shadow-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-black text-slate-900">{o.orderNumber}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              o.status === 'Delivered'
                                ? 'bg-emerald-100 text-emerald-800'
                                : o.status === 'Dispatched'
                                ? 'bg-blue-100 text-blue-800'
                                : o.status === 'On Hold'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {o.status}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-slate-600 text-[11px]">
                          <span>Date: {new Date(o.createdAt).toLocaleDateString('en-IN')}</span>
                          <span>Total: <strong>₹{o.totalAmount}</strong></span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100">
                          <span className="text-emerald-700 font-bold">Advance: ₹{o.advanceAmount}</span>
                          <span className="text-slate-800 font-bold">Balance: ₹{o.balanceAmount}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Create New Order Button */}
                <button
                  onClick={() => {
                    setSelectedCust(null);
                    setActiveTab('orders');
                  }}
                  className="w-full py-2.5 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Create Order for this Shop
                </button>
              </div>
            )}

            {/* ════════════════════════════════════════════════════════════ */}
            {/* SECTION 5: Returns & Video Claims */}
            {/* ════════════════════════════════════════════════════════════ */}
            {activeCustTab === 'returns' && (
              <div className="space-y-3">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                  <span className="font-bold text-slate-800 block">
                    Unboxing Video Verification Record:
                  </span>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Rupam Wholesale me kisi bhi damage item ka claim tabhi liya jata hai jab continuous uncut unboxing video proof ho.
                  </p>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-700 block">
                    Return Entries ({custReturns.length})
                  </span>

                  {custReturns.length === 0 ? (
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center text-xs text-emerald-800 font-bold">
                      ✓ Is dukandar ka koi pending ya dispute return nahi hai (100% Clean Record)
                    </div>
                  ) : (
                    custReturns.map((r) => (
                      <div
                        key={r.id}
                        className="p-3 rounded-2xl bg-white border border-slate-200 space-y-1.5 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">{r.orderNumber}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              r.status === 'APPROVED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : r.status === 'REJECTED'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {r.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600">{r.damageDescription}</p>
                        <p className="text-[11px] font-bold text-slate-800">
                          Claim Amount: ₹{r.estimatedDamageValue}
                        </p>
                      </div>
                    ))
                  )}
                </div>

                <button
                  onClick={() => {
                    setSelectedCust(null);
                    openMorePage('returns');
                  }}
                  className="w-full py-2.5 rounded-2xl bg-slate-900 text-white font-bold text-xs"
                >
                  Open Returns Board
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* ADD CUSTOMER MODAL */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {isAddingCust && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl border-t border-slate-100 max-h-[85vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-black text-slate-900 text-base">Add New Retailer</h3>
                <p className="text-xs text-slate-500">Rupam Wholesale directory me naya retailer shop register karein</p>
              </div>
              <button
                onClick={() => {
                  setIsAddingCust(false);
                  onCloseNewCustomerDirect?.();
                }}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">Shop Name *</label>
                <input
                  type="text"
                  required
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  placeholder="e.g. Maa Mangala Cosmetics"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">Owner Name</label>
                  <input
                    type="text"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="Owner Full Name"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">Mobile Number (10 digits) *</label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="9876543210"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">Shop Address & Landmark</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Market name, chowk, landmark, village/town"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">City / Town</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Cuttack, Bhubaneswar, Jajpur..."
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">Distance from Nuapatna (km)</label>
                  <input
                    type="number"
                    min="1"
                    value={distanceKm}
                    onChange={(e) => setDistanceKm(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  />
                </div>
              </div>

              {/* Distance radius indicator */}
              <div
                className={`p-2.5 rounded-xl text-xs font-bold ${
                  distanceKm <= 150
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                }`}
              >
                {distanceKm <= 150 ? (
                  <span>✓ 150 km ke andar: Free bus/van delivery available</span>
                ) : (
                  <span>⚠️ 150 km se bahar: Delivery bhada alag se lagega</span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  >
                    <option value="Cosmetics & Fancy">Cosmetics & Fancy</option>
                    <option value="Beauty Parlour">Beauty Parlour</option>
                    <option value="General Store">General Store</option>
                    <option value="Medical & Cosmetics">Medical & Cosmetics</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">GSTIN Number (Optional)</label>
                  <input
                    type="text"
                    value={gstNumber}
                    onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                    placeholder="21XXXXX..."
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 text-white font-black text-sm shadow-md active:scale-98 transition mt-2"
              >
                Save Retailer
              </button>
            </form>
          </div>
        </div>
      )}

      {/* EDIT RETAILER ID MODAL */}
      {editingCust && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl border-t border-slate-100 space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="font-black text-slate-900 text-base">Edit Retailer ID &amp; Profile</h3>
                <p className="text-[11px] text-slate-500">Retailer ID aur details update karein</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingCust(null)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditCust} className="space-y-2.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Retailer ID *</label>
                <input
                  type="text"
                  required
                  value={editIdVal}
                  onChange={(e) => setEditIdVal(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 font-mono font-bold text-slate-900"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Shop Name *</label>
                  <input
                    type="text"
                    required
                    value={editShopVal}
                    onChange={(e) => setEditShopVal(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 font-medium"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Owner Name</label>
                  <input
                    type="text"
                    value={editOwnerVal}
                    onChange={(e) => setEditOwnerVal(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 font-medium"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Phone</label>
                  <input
                    type="tel"
                    value={editPhoneVal}
                    onChange={(e) => setEditPhoneVal(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 font-medium"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">City</label>
                  <input
                    type="text"
                    value={editCityVal}
                    onChange={(e) => setEditCityVal(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 font-medium"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Dist (km)</label>
                  <input
                    type="number"
                    value={editDistVal}
                    onChange={(e) => setEditDistVal(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 font-medium"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs shadow-sm transition"
              >
                Save Retailer ID Changes
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
