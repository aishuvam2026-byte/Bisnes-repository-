import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  X,
  Building2,
  Package,
  Store,
  Users,
  Plus,
  Check,
  ChevronRight,
  Sparkles,
  MapPin,
  Phone,
  Trash2,
} from 'lucide-react';

interface CreateBusinessModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateBusinessModal: React.FC<CreateBusinessModalProps> = ({ isOpen, onClose }) => {
  const {
    businesses,
    addBusiness,
    addProductToBusiness,
    addCustomerToBusiness,
    addSupplierToBusiness,
    showToast,
  } = useApp();

  // Wizard tab
  const [activeStep, setActiveStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Company & Owner Details
  const defaultNextNum = String(businesses.length + 1).padStart(3, '0');
  const [customBizId, setCustomBizId] = useState(`BIZ-${defaultNextNum}`);
  const [companyName, setCompanyName] = useState('');
  const [ownerName, setOwnerName] = useState('Shuvam Behera');
  const [category, setCategory] = useState('Cosmetics & Beauty Wholesale');
  const [tagline, setTagline] = useState('');
  const [phone, setPhone] = useState('1234567890');
  const [city, setCity] = useState('Nuapatna');
  const [address, setAddress] = useState('Main Wholesale Market, Nuapatna, Cuttack');
  const [upiId, setUpiId] = useState('shuvam.rupam@upi');

  // Step 2: Products to add
  const [productsList, setProductsList] = useState<
    Array<{
      name: string;
      sku: string;
      brand: string;
      category: string;
      shadeOrSize: string;
      packSize: 6 | 12;
      packetStock: number;
      purchaseCost: number;
      sellingPrice: number;
    }>
  >([]);

  const [newProdName, setNewProdName] = useState('');
  const [newProdSku, setNewProdSku] = useState('');
  const [newProdPackSize, setNewProdPackSize] = useState<6 | 12>(12);
  const [newProdPurchaseCost, setNewProdPurchaseCost] = useState('240');
  const [newProdSellingPrice, setNewProdSellingPrice] = useState('360');
  const [newProdStock, setNewProdStock] = useState('50');

  // Step 3: Dukani shops to add
  const [dukansList, setDukansList] = useState<
    Array<{
      shopName: string;
      ownerName: string;
      phone: string;
      city: string;
      distanceKm: number;
      category: string;
    }>
  >([]);

  const [newShopName, setNewShopName] = useState('');
  const [newShopOwner, setNewShopOwner] = useState('');
  const [newShopPhone, setNewShopPhone] = useState('');
  const [newShopCity, setNewShopCity] = useState('Nuapatna');
  const [newShopDistance, setNewShopDistance] = useState('12');

  // Step 4: Suppliers to add
  const [suppliersList, setSuppliersList] = useState<
    Array<{
      name: string;
      contactPerson: string;
      phone: string;
      city: string;
      category: string;
    }>
  >([]);

  const [newSuppName, setNewSuppName] = useState('');
  const [newSuppContact, setNewSuppContact] = useState('');
  const [newSuppPhone, setNewSuppPhone] = useState('');
  const [newSuppCity, setNewSuppCity] = useState('Kolkata');
  const [newSuppCategory, setNewSuppCategory] = useState('Cosmetics');

  if (!isOpen) return null;

  // Add product to draft list
  const handleAddProductToDraft = () => {
    if (!newProdName.trim()) {
      showToast('Please enter product name', 'error');
      return;
    }
    const cost = parseFloat(newProdPurchaseCost) || 100;
    const price = parseFloat(newProdSellingPrice) || 150;
    const stock = parseInt(newProdStock, 10) || 20;
    const sku =
      newProdSku.trim() ||
      newProdName.slice(0, 3).toUpperCase() + '-' + Math.floor(100 + Math.random() * 900);

    setProductsList((prev) => [
      ...prev,
      {
        name: newProdName.trim(),
        sku,
        brand: companyName || 'Wholesale Direct',
        category: category,
        shadeOrSize: 'Standard Pack',
        packSize: newProdPackSize,
        packetStock: stock,
        purchaseCost: cost,
        sellingPrice: price,
      },
    ]);

    setNewProdName('');
    setNewProdSku('');
    showToast(`Added product "${newProdName}" to draft list`, 'info');
  };

  // Add starter products template
  const handleAddStarterProducts = () => {
    const starter = [
      {
        name: `${companyName || 'Premium'} Fast-Moving Pack A`,
        sku: 'SMP-01',
        brand: companyName || 'In-House Brand',
        category,
        shadeOrSize: 'Assorted 6 Shades',
        packSize: 12 as const,
        packetStock: 60,
        purchaseCost: 200,
        sellingPrice: 320,
      },
      {
        name: `${companyName || 'Premium'} Regular Wholesale Pack B`,
        sku: 'SMP-02',
        brand: companyName || 'In-House Brand',
        category,
        shadeOrSize: 'Standard',
        packSize: 6 as const,
        packetStock: 45,
        purchaseCost: 150,
        sellingPrice: 240,
      },
    ];
    setProductsList((prev) => [...prev, ...starter]);
    showToast('Added 2 starter products to list', 'success');
  };

  // Add dukani to draft list
  const handleAddDukaniToDraft = () => {
    if (!newShopName.trim() || !newShopOwner.trim()) {
      showToast('Enter shop name and owner name', 'error');
      return;
    }
    const ph = newShopPhone.trim() || '98610' + Math.floor(10000 + Math.random() * 90000);
    setDukansList((prev) => [
      ...prev,
      {
        shopName: newShopName.trim(),
        ownerName: newShopOwner.trim(),
        phone: ph,
        city: newShopCity.trim() || 'Nuapatna',
        distanceKm: parseFloat(newShopDistance) || 10,
        category: 'General Fancy Store',
      },
    ]);
    setNewShopName('');
    setNewShopOwner('');
    setNewShopPhone('');
    showToast(`Added Retailer "${newShopName}" to draft list`, 'info');
  };

  // Add starter dukani
  const handleAddStarterDukani = () => {
    const starterDukani = [
      {
        shopName: 'Maa Durga Fancy & Variety Store',
        ownerName: 'Sunil Jena',
        phone: '9861234510',
        city: 'Athagarh',
        distanceKm: 18,
        category: 'Cosmetic & General',
      },
      {
        shopName: 'Shree Krishna Beauty Collection',
        ownerName: 'Deepak Pradhan',
        phone: '9861876520',
        city: 'Banki',
        distanceKm: 28,
        category: 'Fancy Store',
      },
    ];
    setDukansList((prev) => [...prev, ...starterDukani]);
    showToast('Added 2 sample Retailer partners', 'success');
  };

  // Add supplier to draft list
  const handleAddSupplierToDraft = () => {
    if (!newSuppName.trim()) {
      showToast('Enter supplier firm name', 'error');
      return;
    }
    setSuppliersList((prev) => [
      ...prev,
      {
        name: newSuppName.trim(),
        contactPerson: newSuppContact.trim() || 'Manager',
        phone: newSuppPhone.trim() || '9437' + Math.floor(100000 + Math.random() * 900000),
        city: newSuppCity.trim() || 'Kolkata',
        category: newSuppCategory,
      },
    ]);
    setNewSuppName('');
    setNewSuppContact('');
    setNewSuppPhone('');
    showToast(`Added supplier "${newSuppName}" to draft list`, 'info');
  };

  // Final creation of Business ID & all linked entities
  const handleFinalCreateBusiness = () => {
    if (!companyName.trim()) {
      showToast('Please enter Company Name in Step 1', 'error');
      setActiveStep(1);
      return;
    }

    const createdBiz = addBusiness({
      customId: customBizId,
      companyName: companyName.trim(),
      ownerName: ownerName.trim() || 'Shuvam Behera',
      category: category.trim(),
      tagline: tagline.trim() || `${city} Wholesale Distribution Hub`,
      phone: phone.trim() || '1234567890',
      whatsapp: phone.trim() || '1234567890',
      address: address.trim(),
      city: city.trim() || 'Nuapatna',
      state: 'Odisha',
      upiId: upiId.trim() || 'shuvam.rupam@upi',
      minOrderValue: 1000,
      freeDeliveryRadiusKm: 150,
    });

    // Add draft products to this new business
    productsList.forEach((p) => {
      addProductToBusiness(createdBiz.id, {
        name: p.name,
        sku: p.sku,
        brand: p.brand,
        category: p.category,
        shadeOrSize: p.shadeOrSize,
        packSize: p.packSize,
        packetStock: p.packetStock,
        purchaseCost: p.purchaseCost,
        sellingPrice: p.sellingPrice,
        marginPercent: Math.round(((p.sellingPrice - p.purchaseCost) / p.sellingPrice) * 100),
        reorderLevel: 10,
        isLowStock: false,
        expiryDate: '2028-12-31',
        batchNumber: 'BATCH-' + Date.now().toString().slice(-4),
        hsnCode: '33041000',
        gstRate: 18,
        imageUrl:
          'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=400&q=80',
        reservedPackets: 0,
      });
    });

    // Add draft dukani to this new business
    dukansList.forEach((d) => {
      addCustomerToBusiness(createdBiz.id, {
        shopName: d.shopName,
        ownerName: d.ownerName,
        phone: d.phone,
        whatsapp: d.phone,
        address: `${d.city} Main Road`,
        landmark: 'Near Market Square',
        city: d.city,
        state: 'Odisha',
        lat: 20.48,
        lng: 85.83,
        distanceKm: d.distanceKm,
        category: d.category,
        tags: 'New',
      });
    });

    // Add draft suppliers to this new business
    suppliersList.forEach((s) => {
      addSupplierToBusiness(createdBiz.id, {
        name: s.name,
        brandAuth: 'Direct Wholesaler / Stockist',
        phone: s.phone,
        address: `${s.city} Wholesale Mandi`,
        paymentTerms: '50% Advance, Balance on delivery',
        rating: 4.8,
        dueAmount: 0,
        city: s.city,
        state: 'Odisha',
        contactPerson: s.contactPerson,
        status: 'Active',
      });
    });

    showToast(
      `🎉 Business ID ${createdBiz.id} (${createdBiz.companyName}) created with ${productsList.length} products, ${dukansList.length} retailers, and ${suppliersList.length} suppliers!`,
      'success'
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center font-black text-indigo-300">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base leading-tight">Create New Business ID</h3>
              <p className="text-[11px] text-slate-300">
                Setup separate company name, owner name, products, retailers &amp; suppliers
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Wizard Steps Navigation Bar */}
        <div className="grid grid-cols-4 p-2 bg-slate-100 shrink-0 gap-1 text-[11px] font-bold">
          <button
            type="button"
            onClick={() => setActiveStep(1)}
            className={`py-2 rounded-xl flex items-center justify-center gap-1 transition ${
              activeStep === 1
                ? 'bg-white text-indigo-900 shadow-xs ring-1 ring-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>1. Company</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveStep(2)}
            className={`py-2 rounded-xl flex items-center justify-center gap-1 transition ${
              activeStep === 2
                ? 'bg-white text-indigo-900 shadow-xs ring-1 ring-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>2. Products ({productsList.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveStep(3)}
            className={`py-2 rounded-xl flex items-center justify-center gap-1 transition ${
              activeStep === 3
                ? 'bg-white text-indigo-900 shadow-xs ring-1 ring-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>3. Retailers ({dukansList.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveStep(4)}
            className={`py-2 rounded-xl flex items-center justify-center gap-1 transition ${
              activeStep === 4
                ? 'bg-white text-indigo-900 shadow-xs ring-1 ring-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>4. Suppliers ({suppliersList.length})</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* STEP 1: COMPANY & OWNER INFO */}
          {activeStep === 1 && (
            <div className="space-y-3.5">
              <div className="p-3 rounded-2xl bg-indigo-50/80 border border-indigo-200 text-xs text-indigo-950 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>
                  Ek naya Business ID generate karein jisme aap alag company name aur owner profile set kar sakte hain.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Business ID (Auto/Custom)
                  </label>
                  <input
                    type="text"
                    value={customBizId}
                    onChange={(e) => setCustomBizId(e.target.value.toUpperCase())}
                    placeholder="e.g. BIZ-CTC-004"
                    className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl bg-slate-50 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Owner Name *
                  </label>
                  <input
                    type="text"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="Shuvam Behera"
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl bg-slate-50 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Company / Firm Name *
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Maa Mangala Hosiery & General Wholesale"
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl bg-slate-50 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Business Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-300 font-semibold"
                  >
                    <option value="Cosmetics & Beauty Wholesale">Cosmetics & Beauty Wholesale</option>
                    <option value="Hosiery, Innerwear & Readymade">Hosiery, Innerwear & Readymade</option>
                    <option value="Bangles, Bindi & Imitation Jewellery">Bangles, Bindi & Imitation Jewellery</option>
                    <option value="Salon & Beauty Parlour Bulk Supply">Salon & Beauty Parlour Bulk Supply</option>
                    <option value="FMCG, Soap & Detergent Wholesale">FMCG, Soap & Detergent Wholesale</option>
                    <option value="General & Variety Store Bulk">General & Variety Store Bulk</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Hub City / Town
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Nuapatna / Cuttack / Bhubaneswar"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Phone & WhatsApp
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="1234567890"
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl bg-slate-50 border border-slate-300"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    UPI ID for Payments
                  </label>
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="shuvam.rupam@upi"
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl bg-slate-50 border border-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Full Business Address
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Plot/Shop Address, Market Area, District"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-300"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!companyName.trim()) {
                    showToast('Please enter Company Name', 'error');
                    return;
                  }
                  setActiveStep(2);
                }}
                className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md active:scale-98 transition"
              >
                <span>Continue to Step 2: Add Products</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* STEP 2: PRODUCTS FOR THIS BUSINESS */}
          {activeStep === 2 && (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900">
                    Products for {companyName || customBizId} ({productsList.length})
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Add new items or load starter wholesale pack
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddStarterProducts}
                  className="px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-xs hover:bg-indigo-100 flex items-center gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>+ Quick Starter Pack</span>
                </button>
              </div>

              {/* Added products preview */}
              {productsList.length > 0 && (
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {productsList.map((p, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-slate-900 block">{p.name}</span>
                        <span className="text-[10px] text-slate-500">
                          SKU: {p.sku} • {p.packSize}pk • Stock: {p.packetStock} pkts • Cost: ₹{p.purchaseCost} | Sell: ₹{p.sellingPrice}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setProductsList((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-rose-500 hover:text-rose-700 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* New Product Form */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                <span className="text-xs font-bold text-indigo-900 block">
                  + Add New Product to this Business:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={newProdName}
                    onChange={(e) => setNewProdName(e.target.value)}
                    placeholder="Product Name (e.g. Matte Lipstick 12s)"
                    className="w-full px-3 py-1.5 text-xs rounded-xl bg-white border border-slate-300"
                  />
                  <input
                    type="text"
                    value={newProdSku}
                    onChange={(e) => setNewProdSku(e.target.value)}
                    placeholder="SKU (e.g. LIP-01)"
                    className="w-full px-3 py-1.5 text-xs rounded-xl bg-white border border-slate-300"
                  />
                </div>

                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block">Pack Size</label>
                    <select
                      value={newProdPackSize}
                      onChange={(e) => setNewProdPackSize(Number(e.target.value) as 6 | 12)}
                      className="w-full px-2 py-1.5 text-xs rounded-lg bg-white border border-slate-300"
                    >
                      <option value={12}>12 pcs</option>
                      <option value={6}>6 pcs</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block">Buy Cost/pkt</label>
                    <input
                      type="number"
                      value={newProdPurchaseCost}
                      onChange={(e) => setNewProdPurchaseCost(e.target.value)}
                      className="w-full px-2 py-1.5 text-xs rounded-lg bg-white border border-slate-300 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block">Sell Price/pkt</label>
                    <input
                      type="number"
                      value={newProdSellingPrice}
                      onChange={(e) => setNewProdSellingPrice(e.target.value)}
                      className="w-full px-2 py-1.5 text-xs rounded-lg bg-white border border-slate-300 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block">Stock Pkts</label>
                    <input
                      type="number"
                      value={newProdStock}
                      onChange={(e) => setNewProdStock(e.target.value)}
                      className="w-full px-2 py-1.5 text-xs rounded-lg bg-white border border-slate-300 font-mono"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddProductToDraft}
                  className="w-full py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition"
                >
                  + Add to Product List
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setActiveStep(1)}
                  className="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-700 text-xs font-bold"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setActiveStep(3)}
                  className="flex-2 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md active:scale-98 transition"
                >
                  <span>Continue to Step 3: Add Retailers</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: RETAILER SHOPS FOR THIS BUSINESS */}
          {activeStep === 3 && (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900">
                    Retailer Shops for {companyName || customBizId} ({dukansList.length})
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Register retail partners who buy from this business
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddStarterDukani}
                  className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 font-bold text-xs hover:bg-amber-100 flex items-center gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>+ Sample Shops</span>
                </button>
              </div>

              {/* Added Dukani preview */}
              {dukansList.length > 0 && (
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {dukansList.map((d, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-slate-900 block">{d.shopName}</span>
                        <span className="text-[10px] text-slate-500">
                          {d.ownerName} • {d.phone} • {d.city} ({d.distanceKm} km)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setDukansList((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-rose-500 hover:text-rose-700 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* New Retailer Form */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                <span className="text-xs font-bold text-amber-900 block">
                  + Add New Retailer Shop:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={newShopName}
                    onChange={(e) => setNewShopName(e.target.value)}
                    placeholder="Shop Name (e.g. Mahalaxmi Variety)"
                    className="w-full px-3 py-1.5 text-xs rounded-xl bg-white border border-slate-300"
                  />
                  <input
                    type="text"
                    value={newShopOwner}
                    onChange={(e) => setNewShopOwner(e.target.value)}
                    placeholder="Owner Name (e.g. Sunil Jena)"
                    className="w-full px-3 py-1.5 text-xs rounded-xl bg-white border border-slate-300"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="tel"
                    value={newShopPhone}
                    onChange={(e) => setNewShopPhone(e.target.value)}
                    placeholder="Phone / WhatsApp"
                    className="w-full px-3 py-1.5 text-xs rounded-xl bg-white border border-slate-300"
                  />
                  <input
                    type="text"
                    value={newShopCity}
                    onChange={(e) => setNewShopCity(e.target.value)}
                    placeholder="Town / Village"
                    className="w-full px-3 py-1.5 text-xs rounded-xl bg-white border border-slate-300"
                  />
                  <input
                    type="number"
                    value={newShopDistance}
                    onChange={(e) => setNewShopDistance(e.target.value)}
                    placeholder="Distance (km)"
                    className="w-full px-3 py-1.5 text-xs rounded-xl bg-white border border-slate-300"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleAddDukaniToDraft}
                  className="w-full py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition"
                >
                  + Add to Retailer List
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setActiveStep(2)}
                  className="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-700 text-xs font-bold"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setActiveStep(4)}
                  className="flex-2 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md active:scale-98 transition"
                >
                  <span>Continue to Step 4: Add Suppliers</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: SUPPLIERS FOR THIS BUSINESS */}
          {activeStep === 4 && (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900">
                    Suppliers for {companyName || customBizId} ({suppliersList.length})
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Add manufacturers & stockists supplying to this business
                  </p>
                </div>
              </div>

              {/* Added Suppliers preview */}
              {suppliersList.length > 0 && (
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {suppliersList.map((s, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-slate-900 block">{s.name}</span>
                        <span className="text-[10px] text-slate-500">
                          {s.contactPerson} • {s.phone} • {s.city} ({s.category})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSuppliersList((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-rose-500 hover:text-rose-700 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* New Supplier Form */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                <span className="text-xs font-bold text-purple-900 block">
                  + Add New Supplier to this Business:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={newSuppName}
                    onChange={(e) => setNewSuppName(e.target.value)}
                    placeholder="Supplier Firm Name (e.g. Surat Cotton Mills)"
                    className="w-full px-3 py-1.5 text-xs rounded-xl bg-white border border-slate-300"
                  />
                  <input
                    type="text"
                    value={newSuppContact}
                    onChange={(e) => setNewSuppContact(e.target.value)}
                    placeholder="Contact Person (e.g. Ramesh Bhai)"
                    className="w-full px-3 py-1.5 text-xs rounded-xl bg-white border border-slate-300"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="tel"
                    value={newSuppPhone}
                    onChange={(e) => setNewSuppPhone(e.target.value)}
                    placeholder="Phone / WhatsApp"
                    className="w-full px-3 py-1.5 text-xs rounded-xl bg-white border border-slate-300"
                  />
                  <input
                    type="text"
                    value={newSuppCity}
                    onChange={(e) => setNewSuppCity(e.target.value)}
                    placeholder="City (e.g. Surat / Kolkata / Delhi)"
                    className="w-full px-3 py-1.5 text-xs rounded-xl bg-white border border-slate-300"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleAddSupplierToDraft}
                  className="w-full py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition"
                >
                  + Add to Supplier List
                </button>
              </div>

              {/* Final Summary Card before submission */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-200 space-y-2 text-xs">
                <div className="flex items-center justify-between font-black text-slate-900 text-sm">
                  <span>Business ID: {customBizId}</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px]">
                    Ready to Activate
                  </span>
                </div>
                <div className="text-slate-600">
                  <p><strong>Company:</strong> {companyName || 'Not specified'}</p>
                  <p><strong>Owner:</strong> {ownerName} • {city}</p>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-indigo-200/60 font-bold text-center">
                  <div className="p-1.5 rounded-xl bg-white">
                    <span className="block text-indigo-700 text-sm font-black">{productsList.length}</span>
                    <span className="text-[10px] text-slate-500">Products</span>
                  </div>
                  <div className="p-1.5 rounded-xl bg-white">
                    <span className="block text-amber-700 text-sm font-black">{dukansList.length}</span>
                    <span className="text-[10px] text-slate-500">Retailers</span>
                  </div>
                  <div className="p-1.5 rounded-xl bg-white">
                    <span className="block text-purple-700 text-sm font-black">{suppliersList.length}</span>
                    <span className="text-[10px] text-slate-500">Suppliers</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setActiveStep(3)}
                  className="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-700 text-xs font-bold"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleFinalCreateBusiness}
                  className="flex-2 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md active:scale-98 transition"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Create Business ID & Switch</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
