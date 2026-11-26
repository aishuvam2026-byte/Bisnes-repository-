import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  MessageSquare,
  Smartphone,
  BellRing,
  CheckCircle2,
  Send,
  AlertTriangle,
  Store,
  Building2,
  Clock,
  Check,
  Copy,
  Sparkles,
  Package,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Product } from '../types';
import { tr } from '../data/translations';

export type ReminderMode = 'retailer_payment' | 'supplier_low_stock';
export type ReminderChannel = 'whatsapp' | 'sms' | 'both';

interface AutoReminderSettings {
  paymentAutoEnabled: boolean;
  paymentTime: string;
  paymentChannel: ReminderChannel;
  stockAutoEnabled: boolean;
  stockTime: string;
  stockChannel: ReminderChannel;
  lastPaymentAutoRun?: string;
  lastStockAutoRun?: string;
}

interface ReminderDispatchLog {
  id: string;
  mode: ReminderMode;
  targetId: string;
  targetName: string;
  phone: string;
  channel: 'WhatsApp' | 'SMS' | 'WhatsApp + SMS';
  summary: string;
  timestamp: string;
}

const SETTINGS_KEY = 'rupam_auto_reminder_settings_v1';
const LOG_KEY = 'rupam_reminder_dispatch_log_v1';

const DEFAULT_SETTINGS: AutoReminderSettings = {
  paymentAutoEnabled: true,
  paymentTime: '10:00',
  paymentChannel: 'whatsapp',
  stockAutoEnabled: true,
  stockTime: '09:00',
  stockChannel: 'whatsapp',
};

export function loadAutoReminderSettings(): AutoReminderSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveAutoReminderSettings(next: AutoReminderSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  } catch {
    // ignore storage quota errors
  }
}

export function buildSmsHref(phone: string, text: string): string {
  const digits = phone.replace(/\D/g, '').slice(-10) || '9861000000';
  return `sms:+91${digits}?body=${encodeURIComponent(text)}`;
}

export function buildWhatsAppHref(phone: string, text: string): string {
  const digits = phone.replace(/\D/g, '').slice(-10) || '9861000000';
  return `https://wa.me/91${digits}?text=${encodeURIComponent(text)}`;
}

interface RetailerOverdueTarget {
  id: string;
  shopName: string;
  ownerName: string;
  phone: string;
  udhaarDue: number;
  balanceDue: number;
  totalOverdue: number;
  orderNumbers: string[];
  oldestDate: string;
}

interface SupplierLowStockTarget {
  id: string;
  supplierName: string;
  contactPerson: string;
  phone: string;
  leadTimeDays: number;
  items: Array<{
    product: Product;
    suggestedOrderPkts: number;
  }>;
}

export const ReminderDispatcherModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  mode: ReminderMode;
  initialTargetId?: string;
}> = ({ isOpen, onClose, mode, initialTargetId }) => {
  const {
    customers,
    udhaar,
    products,
    suppliers,
    settings,
    language,
    showToast,
    logActivity,
    addNotification,
  } = useApp();

  const [autoSettings, setAutoSettings] = useState<AutoReminderSettings>(() =>
    loadAutoReminderSettings()
  );
  const [channel, setChannel] = useState<ReminderChannel>(() =>
    mode === 'retailer_payment' ? autoSettings.paymentChannel : autoSettings.stockChannel
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [customNotes, setCustomNotes] = useState<string>('');
  const [sentMap, setSentMap] = useState<Record<string, { channel: string; at: string }>>({});
  const [expandedPreviewId, setExpandedPreviewId] = useState<string | null>(null);
  const [restockOverrides, setRestockOverrides] = useState<Record<string, number>>({});
  const [recentLogs, setRecentLogs] = useState<ReminderDispatchLog[]>(() => {
    try {
      const raw = localStorage.getItem(LOG_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Build overdue retailer targets from pending Udhaar records & Customer pending balances
  const retailerTargets = useMemo<RetailerOverdueTarget[]>(() => {
    const map = new Map<string, RetailerOverdueTarget>();

    udhaar
      .filter((u) => u.status === 'Pending' && u.shortageAmount > 0)
      .forEach((u) => {
        const cust =
          customers.find((c) => c.id === u.customerId) ||
          customers.find((c) => c.shopName.toLowerCase() === u.shopName.toLowerCase());
        const key = cust?.id || u.customerId || u.shopName;
        const existing = map.get(key);
        const orderNum = u.orderNumber;
        if (existing) {
          existing.udhaarDue += u.shortageAmount;
          existing.totalOverdue = existing.udhaarDue + existing.balanceDue;
          if (orderNum && !existing.orderNumbers.includes(orderNum)) {
            existing.orderNumbers.push(orderNum);
          }
          if (u.date && u.date < existing.oldestDate) existing.oldestDate = u.date;
        } else {
          const balDue = cust?.pendingBalance || 0;
          map.set(key, {
            id: key,
            shopName: cust?.shopName || u.shopName,
            ownerName: cust?.ownerName || u.customerName,
            phone: cust?.whatsapp || cust?.phone || u.phone || settings.ownerPhone,
            udhaarDue: u.shortageAmount,
            balanceDue: balDue,
            totalOverdue: u.shortageAmount + balDue,
            orderNumbers: orderNum ? [orderNum] : [],
            oldestDate: u.date || new Date().toISOString().split('T')[0],
          });
        }
      });

    customers
      .filter((c) => (c.pendingUdhaar || 0) > 0 || (c.pendingBalance || 0) > 0)
      .forEach((c) => {
        const existing = map.get(c.id);
        if (existing) {
          existing.udhaarDue = Math.max(existing.udhaarDue, c.pendingUdhaar || 0);
          existing.balanceDue = Math.max(existing.balanceDue, c.pendingBalance || 0);
          existing.totalOverdue = existing.udhaarDue + existing.balanceDue;
        } else {
          map.set(c.id, {
            id: c.id,
            shopName: c.shopName,
            ownerName: c.ownerName,
            phone: c.whatsapp || c.phone,
            udhaarDue: c.pendingUdhaar || 0,
            balanceDue: c.pendingBalance || 0,
            totalOverdue: (c.pendingUdhaar || 0) + (c.pendingBalance || 0),
            orderNumbers: [],
            oldestDate: c.lastOrderDate || new Date().toISOString().split('T')[0],
          });
        }
      });

    return Array.from(map.values()).sort((a, b) => b.totalOverdue - a.totalOverdue);
  }, [udhaar, customers, settings.ownerPhone]);

  // Build low-stock supplier targets grouped cleanly per supplier
  const supplierTargets = useMemo<SupplierLowStockTarget[]>(() => {
    const lowStock = products.filter((p) => p.isLowStock || p.packetStock <= p.reorderLevel);
    const map = new Map<string, SupplierLowStockTarget>();

    lowStock.forEach((p) => {
      const matchedSupplier =
        suppliers.find((s) => s.id === p.supplierId) ||
        suppliers.find((s) => p.supplierName && s.name === p.supplierName) ||
        suppliers.find((s) => p.brand && s.brands?.includes(p.brand)) ||
        suppliers.find((s) => s.categories?.includes(p.category)) ||
        suppliers[0];

      if (!matchedSupplier) return;
      const suggested =
        restockOverrides[p.id] ?? Math.max(10, p.reorderLevel * 2 - p.packetStock);
      const existing = map.get(matchedSupplier.id);
      if (existing) {
        existing.items.push({ product: p, suggestedOrderPkts: suggested });
      } else {
        map.set(matchedSupplier.id, {
          id: matchedSupplier.id,
          supplierName: matchedSupplier.name,
          contactPerson: matchedSupplier.contactPerson || matchedSupplier.name,
          phone: matchedSupplier.whatsapp || matchedSupplier.phone,
          leadTimeDays: matchedSupplier.leadTimeDays || 3,
          items: [{ product: p, suggestedOrderPkts: suggested }],
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => b.items.length - a.items.length);
  }, [products, suppliers, restockOverrides]);

  // Preselect targets when opened
  useEffect(() => {
    if (!isOpen) return;
    if (mode === 'retailer_payment') {
      if (initialTargetId && retailerTargets.some((t) => t.id === initialTargetId)) {
        setSelectedIds([initialTargetId]);
      } else {
        setSelectedIds(retailerTargets.map((t) => t.id));
      }
      setChannel(autoSettings.paymentChannel);
    } else {
      if (initialTargetId && supplierTargets.some((t) => t.id === initialTargetId)) {
        setSelectedIds([initialTargetId]);
      } else {
        setSelectedIds(supplierTargets.map((t) => t.id));
      }
      setChannel(autoSettings.stockChannel);
    }
  }, [isOpen, mode, initialTargetId, retailerTargets, supplierTargets]);

  if (!isOpen) return null;

  const toggleSelectAll = () => {
    const allIds =
      mode === 'retailer_payment'
        ? retailerTargets.map((t) => t.id)
        : supplierTargets.map((t) => t.id);
    if (selectedIds.length === allIds.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(allIds);
    }
  };

  const toggleId = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const buildRetailerMessage = (target: RetailerOverdueTarget) => {
    const ordersPart =
      target.orderNumbers.length > 0 ? ` (Order #${target.orderNumbers.join(', #')})` : '';
    const extraNote = customNotes.trim() ? `\nNote: ${customNotes.trim()}` : '';

    if (language === 'hi') {
      return `Namaste ${target.shopName} (${target.ownerName})!\n${settings.businessName} se Payment Reminder:\nAapka kul overdue balance ₹${target.totalOverdue.toLocaleString('en-IN')} baaki hai (Udhaar: ₹${target.udhaarDue.toLocaleString('en-IN')}, Order Balance: ₹${target.balanceDue.toLocaleString('en-IN')})${ordersPart}.\nWholesale rule ke mutabik agle order dispatch se pehle kripya UPI ID ${settings.upiId} par payment clear karein.\nCall: ${settings.ownerPhone}${extraNote}\nDhanyawad!`;
    }
    if (language === 'or') {
      return `Namaskar ${target.shopName} (${target.ownerName})!\n${settings.businessName} tarapharu Payment Reminder:\nApananka total overdue ₹${target.totalOverdue.toLocaleString('en-IN')} baki achhi (Udhaar: ₹${target.udhaarDue.toLocaleString('en-IN')}, Order Balance: ₹${target.balanceDue.toLocaleString('en-IN')})${ordersPart}.\nNua order dispatch purbaru daya kari UPI ID ${settings.upiId} re payment clear karantu.\nCall: ${settings.ownerPhone}${extraNote}\nDhanyabad!`;
    }
    return `Namaste ${target.shopName} (${target.ownerName})!\nPayment Reminder from ${settings.businessName}, ${settings.businessAddress}:\nYour overdue amount is ₹${target.totalOverdue.toLocaleString('en-IN')} (Udhaar: ₹${target.udhaarDue.toLocaleString('en-IN')}, Balance: ₹${target.balanceDue.toLocaleString('en-IN')})${ordersPart}.\nAs per wholesale policy, please clear dues before your next dispatch via UPI: ${settings.upiId}.\nPhone: ${settings.ownerPhone}${extraNote}\nThank you!`;
  };

  const buildSupplierMessage = (target: SupplierLowStockTarget) => {
    const itemsList = target.items
      .map(
        ({ product, suggestedOrderPkts }) =>
          `• ${product.name} (${product.sku}): Only ${product.packetStock} pkts left (Min ${product.reorderLevel}) -> Need ${suggestedOrderPkts} pkts (${product.packSize} pcs/pkt)`
      )
      .join('\n');
    const extraNote = customNotes.trim() ? `\nNote: ${customNotes.trim()}` : '';

    if (language === 'hi') {
      return `Namaste ${target.supplierName}!\n${settings.businessName} se Urgent Low Stock Reminder:\nNiche diye cosmetic products ka stock kam ho gaya hai:\n${itemsList}\nKripya jaldi wholesale rate aur dispatch timeline share karein.\nContact: ${settings.ownerName} (${settings.ownerPhone})${extraNote}\nDhanyawad!`;
    }
    if (language === 'or') {
      return `Namaskar ${target.supplierName}!\n${settings.businessName} ru Urgent Low Stock Reminder:\nEi products ra stock kam heijaichi:\n${itemsList}\nDaya kari shighra rate o dispatch date janantu.\nContact: ${settings.ownerName} (${settings.ownerPhone})${extraNote}\nDhanyabad!`;
    }
    return `Namaste ${target.supplierName}!\nUrgent Low Stock Restock Reminder from ${settings.businessName}:\nThe following items are below reorder level:\n${itemsList}\nPlease confirm latest rate & earliest dispatch date (Lead time ~${target.leadTimeDays} days).\nContact: ${settings.ownerName} (${settings.ownerPhone})${extraNote}\nThank you!`;
  };

  const recordDispatch = (
    targetId: string,
    targetName: string,
    phone: string,
    via: 'WhatsApp' | 'SMS' | 'WhatsApp + SMS',
    summary: string
  ) => {
    const nowTime = new Date().toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
    setSentMap((prev) => ({ ...prev, [targetId]: { channel: via, at: nowTime } }));

    const newLog: ReminderDispatchLog = {
      id: `rem-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      mode,
      targetId,
      targetName,
      phone,
      channel: via,
      summary,
      timestamp: `Today, ${nowTime}`,
    };
    setRecentLogs((prev) => {
      const next = [newLog, ...prev].slice(0, 25);
      try {
        localStorage.setItem(LOG_KEY, JSON.stringify(next));
      } catch {
        // ignore storage quota errors
      }
      return next;
    });

    logActivity(
      mode === 'retailer_payment' ? 'Payment Reminder Sent' : 'Low Stock Reminder Sent',
      `${via} reminder to ${targetName} (${phone}): ${summary}`
    );
  };

  const handleToggleAutoSchedule = () => {
    const next: AutoReminderSettings =
      mode === 'retailer_payment'
        ? {
            ...autoSettings,
            paymentAutoEnabled: !autoSettings.paymentAutoEnabled,
            paymentChannel: channel,
          }
        : {
            ...autoSettings,
            stockAutoEnabled: !autoSettings.stockAutoEnabled,
            stockChannel: channel,
          };
    setAutoSettings(next);
    saveAutoReminderSettings(next);
    const enabledNow =
      mode === 'retailer_payment' ? next.paymentAutoEnabled : next.stockAutoEnabled;
    showToast(
      enabledNow
        ? `Auto-Reminder enabled (${mode === 'retailer_payment' ? next.paymentTime : next.stockTime})`
        : 'Auto-Reminder paused',
      'info'
    );
  };

  const handleChannelChange = (nextChannel: ReminderChannel) => {
    setChannel(nextChannel);
    const next: AutoReminderSettings =
      mode === 'retailer_payment'
        ? { ...autoSettings, paymentChannel: nextChannel }
        : { ...autoSettings, stockChannel: nextChannel };
    setAutoSettings(next);
    saveAutoReminderSettings(next);
  };

  const handleRunAutomatedBatch = () => {
    if (selectedIds.length === 0) {
      showToast('Select at least one recipient first', 'error');
      return;
    }

    const channelLabel: 'WhatsApp' | 'SMS' | 'WhatsApp + SMS' =
      channel === 'whatsapp' ? 'WhatsApp' : channel === 'sms' ? 'SMS' : 'WhatsApp + SMS';

    if (mode === 'retailer_payment') {
      const chosen = retailerTargets.filter((t) => selectedIds.includes(t.id));
      chosen.forEach((t) => {
        recordDispatch(
          t.id,
          t.shopName,
          t.phone,
          channelLabel,
          `Overdue ₹${t.totalOverdue.toLocaleString('en-IN')}`
        );
      });

      const updatedAuto = {
        ...autoSettings,
        lastPaymentAutoRun: new Date().toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };
      setAutoSettings(updatedAuto);
      saveAutoReminderSettings(updatedAuto);

      addNotification({
        title: `Payment Reminders Queued (${chosen.length})`,
        message: `Automated ${channelLabel} payment reminders prepared for ${chosen
          .slice(0, 3)
          .map((c) => c.shopName)
          .join(', ')}${chosen.length > 3 ? ` +${chosen.length - 3} more` : ''}.`,
        type: 'udhaar',
        priority: 'high',
        linkTab: 'khata',
      });

      showToast(
        `${chosen.length} Retailer Payment Reminder(s) ready via ${channelLabel}! Tap WhatsApp/SMS below to launch app.`,
        'success'
      );
    } else {
      const chosen = supplierTargets.filter((t) => selectedIds.includes(t.id));
      chosen.forEach((t) => {
        recordDispatch(
          t.id,
          t.supplierName,
          t.phone,
          channelLabel,
          `${t.items.length} low-stock SKU(s)`
        );
      });

      const updatedAuto = {
        ...autoSettings,
        lastStockAutoRun: new Date().toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };
      setAutoSettings(updatedAuto);
      saveAutoReminderSettings(updatedAuto);

      addNotification({
        title: `Supplier Low Stock Reminders (${chosen.length})`,
        message: `Automated ${channelLabel} restock alerts prepared for ${chosen
          .map((s) => s.supplierName)
          .join(', ')}.`,
        type: 'stock',
        priority: 'high',
        linkTab: 'stock',
      });

      showToast(
        `${chosen.length} Supplier Low Stock Reminder(s) ready via ${channelLabel}!`,
        'success'
      );
    }
  };

  const isPaymentMode = mode === 'retailer_payment';
  const totalCount = isPaymentMode ? retailerTargets.length : supplierTargets.length;
  const isAutoOn = isPaymentMode
    ? autoSettings.paymentAutoEnabled
    : autoSettings.stockAutoEnabled;
  const autoTime = isPaymentMode ? autoSettings.paymentTime : autoSettings.stockTime;
  const filteredRecentLogs = recentLogs.filter((l) => l.mode === mode).slice(0, 5);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/55 backdrop-blur-xs p-0 sm:p-4">
      <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div
          className={`px-4 py-3.5 border-b flex items-center justify-between gap-2 ${
            isPaymentMode
              ? 'bg-gradient-to-r from-rose-50 via-white to-amber-50 border-rose-100'
              : 'bg-gradient-to-r from-amber-50 via-white to-emerald-50 border-amber-100'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-sm shrink-0 ${
                isPaymentMode ? 'bg-rose-600' : 'bg-amber-600'
              }`}
            >
              <BellRing className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-black text-slate-900 truncate">
                {isPaymentMode
                  ? tr('Payment Reminder', language)
                  : tr('Supplier Low Stock Reminder', language)}
              </h3>
              <p className="text-[11px] text-slate-500 truncate">
                {isPaymentMode
                  ? `${totalCount} Retailers with overdue Udhaar / Balance`
                  : `${totalCount} Suppliers mapped to low-stock SKUs`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center shrink-0"
            aria-label="Close reminder modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
          {/* Auto-Schedule & Channel Config Card */}
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Clock className="w-4 h-4 text-sky-600 shrink-0" />
                <div className="min-w-0">
                  <span className="text-xs font-extrabold text-slate-900 block truncate">
                    {tr('Auto-Schedule Reminders', language)}
                  </span>
                  <span className="text-[10px] text-slate-500 block truncate">
                    Daily {autoTime} •{' '}
                    {isPaymentMode
                      ? 'Auto-check overdue shops'
                      : 'Auto-alert low stock SKUs'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleToggleAutoSchedule}
                className={`px-2.5 py-1 rounded-full text-[10px] font-black border transition shrink-0 ${
                  isAutoOn
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                    : 'bg-white text-slate-600 border-slate-300'
                }`}
              >
                {isAutoOn ? 'AUTO: ON' : 'AUTO: OFF'}
              </button>
            </div>

            {/* Channel Selector */}
            <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-slate-200/70">
              {(
                [
                  { id: 'whatsapp', label: 'WhatsApp', Icon: MessageSquare },
                  { id: 'sms', label: 'SMS', Icon: Smartphone },
                  { id: 'both', label: 'WA + SMS', Icon: Sparkles },
                ] as const
              ).map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleChannelChange(id)}
                  className={`py-1.5 px-2 rounded-xl text-[11px] font-bold border flex items-center justify-center gap-1 transition ${
                    channel === id
                      ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{label}</span>
                </button>
              ))}
            </div>

            {/* Optional Custom Note appended to automated message */}
            <input
              type="text"
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              placeholder={
                isPaymentMode
                  ? 'Optional custom note (e.g. Van arrives tomorrow 11 AM)...'
                  : 'Optional restock note (e.g. Send via Odisha Roadways)...'
              }
              className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* Selection Header */}
          {totalCount > 0 && (
            <div className="flex items-center justify-between px-1">
              <button
                type="button"
                onClick={toggleSelectAll}
                className="text-xs font-extrabold text-sky-700 hover:text-sky-900 flex items-center gap-1.5"
              >
                <span
                  className={`w-4 h-4 rounded border flex items-center justify-center ${
                    selectedIds.length === totalCount
                      ? 'bg-sky-600 border-sky-600 text-white'
                      : 'bg-white border-slate-300'
                  }`}
                >
                  {selectedIds.length === totalCount && <Check className="w-3 h-3 stroke-[3]" />}
                </span>
                <span>
                  {selectedIds.length === totalCount
                    ? `Deselect All (${totalCount})`
                    : `Select All (${totalCount})`}
                </span>
              </button>

              <span className="text-[11px] font-bold text-slate-500">
                {selectedIds.length} selected
              </span>
            </div>
          )}

          {/* Targets List */}
          {isPaymentMode ? (
            retailerTargets.length === 0 ? (
              <div className="p-6 text-center rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-1">
                <CheckCircle2 className="w-9 h-9 text-emerald-500 mx-auto" />
                <h4 className="text-xs font-extrabold text-slate-900">
                  No Overdue Retailer Payments
                </h4>
                <p className="text-[11px] text-slate-500">
                  All retailers have cleared their Udhaar and overdue balances.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {retailerTargets.map((target) => {
                  const isSelected = selectedIds.includes(target.id);
                  const msg = buildRetailerMessage(target);
                  const sentInfo = sentMap[target.id];
                  const isPreviewOpen = expandedPreviewId === target.id;

                  return (
                    <div
                      key={target.id}
                      className={`p-3 rounded-2xl border transition space-y-2 ${
                        isSelected
                          ? 'bg-white border-rose-300 shadow-xs'
                          : 'bg-slate-50/70 border-slate-200 opacity-80'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => toggleId(target.id)}
                          className="flex items-start gap-2 text-left min-w-0 flex-1"
                        >
                          <span
                            className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                              isSelected
                                ? 'bg-rose-600 border-rose-600 text-white'
                                : 'bg-white border-slate-300'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Store className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                              <h4 className="text-xs sm:text-sm font-black text-slate-900 truncate">
                                {target.shopName}
                              </h4>
                              {sentInfo && (
                                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  Sent ({sentInfo.channel}) ✓
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 truncate mt-0.5">
                              {target.ownerName} • {target.phone}
                            </p>
                            <div className="flex items-center gap-1.5 flex-wrap mt-1">
                              {target.udhaarDue > 0 && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                                  Udhaar: ₹{target.udhaarDue.toLocaleString('en-IN')}
                                </span>
                              )}
                              {target.balanceDue > 0 && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                                  Balance: ₹{target.balanceDue.toLocaleString('en-IN')}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>

                        <div className="text-right shrink-0">
                          <span className="text-[9px] font-bold text-slate-400 uppercase block">
                            Overdue
                          </span>
                          <span className="text-sm sm:text-base font-black text-rose-600">
                            ₹{target.totalOverdue.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>

                      {isPreviewOpen && (
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-700 whitespace-pre-line font-medium">
                          {msg}
                        </div>
                      )}

                      {/* Direct Channel Actions */}
                      <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 flex-wrap">
                        <a
                          href={buildWhatsAppHref(target.phone, msg)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() =>
                            recordDispatch(
                              target.id,
                              target.shopName,
                              target.phone,
                              'WhatsApp',
                              `Overdue ₹${target.totalOverdue.toLocaleString('en-IN')}`
                            )
                          }
                          className="flex-1 min-w-[100px] py-1.5 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center justify-center gap-1 shadow-2xs active:scale-95 transition"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </a>

                        <a
                          href={buildSmsHref(target.phone, msg)}
                          onClick={() =>
                            recordDispatch(
                              target.id,
                              target.shopName,
                              target.phone,
                              'SMS',
                              `Overdue ₹${target.totalOverdue.toLocaleString('en-IN')}`
                            )
                          }
                          className="flex-1 min-w-[85px] py-1.5 px-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-[11px] flex items-center justify-center gap-1 shadow-2xs active:scale-95 transition"
                        >
                          <Smartphone className="w-3.5 h-3.5" />
                          <span>SMS</span>
                        </a>

                        <button
                          type="button"
                          onClick={() =>
                            setExpandedPreviewId(isPreviewOpen ? null : target.id)
                          }
                          className="py-1.5 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px]"
                        >
                          {isPreviewOpen ? 'Hide' : 'Preview'}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(msg);
                            showToast(`Copied message for ${target.shopName}`);
                          }}
                          className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600"
                          title="Copy message"
                          aria-label="Copy message"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : supplierTargets.length === 0 ? (
            <div className="p-6 text-center rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-1">
              <Package className="w-9 h-9 text-emerald-500 mx-auto" />
              <h4 className="text-xs font-extrabold text-slate-900">All Stock Levels Healthy</h4>
              <p className="text-[11px] text-slate-500">
                No low-stock products need supplier restock reminders right now.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {supplierTargets.map((target) => {
                const isSelected = selectedIds.includes(target.id);
                const msg = buildSupplierMessage(target);
                const sentInfo = sentMap[target.id];
                const isPreviewOpen = expandedPreviewId === target.id;

                return (
                  <div
                    key={target.id}
                    className={`p-3 rounded-2xl border transition space-y-2 ${
                      isSelected
                        ? 'bg-white border-amber-300 shadow-xs'
                        : 'bg-slate-50/70 border-slate-200 opacity-80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => toggleId(target.id)}
                        className="flex items-start gap-2 text-left min-w-0 flex-1"
                      >
                        <span
                          className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'bg-amber-600 border-amber-600 text-white'
                              : 'bg-white border-slate-300'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Building2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <h4 className="text-xs sm:text-sm font-black text-slate-900 truncate">
                              {target.supplierName}
                            </h4>
                            {sentInfo && (
                              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                                Sent ({sentInfo.channel}) ✓
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">
                            {target.contactPerson} • {target.phone}
                          </p>
                        </div>
                      </button>

                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-700 border border-rose-200 shrink-0">
                        {target.items.length} Low SKUs
                      </span>
                    </div>

                    {/* Low Stock SKUs for this Supplier */}
                    <div className="space-y-1.5 bg-amber-50/60 p-2 rounded-xl border border-amber-100">
                      {target.items.map(({ product, suggestedOrderPkts }) => (
                        <div
                          key={product.id}
                          className="flex items-center justify-between gap-2 text-[11px] bg-white p-1.5 rounded-lg border border-amber-100/80"
                        >
                          <div className="min-w-0 flex-1">
                            <span className="font-bold text-slate-800 block truncate">
                              {product.name}
                            </span>
                            <span className="text-[10px] text-rose-600 font-semibold">
                              Stock: {product.packetStock} pkts (Min: {product.reorderLevel})
                            </span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-[9px] font-bold text-slate-500">Req:</span>
                            <input
                              type="number"
                              min={1}
                              value={suggestedOrderPkts}
                              onChange={(e) =>
                                setRestockOverrides((prev) => ({
                                  ...prev,
                                  [product.id]: Math.max(1, Number(e.target.value) || 1),
                                }))
                              }
                              className="w-12 px-1.5 py-0.5 rounded bg-slate-50 border border-slate-200 text-center text-[11px] font-black text-slate-900"
                              aria-label={`Order quantity for ${product.name}`}
                            />
                            <span className="text-[9px] text-slate-500">pkt</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {isPreviewOpen && (
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-700 whitespace-pre-line font-medium">
                        {msg}
                      </div>
                    )}

                    {/* Direct Channel Actions */}
                    <div className="pt-1 flex items-center gap-1.5 flex-wrap">
                      <a
                        href={buildWhatsAppHref(target.phone, msg)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() =>
                          recordDispatch(
                            target.id,
                            target.supplierName,
                            target.phone,
                            'WhatsApp',
                            `${target.items.length} low-stock SKU(s)`
                          )
                        }
                        className="flex-1 min-w-[100px] py-1.5 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center justify-center gap-1 shadow-2xs active:scale-95 transition"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </a>

                      <a
                        href={buildSmsHref(target.phone, msg)}
                        onClick={() =>
                          recordDispatch(
                            target.id,
                            target.supplierName,
                            target.phone,
                            'SMS',
                            `${target.items.length} low-stock SKU(s)`
                          )
                        }
                        className="flex-1 min-w-[85px] py-1.5 px-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-[11px] flex items-center justify-center gap-1 shadow-2xs active:scale-95 transition"
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                        <span>SMS</span>
                      </a>

                      <button
                        type="button"
                        onClick={() =>
                          setExpandedPreviewId(isPreviewOpen ? null : target.id)
                        }
                        className="py-1.5 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px]"
                      >
                        {isPreviewOpen ? 'Hide' : 'Preview'}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(msg);
                          showToast(`Copied low-stock alert for ${target.supplierName}`);
                        }}
                        className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600"
                        title="Copy message"
                        aria-label="Copy message"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Recent Reminder Dispatch Log */}
          {filteredRecentLogs.length > 0 && (
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Recent Automated Reminders ({filteredRecentLogs.length})
                </span>
                <AlertTriangle className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <div className="space-y-1">
                {filteredRecentLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between gap-2 text-[10px] bg-white px-2.5 py-1.5 rounded-lg border border-slate-100"
                  >
                    <div className="min-w-0">
                      <span className="font-bold text-slate-800 truncate block">
                        {log.targetName} • {log.summary}
                      </span>
                      <span className="text-slate-400">{log.timestamp}</span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 shrink-0">
                      {log.channel}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Batch Action */}
        <div className="px-4 py-3 border-t border-slate-100 bg-white flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
          >
            {tr('Close', language)}
          </button>

          <button
            type="button"
            disabled={selectedIds.length === 0}
            onClick={handleRunAutomatedBatch}
            className={`flex-1 py-2.5 px-4 rounded-xl text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-98 transition disabled:opacity-45 disabled:cursor-not-allowed ${
              isPaymentMode
                ? 'bg-gradient-to-r from-rose-600 to-amber-600'
                : 'bg-gradient-to-r from-amber-600 to-emerald-600'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>
              {tr('Send Automated Batch', language)} ({selectedIds.length})
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
