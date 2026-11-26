import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Building2,
  Plus,
  Check,
  Package,
  Store,
  Users,
  MapPin,
  Phone,
  Sparkles,
  ExternalLink,
  Shield,
  Layers,
  Search,
  CheckCircle2,
  FileText,
  X,
} from 'lucide-react';

export const BusinessHubView: React.FC = () => {
  const {
    businesses,
    activeBusinessId,
    activeBusiness,
    products,
    customers,
    suppliers,
    orders,
    addProductToBusiness,
    addCustomerToBusiness,
    addSupplierToBusiness,
    showToast,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');

  // Quick Add modal per business
  const [targetBizForProduct, setTargetBizForProduct] = useState<string | null>(null);
  const [quickProdName, setQuickProdName] = useState('');
  const [quickProdCost, setQuickProdCost] = useState('200');
  const [quickProdPrice, setQuickProdPrice] = useState('320');
  const [quickProdStock, setQuickProdStock] = useState('40');

  const [targetBizForDukani, setTargetBizForDukani] = useState<string | null>(null);
  const [quickShopName, setQuickShopName] = useState('');
  const [quickShopOwner, setQuickShopOwner] = useState('');
  const [quickShopPhone, setQuickShopPhone] = useState('');
  const [quickShopCity, setQuickShopCity] = useState('Nuapatna');

  const [targetBizForSupplier, setTargetBizForSupplier] = useState<string | null>(null);
  const [quickSuppName, setQuickSuppName] = useState('');
  const [quickSuppPerson, setQuickSuppPerson] = useState('');
  const [quickSuppPhone, setQuickSuppPhone] = useState('');
  const [quickSuppCity, setQuickSuppCity] = useState('Kolkata');

  const filteredBusinesses = businesses.filter(
    (b) =>
      b.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleQuickAddProduct = (bizId: string) => {
    if (!quickProdName.trim()) {
      showToast('Enter product name', 'error');
      return;
    }
    const cost = parseFloat(quickProdCost) || 100;
    const price = parseFloat(quickProdPrice) || 150;
    const stock = parseInt(quickProdStock, 10) || 20;

    addProductToBusiness(bizId, {
      name: quickProdName.trim(),
      sku: quickProdName.slice(0, 3).toUpperCase() + '-' + Math.floor(100 + Math.random() * 900),
      brand: activeBusiness.companyName,
      category: activeBusiness.category,
      shadeOrSize: 'Standard',
      packSize: 12,
      packetStock: stock,
      purchaseCost: cost,
      sellingPrice: price,
      marginPercent: Math.round(((price - cost) / price) * 100),
      reorderLevel: 10,
      isLowStock: false,
      expiryDate: '2028-12-31',
      batchNumber: 'BAT-' + Date.now().toString().slice(-4),
      hsnCode: '33041000',
      gstRate: 18,
      imageUrl:
        'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=400&q=80',
      reservedPackets: 0,
    });

    setQuickProdName('');
    setTargetBizForProduct(null);
  };

  const handleQuickAddDukani = (bizId: string) => {
    if (!quickShopName.trim() || !quickShopOwner.trim()) {
      showToast('Enter shop name and owner name', 'error');
      return;
    }
    addCustomerToBusiness(bizId, {
      shopName: quickShopName.trim(),
      ownerName: quickShopOwner.trim(),
      phone: quickShopPhone.trim() || '98610' + Math.floor(10000 + Math.random() * 90000),
      whatsapp: quickShopPhone.trim() || '98610' + Math.floor(10000 + Math.random() * 90000),
      address: `${quickShopCity} Main Road`,
      landmark: 'Near Bus Stand',
      city: quickShopCity,
      state: 'Odisha',
      lat: 20.48,
      lng: 85.83,
      distanceKm: 15,
      category: 'General Fancy Store',
      tags: 'New',
    });

    setQuickShopName('');
    setQuickShopOwner('');
    setQuickShopPhone('');
    setTargetBizForDukani(null);
  };

  const handleQuickAddSupplier = (bizId: string) => {
    if (!quickSuppName.trim()) {
      showToast('Enter supplier firm name', 'error');
      return;
    }
    addSupplierToBusiness(bizId, {
      name: quickSuppName.trim(),
      brandAuth: 'Wholesale Stockist',
      phone: quickSuppPhone.trim() || '94371' + Math.floor(10000 + Math.random() * 90000),
      address: `${quickSuppCity} Wholesale Market`,
      paymentTerms: '50% Advance, Balance on delivery',
      rating: 4.8,
      dueAmount: 0,
      city: quickSuppCity,
      state: 'Odisha',
      contactPerson: quickSuppPerson.trim() || 'Manager',
      status: 'Active',
    });

    setQuickSuppName('');
    setQuickSuppPerson('');
    setQuickSuppPhone('');
    setTargetBizForSupplier(null);
  };

  return (
    <div className="space-y-4 pb-28">
      {/* Top Banner */}
      <div className="p-4 rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-950 text-white shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base flex items-center gap-2">
                <span>Multi-Business IDs Hub</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-300 border border-indigo-400/30">
                  Owner Admin
                </span>
              </h3>
              <p className="text-[11px] text-slate-300">
                Alag alag business ke liye Business ID overview • Switch or add ID in Menu
              </p>
            </div>
          </div>
        </div>

        {/* Current Active Business Quick Banner */}
        <div className="p-3 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-indigo-200 uppercase tracking-wider block">
                Current Active Business ID:
              </span>
              <span className="font-extrabold text-white text-sm truncate block">
                [{activeBusiness.id}] {activeBusiness.companyName}
              </span>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-xl bg-emerald-500 text-white font-extrabold text-[10px] shrink-0">
            Active Now
          </span>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-4 gap-2 text-center text-xs">
        <div className="p-3 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <span className="font-mono text-lg font-black text-indigo-700 block">{businesses.length}</span>
          <span className="text-[10px] text-slate-500 font-bold">Business IDs</span>
        </div>
        <div className="p-3 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <span className="font-mono text-lg font-black text-sky-700 block">{products.length}</span>
          <span className="text-[10px] text-slate-500 font-bold">Total Products</span>
        </div>
        <div className="p-3 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <span className="font-mono text-lg font-black text-amber-700 block">{customers.length}</span>
          <span className="text-[10px] text-slate-500 font-bold">Retailer Shops</span>
        </div>
        <div className="p-3 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <span className="font-mono text-lg font-black text-purple-700 block">{suppliers.length}</span>
          <span className="text-[10px] text-slate-500 font-bold">Suppliers</span>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search Business by ID, company name, city, category..."
          className="w-full pl-9 pr-3.5 py-2.5 rounded-2xl bg-white border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
        />
      </div>

      {/* Business Cards List */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-extrabold text-sm text-slate-900">
            Registered Businesses ({filteredBusinesses.length})
          </h3>
          <span className="text-xs text-slate-500">Switch or create Business ID in Menu</span>
        </div>

        {filteredBusinesses.map((biz) => {
          const isActive = biz.id === activeBusinessId;
          const bizProducts = products.filter(
            (p) => p.businessId === biz.id || (!p.businessId && biz.id === 'BIZ-NP-001')
          );
          const bizCustomers = customers.filter(
            (c) => c.businessId === biz.id || (!c.businessId && biz.id === 'BIZ-NP-001')
          );
          const bizSuppliers = suppliers.filter(
            (s) => s.businessId === biz.id || (!s.businessId && biz.id === 'BIZ-NP-001')
          );
          const bizOrders = orders.filter(
            (o) => o.businessId === biz.id || (!o.businessId && biz.id === 'BIZ-NP-001')
          );

          return (
            <div
              key={biz.id}
              className={`p-4 rounded-3xl border-2 transition relative overflow-hidden space-y-3 shadow-md ${
                isActive
                  ? 'bg-gradient-to-br from-indigo-50/90 via-white to-blue-50/60 border-indigo-500 ring-2 ring-indigo-400/20'
                  : 'bg-white border-slate-200/90 hover:border-indigo-300'
              }`}
            >
              {/* Header row */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-black text-indigo-700 bg-indigo-100/90 px-2.5 py-0.5 rounded-lg border border-indigo-200">
                      {biz.id}
                    </span>
                    <span className="text-[10px] font-bold text-slate-600 px-2.5 py-0.5 rounded-full bg-slate-100">
                      {biz.category}
                    </span>
                  </div>
                  <h4 className="text-base font-black text-slate-900 mt-1">
                    {biz.companyName}
                  </h4>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{biz.ownerName}</span>
                    <span>•</span>
                    <span>{biz.address || biz.city}</span>
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  {isActive && (
                    <span className="px-3 py-1 rounded-full bg-indigo-600 text-white font-black text-[11px] flex items-center gap-1 shadow-xs">
                      <Check className="w-3 h-3 stroke-[3]" />
                      <span>Active</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-4 gap-2 pt-1 text-center text-xs font-bold">
                <div className="p-2 rounded-2xl bg-indigo-50/70 border border-indigo-100">
                  <span className="block text-indigo-900 text-sm font-black">{bizProducts.length}</span>
                  <span className="text-[10px] text-indigo-700">Products</span>
                </div>
                <div className="p-2 rounded-2xl bg-amber-50/70 border border-amber-100">
                  <span className="block text-amber-900 text-sm font-black">{bizCustomers.length}</span>
                  <span className="text-[10px] text-amber-700">Retailers</span>
                </div>
                <div className="p-2 rounded-2xl bg-purple-50/70 border border-purple-100">
                  <span className="block text-purple-900 text-sm font-black">{bizSuppliers.length}</span>
                  <span className="text-[10px] text-purple-700">Suppliers</span>
                </div>
                <div className="p-2 rounded-2xl bg-emerald-50/70 border border-emerald-100">
                  <span className="block text-emerald-900 text-sm font-black">{bizOrders.length}</span>
                  <span className="text-[10px] text-emerald-700">Orders</span>
                </div>
              </div>

              {/* Quick Action Buttons for adding Product, Dukani, Supplier to this specific Business */}
              <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setTargetBizForProduct(biz.id)}
                  className="flex-1 py-1.5 px-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-bold text-[11px] flex items-center justify-center gap-1 transition"
                >
                  <Plus className="w-3 h-3" />
                  <span>Product</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTargetBizForDukani(biz.id)}
                  className="flex-1 py-1.5 px-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-[11px] flex items-center justify-center gap-1 transition"
                >
                  <Plus className="w-3 h-3" />
                  <span>Retailer</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTargetBizForSupplier(biz.id)}
                  className="flex-1 py-1.5 px-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 font-bold text-[11px] flex items-center justify-center gap-1 transition"
                >
                  <Plus className="w-3 h-3" />
                  <span>Supplier</span>
                </button>
              </div>

              {/* Sub-form: Add product to this business */}
              {targetBizForProduct === biz.id && (
                <div className="p-3 rounded-2xl bg-indigo-50/90 border border-indigo-200 space-y-2 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between text-xs font-bold text-indigo-950">
                    <span>+ Quick Add Product to {biz.id}:</span>
                    <button
                      type="button"
                      onClick={() => setTargetBizForProduct(null)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={quickProdName}
                    onChange={(e) => setQuickProdName(e.target.value)}
                    placeholder="Product Name (e.g. Silk Bindi Pack)"
                    className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-indigo-300 text-xs"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="number"
                      value={quickProdCost}
                      onChange={(e) => setQuickProdCost(e.target.value)}
                      placeholder="Buy ₹"
                      className="w-full px-2 py-1 rounded-lg bg-white border border-indigo-200 text-xs"
                    />
                    <input
                      type="number"
                      value={quickProdPrice}
                      onChange={(e) => setQuickProdPrice(e.target.value)}
                      placeholder="Sell ₹"
                      className="w-full px-2 py-1 rounded-lg bg-white border border-indigo-200 text-xs"
                    />
                    <input
                      type="number"
                      value={quickProdStock}
                      onChange={(e) => setQuickProdStock(e.target.value)}
                      placeholder="Stock Pkts"
                      className="w-full px-2 py-1 rounded-lg bg-white border border-indigo-200 text-xs"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleQuickAddProduct(biz.id)}
                    className="w-full py-1.5 rounded-xl bg-indigo-600 text-white font-bold text-xs"
                  >
                    Save Product to {biz.id}
                  </button>
                </div>
              )}

              {/* Sub-form: Add dukani to this business */}
              {targetBizForDukani === biz.id && (
                <div className="p-3 rounded-2xl bg-amber-50/90 border border-amber-200 space-y-2 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-950">
                    <span>+ Quick Add Retailer to {biz.id}:</span>
                    <button
                      type="button"
                      onClick={() => setTargetBizForDukani(null)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={quickShopName}
                      onChange={(e) => setQuickShopName(e.target.value)}
                      placeholder="Shop Name"
                      className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-amber-300 text-xs"
                    />
                    <input
                      type="text"
                      value={quickShopOwner}
                      onChange={(e) => setQuickShopOwner(e.target.value)}
                      placeholder="Owner Name"
                      className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-amber-300 text-xs"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="tel"
                      value={quickShopPhone}
                      onChange={(e) => setQuickShopPhone(e.target.value)}
                      placeholder="Phone"
                      className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-amber-300 text-xs"
                    />
                    <input
                      type="text"
                      value={quickShopCity}
                      onChange={(e) => setQuickShopCity(e.target.value)}
                      placeholder="City/Village"
                      className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-amber-300 text-xs"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleQuickAddDukani(biz.id)}
                    className="w-full py-1.5 rounded-xl bg-amber-600 text-white font-bold text-xs"
                  >
                    Save Retailer to {biz.id}
                  </button>
                </div>
              )}

              {/* Sub-form: Add supplier to this business */}
              {targetBizForSupplier === biz.id && (
                <div className="p-3 rounded-2xl bg-purple-50/90 border border-purple-200 space-y-2 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between text-xs font-bold text-purple-950">
                    <span>+ Quick Add Supplier to {biz.id}:</span>
                    <button
                      type="button"
                      onClick={() => setTargetBizForSupplier(null)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={quickSuppName}
                      onChange={(e) => setQuickSuppName(e.target.value)}
                      placeholder="Firm Name"
                      className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-purple-300 text-xs"
                    />
                    <input
                      type="text"
                      value={quickSuppPerson}
                      onChange={(e) => setQuickSuppPerson(e.target.value)}
                      placeholder="Contact Person"
                      className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-purple-300 text-xs"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="tel"
                      value={quickSuppPhone}
                      onChange={(e) => setQuickSuppPhone(e.target.value)}
                      placeholder="Phone"
                      className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-purple-300 text-xs"
                    />
                    <input
                      type="text"
                      value={quickSuppCity}
                      onChange={(e) => setQuickSuppCity(e.target.value)}
                      placeholder="City (e.g. Surat)"
                      className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-purple-300 text-xs"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleQuickAddSupplier(biz.id)}
                    className="w-full py-1.5 rounded-xl bg-purple-600 text-white font-bold text-xs"
                  >
                    Save Supplier to {biz.id}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
