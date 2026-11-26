import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { Product } from '../types';
import {
  Search,
  Plus,
  Package,
  AlertTriangle,
  QrCode,
  X,
  CheckCircle2,
  ShoppingCart,
  Zap,
  MessageSquare,
  Smartphone,
  BellRing,
  Layers,
  PackageX,
  Database,
  Send,
  SlidersHorizontal,
} from 'lucide-react';
import { calculateLandedCost } from '../utils/businessRules';
import {
  ReminderDispatcherModal,
  buildSmsHref,
  buildWhatsAppHref,
  loadAutoReminderSettings,
} from '../components/ReminderDispatcherModal';
import { DigitalInventoryPanel } from '../components/DigitalInventoryPanel';
import { tr } from '../data/translations';

const WAREHOUSE_ZONES = [
  'All Zones',
  'Zone A - Lip & Eye',
  'Zone B - Nails & Remover',
  'Zone C - Bindi & Bridal',
  'Zone D - Accessories & FMCG',
];

function inferWarehouseZone(category: string): string {
  const c = (category || '').toLowerCase();
  if (c.includes('lip') || c.includes('eye') || c.includes('kajal') || c.includes('mascara')) {
    return 'Zone A - Lip & Eye';
  }
  if (c.includes('nail') || c.includes('remover')) {
    return 'Zone B - Nails & Remover';
  }
  if (c.includes('bindi') || c.includes('makeup') || c.includes('mehendi')) {
    return 'Zone C - Bindi & Bridal';
  }
  return 'Zone D - Accessories & FMCG';
}

export const StockView: React.FC<{
  isNewProductOpenDirect?: boolean;
  onCloseNewProductDirect?: () => void;
}> = ({ isNewProductOpenDirect = false, onCloseNewProductDirect }) => {
  const {
    products,
    orders,
    suppliers,
    addProduct,
    updateProductStock,
    updateProductOrganization,
    sendDealerLowStockAlert,
    autoReorderProduct,
    whatsappAlerts,
    isRealtimeInventoryConnected,
    openMorePage,
    showToast,
    role,
    user,
    settings,
    activeBusiness,
    language,
    t,
    cart,
    addToCart,
    logActivity,
  } = useApp();
  const outOfStockProducts = products.filter((p) => p.packetStock <= 0);
  const lowStockProducts = products.filter((p) => p.packetStock > 0 && (p.isLowStock || p.packetStock <= p.reorderLevel));
  const healthyStockProducts = products.filter((p) => p.packetStock > p.reorderLevel && !p.isLowStock);

  const [ownerSectionTab, setOwnerSectionTab] = useState<'inventory' | 'whatsapp'>('inventory');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'out_of_stock' | 'low_stock' | 'in_stock'>('all');
  const [zoneFilter, setZoneFilter] = useState('All Zones');
  const [sortBy, setSortBy] = useState<'critical' | 'expiry' | 'fast_moving' | 'stock_desc'>('critical');
  const [lowStockOnlyFilter, setLowStockOnlyFilter] = useState(false);
  const [orgEditProduct, setOrgEditProduct] = useState<Product | null>(null);
  const [orgZone, setOrgZone] = useState('Zone A - Lip & Eye');
  const [orgShelf, setOrgShelf] = useState('R1-S1');
  const [orgReorder, setOrgReorder] = useState<number>(8);
  const [orgSupplierId, setOrgSupplierId] = useState<string>('');
  const [newWarehouseZone, setNewWarehouseZone] = useState('Zone A - Lip & Eye');
  const [newShelfCode, setNewShelfCode] = useState('R1-S1');
  const [sendingWaId, setSendingWaId] = useState<string | null>(null);
  const [reorderingProdId, setReorderingProdId] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isLowStockReminderOpen, setIsLowStockReminderOpen] = useState(false);
  const [lowStockTargetSupplierId, setLowStockTargetSupplierId] = useState<string | undefined>(undefined);
  const [remindedLowStockMap, setRemindedLowStockMap] = useState<Record<string, string>>({});

  // Modals
  const [isAddingProduct, setIsAddingProduct] = useState(isNewProductOpenDirect);
  const [isAdjustingStock, setIsAdjustingStock] = useState(false);
  const [isScanningBarcode, setIsScanningBarcode] = useState(false);

  // Quantity selector state for retailer catalogue
  const [productQuantities, setProductQuantities] = useState<{ [productId: string]: number }>({});

  // Logged in Supplier detection
  const loggedInSupplier = suppliers.find((s) => s.id === user?.supplierId) || suppliers[0];
  const activeSupplierId = loggedInSupplier?.id || 'sup-1';

  // New product form states
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [brand, setBrand] = useState('Rupam Glam');
  const [category, setCategory] = useState('Lipstick');
  const [shadeOrSize, setShadeOrSize] = useState('');
  const [packSize, setPackSize] = useState<6 | 12>(12);
  const [packetStock, setPacketStock] = useState<number>(10);
  const [purchaseCost, setPurchaseCost] = useState<number>(250);
  const [freightPerPkt, setFreightPerPkt] = useState<number>(10);
  const [packingPerPkt, setPackingPerPkt] = useState<number>(5);
  const [sellingPrice, setSellingPrice] = useState<number>(390);
  const [reorderLevel, setReorderLevel] = useState<number>(8);
  const [expiryDate, setExpiryDate] = useState('2028-12-31');
  const [batchNumber, setBatchNumber] = useState('B26-09');

  // Stock Adjustment form states
  const [adjustDelta, setAdjustDelta] = useState<number>(1);
  const [adjustType, setAdjustType] = useState<'in' | 'out'>('in');
  const [adjustReason, setAdjustReason] = useState('Supplier Stock Arrival');

  const categories = [
    'All',
    'Lipstick',
    'Nail Polish',
    'Remover',
    'Bindi',
    'Eyeliner',
    'Kajal',
    'Mascara',
    'Makeup Kit',
    'Eye Shadow',
    'Hair Clips/Accessories',
    'Mehendi',
  ];

  // Scoped product list based on role
  const supplierProducts = products.filter(
    (p) => p.supplierId === activeSupplierId || (p.brand && loggedInSupplier?.brands?.includes(p.brand))
  );

  const baseProductList = role === 'supplier' ? supplierProducts : products;

  // Stock Valuation
  const totalCostValue = baseProductList.reduce((sum, p) => sum + p.packetStock * p.purchaseCost, 0);
  const totalSaleValue = baseProductList.reduce((sum, p) => sum + p.packetStock * p.sellingPrice, 0);
  const totalPackets = baseProductList.reduce((sum, p) => sum + p.packetStock, 0);
  const totalPieces = baseProductList.reduce((sum, p) => sum + p.piecesStock, 0);

  // Historical packets sold per SKU for organization & sorting
  const soldQtyByProductId = useMemo(() => {
    const map = new Map<string, number>();
    for (const ord of orders) {
      if (ord.status === 'Cancelled' || ord.status === 'Returned') continue;
      for (const item of ord.items || []) {
        map.set(item.productId, (map.get(item.productId) || 0) + Number(item.packetQty || 0));
      }
    }
    return map;
  }, [orders]);

  const filteredProducts = useMemo(() => {
    const list = baseProductList.filter((p) => {
      const effectiveZone = p.warehouseZone || inferWarehouseZone(p.category);
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
        effectiveZone.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.shelfCode || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCat = categoryFilter === 'All' ? true : p.category === categoryFilter;
      const matchesZone = zoneFilter === 'All Zones' ? true : effectiveZone === zoneFilter;
      const isOos = p.packetStock <= 0;
      const isLow = p.packetStock > 0 && (p.isLowStock || p.packetStock <= p.reorderLevel);
      const matchesStatus =
        stockStatusFilter === 'all'
          ? true
          : stockStatusFilter === 'out_of_stock'
          ? isOos
          : stockStatusFilter === 'low_stock'
          ? isLow
          : !isOos && !isLow;
      const matchesLow = !lowStockOnlyFilter || isOos || isLow;
      return matchesSearch && matchesCat && matchesZone && matchesStatus && matchesLow;
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'critical') {
        const score = (p: Product) => (p.packetStock <= 0 ? 0 : p.packetStock <= p.reorderLevel ? 1 : 2);
        const diff = score(a) - score(b);
        return diff !== 0 ? diff : a.packetStock - b.packetStock;
      }
      if (sortBy === 'expiry') {
        return (a.expiryDate || '2099-12-31').localeCompare(b.expiryDate || '2099-12-31');
      }
      if (sortBy === 'fast_moving') {
        return (soldQtyByProductId.get(b.id) || 0) - (soldQtyByProductId.get(a.id) || 0);
      }
      return b.packetStock - a.packetStock;
    });
  }, [
    baseProductList,
    searchQuery,
    categoryFilter,
    zoneFilter,
    stockStatusFilter,
    lowStockOnlyFilter,
    sortBy,
    soldQtyByProductId,
  ]);

  const findSupplierForProduct = (p: Product) =>
    suppliers.find((s) => s.id === p.supplierId) ||
    suppliers.find((s) => p.supplierName && s.name === p.supplierName) ||
    suppliers.find((s) => p.brand && s.brands?.includes(p.brand)) ||
    suppliers.find((s) => s.categories?.includes(p.category)) ||
    suppliers[0];

  const stockAutoConfig = loadAutoReminderSettings();

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Product name is required', 'error');
      return;
    }

    const landed = calculateLandedCost(purchaseCost, freightPerPkt, packingPerPkt, 0, sellingPrice);

    addProduct({
      name,
      sku: sku || `SKU-${Date.now().toString().slice(-4)}`,
      brand,
      category,
      shadeOrSize: shadeOrSize || 'Standard',
      packSize,
      packetStock: Number(packetStock),
      purchaseCost: landed.landedCost,
      sellingPrice: Number(sellingPrice),
      marginPercent: landed.marginPercent,
      reorderLevel: Number(reorderLevel),
      isLowStock: Number(packetStock) <= Number(reorderLevel),
      expiryDate,
      batchNumber,
      hsnCode: '33049900',
      gstRate: 18,
      imageUrl: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400',
      reservedPackets: 0,
      warehouseZone: newWarehouseZone || inferWarehouseZone(category),
      shelfCode: newShelfCode || 'R1-S1',
    });

    setIsAddingProduct(false);
    onCloseNewProductDirect?.();
  };

  const openOrganizationModal = (p: Product) => {
    const matchedSupp = findSupplierForProduct(p);
    setOrgEditProduct(p);
    setOrgZone(p.warehouseZone || inferWarehouseZone(p.category));
    setOrgShelf(p.shelfCode || 'R1-S1');
    setOrgReorder(p.reorderLevel);
    setOrgSupplierId(p.supplierId || matchedSupp?.id || '');
  };

  const handleSaveOrganization = () => {
    if (!orgEditProduct) return;
    const supp = suppliers.find((s) => s.id === orgSupplierId);
    updateProductOrganization(orgEditProduct.id, {
      warehouseZone: orgZone,
      shelfCode: orgShelf.trim() || 'R1-S1',
      reorderLevel: Math.max(0, Number(orgReorder) || 0),
      supplierId: supp?.id || orgEditProduct.supplierId,
      supplierName: supp?.name || orgEditProduct.supplierName,
    });
    setOrgEditProduct(null);
  };

  const handleApplyAdjustment = () => {
    if (!selectedProduct) return;
    const delta = adjustType === 'in' ? Math.abs(adjustDelta) : -Math.abs(adjustDelta);
    updateProductStock(selectedProduct.id, delta, adjustReason);
    setIsAdjustingStock(false);
  };

  const getProductQty = (productId: string) => productQuantities[productId] || 1;

  const handleUpdateQty = (productId: string, delta: number) => {
    setProductQuantities((prev) => {
      const current = prev[productId] || 1;
      const next = Math.max(1, current + delta);
      return { ...prev, [productId]: next };
    });
  };

  const handleAddToCart = (product: Product, qty: number) => {
    addToCart(product, qty);
  };

  return (
    <div className="space-y-3 pb-24">
      {/* Owner Digital Inventory Management Mode Switcher */}
      {role === 'owner' && (
        <div className="grid grid-cols-2 gap-1.5 bg-white/90 p-1 rounded-2xl border border-slate-200/90 shadow-xs">
          <button
            type="button"
            onClick={() => setOwnerSectionTab('inventory')}
            className={`py-2 px-2 rounded-xl text-[10px] sm:text-[11px] font-black flex items-center justify-center gap-1.5 transition ${
              ownerSectionTab === 'inventory'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Stock & Org</span>
          </button>

          <button
            type="button"
            onClick={() => setOwnerSectionTab('whatsapp')}
            className={`py-2 px-2 rounded-xl text-[10px] sm:text-[11px] font-black flex items-center justify-center gap-1.5 transition ${
              ownerSectionTab === 'whatsapp'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Auto WA</span>
            {whatsappAlerts.length > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ${ownerSectionTab === 'whatsapp' ? 'bg-white/25 text-white' : 'bg-emerald-100 text-emerald-800'}`}>
                {whatsappAlerts.length}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Render Dedicated Auto WhatsApp Panel when selected by Owner */}
      {role === 'owner' && ownerSectionTab === 'whatsapp' ? (
        <DigitalInventoryPanel mode="whatsapp" />
      ) : (
        <>
          {/* Top Controls */}
          <div className="flex items-center justify-between gap-1.5">
            <div className="relative flex-1 min-w-0">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search SKU, brand, zone, shelf..."
                className="w-full pl-8 pr-3 py-2 rounded-xl bg-white/90 border border-slate-200 text-[11px] text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-xs"
              />
            </div>

            {/* Scan Barcode Button */}
            <button
              onClick={() => {
                setIsScanningBarcode(true);
                setTimeout(() => {
                  setIsScanningBarcode(false);
                  showToast('Barcode scanned: SKU LIP-MAT-01 detected!');
                  setSearchQuery('LIP-MAT-01');
                }, 1800);
              }}
              className="w-9 h-9 rounded-xl bg-white/90 border border-slate-200 text-slate-700 flex items-center justify-center shrink-0 shadow-xs hover:bg-slate-50 transition"
              title="Scan Product Barcode"
              aria-label="Scan barcode"
            >
              <QrCode className="w-4 h-4" />
            </button>

            {/* Add Product Button */}
            {role === 'owner' && (
              <button
                onClick={() => setIsAddingProduct(true)}
                className="px-2.5 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-white font-bold text-[11px] flex items-center gap-1 shadow-sm shadow-sky-600/25 shrink-0 active:scale-95 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t.addStock}</span>
              </button>
            )}
          </div>

          {/* Out-of-Stock Tracking & Organization Summary KPIs for Owner */}
          {role === 'owner' && (
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setStockStatusFilter((s) => (s === 'out_of_stock' ? 'all' : 'out_of_stock'))}
                className={`rounded-2xl p-2 text-left border transition ${
                  stockStatusFilter === 'out_of_stock'
                    ? 'bg-rose-600 text-white border-rose-700 shadow-sm'
                    : 'bg-rose-50/90 text-rose-900 border-rose-200 hover:bg-rose-100'
                }`}
              >
                <span className="text-[9px] font-black uppercase flex items-center gap-1 opacity-90">
                  <PackageX className="w-3 h-3 shrink-0" />
                  <span className="truncate">Out</span>
                </span>
                <span className="text-base font-black block mt-0.5 tabular-nums">{outOfStockProducts.length}</span>
              </button>

              <button
                type="button"
                onClick={() => setStockStatusFilter((s) => (s === 'low_stock' ? 'all' : 'low_stock'))}
                className={`rounded-2xl p-2 text-left border transition ${
                  stockStatusFilter === 'low_stock'
                    ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                    : 'bg-amber-50/90 text-amber-950 border-amber-200 hover:bg-amber-100'
                }`}
              >
                <span className="text-[9px] font-black uppercase flex items-center gap-1 opacity-90">
                  <AlertTriangle className="w-3 h-3 shrink-0" />
                  <span className="truncate">Low</span>
                </span>
                <span className="text-base font-black block mt-0.5 tabular-nums">{lowStockProducts.length}</span>
              </button>

              <button
                type="button"
                onClick={() => setStockStatusFilter((s) => (s === 'in_stock' ? 'all' : 'in_stock'))}
                className={`rounded-2xl p-2 text-left border transition ${
                  stockStatusFilter === 'in_stock'
                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                    : 'bg-emerald-50/90 text-emerald-950 border-emerald-200 hover:bg-emerald-100'
                }`}
              >
                <span className="text-[9px] font-black uppercase flex items-center gap-1 opacity-90">
                  <CheckCircle2 className="w-3 h-3 shrink-0" />
                  <span className="truncate">Healthy</span>
                </span>
                <span className="text-base font-black block mt-0.5 tabular-nums">{healthyStockProducts.length}</span>
              </button>
            </div>
          )}

          {/* Stock Valuation Summary Banner */}
          {role === 'owner' && (
            <div className="glass-card rounded-2xl p-2.5 sm:p-3 flex items-center justify-between gap-2 border border-sky-100">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                    {tr('Inventory Valuation', language)}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                    <Database className={`w-2.5 h-2.5 ${isRealtimeInventoryConnected ? 'text-emerald-600' : 'text-slate-400'}`} />
                    {isRealtimeInventoryConnected ? 'Firebase Live' : activeBusiness.id}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                  <span className="text-xs font-bold text-slate-800">
                    {tr('Cost', language)}: <span className="text-slate-900 font-extrabold">₹{totalCostValue.toLocaleString('en-IN')}</span>
                  </span>
                  <span className="text-xs font-bold text-emerald-700">
                    {tr('Sale', language)}: <span className="text-emerald-800 font-extrabold">₹{totalSaleValue.toLocaleString('en-IN')}</span>
                  </span>
                </div>
              </div>
              <button
                onClick={() => openMorePage('reports')}
                className="text-[11px] font-bold text-sky-600 hover:text-sky-800 shrink-0"
              >
                {tr('Report →', language)}
              </button>
            </div>
          )}

          {/* Stock Organization Controls (Zone & Sort) for Owner */}
          {role === 'owner' && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <select
                value={zoneFilter}
                onChange={(e) => setZoneFilter(e.target.value)}
                className="flex-1 min-w-[140px] px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-[11px] font-bold text-slate-700 shadow-2xs"
                aria-label="Filter by Warehouse Zone"
              >
                {WAREHOUSE_ZONES.map((z) => (
                  <option key={z} value={z}>{z}</option>
                ))}
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="flex-1 min-w-[140px] px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-[11px] font-bold text-slate-700 shadow-2xs"
                aria-label="Sort Inventory"
              >
                <option value="critical">Sort: Out of Stock / Critical First</option>
                <option value="fast_moving">Sort: Fastest Selling First</option>
                <option value="expiry">Sort: Nearest Expiry (FEFO)</option>
                <option value="stock_desc">Sort: Highest Stock First</option>
              </select>
            </div>
          )}

      {/* Supplier Sourced Inventory Summary Banner */}
      {role === 'supplier' && (
        <div className="glass-card rounded-2xl p-3 border border-emerald-200/90 bg-gradient-to-r from-emerald-50/70 to-teal-50/40 shadow-xs space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <div className="min-w-0">
                <h3 className="font-extrabold text-xs text-slate-900 flex flex-wrap items-center gap-1">
                  <span className="truncate">{loggedInSupplier.name}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                    {filteredProducts.length} Items
                  </span>
                </h3>
                <p className="text-[10px] text-slate-500 truncate">
                  Supplied brand products at Nuapatna Hub
                </p>
              </div>
            </div>
            <button
              onClick={() => openMorePage('reports')}
              className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 bg-white px-2 py-1 rounded-lg border border-emerald-200 shadow-2xs shrink-0"
            >
              Report →
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-emerald-100 text-center">
            <div className="bg-white/80 p-1.5 rounded-lg border border-emerald-100">
              <span className="text-[9px] text-slate-500 font-semibold block">Sourced Stock</span>
              <span className="text-xs font-extrabold text-slate-900">{totalPackets} pkts <span className="text-[9px] text-slate-500 font-normal">({totalPieces})</span></span>
            </div>
            <div className="bg-white/80 p-1.5 rounded-lg border border-emerald-100">
              <span className="text-[9px] text-slate-500 font-semibold block">Cost Value</span>
              <span className="text-xs font-black text-slate-900">₹{totalCostValue.toLocaleString('en-IN')}</span>
            </div>
            <div className="bg-white/80 p-1.5 rounded-lg border border-emerald-100">
              <span className="text-[9px] text-slate-500 font-semibold block">Sale Valuation</span>
              <span className="text-xs font-black text-emerald-700">₹{totalSaleValue.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>
      )}

      {/* Daily Scheduled Low Stock Reminder to Suppliers */}
      {role === 'owner' && lowStockProducts.length > 0 && (
        <div className="p-3 rounded-2xl bg-amber-50/90 border border-amber-200/90 shadow-xs space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center shadow-xs shrink-0">
                <BellRing className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-[11px] text-amber-950 truncate">
                  {tr('Supplier Low Stock Reminder', language)} ({stockAutoConfig.stockTime})
                </h4>
                <p className="text-[10px] text-amber-800 truncate">
                  {lowStockProducts.length} items below reorder level •{' '}
                  {stockAutoConfig.stockAutoEnabled ? 'Auto ON' : 'Manual'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setLowStockTargetSupplierId(undefined);
                setIsLowStockReminderOpen(true);
              }}
              className="px-2.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-[10px] flex items-center gap-1 shadow-xs active:scale-95 transition shrink-0"
            >
              <BellRing className="w-3 h-3" />
              <span>{tr('Low Stock Reminder', language)}</span>
            </button>
          </div>

          <div className="space-y-1.5 pt-1 border-t border-amber-200/60">
            {lowStockProducts.map((lsp) => {
              const supp = findSupplierForProduct(lsp);
              const neededPkts = Math.max(10, lsp.reorderLevel * 2 - lsp.packetStock);
              const poMessage = `Namaste ${supp?.name || 'Wholesale Supplier'}! ${settings.businessName} se Low Stock Reminder: ${lsp.name} (${lsp.sku}) ka stock sirf ${lsp.packetStock} pkts bacha hai (Min: ${lsp.reorderLevel}). Required: ${neededPkts} pkts (${lsp.packSize} pcs/pkt). Please confirm rate & dispatch date.`;
              const phone = supp?.whatsapp || supp?.phone || '9830012345';

              return (
                <div
                  key={lsp.id}
                  className="flex items-center justify-between bg-white/95 p-2 rounded-xl text-xs border border-amber-100 shadow-2xs gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-slate-800 text-[11px] truncate block">
                      {lsp.name}
                    </span>
                    <span className="text-[10px] text-rose-600 font-semibold block truncate">
                      {lsp.packetStock} pkts left (Min: {lsp.reorderLevel}) • {supp?.name || 'Supplier'}
                    </span>
                    {remindedLowStockMap[lsp.id] && (
                      <span className="text-[9px] font-bold text-emerald-700">
                        Reminded via {remindedLowStockMap[lsp.id]} ✓
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <a
                      href={buildWhatsAppHref(phone, poMessage)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => {
                        setRemindedLowStockMap((prev) => ({ ...prev, [lsp.id]: 'WhatsApp' }));
                        logActivity('Low Stock Reminder Sent', `WhatsApp restock reminder to ${supp?.name || 'Supplier'} for ${lsp.name}`);
                        showToast(`WhatsApp reminder opened for ${supp?.name || 'Supplier'}`, 'success');
                      }}
                      className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[9px] flex items-center gap-1 shadow-2xs active:scale-95 transition"
                      title="Send WhatsApp Low Stock Reminder"
                    >
                      <MessageSquare className="w-3 h-3" />
                      <span>WA</span>
                    </a>

                    <a
                      href={buildSmsHref(phone, poMessage)}
                      onClick={() => {
                        setRemindedLowStockMap((prev) => ({ ...prev, [lsp.id]: 'SMS' }));
                        logActivity('Low Stock Reminder Sent', `SMS restock reminder to ${supp?.name || 'Supplier'} for ${lsp.name}`);
                        showToast(`SMS reminder opened for ${supp?.name || 'Supplier'}`, 'success');
                      }}
                      className="px-2 py-1 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold text-[9px] flex items-center gap-1 shadow-2xs active:scale-95 transition"
                      title="Send SMS Low Stock Reminder"
                    >
                      <Smartphone className="w-3 h-3" />
                      <span>SMS</span>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Category & Low Stock Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        {lowStockProducts.length > 0 && (
          <button
            type="button"
            onClick={() => setLowStockOnlyFilter((prev) => !prev)}
            className={`whitespace-nowrap px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 transition border ${
              lowStockOnlyFilter
                ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            <span>
              {tr('Low Stock Only', language)} ({lowStockProducts.length})
            </span>
          </button>
        )}
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCategoryFilter(c)}
            className={`whitespace-nowrap px-2.5 py-1 rounded-full text-[11px] font-bold transition ${
              categoryFilter === c
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white/85 text-slate-600 border border-slate-200/80 hover:bg-slate-100'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Products Grid / Cards */}
      <div className="space-y-3">
        {role === 'customer' ? (
          // Flipkart Wholesale Style Product Cards for Dukani Bhai
          filteredProducts.map((p) => {
            const qty = getProductQty(p.id);
            const piecePrice = (p.sellingPrice / p.packSize).toFixed(1);
            const mrpPrice = Math.round(p.sellingPrice * 1.55);

            return (
              <div
                key={p.id}
                className="bg-white rounded-2xl p-3 border border-slate-200/90 shadow-xs hover:shadow-md transition space-y-2.5"
              >
                <div className="flex gap-2.5">
                  {/* Thumbnail with Wholesale & Discount Tag */}
                  <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-slate-50 shrink-0 border border-slate-100">
                    <img
                      src={p.imageUrl}
                      alt={p.name}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute top-1 left-1 px-1 py-0.5 rounded bg-emerald-600 text-white font-black text-[8px] shadow-xs">
                      35% OFF
                    </span>
                    <span className="absolute bottom-1 left-1 right-1 px-1 py-0.5 rounded bg-slate-900/80 backdrop-blur-xs text-white text-center font-bold text-[8px]">
                      {p.packSize} pcs
                    </span>
                  </div>

                  {/* Product Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-bold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded">
                        {p.brand}
                      </span>
                      <span className="text-[9px] text-slate-400 font-mono truncate">
                        {p.category}
                      </span>
                    </div>

                    <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm mt-0.5 leading-snug line-clamp-2">
                      {p.name}
                    </h4>
                    <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                      Shade/Size: <span className="font-semibold text-slate-700">{p.shadeOrSize}</span>
                    </p>

                    {/* Price Breakdown */}
                    <div className="mt-1 flex flex-wrap items-baseline gap-1.5">
                      <span className="text-sm sm:text-base font-black text-slate-900">
                        ₹{p.sellingPrice}
                      </span>
                      <span className="text-[11px] text-slate-400 line-through">
                        ₹{mrpPrice}
                      </span>
                      <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                        ₹{piecePrice}/pc
                      </span>
                    </div>

                    <div className="mt-0.5 flex items-center gap-1 text-[9px] text-emerald-700 font-medium">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                      <span className="truncate">In Stock • Ships in 24 hrs</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Row: Quantity + Flipkart Dual Action Buttons */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5">
                  {/* Quantity selector */}
                  <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50 p-0.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleUpdateQty(p.id, -1)}
                      className="w-6 h-6 rounded-md bg-white text-slate-700 font-bold text-xs flex items-center justify-center hover:bg-slate-100 active:scale-95 shadow-2xs"
                    >
                      -
                    </button>
                    <span className="w-7 text-center text-[11px] font-bold text-slate-800">
                      {qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleUpdateQty(p.id, 1)}
                      className="w-6 h-6 rounded-md bg-white text-slate-700 font-bold text-xs flex items-center justify-center hover:bg-slate-100 active:scale-95 shadow-2xs"
                    >
                      +
                    </button>
                  </div>

                  {/* Add to Cart Button */}
                  <div className="flex items-center flex-1">
                    <button
                      type="button"
                      onClick={() => handleAddToCart(p, qty)}
                      className="w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 transition whitespace-nowrap"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      <span>
                        {t.addCart}
                        {cart[p.id] ? ` (${cart[p.id]})` : ''}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        ) : role === 'supplier' ? (
          // Supplier Portal: Strictly THIS Supplier's Products Only
          filteredProducts.length === 0 ? (
            <div className="p-6 text-center bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <Package className="w-8 h-8 text-slate-300 mx-auto" />
              <h4 className="font-bold text-xs text-slate-800">No Sourced Products Found</h4>
              <p className="text-[11px] text-slate-500">
                No products currently mapped under {loggedInSupplier.name}.
              </p>
            </div>
          ) : (
            filteredProducts.map((p) => {
              const poMsg = `Namaste Shuvam bhai! ${loggedInSupplier.name} se quotation & stock update: ${p.name} (${p.sku}). Current Nuapatna Hub stock: ${p.packetStock} pkts. Landed Sourced rate: ₹${p.purchaseCost}/pkt.`;
              return (
                <div
                  key={p.id}
                  className="bg-white rounded-2xl p-3 border border-slate-100 shadow-xs hover:shadow-md transition space-y-2"
                >
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex gap-2.5 min-w-0">
                      <img
                        src={p.imageUrl}
                        alt={p.name}
                        className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl object-cover bg-slate-100 shrink-0 border border-slate-100/90"
                      />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-mono text-[10px] font-semibold text-slate-400 tracking-wider uppercase">
                            {p.sku}
                          </span>
                          {(p.isLowStock || p.packetStock <= p.reorderLevel) && (
                            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-rose-50 text-rose-600 border border-rose-100">
                              Low ({p.packetStock})
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-slate-900 text-xs sm:text-sm leading-snug mt-0.5 line-clamp-1">
                          {p.name}
                        </h3>
                        <p className="text-[10px] text-slate-500 font-medium mt-0.5 truncate">
                          {p.brand} • {p.packSize} pcs • {p.shadeOrSize}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-base sm:text-lg font-black text-slate-900 block leading-tight">
                        ₹{p.sellingPrice}
                      </span>
                      <span className="text-[9px] text-slate-400 font-medium block">
                        / packet
                      </span>
                      <span className="text-[9px] text-emerald-700 font-bold block">
                        Sourced @ ₹{p.purchaseCost}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-[11px]">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800">
                        {p.packetStock} pkts <span className="text-slate-500 font-normal">({p.piecesStock})</span>
                      </span>
                      <span className="text-[10px] font-bold text-emerald-600">
                        {p.marginPercent}%
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <a
                        href={`https://wa.me/91${(settings.ownerPhone || '9861023456').replace(/\D/g, '')}?text=${encodeURIComponent(poMsg)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-bold transition active:scale-95 border border-emerald-200"
                      >
                        Quotation
                      </a>
                      <button
                        onClick={() => {
                          setSelectedProduct(p);
                          setIsAdjustingStock(true);
                        }}
                        className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold transition active:scale-95 shadow-2xs"
                      >
                        Adjust Stock
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )
        ) : (
          // Owner Organized Inventory Grid with Out-of-Stock Tracking, Zone/Shelf & Auto WA/Reorder Actions
          filteredProducts.map((p) => {
            const isOutOfStock = p.packetStock <= 0;
            const isLow = !isOutOfStock && (p.isLowStock || p.packetStock <= p.reorderLevel);
            const zoneLabel = p.warehouseZone || inferWarehouseZone(p.category);
            const shelfLabel = p.shelfCode || `R${(p.id.charCodeAt(p.id.length - 1) % 4) + 1}-S1`;
            const soldPkts = soldQtyByProductId.get(p.id) || 0;
            const suggestedReorder = Math.max(10, p.reorderLevel * 2 - p.packetStock);

            return (
              <div
                key={p.id}
                className={`bg-white rounded-2xl p-3 border shadow-xs hover:shadow-md transition space-y-2 ${
                  isOutOfStock ? 'border-rose-300 bg-rose-50/20' : isLow ? 'border-amber-200' : 'border-slate-100'
                }`}
              >
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex gap-2.5 min-w-0">
                    <img
                      src={p.imageUrl}
                      alt={p.name}
                      className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl object-cover bg-slate-100 shrink-0 border border-slate-100/90"
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono text-[10px] font-semibold text-slate-400 tracking-wider uppercase">
                          {p.sku}
                        </span>
                        {isOutOfStock ? (
                          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-rose-600 text-white uppercase">
                            OUT OF STOCK (0)
                          </span>
                        ) : isLow ? (
                          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                            Low ({p.packetStock}/{p.reorderLevel})
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            In Stock
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-slate-900 text-xs sm:text-sm leading-snug mt-0.5 line-clamp-1">
                        {p.name}
                      </h3>
                      <p className="text-[10px] text-slate-500 font-medium mt-0.5 truncate">
                        {p.brand} • {p.packSize} pcs • {zoneLabel} ({shelfLabel})
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 text-[9px] font-bold text-slate-500">
                        <span>Sold: <strong className="text-indigo-700">{soldPkts} pkts</strong></span>
                        <span>•</span>
                        <span>Exp: {p.expiryDate}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-base sm:text-lg font-black text-slate-900 block leading-tight">
                      ₹{p.sellingPrice}
                    </span>
                    <span className="text-[9px] text-slate-400 font-medium block">
                      per packet
                    </span>
                  </div>
                </div>

                {/* Stock Level Bar + Org, Auto WA Alert, Auto-Reorder & Adjust Stock Row */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-[11px] flex-wrap">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`font-bold truncate ${isOutOfStock ? 'text-rose-700' : 'text-slate-800'}`}>
                      {p.packetStock} pkts <span className="text-slate-500 font-normal">({p.piecesStock} pcs)</span>
                    </span>
                    <span className="text-[10px] font-bold text-emerald-600 shrink-0">
                      {p.marginPercent}% margin
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                    {(isOutOfStock || isLow) && (
                      <>
                        <button
                          type="button"
                          disabled={sendingWaId === p.id}
                          onClick={async () => {
                            setSendingWaId(p.id);
                            try {
                              await sendDealerLowStockAlert(p, {
                                suggestedReorderPackets: suggestedReorder,
                                triggerType: 'Manual',
                              });
                            } finally {
                              setSendingWaId(null);
                            }
                          }}
                          className="px-2 py-1 rounded-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-[10px] font-bold flex items-center gap-1 transition active:scale-95"
                          title="Send Automated WhatsApp Restock Alert to Dealer"
                        >
                          <Send className="w-3 h-3" />
                          <span>{sendingWaId === p.id ? 'Alerting...' : 'WA Alert'}</span>
                        </button>
                        <button
                          type="button"
                          disabled={reorderingProdId === p.id}
                          onClick={async () => {
                            setReorderingProdId(p.id);
                            try {
                              await autoReorderProduct(p, suggestedReorder, {
                                sendWhatsAppAlert: true,
                                triggerType: 'Manual',
                              });
                            } finally {
                              setReorderingProdId(null);
                            }
                          }}
                          className="px-2 py-1 rounded-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-[10px] font-bold flex items-center gap-1 transition active:scale-95"
                          title="Auto-create Supplier PO & alert dealer"
                        >
                          <Zap className="w-3 h-3" />
                          <span>{reorderingProdId === p.id ? 'PO...' : `Reorder ${suggestedReorder}`}</span>
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => openOrganizationModal(p)}
                      className="px-2 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center gap-1 transition active:scale-95"
                      title="Organize Warehouse Zone, Shelf & Reorder Threshold"
                    >
                      <SlidersHorizontal className="w-3 h-3" />
                      <span>Zone</span>
                    </button>
                    <button
                      onClick={() => {
                        setSelectedProduct(p);
                        setIsAdjustingStock(true);
                      }}
                      className="px-2.5 py-1 rounded-full bg-slate-900 hover:bg-black text-white text-[10px] font-bold transition active:scale-95 shadow-2xs"
                    >
                      {tr('Adjust Stock', language)}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
        </>
      )}

      {/* Barcode scanner overlay simulation */}
      {isScanningBarcode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 text-center max-w-xs w-full shadow-2xl animate-pulse">
            <QrCode className="w-16 h-16 text-sky-600 mx-auto mb-3" />
            <h3 className="font-bold text-slate-900 text-base">Scanning Barcode...</h3>
            <p className="text-xs text-slate-500 mt-1">Point camera at product carton or packet</p>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {isAddingProduct && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-t-3xl p-5 shadow-2xl border-t border-slate-100 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <h3 className="font-bold text-slate-900 text-base">{tr('Add New Cosmetic Product', language)}</h3>
              <button
                onClick={() => {
                  setIsAddingProduct(false);
                  onCloseNewProductDirect?.();
                }}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">Product Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Matte Longstay Lipstick (Shade 04)"
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-white border border-slate-200 text-xs text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Brand</label>
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs"
                  >
                    {categories.filter((c) => c !== 'All').map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Wholesale rule: Full packets 6 or 12 pcs */}
              <div className="p-2.5 rounded-xl bg-sky-50 border border-sky-200">
                <label className="text-[11px] font-bold text-sky-900 mb-1.5 block">
                  Wholesale Pack Size (6 or 12 pcs)
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPackSize(6)}
                    className={`py-1.5 rounded-lg text-[11px] font-bold border transition ${
                      packSize === 6 ? 'bg-sky-600 text-white border-sky-600 shadow-xs' : 'bg-white text-slate-700'
                    }`}
                  >
                    6 Pcs / Packet
                  </button>
                  <button
                    type="button"
                    onClick={() => setPackSize(12)}
                    className={`py-1.5 rounded-lg text-[11px] font-bold border transition ${
                      packSize === 12 ? 'bg-sky-600 text-white border-sky-600 shadow-xs' : 'bg-white text-slate-700'
                    }`}
                  >
                    12 Pcs / Packet
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Initial Packets</label>
                  <input
                    type="number"
                    min="1"
                    value={packetStock}
                    onChange={(e) => setPacketStock(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Reorder Level (pkts)</label>
                  <input
                    type="number"
                    min="0"
                    value={reorderLevel}
                    onChange={(e) => setReorderLevel(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Warehouse Zone</label>
                  <select
                    value={newWarehouseZone}
                    onChange={(e) => setNewWarehouseZone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs"
                  >
                    {WAREHOUSE_ZONES.filter((z) => z !== 'All Zones').map((z) => (
                      <option key={z} value={z}>{z}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Rack / Shelf Code</label>
                  <input
                    type="text"
                    value={newShelfCode}
                    onChange={(e) => setNewShelfCode(e.target.value)}
                    placeholder="e.g. R1-S2"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs"
                  />
                </div>
              </div>

              {/* Landed Cost Calculator Fields */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="text-xs font-bold text-slate-700 block">Landed Cost & Margin Calculator</span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500 block">Purchase Cost / Pkt</label>
                    <input
                      type="number"
                      value={purchaseCost}
                      onChange={(e) => setPurchaseCost(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block">Selling Price / Pkt</label>
                    <input
                      type="number"
                      value={sellingPrice}
                      onChange={(e) => setSellingPrice(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 text-white font-bold text-sm shadow-md active:scale-98 transition"
              >
                {tr('Save Product', language)}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Adjust Stock Modal */}
      {isAdjustingStock && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl">
            <h3 className="font-bold text-slate-900 text-base mb-1">{tr('Adjust Stock', language)}</h3>
            <p className="text-xs text-slate-500 mb-3">{selectedProduct.name}</p>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                type="button"
                onClick={() => setAdjustType('in')}
                className={`py-2 rounded-xl text-xs font-bold border transition ${
                  adjustType === 'in' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-50'
                }`}
              >
                + Stock In
              </button>
              <button
                type="button"
                onClick={() => setAdjustType('out')}
                className={`py-2 rounded-xl text-xs font-bold border transition ${
                  adjustType === 'out' ? 'bg-rose-600 text-white border-rose-600' : 'bg-slate-50'
                }`}
              >
                - Stock Out / Damage
              </button>
            </div>

            <div className="mb-3">
              <label className="text-xs font-bold text-slate-600 mb-1 block">Quantity (Packets)</label>
              <input
                type="number"
                min="1"
                value={adjustDelta}
                onChange={(e) => setAdjustDelta(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs"
              />
            </div>

            <div className="mb-4">
              <label className="text-xs font-bold text-slate-600 mb-1 block">Reason</label>
              <input
                type="text"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="e.g. Broken in shipment, Supplier consignment"
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setIsAdjustingStock(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs"
              >
                {tr('Cancel', language)}
              </button>
              <button
                onClick={handleApplyAdjustment}
                className="flex-1 py-2.5 rounded-xl bg-sky-600 text-white font-bold text-xs shadow-md"
              >
                {tr('Apply', language)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Organization Modal (Warehouse Zone, Shelf, Reorder Level & Dealer Mapping) */}
      {orgEditProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <h3 className="font-bold text-slate-900 text-sm">Organize Inventory Location</h3>
                <p className="text-[11px] text-slate-500 truncate">{orgEditProduct.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setOrgEditProduct(null)}
                className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 mb-1 block">Warehouse Zone</label>
              <select
                value={orgZone}
                onChange={(e) => setOrgZone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs"
              >
                {WAREHOUSE_ZONES.filter((z) => z !== 'All Zones').map((z) => (
                  <option key={z} value={z}>{z}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">Shelf / Rack Code</label>
                <input
                  type="text"
                  value={orgShelf}
                  onChange={(e) => setOrgShelf(e.target.value)}
                  placeholder="R1-S2"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">Low Stock Threshold</label>
                <input
                  type="number"
                  min={0}
                  value={orgReorder}
                  onChange={(e) => setOrgReorder(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 mb-1 block">Assigned Dealer (For Auto WA Alerts)</label>
              <select
                value={orgSupplierId}
                onChange={(e) => setOrgSupplierId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs"
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.whatsapp || s.phone})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setOrgEditProduct(null)}
                className="flex-1 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveOrganization}
                className="flex-1 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs"
              >
                Save Organization
              </button>
            </div>
          </div>
        </div>
      )}

      <ReminderDispatcherModal
        isOpen={isLowStockReminderOpen}
        onClose={() => {
          setIsLowStockReminderOpen(false);
          setLowStockTargetSupplierId(undefined);
        }}
        mode="supplier_low_stock"
        initialTargetId={lowStockTargetSupplierId}
      />
    </div>
  );
};
