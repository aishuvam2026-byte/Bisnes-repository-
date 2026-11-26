import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { DemandForecastItem, DemandForecastReport, Product, Supplier } from '../types';
import {
  Sparkles,
  RefreshCw,
  AlertTriangle,
  PackageX,
  TrendingUp,
  ShoppingBag,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Send,
  Zap,
  Clock,
  ExternalLink,
  Building2,
  Database,
  ShieldCheck,
} from 'lucide-react';

interface SalesVelocityMetric {
  product: Product;
  supplier: Supplier | undefined;
  totalPacketsSold: number;
  orderCount: number;
  avgDailyPacketsSold: number;
  estimatedDaysOfCover: number;
  supplierLeadTimeDays: number;
  baselineSuggestedReorder: number;
}

export const DigitalInventoryPanel: React.FC<{
  mode: 'forecast' | 'whatsapp';
}> = ({ mode }) => {
  const {
    products,
    orders,
    suppliers,
    supplierOrders,
    activeBusiness,
    settings,
    whatsappAlerts,
    autoWhatsAppAlertEnabled,
    setAutoWhatsAppAlertEnabled,
    autoReorderDraftEnabled,
    setAutoReorderDraftEnabled,
    isRealtimeInventoryConnected,
    firebaseUser,
    connectAndSyncFirebase,
    sendDealerLowStockAlert,
    autoReorderProduct,
    showToast,
  } = useApp();

  // Gemini Forecast State
  const [forecastReport, setForecastReport] = useState<DemandForecastReport | null>(() => {
    try {
      const cached = localStorage.getItem('rupam_gemini_forecast_v1');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [isForecastLoading, setIsForecastLoading] = useState(false);
  const [forecastError, setForecastError] = useState<string | null>(null);
  const [customReorderQtys, setCustomReorderQtys] = useState<Record<string, number>>({});
  const [reorderingIds, setReorderingIds] = useState<Record<string, boolean>>({});
  const [isBatchReordering, setIsBatchReordering] = useState(false);

  // WhatsApp Business Cloud API State
  const [waStatus, setWaStatus] = useState<{ configured: boolean; apiVersion: string } | null>(null);
  const [sendingAlertIds, setSendingAlertIds] = useState<Record<string, boolean>>({});
  const [isSendingBatchAlerts, setIsSendingBatchAlerts] = useState(false);

  useEffect(() => {
    let active = true;
    fetch('/api/whatsapp/status')
      .then((r) => r.json())
      .then((d) => {
        if (active) {
          setWaStatus({
            configured: Boolean(d?.configured),
            apiVersion: String(d?.apiVersion || 'v21.0'),
          });
        }
      })
      .catch(() => {
        if (active) setWaStatus({ configured: false, apiVersion: 'v21.0' });
      });
    return () => {
      active = false;
    };
  }, []);

  const findSupplier = (p: Product): Supplier | undefined =>
    suppliers.find((s) => s.id === p.supplierId) ||
    suppliers.find((s) => p.supplierName && s.name === p.supplierName) ||
    suppliers.find((s) => p.brand && s.brands?.includes(p.brand)) ||
    suppliers.find((s) => s.categories?.includes(p.category)) ||
    suppliers[0];

  // Calculate real sales velocity from historical orders
  const salesMetrics: SalesVelocityMetric[] = useMemo(() => {
    const activeOrders = orders.filter(
      (o) => o.status !== 'Cancelled' && o.status !== 'Returned'
    );

    // Determine observation span in days (default 30 days minimum)
    let spanDays = 30;
    if (activeOrders.length >= 2) {
      const times = activeOrders
        .map((o) => new Date(o.createdAt).getTime())
        .filter((t) => Number.isFinite(t));
      if (times.length >= 2) {
        const diffDays = Math.ceil((Math.max(...times) - Math.min(...times)) / 86400000);
        spanDays = Math.max(14, Math.min(90, diffDays || 30));
      }
    }

    const soldMap = new Map<string, { pkts: number; orders: number }>();
    for (const ord of activeOrders) {
      for (const item of ord.items || []) {
        const key = item.productId;
        const prev = soldMap.get(key) || { pkts: 0, orders: 0 };
        soldMap.set(key, {
          pkts: prev.pkts + Number(item.packetQty || 0),
          orders: prev.orders + 1,
        });
      }
    }

    return products.map((product) => {
      const stats = soldMap.get(product.id) || { pkts: 0, orders: 0 };
      const supplier = findSupplier(product);
      const supplierLeadTimeDays = supplier?.leadTimeDays || 4;
      const avgDailyPacketsSold = Number((stats.pkts / spanDays).toFixed(2));
      const available = Math.max(0, product.packetStock - (product.reservedPackets || 0));
      const estimatedDaysOfCover =
        product.packetStock <= 0
          ? 0
          : avgDailyPacketsSold > 0
          ? Math.round(available / avgDailyPacketsSold)
          : 90;
      const monthlyDemand = Math.max(
        product.reorderLevel,
        Math.ceil(avgDailyPacketsSold * 30)
      );
      const baselineSuggestedReorder =
        product.packetStock <= product.reorderLevel || estimatedDaysOfCover <= supplierLeadTimeDays * 2
          ? Math.max(6, monthlyDemand + Math.ceil(product.reorderLevel * 0.5) - available)
          : 0;

      return {
        product,
        supplier,
        totalPacketsSold: stats.pkts,
        orderCount: stats.orders,
        avgDailyPacketsSold,
        estimatedDaysOfCover,
        supplierLeadTimeDays,
        baselineSuggestedReorder,
      };
    });
  }, [products, orders, suppliers]);

  const outOfStockList = useMemo(
    () => products.filter((p) => p.packetStock <= 0),
    [products]
  );
  const lowAndOosList = useMemo(
    () =>
      products
        .filter((p) => p.packetStock <= 0 || p.isLowStock || p.packetStock <= p.reorderLevel)
        .sort((a, b) => a.packetStock - b.packetStock),
    [products]
  );

  const forecastByProductId = useMemo(() => {
    const map = new Map<string, DemandForecastItem>();
    for (const item of forecastReport?.items || []) {
      map.set(item.productId, item);
    }
    return map;
  }, [forecastReport]);

  const handleRunGeminiForecast = async () => {
    setIsForecastLoading(true);
    setForecastError(null);
    try {
      const payload = {
        businessName: activeBusiness.companyName || settings.businessName,
        inventoryMetrics: salesMetrics.map((m) => ({
          productId: m.product.id,
          name: m.product.name,
          sku: m.product.sku,
          category: m.product.category,
          brand: m.product.brand,
          packSize: m.product.packSize,
          currentPackets: m.product.packetStock,
          reservedPackets: m.product.reservedPackets || 0,
          reorderLevel: m.product.reorderLevel,
          purchaseCost: m.product.purchaseCost,
          sellingPrice: m.product.sellingPrice,
          totalPacketsSold: m.totalPacketsSold,
          orderCount: m.orderCount,
          avgDailyPacketsSold: m.avgDailyPacketsSold,
          supplierLeadTimeDays: m.supplierLeadTimeDays,
          supplierName: m.supplier?.name || m.product.supplierName || 'Wholesale Dealer',
          expiryDate: m.product.expiryDate,
        })),
      };

      const resp = await fetch('/api/inventory/forecast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data?.error || `Forecast request failed (${resp.status})`);
      }

      const report = data as DemandForecastReport;
      setForecastReport(report);
      localStorage.setItem('rupam_gemini_forecast_v1', JSON.stringify(report));

      // Pre-fill custom reorder quantities from Gemini recommendations
      const nextQtys: Record<string, number> = {};
      for (const it of report.items || []) {
        if (it.recommendedReorderPackets > 0) {
          nextQtys[it.productId] = it.recommendedReorderPackets;
        }
      }
      setCustomReorderQtys(nextQtys);
      showToast('Gemini AI demand forecast generated successfully!', 'success');
    } catch (err: any) {
      const msg = err?.message || 'Failed to generate demand forecast.';
      setForecastError(msg);
      showToast(msg, 'error');
    } finally {
      setIsForecastLoading(false);
    }
  };

  const handleSingleAutoReorder = async (metric: SalesVelocityMetric, qty: number) => {
    if (qty <= 0) {
      showToast('Enter at least 1 packet to reorder.', 'error');
      return;
    }
    setReorderingIds((prev) => ({ ...prev, [metric.product.id]: true }));
    try {
      await autoReorderProduct(metric.product, qty, {
        sendWhatsAppAlert: true,
        triggerType: 'Forecast-Reorder',
        note: `AI Forecast Reorder: ${qty} pkts (${metric.totalPacketsSold} pkts historical sales)`,
      });
    } finally {
      setReorderingIds((prev) => ({ ...prev, [metric.product.id]: false }));
    }
  };

  const handleAutoReorderAllCritical = async () => {
    const targets = salesMetrics
      .map((m) => {
        const ai = forecastByProductId.get(m.product.id);
        const qty =
          customReorderQtys[m.product.id] ??
          ai?.recommendedReorderPackets ??
          m.baselineSuggestedReorder;
        const isCriticalOrHigh = ai
          ? ai.urgency === 'Critical' || ai.urgency === 'High'
          : m.product.packetStock <= m.product.reorderLevel;
        return { metric: m, qty, isCriticalOrHigh };
      })
      .filter((t) => t.isCriticalOrHigh && t.qty > 0);

    if (targets.length === 0) {
      showToast('No critical SKUs currently require automatic reordering.', 'info');
      return;
    }

    setIsBatchReordering(true);
    try {
      for (const target of targets) {
        await autoReorderProduct(target.metric.product, target.qty, {
          sendWhatsAppAlert: true,
          triggerType: 'Forecast-Reorder',
          note: `Batch Auto-Reorder from Demand Forecast (${target.qty} pkts)`,
        });
      }
      showToast(`Auto-reordered ${targets.length} critical SKUs & notified dealers!`, 'success');
    } finally {
      setIsBatchReordering(false);
    }
  };

  const handleSendSingleWaAlert = async (p: Product, trigger: 'Manual' | 'Batch' = 'Manual') => {
    setSendingAlertIds((prev) => ({ ...prev, [p.id]: true }));
    try {
      const metric = salesMetrics.find((m) => m.product.id === p.id);
      const ai = forecastByProductId.get(p.id);
      const qty =
        customReorderQtys[p.id] ??
        ai?.recommendedReorderPackets ??
        metric?.baselineSuggestedReorder ??
        Math.max(10, p.reorderLevel * 2 - p.packetStock);
      await sendDealerLowStockAlert(p, {
        suggestedReorderPackets: Math.max(1, qty),
        triggerType: trigger,
      });
    } finally {
      setSendingAlertIds((prev) => ({ ...prev, [p.id]: false }));
    }
  };

  const handleSendAllLowStockAlerts = async () => {
    if (lowAndOosList.length === 0) {
      showToast('All products are above reorder level — no alerts needed.', 'info');
      return;
    }
    setIsSendingBatchAlerts(true);
    try {
      for (const p of lowAndOosList) {
        await handleSendSingleWaAlert(p, 'Batch');
      }
      showToast(`Processed automated WhatsApp alerts for ${lowAndOosList.length} low/OOS items.`, 'success');
    } finally {
      setIsSendingBatchAlerts(false);
    }
  };

  // Sort metrics for forecast view: Critical -> High -> Out of Stock -> Low Stock -> High Sales
  const sortedForecastMetrics = useMemo(() => {
    const urgencyRank: Record<string, number> = {
      Critical: 0,
      High: 1,
      Medium: 2,
      Healthy: 3,
    };
    return [...salesMetrics].sort((a, b) => {
      const aiA = forecastByProductId.get(a.product.id);
      const aiB = forecastByProductId.get(b.product.id);
      if (aiA && aiB) {
        const diff = (urgencyRank[aiA.urgency] ?? 3) - (urgencyRank[aiB.urgency] ?? 3);
        if (diff !== 0) return diff;
        return aiB.recommendedReorderPackets - aiA.recommendedReorderPackets;
      }
      if (a.product.packetStock === 0 && b.product.packetStock > 0) return -1;
      if (b.product.packetStock === 0 && a.product.packetStock > 0) return 1;
      return a.estimatedDaysOfCover - b.estimatedDaysOfCover;
    });
  }, [salesMetrics, forecastByProductId]);

  if (mode === 'forecast') {
    const criticalSkusCount = forecastReport
      ? forecastReport.criticalCount
      : lowAndOosList.length;

    return (
      <div className="space-y-3">
        {/* Gemini AI Demand Forecasting Header */}
        <div className="glass-card rounded-2xl p-3.5 border border-indigo-200/90 bg-gradient-to-br from-indigo-50/80 via-white to-sky-50/70 shadow-xs space-y-2.5">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-600 text-white text-[9px] font-black uppercase tracking-wider">
                  <Sparkles className="w-3 h-3" />
                  Gemini AI Forecast
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 text-[9px] font-bold">
                  <Database className="w-3 h-3 text-emerald-600" />
                  {isRealtimeInventoryConnected ? 'Firebase Live Sync ON' : 'Local + Firebase Sync'}
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 mt-1">
                Sales-Based Demand Forecasting & Auto-Reorder
              </h3>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Analyzes historical B2B orders, packet velocity, stock cover, and supplier lead time to predict 30-day demand and automate Supplier Purchase Orders.
              </p>
            </div>

            <button
              type="button"
              disabled={isForecastLoading}
              onClick={() => void handleRunGeminiForecast()}
              className="px-3 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-700 hover:to-sky-700 disabled:opacity-60 text-white font-black text-[11px] flex items-center gap-1.5 shadow-sm active:scale-95 transition shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isForecastLoading ? 'animate-spin' : ''}`} />
              <span>{isForecastLoading ? 'Analyzing Sales...' : 'Run AI Demand Forecast'}</span>
            </button>
          </div>

          {/* Forecast KPI Summary Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            <div className="bg-white/95 rounded-xl p-2 border border-rose-100">
              <span className="text-[9px] font-bold uppercase text-rose-600 block">Out of Stock</span>
              <span className="text-base font-black text-rose-700">{outOfStockList.length} SKUs</span>
            </div>
            <div className="bg-white/95 rounded-xl p-2 border border-amber-100">
              <span className="text-[9px] font-bold uppercase text-amber-700 block">Critical / Low</span>
              <span className="text-base font-black text-amber-800">{criticalSkusCount} SKUs</span>
            </div>
            <div className="bg-white/95 rounded-xl p-2 border border-indigo-100">
              <span className="text-[9px] font-bold uppercase text-indigo-700 block">Rec. Reorder</span>
              <span className="text-base font-black text-indigo-900">
                {forecastReport
                  ? `${forecastReport.totalRecommendedPackets} pkts`
                  : `${salesMetrics.reduce((s, m) => s + m.baselineSuggestedReorder, 0)} pkts`}
              </span>
            </div>
            <div className="bg-white/95 rounded-xl p-2 border border-emerald-100">
              <span className="text-[9px] font-bold uppercase text-emerald-700 block">Est. PO Budget</span>
              <span className="text-base font-black text-emerald-800">
                ₹
                {(
                  forecastReport?.estimatedReorderBudget ??
                  salesMetrics.reduce(
                    (s, m) => s + m.baselineSuggestedReorder * m.product.purchaseCost,
                    0
                  )
                ).toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Error Banner if Gemini API returns an error */}
          {forecastError && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-[11px] text-rose-800 flex items-start gap-2">
              <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Gemini API Error</span>
                <span>{forecastError}</span>
              </div>
            </div>
          )}

          {/* AI Executive Summary */}
          {forecastReport && (
            <div className="p-2.5 rounded-xl bg-indigo-950 text-white space-y-1.5">
              <div className="flex items-center justify-between gap-2 text-[10px]">
                <span className="font-black text-indigo-200 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-300" />
                  AI Procurement Summary ({forecastReport.model})
                </span>
                <span className="text-indigo-300 font-medium">
                  Updated {new Date(forecastReport.generatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-[11px] text-indigo-50 leading-relaxed">{forecastReport.summary}</p>
            </div>
          )}

          {/* Batch Auto-Reorder Action */}
          <div className="flex items-center justify-between gap-2 flex-wrap pt-1 border-t border-indigo-100">
            <span className="text-[10px] font-semibold text-slate-600">
              Open Supplier POs: <strong className="text-slate-900">{supplierOrders.filter((po) => po.status !== 'Settled').length}</strong> • Creates PO & sends dealer WhatsApp alert automatically
            </span>
            <button
              type="button"
              disabled={isBatchReordering}
              onClick={() => void handleAutoReorderAllCritical()}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-black text-[11px] flex items-center gap-1.5 shadow-xs active:scale-95 transition"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>
                {isBatchReordering ? 'Creating POs...' : 'Auto-Reorder All Critical SKUs'}
              </span>
            </button>
          </div>
        </div>

        {/* Per-SKU Demand Forecast & Reorder Cards */}
        <div className="space-y-2.5">
          {sortedForecastMetrics.map((m) => {
            const ai = forecastByProductId.get(m.product.id);
            const urgency =
              ai?.urgency ||
              (m.product.packetStock <= 0
                ? 'Critical'
                : m.product.packetStock <= m.product.reorderLevel
                ? 'High'
                : m.estimatedDaysOfCover <= 20
                ? 'Medium'
                : 'Healthy');
            const defaultQty = ai
              ? ai.recommendedReorderPackets
              : m.baselineSuggestedReorder;
            const reorderQty =
              customReorderQtys[m.product.id] !== undefined
                ? customReorderQtys[m.product.id]
                : defaultQty;
            const daysCover = ai ? ai.daysOfCover : m.estimatedDaysOfCover;
            const predicted30d = ai
              ? ai.predicted30DayPackets
              : Math.max(m.product.reorderLevel, Math.ceil(m.avgDailyPacketsSold * 30));
            const estCost = Math.max(0, reorderQty) * m.product.purchaseCost;

            const badgeClass =
              urgency === 'Critical'
                ? 'bg-rose-600 text-white'
                : urgency === 'High'
                ? 'bg-amber-500 text-white'
                : urgency === 'Medium'
                ? 'bg-sky-100 text-sky-800 border border-sky-200'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200';

            return (
              <div
                key={m.product.id}
                className="bg-white rounded-2xl p-3 border border-slate-200/90 shadow-xs space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase ${badgeClass}`}>
                        {urgency}
                      </span>
                      <span className="font-mono text-[10px] font-bold text-slate-400">
                        {m.product.sku}
                      </span>
                      {m.product.packetStock <= 0 && (
                        <span className="px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-800 text-[9px] font-black uppercase">
                          Out of Stock
                        </span>
                      )}
                    </div>
                    <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 mt-0.5 truncate">
                      {m.product.name}
                    </h4>
                    <p className="text-[10px] text-slate-500 truncate">
                      Dealer: <strong className="text-slate-700">{m.supplier?.name || m.product.supplierName || 'Wholesale Dealer'}</strong> • Lead Time: {m.supplierLeadTimeDays}d • Cost ₹{m.product.purchaseCost}/pkt
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[9px] font-bold uppercase text-slate-400 block">Stock Cover</span>
                    <span
                      className={`text-sm font-black ${
                        daysCover <= m.supplierLeadTimeDays
                          ? 'text-rose-600'
                          : daysCover <= 14
                          ? 'text-amber-600'
                          : 'text-emerald-700'
                      }`}
                    >
                      {daysCover === 0 ? '0 days' : `${daysCover} days`}
                    </span>
                  </div>
                </div>

                {/* Metrics Strip */}
                <div className="grid grid-cols-4 gap-1.5 text-center bg-slate-50 rounded-xl p-1.5 border border-slate-100">
                  <div>
                    <span className="text-[9px] text-slate-500 block">In Stock</span>
                    <span className="text-[11px] font-black text-slate-900">{m.product.packetStock} pkts</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 block">Sold Hist.</span>
                    <span className="text-[11px] font-black text-slate-800">{m.totalPacketsSold} pkts</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 block">30d Forecast</span>
                    <span className="text-[11px] font-black text-indigo-700">{predicted30d} pkts</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 block">Reorder Min</span>
                    <span className="text-[11px] font-black text-slate-700">{m.product.reorderLevel} pkts</span>
                  </div>
                </div>

                {/* AI Reasoning */}
                {ai && (
                  <div className="p-2 rounded-xl bg-indigo-50/70 border border-indigo-100 text-[10px] text-indigo-950 leading-snug">
                    <strong className="text-indigo-800">{ai.suggestedAction}: </strong>
                    {ai.reason}
                  </div>
                )}

                {/* Reorder Controls */}
                <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <label className="text-[10px] font-bold text-slate-600">Reorder Qty:</label>
                    <input
                      type="number"
                      min={0}
                      value={reorderQty}
                      onChange={(e) =>
                        setCustomReorderQtys((prev) => ({
                          ...prev,
                          [m.product.id]: Math.max(0, Number(e.target.value) || 0),
                        }))
                      }
                      className="w-16 px-2 py-1 rounded-lg border border-slate-200 text-xs font-black text-slate-900 bg-white text-center"
                    />
                    <span className="text-[10px] font-bold text-slate-500">
                      pkts (₹{estCost.toLocaleString('en-IN')})
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={sendingAlertIds[m.product.id]}
                      onClick={() => void handleSendSingleWaAlert(m.product, 'Manual')}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-[10px] flex items-center gap-1 active:scale-95 transition"
                    >
                      <MessageSquare className="w-3 h-3" />
                      <span>{sendingAlertIds[m.product.id] ? 'Sending...' : 'WA Alert'}</span>
                    </button>

                    <button
                      type="button"
                      disabled={reorderingIds[m.product.id] || reorderQty <= 0}
                      onClick={() => void handleSingleAutoReorder(m, reorderQty)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-black disabled:opacity-50 text-white font-bold text-[10px] flex items-center gap-1 active:scale-95 transition"
                    >
                      <ShoppingBag className="w-3 h-3" />
                      <span>
                        {reorderingIds[m.product.id] ? 'Ordering...' : 'Auto-Reorder PO'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // MODE === 'whatsapp': Clean Automated WhatsApp Dealer Low-Stock Alerts
  return (
    <div className="space-y-3">
      {/* Clean Auto WA Control Bar */}
      <div className="bg-white rounded-2xl p-3 border border-slate-200/90 shadow-2xs space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                Auto WA Alerts
              </h3>
              <span className="text-[10px] text-slate-500 flex items-center gap-1">
                <ShieldCheck className={`w-3 h-3 ${waStatus?.configured ? 'text-emerald-600' : 'text-slate-400'}`} />
                {waStatus?.configured ? `WA API ${waStatus.apiVersion}` : 'Auto Log + 1-Tap WA'}
              </span>
            </div>
          </div>

          <button
            type="button"
            disabled={isSendingBatchAlerts || lowAndOosList.length === 0}
            onClick={() => void handleSendAllLowStockAlerts()}
            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-[11px] flex items-center gap-1.5 active:scale-95 transition shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isSendingBatchAlerts ? 'Sending...' : `Alert All (${lowAndOosList.length})`}</span>
          </button>
        </div>

        {/* Clean Inline Toggles */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setAutoWhatsAppAlertEnabled(!autoWhatsAppAlertEnabled)}
            className="px-2.5 py-2 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2 text-left hover:bg-slate-100/70 transition"
          >
            <span className="text-[11px] font-bold text-slate-800 truncate">Auto WA</span>
            <span
              className={`px-2 py-0.5 rounded-md text-[10px] font-black shrink-0 ${
                autoWhatsAppAlertEnabled
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {autoWhatsAppAlertEnabled ? 'ON' : 'OFF'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setAutoReorderDraftEnabled(!autoReorderDraftEnabled)}
            className="px-2.5 py-2 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2 text-left hover:bg-slate-100/70 transition"
          >
            <span className="text-[11px] font-bold text-slate-800 truncate">Auto PO</span>
            <span
              className={`px-2 py-0.5 rounded-md text-[10px] font-black shrink-0 ${
                autoReorderDraftEnabled
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {autoReorderDraftEnabled ? 'ON' : 'OFF'}
            </span>
          </button>
        </div>

        {!isRealtimeInventoryConnected && (
          <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-100 text-[10px]">
            <span className="text-slate-500 flex items-center gap-1 truncate">
              <Database className="w-3 h-3 text-amber-500 shrink-0" />
              <span className="truncate">Sync logs with Firebase</span>
            </span>
            <button
              type="button"
              onClick={() => void connectAndSyncFirebase()}
              className="px-2 py-1 rounded-lg bg-slate-900 text-white font-bold text-[10px] shrink-0"
            >
              Connect
            </button>
          </div>
        )}
      </div>

      {/* Low Stock Dealer Queue */}
      <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden">
        <div className="px-3 py-2 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>Pending Alerts</span>
          </span>
          <span className="text-[11px] font-black text-rose-600 tabular-nums">{lowAndOosList.length}</span>
        </div>

        {lowAndOosList.length === 0 ? (
          <div className="p-4 text-center text-xs text-emerald-700 font-semibold">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
            All stock levels healthy
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {lowAndOosList.map((p) => {
              const supplier = findSupplier(p);
              const suggestedQty = Math.max(10, p.reorderLevel * 2 - p.packetStock);
              const isOos = p.packetStock <= 0;
              const latestLog = whatsappAlerts.find((a) => a.productId === p.id);

              return (
                <div key={p.id} className="px-3 py-2.5 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[10px] font-black tabular-nums ${
                          isOos ? 'text-rose-600' : 'text-amber-700'
                        }`}
                      >
                        {isOos ? '0 pk' : `${p.packetStock}/${p.reorderLevel} pk`}
                      </span>
                      <span className="text-xs font-bold text-slate-900 truncate">{p.name}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 truncate mt-0.5">
                      {supplier?.name || p.supplierName || 'Dealer'} · +{suggestedQty} pk
                      {latestLog ? ` · ${latestLog.status}` : ''}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {latestLog?.fallbackUrl && (
                      <a
                        href={latestLog.fallbackUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 inline-flex items-center justify-center"
                        title="Open WhatsApp"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <button
                      type="button"
                      disabled={sendingAlertIds[p.id]}
                      onClick={() => void handleSendSingleWaAlert(p, 'Manual')}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-[10px] inline-flex items-center gap-1 active:scale-95 transition"
                    >
                      <Send className="w-3 h-3" />
                      <span>{sendingAlertIds[p.id] ? '...' : 'Send'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Clean Alert Log */}
      {whatsappAlerts.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden">
          <div className="px-3 py-2 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-600" />
              <span>Alert History</span>
            </span>
            <span className="text-[11px] font-black text-emerald-700 tabular-nums">{whatsappAlerts.length}</span>
          </div>

          <div className="divide-y divide-slate-100">
            {whatsappAlerts.slice(0, 15).map((log) => (
              <div key={log.id} className="px-3 py-2 flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-900 truncate">{log.productName}</span>
                    <span className="text-[10px] font-semibold text-emerald-700 shrink-0">{log.status}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 truncate">
                    {log.supplierName} · +{log.suggestedReorderPackets} pk ·{' '}
                    {new Date(log.createdAt).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>

                {log.fallbackUrl && (
                  <a
                    href={log.fallbackUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[10px] font-bold inline-flex items-center gap-1 shrink-0"
                  >
                    <MessageSquare className="w-3 h-3" />
                    <span>WA</span>
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
