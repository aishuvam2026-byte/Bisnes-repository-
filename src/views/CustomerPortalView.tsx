import React from 'react';
import { useApp } from '../context/AppContext';
import { tr } from '../data/translations';
import {
  ShoppingBag,
  ShoppingCart,
  Phone,
  MessageSquare,
  MapPin,
  Truck,
  Wallet,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  FileText,
  BarChart3,
  ListChecks,
  Clock,
  Maximize2,
  TrendingUp,
  IndianRupee,
  Send,
  BadgeCheck,
  LayoutGrid,
  PackageCheck,
} from 'lucide-react';
import { DigitalMarketingSection } from '../components/DigitalMarketingSection';
import {
  TodayTrendSparkline,
  buildWeeklySparklineData,
} from '../components/TodayTrendSparkline';

export const CustomerPortalView: React.FC<{
  onOpenNewOrder: () => void;
  onOpenKhata: () => void;
}> = ({ onOpenKhata }) => {
  const {
    user,
    customers,
    orders,
    payments,
    udhaar,
    settings,
    openMorePage,
    setActiveTab,
    setActiveSubPage,
    cart,
    totalCartItems,
    setIsCartOpen,
    language,
    t,
  } = useApp();

  const SIMULATED_TODAY = '2026-11-09';
  const liveTodayPrefix = new Date().toISOString().slice(0, 10);
  const isTodayDate = (val?: string) =>
    Boolean(val && (val.startsWith(liveTodayPrefix) || val.startsWith(SIMULATED_TODAY)));

  const loggedInCustomer = customers.find((c) => c.id === user?.customerId) || customers[0];
  const customerId = loggedInCustomer?.id || user?.customerId || 'cust-demo-1';

  const myOrders = orders.filter(
    (o) =>
      o.customerId === customerId ||
      (loggedInCustomer?.phone && o.phone === loggedInCustomer.phone)
  );
  const myUdhaar = udhaar.filter(
    (u) =>
      (u.customerId === customerId ||
        (loggedInCustomer?.shopName && u.shopName === loggedInCustomer.shopName)) &&
      u.status === 'Pending'
  );
  const myPayments = payments.filter(
    (p) =>
      p.customerId === customerId ||
      (loggedInCustomer?.shopName && p.shopName === loggedInCustomer.shopName)
  );

  // Scoped Today Metrics for THIS Retailer ID
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
  const cartProductsCount = Object.values(cart).filter((q) => q > 0).length;

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

  const totalDue = myOrders.reduce(
    (sum, o) => sum + (o.status !== 'Delivered' && o.status !== 'Cancelled' ? o.balanceAmount : 0),
    0
  );
  const udhaarFromRecords = myUdhaar.reduce((sum, u) => sum + u.shortageAmount, 0);
  const pendingUdhaarAmount = Math.max(Number(loggedInCustomer?.pendingUdhaar || 0), udhaarFromRecords);
  const hasUdhaar = pendingUdhaarAmount > 0;

  const activeOrder =
    myOrders.find((o) => o.status !== 'Delivered' && o.status !== 'Cancelled') || myOrders[0];

  const getTrackStepIndex = (status: string) => {
    switch (status) {
      case 'Advance Pending':
      case 'Enquiry':
      case 'Booked':
        return 1;
      case 'Packed':
        return 2;
      case 'Dispatched':
      case 'On Hold':
        return 3;
      case 'Delivered':
        return 5;
      default:
        return 4;
    }
  };

  const trackStep = activeOrder ? getTrackStepIndex(activeOrder.status) : 0;
  const shopName = loggedInCustomer?.shopName || 'Retailer Shop';
  const ownerName = loggedInCustomer?.ownerName || user?.name || 'Retailer';
  const areaLabel = loggedInCustomer?.villageOrTown || loggedInCustomer?.city || 'Nuapatna';
  const todayTasksCount = (activeOrder ? 1 : 0) + (hasUdhaar ? 1 : 0);

  return (
    <div className="space-y-4 pb-24 max-w-4xl mx-auto">
      {/* Clean Shop Header */}
      <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center font-black text-base shrink-0">
            {shopName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 truncate">{shopName}</h2>
            <p className="text-xs text-slate-500 truncate">
              {ownerName} · {areaLabel}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <a
            href={`tel:${settings.ownerPhone}`}
            aria-label="Call Hub"
            className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 hover:bg-sky-100 flex items-center justify-center transition"
          >
            <Phone className="w-4 h-4" />
          </a>
          <a
            href={`https://wa.me/91${settings.ownerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(
              `Namaste Shuvam Bhai! ${shopName}`
            )}`}
            target="_blank"
            rel="noreferrer"
            aria-label="WhatsApp Hub"
            className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 flex items-center justify-center transition"
          >
            <MessageSquare className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Section 1: Summary + Today Overview */}
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
            onClick={onOpenKhata}
            className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-xs text-left hover:border-amber-300 active:scale-[0.98] transition"
          >
            <div className="flex items-center justify-between">
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                  hasUdhaar ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'
                }`}
              >
                <Wallet className="w-4 h-4" />
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>
            <span className="text-xl sm:text-2xl font-black text-slate-900 block mt-2.5 tabular-nums">
              ₹{(totalDue + pendingUdhaarAmount).toLocaleString('en-IN')}
            </span>
            <span className="text-xs font-semibold text-slate-500 mt-0.5 block">
              {tr('Balance Due', language)}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveSubPage(null);
              setActiveTab('orders');
            }}
            className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-xs text-left hover:border-sky-300 active:scale-[0.98] transition"
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>
            <span className="text-xl sm:text-2xl font-black text-slate-900 block mt-2.5 tabular-nums">
              {myOrders.length}
            </span>
            <span className="text-xs font-semibold text-slate-500 mt-0.5 block">
              {t.orders}
            </span>
          </button>
        </div>

        {/* Today Overview Compact Table */}
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
              onClick={() => {
                setActiveSubPage(null);
                setActiveTab('orders');
              }}
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
              onClick={onOpenKhata}
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
              onClick={() => {
                setActiveSubPage(null);
                setActiveTab('orders');
              }}
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
              onClick={() => {
                setActiveSubPage(null);
                setActiveTab('orders');
              }}
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

      {/* Section 1B: Unified Overview Table */}
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
              onClick={() => {
                setActiveSubPage(null);
                setActiveTab('orders');
              }}
              className="p-3 flex flex-col items-center text-center hover:bg-slate-50 active:bg-slate-100/70 transition"
            >
              <ShoppingBag className="w-4 h-4 text-sky-600 mb-1.5 stroke-[2.2]" />
              <span className="text-lg font-black text-slate-900 tabular-nums leading-none">
                {myOrders.length}
              </span>
              <span className="text-[11px] font-medium text-slate-500 mt-1 truncate max-w-full">
                {t.orders}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveSubPage(null);
                setActiveTab('orders');
              }}
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
              onClick={() => {
                setActiveSubPage(null);
                setActiveTab('orders');
              }}
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
              onClick={() => {
                setActiveSubPage(null);
                setActiveTab('orders');
              }}
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
              onClick={() => {
                setActiveSubPage(null);
                setActiveTab('orders');
              }}
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
              onClick={() => {
                setActiveSubPage(null);
                setActiveTab('orders');
              }}
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

      {/* Section 2: Today Tasks */}
      <section className="space-y-1.5">
        <div className="flex items-center justify-between px-0.5">
          <div className="flex items-center gap-2">
            <ListChecks className="w-4 h-4 text-rose-600" />
            <h2 className="text-xs sm:text-sm font-bold text-slate-800">Today Tasks</h2>
            <span className="text-xs font-bold text-rose-600 tabular-nums">
              {todayTasksCount}
            </span>
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
          <button
            type="button"
            onClick={() => openMorePage('myFullOrders')}
            className="w-full px-3.5 py-3 hover:bg-slate-50 transition text-left space-y-2"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                  <Truck className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-slate-900 truncate">
                  {activeOrder ? `Order #${activeOrder.orderNumber}` : 'Order Tracking'}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-bold text-sky-700">
                  {activeOrder ? activeOrder.status : '0'}
                </span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </div>

            {activeOrder && (
              <div className="grid grid-cols-5 gap-1">
                {[1, 2, 3, 4, 5].map((step) => (
                  <div
                    key={step}
                    className={`h-1.5 rounded-full ${
                      trackStep >= step ? 'bg-sky-600' : 'bg-slate-200'
                    }`}
                  />
                ))}
              </div>
            )}
          </button>

          <button
            type="button"
            onClick={onOpenKhata}
            className="w-full px-3.5 py-3 flex items-center justify-between gap-2 hover:bg-slate-50 transition text-left"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  hasUdhaar ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
                }`}
              >
                {hasUdhaar ? (
                  <AlertTriangle className="w-4 h-4" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
              </div>
              <span className="text-xs font-bold text-slate-900">Udhaar Check</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span
                className={`text-sm font-black tabular-nums ${
                  hasUdhaar ? 'text-rose-600' : 'text-emerald-700'
                }`}
              >
                ₹{pendingUdhaarAmount.toLocaleString('en-IN')}
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>
          </button>

          <button
            type="button"
            onClick={() => openMorePage('invoices')}
            className="w-full px-3.5 py-3 flex items-center justify-between gap-2 hover:bg-slate-50 transition text-left"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-900">Bills & GST</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-sm font-black text-slate-900 tabular-nums">
                {myOrders.length}
              </span>
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
              <span>Full Detail · Orders ({myOrders.length})</span>
            </span>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </section>

      {/* Section 3: Digital Marketing */}
      <DigitalMarketingSection />

      {/* Section 6: Hub Location */}
      <section className="space-y-1.5">
        <div className="flex items-center gap-2 px-0.5">
          <MapPin className="w-4 h-4 text-sky-600" />
          <h2 className="text-xs sm:text-sm font-bold text-slate-800">Hub Location</h2>
        </div>

        <div className="bg-white rounded-2xl px-3.5 py-2.5 border border-slate-200/80 shadow-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <MapPin className="w-4 h-4 text-sky-600 shrink-0" />
            <span className="text-xs font-semibold text-slate-700 truncate">
              Nuapatna, Cuttack
            </span>
          </div>
          <a
            href="https://maps.google.com/?q=Nuapatna,Cuttack,Odisha+754035"
            target="_blank"
            rel="noreferrer"
            className="text-xs font-bold text-sky-600 hover:text-sky-800 whitespace-nowrap shrink-0"
          >
            Map
          </a>
        </div>
      </section>
    </div>
  );
};
