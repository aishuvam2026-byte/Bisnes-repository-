import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { tr } from '../data/translations';
import {
  Order,
  OrderStatus,
  Customer,
  UdhaarRecord,
  ReturnRequest,
} from '../types';
import {
  Truck,
  CheckCircle2,
  Clock,
  AlertOctagon,
  AlertTriangle,
  RotateCcw,
  Phone,
  MessageSquare,
  Search,
  X,
  ChevronRight,
  Eye,
  Wallet,
  Store,
  MapPin,
  ExternalLink,
  FileText,
  Check,
  LayoutList,
  LayoutGrid,
} from 'lucide-react';

export type AttentionCategory =
  | 'all'
  | 'dispatch'
  | 'confirm'
  | 'pending'
  | 'hold'
  | 'late'
  | 'return';

interface NeedsAttentionTableProps {
  orders: Order[];
  returns: ReturnRequest[];
  udhaar: UdhaarRecord[];
  customers: Customer[];
  activeCategory: AttentionCategory;
  onSelectCategory: (cat: AttentionCategory) => void;
  onUpdateOrderStatus: (orderId: string, status: OrderStatus, note?: string) => void;
  onResolveReturn: (
    returnId: string,
    status: 'APPROVED' | 'REJECTED',
    outcome?: 'Replacement' | 'Credit note' | 'Rejected',
    note?: string
  ) => void;
  onOpenOrderDetails?: (order: Order) => void;
}

export const NeedsAttentionTable: React.FC<NeedsAttentionTableProps> = ({
  orders,
  returns,
  udhaar,
  customers,
  activeCategory,
  onSelectCategory,
  onUpdateOrderStatus,
  onResolveReturn,
  onOpenOrderDetails,
}) => {
  const { language } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');
  const [statusModalOrder, setStatusModalOrder] = useState<Order | null>(null);
  const [returnModalItem, setReturnModalItem] = useState<ReturnRequest | null>(null);
  const [selectedNewStatus, setSelectedNewStatus] = useState<OrderStatus>('Dispatched');
  const [statusNote, setStatusNote] = useState('');

  const SIMULATED_TODAY = '2026-11-09';

  const isOverdue = (dateStr?: string) => {
    if (!dateStr) return false;
    return dateStr < SIMULATED_TODAY;
  };

  const getOverdueDays = (dateStr?: string) => {
    if (!dateStr) return 0;
    const d1 = new Date(dateStr).getTime();
    const d2 = new Date(SIMULATED_TODAY).getTime();
    const diff = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  };

  // Grouped Data Items
  const dispatchOrders = useMemo(
    () => orders.filter((o) => o.status === 'Packed' || (o.status === 'Dispatched' && !o.deliveredDate)),
    [orders]
  );

  const confirmOrders = useMemo(
    () => orders.filter((o) => o.status === 'Booked' && o.advancePaid),
    [orders]
  );

  const pendingOrders = useMemo(
    () => orders.filter((o) => o.status === 'Advance Pending' || o.status === 'Enquiry'),
    [orders]
  );

  const holdOrders = useMemo(
    () => orders.filter((o) => o.status === 'On Hold'),
    [orders]
  );

  const lateOrders = useMemo(
    () =>
      orders.filter(
        (o) =>
          o.expectedDeliveryDate &&
          isOverdue(o.expectedDeliveryDate) &&
          o.status !== 'Delivered' &&
          o.status !== 'Cancelled' &&
          o.status !== 'Returned'
      ),
    [orders]
  );

  const returnClaims = useMemo(
    () => returns.filter((r) => r.status === 'PENDING' || r.status === 'APPROVED'),
    [returns]
  );

  // Category counts with English labels
  const categoryTabs = [
    {
      id: 'all' as const,
      label: 'All Tasks',
      hinglishLabel: 'Total action items',
      count:
        dispatchOrders.length +
        confirmOrders.length +
        pendingOrders.length +
        holdOrders.length +
        lateOrders.length +
        returnClaims.length,
      color: 'bg-slate-900 text-white',
      badgeColor: 'bg-slate-100 text-slate-800',
      icon: LayoutList,
    },
    {
      id: 'dispatch' as const,
      label: 'Dispatch',
      hinglishLabel: 'Packed & ready to ship',
      count: dispatchOrders.length,
      color: 'bg-blue-600 text-white',
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
      icon: Truck,
    },
    {
      id: 'confirm' as const,
      label: 'Confirmed',
      hinglishLabel: 'Advance received',
      count: confirmOrders.length,
      color: 'bg-emerald-600 text-white',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: CheckCircle2,
    },
    {
      id: 'pending' as const,
      label: 'Pending',
      hinglishLabel: 'Advance pending',
      count: pendingOrders.length,
      color: 'bg-amber-600 text-white',
      badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
      icon: Clock,
    },
    {
      id: 'hold' as const,
      label: 'On Hold',
      hinglishLabel: 'Udhaar / payment hold',
      count: holdOrders.length,
      color: 'bg-rose-600 text-white',
      badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
      icon: AlertOctagon,
    },
    {
      id: 'late' as const,
      label: 'Delivery Delay',
      hinglishLabel: 'Delivery delay (overdue)',
      count: lateOrders.length,
      color: 'bg-red-600 text-white',
      badgeColor: 'bg-red-50 text-red-700 border-red-200',
      icon: AlertTriangle,
    },
    {
      id: 'return' as const,
      label: 'Returns',
      hinglishLabel: 'Damage claim video',
      count: returnClaims.length,
      color: 'bg-purple-600 text-white',
      badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
      icon: RotateCcw,
    },
  ];

  type UnifiedItem = {
    key: string;
    type: 'order' | 'return';
    category: 'dispatch' | 'confirm' | 'pending' | 'hold' | 'late' | 'return';
    order?: Order;
    returnClaim?: ReturnRequest;
    shopName: string;
    customerName: string;
    phone: string;
    address: string;
    distanceKm: number;
    amount: number;
    advancePaid: number;
    balanceDue: number;
    statusBadge: { text: string; bg: string; textCol: string; border: string };
    dateLabel: string;
    overdueDays: number;
    detailsSummary: string;
  };

  const allUnifiedItems: UnifiedItem[] = useMemo(() => {
    const list: UnifiedItem[] = [];

    // Dispatch items
    dispatchOrders.forEach((o) => {
      const isLate = isOverdue(o.expectedDeliveryDate);
      list.push({
        key: `disp-${o.id}`,
        type: 'order',
        category: 'dispatch',
        order: o,
        shopName: o.shopName,
        customerName: o.customerName,
        phone: o.phone,
        address: o.address,
        distanceKm: o.distanceKm,
        amount: o.totalAmount,
        advancePaid: o.advanceAmount,
        balanceDue: o.balanceAmount,
        statusBadge: {
          text: o.status === 'Packed' ? 'Ready to Ship' : 'In Transit',
          bg: 'bg-blue-50',
          textCol: 'text-blue-700',
          border: 'border-blue-200',
        },
        dateLabel: `Delivery: ${o.expectedDeliveryDate || 'Today'}`,
        overdueDays: isLate ? getOverdueDays(o.expectedDeliveryDate) : 0,
        detailsSummary: `${o.items.length} items • Total ${o.items.reduce((s, i) => s + i.packetQty, 0)} packets`,
      });
    });

    // Confirm items
    confirmOrders.forEach((o) => {
      list.push({
        key: `conf-${o.id}`,
        type: 'order',
        category: 'confirm',
        order: o,
        shopName: o.shopName,
        customerName: o.customerName,
        phone: o.phone,
        address: o.address,
        distanceKm: o.distanceKm,
        amount: o.totalAmount,
        advancePaid: o.advanceAmount,
        balanceDue: o.balanceAmount,
        statusBadge: {
          text: 'Confirmed (₹1k Advance Paid)',
          bg: 'bg-emerald-50',
          textCol: 'text-emerald-700',
          border: 'border-emerald-200',
        },
        dateLabel: `Delivery: ${o.expectedDeliveryDate}`,
        overdueDays: 0,
        detailsSummary: `${o.items.length} items • Packing in progress`,
      });
    });

    // Pending items
    pendingOrders.forEach((o) => {
      list.push({
        key: `pend-${o.id}`,
        type: 'order',
        category: 'pending',
        order: o,
        shopName: o.shopName,
        customerName: o.customerName,
        phone: o.phone,
        address: o.address,
        distanceKm: o.distanceKm,
        amount: o.totalAmount,
        advancePaid: 0,
        balanceDue: o.totalAmount,
        statusBadge: {
          text: 'Advance Pending (₹1k Due)',
          bg: 'bg-amber-50',
          textCol: 'text-amber-800',
          border: 'border-amber-200',
        },
        dateLabel: `Order Date: ${o.createdAt ? o.createdAt.split('T')[0] : 'Recent'}`,
        overdueDays: 0,
        detailsSummary: `${o.items.length} items • Advance jama hote hi booking confirm hogi`,
      });
    });

    // Hold items
    holdOrders.forEach((o) => {
      list.push({
        key: `hold-${o.id}`,
        type: 'order',
        category: 'hold',
        order: o,
        shopName: o.shopName,
        customerName: o.customerName,
        phone: o.phone,
        address: o.address,
        distanceKm: o.distanceKm,
        amount: o.totalAmount,
        advancePaid: o.advanceAmount,
        balanceDue: o.balanceAmount,
        statusBadge: {
          text: 'On Hold (Payment Check)',
          bg: 'bg-rose-50',
          textCol: 'text-rose-700',
          border: 'border-rose-200',
        },
        dateLabel: `Hold Date: ${o.expectedDeliveryDate}`,
        overdueDays: 0,
        detailsSummary: o.statusHistory?.slice(-1)[0]?.note || 'Balance payment arrange na hone ke kaaran order hold par hai',
      });
    });

    // Late items
    lateOrders.forEach((o) => {
      const days = getOverdueDays(o.expectedDeliveryDate);
      list.push({
        key: `late-${o.id}`,
        type: 'order',
        category: 'late',
        order: o,
        shopName: o.shopName,
        customerName: o.customerName,
        phone: o.phone,
        address: o.address,
        distanceKm: o.distanceKm,
        amount: o.totalAmount,
        advancePaid: o.advanceAmount,
        balanceDue: o.balanceAmount,
        statusBadge: {
          text: `${days} Days Overdue (${o.status})`,
          bg: 'bg-red-50',
          textCol: 'text-red-700',
          border: 'border-red-200',
        },
        dateLabel: `Target: ${o.expectedDeliveryDate}`,
        overdueDays: days,
        detailsSummary: o.busOrVehicleNumber ? `Vehicle: ${o.busOrVehicleNumber}` : 'Transit route delay',
      });
    });

    // Return claims
    returnClaims.forEach((r) => {
      list.push({
        key: `ret-${r.id}`,
        type: 'return',
        category: 'return',
        returnClaim: r,
        shopName: r.shopName,
        customerName: r.customerName,
        phone: r.phone,
        address: 'Shop address on profile',
        distanceKm: 0,
        amount: r.estimatedDamageValue,
        advancePaid: 0,
        balanceDue: r.estimatedDamageValue,
        statusBadge: {
          text: r.status === 'PENDING' ? 'Review Pending (Video Claim)' : 'Approved',
          bg: 'bg-purple-50',
          textCol: 'text-purple-700',
          border: 'border-purple-200',
        },
        dateLabel: `Claim: ${r.createdAt.split('T')[0]}`,
        overdueDays: 0,
        detailsSummary: `${r.itemsSummary} — ${r.damageDescription}`,
      });
    });

    return list;
  }, [dispatchOrders, confirmOrders, pendingOrders, holdOrders, lateOrders, returnClaims]);

  // Search filter
  const filteredItems = useMemo(() => {
    let result = allUnifiedItems;

    if (activeCategory !== 'all') {
      result = result.filter((item) => item.category === activeCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (item) =>
          item.shopName.toLowerCase().includes(q) ||
          item.customerName.toLowerCase().includes(q) ||
          item.phone.includes(q) ||
          item.address.toLowerCase().includes(q) ||
          item.detailsSummary.toLowerCase().includes(q) ||
          (item.order && item.order.orderNumber.toLowerCase().includes(q))
      );
    }

    return result;
  }, [allUnifiedItems, activeCategory, searchQuery]);

  // WhatsApp helper in Hinglish
  const handleSendWhatsApp = (item: UnifiedItem) => {
    let msg = '';
    const cleanPhone = item.phone.replace(/\D/g, '');

    if (item.category === 'dispatch') {
      msg = `Namaste ${item.shopName}! Rupam Wholesale (Nuapatna) se aapka order #${item.order?.orderNumber} dispatch ke liye ready hai. Total bill ₹${item.amount}, Advance jama ₹${item.advancePaid}, Baaki delivery balance ₹${item.balanceDue} cash ya UPI ready rakhein. Note: Parcel box open karte waqt continuous unboxing video zaroor banayein!`;
    } else if (item.category === 'confirm') {
      msg = `Namaste ${item.shopName}! Rupam Wholesale se aapka order #${item.order?.orderNumber} confirm ho gaya hai (₹1,000 advance receive hua). Staff maal pack kar raha hai. Expected delivery: ${item.order?.expectedDeliveryDate}.`;
    } else if (item.category === 'pending') {
      msg = `Namaste ${item.shopName}! Rupam Wholesale me aapka order save hai. Please ₹1,000 booking advance jama karein taaki order turant pack ho sake. PhonePe / GPay: 9437012345.`;
    } else if (item.category === 'hold') {
      msg = `Namaste ${item.shopName}! Rupam Wholesale se aapka order #${item.order?.orderNumber} hold par hai. Delivery se pehle please balance / udhaar clear karein taaki maal turant dispatch ho sake. Thank you - Shuvam Behera.`;
    } else if (item.category === 'late') {
      msg = `Namaste ${item.shopName}! Aapke order #${item.order?.orderNumber} ki delivery me thodi deri ke liye humein khed hai. Gaadi aaj nikal chuki hai. Kisi bhi update ke liye call karein.`;
    } else if (item.category === 'return') {
      msg = `Namaste ${item.shopName}! Rupam Wholesale: Aapka return / damage claim #${item.returnClaim?.id} receive ho gaya hai. Unboxing video verify karke replacement ya credit note diya jayega.`;
    }

    const url = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const handleOpenStatusModal = (order: Order) => {
    setStatusModalOrder(order);
    setSelectedNewStatus(order.status === 'Booked' ? 'Packed' : order.status === 'Packed' ? 'Dispatched' : 'Delivered');
    setStatusNote('');
  };

  const handleSaveStatusModal = () => {
    if (statusModalOrder) {
      onUpdateOrderStatus(statusModalOrder.id, selectedNewStatus, statusNote || `Updated via Needs Attention table`);
      setStatusModalOrder(null);
    }
  };

  return (
    <div className="space-y-3.5">
      {/* Table Header Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-4 bg-gradient-to-b from-orange-500 to-rose-500 rounded-full" />
          <div>
            <h3 className="text-xs sm:text-sm font-black text-slate-900 tracking-tight flex items-center gap-1.5">
              <span>{tr('Daily Attention Table', language)}</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-500 text-white">
                {allUnifiedItems.length} {tr('Pending', language)}
              </span>
            </h3>
            <p className="text-[10px] sm:text-[11px] text-slate-500">
              {tr('Dispatch', language)}, {tr('Confirmed', language)}, {tr('Pending', language)}, {tr('On Hold', language)}, {tr('Delivery Delay', language)} &amp; {tr('Returns', language)}
            </p>
          </div>
        </div>

        {/* Compact View Toggle (Table vs Cards) */}
        <div className="flex items-center gap-0.5 self-end sm:self-auto bg-slate-100 p-0.5 rounded-xl border border-slate-200/80">
          <button
            onClick={() => setViewMode('table')}
            className={`px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition whitespace-nowrap ${
              viewMode === 'table' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <LayoutList className="w-3 h-3" />
            <span>{tr('Table', language)}</span>
          </button>
          <button
            onClick={() => setViewMode('cards')}
            className={`px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition whitespace-nowrap ${
              viewMode === 'cards' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <LayoutGrid className="w-3 h-3" />
            <span>{tr('Cards', language)}</span>
          </button>
        </div>
      </div>

      {/* Horizontal Category Filter Tabs */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
        {categoryTabs.map((tab) => {
          const isActive = activeCategory === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectCategory(tab.id)}
              className={`shrink-0 px-2.5 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1.5 border transition-all active:scale-95 whitespace-nowrap ${
                isActive
                  ? `${tab.color} shadow-xs border-transparent`
                  : 'bg-white/80 hover:bg-white text-slate-700 border-slate-200/90'
              }`}
            >
              <Icon className="w-3 h-3" />
              <span>{tr(tab.label, language)}</span>
              <span
                className={`text-[9px] font-black px-1.5 py-0.2 rounded-full ${
                  isActive ? 'bg-white/20 text-white' : tab.badgeColor
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by shop name, mobile number, or order #..."
          className="w-full pl-9 pr-8 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl bg-white/90 border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500 shadow-2xs"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center absolute right-2.5 top-1/2 -translate-y-1/2 text-xs"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          VIEW 1: INTERACTIVE COMPACT TABLE VIEW
      ══════════════════════════════════════════════════════════════════ */}
      {viewMode === 'table' ? (
        <div className="glass-card rounded-2xl sm:rounded-3xl overflow-hidden border border-white/90 shadow-sm">
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left border-collapse text-[11px] sm:text-xs">
              <thead>
                <tr className="bg-slate-100/90 text-slate-600 font-black text-[10px] sm:text-[11px] uppercase tracking-wider border-b border-slate-200/80 whitespace-nowrap">
                  <th className="py-2 px-2 sm:py-2.5 sm:px-3">{tr('Shop & Area', language)}</th>
                  <th className="py-2 px-2 sm:py-2.5 sm:px-3">{tr('Status', language)}</th>
                  <th className="py-2 px-2 sm:py-2.5 sm:px-3">{tr('Order Details', language)}</th>
                  <th className="py-2 px-2 sm:py-2.5 sm:px-3 text-right">{tr('Amount', language)}</th>
                  <th className="py-2 px-2 sm:py-2.5 sm:px-3">{tr('Delivery', language)}</th>
                  <th className="py-2 px-2 sm:py-2.5 sm:px-3 text-center">{tr('Actions', language)}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/80">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-400">
                      <p className="font-bold text-slate-600">{tr('No records found', language)}</p>
                      <p className="text-[10px] mt-0.5">Selected category me koi pending task nahi hai.</p>
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => (
                    <tr
                      key={item.key}
                      className="hover:bg-sky-50/40 transition-colors group"
                    >
                      {/* Col 1: Shop & Contact */}
                      <td className="py-2 px-2 sm:py-2.5 sm:px-3">
                        <div className="font-extrabold text-slate-900 group-hover:text-sky-700 flex items-center gap-1 max-w-[135px] sm:max-w-[180px]">
                          <Store className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{item.shopName}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-medium truncate max-w-[135px] sm:max-w-[180px]">
                          {item.customerName} • {item.phone}
                        </div>
                        <div className="text-[9px] text-slate-400 truncate max-w-[130px] sm:max-w-[180px]">
                          {item.address} {item.distanceKm > 0 ? `(${item.distanceKm} km)` : ''}
                        </div>
                      </td>

                      {/* Col 2: Category & Status */}
                      <td className="py-2 px-2 sm:py-2.5 sm:px-3 whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold border leading-none ${item.statusBadge.bg} ${item.statusBadge.textCol} ${item.statusBadge.border}`}
                        >
                          {item.statusBadge.text}
                        </span>
                        {item.overdueDays > 0 && (
                          <div className="mt-1 text-[9px] font-black text-red-600 flex items-center gap-0.5">
                            <AlertTriangle className="w-2.5 h-2.5 text-red-500" />
                            <span>{item.overdueDays}d Delay</span>
                          </div>
                        )}
                      </td>

                      {/* Col 3: Details */}
                      <td className="py-2 px-2 sm:py-2.5 sm:px-3">
                        {item.order && (
                          <span className="text-[10px] sm:text-[11px] font-mono font-bold text-sky-700 block">
                            #{item.order.orderNumber}
                          </span>
                        )}
                        {item.returnClaim && (
                          <span className="text-[10px] sm:text-[11px] font-mono font-bold text-purple-700 block">
                            Claim #{item.returnClaim.id}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-600 line-clamp-1 max-w-[115px] sm:max-w-[160px]">
                          {item.detailsSummary}
                        </span>
                      </td>

                      {/* Col 4: Amount & Dues */}
                      <td className="py-2 px-2 sm:py-2.5 sm:px-3 text-right whitespace-nowrap">
                        <div className="font-black text-slate-900 text-[11px] sm:text-xs">
                          ₹{item.amount.toLocaleString('en-IN')}
                        </div>
                        {item.type === 'order' && (
                          <div className="text-[9px] sm:text-[10px] text-slate-500">
                            {item.balanceDue > 0 ? (
                              <span className="text-amber-700 font-bold">
                                Due: ₹{item.balanceDue.toLocaleString('en-IN')}
                              </span>
                            ) : (
                              <span className="text-emerald-700 font-bold">{tr('Paid ✓', language)}</span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Col 5: Delivery / Date */}
                      <td className="py-2 px-2 sm:py-2.5 sm:px-3 whitespace-nowrap">
                        <span className="text-[10px] sm:text-[11px] font-medium text-slate-700 block">
                          {item.dateLabel}
                        </span>
                        {item.order?.busOrVehicleNumber && (
                          <span className="text-[9px] text-slate-500 truncate max-w-[100px] sm:max-w-[140px] block">
                            {item.order.busOrVehicleNumber}
                          </span>
                        )}
                      </td>

                      {/* Col 6: Quick Actions */}
                      <td className="py-2 px-2 sm:py-2.5 sm:px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <a
                            href={`tel:${item.phone}`}
                            title="Call Shop"
                            className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 flex items-center justify-center transition"
                          >
                            <Phone className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                          </a>

                          <button
                            onClick={() => handleSendWhatsApp(item)}
                            title="Send WhatsApp"
                            className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-green-500 text-white hover:bg-green-600 flex items-center justify-center transition"
                          >
                            <MessageSquare className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                          </button>

                          {item.type === 'order' && item.order && (
                            <button
                              onClick={() => handleOpenStatusModal(item.order!)}
                              title="Update Status"
                              className="px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-lg bg-sky-100 text-sky-700 hover:bg-sky-200 text-[10px] font-bold flex items-center gap-1 transition"
                            >
                              <span>{tr('Update', language)}</span>
                            </button>
                          )}

                          {item.type === 'return' && item.returnClaim && (
                            <button
                              onClick={() => setReturnModalItem(item.returnClaim!)}
                              title="Review Claim"
                              className="px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-lg bg-purple-100 text-purple-700 hover:bg-purple-200 text-[10px] font-bold flex items-center gap-1 transition"
                            >
                              <span>{tr('Review', language)}</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ══════════════════════════════════════════════════════════════════
            VIEW 2: CARDS VIEW
        ══════════════════════════════════════════════════════════════════ */
        <div className="space-y-2">
          {filteredItems.length === 0 ? (
            <div className="glass-card rounded-2xl sm:rounded-3xl p-5 text-center text-slate-400 border border-white/90">
              <p className="font-bold text-slate-600 text-xs sm:text-sm">No pending tasks</p>
              <p className="text-[11px] mt-0.5">Everything is on schedule!</p>
            </div>
          ) : (
            filteredItems.map((item) => (
              <div
                key={item.key}
                className="glass-card rounded-2xl sm:rounded-3xl p-3 sm:p-4 border border-white/90 shadow-xs relative overflow-hidden space-y-2.5 bg-white/85"
              >
                {/* Header: Shop Name + Category Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-black text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
                      <Store className="w-3.5 h-3.5 text-slate-400" />
                      <span>{item.shopName}</span>
                    </h4>
                    <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium mt-0.5">
                      {item.customerName} • {item.phone}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold border shrink-0 ${item.statusBadge.bg} ${item.statusBadge.textCol} ${item.statusBadge.border}`}
                  >
                    {item.statusBadge.text}
                  </span>
                </div>

                {/* Overdue Warning if late */}
                {item.overdueDays > 0 && (
                  <div className="p-2 rounded-xl bg-red-50 border border-red-200 flex items-center justify-between text-xs text-red-700 font-bold">
                    <span className="flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                      Target delivery se {item.overdueDays} din late hai!
                    </span>
                    <span className="text-[10px] text-red-600 font-normal">
                      Vehicle & shopkeeper ko update karein
                    </span>
                  </div>
                )}

                {/* Order Details & Amount Grid */}
                <div className="p-2.5 rounded-2xl bg-slate-50/80 border border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-sky-700 block">
                      {item.order ? `#${item.order.orderNumber}` : `Claim #${item.returnClaim?.id}`}
                    </span>
                    <span className="text-[11px] text-slate-600 line-clamp-1">
                      {item.detailsSummary}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {item.dateLabel}
                    </span>
                  </div>

                  <div className="text-right shrink-0 pl-2">
                    <span className="font-black text-slate-900 text-sm block">
                      ₹{item.amount.toLocaleString('en-IN')}
                    </span>
                    {item.balanceDue > 0 ? (
                      <span className="text-[10px] font-bold text-amber-700">
                        Due: ₹{item.balanceDue}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-emerald-600">{tr('Paid ✓', language)}</span>
                    )}
                  </div>
                </div>

                {/* Action Buttons Bar */}
                <div className="pt-1 flex items-center gap-2">
                  <a
                    href={`tel:${item.phone}`}
                    className="flex-1 py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center gap-1 border border-emerald-200 transition"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call</span>
                  </a>

                  <button
                    onClick={() => handleSendWhatsApp(item)}
                    className="flex-1 py-2 px-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-2xs transition"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </button>

                  {item.type === 'order' && item.order && (
                    <button
                      onClick={() => handleOpenStatusModal(item.order!)}
                      className="py-2 px-3.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-2xs transition"
                    >
                      <span>{tr('Update', language)}</span>
                    </button>
                  )}

                  {item.type === 'return' && item.returnClaim && (
                    <button
                      onClick={() => setReturnModalItem(item.returnClaim!)}
                      className="py-2 px-3.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-2xs transition"
                    >
                      <span>{tr('Review Claim', language)}</span>
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          MODAL 1: QUICK STATUS CHANGE MODAL
      ══════════════════════════════════════════════════════════════════ */}
      {statusModalOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Update Order Status</h3>
                <p className="text-[11px] text-slate-500">
                  {statusModalOrder.shopName} (#{statusModalOrder.orderNumber})
                </p>
              </div>
              <button
                onClick={() => setStatusModalOrder(null)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Current details */}
            <div className="p-3 rounded-2xl bg-slate-50 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Current Status:</span>
                <span className="font-bold text-slate-800">{statusModalOrder.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Bill Amount:</span>
                <span className="font-bold text-slate-800">₹{statusModalOrder.totalAmount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Remaining Balance:</span>
                <span className="font-bold text-amber-700">₹{statusModalOrder.balanceAmount}</span>
              </div>
            </div>

            {/* New Status Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Select New Status:</label>
              <div className="grid grid-cols-2 gap-2">
                {(['Booked', 'Packed', 'Dispatched', 'Delivered', 'On Hold'] as OrderStatus[]).map((st) => (
                  <button
                    key={st}
                    onClick={() => setSelectedNewStatus(st)}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition ${
                      selectedNewStatus === st
                        ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {st === 'Booked' && '✅ Order Confirm'}
                    {st === 'Packed' && '📦 Packed (Ready)'}
                    {st === 'Dispatched' && '🚚 Dispatched (Transit)'}
                    {st === 'Delivered' && '🎉 Delivered (Done)'}
                    {st === 'On Hold' && '🛑 On Hold (Block)'}
                  </button>
                ))}
              </div>
            </div>

            {/* Note input */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Note / Reason (Optional):</label>
              <input
                type="text"
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                placeholder="e.g. Balance received via UPI / Loaded in Van"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
              />
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleSaveStatusModal}
                className="flex-1 py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-xs transition"
              >
                {tr('Save Status', language)}
              </button>
              <button
                onClick={() => setStatusModalOrder(null)}
                className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
              >
                {tr('Cancel', language)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          MODAL 2: RETURN CLAIM RESOLUTION MODAL
      ══════════════════════════════════════════════════════════════════ */}
      {returnModalItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Return Claim Review</h3>
                <p className="text-[11px] text-slate-500">
                  {returnModalItem.shopName} (Claim #{returnModalItem.id})
                </p>
              </div>
              <button
                onClick={() => setReturnModalItem(null)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-purple-50/70 border border-purple-100 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Damage Details:</span>
                <span className="font-bold text-purple-950">{returnModalItem.itemsSummary}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Estimated Value:</span>
                <span className="font-bold text-purple-900">₹{returnModalItem.estimatedDamageValue}</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-purple-200/60">
                <span className="text-slate-500">Unboxing Video:</span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                  Sealed Parcel Video Available ✅
                </span>
              </div>
              <p className="text-[11px] text-slate-600 mt-1 italic">
                "{returnModalItem.damageDescription}"
              </p>
            </div>

            {/* Resolution Buttons */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-700 block">Choose Decision:</span>
              <button
                onClick={() => {
                  onResolveReturn(returnModalItem.id, 'APPROVED', 'Replacement', 'Approved for next dispatch');
                  setReturnModalItem(null);
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition"
              >
                <Check className="w-4 h-4" /> Agli delivery me replacement dein
              </button>

              <button
                onClick={() => {
                  onResolveReturn(returnModalItem.id, 'APPROVED', 'Credit note', 'Credit note ₹' + returnModalItem.estimatedDamageValue);
                  setReturnModalItem(null);
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition"
              >
                <Wallet className="w-4 h-4" /> Agle bill me ₹{returnModalItem.estimatedDamageValue} credit note dein
              </button>

              <button
                onClick={() => {
                  onResolveReturn(returnModalItem.id, 'REJECTED', 'Rejected', 'Unboxing video invalid');
                  setReturnModalItem(null);
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
              >
                Reject Karein (Unboxing video nahi mila)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
