import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { tr } from '../data/translations';
import { Order, OrderStatus, Customer, Product, OrderItem } from '../types';
import {
  Search,
  Filter,
  Plus,
  Phone,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Truck,
  ArrowRight,
  Package,
  Calendar,
  X,
  FileText,
  Share2,
  RotateCcw,
  QrCode,
  Copy,
  ExternalLink,
  ShieldCheck,
  MapPin,
  PackageCheck,
  Send,
  Check,
  ShoppingBag,
  CreditCard,
  Store,
  Building2,
  KeyRound,
  AlertCircle,
  Download,
} from 'lucide-react';
import { validateOrderMinimum, calculateDeliveryFee, checkCustomerCanOrder } from '../utils/businessRules';
import { PaymentGateway } from '../components/PaymentGateway';
import { OrderChallanBillModal } from '../components/OrderChallanBillModal';
import {
  downloadAndShareBillPdfOnWhatsApp,
  getOrderCategoriesSummary,
} from '../utils/billPdfGenerator';

export const OrdersView: React.FC<{
  isNewOrderOpenDirect?: boolean;
  onCloseNewOrderDirect?: () => void;
}> = ({ isNewOrderOpenDirect = false, onCloseNewOrderDirect }) => {
  const {
    orders,
    customers,
    products,
    suppliers,
    supplierOrders,
    updateSupplierOrderStatus,
    settleSupplierBill,
    addOrder,
    updateOrderStatus,
    settings,
    openMorePage,
    showToast,
    role,
    user,
    language,
    clearCustomerUdhaar,
    addPayment,
  } = useApp();

  const loggedInCustomer = customers.find((c) => c.id === user?.customerId) || customers[0];
  const loggedInSupplier = suppliers.find((s) => s.id === user?.supplierId) || suppliers[0];

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Owner toggle between Dukani Wholesale Orders and Supplier Consignments
  const [ownerViewSection, setOwnerViewSection] = useState<'dukani' | 'supplier'>('dukani');

  // Delivery OTP Verification Modal State
  const [deliveryOtpModalOrder, setDeliveryOtpModalOrder] = useState<Order | null>(null);
  const [enteredOtp, setEnteredOtp] = useState<string>('');
  const [otpError, setOtpError] = useState<string>('');
  const [isOtpSent, setIsOtpSent] = useState<boolean>(false);

  const getOrderDeliveryOtp = (ord: Order): string => {
    let sum = 0;
    for (let i = 0; i < ord.orderNumber.length; i++) {
      sum = (sum * 37 + ord.orderNumber.charCodeAt(i)) % 9000;
    }
    return String(1000 + (sum % 9000));
  };

  const handleStartDeliveryOtpFlow = (ord: Order) => {
    setDeliveryOtpModalOrder(ord);
    setEnteredOtp('');
    setOtpError('');
    setIsOtpSent(false);
  };

  // New Order Modal State
  const [isCreatingOrder, setIsCreatingOrder] = useState(isNewOrderOpenDirect);
  const [orderStep, setOrderStep] = useState<number>(1);

  // Stepper state
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [orderItems, setOrderItems] = useState<Array<{ productId: string; packetQty: number }>>([]);
  const [advancePaidMode, setAdvancePaidMode] = useState<'UPI' | 'Cash' | 'Bank'>('UPI');
  const [advanceRefId, setAdvanceRefId] = useState<string>('');
  const [isAdvanceVerified, setIsAdvanceVerified] = useState<boolean>(false);
  const [isClearingUdhaar, setIsClearingUdhaar] = useState<boolean>(false);
  const [expectedDays, setExpectedDays] = useState<number>(2);
  const [overrideReason, setOverrideReason] = useState<string>('');
  const [confirmedOrderModal, setConfirmedOrderModal] = useState<{
    order: Order;
    customer: Customer;
    whatsappMsg: string;
  } | null>(null);
  const [challanBillOrder, setChallanBillOrder] = useState<Order | null>(null);

  const openNewOrderModal = () => {
    setIsCreatingOrder(true);
    setOrderItems([]);
    setAdvancePaidMode('UPI');
    setAdvanceRefId('');
    setIsAdvanceVerified(false);
    setIsClearingUdhaar(false);
    setOverrideReason('');
    if (role === 'customer' && loggedInCustomer) {
      setSelectedCustomerId(loggedInCustomer.id);
      setOrderStep(loggedInCustomer.pendingUdhaar > 0 ? 1 : 2);
    } else {
      setSelectedCustomerId('');
      setOrderStep(1);
    }
  };

  useEffect(() => {
    if (isNewOrderOpenDirect) {
      openNewOrderModal();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNewOrderOpenDirect, role, loggedInCustomer?.id]);

  const REFERENCE_TODAY = '2026-03-11';

  const isOrderDelayed = (o: Order): boolean =>
    Boolean(
      o.expectedDeliveryDate &&
        o.expectedDeliveryDate < REFERENCE_TODAY &&
        o.status !== 'Delivered' &&
        o.status !== 'Cancelled' &&
        o.status !== 'Returned'
    );

  const getOrderDelayDays = (o: Order): number => {
    if (!o.expectedDeliveryDate || o.expectedDeliveryDate >= REFERENCE_TODAY) return 0;
    return Math.max(
      1,
      Math.floor(
        (new Date(REFERENCE_TODAY).getTime() - new Date(o.expectedDeliveryDate).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    );
  };

  // 1. Order Confirm (placed & confirmed, not yet moved to dispatch)
  const isOrderConfirmStage = (o: Order): boolean =>
    o.status === 'Booked' ||
    o.status === 'Advance Pending' ||
    o.status === 'Enquiry' ||
    o.status === 'On Hold' ||
    o.status === 'Reschedule';

  // 2. Dispatch (ready to dispatch / packed)
  const isDispatchStage = (o: Order): boolean => o.status === 'Packed';

  const getOrderStatusLabel = (status: OrderStatus): string => {
    if (
      status === 'Booked' ||
      status === 'Advance Pending' ||
      status === 'Enquiry' ||
      status === 'On Hold' ||
      status === 'Reschedule'
    ) {
      return 'Order Confirm';
    }
    if (status === 'Packed') return 'Dispatch';
    return status;
  };

  const statusChips = [
    'All',
    'Order Confirm',
    'Dispatch',
    'Dispatched',
    'Delivered',
    'Delivery Delay',
  ];

  // Filter orders by role & search & status
  const visibleOrders = orders.filter((o) => {
    // If customer, show only their own orders!
    if (role === 'customer') {
      const isMyOrder = o.customerId === loggedInCustomer.id || o.phone === loggedInCustomer.phone;
      if (!isMyOrder) return false;
    }
    const matchesSearch =
      o.shopName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.phone.includes(searchQuery);
    const matchesStatus =
      statusFilter === 'All'
        ? true
        : statusFilter === 'Order Confirm'
        ? isOrderConfirmStage(o)
        : statusFilter === 'Dispatch'
        ? isDispatchStage(o)
        : statusFilter === 'Dispatched'
        ? o.status === 'Dispatched'
        : statusFilter === 'Delivered'
        ? o.status === 'Delivered'
        : statusFilter === 'Delivery Delay'
        ? isOrderDelayed(o)
        : true;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'Booked':
      case 'Dispatched':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Packed':
        return 'bg-sky-100 text-sky-800 border-sky-200';
      case 'Delivered':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'On Hold':
      case 'Advance Pending':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Cancelled':
      case 'Returned':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  // Helper calculations for New Order Stepper
  const selectedCust = customers.find((c) => c.id === selectedCustomerId);

  const deliveryCalc = selectedCust
    ? calculateDeliveryFee(selectedCust.distanceKm, settings)
    : { isFree: true, charge: 0 };

  const currentItemsBreakdown: OrderItem[] = orderItems
    .map((oi) => {
      const prod = products.find((p) => p.id === oi.productId);
      if (!prod || oi.packetQty <= 0) return null;
      return {
        productId: prod.id,
        productName: prod.name,
        shadeOrSize: prod.shadeOrSize,
        packSize: prod.packSize,
        packetQty: oi.packetQty,
        totalPieces: oi.packetQty * prod.packSize,
        unitPricePerPacket: prod.sellingPrice,
        totalPrice: oi.packetQty * prod.sellingPrice,
        hsnCode: prod.hsnCode,
        gstRate: prod.gstRate,
      };
    })
    .filter(Boolean) as OrderItem[];

  const orderSubtotal = currentItemsBreakdown.reduce((sum, it) => sum + it.totalPrice, 0);
  const minValidation = validateOrderMinimum(orderSubtotal, settings.minOrderValue);
  const finalOrderTotal = orderSubtotal + deliveryCalc.charge;

  const handleUpdateItemQty = (productId: string, delta: number) => {
    setOrderItems((prev) => {
      const existing = prev.find((i) => i.productId === productId);
      if (!existing && delta > 0) {
        return [...prev, { productId, packetQty: delta }];
      }
      return prev
        .map((i) => {
          if (i.productId === productId) {
            const newQty = Math.max(0, i.packetQty + delta);
            return { ...i, packetQty: newQty };
          }
          return i;
        })
        .filter((i) => i.packetQty > 0);
    });
  };

  const handleConfirmOrder = () => {
    if (!selectedCust) {
      showToast('Please select a retailer', 'error');
      return;
    }
    // Block if customer has pending udhaar without override
    if (selectedCust.pendingUdhaar > 0 && overrideReason.trim().length < 3) {
      showToast('Pehle purana udhaar clear karein ya override reason dalein!', 'error');
      return;
    }
    if (!minValidation.valid) {
      showToast(minValidation.error || 'Minimum order value is ₹1,000', 'error');
      return;
    }
    if (advancePaidMode === 'UPI' && !isAdvanceVerified) {
      showToast('Pehle ₹1,000 Advance UPI payment verify karein!', 'error');
      return;
    }

    const expectedDate = new Date();
    expectedDate.setDate(expectedDate.getDate() + expectedDays);

    const autoTrackingId = 'TRK-NP-' + (orders.length + 107);
    const actualAdvance = Math.min(settings.advanceBookingAmount, finalOrderTotal);

    const newOrder = addOrder({
      customerId: selectedCust.id,
      customerName: selectedCust.ownerName,
      shopName: selectedCust.shopName,
      phone: selectedCust.phone,
      whatsapp: selectedCust.whatsapp,
      address: selectedCust.address,
      landmark: selectedCust.landmark,
      distanceKm: selectedCust.distanceKm,
      items: currentItemsBreakdown,
      subtotal: orderSubtotal,
      discountAmount: 0,
      deliveryCharge: deliveryCalc.charge,
      taxAmount: 0,
      totalAmount: finalOrderTotal,
      advanceAmount: actualAdvance,
      advancePaid: true,
      balanceAmount: Math.max(0, finalOrderTotal - actualAdvance),
      status: 'Booked',
      trackingNumber: autoTrackingId,
      statusHistory: [
        {
          status: 'Booked',
          timestamp: new Date().toISOString(),
          note: `Booked with ₹${actualAdvance} advance via ${advancePaidMode}. Auto-tracking active: ${autoTrackingId}`,
          by: user?.name || (role === 'customer' ? selectedCust.ownerName : 'Owner'),
        },
      ],
      expectedDeliveryDate: expectedDate.toISOString().split('T')[0],
      balanceReadyConfirmed: false,
    });

    // Record advance payment in the live ledger
    addPayment({
      customerId: selectedCust.id,
      customerName: selectedCust.ownerName,
      shopName: selectedCust.shopName,
      orderId: newOrder.id,
      orderNumber: newOrder.orderNumber,
      amount: actualAdvance,
      mode: advancePaidMode,
      referenceId: advanceRefId.trim() || `UPI/ADV-${Date.now().toString().slice(-6)}`,
      confirmedByOwner: true,
      note: `Advance booking payment for order #${newOrder.orderNumber}`,
      type: 'Advance',
    });

    setIsCreatingOrder(false);
    onCloseNewOrderDirect?.();
    setOrderStep(1);
    setSelectedCustomerId('');
    setOrderItems([]);
    setAdvanceRefId('');
    setIsAdvanceVerified(false);

    // Success toast notification
    showToast(
      `Advance payment of ₹${actualAdvance.toLocaleString('en-IN')} verified! Order #${newOrder.orderNumber} confirmed.`,
      'success'
    );

    const msg = `Namaste ${selectedCust.shopName}!\n\nWholesale order #${newOrder.orderNumber} book ho chuka hai.\n\nAdvance Received: ₹${actualAdvance.toLocaleString('en-IN')} (Verified via ${advancePaidMode})\nBalance on Delivery: ₹${Math.max(
      0,
      finalOrderTotal - actualAdvance
    ).toLocaleString('en-IN')}\nAuto-Tracking ID: ${autoTrackingId}\nExpected Delivery: In ${expectedDays} days\n\nNote: Continuous uncut unboxing video zaroori hai kisi bhi transit claim ke liye.\n\n- Rupam Wholesale, Nuapatna`;

    setConfirmedOrderModal({
      order: newOrder,
      customer: selectedCust,
      whatsappMsg: msg,
    });
  };

  const handleSendWhatsAppOrderDetails = (ord: Order) => {
    const itemsList = ord.items
      .map((it) => `• ${it.productName} (${it.packetQty} pkts x ₹${it.unitPricePerPacket} = ₹${it.totalPrice})`)
      .join('\n');
    const msg = `*RUPAM WHOLESALE NUAPATNA - ORDER UPDATE*
Order #${ord.orderNumber}
Shop: ${ord.shopName} (${ord.customerName})
Status: ${ord.status}
Auto-Tracking: TRK-${ord.orderNumber}

*Items Ordered:*
${itemsList}

*Payment Summary:*
• Subtotal: ₹${ord.subtotal.toLocaleString('en-IN')}
• Delivery Charge: ₹${ord.deliveryCharge}
• Total Order Value: ₹${ord.totalAmount.toLocaleString('en-IN')}
• Advance Paid: ₹${ord.advanceAmount.toLocaleString('en-IN')}
• *Balance to Collect: ₹${ord.balanceAmount.toLocaleString('en-IN')}*

Note: Please keep balance ready for delivery van. Continuous unboxing video required for any damage claims.`;
    window.open(`https://wa.me/91${ord.phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleQuickStatusUpdate = (ord: Order, newStatus: OrderStatus) => {
    updateOrderStatus(ord.id, newStatus);
    showToast(`Order #${ord.orderNumber} successfully updated to ${newStatus}!`, 'success');
  };

  // Ordered 5-Section Order Board:
  // 1. Order Confirm -> 2. Dispatch -> 3. Dispatched -> 4. Delivered -> 5. Delivery Delay
  const orderConfirmOrders = visibleOrders.filter((o) => isOrderConfirmStage(o));
  const dispatchReadyOrders = visibleOrders.filter((o) => isDispatchStage(o));
  const dispatchedOrders = visibleOrders.filter((o) => o.status === 'Dispatched');
  const deliveredOrders = visibleOrders.filter((o) => o.status === 'Delivered');
  const deliveryDelayOrders = visibleOrders.filter((o) => isOrderDelayed(o));

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. SUPPLIER SUPPLY ORDERS & CONSIGNMENTS SECTION
  // ═══════════════════════════════════════════════════════════════════════════
  const renderSupplierOrdersContent = (isOwnerView: boolean) => {
    const pos = isOwnerView
      ? supplierOrders
      : supplierOrders.filter((po) => po.supplierId === loggedInSupplier.id);

    const filteredPOs = pos.filter((po) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (
          !po.poNumber.toLowerCase().includes(q) &&
          !po.supplierName.toLowerCase().includes(q) &&
          !(po.biltyNumber && po.biltyNumber.toLowerCase().includes(q))
        ) {
          return false;
        }
      }
      if (statusFilter !== 'All') {
        if (po.status !== statusFilter) return false;
      }
      return true;
    });

    const totalPOValue = pos.reduce((sum, po) => sum + po.totalAmount, 0);
    const totalPendingDues = pos.reduce((sum, po) => sum + po.balanceDue, 0);

    return (
      <div className="space-y-3">
        {/* Supplier Header */}
        <div className="glass-card rounded-2xl sm:rounded-3xl p-3 sm:p-4 border border-purple-200/90 shadow-sm bg-gradient-to-br from-purple-50/80 via-white to-indigo-50/40 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold shadow-sm shrink-0">
                <Truck className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-xs sm:text-base font-extrabold text-slate-900 leading-snug truncate">
                  {isOwnerView ? tr('Supplier PO Consignments', language) : tr('My Supply Orders', language)}
                </h2>
                <p className="text-[11px] text-slate-500 truncate">
                  {isOwnerView ? 'Nuapatna Hub Sourcing • All 8 Suppliers' : `${loggedInSupplier.name} • ${loggedInSupplier.city || 'Kolkata'}`}
                </p>
              </div>
            </div>

            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-300 shrink-0">
              {pos.length} POs
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-0.5">
            <div className="p-2.5 rounded-xl bg-white border border-purple-100 shadow-2xs">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">{tr('Total Lot Value', language)}</span>
              <span className="text-sm font-black text-slate-900 block mt-0.5">₹{totalPOValue.toLocaleString('en-IN')}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-white border border-purple-100 shadow-2xs">
              <span className="text-[9px] font-bold text-purple-700 uppercase tracking-wider block">
                {isOwnerView ? 'Payable' : 'Owner Balance'}
              </span>
              <span className="text-sm font-black text-purple-950 block mt-0.5">₹{totalPendingDues.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* PO Status Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {['All', 'In Transit', 'Dispatched', 'Received at Hub', 'Settled'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`whitespace-nowrap px-2.5 py-1 rounded-full text-[11px] font-bold transition ${
                statusFilter === st
                  ? 'bg-purple-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {tr(st, language)}
            </button>
          ))}
        </div>

        {/* Search POs */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search PO #, supplier name, or bilty..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-xs rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 shadow-2xs"
          />
        </div>

        {/* PO List */}
        <div className="space-y-2.5">
          {filteredPOs.length === 0 ? (
            <div className="p-6 text-center bg-white rounded-2xl border border-slate-200 space-y-1.5">
              <Package className="w-7 h-7 text-slate-400 mx-auto" />
              <h4 className="font-bold text-xs text-slate-700">No Purchase Orders in this status</h4>
              <p className="text-[10px] text-slate-500">Contact Shuvam Behera (Owner) to confirm restock orders.</p>
            </div>
          ) : (
            filteredPOs.map((po) => {
              const poWhatsappMsg = isOwnerView
                ? `Namaste ${po.supplierName}! PO #${po.poNumber} consignment query from Shuvam Behera (Rupam Wholesale):\nStatus: ${po.status}\nBilty #: ${po.biltyNumber || 'Pending'}\nBalance: ₹${po.balanceDue.toLocaleString('en-IN')}.`
                : `Namaste Shuvam bhai! PO #${po.poNumber} live consignment track report:\n• Status: ${po.status}\n• Transport: ${po.transportCompany || 'Roadways Express Cargo'}\n• Bilty #: ${po.biltyNumber || 'MKR-88319'}\n• Expected: ${po.expectedDate || '2-3 Working Days'}\n• Lot Value: ₹${po.totalAmount.toLocaleString('en-IN')}\n• Advance: ₹${po.advancePaid.toLocaleString('en-IN')}\n• Balance Due: ₹${po.balanceDue.toLocaleString('en-IN')}\n• Payment: ${po.balanceDue <= 0 || po.paymentStatus === 'Settled' ? 'Bill Paid & Settled (✓)' : 'Pending'}\n- ${loggedInSupplier.name}`;

              const stages: Array<{ key: typeof po.status; label: string; step: number }> = [
                { key: 'Confirmed', label: '1. Confirmed', step: 1 },
                { key: 'Dispatched', label: '2. Dispatched', step: 2 },
                { key: 'In Transit', label: '3. In Transit', step: 3 },
                { key: 'Received at Hub', label: '4. Hub Received', step: 4 },
                { key: 'Settled', label: '5. Settled', step: 5 },
              ];

              const currentStageIndex = Math.max(
                0,
                stages.findIndex((s) => s.key === po.status)
              );

              const isFullyPaid = po.balanceDue <= 0 || po.paymentStatus === 'Settled';

              return (
                <div key={po.id} className="glass-card rounded-2xl sm:rounded-3xl p-3 sm:p-4 border border-purple-200/90 shadow-sm space-y-2.5 bg-white">
                  {/* Header Row */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-xs font-black text-slate-900 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-200">
                          {po.poNumber}
                        </span>
                        {isOwnerView && (
                          <span className="text-xs font-black text-purple-900 bg-purple-100/70 px-2 py-0.5 rounded-md">
                            {po.supplierName}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400">• {po.orderDate}</span>
                      </div>
                      <h4 className="font-extrabold text-sm text-slate-900 mt-1">
                        {po.items.map((it) => `${it.productName} (${it.packets} pkts)`).join(', ')}
                      </h4>
                    </div>

                    <span className="px-3 py-1 rounded-full text-xs font-black bg-purple-100 text-purple-900 border border-purple-300 shrink-0 shadow-2xs">
                      {po.status}
                    </span>
                  </div>

                  {/* Consignment Items Details */}
                  <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100 text-xs space-y-1.5">
                    {po.items.map((it, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs">
                        <span className="text-slate-700 font-semibold truncate max-w-[210px]">
                          {it.productName} ({it.packSize} pcs/pkt)
                        </span>
                        <span className="font-bold text-slate-900 shrink-0">
                          {it.packets} pkts × ₹{it.purchaseCostPerPacket} = ₹{it.totalAmount.toLocaleString('en-IN')}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* ══════════════════════════════════════════════════════════════════
                      LIVE ORDER TRACKING PIPELINE (Towards Owner Shuvam Behera)
                  ══════════════════════════════════════════════════════════════════ */}
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/60 border border-indigo-200/90 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Truck className="w-4 h-4 text-indigo-700" />
                        <span className="text-xs font-black text-slate-900 tracking-tight">
                          Live Consignment Tracking Pipeline
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-indigo-800 bg-indigo-100/80 px-2 py-0.5 rounded-md border border-indigo-200">
                        To Nuapatna Hub
                      </span>
                    </div>

                    {/* Horizontal 5-Step Pipeline Progress Indicator */}
                    <div className="pt-1 px-1">
                      <div className="grid grid-cols-5 gap-1 relative">
                        {stages.map((st, idx) => {
                          const isCompleted = idx < currentStageIndex;
                          const isCurrent = idx === currentStageIndex;
                          return (
                            <div key={st.key} className="flex flex-col items-center text-center">
                              <div
                                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition-all shadow-2xs ${
                                  isCompleted
                                    ? 'bg-emerald-600 text-white'
                                    : isCurrent
                                    ? 'bg-purple-700 text-white ring-2 ring-purple-300 ring-offset-1'
                                    : 'bg-slate-200 text-slate-500'
                                }`}
                              >
                                {isCompleted ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : idx + 1}
                              </div>
                              <span
                                className={`text-[9px] mt-1 font-bold leading-tight ${
                                  isCurrent
                                    ? 'text-purple-950 font-black'
                                    : isCompleted
                                    ? 'text-emerald-800'
                                    : 'text-slate-400'
                                }`}
                              >
                                {st.label.replace(/^\d+\.\s*/, '')}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Transport & Bilty Badge Details */}
                    <div className="grid grid-cols-3 gap-1.5 pt-1 text-[11px] bg-white p-2 rounded-xl border border-indigo-100">
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase font-bold block">Transport Cargo</span>
                        <span className="font-extrabold text-slate-800 truncate block">
                          {po.transportCompany || 'Roadways Express Cargo'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase font-bold block">Bilty Number</span>
                        <span className="font-mono font-extrabold text-slate-800 truncate block">
                          {po.biltyNumber || 'Pending'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase font-bold block">Expected Arrival</span>
                        <span className="font-extrabold text-indigo-900 truncate block">
                          {po.expectedDate || '2-3 Working Days'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Financial Breakdown & Dual Actions (Payment Button + WhatsApp Track) */}
                  <div className="pt-2 border-t border-slate-100 space-y-2.5">
                    <div className="flex items-center justify-between text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                      <div>
                        <span className="text-slate-500 block text-[10px] font-bold uppercase">{tr('Total Lot Value', language)}</span>
                        <span className="font-extrabold text-slate-900 text-sm">₹{po.totalAmount.toLocaleString('en-IN')}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] font-bold uppercase">{tr('Advance Paid', language)}</span>
                        <span className="font-extrabold text-emerald-700 text-sm">₹{po.advancePaid.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-purple-700 block text-[10px] font-bold uppercase">{tr('Balance Due', language)}</span>
                        <span className={`font-black text-sm ${isFullyPaid ? 'text-emerald-700' : 'text-purple-950'}`}>
                          ₹{po.balanceDue.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2">
                      {/* Track Stage Selector */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Stage:</span>
                        <select
                          value={po.status}
                          onChange={(e) => updateSupplierOrderStatus(po.id, e.target.value as any)}
                          className="px-2.5 py-1.5 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-400"
                        >
                          <option value="Confirmed">Confirmed</option>
                          <option value="Dispatched">Dispatched</option>
                          <option value="In Transit">In Transit</option>
                          <option value="Received at Hub">Received at Hub</option>
                          <option value="Settled">Settled</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* ══════════════════════════════════════════════════════════════════
                            PAYMENT BUTTON WITH TICK ICON WHEN PAID & SETTLED
                        ══════════════════════════════════════════════════════════════════ */}
                        {isFullyPaid ? (
                          <div
                            className="px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-900 border border-emerald-300 font-black text-xs flex items-center gap-1.5 shadow-2xs"
                            title="This purchase order bill is fully paid & settled"
                          >
                            <Check className="w-4 h-4 text-emerald-700 stroke-[3]" />
                            <span>Bill Paid & Settled (✓)</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              settleSupplierBill(po.id, 'UPI / Bank Transfer');
                            }}
                            className="px-3 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-black text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>{tr('Pay Bill', language)} (₹{po.balanceDue.toLocaleString('en-IN')})</span>
                          </button>
                        )}

                        {/* WhatsApp Live Consignment Tracking to Owner or Supplier */}
                        <a
                          href={`https://wa.me/91${(isOwnerView ? (suppliers.find((s) => s.id === po.supplierId)?.phone || '9861000000') : (settings.ownerPhone || '9437123456')).replace(/\D/g, '')}?text=${encodeURIComponent(poWhatsappMsg)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs active:scale-95 transition shrink-0"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>{isOwnerView ? tr('WhatsApp Supplier', language) : tr('Update Owner', language)}</span>
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. DUKANI BHAI MY ORDERS VIEW (STRICTLY DUKANI ID - MATCHES SUPPLIER ID CARD LAYOUT)
  // ═══════════════════════════════════════════════════════════════════════════
  const renderDukaniOrdersContent = () => {
    const myDukaniOrders = orders.filter(
      (o) => o.customerId === loggedInCustomer.id || o.phone === loggedInCustomer.phone
    );

    const filteredDukaniOrders = myDukaniOrders.filter((ord) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (
          !ord.orderNumber.toLowerCase().includes(q) &&
          !ord.shopName.toLowerCase().includes(q) &&
          !ord.items.some((i) => i.productName.toLowerCase().includes(q))
        ) {
          return false;
        }
      }
      if (statusFilter !== 'All') {
        if (statusFilter === 'Order Confirm') {
          if (!isOrderConfirmStage(ord)) return false;
        } else if (statusFilter === 'Dispatch') {
          if (!isDispatchStage(ord)) return false;
        } else if (statusFilter === 'Dispatched') {
          if (ord.status !== 'Dispatched') return false;
        } else if (statusFilter === 'Delivered') {
          if (ord.status !== 'Delivered') return false;
        } else if (statusFilter === 'Delivery Delay') {
          if (!isOrderDelayed(ord)) return false;
        }
      }
      return true;
    });

    const dukaniOrderConfirmList = filteredDukaniOrders.filter((o) => isOrderConfirmStage(o));
    const dukaniDispatchList = filteredDukaniOrders.filter((o) => isDispatchStage(o));
    const dukaniDispatchedList = filteredDukaniOrders.filter((o) => o.status === 'Dispatched');
    const dukaniDeliveredList = filteredDukaniOrders.filter((o) => o.status === 'Delivered');
    const dukaniDelayedList = filteredDukaniOrders.filter((o) => isOrderDelayed(o));

    const totalSpent = myDukaniOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const totalPendingDeliveryBalance = myDukaniOrders.reduce(
      (sum, o) => sum + (o.status !== 'Delivered' && o.status !== 'Cancelled' ? o.balanceAmount : 0),
      0
    );

    return (
      <div className="space-y-3">
        {/* Dukani Shop Header Card */}
        <div className="glass-card rounded-2xl sm:rounded-3xl p-3 sm:p-4 border border-sky-200/90 shadow-sm bg-gradient-to-br from-sky-50/80 via-white to-blue-50/50 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center font-bold shadow-sm shrink-0">
                <Store className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-xs sm:text-base font-extrabold text-slate-900 leading-snug truncate">
                  {tr('My Wholesale Orders', language)}
                </h2>
                <p className="text-[11px] text-slate-500 truncate">
                  {loggedInCustomer.shopName} • {loggedInCustomer.distanceKm} km Free Delivery
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-900 border border-sky-300">
                {myDukaniOrders.length} Orders
              </span>
              <button
                type="button"
                onClick={openNewOrderModal}
                className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-white font-bold text-[11px] flex items-center gap-1 shadow-xs active:scale-95 transition"
              >
                <Plus className="w-3 h-3" />
                <span>{tr('New Order', language)}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-0.5">
            <div className="p-2.5 rounded-xl bg-white border border-sky-100 shadow-2xs">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">{tr('Total Purchase', language)}</span>
              <span className="text-sm font-black text-slate-900 block mt-0.5">₹{totalSpent.toLocaleString('en-IN')}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-white border border-sky-100 shadow-2xs">
              <span className="text-[9px] font-bold text-amber-700 uppercase tracking-wider block">{tr('Delivery Balance', language)}</span>
              <span className="text-sm font-black text-amber-950 block mt-0.5">₹{totalPendingDeliveryBalance.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Mandatory Continuous Unboxing Video Reminder Banner */}
        <div className="p-2.5 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/90 text-amber-950 flex items-start gap-2 text-[11px] shadow-2xs">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
          <p className="leading-snug">
            <strong>Rule:</strong> Parcel box receive karte waqt continuous uncut unboxing video zaroor banayein.
          </p>
        </div>

        {/* Dukani Status Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {['All', 'Order Confirm', 'Dispatch', 'Dispatched', 'Delivered', 'Delivery Delay'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`whitespace-nowrap px-2.5 py-1 rounded-full text-[11px] font-bold transition ${
                statusFilter === st
                  ? st === 'Delivery Delay'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'bg-sky-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {tr(st, language)}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search order #, product name, or tracking ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-xs rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 shadow-2xs"
          />
        </div>

        {/* Dukani Ordered Sections: 1. Order Confirm -> 2. Dispatch -> 3. Dispatched -> 4. Delivered -> 5. Delivery Delay */}
        <div className="space-y-4">
          {filteredDukaniOrders.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 space-y-2">
              <Package className="w-8 h-8 text-slate-400 mx-auto" />
              <h4 className="font-bold text-xs text-slate-700">No orders found in this filter</h4>
              <p className="text-[11px] text-slate-500">Go to Stock Catalogue to confirm your next wholesale order.</p>
            </div>
          ) : (
            (() => {
              const dukaniSections: Array<{
                id: string;
                title: string;
                subtitle: string;
                badgeClass: string;
                dotClass: string;
                list: Order[];
              }> =
                statusFilter === 'Delivery Delay'
                  ? [
                      {
                        id: 'delay',
                        title: '5. Delivery Delay',
                        subtitle: 'Overdue Delivery',
                        badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
                        dotClass: 'bg-rose-500',
                        list: dukaniDelayedList,
                      },
                    ]
                  : [
                      {
                        id: 'confirm',
                        title: '1. Order Confirm',
                        subtitle: 'Order Confirmed',
                        badgeClass: 'bg-sky-100 text-sky-800 border-sky-200',
                        dotClass: 'bg-sky-500',
                        list: dukaniOrderConfirmList,
                      },
                      {
                        id: 'dispatch',
                        title: '2. Dispatch',
                        subtitle: 'Ready for Dispatch',
                        badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
                        dotClass: 'bg-blue-500',
                        list: dukaniDispatchList,
                      },
                      {
                        id: 'dispatched',
                        title: '3. Dispatched',
                        subtitle: 'Out for Delivery',
                        badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-200',
                        dotClass: 'bg-indigo-500',
                        list: dukaniDispatchedList,
                      },
                      {
                        id: 'delivered',
                        title: '4. Delivered',
                        subtitle: 'Completed',
                        badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
                        dotClass: 'bg-emerald-500',
                        list: dukaniDeliveredList,
                      },
                      ...(dukaniDelayedList.length > 0
                        ? [
                            {
                              id: 'delay',
                              title: '5. Delivery Delay',
                              subtitle: 'Overdue Delivery',
                              badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
                              dotClass: 'bg-rose-500',
                              list: dukaniDelayedList,
                            },
                          ]
                        : []),
                    ].filter((sec) => sec.list.length > 0);

              return dukaniSections.map((sec) => (
                <div key={sec.id} className="space-y-2.5">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${sec.dotClass}`} />
                      <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 truncate">
                        {sec.title} ({sec.list.length})
                      </h3>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${sec.badgeClass}`}>
                      {sec.subtitle}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {sec.list.map((ord) => {
              const stages = [
                { key: 'Booked', label: '1. Confirm', step: 1 },
                { key: 'Packed', label: '2. Dispatch', step: 2 },
                { key: 'Dispatched', label: '3. Dispatched', step: 3 },
                { key: 'Delivered', label: '4. Delivered', step: 4 },
              ];

              const currentStageIndex =
                isOrderConfirmStage(ord)
                  ? 0
                  : ord.status === 'Packed'
                  ? 1
                  : ord.status === 'Dispatched'
                  ? 2
                  : ord.status === 'Delivered'
                  ? 3
                  : 0;

              const isDispatched = ord.status === 'Dispatched';
              const isDelivered = ord.status === 'Delivered';
              const orderDeliveryOtp = getOrderDeliveryOtp(ord);
              const catSummary = getOrderCategoriesSummary(ord, products);

              const whatsappQueryMsg = `Namaste Shuvam bhai! Order #${ord.orderNumber} (${loggedInCustomer.shopName}) ke bare me update chahiye:\nCategories: ${catSummary.categories.join(', ')}\nStatus: ${ord.status}\nBalance: ₹${ord.balanceAmount.toLocaleString('en-IN')}.\n- ${loggedInCustomer.ownerName}`;

              return (
                <div key={ord.id} className="glass-card rounded-3xl p-4.5 border border-slate-200/90 shadow-md space-y-3.5 bg-white">
                  {/* Order Header — Category First (No full product names/prices on card) */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-xs font-black text-slate-900 bg-sky-50 px-2 py-0.5 rounded-lg border border-sky-200">
                          #{ord.orderNumber}
                        </span>
                        <span className="text-[10px] text-slate-500 font-semibold">
                          • Exp: {ord.expectedDeliveryDate}
                        </span>
                      </div>
                      <h4 className="font-extrabold text-sm text-slate-900 mt-1.5 leading-snug">
                        {catSummary.categories.join(' · ')}
                      </h4>
                      <p className="text-[11px] font-semibold text-slate-500 mt-0.5 tabular-nums">
                        {catSummary.totalItems} {catSummary.totalItems === 1 ? 'Item' : 'Items'} · {catSummary.totalPackets} pkts ({catSummary.totalPieces} pcs)
                      </p>
                    </div>

                    <span className={`px-3 py-1 rounded-full text-xs font-black shrink-0 shadow-2xs border ${getStatusBadge(ord.status)}`}>
                      {getOrderStatusLabel(ord.status)}
                    </span>
                  </div>

                  {/* ══════════════════════════════════════════════════════════════════
                      5-STAGE LIVE DELIVERY PIPELINE
                  ══════════════════════════════════════════════════════════════════ */}
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-sky-50/70 via-white to-indigo-50/50 border border-sky-200/90 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Truck className="w-4 h-4 text-sky-700" />
                        <span className="text-xs font-black text-slate-900 tracking-tight">
                          Live Wholesale Delivery Flow
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-sky-800 bg-sky-100/80 px-2 py-0.5 rounded-md border border-sky-200">
                        Nuapatna Hub Van
                      </span>
                    </div>

                    {/* Progress Dots */}
                    <div className="pt-1 px-1">
                      <div className="grid grid-cols-4 gap-1 relative">
                        {stages.map((st, idx) => {
                          const isCompleted = idx < currentStageIndex || isDelivered;
                          const isCurrent = idx === currentStageIndex && !isDelivered;
                          return (
                            <div key={st.key} className="flex flex-col items-center text-center">
                              <div
                                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition-all shadow-2xs ${
                                  isCompleted
                                    ? 'bg-emerald-600 text-white'
                                    : isCurrent
                                    ? 'bg-sky-600 text-white ring-2 ring-sky-300 ring-offset-1'
                                    : 'bg-slate-200 text-slate-500'
                                }`}
                              >
                                {isCompleted ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : idx + 1}
                              </div>
                              <span
                                className={`text-[9px] mt-1 font-bold leading-tight ${
                                  isCurrent
                                    ? 'text-sky-950 font-black'
                                    : isCompleted
                                    ? 'text-emerald-800'
                                    : 'text-slate-400'
                                }`}
                              >
                                {st.label.replace(/^\d+\.\s*/, '')}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Van & Auto-Tracking Info */}
                    <div className="grid grid-cols-3 gap-1.5 pt-1 text-[11px] bg-white p-2 rounded-xl border border-sky-100">
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase font-bold block">Delivery Van</span>
                        <span className="font-extrabold text-slate-800 truncate block">Nuapatna Hub Van</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase font-bold block">Auto-Tracking</span>
                        <span className="font-mono font-extrabold text-slate-800 truncate block">
                          TRK-{ord.orderNumber}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase font-bold block">Driver Phone</span>
                        <span className="font-extrabold text-sky-900 truncate block">9437123456</span>
                      </div>
                    </div>
                  </div>

                  {/* ══════════════════════════════════════════════════════════════════
                      DUKANI 4-DIGIT DELIVERY VERIFICATION OTP BADGE (WHEN DISPATCHED)
                  ══════════════════════════════════════════════════════════════════ */}
                  {isDispatched && (
                    <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-sky-50 border-2 border-emerald-300 shadow-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider flex items-center gap-1">
                          <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
                          Delivery Handover OTP
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-200 text-emerald-900 animate-pulse">
                          Out for Delivery
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs text-slate-700 font-medium">
                          Delivery person ko yeh 4-digit code bataiye parcel box receive karne ke liye:
                        </p>
                        <div className="bg-white px-3 py-1 rounded-xl border-2 border-emerald-400 shadow-2xs shrink-0">
                          <span className="font-mono text-xl font-black text-emerald-950 tracking-widest">
                            {orderDeliveryOtp}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {isDelivered && (
                    <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 font-bold text-xs flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-700 stroke-[3]" />
                      <span>Parcel Safely Delivered & 4-Digit OTP Verified (✓)</span>
                    </div>
                  )}

                  {/* Financial Breakdown & Actions */}
                  <div className="pt-2 border-t border-slate-100 space-y-2.5">
                    <div className="flex items-center justify-between text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                      <div>
                        <span className="text-slate-500 block text-[10px] font-bold uppercase">Total Bill</span>
                        <span className="font-extrabold text-slate-900 text-sm">₹{ord.totalAmount.toLocaleString('en-IN')}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] font-bold uppercase">Advance Paid</span>
                        <span className={`font-extrabold text-sm ${ord.advancePaid ? 'text-emerald-700' : 'text-amber-700'}`}>
                          ₹{(ord.advancePaid ? ord.advanceAmount : 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-amber-700 block text-[10px] font-bold uppercase">Balance to Pay</span>
                        <span className="font-black text-sm text-amber-950">
                          ₹{ord.balanceAmount.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setChallanBillOrder(ord)}
                        className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 active:scale-95 transition"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>{tr('View Chalan & Bill', language)}</span>
                      </button>

                      <div className="flex items-center gap-2">
                        <a
                          href={`https://wa.me/91${(settings.ownerPhone || '9437123456').replace(/\D/g, '')}?text=${encodeURIComponent(whatsappQueryMsg)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1 transition shrink-0"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{tr('WhatsApp Owner', language)}</span>
                        </a>

                        <a
                          href={`tel:${settings.ownerPhone || '9437123456'}`}
                          className="p-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 transition"
                          title="Call Helpline"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>

                    {/* Bill PDF Download & Send on WhatsApp Button */}
                    <button
                      type="button"
                      onClick={() =>
                        downloadAndShareBillPdfOnWhatsApp(
                          ord,
                          products,
                          settings,
                          ord.whatsapp || ord.phone || settings.ownerPhone,
                          showToast
                        )
                      }
                      className="w-full py-2.5 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs active:scale-[0.98] transition"
                    >
                      <Download className="w-3.5 h-3.5 shrink-0" />
                      <span>Bill Download · Send PDF on WhatsApp</span>
                      <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                    </button>
                  </div>
                </div>
              );
            })}
                  </div>
                </div>
              ));
            })()
          )}
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // ROLE ROUTING: SUPPLIER & DUKANI & OWNER
  // ═══════════════════════════════════════════════════════════════════════════
  if (role === 'supplier') {
    return (
      <div className="space-y-4 pb-28">
        {renderSupplierOrdersContent(false)}
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-28">
      {role === 'customer' ? (
        <>{renderDukaniOrdersContent()}</>
      ) : (
        <>
          {/* Owner Top Segmented Switch: Dukani Orders vs Supplier Consignments */}
      <div className="p-1 bg-slate-100 rounded-xl sm:rounded-2xl flex items-center gap-1">
        <button
          type="button"
          onClick={() => setOwnerViewSection('dukani')}
          className={`flex-1 py-1.5 px-2 rounded-lg sm:rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition ${
            ownerViewSection === 'dukani'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Store className="w-3.5 h-3.5 text-sky-600 shrink-0" />
          <span className="truncate">{tr('Retailer Orders', language)}</span>
          <span
            className={`text-[9px] px-1.5 py-0.2 rounded-full font-extrabold ${
              ownerViewSection === 'dukani' ? 'bg-sky-100 text-sky-800' : 'bg-slate-200 text-slate-700'
            }`}
          >
            {orders.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setOwnerViewSection('supplier')}
          className={`flex-1 py-1.5 px-2 rounded-lg sm:rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition ${
            ownerViewSection === 'supplier'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Building2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
          <span className="truncate">{tr('Supplier POs', language)}</span>
          <span
            className={`text-[9px] px-1.5 py-0.2 rounded-full font-extrabold ${
              ownerViewSection === 'supplier' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-200 text-slate-700'
            }`}
          >
            {supplierOrders.length}
          </span>
        </button>
      </div>

      {ownerViewSection === 'supplier' ? (
        renderSupplierOrdersContent(true)
      ) : (
        <>
          {/* Top Header & Search */}
          <div className="flex items-center justify-between gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search shop, order #, or phone..."
                className="w-full pl-8 pr-3 py-2 rounded-xl bg-white/90 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-xs"
              />
            </div>

            <button
              onClick={openNewOrderModal}
              className="px-3 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-white font-bold text-xs flex items-center gap-1 shadow-md shadow-sky-600/30 shrink-0 active:scale-95 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{tr('New Order', language)}</span>
            </button>
          </div>

          {/* Status Chips (No Booked — Order Confirm, Dispatched, Delivery Delay) */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {statusChips.map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`whitespace-nowrap px-2.5 py-1 rounded-full text-[11px] font-bold transition ${
                  statusFilter === st
                    ? st === 'Delivery Delay'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'bg-slate-900 text-white shadow-sm'
                    : 'bg-white/80 text-slate-600 border border-slate-200/80 hover:bg-slate-100'
                }`}
              >
                {tr(st, language)}
              </button>
            ))}
          </div>

          {visibleOrders.length === 0 ? (
            <div className="text-center py-12 glass-card rounded-3xl p-6">
              <Package className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <h3 className="font-bold text-slate-700 text-sm">No orders found</h3>
              <p className="text-xs text-slate-400 mt-1">Try another search or status filter</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* SECTION 1: ORDER CONFIRM */}
              {(statusFilter === 'All' || statusFilter === 'Order Confirm') && (
                <section className="space-y-2.5">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0" />
                      <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 truncate">
                        1. Order Confirm ({orderConfirmOrders.length})
                      </h3>
                    </div>
                    <span className="text-[10px] font-bold text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-full shrink-0">
                      Confirmed Orders
                    </span>
                  </div>

                  {orderConfirmOrders.length === 0 ? (
                    <div className="p-4 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-500">
                      No orders in Order Confirm right now.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {orderConfirmOrders.map((ord) => {
                        const catSummary = getOrderCategoriesSummary(ord, products);
                        const delayDays = getOrderDelayDays(ord);
                        return (
                          <div
                            key={ord.id}
                            onClick={() => setSelectedOrder(ord)}
                            className="p-3 sm:p-4 rounded-2xl sm:rounded-3xl bg-white border border-sky-200/90 shadow-sm hover:shadow-md transition cursor-pointer space-y-2.5 relative overflow-hidden"
                          >
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-500 to-blue-500" />

                            <div className="flex items-start justify-between gap-2 pt-0.5">
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-mono text-xs font-black text-sky-700">#{ord.orderNumber}</span>
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold border bg-sky-100 text-sky-800 border-sky-200">
                                    Order Confirm
                                  </span>
                                  {delayDays > 0 && (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-700 border border-rose-200">
                                      {delayDays}d Delay
                                    </span>
                                  )}
                                </div>
                                <h4 className="text-base font-bold text-slate-900 mt-0.5 truncate">{ord.shopName}</h4>
                                <p className="text-xs text-slate-500 flex items-center gap-1 truncate">
                                  <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span className="truncate">{ord.customerName}</span>
                                  <span>•</span>
                                  <span className="shrink-0">{ord.distanceKm} km</span>
                                </p>
                              </div>

                              <div className="text-right shrink-0">
                                <span className="text-base font-black text-slate-900 block leading-tight tabular-nums">
                                  ₹{ord.totalAmount.toLocaleString('en-IN')}
                                </span>
                                <span className="text-xs font-extrabold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full block mt-1 tabular-nums">
                                  Due: ₹{ord.balanceAmount.toLocaleString('en-IN')}
                                </span>
                              </div>
                            </div>

                            <div className="bg-slate-50/70 rounded-xl p-2.5 border border-slate-100 flex items-center justify-between gap-2 text-xs">
                              <span className="font-bold text-slate-800 truncate">
                                {catSummary.categories.join(' · ')}
                              </span>
                              <span className="text-[11px] font-semibold text-slate-500 shrink-0 tabular-nums">
                                {catSummary.totalPackets} pkts ({catSummary.totalPieces} pcs)
                              </span>
                            </div>

                            <div
                              className="flex items-center justify-between pt-2 border-t border-slate-100 gap-2 flex-wrap"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex items-center gap-1.5">
                                <a
                                  href={`tel:${ord.phone}`}
                                  className="p-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-600 border border-sky-100 flex items-center justify-center active:scale-95 transition"
                                  title="Call Retailer"
                                >
                                  <Phone className="w-4 h-4" />
                                </a>
                                <button
                                  type="button"
                                  onClick={() =>
                                    downloadAndShareBillPdfOnWhatsApp(
                                      ord,
                                      products,
                                      settings,
                                      ord.whatsapp || ord.phone,
                                      showToast
                                    )
                                  }
                                  className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1 active:scale-95 transition"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  <span>Bill PDF</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setChallanBillOrder(ord)}
                                  className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold flex items-center gap-1 active:scale-95 transition"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                  <span>Bill</span>
                                </button>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleQuickStatusUpdate(ord, 'Packed')}
                                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1 active:scale-95 transition shadow-xs"
                              >
                                <PackageCheck className="w-3.5 h-3.5" />
                                <span>Move to Dispatch</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              )}

              {/* SECTION 2: DISPATCH */}
              {(statusFilter === 'All' || statusFilter === 'Dispatch') && (
                <section className="space-y-2.5">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <PackageCheck className="w-4 h-4 text-blue-600 shrink-0" />
                      <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 truncate">
                        2. Dispatch ({dispatchReadyOrders.length})
                      </h3>
                    </div>
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full shrink-0">
                      Ready to Dispatch
                    </span>
                  </div>

                  {dispatchReadyOrders.length === 0 ? (
                    <div className="p-4 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-500">
                      No orders queued in Dispatch right now.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {dispatchReadyOrders.map((ord) => {
                        const catSummary = getOrderCategoriesSummary(ord, products);
                        const delayDays = getOrderDelayDays(ord);
                        return (
                          <div
                            key={ord.id}
                            onClick={() => setSelectedOrder(ord)}
                            className="p-3 sm:p-4 rounded-2xl sm:rounded-3xl bg-white border border-blue-200/90 shadow-sm hover:shadow-md transition cursor-pointer space-y-2.5 relative overflow-hidden"
                          >
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />

                            <div className="flex items-start justify-between gap-2 pt-0.5">
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-mono text-xs font-black text-blue-700">#{ord.orderNumber}</span>
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold border bg-blue-100 text-blue-800 border-blue-200">
                                    Dispatch
                                  </span>
                                  {delayDays > 0 && (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-700 border border-rose-200">
                                      {delayDays}d Delay
                                    </span>
                                  )}
                                </div>
                                <h4 className="text-base font-bold text-slate-900 mt-0.5 truncate">{ord.shopName}</h4>
                                <p className="text-xs text-slate-500 flex items-center gap-1 truncate">
                                  <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span className="truncate">{ord.customerName}</span>
                                  <span>•</span>
                                  <span className="shrink-0">{ord.distanceKm} km</span>
                                </p>
                              </div>

                              <div className="text-right shrink-0">
                                <span className="text-base font-black text-slate-900 block leading-tight tabular-nums">
                                  ₹{ord.totalAmount.toLocaleString('en-IN')}
                                </span>
                                <span className="text-xs font-extrabold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full block mt-1 tabular-nums">
                                  Due: ₹{ord.balanceAmount.toLocaleString('en-IN')}
                                </span>
                              </div>
                            </div>

                            <div className="bg-blue-50/40 rounded-xl p-2.5 border border-blue-100 flex items-center justify-between gap-2 text-xs">
                              <span className="font-bold text-slate-800 truncate">
                                {catSummary.categories.join(' · ')}
                              </span>
                              <span className="text-[11px] font-semibold text-slate-500 shrink-0 tabular-nums">
                                {catSummary.totalPackets} pkts ({catSummary.totalPieces} pcs)
                              </span>
                            </div>

                            <div
                              className="flex items-center justify-between pt-2 border-t border-slate-100 gap-2 flex-wrap"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex items-center gap-1.5">
                                <a
                                  href={`tel:${ord.phone}`}
                                  className="p-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-600 border border-sky-100 flex items-center justify-center active:scale-95 transition"
                                  title="Call Retailer"
                                >
                                  <Phone className="w-4 h-4" />
                                </a>
                                <button
                                  type="button"
                                  onClick={() =>
                                    downloadAndShareBillPdfOnWhatsApp(
                                      ord,
                                      products,
                                      settings,
                                      ord.whatsapp || ord.phone,
                                      showToast
                                    )
                                  }
                                  className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1 active:scale-95 transition"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  <span>Bill PDF</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setChallanBillOrder(ord)}
                                  className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold flex items-center gap-1 active:scale-95 transition"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                  <span>Bill</span>
                                </button>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleQuickStatusUpdate(ord, 'Dispatched')}
                                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1 active:scale-95 transition shadow-xs"
                              >
                                <Truck className="w-3.5 h-3.5" />
                                <span>Mark Dispatched</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              )}

              {/* SECTION 3: DISPATCHED */}
              {(statusFilter === 'All' || statusFilter === 'Dispatched') && (
                <section className="space-y-2.5">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Truck className="w-4 h-4 text-indigo-600 shrink-0" />
                      <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 truncate">
                        3. Dispatched ({dispatchedOrders.length})
                      </h3>
                    </div>
                    <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full shrink-0">
                      Out for Delivery
                    </span>
                  </div>

                  {dispatchedOrders.length === 0 ? (
                    <div className="p-4 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-500">
                      No dispatched orders right now.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {dispatchedOrders.map((ord) => {
                        const catSummary = getOrderCategoriesSummary(ord, products);
                        const delayDays = getOrderDelayDays(ord);
                        return (
                          <div
                            key={ord.id}
                            onClick={() => setSelectedOrder(ord)}
                            className="p-3 sm:p-4 rounded-2xl sm:rounded-3xl bg-white border border-indigo-200/90 shadow-sm hover:shadow-md transition cursor-pointer space-y-2.5 relative overflow-hidden"
                          >
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-blue-500 to-emerald-500" />

                            <div className="flex items-start justify-between gap-2 pt-0.5">
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-mono text-xs font-black text-indigo-700">#{ord.orderNumber}</span>
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold border bg-indigo-100 text-indigo-800 border-indigo-200">
                                    Dispatched
                                  </span>
                                  {delayDays > 0 && (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-700 border border-rose-200">
                                      {delayDays}d Delay
                                    </span>
                                  )}
                                </div>
                                <h4 className="text-base font-bold text-slate-900 mt-0.5 truncate">{ord.shopName}</h4>
                                <p className="text-xs text-slate-500 flex items-center gap-1 truncate">
                                  <Truck className="w-3 h-3 text-indigo-500 shrink-0" />
                                  <span className="font-mono text-[11px]">TRK-{ord.orderNumber}</span>
                                  <span>•</span>
                                  <span className="truncate">{ord.distanceKm} km</span>
                                </p>
                              </div>

                              <div className="text-right shrink-0">
                                <span className="text-base font-black text-slate-900 block leading-tight tabular-nums">
                                  ₹{ord.totalAmount.toLocaleString('en-IN')}
                                </span>
                                <span className="text-xs font-extrabold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full block mt-1 tabular-nums">
                                  Due: ₹{ord.balanceAmount.toLocaleString('en-IN')}
                                </span>
                              </div>
                            </div>

                            <div className="bg-indigo-50/50 rounded-xl p-2.5 border border-indigo-100 flex items-center justify-between gap-2 text-xs">
                              <span className="font-bold text-slate-800 truncate">
                                {catSummary.categories.join(' · ')}
                              </span>
                              <span className="text-[11px] font-semibold text-slate-500 shrink-0 tabular-nums">
                                {catSummary.totalPackets} pkts ({catSummary.totalPieces} pcs)
                              </span>
                            </div>

                            <div
                              className="flex items-center justify-between pt-2 border-t border-slate-100 gap-2 flex-wrap"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex items-center gap-1.5">
                                <a
                                  href={`tel:${ord.phone}`}
                                  className="p-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-600 border border-sky-100 flex items-center justify-center active:scale-95 transition"
                                  title="Call Retailer"
                                >
                                  <Phone className="w-4 h-4" />
                                </a>
                                <button
                                  type="button"
                                  onClick={() =>
                                    downloadAndShareBillPdfOnWhatsApp(
                                      ord,
                                      products,
                                      settings,
                                      ord.whatsapp || ord.phone,
                                      showToast
                                    )
                                  }
                                  className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1 active:scale-95 transition"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  <span>Bill PDF</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setChallanBillOrder(ord)}
                                  className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold flex items-center gap-1 active:scale-95 transition"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                  <span>Bill</span>
                                </button>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleStartDeliveryOtpFlow(ord)}
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 active:scale-95 transition shadow-xs"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Mark Delivered (OTP)</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              )}

              {/* SECTION 4: DELIVERED */}
              {(statusFilter === 'All' || statusFilter === 'Delivered') && (
                <section className="space-y-2.5">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-emerald-600" />
                      <h3 className="font-extrabold text-xs sm:text-sm text-slate-800">
                        4. Delivered ({deliveredOrders.length})
                      </h3>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full shrink-0">
                      Completed
                    </span>
                  </div>

                  {deliveredOrders.length === 0 ? (
                    <div className="p-4 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-500">
                      No delivered orders in this view.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {deliveredOrders.map((ord) => {
                        const catSummary = getOrderCategoriesSummary(ord, products);
                        return (
                          <div
                            key={ord.id}
                            onClick={() => setSelectedOrder(ord)}
                            className="glass-card rounded-3xl p-4 border border-emerald-200/80 shadow-sm hover:shadow-md transition cursor-pointer bg-white"
                          >
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs font-bold text-slate-400">#{ord.orderNumber}</span>
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border bg-emerald-100 text-emerald-800 border-emerald-200">
                                    Delivered
                                  </span>
                                </div>
                                <h3 className="text-base font-bold text-slate-900 mt-0.5">{ord.shopName}</h3>
                                <p className="text-xs text-slate-500">
                                  {ord.customerName} • {ord.distanceKm} km from Nuapatna
                                </p>
                              </div>

                              <div className="text-right">
                                <span className="text-lg font-black text-slate-900 block leading-tight tabular-nums">
                                  ₹{ord.totalAmount.toLocaleString('en-IN')}
                                </span>
                                <span className="text-[11px] text-emerald-600 font-bold block mt-0.5 tabular-nums">
                                  Due: ₹{ord.balanceAmount.toLocaleString('en-IN')}
                                </span>
                              </div>
                            </div>

                            <div className="text-xs font-semibold text-slate-700 line-clamp-1 mb-3">
                              {catSummary.categories.join(' · ')}
                              <span className="text-slate-400 font-normal">
                                {' '}• {catSummary.totalPackets} pkts ({catSummary.totalPieces} pcs)
                              </span>
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs gap-2 flex-wrap">
                              <span className="text-slate-400 text-[11px] flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" /> Exp: {ord.expectedDeliveryDate}
                              </span>

                              <div className="flex items-center gap-1.5 flex-wrap" onClick={(e) => e.stopPropagation()}>
                                <a
                                  href={`tel:${ord.phone}`}
                                  className="w-8 h-8 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center hover:bg-sky-100 transition"
                                  title="Call Shop"
                                >
                                  <Phone className="w-3.5 h-3.5" />
                                </a>
                                <button
                                  type="button"
                                  onClick={() =>
                                    downloadAndShareBillPdfOnWhatsApp(
                                      ord,
                                      products,
                                      settings,
                                      ord.whatsapp || ord.phone,
                                      showToast
                                    )
                                  }
                                  className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 transition"
                                  title="Download Bill PDF & Send on WhatsApp"
                                >
                                  <Download className="w-3 h-3" /> Bill PDF
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setChallanBillOrder(ord)}
                                  className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] flex items-center gap-1 transition"
                                >
                                  <FileText className="w-3 h-3" /> Bill
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              )}

              {/* SECTION 5: DELIVERY DELAY */}
              {(statusFilter === 'All' || statusFilter === 'Delivery Delay') && (
                <section className="space-y-2.5">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <h3 className="font-extrabold text-xs sm:text-sm text-rose-900 truncate">
                        5. Delivery Delay ({deliveryDelayOrders.length})
                      </h3>
                    </div>
                    <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full shrink-0">
                      Overdue Delivery
                    </span>
                  </div>

                  {deliveryDelayOrders.length === 0 ? (
                    <div className="p-4 text-center bg-white rounded-2xl border border-slate-200 text-xs text-emerald-700 font-semibold">
                      No delivery delays right now.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {deliveryDelayOrders.map((ord) => {
                        const catSummary = getOrderCategoriesSummary(ord, products);
                        const delayDays = getOrderDelayDays(ord);
                        return (
                          <div
                            key={`delay-${ord.id}`}
                            onClick={() => setSelectedOrder(ord)}
                            className="p-3 sm:p-4 rounded-2xl sm:rounded-3xl bg-white border border-rose-200 shadow-sm hover:shadow-md transition cursor-pointer space-y-2.5 relative overflow-hidden"
                          >
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-amber-500" />
                            <div className="flex items-start justify-between gap-2 pt-0.5">
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-mono text-xs font-black text-rose-700">#{ord.orderNumber}</span>
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-200">
                                    {delayDays > 0 ? `${delayDays}d Delay` : 'Delivery Delay'}
                                  </span>
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(ord.status)}`}>
                                    {getOrderStatusLabel(ord.status)}
                                  </span>
                                </div>
                                <h4 className="text-base font-bold text-slate-900 mt-0.5 truncate">{ord.shopName}</h4>
                                <p className="text-xs text-slate-500">
                                  Exp: {ord.expectedDeliveryDate} • {catSummary.categories.join(' · ')}
                                </p>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="text-base font-black text-slate-900 block tabular-nums">
                                  ₹{ord.totalAmount.toLocaleString('en-IN')}
                                </span>
                                <span className="text-[11px] font-bold text-rose-600 tabular-nums">
                                  Due: ₹{ord.balanceAmount.toLocaleString('en-IN')}
                                </span>
                              </div>
                            </div>

                            <div
                              className="flex items-center justify-between pt-2 border-t border-slate-100 gap-2 flex-wrap"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex items-center gap-1.5">
                                <a
                                  href={`tel:${ord.phone}`}
                                  className="p-2 rounded-xl bg-sky-50 text-sky-700 border border-sky-100 flex items-center justify-center"
                                  title="Call Retailer"
                                >
                                  <Phone className="w-3.5 h-3.5" />
                                </a>
                                <button
                                  type="button"
                                  onClick={() => setChallanBillOrder(ord)}
                                  className="px-2.5 py-1.5 rounded-xl bg-slate-900 text-white text-[11px] font-bold flex items-center gap-1"
                                >
                                  <FileText className="w-3 h-3" /> Bill
                                </button>
                              </div>

                              {ord.status !== 'Dispatched' ? (
                                <button
                                  type="button"
                                  onClick={() => handleQuickStatusUpdate(ord, 'Dispatched')}
                                  className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1"
                                >
                                  <Truck className="w-3.5 h-3.5" />
                                  <span>Dispatch Now</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleStartDeliveryOtpFlow(ord)}
                                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Mark Delivered</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              )}
            </div>
          )}
      </>
      )}
        </>
      )}

      {/* Stepper Modal: New Order Flow */}
      {isCreatingOrder && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-t-3xl p-5 shadow-2xl border-t border-slate-100 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Book Wholesale Order</h3>
                <p className="text-xs text-slate-500">
                  Step {orderStep} of 4 • {orderStep === 1 ? 'Retailer' : orderStep === 2 ? 'Items (Full Packets)' : orderStep === 3 ? 'Delivery' : 'Advance'}
                </p>
              </div>
              <button
                onClick={() => {
                  setIsCreatingOrder(false);
                  onCloseNewOrderDirect?.();
                }}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Step 1: Select Customer */}
            {orderStep === 1 && (
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Select Retailer (Retailer ID)
                </span>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {(role === 'customer' && loggedInCustomer ? [loggedInCustomer] : customers).map((c) => {
                    const udhaarCheck = checkCustomerCanOrder(c.pendingUdhaar);
                    const isBlocked = !udhaarCheck.allowed;

                    return (
                      <div
                        key={c.id}
                        onClick={() => {
                          setSelectedCustomerId(c.id);
                          setIsClearingUdhaar(false);
                        }}
                        className={`p-3 rounded-2xl border cursor-pointer transition ${
                          selectedCustomerId === c.id
                            ? 'bg-sky-50 border-sky-400 shadow-sm ring-1 ring-sky-300'
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                        } ${isBlocked ? 'border-rose-300' : ''}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 text-sm">{c.shopName}</span>
                          <span className="text-xs font-semibold text-slate-500">{c.distanceKm} km</span>
                        </div>
                        <p className="text-xs text-slate-500">{c.ownerName} • {c.phone}</p>

                        {/* Udhaar block warning per business rule #6 */}
                        {isBlocked && (
                          <div className="mt-1.5 p-1.5 rounded-lg bg-rose-50 text-[11px] font-semibold text-rose-700 flex items-center justify-between">
                            <span className="flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                              Pending Udhaar: ₹{c.pendingUdhaar}
                            </span>
                            <span className="text-[10px] bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded font-bold">
                              Pay Old Due First
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Connected Customer Details Card (When a shop is selected) */}
                {selectedCust && (
                  <div className="p-3.5 rounded-2xl bg-slate-50/90 border border-slate-200/90 space-y-2.5">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Connected Dukandar Profile
                        </span>
                        <h4 className="font-black text-slate-900 text-sm">{selectedCust.shopName}</h4>
                        <p className="text-xs text-slate-600">{selectedCust.ownerName} • {selectedCust.phone}</p>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-200">
                        {selectedCust.category || 'Cosmetic Shop'}
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 flex items-start gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span>{selectedCust.address}, {selectedCust.landmark}, {selectedCust.city} ({selectedCust.distanceKm} km from Nuapatna)</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-200/70">
                      <div className="bg-white p-2 rounded-xl border border-slate-100">
                        <span className="text-[10px] text-slate-400 block font-semibold">Delivery Zone</span>
                        <span className="font-bold text-slate-800 text-[11px]">
                          {deliveryCalc.isFree ? 'Free Delivery (<= 150 km)' : `+₹${deliveryCalc.charge} Delivery Charge`}
                        </span>
                      </div>
                      <div className="bg-white p-2 rounded-xl border border-slate-100">
                        <span className="text-[10px] text-slate-400 block font-semibold">Wholesale History</span>
                        <span className="font-bold text-slate-800 text-[11px]">
                          {selectedCust.totalOrders} Orders (₹{selectedCust.totalSales.toLocaleString('en-IN')})
                        </span>
                      </div>
                    </div>

                    {/* LIVE KHATA & UDHAAR CHECK */}
                    {selectedCust.pendingUdhaar > 0 ? (
                      <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 text-rose-800 font-bold text-xs">
                            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                            <span>Pending Udhaar: ₹{selectedCust.pendingUdhaar.toLocaleString('en-IN')} (Blocked)</span>
                          </div>
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-200 text-rose-900">
                            Due First
                          </span>
                        </div>
                        <p className="text-[11px] text-rose-700 leading-snug">
                          Is dukandar ka purana udhaar pending hai. Rupam rule ke anusar pehle purana udhaar clear karein, tabhi naya wholesale order book hoga.
                        </p>

                        {!isClearingUdhaar ? (
                          <button
                            type="button"
                            onClick={() => setIsClearingUdhaar(true)}
                            className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-rose-600 to-orange-600 hover:from-rose-700 hover:to-orange-700 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-98 transition"
                          >
                            <QrCode className="w-4 h-4" />
                            <span>{tr('Pay Now', language)} — Clear ₹{selectedCust.pendingUdhaar.toLocaleString('en-IN')} Dues</span>
                          </button>
                        ) : (
                          <PaymentGateway
                            upiId={settings.upiId}
                            payeeName={settings.businessName}
                            amount={selectedCust.pendingUdhaar}
                            outstandingDues={selectedCust.pendingUdhaar}
                            title="Clear Pending Udhaar"
                            subtitle={selectedCust.shopName}
                            note={`Udhaar Clearance (${selectedCust.shopName})`}
                            accent="rose"
                            ctaLabel={`Confirm ₹${selectedCust.pendingUdhaar.toLocaleString('en-IN')} Udhaar Paid ✓`}
                            onConfirmPaid={() => {
                              clearCustomerUdhaar(selectedCust.id, selectedCust.pendingUdhaar);
                              setIsClearingUdhaar(false);
                            }}
                            compact
                          />
                        )}
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div>
                          <span className="font-bold block text-[11px]">Udhaar Khata All Clear (₹0 Due)</span>
                          <span className="text-[10px] text-emerald-700">Shopkeeper eligible for booking wholesale order.</span>
                        </div>
                      </div>
                    )}

                    {role === 'owner' && selectedCust.pendingUdhaar > 0 && (
                      <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs space-y-1">
                        <span className="font-bold text-amber-900 block text-[11px]">Owner Override for Udhaar (Optional):</span>
                        <input
                          type="text"
                          placeholder="Override reason (e.g. Regular shopkeeper guaranteed clearance on Friday)"
                          value={overrideReason}
                          onChange={(e) => setOverrideReason(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-amber-300 text-xs text-slate-800"
                        />
                      </div>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  disabled={
                    !selectedCustomerId ||
                    (selectedCust?.pendingUdhaar! > 0 && overrideReason.trim().length < 3)
                  }
                  onClick={() => setOrderStep(2)}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 text-white font-bold text-sm shadow-md disabled:opacity-50 active:scale-98 transition flex items-center justify-center gap-2"
                >
                  Continue to Items <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Step 2: Add Items (Full packets only, min ₹1,000) */}
            {orderStep === 2 && (
              <div className="space-y-3">
                <div className="p-2.5 rounded-2xl bg-sky-50 border border-sky-200 text-xs text-sky-900 flex items-center justify-between">
                  <span>Wholesale Rule: Full packets only (6 or 12 pcs)</span>
                  <span className="font-bold">Min ₹1,000 Order</span>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {products.map((p) => {
                    const existingItem = orderItems.find((i) => i.productId === p.id);
                    const qty = existingItem?.packetQty || 0;

                    return (
                      <div
                        key={p.id}
                        className="p-3 rounded-2xl bg-white border border-slate-200 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-xs text-slate-900 truncate">{p.name}</h4>
                          <p className="text-[11px] text-slate-500">
                            Pack: {p.packSize} pcs • Stock: {p.packetStock} pkts • ₹{p.sellingPrice}/pkt
                          </p>
                        </div>

                        {/* Qty Counter */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleUpdateItemQty(p.id, -1)}
                            disabled={qty === 0}
                            className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 font-bold flex items-center justify-center disabled:opacity-40"
                          >
                            -
                          </button>
                          <span className="text-xs font-bold text-slate-900 w-5 text-center">{qty}</span>
                          <button
                            onClick={() => handleUpdateItemQty(p.id, 1)}
                            disabled={qty >= p.packetStock}
                            className="w-7 h-7 rounded-lg bg-sky-600 text-white font-bold flex items-center justify-center disabled:opacity-40"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Subtotal & Validation Notice */}
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-500">Items Subtotal:</span>
                    <span className="font-bold text-slate-900">₹{orderSubtotal.toLocaleString('en-IN')}</span>
                  </div>
                  {!minValidation.valid && (
                    <p className="text-xs font-bold text-rose-600 mt-1">
                      ⚠️ {minValidation.error}
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setOrderStep(1)}
                    className="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-700 font-bold text-sm"
                  >
                    Back
                  </button>
                  <button
                    disabled={!minValidation.valid}
                    onClick={() => setOrderStep(3)}
                    className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 text-white font-bold text-sm shadow-md disabled:opacity-50 active:scale-98 transition"
                  >
                    Delivery Info
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Delivery Details & 150 km Radius Check */}
            {orderStep === 3 && selectedCust && (
              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Retailer Distance:</span>
                    <span className="font-bold text-slate-900">{selectedCust.distanceKm} km from Nuapatna</span>
                  </div>

                  {deliveryCalc.isFree ? (
                    <div className="p-2 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      Inside 150 km Free Delivery Zone (₹0 Freight)
                    </div>
                  ) : (
                    <div className="p-2 rounded-xl bg-amber-50 text-amber-800 text-xs font-semibold flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      Outside 150 km free radius: +₹{deliveryCalc.charge} delivery charge
                    </div>
                  )}

                  <div className="text-xs text-slate-600 pt-1">
                    <span className="font-semibold block">Delivery Address:</span>
                    <span>{selectedCust.address}, {selectedCust.landmark}, {selectedCust.city}</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1.5 block">
                    Expected Delivery Time (1 - 5 Days)
                  </label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {[1, 2, 3, 4, 5].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setExpectedDays(d)}
                        className={`py-2 rounded-xl text-xs font-bold border transition ${
                          expectedDays === d
                            ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                            : 'bg-white text-slate-700 border-slate-200'
                        }`}
                      >
                        {d} Day{d > 1 ? 's' : ''}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setOrderStep(2)}
                    className="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-700 font-bold text-sm"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setOrderStep(4)}
                    className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 text-white font-bold text-sm shadow-md active:scale-98 transition"
                  >
                    Advance Payment
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Advance ₹1,000 & Auto Product Tracking Confirmation */}
            {orderStep === 4 && selectedCust && (
              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-sky-50/90 border border-sky-200/90 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">Total Order Amount:</span>
                    <span className="font-bold text-slate-900 text-sm">₹{finalOrderTotal.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-bold text-sky-800">
                    <span>Advance Booking Required:</span>
                    <span>₹{settings.advanceBookingAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-amber-700">
                    <span>Balance Due on Delivery:</span>
                    <span className="font-bold">
                      ₹{(finalOrderTotal - settings.advanceBookingAmount).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <p className="text-[11px] text-sky-700 pt-1 border-t border-sky-200/70 leading-snug">
                    Rule: Order confirmation ke liye ₹1,000 advance zaroori hai. Baki balance payment van dispatch / delivery par collect hoga.
                  </p>
                </div>

                {/* Business UPI & QR PaymentGateway Card */}
                <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                      <QrCode className="w-4 h-4 text-sky-600" />
                      <span>
                        UPI & QR Payment (Advance ₹{settings.advanceBookingAmount.toLocaleString('en-IN')})
                      </span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {isAdvanceVerified ? 'Payment Verified ✓' : 'Live UPI Gateway'}
                    </span>
                  </div>

                  {advancePaidMode === 'UPI' && (
                    <PaymentGateway
                      upiId={settings.upiId}
                      payeeName={settings.businessName}
                      amount={Math.min(settings.advanceBookingAmount, finalOrderTotal)}
                      advanceAmount={Math.min(settings.advanceBookingAmount, finalOrderTotal)}
                      note={`Advance Booking (${selectedCust?.shopName || 'Order'})`}
                      accent="sky"
                      ctaLabel={`Verify ₹${Math.min(settings.advanceBookingAmount, finalOrderTotal).toLocaleString('en-IN')} Advance Paid ✓`}
                      onConfirmPaid={(refId) => {
                        setAdvanceRefId(refId);
                        setAdvancePaidMode('UPI');
                        setIsAdvanceVerified(true);
                        showToast(
                          `₹${Math.min(settings.advanceBookingAmount, finalOrderTotal).toLocaleString('en-IN')} Advance UPI payment confirmed!`,
                          'success'
                        );
                      }}
                      compact
                    />
                  )}

                  {role === 'owner' && (
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 mb-1 block">Payment Mode Received</label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {(['UPI', 'Cash', 'Bank'] as const).map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => {
                              setAdvancePaidMode(m);
                              setIsAdvanceVerified(m !== 'UPI' ? true : Boolean(advanceRefId.trim()));
                            }}
                            className={`py-1.5 rounded-xl text-xs font-bold border transition ${
                              advancePaidMode === m
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                : 'bg-white text-slate-700 border-slate-200'
                            }`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-slate-600">UPI / Cash Reference ID</label>
                      {isAdvanceVerified && advanceRefId && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          Verified ✓
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      value={advanceRefId}
                      onChange={(e) => setAdvanceRefId(e.target.value)}
                      placeholder="e.g. UPI-2611099831"
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-800"
                    />
                  </div>
                </div>

                {/* Auto Product Tracking Setup Preview */}
                <div className="p-3 rounded-2xl bg-gradient-to-r from-sky-50 to-indigo-50 border border-sky-200/90 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-sky-900">
                      <Truck className="w-4 h-4 text-sky-600" />
                      <span>Product Tracking (Auto Update)</span>
                    </div>
                    <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-sky-800 border border-sky-300">
                      TRK-NP-{(orders.length + 107)}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1 text-[10px] text-center pt-1 font-semibold">
                    <div className="p-1 rounded-lg bg-sky-200/70 text-sky-900 font-bold">1. Confirm</div>
                    <div className="p-1 rounded-lg bg-white/70 text-slate-500">2. Dispatch</div>
                    <div className="p-1 rounded-lg bg-white/70 text-slate-500">3. Dispatched</div>
                    <div className="p-1 rounded-lg bg-white/70 text-slate-500">4. Delivered</div>
                  </div>
                  <p className="text-[10px] text-slate-600 leading-tight">
                    Order book hote hi auto-tracking number activate hoga aur tracking timeline auto-update hogi.
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-100 text-[11px] text-slate-600">
                  <span className="font-bold block mb-0.5">Continuous Unboxing Video Policy:</span>
                  Shopkeeper ko WhatsApp reminder bheja jayega ki parcel bina cut ka uncut video banayein for transit replacement.
                </div>

                {advancePaidMode === 'UPI' && !isAdvanceVerified && (
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] font-semibold text-amber-900 text-center">
                    Complete ₹{Math.min(settings.advanceBookingAmount, finalOrderTotal).toLocaleString('en-IN')} UPI advance verification above to activate order booking.
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setOrderStep(3)}
                    className="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-700 font-bold text-sm"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={advancePaidMode === 'UPI' && !isAdvanceVerified}
                    onClick={handleConfirmOrder}
                    className="flex-2 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-sm shadow-md active:scale-98 transition flex items-center justify-center gap-1.5 disabled:opacity-45 disabled:cursor-not-allowed"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Confirm &amp; Activate Tracking
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Owner Order Detail Modal */}
      {role === 'owner' && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-t-3xl p-5 shadow-2xl border-t border-slate-100 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div>
                <span className="font-mono text-xs font-bold text-slate-400">#{selectedOrder.orderNumber}</span>
                <h3 className="font-bold text-slate-900 text-base">{selectedOrder.shopName}</h3>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Auto Product Tracking Card */}
            <div className="mb-4 p-3.5 rounded-2xl bg-gradient-to-br from-sky-50 via-white to-indigo-50 border border-sky-200 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-sky-600" />
                  <span className="text-xs font-bold text-slate-900">Auto Product Tracking</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-xs font-black text-sky-800 bg-sky-100/80 px-2 py-0.5 rounded-md border border-sky-300/80">
                    {selectedOrder.trackingNumber || `TRK-NP-${selectedOrder.orderNumber.replace(/\D/g, '')}`}
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(selectedOrder.trackingNumber || `TRK-NP-${selectedOrder.orderNumber.replace(/\D/g, '')}`);
                      showToast('Tracking ID copied');
                    }}
                    className="p-1 rounded bg-white text-slate-600 hover:text-sky-700 border border-slate-200"
                    title="Copy Tracking ID"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Step indicator */}
              <div className="grid grid-cols-4 gap-1 pt-1 text-center text-[10px] font-bold">
                  <div
                    className={`p-1.5 rounded-xl border ${
                      ['Booked', 'Packed', 'Dispatched', 'Delivered'].includes(selectedOrder.status)
                        ? 'bg-emerald-500 text-white border-emerald-600 shadow-xs'
                        : 'bg-slate-100 text-slate-400 border-slate-200'
                    }`}
                  >
                    1. Order Confirm
                  </div>
                  <div
                    className={`p-1.5 rounded-xl border ${
                      ['Packed', 'Dispatched', 'Delivered'].includes(selectedOrder.status)
                        ? 'bg-emerald-500 text-white border-emerald-600 shadow-xs'
                        : selectedOrder.status === 'Booked'
                        ? 'bg-sky-100 text-sky-800 border-sky-300 animate-pulse'
                        : 'bg-slate-100 text-slate-400 border-slate-200'
                    }`}
                  >
                    2. Dispatch
                  </div>
                  <div
                    className={`p-1.5 rounded-xl border ${
                      ['Dispatched', 'Delivered'].includes(selectedOrder.status)
                        ? 'bg-emerald-500 text-white border-emerald-600 shadow-xs'
                        : selectedOrder.status === 'Packed'
                        ? 'bg-sky-100 text-sky-800 border-sky-300 animate-pulse'
                        : 'bg-slate-100 text-slate-400 border-slate-200'
                    }`}
                  >
                    3. Dispatched
                  </div>
                  <div
                    className={`p-1.5 rounded-xl border ${
                      selectedOrder.status === 'Delivered'
                        ? 'bg-emerald-500 text-white border-emerald-600 shadow-xs'
                        : selectedOrder.status === 'Dispatched'
                        ? 'bg-sky-100 text-sky-800 border-sky-300 animate-pulse'
                        : 'bg-slate-100 text-slate-400 border-slate-200'
                    }`}
                  >
                    4. Delivered
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1">
                  <span>Advance: <strong className="text-emerald-700">₹{selectedOrder.advanceAmount} (Verified)</strong></span>
                  <span>Balance Due: <strong className="text-amber-700">₹{selectedOrder.balanceAmount}</strong></span>
                </div>
              </div>

              {/* Status change actions */}
              <div className="mb-4">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
                  Update Status (Auto-Updates Tracking)
                </span>
                <div className="flex gap-1.5 flex-wrap">
                  {(['Booked', 'Packed', 'Dispatched', 'Delivered'] as OrderStatus[]).map(
                    (st) => (
                      <button
                        key={st}
                        onClick={() => {
                          if (st === 'Delivered') {
                            handleStartDeliveryOtpFlow(selectedOrder);
                          } else {
                            updateOrderStatus(selectedOrder.id, st);
                            setSelectedOrder({ ...selectedOrder, status: st });
                          }
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                          selectedOrder.status === st
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {st === 'Delivered' && selectedOrder.status !== 'Delivered'
                          ? 'Delivered (OTP)'
                          : getOrderStatusLabel(st)}
                      </button>
                    )
                  )}
                </div>
            </div>

            {/* Items list */}
            <div className="mb-4">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Items</span>
              <div className="space-y-1.5 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
                {selectedOrder.items.map((it, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <span className="text-slate-800">
                      {it.productName} ({it.packetQty} pkts = {it.totalPieces} pcs)
                    </span>
                    <span className="font-bold text-slate-900">₹{it.totalPrice.toLocaleString('en-IN')}</span>
                  </div>
                ))}
                <div className="border-t border-slate-200 pt-2 flex items-center justify-between text-xs font-bold text-slate-900">
                  <span>Total Bill:</span>
                  <span>₹{selectedOrder.totalAmount.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* Challan & Bill PDF Actions */}
            <div className="grid grid-cols-2 gap-2 mb-2">
              <button
                type="button"
                onClick={() => {
                  const ordToBill = selectedOrder;
                  setSelectedOrder(null);
                  setChallanBillOrder(ordToBill);
                }}
                className="py-2.5 px-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition"
              >
                <FileText className="w-3.5 h-3.5" /> View Chalan & Bill
              </button>
              <button
                type="button"
                onClick={() =>
                  downloadAndShareBillPdfOnWhatsApp(
                    selectedOrder,
                    products,
                    settings,
                    selectedOrder.whatsapp || selectedOrder.phone,
                    showToast
                  )
                }
                className="py-2.5 px-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition"
              >
                <Download className="w-3.5 h-3.5" /> Bill PDF · WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Confirmation & WhatsApp Chat Modal (After Advance Payment) */}
      {confirmedOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border border-slate-100 space-y-4 text-center">
            {/* Animated Celebration Icon */}
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner ring-8 ring-emerald-50">
              <CheckCircle2 className="w-9 h-9 stroke-[2.5]" />
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Advance Payment Verified
              </span>
              <h3 className="text-lg font-black text-slate-900 mt-1">Wholesale Order Confirmed!</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                ₹{confirmedOrderModal.order.advanceAmount.toLocaleString('en-IN')} advance recorded in live Khata.
              </p>
            </div>

            {/* Summary Card */}
            <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/80 text-left space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Order Number:</span>
                <span className="font-mono font-bold text-slate-900">#{confirmedOrderModal.order.orderNumber}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Auto-Tracking ID:</span>
                <span className="font-mono font-black text-sky-800 bg-sky-100/80 px-2 py-0.5 rounded border border-sky-200">
                  {confirmedOrderModal.order.trackingNumber}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Shopkeeper:</span>
                <span className="font-bold text-slate-900 truncate max-w-[170px]">
                  {confirmedOrderModal.customer.shopName}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-200 pt-2 font-bold text-slate-900">
                <span>Total Bill:</span>
                <span>₹{confirmedOrderModal.order.totalAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex items-center justify-between text-amber-700 font-bold">
                <span>Balance on Delivery:</span>
                <span>₹{confirmedOrderModal.order.balanceAmount.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Main Action: Send WhatsApp Confirmation */}
            <div className="space-y-2 pt-1">
              <a
                href={`https://wa.me/91${confirmedOrderModal.customer.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                  confirmedOrderModal.whatsappMsg
                )}`}
                target="_blank"
                rel="noreferrer"
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-700/30 hover:scale-[1.01] active:scale-98 transition"
              >
                <MessageSquare className="w-4 h-4 stroke-[2.5]" />
                <span>Send WhatsApp Order Confirmation</span>
              </a>

              <button
                type="button"
                onClick={() => setConfirmedOrderModal(null)}
                className="w-full py-2.5 rounded-2xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition"
              >
                Close & View Orders
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delivery OTP Verification Modal (Owner & Van Delivery Handover) */}
      {deliveryOtpModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <KeyRound className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">4-Digit Delivery OTP</h3>
                  <p className="text-[11px] text-slate-500">Order #{deliveryOtpModalOrder.orderNumber}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeliveryOtpModalOrder(null)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Shop Details & Balance Due Card */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Retailer Shop:</span>
                <span className="font-bold text-slate-900">{deliveryOtpModalOrder.shopName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Retailer Phone:</span>
                <span className="font-mono font-bold text-slate-800">{deliveryOtpModalOrder.phone}</span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-200 pt-1.5 font-bold">
                <span className="text-slate-700">Cash / UPI to Collect:</span>
                <span className="text-sm font-black text-rose-700">₹{deliveryOtpModalOrder.balanceAmount.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* OTP Display & WhatsApp Send Action */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 space-y-2 text-center">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                Secret Delivery Code
              </span>
              <div className="py-1">
                <span className="font-mono text-3xl font-black text-amber-950 tracking-widest">
                  {getOrderDeliveryOtp(deliveryOtpModalOrder)}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-tight">
                Retailer ke phone par WhatsApp OTP bhejein. Delivery driver ko yeh 4-digit code batane par hi delivery mark hogi.
              </p>

              <button
                type="button"
                onClick={() => {
                  const otpCode = getOrderDeliveryOtp(deliveryOtpModalOrder);
                  const msg = `Namaste ${deliveryOtpModalOrder.customerName} ji! Rupam Wholesale Nuapatna se aapka Order #${deliveryOtpModalOrder.orderNumber} delivery van pahunch gayi hai. Parcel receive karne ke liye Delivery Driver ko yeh 4-Digit Secret Delivery OTP batayein: *${otpCode}*. Total balance to pay: ₹${deliveryOtpModalOrder.balanceAmount}. Continuous uncut unboxing video banana zaroori hai. Dhanyawad!`;
                  window.open(
                    `https://wa.me/91${deliveryOtpModalOrder.phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`,
                    '_blank'
                  );
                  setIsOtpSent(true);
                  showToast(`OTP ${otpCode} sent to ${deliveryOtpModalOrder.shopName}`);
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-98 transition"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>{isOtpSent ? 'Resend OTP on WhatsApp' : 'Send OTP to Retailer Phone (WhatsApp)'}</span>
              </button>
            </div>

            {/* Input 4-digit OTP */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <label>Enter 4-Digit OTP from Retailer:</label>
                <button
                  type="button"
                  onClick={() => setEnteredOtp(getOrderDeliveryOtp(deliveryOtpModalOrder))}
                  className="text-[10px] text-sky-600 hover:underline font-semibold"
                >
                  Auto Fill (Driver Assist)
                </button>
              </div>

              <input
                type="text"
                maxLength={4}
                value={enteredOtp}
                onChange={(e) => {
                  setEnteredOtp(e.target.value.replace(/\D/g, ''));
                  setOtpError('');
                }}
                placeholder="4-digit OTP"
                className="w-full py-3 px-4 text-center font-mono text-2xl font-black tracking-widest rounded-2xl bg-slate-50 border-2 border-slate-300 focus:border-emerald-500 focus:outline-none focus:bg-white transition"
              />

              {otpError && (
                <div className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{otpError}</span>
                </div>
              )}
            </div>

            {/* Verify & Deliver Button */}
            <button
              type="button"
              onClick={() => {
                const correctOtp = getOrderDeliveryOtp(deliveryOtpModalOrder);
                if (enteredOtp.trim() !== correctOtp) {
                  setOtpError('Invalid OTP! Please enter correct 4-digit code from Retailer.');
                  return;
                }
                updateOrderStatus(deliveryOtpModalOrder.id, 'Delivered');
                if (selectedOrder?.id === deliveryOtpModalOrder.id) {
                  setSelectedOrder({ ...selectedOrder, status: 'Delivered' });
                }
                showToast(`Order #${deliveryOtpModalOrder.orderNumber} successfully marked Delivered!`);
                setDeliveryOtpModalOrder(null);
              }}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-98 transition"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Verify OTP & Mark Delivered</span>
            </button>
          </div>
        </div>
      )}
      {/* Structured View Challan & Bill Modal (Retailer & Owner) */}
      <OrderChallanBillModal
        order={challanBillOrder}
        products={products}
        settings={settings}
        recipientPhone={
          challanBillOrder?.whatsapp ||
          challanBillOrder?.phone ||
          settings.ownerPhone ||
          '9437123456'
        }
        onClose={() => setChallanBillOrder(null)}
        onNotify={showToast}
      />
    </div>
  );
};
