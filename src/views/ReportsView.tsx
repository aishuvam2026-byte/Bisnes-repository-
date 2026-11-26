import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { tr } from '../data/translations';
import {
  BarChart3,
  Download,
  TrendingUp,
  Package,
  Layers,
  AlertTriangle,
  Truck,
  Receipt,
  Building2,
  CheckCircle2,
  MessageSquare,
  Clock,
  Zap,
  BellRing,
  Filter,
  RotateCcw,
} from 'lucide-react';
import { YearMonthFilterModal } from '../components/YearMonthFilterModal';
import { DigitalInventoryPanel } from '../components/DigitalInventoryPanel';
import { DispatchDeliveryOverviewTable } from '../components/DispatchDeliveryOverviewTable';

type ReportSectionId =
  | 'all'
  | 'valuation'
  | 'analytics'
  | 'lowstock'
  | 'pnl'
  | 'dispatch'
  | 'udhaar'
  | 'suppliers';

export const ReportsView: React.FC = () => {
  const {
    role,
    user,
    language,
    orders,
    products,
    expenses,
    customers,
    suppliers,
    supplierOrders,
    selectedYear,
    selectedMonth,
    exportAllDataCsv,
    whatsappAlerts,
    autoWhatsAppAlertEnabled,
    sendDealerLowStockAlert,
  } = useApp();

  const [activeReportTab, setActiveReportTab] = useState<ReportSectionId>('all');
  const [analyticsSubView, setAnalyticsSubView] = useState<'both' | 'category' | 'products'>('both');
  const [analyticsPeriodFilter, setAnalyticsPeriodFilter] = useState<'all' | 'today' | '7days' | 'month' | 'year'>('all');
  const [analyticsStatusFilter, setAnalyticsStatusFilter] = useState<'all' | 'Order Confirm' | 'Dispatch' | 'Dispatched' | 'Delivered'>('all');
  const [analyticsCategoryFilter, setAnalyticsCategoryFilter] = useState<string>('all');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [selectedSupplierFilter, setSelectedSupplierFilter] = useState<string>('all');
  const [showLowStockAutoWa, setShowLowStockAutoWa] = useState(false);
  const [sendingWaProductId, setSendingWaProductId] = useState<string | null>(null);

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Logged-in supplier detection
  const activeSupplierId = user?.supplierId || 'sup-1';
  const loggedInSupplier = suppliers.find((s) => s.id === activeSupplierId) || suppliers[0];

  // Effective supplier for scoping products
  const currentSupplierId =
    role === 'supplier'
      ? activeSupplierId
      : selectedSupplierFilter !== 'all'
      ? selectedSupplierFilter
      : null;

  const currentSupplierObj = suppliers.find((s) => s.id === currentSupplierId);

  // Scoped products based on supplier
  const scopedProducts = currentSupplierId
    ? products.filter(
        (p) =>
          p.supplierId === currentSupplierId ||
          (p.brand && currentSupplierObj?.brands?.includes(p.brand))
      )
    : products;

  // Total financial metrics (Global or Scoped)
  const totalSales = orders.reduce((sum, o) => sum + o.totalAmount, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalAdvanceCollected = orders.reduce((sum, o) => sum + o.advanceAmount, 0);
  const totalBalanceDue = orders.reduce((sum, o) => sum + o.balanceAmount, 0);

  // Scoped Inventory Valuation metrics
  const scopedInventoryCost = scopedProducts.reduce((sum, p) => sum + p.packetStock * p.purchaseCost, 0);
  const scopedInventorySale = scopedProducts.reduce((sum, p) => sum + p.packetStock * p.sellingPrice, 0);
  const scopedTotalPackets = scopedProducts.reduce((sum, p) => sum + p.packetStock, 0);
  const scopedTotalPieces = scopedProducts.reduce((sum, p) => sum + p.piecesStock, 0);
  const scopedGrossMargin = scopedInventorySale - scopedInventoryCost;

  // Global Inventory Metrics
  const totalInventoryCost = products.reduce((sum, p) => sum + p.packetStock * p.purchaseCost, 0);
  const totalInventorySale = products.reduce((sum, p) => sum + p.packetStock * p.sellingPrice, 0);

  const estimatedCost = totalSales * 0.65; // ~35% average gross margin
  const grossProfit = totalSales - estimatedCost;
  const netProfit = grossProfit - totalExpenses;

  // Low stock products calculation scoped to current view
  const scopedLowStockProducts = scopedProducts.filter(
    (p) => p.isLowStock || p.packetStock <= p.reorderLevel
  );

  // Wholesale Analysis — Real Order Sales Filtered by Period, Status, Supplier & Category
  const SIMULATED_TODAY = '2026-11-09';
  const liveTodayPrefix = new Date().toISOString().slice(0, 10);
  const refDateMs = new Date(`${SIMULATED_TODAY}T23:59:59Z`).getTime();
  const liveDateMs = new Date().getTime();

  const matchesAnalyticsPeriod = (dateStr?: string) => {
    if (analyticsPeriodFilter === 'all') return true;
    if (!dateStr) return false;
    const prefix = dateStr.slice(0, 10);
    if (analyticsPeriodFilter === 'today') {
      return prefix === liveTodayPrefix || prefix === SIMULATED_TODAY;
    }
    if (analyticsPeriodFilter === '7days') {
      const ts = new Date(dateStr).getTime();
      if (Number.isNaN(ts)) return false;
      const diffSim = (refDateMs - ts) / (1000 * 60 * 60 * 24);
      const diffLive = (liveDateMs - ts) / (1000 * 60 * 60 * 24);
      return (diffSim >= -2 && diffSim <= 7) || (diffLive >= -1 && diffLive <= 7);
    }
    if (analyticsPeriodFilter === 'month') {
      return prefix.startsWith(liveTodayPrefix.slice(0, 7)) || prefix.startsWith(SIMULATED_TODAY.slice(0, 7));
    }
    if (analyticsPeriodFilter === 'year') {
      return prefix.startsWith(String(selectedYear)) || prefix.startsWith(liveTodayPrefix.slice(0, 4));
    }
    return true;
  };

  const matchesAnalyticsStatus = (status: string) => {
    if (status === 'Cancelled' || status === 'Returned') return false;
    if (analyticsStatusFilter === 'all') return true;
    if (analyticsStatusFilter === 'Order Confirm') {
      return (
        status === 'Booked' ||
        status === 'Advance Pending' ||
        status === 'Enquiry' ||
        status === 'On Hold' ||
        status === 'Reschedule'
      );
    }
    if (analyticsStatusFilter === 'Dispatch') return status === 'Packed';
    if (analyticsStatusFilter === 'Dispatched') return status === 'Dispatched';
    if (analyticsStatusFilter === 'Delivered') return status === 'Delivered';
    return true;
  };

  const productById = new Map(products.map((p) => [p.id, p]));
  const scopedProductIds = new Set(scopedProducts.map((p) => p.id));
  const allWholesaleCategories = Array.from(new Set(scopedProducts.map((p) => p.category))).sort();

  const analyticsFilteredOrders = orders.filter(
    (o) => matchesAnalyticsPeriod(o.createdAt) && matchesAnalyticsStatus(o.status)
  );

  interface CategorySaleAccumulator {
    cat: string;
    packetsSold: number;
    piecesSold: number;
    amount: number;
    costAmount: number;
    orderIds: Set<string>;
    productIds: Set<string>;
    productBreakdown: Map<
      string,
      {
        productId: string;
        name: string;
        sku: string;
        packetsSold: number;
        piecesSold: number;
        sales: number;
        orderIds: Set<string>;
      }
    >;
  }

  const categorySalesMap = new Map<string, CategorySaleAccumulator>();
  const productSalesMap = new Map<
    string,
    {
      productId: string;
      name: string;
      sku: string;
      category: string;
      supplier: string;
      packetsSold: number;
      piecesSold: number;
      sales: number;
      cost: number;
      marginPercent: number;
      orderIds: Set<string>;
    }
  >();
  const matchedOrderIds = new Set<string>();

  analyticsFilteredOrders.forEach((ord) => {
    (ord.items || []).forEach((item) => {
      const prod = productById.get(item.productId);
      if (currentSupplierId && !scopedProductIds.has(item.productId)) return;

      const cat = prod?.category || 'Other Cosmetics';
      if (analyticsCategoryFilter !== 'all' && cat !== analyticsCategoryFilter) return;

      matchedOrderIds.add(ord.id);
      const pkts = Number(item.packetQty || 0);
      const pcs = Number(item.totalPieces || pkts * (item.packSize || prod?.packSize || 12));
      const lineSale = Number(item.totalPrice || pkts * (item.unitPricePerPacket || prod?.sellingPrice || 0));
      const unitCost = prod?.purchaseCost ?? Math.round((item.unitPricePerPacket || 0) * 0.72);
      const lineCost = pkts * unitCost;

      let catAcc = categorySalesMap.get(cat);
      if (!catAcc) {
        catAcc = {
          cat,
          packetsSold: 0,
          piecesSold: 0,
          amount: 0,
          costAmount: 0,
          orderIds: new Set<string>(),
          productIds: new Set<string>(),
          productBreakdown: new Map(),
        };
        categorySalesMap.set(cat, catAcc);
      }

      catAcc.packetsSold += pkts;
      catAcc.piecesSold += pcs;
      catAcc.amount += lineSale;
      catAcc.costAmount += lineCost;
      catAcc.orderIds.add(ord.id);
      catAcc.productIds.add(item.productId);

      const existingCatProd = catAcc.productBreakdown.get(item.productId) || {
        productId: item.productId,
        name: prod?.name || item.productName,
        sku: prod?.sku || item.productId,
        packetsSold: 0,
        piecesSold: 0,
        sales: 0,
        orderIds: new Set<string>(),
      };
      existingCatProd.packetsSold += pkts;
      existingCatProd.piecesSold += pcs;
      existingCatProd.sales += lineSale;
      existingCatProd.orderIds.add(ord.id);
      catAcc.productBreakdown.set(item.productId, existingCatProd);

      const existingProd = productSalesMap.get(item.productId) || {
        productId: item.productId,
        name: prod?.name || item.productName,
        sku: prod?.sku || item.productId,
        category: cat,
        supplier: prod?.supplierName || currentSupplierObj?.name || 'Authorized C&F',
        packetsSold: 0,
        piecesSold: 0,
        sales: 0,
        cost: 0,
        marginPercent: prod?.marginPercent ?? 30,
        orderIds: new Set<string>(),
      };
      existingProd.packetsSold += pkts;
      existingProd.piecesSold += pcs;
      existingProd.sales += lineSale;
      existingProd.cost += lineCost;
      existingProd.orderIds.add(ord.id);
      productSalesMap.set(item.productId, existingProd);
    });
  });

  const filteredWholesaleSalesTotal = Array.from(categorySalesMap.values()).reduce(
    (sum, c) => sum + c.amount,
    0
  );
  const filteredTotalPacketsSold = Array.from(categorySalesMap.values()).reduce(
    (sum, c) => sum + c.packetsSold,
    0
  );
  const filteredTotalPiecesSold = Array.from(categorySalesMap.values()).reduce(
    (sum, c) => sum + c.piecesSold,
    0
  );

  const dynamicCategoryStats = Array.from(categorySalesMap.values())
    .sort((a, b) => b.packetsSold - a.packetsSold || b.amount - a.amount)
    .map((c) => {
      const sharePct =
        filteredWholesaleSalesTotal > 0
          ? Math.round((c.amount / filteredWholesaleSalesTotal) * 100)
          : 0;
      const marginVal =
        c.amount > 0 ? (((c.amount - c.costAmount) / c.amount) * 100).toFixed(1) : '0.0';
      return {
        cat: c.cat,
        packetsSold: c.packetsSold,
        piecesSold: c.piecesSold,
        uniqueProductsCount: c.productIds.size,
        amount: c.amount,
        costAmount: c.costAmount,
        pct: Math.min(100, Math.max(sharePct > 0 ? 6 : 0, sharePct)),
        sharePct,
        ordersCount: c.orderIds.size,
        margin: `${marginVal}%`,
        productsSold: Array.from(c.productBreakdown.values()).sort(
          (a, b) => b.packetsSold - a.packetsSold
        ),
      };
    });

  const dynamicTopProducts = Array.from(productSalesMap.values())
    .sort((a, b) => b.packetsSold - a.packetsSold || b.sales - a.sales)
    .slice(0, 8)
    .map((p, idx) => ({
      rank: idx + 1,
      productId: p.productId,
      name: p.name,
      sku: p.sku,
      category: p.category,
      sales: p.sales,
      packetsSold: p.packetsSold,
      piecesSold: p.piecesSold,
      ordersCount: p.orderIds.size,
      margin: `${
        p.sales > 0 ? (((p.sales - p.cost) / p.sales) * 100).toFixed(1) : p.marginPercent
      }%`,
      supplier: p.supplier,
    }));

  const hasActiveAnalyticsFilter =
    analyticsPeriodFilter !== 'all' ||
    analyticsStatusFilter !== 'all' ||
    analyticsCategoryFilter !== 'all';

  const resetAnalyticsFilters = () => {
    setAnalyticsPeriodFilter('all');
    setAnalyticsStatusFilter('all');
    setAnalyticsCategoryFilter('all');
  };

  // Udhaar & Khata analytics
  const totalMarketUdhaar = customers.reduce((sum, c) => sum + (c.pendingUdhaar || 0), 0);
  const shopsWithUdhaar = customers.filter((c) => (c.pendingUdhaar || 0) > 0);

  // Supplier dues analytics
  const totalSupplierDues = suppliers.reduce((sum, s) => sum + (s.pendingDues || s.dueAmount || 0), 0);
  const totalSupplierPurchases = suppliers.reduce((sum, s) => sum + (s.totalPurchases || 0), 0);

  // Horizontal scroll bar tabs based on role
  const reportTabs: Array<{ id: ReportSectionId; label: string; icon: any; count?: number; badge?: string }> =
    role === 'supplier'
      ? [
          { id: 'all', label: 'All Reports', icon: BarChart3 },
          { id: 'valuation', label: 'My Inventory Valuation', icon: Package, badge: 'Valuation' },
          { id: 'lowstock', label: 'Low Stock Track Report', icon: AlertTriangle, count: scopedLowStockProducts.length },
          { id: 'analytics', label: 'Wholesale Analytics (Both Tables)', icon: TrendingUp },
          { id: 'suppliers', label: 'Owner POs & Consignments', icon: Building2 },
          { id: 'udhaar', label: 'Payment Khata & Dues', icon: Clock },
        ]
      : [
          { id: 'all', label: 'All Reports', icon: BarChart3 },
          { id: 'valuation', label: 'Inventory Valuation Report', icon: Package, badge: 'Valuation' },
          { id: 'analytics', label: 'Wholesale Analytics (Both Tables)', icon: TrendingUp, badge: 'Unified' },
          { id: 'lowstock', label: 'Low Stock Track Report', icon: AlertTriangle, count: scopedLowStockProducts.length },
          { id: 'pnl', label: 'P&L Financials', icon: Receipt },
          { id: 'dispatch', label: 'Dispatches & Delivery', icon: Truck, count: orders.length },
          { id: 'udhaar', label: 'Khata & Udhaar Dues', icon: Clock, count: shopsWithUdhaar.length },
          { id: 'suppliers', label: 'Supplier Sourcing & Dues', icon: Building2 },
        ];

  const handleSendSupplierRestockPO = (prod: (typeof products)[0]) => {
    const supp = suppliers.find((s) => s.id === prod.supplierId || s.name === prod.supplierName) || suppliers[0];
    const reorderQty = Math.max(10, prod.reorderLevel * 2);
    const msg = `*URGENT RESTOCK PURCHASE ORDER - RUPAM WHOLESALE NUAPATNA*
To: ${supp?.name || 'Wholesale Supplier'}
Attn: ${supp?.contactPerson || 'Sales Desk'}

Item: *${prod.name}*
SKU: ${prod.sku}
Pack Size: ${prod.packSize} pcs/packet
Current Nuapatna Stock: ${prod.packetStock} pkts (Below Reorder: ${prod.reorderLevel})
*Required Order Qty: ${reorderQty} packets (${reorderQty * prod.packSize} pcs)*

Please confirm current batch availability, landed quotation, and dispatch schedule via Kolkata/Nuapatna transport.`;
    window.open(`https://wa.me/91${(supp?.whatsapp || supp?.phone || '9830012345').replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleSendSupplierQuoteToOwner = (prod: (typeof products)[0]) => {
    const msg = `Namaste Shuvam bhai! ${loggedInSupplier.name} se stock & quotation update:
Product: ${prod.name} (${prod.sku})
Current Hub Stock: ${prod.packetStock} pkts
Pack Size: ${prod.packSize} pcs/pkt
Landed Sourced Cost: ₹${prod.purchaseCost}/pkt
Hub Wholesale Rate: ₹${prod.sellingPrice}/pkt

Next consignment can be dispatched within 48 hours. Please confirm required packet quantity.`;
    window.open(`https://wa.me/919861023456?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="space-y-3 pb-24">
      {/* 1. Header with Period Filter & CSV Export */}
      <div className="glass-card rounded-2xl sm:rounded-3xl p-3 sm:p-4 border border-white/90 shadow-md flex items-center justify-between gap-2">
        <div className="min-w-0">
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block truncate">
            {role === 'supplier' ? `${loggedInSupplier.name} Intelligence` : 'Executive Intelligence & Reports'}
          </span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <h2 className="text-sm sm:text-lg font-bold text-slate-900">
              {selectedYear} {selectedMonth !== null ? `• ${months[selectedMonth]}` : '• Full Year'}
            </h2>
            <button
              onClick={() => setIsFilterModalOpen(true)}
              className="text-[11px] text-sky-600 font-bold bg-sky-50 px-1.5 py-0.5 rounded-lg border border-sky-200 hover:bg-sky-100 transition active:scale-95"
            >
              {tr('Change', language)}
            </button>
          </div>
        </div>

        <button
          onClick={exportAllDataCsv}
          className="px-2.5 sm:px-3.5 py-2 rounded-xl sm:rounded-2xl bg-slate-900 hover:bg-black text-white font-bold text-[11px] sm:text-xs flex items-center gap-1 shadow-md active:scale-95 transition shrink-0"
        >
          <Download className="w-3.5 h-3.5" />
          <span>{tr('Export CSV', language)}</span>
        </button>
      </div>

      {/* Supplier Scoping Banner / Selector for Owner */}
      {role === 'owner' ? (
        <div className="glass-card rounded-2xl sm:rounded-3xl p-2.5 sm:p-3 border border-slate-200/80 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between px-0.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Building2 className="w-3 h-3 text-slate-600" />
              <span>Supplier Valuation Filter</span>
            </span>
            {selectedSupplierFilter !== 'all' && (
              <button
                onClick={() => setSelectedSupplierFilter('all')}
                className="text-[10px] font-bold text-sky-600 hover:underline"
              >
                {tr('Reset', language)}
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            <button
              onClick={() => setSelectedSupplierFilter('all')}
              className={`whitespace-nowrap px-2.5 py-1 rounded-xl text-[11px] font-bold transition active:scale-95 ${
                selectedSupplierFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200/80 hover:bg-slate-50'
              }`}
            >
              All Hub ({products.length})
            </button>
            {suppliers.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedSupplierFilter(s.id)}
                className={`whitespace-nowrap px-2.5 py-1 rounded-xl text-[11px] font-bold transition active:scale-95 ${
                  selectedSupplierFilter === s.id
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-200/80 hover:bg-slate-50'
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>
      ) : (
        /* Supplier Portal Active Notice */
        <div className="glass-card rounded-2xl sm:rounded-3xl p-3 border border-emerald-200/90 bg-gradient-to-r from-emerald-50/80 to-teal-50/50 shadow-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <div className="min-w-0">
              <h4 className="font-bold text-xs text-emerald-950 truncate">
                {loggedInSupplier.name} ({loggedInSupplier.city || 'Burrabazar'})
              </h4>
              <p className="text-[10px] text-emerald-800 line-clamp-1">
                Inventory valuation & analytics strictly for your supplied products.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
            {scopedProducts.length} Items
          </span>
        </div>
      )}

      {/* 2. Horizontal Scroll Bar for All Report Sections */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        {reportTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeReportTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveReportTab(tab.id)}
              className={`whitespace-nowrap px-2.5 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1 transition shrink-0 active:scale-95 ${
                isActive
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white/90 text-slate-700 border border-slate-200/90 hover:bg-slate-100'
              }`}
            >
              <Icon className={`w-3 h-3 ${isActive ? 'text-sky-400' : 'text-slate-500'}`} />
              <span>{tr(tab.label, language)}</span>
              {tab.count !== undefined && (
                <span
                  className={`px-1 py-0.2 rounded-full text-[9px] font-black ${
                    tab.id === 'lowstock' && tab.count > 0
                      ? 'bg-rose-500 text-white'
                      : isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {tab.count}
                </span>
              )}
              {tab.badge && (
                <span className="px-1 py-0.2 rounded-full text-[9px] font-bold bg-sky-100 text-sky-800">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 3. Section: Supplier Inventory Valuation Board (Scoped strictly to supplier's products) */}
      {(activeReportTab === 'all' || activeReportTab === 'valuation') && (
        <div className="glass-card rounded-2xl sm:rounded-3xl p-3 sm:p-4 border border-emerald-200/90 shadow-md space-y-3 relative overflow-hidden bg-white/95">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500" />

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pt-1 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
                <Package className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-1.5 flex-wrap">
                  <span className="truncate">
                    {role === 'supplier'
                      ? `${loggedInSupplier.name} Valuation`
                      : currentSupplierObj
                      ? `${currentSupplierObj.name} Valuation`
                      : 'Hub Inventory Valuation Report'}
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold border border-emerald-200 shrink-0">
                    {scopedProducts.length} Items
                  </span>
                </h3>
                <p className="text-[10px] sm:text-xs text-slate-500 truncate">
                  Purchase cost, wholesale valuation & live stock positions
                </p>
              </div>
            </div>

            <div className="text-left sm:text-right self-start sm:self-auto">
              <span className="text-[9px] text-slate-400 font-bold uppercase block">Total Hub Packets</span>
              <span className="text-xs font-extrabold text-slate-900">
                {scopedTotalPackets} pkts <span className="text-slate-500 font-medium">({scopedTotalPieces} pcs)</span>
              </span>
            </div>
          </div>

          {/* 4 Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="p-2.5 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">
                Sourced Cost Value
              </span>
              <span className="text-sm sm:text-base font-black text-slate-900 block mt-0.5">
                ₹{scopedInventoryCost.toLocaleString('en-IN')}
              </span>
              <span className="text-[9px] text-slate-500 font-medium block mt-0.5">Landed Purchase Cost</span>
            </div>

            <div className="p-2.5 rounded-xl sm:rounded-2xl bg-emerald-50 border border-emerald-200">
              <span className="text-[9px] font-bold text-emerald-800 uppercase tracking-wider block">
                Hub Sale Valuation
              </span>
              <span className="text-sm sm:text-base font-black text-emerald-700 block mt-0.5">
                ₹{scopedInventorySale.toLocaleString('en-IN')}
              </span>
              <span className="text-[9px] text-emerald-600 font-medium block mt-0.5">Wholesale Selling Value</span>
            </div>

            <div className="p-2.5 rounded-xl sm:rounded-2xl bg-teal-50 border border-teal-200">
              <span className="text-[9px] font-bold text-teal-800 uppercase tracking-wider block">
                Gross Margin Value
              </span>
              <span className="text-sm sm:text-base font-black text-teal-700 block mt-0.5">
                ₹{scopedGrossMargin.toLocaleString('en-IN')}
              </span>
              <span className="text-[9px] text-teal-600 font-semibold block mt-0.5">~35.2% Margin</span>
            </div>

            <div className="p-2.5 rounded-xl sm:rounded-2xl bg-rose-50 border border-rose-200">
              <span className="text-[9px] font-bold text-rose-800 uppercase tracking-wider block">
                Low Stock Items
              </span>
              <span className="text-sm sm:text-base font-black text-rose-600 block mt-0.5">
                {scopedLowStockProducts.length} Items
              </span>
              <span className="text-[9px] text-rose-700 font-semibold block mt-0.5">
                {scopedLowStockProducts.length > 0 ? 'Need Restock PO' : 'All Healthy'}
              </span>
            </div>
          </div>

          {/* Product-by-Product Valuation Table */}
          <div className="space-y-1.5 pt-0.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1">
                <Layers className="w-3 h-3 text-emerald-600" />
                <span>Product-Wise Valuation Breakdown</span>
              </span>
              <span className="text-[10px] font-bold text-slate-500">
                {scopedProducts.length} Items
              </span>
            </div>

            <div className="overflow-x-auto no-scrollbar border border-slate-200 rounded-xl bg-white">
              <table className="w-full text-left text-[11px] sm:text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/90 text-slate-500 text-[9px] sm:text-[10px] uppercase tracking-wider whitespace-nowrap">
                    <th className="py-1.5 px-2 font-bold">{tr('Product / SKU', language)}</th>
                    <th className="py-1.5 px-1.5 font-bold text-center">{tr('Pack', language)}</th>
                    <th className="py-1.5 px-1.5 font-bold text-center">{tr('Stock', language)}</th>
                    <th className="py-1.5 px-1.5 font-bold text-right">{tr('Cost', language)}</th>
                    <th className="py-1.5 px-1.5 font-bold text-right">{tr('Cost Val', language)}</th>
                    <th className="py-1.5 px-1.5 font-bold text-right">{tr('Sale', language)}</th>
                    <th className="py-1.5 px-1.5 font-bold text-right">{tr('Sale Val', language)}</th>
                    <th className="py-1.5 px-1.5 font-bold text-center">{tr('Margin', language)}</th>
                    <th className="py-1.5 px-2 font-bold text-right">{tr('Action', language)}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {scopedProducts.map((p) => {
                    const itemCostVal = p.packetStock * p.purchaseCost;
                    const itemSaleVal = p.packetStock * p.sellingPrice;
                    const isLow = p.isLowStock || p.packetStock <= p.reorderLevel;

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-2 px-2">
                          <div className="flex items-center gap-1.5 min-w-[125px] sm:min-w-[165px]">
                            <img
                              src={p.imageUrl}
                              alt={p.name}
                              className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg object-cover border border-slate-200 shrink-0"
                            />
                            <div className="min-w-0">
                              <span className="font-bold text-slate-900 block truncate max-w-[110px] sm:max-w-[150px] text-[11px]">{p.name}</span>
                              <div className="flex items-center gap-1 mt-0.5">
                                <span className="font-mono text-[9px] text-slate-400">{p.sku}</span>
                                {isLow && (
                                  <span className="px-1 py-0.2 rounded text-[8px] font-bold bg-rose-100 text-rose-700">
                                    Low
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-2 px-1.5 text-center text-slate-700 font-semibold whitespace-nowrap">
                          {p.packSize} pcs
                        </td>

                        <td className="py-2 px-1.5 text-center whitespace-nowrap">
                          <span
                            className={`font-black text-[11px] block ${
                              isLow ? 'text-rose-600' : 'text-slate-900'
                            }`}
                          >
                            {p.packetStock} pk
                          </span>
                          <span className="text-[9px] text-slate-400">({p.piecesStock})</span>
                        </td>

                        <td className="py-2 px-1.5 text-right font-bold text-slate-700 whitespace-nowrap">
                          ₹{p.purchaseCost}
                        </td>

                        <td className="py-2 px-1.5 text-right font-black text-slate-900 whitespace-nowrap">
                          ₹{itemCostVal.toLocaleString('en-IN')}
                        </td>

                        <td className="py-2 px-1.5 text-right font-bold text-emerald-700 whitespace-nowrap">
                          ₹{p.sellingPrice}
                        </td>

                        <td className="py-2 px-1.5 text-right font-black text-emerald-800 whitespace-nowrap">
                          ₹{itemSaleVal.toLocaleString('en-IN')}
                        </td>

                        <td className="py-2 px-1.5 text-center whitespace-nowrap">
                          <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200">
                            {p.marginPercent}%
                          </span>
                        </td>

                        <td className="py-2 px-2 text-right whitespace-nowrap">
                          {role === 'supplier' ? (
                            <button
                              type="button"
                              onClick={() => handleSendSupplierQuoteToOwner(p)}
                              className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] inline-flex items-center gap-1 shadow-2xs active:scale-95 transition"
                            >
                              <MessageSquare className="w-2.5 h-2.5" />
                              <span>Quote</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSendSupplierRestockPO(p)}
                              className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-black text-white font-bold text-[10px] inline-flex items-center gap-1 shadow-2xs active:scale-95 transition"
                            >
                              <MessageSquare className="w-2.5 h-2.5" />
                              <span>PO</span>
                            </button>
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
      )}

      {/* 4. Section: Unified Wholesale Analytics & Performance (Both Tables in One Section!) */}
      {(activeReportTab === 'all' || activeReportTab === 'analytics') && (
        <div className="glass-card rounded-2xl sm:rounded-3xl p-3 sm:p-4 border border-white/90 shadow-md space-y-3">
          {/* Unified Section Header with Sub-tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
                <TrendingUp className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-1.5 flex-wrap">
                  <span>Wholesale Analytics Board</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">
                    Unified
                  </span>
                </h3>
                <p className="text-[10px] text-slate-500 truncate">
                  Category share & best-selling wholesale products
                </p>
              </div>
            </div>

            {/* Sub-view toggle */}
            <div className="grid grid-cols-3 sm:flex items-center bg-slate-100 p-0.5 rounded-xl text-[10px] sm:text-xs font-bold shrink-0 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setAnalyticsSubView('both')}
                className={`px-2 py-1 rounded-lg transition text-center ${
                  analyticsSubView === 'both' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                }`}
              >
                {tr('Both Tables', language)}
              </button>
              <button
                type="button"
                onClick={() => setAnalyticsSubView('category')}
                className={`px-2 py-1 rounded-lg transition text-center ${
                  analyticsSubView === 'category' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                }`}
              >
                {tr('Category Share', language)}
              </button>
              <button
                type="button"
                onClick={() => setAnalyticsSubView('products')}
                className={`px-2 py-1 rounded-lg transition text-center ${
                  analyticsSubView === 'products' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                }`}
              >
                {tr('Top Products', language)}
              </button>
            </div>
          </div>

          {/* Wholesale Analysis Filter Controls */}
          <div className="p-2.5 rounded-2xl bg-slate-50/90 border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                <Filter className="w-3 h-3 text-sky-600" />
                <span>Wholesale Sales Filter</span>
              </span>
              {hasActiveAnalyticsFilter && (
                <button
                  type="button"
                  onClick={resetAnalyticsFilters}
                  className="text-[10px] font-bold text-sky-700 hover:text-sky-900 inline-flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              )}
            </div>

            {/* Period Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              {(
                [
                  { id: 'all', label: 'All Time' },
                  { id: 'today', label: 'Today' },
                  { id: '7days', label: 'Last 7 Days' },
                  { id: 'month', label: 'This Month' },
                  { id: 'year', label: 'This Year' },
                ] as const
              ).map((period) => (
                <button
                  key={period.id}
                  type="button"
                  onClick={() => setAnalyticsPeriodFilter(period.id)}
                  className={`whitespace-nowrap px-2.5 py-1 rounded-lg text-[10px] font-bold transition active:scale-95 ${
                    analyticsPeriodFilter === period.id
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {period.label}
                </button>
              ))}
            </div>

            {/* Category & Order Stage Dropdown Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="flex items-center gap-1.5 bg-white rounded-xl border border-slate-200 px-2.5 py-1.5">
                <Layers className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                <label className="text-[10px] font-bold text-slate-500 shrink-0">Category:</label>
                <select
                  value={analyticsCategoryFilter}
                  onChange={(e) => setAnalyticsCategoryFilter(e.target.value)}
                  className="w-full text-[11px] font-bold text-slate-800 bg-transparent focus:outline-none"
                >
                  <option value="all">All Categories ({allWholesaleCategories.length})</option>
                  {allWholesaleCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5 bg-white rounded-xl border border-slate-200 px-2.5 py-1.5">
                <Truck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <label className="text-[10px] font-bold text-slate-500 shrink-0">Stage:</label>
                <select
                  value={analyticsStatusFilter}
                  onChange={(e) =>
                    setAnalyticsStatusFilter(
                      e.target.value as 'all' | 'Order Confirm' | 'Dispatch' | 'Dispatched' | 'Delivered'
                    )
                  }
                  className="w-full text-[11px] font-bold text-slate-800 bg-transparent focus:outline-none"
                >
                  <option value="all">All Active Orders</option>
                  <option value="Order Confirm">Order Confirm</option>
                  <option value="Dispatch">Dispatch</option>
                  <option value="Dispatched">Dispatched</option>
                  <option value="Delivered">Delivered</option>
                </select>
              </div>
            </div>
          </div>

          {/* Filtered Sales KPI Summary Strip */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2.5 rounded-xl bg-sky-50/70 border border-sky-200/80">
              <span className="text-[9px] font-bold text-sky-700 uppercase block">Categories Sold</span>
              <span className="text-sm sm:text-base font-black text-sky-950 tabular-nums block mt-0.5">
                {dynamicCategoryStats.length}
              </span>
              <span className="text-[9px] text-slate-500 font-medium block">
                {matchedOrderIds.size} Orders
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-indigo-50/70 border border-indigo-200/80">
              <span className="text-[9px] font-bold text-indigo-700 uppercase block">Products Sold</span>
              <span className="text-sm sm:text-base font-black text-indigo-950 tabular-nums block mt-0.5">
                {filteredTotalPacketsSold} pkts
              </span>
              <span className="text-[9px] text-slate-500 font-medium tabular-nums block">
                {filteredTotalPiecesSold.toLocaleString('en-IN')} pcs
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80">
              <span className="text-[9px] font-bold text-emerald-700 uppercase block">Sales Value</span>
              <span className="text-sm sm:text-base font-black text-emerald-800 tabular-nums block mt-0.5">
                ₹{filteredWholesaleSalesTotal.toLocaleString('en-IN')}
              </span>
              <span className="text-[9px] text-emerald-700 font-medium block">
                {analyticsCategoryFilter === 'all' ? 'All Categories' : analyticsCategoryFilter}
              </span>
            </div>
          </div>

          {/* Table 1: Category-Wise Products Sold */}
          {(analyticsSubView === 'both' || analyticsSubView === 'category') && (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-extrabold text-slate-800 flex items-center gap-1 uppercase tracking-wider">
                  <Layers className="w-3 h-3 text-sky-600" />
                  <span>Category-Wise Products Sold ({dynamicCategoryStats.length})</span>
                </span>
                <span className="text-[10px] font-bold text-slate-500 tabular-nums">
                  {filteredTotalPacketsSold} pkts · ₹{filteredWholesaleSalesTotal.toLocaleString('en-IN')}
                </span>
              </div>

              {dynamicCategoryStats.length === 0 ? (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-2">
                  <p className="text-xs font-semibold text-slate-600">
                    No category sales found for the selected filter.
                  </p>
                  {hasActiveAnalyticsFilter && (
                    <button
                      type="button"
                      onClick={resetAnalyticsFilters}
                      className="px-3 py-1 rounded-lg bg-slate-900 text-white text-[11px] font-bold"
                    >
                      Show All Sales
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {dynamicCategoryStats.map((c) => {
                    const isFocused = analyticsCategoryFilter === c.cat;
                    return (
                      <div
                        key={c.cat}
                        className={`p-2.5 rounded-2xl border space-y-2 transition ${
                          isFocused
                            ? 'bg-sky-50/70 border-sky-300'
                            : 'bg-slate-50/80 border-slate-200/70'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 text-xs font-bold">
                          <button
                            type="button"
                            onClick={() =>
                              setAnalyticsCategoryFilter(isFocused ? 'all' : c.cat)
                            }
                            className="text-left min-w-0 group"
                          >
                            <span className="text-slate-900 flex items-center gap-1.5 flex-wrap group-hover:text-sky-700 transition">
                              <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0" />
                              <span>{c.cat}</span>
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-sky-100/80 text-sky-800 tabular-nums">
                                {c.packetsSold} pkts ({c.piecesSold} pcs)
                              </span>
                            </span>
                            <span className="text-[10px] font-medium text-slate-500 block mt-0.5 tabular-nums">
                              {c.uniqueProductsCount} Products · {c.ordersCount} Orders
                            </span>
                          </button>

                          <div className="text-right shrink-0">
                            <span className="text-slate-900 font-black tabular-nums block">
                              ₹{c.amount.toLocaleString('en-IN')} ({c.sharePct}%)
                            </span>
                            <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-bold inline-block mt-0.5">
                              {c.margin} Margin
                            </span>
                          </div>
                        </div>

                        <div className="w-full bg-slate-200/80 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-sky-500 to-indigo-600 h-full rounded-full"
                            style={{ width: `${c.pct}%` }}
                          />
                        </div>

                        {/* Compact Sold Products List inside Category */}
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {c.productsSold.map((ps) => (
                            <span
                              key={ps.productId}
                              className="text-[10px] bg-white border border-slate-200/90 text-slate-700 px-2 py-0.5 rounded-lg font-semibold tabular-nums"
                            >
                              {ps.name}: <b className="text-slate-900">{ps.packetsSold} pk</b> ({ps.piecesSold} pcs)
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Table 2: Top Best Selling Products (Filtered) */}
          {(analyticsSubView === 'both' || analyticsSubView === 'products') && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-slate-800 flex items-center gap-1 uppercase tracking-wider">
                  <Package className="w-3 h-3 text-emerald-600" />
                  <span>Top Sold Products ({dynamicTopProducts.length})</span>
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200">
                  Filtered Sales
                </span>
              </div>

              {dynamicTopProducts.length === 0 ? (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
                  No products sold in this filter range.
                </div>
              ) : (
                <div className="overflow-x-auto no-scrollbar border border-slate-100 rounded-xl">
                  <table className="w-full text-left text-[11px] sm:text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-400 text-[9px] sm:text-[10px] uppercase tracking-wider whitespace-nowrap">
                        <th className="py-1.5 px-2 font-bold">#</th>
                        <th className="py-1.5 px-1.5 font-bold">{tr('Product', language)}</th>
                        <th className="py-1.5 px-1.5 font-bold">Category</th>
                        <th className="py-1.5 px-1.5 font-bold text-center">Sold Qty</th>
                        <th className="py-1.5 px-1.5 font-bold text-center">Orders</th>
                        <th className="py-1.5 px-1.5 font-bold text-right">Sale</th>
                        <th className="py-1.5 px-2 font-bold text-right">{tr('Margin', language)}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {dynamicTopProducts.map((p) => (
                        <tr key={p.productId} className="hover:bg-slate-50/60 transition">
                          <td className="py-2 px-2 font-black text-slate-700">
                            <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-800 flex items-center justify-center text-[9px] tabular-nums">
                              {p.rank}
                            </span>
                          </td>
                          <td className="py-2 px-1.5">
                            <span className="font-bold text-slate-900 block truncate max-w-[125px] sm:max-w-[170px]">{p.name}</span>
                            <span className="font-mono text-[9px] text-slate-400">{p.sku}</span>
                          </td>
                          <td className="py-2 px-1.5 text-slate-600 text-[10px] whitespace-nowrap">
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">
                              {p.category}
                            </span>
                          </td>
                          <td className="py-2 px-1.5 text-center whitespace-nowrap tabular-nums">
                            <span className="font-black text-slate-900 block">{p.packetsSold} pk</span>
                            <span className="text-[9px] text-slate-400">{p.piecesSold} pcs</span>
                          </td>
                          <td className="py-2 px-1.5 text-center font-bold text-sky-700 whitespace-nowrap tabular-nums">
                            {p.ordersCount}
                          </td>
                          <td className="py-2 px-1.5 text-right font-black text-slate-900 whitespace-nowrap tabular-nums">
                            ₹{p.sales.toLocaleString('en-IN')}
                          </td>
                          <td className="py-2 px-2 text-right font-bold text-emerald-700 whitespace-nowrap tabular-nums">
                            {p.margin}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 5. Section: Low Stock Track Report (Scoped to current products) */}
      {(activeReportTab === 'all' || activeReportTab === 'lowstock') && (
        <div className="glass-card rounded-2xl sm:rounded-3xl p-3 sm:p-4 border border-rose-200/90 shadow-md space-y-2.5 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 via-amber-500 to-rose-500" />

          <div className="flex items-center justify-between gap-2 pt-0.5 flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-xl bg-rose-500 text-white flex items-center justify-center shadow-xs shrink-0">
                <AlertTriangle className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-1.5 flex-wrap">
                  <span>{tr('Low Stock Track Report', language)}</span>
                  <span className="text-[10px] font-bold text-rose-600 tabular-nums">
                    {scopedLowStockProducts.length}
                  </span>
                </h3>
              </div>
            </div>

            {role === 'owner' ? (
              <div className="inline-flex items-center gap-1 p-0.5 rounded-xl bg-slate-100 border border-slate-200/80 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowLowStockAutoWa(false)}
                  title="Manual Low Stock List"
                  aria-label="Show Manual Low Stock List"
                  className={`h-7 px-2.5 rounded-lg text-[11px] font-bold inline-flex items-center gap-1.5 transition active:scale-95 ${
                    !showLowStockAutoWa
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span>Manual</span>
                  <span className="text-[10px] font-black text-rose-600 tabular-nums">
                    {scopedLowStockProducts.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowLowStockAutoWa(true)}
                  title="Auto WA Low Stock Alerts"
                  aria-label="Show Auto WA Section"
                  className={`h-7 px-2.5 rounded-lg text-[11px] font-bold inline-flex items-center gap-1.5 transition active:scale-95 ${
                    showLowStockAutoWa
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-emerald-700 hover:bg-emerald-50'
                  }`}
                >
                  <span className="relative inline-flex items-center">
                    <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                    <Zap className="w-2 h-2 -ml-0.5 -mt-2 text-amber-400 fill-amber-400 shrink-0" />
                  </span>
                  <span>Auto WA</span>
                  <span
                    className={`text-[10px] font-black tabular-nums ${
                      showLowStockAutoWa ? 'text-white/95' : 'text-emerald-700'
                    }`}
                  >
                    {whatsappAlerts.length}
                  </span>
                </button>
              </div>
            ) : (
              <span className="text-[10px] font-bold text-slate-500 hidden sm:block shrink-0">
                Daily: 09:00 AM
              </span>
            )}
          </div>

          {role === 'owner' && showLowStockAutoWa ? (
            <div className="pt-1">
              <DigitalInventoryPanel mode="whatsapp" />
            </div>
          ) : scopedLowStockProducts.length === 0 ? (
            <div className="p-4 text-center bg-emerald-50 rounded-2xl border border-emerald-200">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-1" />
              <h4 className="font-bold text-xs text-emerald-900">All Stock Levels Optimal</h4>
              <p className="text-[10px] text-emerald-700">All products are above reorder thresholds.</p>
            </div>
          ) : (
            <div className="overflow-x-auto no-scrollbar border border-rose-100 rounded-xl bg-white">
              <table className="w-full text-left text-[11px] sm:text-xs">
                <thead>
                  <tr className="border-b border-rose-200/70 bg-rose-50/50 text-slate-500 text-[9px] sm:text-[10px] uppercase tracking-wider whitespace-nowrap">
                    <th className="py-1.5 px-2 font-bold">{tr('Item / SKU', language)}</th>
                    <th className="py-1.5 px-1.5 font-bold">{tr('Stock', language)}</th>
                    <th className="py-1.5 px-1.5 font-bold">{tr('Min', language)}</th>
                    <th className="py-1.5 px-1.5 font-bold">{tr('PO Qty', language)}</th>
                    <th className="py-1.5 px-1.5 font-bold">{tr('Supplier', language)}</th>
                    <th className="py-1.5 px-2 font-bold text-right">{tr('Action', language)}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rose-100">
                  {scopedLowStockProducts.map((p) => {
                    const supp = suppliers.find((s) => s.id === p.supplierId || s.name === p.supplierName) || suppliers[0];
                    const suggestedPOQty = Math.max(10, p.reorderLevel * 2);
                    const poValue = suggestedPOQty * p.purchaseCost;

                    return (
                      <tr key={p.id} className="hover:bg-rose-50/40 transition">
                        <td className="py-2 px-2">
                          <span className="font-bold text-slate-900 block truncate max-w-[120px] sm:max-w-[160px]">{p.name}</span>
                          <span className="font-mono text-[9px] text-slate-400">{p.sku} • {p.packSize}p</span>
                        </td>
                        <td className="py-2 px-1.5 whitespace-nowrap">
                          <span className="font-black text-rose-600 block text-[11px] tabular-nums">
                            {p.packetStock} pk
                          </span>
                          <span className="text-[9px] text-slate-400 tabular-nums">({p.piecesStock})</span>
                        </td>
                        <td className="py-2 px-1.5 font-semibold text-slate-700 whitespace-nowrap tabular-nums">
                          {p.reorderLevel} pk
                        </td>
                        <td className="py-2 px-1.5 whitespace-nowrap">
                          <span className="font-bold text-slate-900 block tabular-nums">+{suggestedPOQty} pk</span>
                          <span className="text-[9px] text-slate-500 tabular-nums">₹{poValue.toLocaleString('en-IN')}</span>
                        </td>
                        <td className="py-2 px-1.5">
                          <span className="font-semibold text-slate-800 text-[10px] block truncate max-w-[95px] sm:max-w-[130px]">
                            {supp?.name || 'Authorized C&F'}
                          </span>
                          <span className="text-[9px] text-indigo-600 block">
                            {supp?.city || 'Burrabazar'}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-right whitespace-nowrap">
                          {role === 'supplier' ? (
                            <button
                              type="button"
                              onClick={() => handleSendSupplierQuoteToOwner(p)}
                              className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] inline-flex items-center gap-1 shadow-xs active:scale-95 transition"
                            >
                              <MessageSquare className="w-2.5 h-2.5" />
                              <span>Quote</span>
                            </button>
                          ) : (
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                disabled={sendingWaProductId === p.id}
                                onClick={async () => {
                                  setSendingWaProductId(p.id);
                                  await sendDealerLowStockAlert(p, {
                                    suggestedReorderPackets: suggestedPOQty,
                                    triggerType: 'Manual',
                                    supplierOverride: supp,
                                  });
                                  setSendingWaProductId(null);
                                }}
                                title="Send Auto WA Dealer Alert"
                                aria-label={`Send Auto WA alert for ${p.name}`}
                                className="w-7 h-7 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 inline-flex items-center justify-center shadow-xs active:scale-95 transition disabled:opacity-50"
                              >
                                <BellRing className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSendSupplierRestockPO(p)}
                                className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] inline-flex items-center gap-1 shadow-xs active:scale-95 transition"
                              >
                                <MessageSquare className="w-2.5 h-2.5" />
                                <span>PO</span>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 6. Section: Financial P&L Snapshot (Owner Mode) */}
      {role === 'owner' && (activeReportTab === 'all' || activeReportTab === 'pnl') && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5 text-sky-600" />
              <span>Financial Profit & Loss Snapshot</span>
            </h3>
            <span className="text-[10px] text-slate-400">Nuapatna Hub</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="glass-card rounded-2xl p-2.5 sm:p-3 border border-white/90 shadow-xs">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Gross Sales</span>
              <span className="text-base sm:text-lg font-black text-slate-900 block mt-0.5">
                ₹{totalSales.toLocaleString('en-IN')}
              </span>
              <span className="text-[9px] text-emerald-600 font-bold block mt-0.5">+18% vs last month</span>
            </div>

            <div className="glass-card rounded-2xl p-2.5 sm:p-3 border border-white/90 shadow-xs">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Net Profit</span>
              <span className="text-base sm:text-lg font-black text-emerald-600 block mt-0.5">
                ₹{Math.round(netProfit).toLocaleString('en-IN')}
              </span>
              <span className="text-[9px] text-slate-400 block mt-0.5">~35% Gross Margin</span>
            </div>

            <div className="glass-card rounded-2xl p-2.5 sm:p-3 border border-white/90 shadow-xs">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Advance Recd</span>
              <span className="text-base sm:text-lg font-black text-blue-600 block mt-0.5">
                ₹{totalAdvanceCollected.toLocaleString('en-IN')}
              </span>
              <span className="text-[9px] text-slate-400 block mt-0.5">₹1k booking rule</span>
            </div>

            <div className="glass-card rounded-2xl p-2.5 sm:p-3 border border-white/90 shadow-xs">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Stock Valuation</span>
              <span className="text-base sm:text-lg font-black text-indigo-600 block mt-0.5">
                ₹{totalInventoryCost.toLocaleString('en-IN')}
              </span>
              <span className="text-[9px] text-emerald-600 font-semibold block mt-0.5">
                Sale: ₹{totalInventorySale.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 7. Section: Sales & Order Dispatches Report */}
      {role === 'owner' && (activeReportTab === 'all' || activeReportTab === 'dispatch') && (
        <DispatchDeliveryOverviewTable
          mode="orders"
          orders={orders}
          title="Wholesale Dispatches & Delivery Overview"
        />
      )}

      {/* 8. Section: Khata & Udhaar Dues Report */}
      {(activeReportTab === 'all' || activeReportTab === 'udhaar') && (
        <div className="glass-card rounded-2xl sm:rounded-3xl p-3 sm:p-4 border border-white/90 shadow-md space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>
                {role === 'supplier' ? 'Owner Payable Khata' : 'Khata & Udhaar Risk'}
              </span>
            </h3>
            <span className="text-[10px] sm:text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 shrink-0">
              {role === 'supplier'
                ? `₹${(loggedInSupplier.dueAmount || loggedInSupplier.pendingDues || 0).toLocaleString('en-IN')} Payable`
                : `₹${totalMarketUdhaar.toLocaleString('en-IN')} Udhaar`}
            </span>
          </div>

          {role === 'supplier' ? (
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Total Purchase Orders Fulfilled:</span>
                <span className="font-black text-slate-900">₹{(loggedInSupplier.totalPurchases || 88500).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Owner Advance / Settled:</span>
                <span className="font-black text-emerald-700">
                  ₹{Math.max(0, (loggedInSupplier.totalPurchases || 88500) - (loggedInSupplier.dueAmount || loggedInSupplier.pendingDues || 0)).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between items-center pt-1.5 border-t border-emerald-200 text-xs font-extrabold">
                <span className="text-rose-700">Balance Receivable:</span>
                <span className="text-rose-700">₹{(loggedInSupplier.dueAmount || loggedInSupplier.pendingDues || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              {shopsWithUdhaar.length === 0 ? (
                <p className="text-xs text-slate-500 py-2 text-center">Zero pending udhaar across all retail partners.</p>
              ) : (
                shopsWithUdhaar.map((c) => (
                  <div
                    key={c.id}
                    className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/90 flex items-center justify-between text-xs gap-2"
                  >
                    <div className="min-w-0">
                      <h4 className="font-bold text-slate-900 truncate">{c.shopName}</h4>
                      <p className="text-[10px] text-slate-500 truncate">
                        {c.ownerName} • {c.city} ({c.distanceKm} km)
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs sm:text-sm font-black text-rose-600 block">
                        ₹{c.pendingUdhaar.toLocaleString('en-IN')}
                      </span>
                      <span className="text-[9px] text-rose-700 font-bold block">{tr('Clear first', language)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* 9. Section: Supplier Sourcing & PO Consignments */}
      {(activeReportTab === 'all' || activeReportTab === 'suppliers') && (
        <div className="glass-card rounded-2xl sm:rounded-3xl p-3 sm:p-4 border border-white/90 shadow-md space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-purple-600" />
              <span>
                {role === 'supplier'
                  ? 'Consignment POs by Rupam Wholesale'
                  : 'Supplier Sourcing Report'}
              </span>
            </h3>
            <span className="text-xs font-bold text-slate-700">
              {role === 'supplier'
                ? `${supplierOrders.filter((po) => po.supplierId === activeSupplierId).length} Active POs`
                : `Purchases: ₹${totalSupplierPurchases.toLocaleString('en-IN')}`}
            </span>
          </div>

          {role === 'supplier' ? (
            <div className="space-y-2 text-xs">
              {supplierOrders
                .filter((po) => po.supplierId === activeSupplierId)
                .map((po) => (
                  <div
                    key={po.id}
                    className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between"
                  >
                    <div>
                      <span className="font-bold text-slate-900 block">{po.poNumber}</span>
                      <span className="text-[11px] text-slate-500">
                        Date: {po.orderDate} • Bilty: {po.biltyNumber || 'Pending'}
                      </span>
                      <span className="text-[11px] text-indigo-700 font-semibold block mt-0.5">
                        {po.items.length} product lines • {po.status}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-slate-900 block">₹{po.totalAmount.toLocaleString('en-IN')}</span>
                      <span className="text-[10px] text-emerald-700 font-bold block">
                        Advance Paid: ₹{po.advancePaid.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {suppliers.map((s) => (
                <div key={s.id} className="py-2.5 flex items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-slate-900 block">{s.name}</span>
                    <span className="text-[11px] text-slate-500">
                      {s.city}, {s.state} • Terms: {s.paymentTerms}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-slate-900 block">
                      ₹{(s.totalPurchases || 0).toLocaleString('en-IN')}
                    </span>
                    {(s.pendingDues || s.dueAmount || 0) > 0 ? (
                      <span className="text-[10px] text-rose-600 font-bold block">
                        Payable: ₹{s.pendingDues || s.dueAmount}
                      </span>
                    ) : (
                      <span className="text-[10px] text-emerald-600 font-bold block">{tr('All Clear', language)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <YearMonthFilterModal isOpen={isFilterModalOpen} onClose={() => setIsFilterModalOpen(false)} />
    </div>
  );
};
