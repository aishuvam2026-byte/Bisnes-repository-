import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  TrendingUp,
  Clock,
  ShoppingBag,
  ShoppingCart,
  Package,
  PackageCheck,
  Truck,
  Phone,
  ChevronRight,
  AlertTriangle,
  Wallet,
  MessageSquare,
  FileText,
  UserPlus,
  CheckCircle2,
  FileSpreadsheet,
  BarChart3,
  LayoutGrid,
  Maximize2,
  ListChecks,
  Store,
  Building2,
  IndianRupee,
  BadgeCheck,
  Send,
} from 'lucide-react';
import { OnboardingChecklist } from '../components/OnboardingChecklist';
import { YearMonthFilterModal } from '../components/YearMonthFilterModal';
import { DispatchCallSheetModal } from '../components/DispatchCallSheetModal';
import { DigitalMarketingSection } from '../components/DigitalMarketingSection';
import {
  TodayTrendSparkline,
  buildWeeklySparklineData,
} from '../components/TodayTrendSparkline';
import { tr } from '../data/translations';

export const HomeView: React.FC<{
  onOpenNewOrder: () => void;
  onOpenNewProduct: () => void;
  onOpenNewCustomer: () => void;
  onOpenDeliveryCall: () => void;
}> = ({ onOpenNewOrder, onOpenNewProduct, onOpenNewCustomer }) => {
  const {
    orders,
    products,
    payments,
    udhaar,
    customers,
    suppliers,
    supplierOrders,
    setActiveTab,
    openMorePage,
    timeFilter,
    setTimeFilter,
    selectedYear,
    selectedMonth,
    t,
    language,
    role,
    user,
    settings,
    customerRegistrations,
    cart,
    totalCartItems,
    setIsCartOpen,
  } = useApp();

  const [isYearPickerOpen, setIsYearPickerOpen] = useState(false);
  const [isCallSheetModalOpen, setIsCallSheetModalOpen] = useState(false);
  const SIMULATED_TODAY = '2026-11-09';
  const liveTodayPrefix = new Date().toISOString().slice(0, 10);

  const isTodayDate = (val?: string) =>
    Boolean(val && (val.startsWith(liveTodayPrefix) || val.startsWith(SIMULATED_TODAY)));

  const cartProductsCount = Object.values(cart).filter((q) => q > 0).length;
  const productCostById = new Map(products.map((p) => [p.id, p.purchaseCost]));

  const computeOrdersProfit = (orderList: typeof orders) =>
    Math.round(
      orderList.reduce((sum, ord) => {
        if (ord.status === 'Cancelled' || ord.status === 'Returned') return sum;
        const itemProfit = (ord.items || []).reduce((itemSum, it) => {
          const cost = productCostById.get(it.productId) ?? Math.round(it.unitPricePerPacket * 0.78);
          return itemSum + Math.max(0, it.unitPricePerPacket - cost) * (it.packetQty || 0);
        }, 0);
        return sum + (itemProfit > 0 ? itemProfit : Math.round(ord.totalAmount * 0.22));
      }, 0)
    );

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. RETAILER FALLBACK HOME (TODAY SUMMARY + UDHAAR + TODAY TASKS + FULL DETAIL)
  // ═══════════════════════════════════════════════════════════════════════════
  if (role === 'customer') {
    const loggedInCustomer = customers.find((c) => c.id === user?.customerId) || customers[0];
    const myOrders = orders.filter(
      (o) => o.customerId === loggedInCustomer.id || o.phone === loggedInCustomer.phone
    );
    const myUdhaar = udhaar.filter(
      (u) =>
        (u.customerId === loggedInCustomer.id || u.shopName === loggedInCustomer.shopName) &&
        u.status === 'Pending'
    );
    const myPayments = payments.filter(
      (p) => p.customerId === loggedInCustomer.id || p.shopName === loggedInCustomer.shopName
    );
    const myTodayOrders = myOrders.filter((o) => isTodayDate(o.createdAt));
    const myTodaySale = myTodayOrders.reduce((s, o) => s + o.totalAmount, 0);
    const myTodayProfit = Math.round(myTodaySale * 0.25);
    const myTodayDispatched = myOrders.filter(
      (o) => isTodayDate(o.dispatchDate) || (o.status === 'Dispatched' && isTodayDate(o.createdAt))
    ).length;
    const myTodayDelivered = myOrders.filter(
      (o) => isTodayDate(o.deliveredDate) || (o.status === 'Delivered' && isTodayDate(o.createdAt))
    ).length;
    const myTodayPaid = myPayments
      .filter((p) => isTodayDate(p.date))
      .reduce((s, p) => s + p.amount, 0);
    const myPendingOrdersCount = myOrders.filter(
      (o) =>
        o.status === 'Advance Pending' ||
        o.status === 'Enquiry' ||
        (o.status === 'Booked' && !o.advancePaid) ||
        o.status === 'On Hold'
    ).length;
    const myOrderConfirmList = myOrders.filter(
      (o) =>
        o.status === 'Booked' ||
        o.status === 'Advance Pending' ||
        o.status === 'Enquiry' ||
        o.status === 'On Hold' ||
        o.status === 'Reschedule'
    );
    const myDispatchList = myOrders.filter((o) => o.status === 'Packed');
    const myDispatchedList = myOrders.filter((o) => o.status === 'Dispatched');
    const myDeliveredList = myOrders.filter((o) => o.status === 'Delivered');
    const myDeliveryDelayList = myOrders.filter(
      (o) =>
        o.expectedDeliveryDate &&
        o.expectedDeliveryDate < SIMULATED_TODAY &&
        o.status !== 'Delivered' &&
        o.status !== 'Cancelled' &&
        o.status !== 'Returned'
    );

    const mySalesWeeklyTrend = buildWeeklySparklineData(
      myOrders
        .filter((o) => o.status !== 'Cancelled' && o.status !== 'Returned')
        .map((o) => ({ date: o.createdAt, value: o.totalAmount })),
      SIMULATED_TODAY,
      0
    );
    const myProfitWeeklyTrend = buildWeeklySparklineData(
      myOrders
        .filter((o) => o.status !== 'Cancelled' && o.status !== 'Returned')
        .map((o) => ({ date: o.createdAt, value: Math.round(o.totalAmount * 0.25) })),
      SIMULATED_TODAY,
      2
    );

    const pendingUdhaarAmt = Math.max(
      Number(loggedInCustomer.pendingUdhaar || 0),
      myUdhaar.reduce((s, u) => s + u.shortageAmount, 0)
    );
    const hasUdhaar = pendingUdhaarAmt > 0;
    const activeOrder =
      myOrders.find((o) => o.status !== 'Delivered' && o.status !== 'Cancelled') || myOrders[0];
    const todayTasksCount = (activeOrder ? 1 : 0) + (hasUdhaar ? 1 : 0);

    return (
      <div className="space-y-4 pb-24 max-w-4xl mx-auto">
        {/* Compact Shop Header */}
        <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center font-black text-base shrink-0">
              {loggedInCustomer.shopName.charAt(0)}
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-900 truncate">
                {loggedInCustomer.shopName}
              </h2>
              <p className="text-xs text-slate-500 truncate">
                {loggedInCustomer.ownerName} · {loggedInCustomer.villageOrTown || loggedInCustomer.city}
              </p>
            </div>
          </div>

          <a
            href={`tel:${settings.ownerPhone}`}
            aria-label="Call Owner"
            className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 hover:bg-sky-100 flex items-center justify-center shrink-0 transition"
          >
            <Phone className="w-4 h-4" />
          </a>
        </div>

        {/* Summary + Today Overview */}
        <section className="space-y-2">
          <div className="flex items-center justify-between px-0.5">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-sky-600" />
              <h2 className="text-xs sm:text-sm font-bold text-slate-800">Summary</h2>
            </div>
            <button
              type="button"
              onClick={() => openMorePage('myFullOrders')}
              className="text-[11px] font-bold text-sky-700 flex items-center gap-1 whitespace-nowrap"
            >
              <Maximize2 className="w-3 h-3" />
              <span>Full Detail</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setActiveTab('khata')}
              className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-xs text-left hover:border-slate-300 active:scale-[0.98] transition"
            >
              <div className="flex items-center justify-between">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    hasUdhaar ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
                  }`}
                >
                  <Wallet className="w-4 h-4" />
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
              <span
                className={`text-xl font-black block mt-2.5 tabular-nums ${
                  hasUdhaar ? 'text-rose-600' : 'text-emerald-700'
                }`}
              >
                ₹{pendingUdhaarAmt.toLocaleString('en-IN')}
              </span>
              <span className="text-xs font-semibold text-slate-500 mt-0.5 block">Udhaar</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('orders')}
              className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-xs text-left hover:border-slate-300 active:scale-[0.98] transition"
            >
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
              <span className="text-xl font-black text-slate-900 block mt-2.5 tabular-nums">
                {myOrders.length}
              </span>
              <span className="text-xs font-semibold text-slate-500 mt-0.5 block">Orders</span>
            </button>
          </div>

          {/* Today Data Compact Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="px-3.5 py-2 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700">Today Overview</span>
              <span className="text-[10px] font-bold text-sky-700 tabular-nums">
                {myTodayOrders.length} Orders · {myPendingOrdersCount} Pending
              </span>
            </div>
            <div className="grid grid-cols-2 divide-x divide-slate-100 border-b border-slate-100">
              <button
                type="button"
                onClick={() => setActiveTab('orders')}
                className="p-3 flex flex-col items-start text-left hover:bg-slate-50/80 transition space-y-2"
              >
                <div className="w-full flex items-center justify-between gap-1">
                  <span className="text-[10px] font-semibold text-slate-500">Today Sale</span>
                  <TrendingUp className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                </div>
                <span className="text-base sm:text-lg font-black text-slate-900 tabular-nums leading-none">
                  ₹{myTodaySale.toLocaleString('en-IN')}
                </span>
                <TodayTrendSparkline trend={mySalesWeeklyTrend} accentColor="#0284c7" />
              </button>

              <button
                type="button"
                onClick={() => openMorePage('myFullOrders')}
                className="p-3 flex flex-col items-start text-left hover:bg-slate-50/80 transition space-y-2"
              >
                <div className="w-full flex items-center justify-between gap-1">
                  <span className="text-[10px] font-semibold text-slate-500">Today Profit</span>
                  <IndianRupee className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                </div>
                <span className="text-base sm:text-lg font-black text-emerald-700 tabular-nums leading-none">
                  ₹{myTodayProfit.toLocaleString('en-IN')}
                </span>
                <TodayTrendSparkline trend={myProfitWeeklyTrend} accentColor="#059669" />
              </button>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 divide-x divide-y divide-slate-100">

              <button
                type="button"
                onClick={() => setActiveTab('khata')}
                className="p-2.5 flex flex-col items-center text-center hover:bg-slate-50 transition"
              >
                <Wallet className="w-3.5 h-3.5 text-amber-600 mb-1" />
                <span className="text-sm font-black text-slate-900 tabular-nums leading-none">
                  ₹{myTodayPaid.toLocaleString('en-IN')}
                </span>
                <span className="text-[10px] font-medium text-slate-500 mt-1">Today Paid</span>
              </button>

              <button
                type="button"
                onClick={() => openMorePage('myFullOrders')}
                className="p-2.5 flex flex-col items-center text-center hover:bg-slate-50 transition"
              >
                <Send className="w-3.5 h-3.5 text-indigo-600 mb-1" />
                <span className="text-sm font-black text-indigo-700 tabular-nums leading-none">
                  {myTodayDispatched}
                </span>
                <span className="text-[10px] font-medium text-slate-500 mt-1">Dispatch</span>
              </button>

              <button
                type="button"
                onClick={() => openMorePage('myFullOrders')}
                className="p-2.5 flex flex-col items-center text-center hover:bg-slate-50 transition"
              >
                <BadgeCheck className="w-3.5 h-3.5 text-emerald-600 mb-1" />
                <span className="text-sm font-black text-emerald-700 tabular-nums leading-none">
                  {myTodayDelivered}
                </span>
                <span className="text-[10px] font-medium text-slate-500 mt-1">Delivered</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('orders')}
                className="p-2.5 flex flex-col items-center text-center hover:bg-slate-50 transition"
              >
                <ShoppingBag className="w-3.5 h-3.5 text-sky-700 mb-1" />
                <span className="text-sm font-black text-slate-900 tabular-nums leading-none">
                  {myTodayOrders.length}
                </span>
                <span className="text-[10px] font-medium text-slate-500 mt-1">Orders</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('orders')}
                className="p-2.5 flex flex-col items-center text-center hover:bg-slate-50 transition"
              >
                <Clock
                  className={`w-3.5 h-3.5 mb-1 ${
                    myPendingOrdersCount > 0 ? 'text-amber-600' : 'text-slate-500'
                  }`}
                />
                <span
                  className={`text-sm font-black tabular-nums leading-none ${
                    myPendingOrdersCount > 0 ? 'text-amber-700' : 'text-slate-900'
                  }`}
                >
                  {myPendingOrdersCount}
                </span>
                <span className="text-[10px] font-medium text-slate-500 mt-1">Order Pending</span>
              </button>

              <button
                type="button"
                onClick={() => setIsCartOpen(true)}
                className="p-2.5 flex flex-col items-center text-center hover:bg-slate-50 transition"
              >
                <ShoppingCart
                  className={`w-3.5 h-3.5 mb-1 ${
                    cartProductsCount > 0 ? 'text-sky-600' : 'text-slate-500'
                  }`}
                />
                <span
                  className={`text-sm font-black tabular-nums leading-none ${
                    cartProductsCount > 0 ? 'text-sky-700' : 'text-slate-900'
                  }`}
                >
                  {cartProductsCount}
                </span>
                <span className="text-[10px] font-medium text-slate-500 mt-1">
                  {totalCartItems > 0 ? `Cart (${totalCartItems} pkt)` : 'Cart Products'}
                </span>
              </button>
            </div>
          </div>
        </section>

        {/* Unified Overview Section */}
        <section className="space-y-1.5">
          <div className="flex items-center justify-between px-0.5">
            <div className="flex items-center gap-2">
              <LayoutGrid className="w-4 h-4 text-slate-600" />
              <h2 className="text-xs sm:text-sm font-bold text-slate-800">Overview</h2>
            </div>
            <button
              type="button"
              onClick={() => openMorePage('myFullOrders')}
              className="text-[11px] font-bold text-sky-700 flex items-center gap-1 whitespace-nowrap"
            >
              <Maximize2 className="w-3 h-3" />
              <span>Full Detail</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="grid grid-cols-3 divide-x divide-y divide-slate-100">
              <button
                type="button"
                onClick={() => setActiveTab('orders')}
                className="p-3 flex flex-col items-center text-center hover:bg-slate-50 active:bg-slate-100/70 transition"
              >
                <ShoppingBag className="w-4 h-4 text-sky-600 mb-1.5 stroke-[2.2]" />
                <span className="text-lg font-black text-slate-900 tabular-nums leading-none">
                  {myOrders.length}
                </span>
                <span className="text-[11px] font-medium text-slate-500 mt-1 truncate max-w-full">
                  Orders
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('orders')}
                className="p-3 flex flex-col items-center text-center hover:bg-slate-50 active:bg-slate-100/70 transition"
              >
                <CheckCircle2 className="w-4 h-4 text-sky-600 mb-1.5 stroke-[2.2]" />
                <span className="text-lg font-black text-sky-800 tabular-nums leading-none">
                  {myOrderConfirmList.length}
                </span>
                <span className="text-[11px] font-medium text-slate-500 mt-1 truncate max-w-full">
                  Order Confirm
                </span>
                <span className="text-[10px] font-semibold text-slate-400 tabular-nums mt-0.5 truncate max-w-full">
                  ₹{myOrderConfirmList.reduce((s, o) => s + o.totalAmount, 0).toLocaleString('en-IN')}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('orders')}
                className="p-3 flex flex-col items-center text-center hover:bg-slate-50 active:bg-slate-100/70 transition"
              >
                <PackageCheck className="w-4 h-4 text-blue-600 mb-1.5 stroke-[2.2]" />
                <span className="text-lg font-black text-blue-800 tabular-nums leading-none">
                  {myDispatchList.length}
                </span>
                <span className="text-[11px] font-medium text-slate-500 mt-1 truncate max-w-full">
                  Dispatch
                </span>
                <span className="text-[10px] font-semibold text-slate-400 tabular-nums mt-0.5 truncate max-w-full">
                  ₹{myDispatchList.reduce((s, o) => s + o.totalAmount, 0).toLocaleString('en-IN')}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('orders')}
                className="p-3 flex flex-col items-center text-center hover:bg-slate-50 active:bg-slate-100/70 transition"
              >
                <Send className="w-4 h-4 text-indigo-600 mb-1.5 stroke-[2.2]" />
                <span className="text-lg font-black text-indigo-800 tabular-nums leading-none">
                  {myDispatchedList.length}
                </span>
                <span className="text-[11px] font-medium text-slate-500 mt-1 truncate max-w-full">
                  Dispatched
                </span>
                <span className="text-[10px] font-semibold text-slate-400 tabular-nums mt-0.5 truncate max-w-full">
                  ₹{myDispatchedList.reduce((s, o) => s + o.totalAmount, 0).toLocaleString('en-IN')}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('orders')}
                className="p-3 flex flex-col items-center text-center hover:bg-slate-50 active:bg-slate-100/70 transition"
              >
                <BadgeCheck className="w-4 h-4 text-emerald-600 mb-1.5 stroke-[2.2]" />
                <span className="text-lg font-black text-emerald-700 tabular-nums leading-none">
                  {myDeliveredList.length}
                </span>
                <span className="text-[11px] font-medium text-slate-500 mt-1 truncate max-w-full">
                  Delivered
                </span>
                <span className="text-[10px] font-semibold text-slate-400 tabular-nums mt-0.5 truncate max-w-full">
                  ₹{myDeliveredList.reduce((s, o) => s + o.totalAmount, 0).toLocaleString('en-IN')}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('orders')}
                className="p-3 flex flex-col items-center text-center hover:bg-slate-50 active:bg-slate-100/70 transition"
              >
                <AlertTriangle
                  className={`w-4 h-4 mb-1.5 stroke-[2.2] ${
                    myDeliveryDelayList.length > 0 ? 'text-rose-600' : 'text-slate-500'
                  }`}
                />
                <span
                  className={`text-lg font-black tabular-nums leading-none ${
                    myDeliveryDelayList.length > 0 ? 'text-rose-600' : 'text-slate-900'
                  }`}
                >
                  {myDeliveryDelayList.length}
                </span>
                <span className="text-[11px] font-medium text-slate-500 mt-1 truncate max-w-full">
                  Delivery Delay
                </span>
                <span className="text-[10px] font-semibold text-slate-400 tabular-nums mt-0.5 truncate max-w-full">
                  ₹{myDeliveryDelayList.reduce((s, o) => s + o.totalAmount, 0).toLocaleString('en-IN')}
                </span>
              </button>
            </div>
          </div>
        </section>

        {/* Today Tasks Section */}
        <section className="space-y-1.5">
          <div className="flex items-center justify-between px-0.5">
            <div className="flex items-center gap-2">
              <ListChecks className="w-4 h-4 text-rose-600" />
              <h2 className="text-xs sm:text-sm font-bold text-slate-800">Today Tasks</h2>
              <span className="text-xs font-bold text-rose-600 tabular-nums">{todayTasksCount}</span>
            </div>
            <button
              type="button"
              onClick={() => openMorePage('myFullOrders')}
              className="text-[11px] font-bold text-sky-700 flex items-center gap-1 whitespace-nowrap"
            >
              <Maximize2 className="w-3 h-3" />
              <span>Full Detail</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs divide-y divide-slate-100 overflow-hidden">
            {activeOrder && (
              <button
                type="button"
                onClick={() => openMorePage('myFullOrders')}
                className="w-full px-3.5 py-3 flex items-center justify-between gap-3 hover:bg-slate-50 transition text-left"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                    <Truck className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-900 truncate">
                    Order #{activeOrder.orderNumber}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-xs font-bold text-sky-700">{activeOrder.status}</span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveTab('stock')}
              className="w-full px-3.5 py-3 flex items-center justify-between gap-3 hover:bg-slate-50 transition text-left"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <Package className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-slate-900">Catalogue</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-xs font-black text-slate-900 tabular-nums">{products.length}</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </button>

            <button
              type="button"
              onClick={() => openMorePage('invoices')}
              className="w-full px-3.5 py-3 flex items-center justify-between gap-3 hover:bg-slate-50 transition text-left"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-slate-900">Bills & GST</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-xs font-black text-slate-900 tabular-nums">{myOrders.length}</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </button>

            <button
              type="button"
              onClick={() => openMorePage('myFullOrders')}
              className="w-full px-3.5 py-2.5 bg-slate-50/60 hover:bg-sky-50/60 text-xs font-bold text-slate-700 hover:text-sky-700 flex items-center justify-between transition"
            >
              <span className="flex items-center gap-1.5">
                <Maximize2 className="w-3.5 h-3.5 text-sky-600" />
                <span>Full Detail · Orders</span>
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </section>

        <DigitalMarketingSection />
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. SUPPLIER HOME PORTAL (TODAY SUMMARY + UDHAAR + TODAY TASKS + FULL DETAIL)
  // ═══════════════════════════════════════════════════════════════════════════
  if (role === 'supplier') {
    const loggedInSupplier = suppliers.find((s) => s.id === user?.supplierId) || suppliers[0];
    const myPOs = supplierOrders.filter((po) => po.supplierId === loggedInSupplier.id);
    const ownerPayableDue = loggedInSupplier.dueAmount || loggedInSupplier.pendingDues || 0;
    const mySuppliedProducts = products.filter(
      (p) =>
        p.supplierId === loggedInSupplier.id ||
        (p.brand && loggedInSupplier.brands?.includes(p.brand))
    );
    const lowStockSupplied = mySuppliedProducts.filter(
      (p) => p.isLowStock || p.packetStock <= p.reorderLevel
    );
    const activePO =
      myPOs.find((po) => po.status === 'In Transit' || po.status === 'Dispatched') || myPOs[0];
    const supplierTasksCount = (activePO ? 1 : 0) + lowStockSupplied.length;

    // Supplier Today Metrics
    const myTodayPOs = myPOs.filter((po) => isTodayDate(po.orderDate));
    const myTodaySupplySale = myTodayPOs.reduce((s, po) => s + po.totalAmount, 0);
    const myTodaySupplyProfit = Math.round(myTodaySupplySale * 0.14);
    const myTodayDispatchedPOs = myPOs.filter(
      (po) =>
        isTodayDate(po.dispatchedDate) ||
        ((po.status === 'Dispatched' || po.status === 'In Transit') && isTodayDate(po.orderDate))
    ).length;
    const myTodayDeliveredPOs = myPOs.filter(
      (po) =>
        isTodayDate(po.receivedDate) ||
        ((po.status === 'Received at Hub' || po.status === 'Settled') && isTodayDate(po.orderDate))
    ).length;
    const myInTransitPOs = myPOs.filter(
      (po) => po.status === 'In Transit' || po.status === 'Dispatched'
    ).length;
    const myPendingPOsCount = myPOs.filter(
      (po) => po.status === 'Draft' || po.status === 'Confirmed'
    ).length;
    const myConfirmPOsList = myPOs.filter((po) => po.status === 'Draft');
    const myDispatchPOsList = myPOs.filter((po) => po.status === 'Confirmed');
    const myDispatchedPOsList = myPOs.filter(
      (po) => po.status === 'Dispatched' || po.status === 'In Transit'
    );
    const myDeliveredPOsList = myPOs.filter(
      (po) =>
        po.status === 'Received at Hub' || po.status === 'Inspected' || po.status === 'Settled'
    );
    const myDelayPOsList = myPOs.filter(
      (po) =>
        po.expectedDate &&
        po.expectedDate < SIMULATED_TODAY &&
        po.status !== 'Received at Hub' &&
        po.status !== 'Inspected' &&
        po.status !== 'Settled'
    );

    const supplierSalesWeeklyTrend = buildWeeklySparklineData(
      myPOs.map((po) => ({ date: po.orderDate, value: po.totalAmount })),
      SIMULATED_TODAY,
      1
    );
    const supplierProfitWeeklyTrend = buildWeeklySparklineData(
      myPOs.map((po) => ({ date: po.orderDate, value: Math.round(po.totalAmount * 0.14) })),
      SIMULATED_TODAY,
      3
    );

    return (
      <div className="space-y-4 pb-24 max-w-4xl mx-auto">
        {/* Clean Supplier Header */}
        <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-base shrink-0">
              {loggedInSupplier.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-900 truncate">
                {loggedInSupplier.name}
              </h2>
              <p className="text-xs text-slate-500 truncate">
                {loggedInSupplier.city || 'Kolkata'} · {loggedInSupplier.id}
              </p>
            </div>
          </div>

          <a
            href={`https://wa.me/91${(settings.ownerPhone || '9437123456').replace(/\D/g, '')}?text=${encodeURIComponent(
              `Namaste Shuvam bhai! ${loggedInSupplier.name} supply update.`
            )}`}
            target="_blank"
            rel="noreferrer"
            aria-label="WhatsApp Hub"
            className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 flex items-center justify-center shrink-0 transition"
          >
            <MessageSquare className="w-4 h-4" />
          </a>
        </div>

        {/* Summary + Today Overview Section */}
        <section className="space-y-2">
          <div className="flex items-center justify-between px-0.5">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-600" />
              <h2 className="text-xs sm:text-sm font-bold text-slate-800">Summary</h2>
            </div>
            <button
              type="button"
              onClick={() => openMorePage('myFullSupplyPOs')}
              className="text-[11px] font-bold text-indigo-700 flex items-center gap-1 whitespace-nowrap"
            >
              <Maximize2 className="w-3 h-3" />
              <span>Full Detail</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setActiveTab('khata')}
              className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-xs text-left hover:border-slate-300 active:scale-[0.98] transition"
            >
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Wallet className="w-4 h-4" />
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
              <span className="text-xl font-black text-slate-900 block mt-2.5 tabular-nums">
                ₹{ownerPayableDue.toLocaleString('en-IN')}
              </span>
              <span className="text-xs font-semibold text-slate-500 mt-0.5 block">Payable Due</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('stock')}
              className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-xs text-left hover:border-slate-300 active:scale-[0.98] transition"
            >
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                  <Package className="w-4 h-4" />
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
              <span className="text-xl font-black text-slate-900 block mt-2.5 tabular-nums">
                {mySuppliedProducts.length}
              </span>
              <span className="text-xs font-semibold text-slate-500 mt-0.5 block">Hub Items</span>
            </button>
          </div>

          {/* Supplier Today Data Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="px-3.5 py-2 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700">Today Overview</span>
              <span className="text-[10px] font-bold text-indigo-700 tabular-nums">
                {myTodayPOs.length} POs · {myPendingPOsCount} Pending
              </span>
            </div>
            <div className="grid grid-cols-2 divide-x divide-slate-100 border-b border-slate-100">
              <button
                type="button"
                onClick={() => setActiveTab('orders')}
                className="p-3 flex flex-col items-start text-left hover:bg-slate-50/80 transition space-y-2"
              >
                <div className="w-full flex items-center justify-between gap-1">
                  <span className="text-[10px] font-semibold text-slate-500">Today Sale</span>
                  <TrendingUp className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                </div>
                <span className="text-base sm:text-lg font-black text-slate-900 tabular-nums leading-none">
                  ₹{myTodaySupplySale.toLocaleString('en-IN')}
                </span>
                <TodayTrendSparkline trend={supplierSalesWeeklyTrend} accentColor="#4f46e5" />
              </button>

              <button
                type="button"
                onClick={() => openMorePage('rateCard')}
                className="p-3 flex flex-col items-start text-left hover:bg-slate-50/80 transition space-y-2"
              >
                <div className="w-full flex items-center justify-between gap-1">
                  <span className="text-[10px] font-semibold text-slate-500">Today Profit</span>
                  <IndianRupee className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                </div>
                <span className="text-base sm:text-lg font-black text-emerald-700 tabular-nums leading-none">
                  ₹{myTodaySupplyProfit.toLocaleString('en-IN')}
                </span>
                <TodayTrendSparkline trend={supplierProfitWeeklyTrend} accentColor="#059669" />
              </button>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 divide-x divide-y divide-slate-100">

              <button
                type="button"
                onClick={() => setActiveTab('orders')}
                className="p-2.5 flex flex-col items-center text-center hover:bg-slate-50 transition"
              >
                <ShoppingBag className="w-3.5 h-3.5 text-sky-600 mb-1" />
                <span className="text-sm font-black text-slate-900 tabular-nums leading-none">
                  {myTodayPOs.length}
                </span>
                <span className="text-[10px] font-medium text-slate-500 mt-1">Today POs</span>
              </button>

              <button
                type="button"
                onClick={() => openMorePage('myFullSupplyPOs')}
                className="p-2.5 flex flex-col items-center text-center hover:bg-slate-50 transition"
              >
                <Send className="w-3.5 h-3.5 text-indigo-600 mb-1" />
                <span className="text-sm font-black text-indigo-700 tabular-nums leading-none">
                  {myTodayDispatchedPOs}
                </span>
                <span className="text-[10px] font-medium text-slate-500 mt-1">Dispatch</span>
              </button>

              <button
                type="button"
                onClick={() => openMorePage('myFullSupplyPOs')}
                className="p-2.5 flex flex-col items-center text-center hover:bg-slate-50 transition"
              >
                <BadgeCheck className="w-3.5 h-3.5 text-emerald-600 mb-1" />
                <span className="text-sm font-black text-emerald-700 tabular-nums leading-none">
                  {myTodayDeliveredPOs}
                </span>
                <span className="text-[10px] font-medium text-slate-500 mt-1">Delivered</span>
              </button>

              <button
                type="button"
                onClick={() => openMorePage('myFullSupplyPOs')}
                className="p-2.5 flex flex-col items-center text-center hover:bg-slate-50 transition"
              >
                <Truck className="w-3.5 h-3.5 text-amber-600 mb-1" />
                <span className="text-sm font-black text-amber-700 tabular-nums leading-none">
                  {myInTransitPOs}
                </span>
                <span className="text-[10px] font-medium text-slate-500 mt-1">In Transit</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('orders')}
                className="p-2.5 flex flex-col items-center text-center hover:bg-slate-50 transition"
              >
                <Clock
                  className={`w-3.5 h-3.5 mb-1 ${
                    myPendingPOsCount > 0 ? 'text-amber-600' : 'text-slate-500'
                  }`}
                />
                <span
                  className={`text-sm font-black tabular-nums leading-none ${
                    myPendingPOsCount > 0 ? 'text-amber-700' : 'text-slate-900'
                  }`}
                >
                  {myPendingPOsCount}
                </span>
                <span className="text-[10px] font-medium text-slate-500 mt-1">Order Pending</span>
              </button>

              <button
                type="button"
                onClick={() => setIsCartOpen(true)}
                className="p-2.5 flex flex-col items-center text-center hover:bg-slate-50 transition"
              >
                <ShoppingCart
                  className={`w-3.5 h-3.5 mb-1 ${
                    cartProductsCount > 0 ? 'text-sky-600' : 'text-slate-500'
                  }`}
                />
                <span
                  className={`text-sm font-black tabular-nums leading-none ${
                    cartProductsCount > 0 ? 'text-sky-700' : 'text-slate-900'
                  }`}
                >
                  {cartProductsCount}
                </span>
                <span className="text-[10px] font-medium text-slate-500 mt-1">
                  {totalCartItems > 0 ? `Cart (${totalCartItems} pkt)` : 'Cart Products'}
                </span>
              </button>
            </div>
          </div>
        </section>

        {/* Unified Overview Section */}
        <section className="space-y-1.5">
          <div className="flex items-center justify-between px-0.5">
            <div className="flex items-center gap-2">
              <LayoutGrid className="w-4 h-4 text-slate-600" />
              <h2 className="text-xs sm:text-sm font-bold text-slate-800">Overview</h2>
            </div>
            <button
              type="button"
              onClick={() => openMorePage('myFullSupplyPOs')}
              className="text-[11px] font-bold text-indigo-700 flex items-center gap-1 whitespace-nowrap"
            >
              <Maximize2 className="w-3 h-3" />
              <span>Full Detail</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="grid grid-cols-3 divide-x divide-y divide-slate-100">
              <button
                type="button"
                onClick={() => openMorePage('myFullSupplyPOs')}
                className="p-3 flex flex-col items-center text-center hover:bg-slate-50 active:bg-slate-100/70 transition"
              >
                <ShoppingBag className="w-4 h-4 text-sky-600 mb-1.5 stroke-[2.2]" />
                <span className="text-lg font-black text-slate-900 tabular-nums leading-none">
                  {myPOs.length}
                </span>
                <span className="text-[11px] font-medium text-slate-500 mt-1 truncate max-w-full">
                  Supply POs
                </span>
              </button>

              <button
                type="button"
                onClick={() => openMorePage('myFullSupplyPOs')}
                className="p-3 flex flex-col items-center text-center hover:bg-slate-50 active:bg-slate-100/70 transition"
              >
                <CheckCircle2 className="w-4 h-4 text-sky-600 mb-1.5 stroke-[2.2]" />
                <span className="text-lg font-black text-sky-800 tabular-nums leading-none">
                  {myConfirmPOsList.length}
                </span>
                <span className="text-[11px] font-medium text-slate-500 mt-1 truncate max-w-full">
                  Order Confirm
                </span>
                <span className="text-[10px] font-semibold text-slate-400 tabular-nums mt-0.5 truncate max-w-full">
                  ₹{myConfirmPOsList.reduce((s, po) => s + po.totalAmount, 0).toLocaleString('en-IN')}
                </span>
              </button>

              <button
                type="button"
                onClick={() => openMorePage('myFullSupplyPOs')}
                className="p-3 flex flex-col items-center text-center hover:bg-slate-50 active:bg-slate-100/70 transition"
              >
                <PackageCheck className="w-4 h-4 text-blue-600 mb-1.5 stroke-[2.2]" />
                <span className="text-lg font-black text-blue-800 tabular-nums leading-none">
                  {myDispatchPOsList.length}
                </span>
                <span className="text-[11px] font-medium text-slate-500 mt-1 truncate max-w-full">
                  Dispatch
                </span>
                <span className="text-[10px] font-semibold text-slate-400 tabular-nums mt-0.5 truncate max-w-full">
                  ₹{myDispatchPOsList.reduce((s, po) => s + po.totalAmount, 0).toLocaleString('en-IN')}
                </span>
              </button>

              <button
                type="button"
                onClick={() => openMorePage('myFullSupplyPOs')}
                className="p-3 flex flex-col items-center text-center hover:bg-slate-50 active:bg-slate-100/70 transition"
              >
                <Send className="w-4 h-4 text-indigo-600 mb-1.5 stroke-[2.2]" />
                <span className="text-lg font-black text-indigo-800 tabular-nums leading-none">
                  {myDispatchedPOsList.length}
                </span>
                <span className="text-[11px] font-medium text-slate-500 mt-1 truncate max-w-full">
                  Dispatched
                </span>
                <span className="text-[10px] font-semibold text-slate-400 tabular-nums mt-0.5 truncate max-w-full">
                  ₹{myDispatchedPOsList.reduce((s, po) => s + po.totalAmount, 0).toLocaleString('en-IN')}
                </span>
              </button>

              <button
                type="button"
                onClick={() => openMorePage('myFullSupplyPOs')}
                className="p-3 flex flex-col items-center text-center hover:bg-slate-50 active:bg-slate-100/70 transition"
              >
                <BadgeCheck className="w-4 h-4 text-emerald-600 mb-1.5 stroke-[2.2]" />
                <span className="text-lg font-black text-emerald-700 tabular-nums leading-none">
                  {myDeliveredPOsList.length}
                </span>
                <span className="text-[11px] font-medium text-slate-500 mt-1 truncate max-w-full">
                  Delivered
                </span>
                <span className="text-[10px] font-semibold text-slate-400 tabular-nums mt-0.5 truncate max-w-full">
                  ₹{myDeliveredPOsList.reduce((s, po) => s + po.totalAmount, 0).toLocaleString('en-IN')}
                </span>
              </button>

              <button
                type="button"
                onClick={() => openMorePage('myFullSupplyPOs')}
                className="p-3 flex flex-col items-center text-center hover:bg-slate-50 active:bg-slate-100/70 transition"
              >
                <AlertTriangle
                  className={`w-4 h-4 mb-1.5 stroke-[2.2] ${
                    myDelayPOsList.length > 0 ? 'text-rose-600' : 'text-slate-500'
                  }`}
                />
                <span
                  className={`text-lg font-black tabular-nums leading-none ${
                    myDelayPOsList.length > 0 ? 'text-rose-600' : 'text-slate-900'
                  }`}
                >
                  {myDelayPOsList.length}
                </span>
                <span className="text-[11px] font-medium text-slate-500 mt-1 truncate max-w-full">
                  Delivery Delay
                </span>
                <span className="text-[10px] font-semibold text-slate-400 tabular-nums mt-0.5 truncate max-w-full">
                  ₹{myDelayPOsList.reduce((s, po) => s + po.totalAmount, 0).toLocaleString('en-IN')}
                </span>
              </button>
            </div>
          </div>
        </section>

        {/* Today Tasks Section */}
        <section className="space-y-1.5">
          <div className="flex items-center justify-between px-0.5">
            <div className="flex items-center gap-2">
              <ListChecks className="w-4 h-4 text-rose-600" />
              <h2 className="text-xs sm:text-sm font-bold text-slate-800">Today Tasks</h2>
              <span className="text-xs font-bold text-rose-600 tabular-nums">
                {supplierTasksCount}
              </span>
            </div>
            <button
              type="button"
              onClick={() => openMorePage('myFullSupplyPOs')}
              className="text-[11px] font-bold text-indigo-700 flex items-center gap-1 whitespace-nowrap"
            >
              <Maximize2 className="w-3 h-3" />
              <span>Full Detail</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs divide-y divide-slate-100 overflow-hidden">
            {activePO && (
              <button
                type="button"
                onClick={() => openMorePage('myFullSupplyPOs')}
                className="w-full px-3.5 py-3 flex items-center justify-between gap-2 hover:bg-slate-50 transition text-left"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <Truck className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-900 truncate">{activePO.poNumber}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-bold text-indigo-700">{activePO.status}</span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </button>
            )}

            <button
              type="button"
              onClick={() => openMorePage('myFullSupplyPOs')}
              className="w-full px-3.5 py-3 flex items-center justify-between gap-2 hover:bg-slate-50 transition text-left"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <Send className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-slate-900">Dispatch</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-sm font-black text-indigo-700 tabular-nums">
                  {myPOs.filter((po) => po.status === 'Dispatched' || po.status === 'In Transit').length}
                </span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('orders')}
              className="w-full px-3.5 py-3 flex items-center justify-between gap-2 hover:bg-slate-50 transition text-left"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-slate-900">Supply POs</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-sm font-black text-slate-900 tabular-nums">{myPOs.length}</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('stock')}
              className="w-full px-3.5 py-3 flex items-center justify-between gap-2 hover:bg-slate-50 transition text-left"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    lowStockSupplied.length > 0
                      ? 'bg-rose-50 text-rose-600'
                      : 'bg-emerald-50 text-emerald-600'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-slate-900">Low Stock</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`text-sm font-black tabular-nums ${
                    lowStockSupplied.length > 0 ? 'text-rose-600' : 'text-emerald-700'
                  }`}
                >
                  {lowStockSupplied.length}
                </span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </button>

            <button
              type="button"
              onClick={() => openMorePage('myFullSupplyPOs')}
              className="w-full px-3.5 py-2.5 bg-slate-50/60 hover:bg-indigo-50/60 text-xs font-bold text-slate-700 hover:text-indigo-700 flex items-center justify-between transition"
            >
              <span className="flex items-center gap-1.5">
                <Maximize2 className="w-3.5 h-3.5 text-indigo-600" />
                <span>Full Detail · Supply POs & Stock</span>
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </section>

        <DigitalMarketingSection />
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. OWNER MASTER DASHBOARD (TODAY SUMMARY + RETAILERS + SUPPLIERS + ALL SECTIONS)
  // ═══════════════════════════════════════════════════════════════════════════
  const totalSales = orders.reduce((sum, o) => sum + o.totalAmount, 0);
  const todayOrders = orders.filter((o) => isTodayDate(o.createdAt));
  const todaySales = todayOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const todayProfit = computeOrdersProfit(todayOrders);

  const ownerSalesWeeklyTrend = buildWeeklySparklineData(
    orders
      .filter((o) => o.status !== 'Cancelled' && o.status !== 'Returned')
      .map((o) => ({ date: o.createdAt, value: o.totalAmount })),
    SIMULATED_TODAY,
    0
  );
  const ownerProfitWeeklyTrend = buildWeeklySparklineData(
    orders
      .filter((o) => o.status !== 'Cancelled' && o.status !== 'Returned')
      .map((o) => ({ date: o.createdAt, value: computeOrdersProfit([o]) })),
    SIMULATED_TODAY,
    2
  );
  const todayDispatchedCount = orders.filter(
    (o) => isTodayDate(o.dispatchDate) || (o.status === 'Dispatched' && isTodayDate(o.createdAt))
  ).length;
  const todayDeliveredCount = orders.filter(
    (o) => isTodayDate(o.deliveredDate) || (o.status === 'Delivered' && isTodayDate(o.createdAt))
  ).length;
  const todayCollection = payments
    .filter((p) => isTodayDate(p.date))
    .reduce((sum, p) => sum + p.amount, 0);

  const totalPendingBalance = orders.reduce(
    (sum, o) => sum + (o.status !== 'Delivered' ? o.balanceAmount : 0),
    0
  );
  const pendingUdhaarList = udhaar.filter((u) => u.status === 'Pending');
  const totalUdhaarPending = pendingUdhaarList.reduce((sum, u) => sum + u.shortageAmount, 0);
  const moneyPendingTotal = totalPendingBalance + totalUdhaarPending;

  const ordersCount = orders.length;
  const totalDeliveredOrders = orders.filter((o) => o.status === 'Delivered').length;
  const lowStockCount = products.filter(
    (p) => p.packetStock <= 0 || p.isLowStock || p.packetStock <= p.reorderLevel
  ).length;
  const onHoldCount = orders.filter((o) => o.status === 'On Hold').length;
  const confirmBalanceCallsCount = orders.filter(
    (o) => o.status === 'Packed' || o.status === 'On Hold'
  ).length;

  const udhaarShopsCount =
    new Set([
      ...pendingUdhaarList.map((u) => u.customerId || u.shopName),
      ...customers.filter((c) => (c.pendingUdhaar || 0) > 0).map((c) => c.shopName),
    ]).size || pendingUdhaarList.length;

  const pendingOrdersCount = orders.filter(
    (o) =>
      o.status === 'Advance Pending' ||
      o.status === 'Enquiry' ||
      (o.status === 'Booked' && !o.advancePaid)
  ).length;

  const orderConfirmList = orders.filter(
    (o) =>
      o.status === 'Booked' ||
      o.status === 'Advance Pending' ||
      o.status === 'Enquiry' ||
      o.status === 'On Hold' ||
      o.status === 'Reschedule'
  );
  const dispatchStageList = orders.filter((o) => o.status === 'Packed');
  const dispatchedStageList = orders.filter((o) => o.status === 'Dispatched');
  const deliveredStageList = orders.filter((o) => o.status === 'Delivered');
  const deliveryDelayList = orders.filter(
    (o) =>
      o.expectedDeliveryDate &&
      o.expectedDeliveryDate < SIMULATED_TODAY &&
      o.status !== 'Delivered' &&
      o.status !== 'Cancelled' &&
      o.status !== 'Returned'
  );
  const deliveryLateCount = deliveryDelayList.length;

  const needsAttentionTotal =
    lowStockCount + onHoldCount + deliveryLateCount + pendingOrdersCount;

  const pendingRegsCount = customerRegistrations.filter((r) => r.status === 'Pending').length;
  const approvedRegsCount = customerRegistrations.filter((r) => r.status === 'Approved').length;
  const sheetSavedCount = customerRegistrations.filter((r) => r.syncedToSheet).length;

  // Overall Supplier Aggregate Stats
  const totalSupplierPurchase = supplierOrders.reduce((sum, po) => sum + po.totalAmount, 0);
  const totalSupplierPayable = suppliers.reduce(
    (sum, s) => sum + (s.dueAmount || s.pendingDues || 0),
    0
  );
  const supplierDispatchedCount = supplierOrders.filter(
    (po) => po.status === 'Dispatched' || po.status === 'In Transit'
  ).length;
  const dispatchQueueCount = orders.filter(
    (o) => o.status === 'Booked' || o.status === 'Packed' || o.status === 'Dispatched'
  ).length;

  return (
    <div className="space-y-4 pb-24 max-w-5xl mx-auto">
      <OnboardingChecklist
        onAddProduct={onOpenNewProduct}
        onAddCustomer={onOpenNewCustomer}
        onCreateOrder={onOpenNewOrder}
      />

      {/* Section 1 & 2 (Top): Retailers Overall & Suppliers Overall */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Retailers Overall Data Section (Owner Home Top) */}
        <section className="space-y-1.5">
          <div className="flex items-center justify-between px-0.5">
            <div className="flex items-center gap-2 min-w-0">
              <Store className="w-4 h-4 text-amber-600 shrink-0" />
              <h2 className="text-xs sm:text-sm font-bold text-slate-800 truncate">
                Retailers Overall
              </h2>
              <span className="text-xs font-bold text-amber-700 tabular-nums">
                {customers.length}
              </span>
            </div>
            <button
              type="button"
              onClick={() => openMorePage('customers')}
              className="text-[11px] font-bold text-amber-700 flex items-center gap-1 whitespace-nowrap shrink-0"
            >
              <Maximize2 className="w-3 h-3" />
              <span>Full Detail</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="grid grid-cols-3 divide-x divide-y divide-slate-100">
              <button
                type="button"
                onClick={() => openMorePage('customers')}
                className="p-2.5 flex flex-col items-center text-center hover:bg-slate-50 transition"
              >
                <Store className="w-3.5 h-3.5 text-amber-600 mb-1" />
                <span className="text-sm font-black text-slate-900 tabular-nums leading-none">
                  {customers.length}
                </span>
                <span className="text-[10px] font-medium text-slate-500 mt-1">Shops</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('orders')}
                className="p-2.5 flex flex-col items-center text-center hover:bg-slate-50 transition"
              >
                <ShoppingBag className="w-3.5 h-3.5 text-sky-600 mb-1" />
                <span className="text-sm font-black text-slate-900 tabular-nums leading-none">
                  {ordersCount}
                </span>
                <span className="text-[10px] font-medium text-slate-500 mt-1">Orders</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('orders')}
                className="p-2.5 flex flex-col items-center text-center hover:bg-slate-50 transition"
              >
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600 mb-1" />
                <span className="text-sm font-black text-emerald-700 tabular-nums leading-none">
                  ₹{totalSales.toLocaleString('en-IN')}
                </span>
                <span className="text-[10px] font-medium text-slate-500 mt-1">Total Sale</span>
              </button>

              <button
                type="button"
                onClick={() => openMorePage('delivery')}
                className="p-2.5 flex flex-col items-center text-center hover:bg-slate-50 transition"
              >
                <BadgeCheck className="w-3.5 h-3.5 text-sky-600 mb-1" />
                <span className="text-sm font-black text-sky-700 tabular-nums leading-none">
                  {totalDeliveredOrders}
                </span>
                <span className="text-[10px] font-medium text-slate-500 mt-1">Delivered</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('khata')}
                className="p-2.5 flex flex-col items-center text-center hover:bg-slate-50 transition"
              >
                <Wallet className="w-3.5 h-3.5 text-rose-600 mb-1" />
                <span className="text-sm font-black text-rose-600 tabular-nums leading-none">
                  ₹{totalUdhaarPending.toLocaleString('en-IN')}
                </span>
                <span className="text-[10px] font-medium text-slate-500 mt-1">Udhaar Due</span>
              </button>

              <button
                type="button"
                onClick={() => openMorePage('registrations')}
                className="p-2.5 flex flex-col items-center text-center hover:bg-slate-50 transition"
              >
                <UserPlus className="w-3.5 h-3.5 text-emerald-600 mb-1" />
                <span className="text-sm font-black text-slate-900 tabular-nums leading-none">
                  {customerRegistrations.length}
                </span>
                <span className="text-[10px] font-medium text-slate-500 mt-1">New Reg</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => openMorePage('customers')}
              className="w-full px-3.5 py-2.5 border-t border-slate-100 bg-slate-50/60 hover:bg-amber-50/60 text-xs font-bold text-slate-700 hover:text-amber-800 flex items-center justify-between transition"
            >
              <span className="flex items-center gap-1.5">
                <Maximize2 className="w-3.5 h-3.5 text-amber-600" />
                <span>Full Detail · Retailers ({customers.length})</span>
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </section>

        {/* Suppliers Overall Data Section (Owner Home Top) */}
        <section className="space-y-1.5">
          <div className="flex items-center justify-between px-0.5">
            <div className="flex items-center gap-2 min-w-0">
              <Building2 className="w-4 h-4 text-indigo-600 shrink-0" />
              <h2 className="text-xs sm:text-sm font-bold text-slate-800 truncate">
                Suppliers Overall
              </h2>
              <span className="text-xs font-bold text-indigo-700 tabular-nums">
                {suppliers.length}
              </span>
            </div>
            <button
              type="button"
              onClick={() => openMorePage('suppliers')}
              className="text-[11px] font-bold text-indigo-700 flex items-center gap-1 whitespace-nowrap shrink-0"
            >
              <Maximize2 className="w-3 h-3" />
              <span>Full Detail</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="grid grid-cols-3 divide-x divide-y divide-slate-100">
              <button
                type="button"
                onClick={() => openMorePage('suppliers')}
                className="p-2.5 flex flex-col items-center text-center hover:bg-slate-50 transition"
              >
                <Building2 className="w-3.5 h-3.5 text-indigo-600 mb-1" />
                <span className="text-sm font-black text-slate-900 tabular-nums leading-none">
                  {suppliers.length}
                </span>
                <span className="text-[10px] font-medium text-slate-500 mt-1">Dealers</span>
              </button>

              <button
                type="button"
                onClick={() => openMorePage('suppliers')}
                className="p-2.5 flex flex-col items-center text-center hover:bg-slate-50 transition"
              >
                <ShoppingBag className="w-3.5 h-3.5 text-sky-600 mb-1" />
                <span className="text-sm font-black text-slate-900 tabular-nums leading-none">
                  {supplierOrders.length}
                </span>
                <span className="text-[10px] font-medium text-slate-500 mt-1">Total POs</span>
              </button>

              <button
                type="button"
                onClick={() => openMorePage('suppliers')}
                className="p-2.5 flex flex-col items-center text-center hover:bg-slate-50 transition"
              >
                <IndianRupee className="w-3.5 h-3.5 text-indigo-600 mb-1" />
                <span className="text-sm font-black text-indigo-700 tabular-nums leading-none">
                  ₹{totalSupplierPurchase.toLocaleString('en-IN')}
                </span>
                <span className="text-[10px] font-medium text-slate-500 mt-1">Purchase</span>
              </button>

              <button
                type="button"
                onClick={() => openMorePage('suppliers')}
                className="p-2.5 flex flex-col items-center text-center hover:bg-slate-50 transition"
              >
                <Truck className="w-3.5 h-3.5 text-sky-600 mb-1" />
                <span className="text-sm font-black text-sky-700 tabular-nums leading-none">
                  {supplierDispatchedCount}
                </span>
                <span className="text-[10px] font-medium text-slate-500 mt-1">In Transit</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('khata')}
                className="p-2.5 flex flex-col items-center text-center hover:bg-slate-50 transition"
              >
                <Wallet className="w-3.5 h-3.5 text-amber-600 mb-1" />
                <span className="text-sm font-black text-amber-700 tabular-nums leading-none">
                  ₹{totalSupplierPayable.toLocaleString('en-IN')}
                </span>
                <span className="text-[10px] font-medium text-slate-500 mt-1">Payable</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('stock')}
                className="p-2.5 flex flex-col items-center text-center hover:bg-slate-50 transition"
              >
                <Package className="w-3.5 h-3.5 text-rose-600 mb-1" />
                <span className="text-sm font-black text-rose-600 tabular-nums leading-none">
                  {lowStockCount}
                </span>
                <span className="text-[10px] font-medium text-slate-500 mt-1">Low Stock</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => openMorePage('suppliers')}
              className="w-full px-3.5 py-2.5 border-t border-slate-100 bg-slate-50/60 hover:bg-indigo-50/60 text-xs font-bold text-slate-700 hover:text-indigo-800 flex items-center justify-between transition"
            >
              <span className="flex items-center gap-1.5">
                <Maximize2 className="w-3.5 h-3.5 text-indigo-600" />
                <span>Full Detail · Suppliers ({suppliers.length})</span>
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </section>
      </div>

      {/* Section 3: Summary + Today Overview */}
      <section className="space-y-2">
        <div className="flex items-center justify-between px-0.5">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-sky-600" />
            <h2 className="text-xs sm:text-sm font-bold text-slate-800">Summary</h2>
          </div>
          <button
            type="button"
            onClick={() => openMorePage('reports')}
            className="text-[11px] font-bold text-sky-700 flex items-center gap-1 whitespace-nowrap"
          >
            <Maximize2 className="w-3 h-3" />
            <span>Full Detail</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-xs text-left hover:border-sky-300 active:scale-[0.98] transition"
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 stroke-[2.2]" />
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>
            <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight block mt-2.5 tabular-nums">
              ₹{totalSales.toLocaleString('en-IN')}
            </span>
            <div className="flex items-center justify-between mt-0.5 text-xs">
              <span className="font-semibold text-slate-500">{t.totalSales}</span>
              <span className="font-bold text-sky-700 tabular-nums">{ordersCount}</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('khata')}
            className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-xs text-left hover:border-amber-300 active:scale-[0.98] transition"
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="w-4 h-4 stroke-[2.2]" />
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>
            <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight block mt-2.5 tabular-nums">
              ₹{moneyPendingTotal.toLocaleString('en-IN')}
            </span>
            <div className="flex items-center justify-between mt-0.5 text-xs">
              <span className="font-semibold text-slate-500">{t.moneyPending}</span>
              <span className="font-bold text-amber-700 tabular-nums">{udhaarShopsCount}</span>
            </div>
          </button>
        </div>

        {/* Today Key Metrics Table (Today Sale, Today Profit, Today Dispatch, Today Delivered, Collection, Orders) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="px-3.5 py-2 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-700">Today Overview</span>
            <span className="text-[10px] font-bold text-sky-700 tabular-nums">
              {todayOrders.length} Orders · {pendingOrdersCount} Pending
            </span>
          </div>

          <div className="grid grid-cols-2 divide-x divide-slate-100 border-b border-slate-100">
            <button
              type="button"
              onClick={() => setActiveTab('orders')}
              className="p-3 flex flex-col items-start text-left hover:bg-slate-50/80 transition space-y-2"
            >
              <div className="w-full flex items-center justify-between gap-1">
                <span className="text-[10px] font-semibold text-slate-500">Today Sale</span>
                <TrendingUp className="w-3.5 h-3.5 text-sky-600 shrink-0" />
              </div>
              <span className="text-base sm:text-lg font-black text-slate-900 tabular-nums leading-none">
                ₹{todaySales.toLocaleString('en-IN')}
              </span>
              <TodayTrendSparkline trend={ownerSalesWeeklyTrend} accentColor="#0284c7" />
            </button>

            <button
              type="button"
              onClick={() => openMorePage('reports')}
              className="p-3 flex flex-col items-start text-left hover:bg-slate-50/80 transition space-y-2"
            >
              <div className="w-full flex items-center justify-between gap-1">
                <span className="text-[10px] font-semibold text-slate-500">Today Profit</span>
                <IndianRupee className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              </div>
              <span className="text-base sm:text-lg font-black text-emerald-700 tabular-nums leading-none">
                ₹{todayProfit.toLocaleString('en-IN')}
              </span>
              <TodayTrendSparkline trend={ownerProfitWeeklyTrend} accentColor="#059669" />
            </button>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 divide-x divide-y divide-slate-100">
            <button
              type="button"
              onClick={() => setActiveTab('khata')}
              className="p-2.5 flex flex-col items-center text-center hover:bg-slate-50 transition"
            >
              <Wallet className="w-3.5 h-3.5 text-amber-600 mb-1" />
              <span className="text-sm font-black text-slate-900 tabular-nums leading-none">
                ₹{todayCollection.toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] font-medium text-slate-500 mt-1">Today Cash</span>
            </button>

            <button
              type="button"
              onClick={() => openMorePage('delivery')}
              className="p-2.5 flex flex-col items-center text-center hover:bg-slate-50 transition"
            >
              <Send className="w-3.5 h-3.5 text-indigo-600 mb-1" />
              <span className="text-sm font-black text-indigo-700 tabular-nums leading-none">
                {todayDispatchedCount}
              </span>
              <span className="text-[10px] font-medium text-slate-500 mt-1">Dispatch</span>
            </button>

            <button
              type="button"
              onClick={() => openMorePage('delivery')}
              className="p-2.5 flex flex-col items-center text-center hover:bg-slate-50 transition"
            >
              <BadgeCheck className="w-3.5 h-3.5 text-emerald-600 mb-1" />
              <span className="text-sm font-black text-emerald-700 tabular-nums leading-none">
                {todayDeliveredCount}
              </span>
              <span className="text-[10px] font-medium text-slate-500 mt-1">Delivered</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('orders')}
              className="p-2.5 flex flex-col items-center text-center hover:bg-slate-50 transition"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-sky-700 mb-1" />
              <span className="text-sm font-black text-slate-900 tabular-nums leading-none">
                {todayOrders.length}
              </span>
              <span className="text-[10px] font-medium text-slate-500 mt-1">Orders</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('orders')}
              className="p-2.5 flex flex-col items-center text-center hover:bg-slate-50 transition"
            >
              <Clock
                className={`w-3.5 h-3.5 mb-1 ${
                  pendingOrdersCount > 0 ? 'text-amber-600' : 'text-slate-500'
                }`}
              />
              <span
                className={`text-sm font-black tabular-nums leading-none ${
                  pendingOrdersCount > 0 ? 'text-amber-700' : 'text-slate-900'
                }`}
              >
                {pendingOrdersCount}
              </span>
              <span className="text-[10px] font-medium text-slate-500 mt-1">Order Pending</span>
            </button>

            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="p-2.5 flex flex-col items-center text-center hover:bg-slate-50 transition"
            >
              <ShoppingCart
                className={`w-3.5 h-3.5 mb-1 ${
                  cartProductsCount > 0 ? 'text-sky-600' : 'text-slate-500'
                }`}
              />
              <span
                className={`text-sm font-black tabular-nums leading-none ${
                  cartProductsCount > 0 ? 'text-sky-700' : 'text-slate-900'
                }`}
              >
                {cartProductsCount}
              </span>
              <span className="text-[10px] font-medium text-slate-500 mt-1">
                {totalCartItems > 0 ? `Cart (${totalCartItems} pkt)` : 'Cart Products'}
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Section 4: Unified Business Overview (All Order Confirm, Dispatch, Dispatched, Delivered, Delivery Delay + Core KPIs) */}
      <section className="space-y-1.5">
        <div className="flex items-center justify-between px-0.5">
          <div className="flex items-center gap-2">
            <LayoutGrid className="w-4 h-4 text-slate-600" />
            <h2 className="text-xs sm:text-sm font-bold text-slate-800">Overview</h2>
          </div>
          <button
            type="button"
            onClick={() => openMorePage('hubSnapshot')}
            className="text-[11px] font-bold text-sky-700 flex items-center gap-1 whitespace-nowrap"
          >
            <Maximize2 className="w-3 h-3" />
            <span>Full Detail</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="grid grid-cols-3 divide-x divide-y divide-slate-100">
            <button
              type="button"
              onClick={() => setActiveTab('orders')}
              className="p-3 flex flex-col items-center text-center hover:bg-slate-50 active:bg-slate-100/70 transition"
            >
              <ShoppingBag className="w-4 h-4 text-sky-600 mb-1.5 stroke-[2.2]" />
              <span className="text-lg font-black text-slate-900 tabular-nums leading-none">
                {ordersCount}
              </span>
              <span className="text-[11px] font-medium text-slate-500 mt-1 truncate max-w-full">
                {t.orders}
              </span>
            </button>

            <button
              type="button"
              onClick={() => openMorePage('delivery')}
              className="p-3 flex flex-col items-center text-center hover:bg-slate-50 active:bg-slate-100/70 transition"
            >
              <CheckCircle2 className="w-4 h-4 text-sky-600 mb-1.5 stroke-[2.2]" />
              <span className="text-lg font-black text-sky-800 tabular-nums leading-none">
                {orderConfirmList.length}
              </span>
              <span className="text-[11px] font-medium text-slate-500 mt-1 truncate max-w-full">
                Order Confirm
              </span>
              <span className="text-[10px] font-semibold text-slate-400 tabular-nums mt-0.5 truncate max-w-full">
                ₹{orderConfirmList.reduce((s, o) => s + o.totalAmount, 0).toLocaleString('en-IN')}
              </span>
            </button>

            <button
              type="button"
              onClick={() => openMorePage('delivery')}
              className="p-3 flex flex-col items-center text-center hover:bg-slate-50 active:bg-slate-100/70 transition"
            >
              <PackageCheck className="w-4 h-4 text-blue-600 mb-1.5 stroke-[2.2]" />
              <span className="text-lg font-black text-blue-800 tabular-nums leading-none">
                {dispatchStageList.length}
              </span>
              <span className="text-[11px] font-medium text-slate-500 mt-1 truncate max-w-full">
                Dispatch
              </span>
              <span className="text-[10px] font-semibold text-slate-400 tabular-nums mt-0.5 truncate max-w-full">
                ₹{dispatchStageList.reduce((s, o) => s + o.totalAmount, 0).toLocaleString('en-IN')}
              </span>
            </button>

            <button
              type="button"
              onClick={() => openMorePage('delivery')}
              className="p-3 flex flex-col items-center text-center hover:bg-slate-50 active:bg-slate-100/70 transition"
            >
              <Send className="w-4 h-4 text-indigo-600 mb-1.5 stroke-[2.2]" />
              <span className="text-lg font-black text-indigo-800 tabular-nums leading-none">
                {dispatchedStageList.length}
              </span>
              <span className="text-[11px] font-medium text-slate-500 mt-1 truncate max-w-full">
                Dispatched
              </span>
              <span className="text-[10px] font-semibold text-slate-400 tabular-nums mt-0.5 truncate max-w-full">
                ₹{dispatchedStageList.reduce((s, o) => s + o.totalAmount, 0).toLocaleString('en-IN')}
              </span>
            </button>

            <button
              type="button"
              onClick={() => openMorePage('delivery')}
              className="p-3 flex flex-col items-center text-center hover:bg-slate-50 active:bg-slate-100/70 transition"
            >
              <BadgeCheck className="w-4 h-4 text-emerald-600 mb-1.5 stroke-[2.2]" />
              <span className="text-lg font-black text-emerald-700 tabular-nums leading-none">
                {deliveredStageList.length}
              </span>
              <span className="text-[11px] font-medium text-slate-500 mt-1 truncate max-w-full">
                Delivered
              </span>
              <span className="text-[10px] font-semibold text-slate-400 tabular-nums mt-0.5 truncate max-w-full">
                ₹{deliveredStageList.reduce((s, o) => s + o.totalAmount, 0).toLocaleString('en-IN')}
              </span>
            </button>

            <button
              type="button"
              onClick={() => openMorePage('delivery')}
              className="p-3 flex flex-col items-center text-center hover:bg-slate-50 active:bg-slate-100/70 transition"
            >
              <AlertTriangle
                className={`w-4 h-4 mb-1.5 stroke-[2.2] ${
                  deliveryLateCount > 0 ? 'text-rose-600' : 'text-slate-600'
                }`}
              />
              <span
                className={`text-lg font-black tabular-nums leading-none ${
                  deliveryLateCount > 0 ? 'text-rose-600' : 'text-slate-900'
                }`}
              >
                {deliveryLateCount}
              </span>
              <span className="text-[11px] font-medium text-slate-500 mt-1 truncate max-w-full">
                Delivery Delay
              </span>
              <span className="text-[10px] font-semibold text-slate-400 tabular-nums mt-0.5 truncate max-w-full">
                ₹{deliveryDelayList.reduce((s, o) => s + o.totalAmount, 0).toLocaleString('en-IN')}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('orders')}
              className="p-3 flex flex-col items-center text-center hover:bg-slate-50 active:bg-slate-100/70 transition"
            >
              <Clock className="w-4 h-4 text-sky-700 mb-1.5 stroke-[2.2]" />
              <span className="text-lg font-black text-sky-700 tabular-nums leading-none">
                {pendingOrdersCount}
              </span>
              <span className="text-[11px] font-medium text-slate-500 mt-1 truncate max-w-full">
                Pending
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('stock')}
              className="p-3 flex flex-col items-center text-center hover:bg-slate-50 active:bg-slate-100/70 transition"
            >
              <Package
                className={`w-4 h-4 mb-1.5 stroke-[2.2] ${
                  lowStockCount > 0 ? 'text-rose-600' : 'text-emerald-600'
                }`}
              />
              <span
                className={`text-lg font-black tabular-nums leading-none ${
                  lowStockCount > 0 ? 'text-rose-600' : 'text-slate-900'
                }`}
              >
                {lowStockCount}
              </span>
              <span className="text-[11px] font-medium text-slate-500 mt-1 truncate max-w-full">
                {t.lowStock}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('khata')}
              className="p-3 flex flex-col items-center text-center hover:bg-slate-50 active:bg-slate-100/70 transition"
            >
              <Wallet className="w-4 h-4 text-amber-700 mb-1.5 stroke-[2.2]" />
              <span className="text-lg font-black text-slate-900 tabular-nums leading-none">
                {udhaarShopsCount}
              </span>
              <span className="text-[11px] font-medium text-slate-500 mt-1 truncate max-w-full">
                Udhaar
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Section 5: Today Tasks */}
      <section className="space-y-1.5">
        <div className="flex items-center justify-between px-0.5">
          <div className="flex items-center gap-2">
            <ListChecks className="w-4 h-4 text-rose-600" />
            <h2 className="text-xs sm:text-sm font-bold text-slate-800">Today Tasks</h2>
            <span className="text-xs font-bold text-rose-600 tabular-nums">
              {needsAttentionTotal}
            </span>
          </div>
          <button
            type="button"
            onClick={() => openMorePage('hubSnapshot')}
            className="text-[11px] font-bold text-rose-700 flex items-center gap-1 whitespace-nowrap"
          >
            <Maximize2 className="w-3 h-3" />
            <span>Full Detail</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs divide-y divide-slate-100 overflow-hidden">
          <button
            type="button"
            onClick={() => openMorePage('delivery')}
            className="w-full px-3.5 py-3 flex items-center justify-between gap-2 hover:bg-slate-50 transition text-left"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <Send className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-900 truncate">Dispatch</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-bold text-indigo-700 tabular-nums">
                {dispatchQueueCount} · Today {todayDispatchedCount}
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>
          </button>

          <button
            type="button"
            onClick={() => setIsCallSheetModalOpen(true)}
            className="w-full px-3.5 py-3 flex items-center justify-between gap-2 hover:bg-slate-50 transition text-left"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                <Phone className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-900 truncate">Call Sheet</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-sm font-black text-sky-700 tabular-nums">
                {confirmBalanceCallsCount}
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('stock')}
            className="w-full px-3.5 py-3 flex items-center justify-between gap-2 hover:bg-slate-50 transition text-left"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Package className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-900 truncate">Reorder Stock</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-sm font-black text-amber-700 tabular-nums">
                {lowStockCount}
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('khata')}
            className="w-full px-3.5 py-3 flex items-center justify-between gap-2 hover:bg-slate-50 transition text-left"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <Wallet className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-900 truncate">Udhaar Due</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-bold text-rose-600 tabular-nums">
                ₹{totalUdhaarPending.toLocaleString('en-IN')} · {udhaarShopsCount}
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>
          </button>

          <button
            type="button"
            onClick={() => openMorePage('hubSnapshot')}
            className="w-full px-3.5 py-2.5 bg-slate-50/60 hover:bg-rose-50/60 text-xs font-bold text-slate-700 hover:text-rose-700 flex items-center justify-between transition"
          >
            <span className="flex items-center gap-1.5">
              <Maximize2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Full Detail · Hub Dues & Stock</span>
            </span>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </section>

      {/* Section 6: New Registrations */}
      <section className="space-y-1.5">
        <div className="flex items-center justify-between px-0.5">
          <div className="flex items-center gap-2 min-w-0">
            <UserPlus className="w-4 h-4 text-emerald-600 shrink-0" />
            <h2 className="text-xs sm:text-sm font-bold text-slate-800 truncate">
              Registrations
            </h2>
            <span className="text-xs font-bold text-emerald-700 tabular-nums">
              {customerRegistrations.length}
            </span>
          </div>

          <button
            type="button"
            onClick={() => openMorePage('registrations')}
            className="text-[11px] font-bold text-emerald-700 flex items-center gap-1 whitespace-nowrap shrink-0"
          >
            <Maximize2 className="w-3 h-3" />
            <span>Full Detail</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div
            onClick={() => openMorePage('registrations')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && openMorePage('registrations')}
            className="grid grid-cols-4 divide-x divide-slate-100 cursor-pointer hover:bg-slate-50/70 transition"
          >
            <div className="py-2.5 px-1.5 flex flex-col items-center text-center">
              <UserPlus className="w-3.5 h-3.5 text-slate-500 mb-1" />
              <span className="text-sm font-black text-slate-900 tabular-nums leading-none">
                {customerRegistrations.length}
              </span>
              <span className="text-[10px] font-medium text-slate-500 mt-1">New</span>
            </div>

            <div className="py-2.5 px-1.5 flex flex-col items-center text-center">
              <Clock className="w-3.5 h-3.5 text-amber-600 mb-1" />
              <span className="text-sm font-black text-amber-700 tabular-nums leading-none">
                {pendingRegsCount}
              </span>
              <span className="text-[10px] font-medium text-slate-500 mt-1">Pending</span>
            </div>

            <div className="py-2.5 px-1.5 flex flex-col items-center text-center">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mb-1" />
              <span className="text-sm font-black text-emerald-700 tabular-nums leading-none">
                {approvedRegsCount}
              </span>
              <span className="text-[10px] font-medium text-slate-500 mt-1">Approved</span>
            </div>

            <div className="py-2.5 px-1.5 flex flex-col items-center text-center">
              <FileSpreadsheet className="w-3.5 h-3.5 text-sky-600 mb-1" />
              <span className="text-sm font-black text-sky-700 tabular-nums leading-none">
                {sheetSavedCount}
              </span>
              <span className="text-[10px] font-medium text-slate-500 mt-1">Saved</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => openMorePage('registrations')}
            className="w-full px-3.5 py-2.5 border-t border-slate-100 bg-slate-50/60 hover:bg-emerald-50/60 text-xs font-bold text-slate-700 hover:text-emerald-800 flex items-center justify-between transition"
          >
            <span className="flex items-center gap-1.5">
              <Maximize2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Full Detail · Registrations ({customerRegistrations.length})</span>
            </span>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </section>

      {/* Section 9: Digital Marketing Table */}
      <DigitalMarketingSection />

      {/* Section 10: Revenue Chart */}
      <section className="space-y-1.5">
        <div className="flex items-center justify-between px-0.5">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-sky-600" />
            <h2 className="text-xs sm:text-sm font-bold text-slate-800">
              {tr('Revenue', language)}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => openMorePage('hubSnapshot')}
            className="text-[11px] font-bold text-sky-700 flex items-center gap-1 whitespace-nowrap"
          >
            <Maximize2 className="w-3 h-3" />
            <span>Full Detail</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-3.5 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setIsYearPickerOpen(true)}
                className="text-xs font-bold text-slate-800 hover:text-sky-700 transition tabular-nums"
              >
                {selectedYear}
                {selectedMonth !== null ? ` · M${selectedMonth + 1}` : ' · Yearly'}
              </button>

              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-[10px] font-semibold shrink-0">
                {(['today', 'week', 'month', 'year'] as const).map((tf) => (
                  <button
                    key={tf}
                    type="button"
                    onClick={() => setTimeFilter(tf)}
                    className={`px-2 py-1 rounded-md capitalize transition whitespace-nowrap ${
                      timeFilter === tf ? 'bg-white text-slate-900 font-bold shadow-2xs' : 'text-slate-500'
                    }`}
                  >
                    {t[tf]}
                  </button>
                ))}
              </div>
            </div>

            <div
              onClick={() => openMorePage('hubSnapshot')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && openMorePage('hubSnapshot')}
              className="h-24 w-full pt-1 cursor-pointer"
            >
              <svg className="w-full h-full overflow-visible" viewBox="0 0 400 100">
                <defs>
                  <linearGradient id="areaGradientClean" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0284C7" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#0284C7" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <line x1="0" y1="25" x2="400" y2="25" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="0" y1="60" x2="400" y2="60" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="0" y1="95" x2="400" y2="95" stroke="#E2E8F0" strokeWidth="1" />
                <path
                  d="M 20 80 Q 90 40 160 68 T 280 82 T 390 16 L 390 95 L 20 95 Z"
                  fill="url(#areaGradientClean)"
                />
                <path
                  d="M 20 80 Q 90 40 160 68 T 280 82 T 390 16"
                  fill="none"
                  stroke="#0284C7"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <circle cx="390" cy="16" r="4" fill="#0369A1" stroke="#FFFFFF" strokeWidth="2" />
              </svg>
            </div>
          </div>

          <button
            type="button"
            onClick={() => openMorePage('hubSnapshot')}
            className="w-full px-3.5 py-2.5 border-t border-slate-100 bg-slate-50/60 hover:bg-sky-50/60 text-xs font-bold text-slate-700 hover:text-sky-700 flex items-center justify-between transition"
          >
            <span className="flex items-center gap-1.5">
              <Maximize2 className="w-3.5 h-3.5 text-sky-600" />
              <span>Full Detail · Hub Snapshot</span>
            </span>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </section>

      <YearMonthFilterModal isOpen={isYearPickerOpen} onClose={() => setIsYearPickerOpen(false)} />

      <DispatchCallSheetModal
        isOpen={isCallSheetModalOpen}
        onClose={() => setIsCallSheetModalOpen(false)}
      />
    </div>
  );
};
