import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { Product } from '../types';
import {
  ShoppingCart,
  X,
  AlertTriangle,
  QrCode,
  CheckCircle2,
  ShieldCheck,
  MessageSquare,
} from 'lucide-react';
import { PaymentGateway } from './PaymentGateway';
import { tr } from '../data/translations';

export const WholesaleCartModal: React.FC = () => {
  const {
    role,
    user,
    customers,
    products,
    settings,
    language,
    t,
    cart,
    isCartOpen,
    setIsCartOpen,
    setCartItemQty,
    clearCart,
    totalCartItems,
    cartTotalValue,
    addOrder,
    addPayment,
    clearCustomerUdhaar,
    setActiveTab,
    setActiveSubPage,
    showToast,
  } = useApp();

  const [selectedCartCustomerId, setSelectedCartCustomerId] = useState<string>(customers[0]?.id || '');
  const [showCartPayNow, setShowCartPayNow] = useState(false);
  const [inModalAdvancePaidRef, setInModalAdvancePaidRef] = useState<string | null>(null);
  const [confirmedWaUrl, setConfirmedWaUrl] = useState<string | null>(null);
  const [confirmedOrderNum, setConfirmedOrderNum] = useState<string | null>(null);

  useEffect(() => {
    if (isCartOpen) {
      setShowCartPayNow(false);
      setInModalAdvancePaidRef(null);
      setConfirmedWaUrl(null);
      setConfirmedOrderNum(null);
      if (!selectedCartCustomerId && customers[0]?.id) {
        setSelectedCartCustomerId(customers[0].id);
      }
    }
  }, [isCartOpen, customers, selectedCartCustomerId]);

  if (!isCartOpen) return null;

  const loggedInCustomer = customers.find((c) => c.id === user?.customerId) || customers[0];
  const activeCartCustomer =
    role === 'customer'
      ? loggedInCustomer
      : customers.find((c) => c.id === selectedCartCustomerId) || loggedInCustomer;

  const pendingUdhaarAmt = Number(activeCartCustomer?.pendingUdhaar || 0);
  const hasPendingUdhaar = pendingUdhaarAmt > 0;

  const handleClose = () => {
    setIsCartOpen(false);
    setShowCartPayNow(false);
    setConfirmedWaUrl(null);
    setConfirmedOrderNum(null);
  };

  const handleConfirmCartBooking = () => {
    if (!activeCartCustomer) {
      showToast('Please select a Retailer ID first', 'error');
      return;
    }

    if (hasPendingUdhaar) {
      showToast(
        language === 'hi'
          ? `Pehle ₹${pendingUdhaarAmt} udhaar pay karein, fir order confirm hoga!`
          : language === 'or'
          ? `Prathame ₹${pendingUdhaarAmt} udhaar pay karantu, tapare order confirm heba!`
          : `Pending Udhaar of ₹${pendingUdhaarAmt}. Please pay Udhaar + ₹1,000 advance first!`,
        'error'
      );
      return;
    }

    if (!inModalAdvancePaidRef) {
      showToast(
        language === 'hi'
          ? 'Pehle ₹1,000 advance UPI payment verify karein!'
          : language === 'or'
          ? 'Prathame ₹1,000 agrima UPI payment verify karantu!'
          : 'Please complete ₹1,000 advance UPI payment before confirming order!',
        'error'
      );
      return;
    }

    const items = Object.entries(cart)
      .map(([pId, qty]) => {
        const product = products.find((p) => p.id === pId);
        return product && qty > 0 ? { product, qty } : null;
      })
      .filter(Boolean) as Array<{ product: Product; qty: number }>;

    if (items.length === 0) return;

    const subtotal = items.reduce((sum, it) => sum + it.product.sellingPrice * it.qty, 0);
    const orderItemsList = items.map((it) => ({
      productId: it.product.id,
      productName: it.product.name,
      shadeOrSize: it.product.shadeOrSize,
      packSize: it.product.packSize,
      packetQty: it.qty,
      totalPieces: it.qty * it.product.packSize,
      unitPricePerPacket: it.product.sellingPrice,
      totalPrice: it.qty * it.product.sellingPrice,
      hsnCode: it.product.hsnCode,
      gstRate: it.product.gstRate,
    }));

    const advanceRequired = Math.min(settings.advanceBookingAmount || 1000, subtotal);
    const balance = Math.max(0, subtotal - advanceRequired);
    const paidRef = inModalAdvancePaidRef;

    const orderCreated = addOrder({
      customerId: activeCartCustomer.id,
      shopName: activeCartCustomer.shopName,
      customerName: activeCartCustomer.ownerName,
      phone: activeCartCustomer.phone,
      address: activeCartCustomer.address,
      landmark: activeCartCustomer.landmark || '',
      distanceKm: activeCartCustomer.distanceKm,
      items: orderItemsList,
      subtotal,
      discountAmount: 0,
      deliveryCharge: 0,
      taxAmount: 0,
      totalAmount: subtotal,
      advanceAmount: advanceRequired,
      advancePaid: true,
      balanceAmount: balance,
      status: 'Booked',
      statusHistory: [
        {
          status: 'Booked',
          timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
          note: `Wholesale cart order booked with ₹1,000 advance verified (Ref: ${paidRef})`,
          by: activeCartCustomer.ownerName,
        },
      ],
      expectedDeliveryDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
      notes: `Cart Booking (₹1,000 Advance Ref: ${paidRef})`,
    });

    addPayment({
      customerId: activeCartCustomer.id,
      customerName: activeCartCustomer.ownerName,
      shopName: activeCartCustomer.shopName,
      orderId: orderCreated.id,
      orderNumber: orderCreated.orderNumber,
      amount: advanceRequired,
      mode: 'UPI',
      referenceId: paidRef,
      confirmedByOwner: true,
      type: 'Advance',
      note: `₹1,000 Advance for Order #${orderCreated.orderNumber}`,
    });

    const itemsText = items
      .map((it) => `• ${it.product.name} (${it.qty} pkts x ₹${it.product.sellingPrice} = ₹${it.qty * it.product.sellingPrice})`)
      .join('\n');
    const msg = `*RUPAM WHOLESALE - ORDER BOOKING CONFIRMATION*
Order #: ${orderCreated.orderNumber}
Shop: ${activeCartCustomer.shopName} (${activeCartCustomer.ownerName})
Address: ${activeCartCustomer.address}, ${activeCartCustomer.city} (${activeCartCustomer.distanceKm} km)

*Ordered Products:*
${itemsText}

*Billing & Advance Summary:*
• Subtotal: ₹${subtotal.toLocaleString('en-IN')}
• Advance Paid: ₹1,000 (UPI QR Verified)
• *Balance on Delivery: ₹${balance.toLocaleString('en-IN')}*

Thank you for choosing Rupam Wholesale! Dispatch tracking will be updated shortly.`;

    const waUrl = `https://wa.me/91${activeCartCustomer.phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`;
    clearCart();
    setShowCartPayNow(false);
    setInModalAdvancePaidRef(null);
    setConfirmedOrderNum(orderCreated.orderNumber);
    setConfirmedWaUrl(waUrl);

    showToast(`Order #${orderCreated.orderNumber} booked successfully with ₹1,000 advance!`, 'success');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-white rounded-t-3xl p-4 sm:p-5 shadow-2xl border-t border-slate-100 max-h-[90vh] overflow-y-auto space-y-3.5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-900 flex items-center justify-center font-bold shrink-0">
              <ShoppingCart className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="font-extrabold text-slate-900 text-base truncate">
                {tr('Retailer Wholesale Cart', language)}
              </h3>
              <p className="text-[11px] text-slate-500 truncate">
                {activeCartCustomer
                  ? `${activeCartCustomer.shopName} • ${activeCartCustomer.ownerName}`
                  : 'Select Retailer'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0"
            aria-label="Close Cart"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Order Confirmed View */}
        {confirmedOrderNum ? (
          <div className="py-6 text-center space-y-3 bg-emerald-50 rounded-2xl border border-emerald-200 px-4">
            <CheckCircle2 className="w-11 h-11 text-emerald-600 mx-auto" />
            <div>
              <h4 className="font-black text-base text-emerald-950">
                Order #{confirmedOrderNum} Confirmed!
              </h4>
              <p className="text-xs text-emerald-800 mt-0.5">
                ₹1,000 advance verified & stock reserved. Track live status in Orders.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              {confirmedWaUrl && (
                <a
                  href={confirmedWaUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Send WhatsApp Receipt</span>
                </a>
              )}
              <button
                type="button"
                onClick={() => {
                  handleClose();
                  setActiveSubPage(null);
                  setActiveTab('orders');
                }}
                className="flex-1 py-2.5 px-3 rounded-xl bg-slate-900 text-white font-bold text-xs shadow-sm"
              >
                {tr('Track Order', language)}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Owner can choose Retailer inside Cart */}
            {role === 'owner' && activeCartCustomer && (
              <div className="p-2.5 rounded-2xl bg-sky-50 border border-sky-200 space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-sky-900 block">
                  Select Retailer ID for Cart Order
                </label>
                <select
                  value={activeCartCustomer.id}
                  onChange={(e) => {
                    setSelectedCartCustomerId(e.target.value);
                    setShowCartPayNow(false);
                    setInModalAdvancePaidRef(null);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-sky-200 text-xs font-bold text-slate-900"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.shopName} ({c.ownerName}) {c.pendingUdhaar > 0 ? `• Udhaar ₹${c.pendingUdhaar}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Empty Cart State */}
            {totalCartItems === 0 ? (
              <div className="py-8 text-center space-y-2.5 bg-slate-50 rounded-2xl border border-slate-200/80 px-4">
                <ShoppingCart className="w-9 h-9 text-amber-500 mx-auto" />
                <h4 className="font-extrabold text-sm text-slate-900">Your Cart is Empty</h4>
                <p className="text-xs text-slate-500">
                  Tap <strong>{t.addCart}</strong> on any product in {role === 'owner' ? t.stock : t.catalogue} to add packets here.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    handleClose();
                    setActiveSubPage(null);
                    setActiveTab(role === 'owner' ? 'stock' : 'catalogue');
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs shadow-xs"
                >
                  {tr('Browse Catalogue', language)}
                </button>
              </div>
            ) : (
              <>
                {/* Cart Items List */}
                <div className="space-y-2">
                  {Object.entries(cart).map(([pId, qty]) => {
                    const prod = products.find((p) => p.id === pId);
                    if (!prod || qty <= 0) return null;
                    return (
                      <div
                        key={pId}
                        className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <img
                            src={prod.imageUrl}
                            alt={prod.name}
                            className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
                          />
                          <div className="min-w-0">
                            <h4 className="font-bold text-xs text-slate-900 truncate">{prod.name}</h4>
                            <span className="text-[11px] text-slate-500 block">
                              ₹{prod.sellingPrice}/pkt • {prod.packSize} pcs
                            </span>
                            <span className="text-xs font-black text-slate-900 block mt-0.5">
                              ₹{(prod.sellingPrice * qty).toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>

                        {/* Qty control */}
                        <div className="flex items-center border border-slate-200 rounded-xl bg-white p-0.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => setCartItemQty(pId, qty - 1)}
                            className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center hover:bg-slate-200 active:scale-95"
                          >
                            -
                          </button>
                          <span className="w-8 text-center text-xs font-bold text-slate-800">{qty}</span>
                          <button
                            type="button"
                            onClick={() => setCartItemQty(pId, qty + 1)}
                            className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center hover:bg-slate-200 active:scale-95"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Total Billing Breakdown */}
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>{tr('Cart Subtotal', language)}</span>
                    <span className="font-bold text-slate-900">₹{cartTotalValue.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Nuapatna Van Delivery</span>
                    <span className="font-bold text-emerald-600">FREE</span>
                  </div>
                  <div className="flex justify-between text-slate-900 font-extrabold text-sm pt-1.5 border-t border-slate-200">
                    <span>{tr('Total Order Amount', language)}</span>
                    <span>₹{cartTotalValue.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {/* In-Modal Udhaar + ₹1,000 Advance Payment Gate */}
                {activeCartCustomer && hasPendingUdhaar ? (
                  <div className="p-3.5 rounded-2xl bg-rose-50 border-2 border-rose-200 space-y-2.5">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <h4 className="font-extrabold text-xs text-rose-900">
                          {tr('Khata Udhaar Clearance Required', language)}
                        </h4>
                        <p className="text-[11px] text-rose-800 mt-0.5 leading-snug">
                          {language === 'hi'
                            ? `Aapka pehle ka ₹${pendingUdhaarAmt.toLocaleString('en-IN')} udhaar baki hai. Order confirm karne ke liye pehle udhaar (₹${pendingUdhaarAmt.toLocaleString('en-IN')}) + ₹1,000 advance jama karein.`
                            : language === 'or'
                            ? `Apanankara puruna ₹${pendingUdhaarAmt.toLocaleString('en-IN')} udhaar baki achi. Order pain udhaar + ₹1,000 agrima ebe pay karantu.`
                            : `You have pending Udhaar of ₹${pendingUdhaarAmt.toLocaleString('en-IN')}. Pay Udhaar + ₹1,000 Advance right here to unlock & confirm order.`}
                        </p>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white border border-rose-200 text-xs space-y-1">
                      <div className="flex justify-between text-slate-600">
                        <span>Pending Udhaar:</span>
                        <span className="font-black text-rose-600">₹{pendingUdhaarAmt.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Order Advance:</span>
                        <span className="font-black text-sky-700">₹1,000</span>
                      </div>
                      <div className="flex justify-between font-black text-slate-900 pt-1 border-t border-slate-100">
                        <span>Total Pay Now:</span>
                        <span className="text-rose-700">₹{(pendingUdhaarAmt + 1000).toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    {!showCartPayNow ? (
                      <button
                        type="button"
                        onClick={() => setShowCartPayNow(true)}
                        className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-md active:scale-95 transition flex items-center justify-center gap-1.5"
                      >
                        <QrCode className="w-4 h-4" />
                        <span>{t.payNow} (₹{(pendingUdhaarAmt + 1000).toLocaleString('en-IN')})</span>
                      </button>
                    ) : (
                      <PaymentGateway
                        upiId={settings.upiId}
                        payeeName={settings.businessName}
                        amount={pendingUdhaarAmt + 1000}
                        outstandingDues={pendingUdhaarAmt}
                        advanceAmount={1000}
                        note={`Udhaar ₹${pendingUdhaarAmt} + Advance ₹1000 (${activeCartCustomer.shopName})`}
                        accent="amber"
                        ctaLabel={
                          language === 'hi'
                            ? `₹${(pendingUdhaarAmt + 1000).toLocaleString('en-IN')} (Udhaar + Advance) Pay Done ✓`
                            : language === 'or'
                            ? `₹${(pendingUdhaarAmt + 1000).toLocaleString('en-IN')} Payment Done ✓`
                            : `Verify ₹${(pendingUdhaarAmt + 1000).toLocaleString('en-IN')} Paid (Unlock Order) ✓`
                        }
                        onConfirmPaid={(refId) => {
                          clearCustomerUdhaar(activeCartCustomer.id, pendingUdhaarAmt);
                          setInModalAdvancePaidRef(refId);
                          setShowCartPayNow(false);
                          showToast(
                            language === 'hi'
                              ? 'Udhaar clear & ₹1,000 Advance verify ho gaya! Ab Order Confirm karein.'
                              : language === 'or'
                              ? 'Udhaar clear & ₹1,000 agrima verify hela! Ebe Order Confirm karantu.'
                              : 'Pending Udhaar cleared & ₹1,000 Advance verified! Confirm order now.',
                            'success'
                          );
                        }}
                        compact
                      />
                    )}
                  </div>
                ) : (
                  <div className="p-3 rounded-2xl bg-sky-50 border border-sky-200 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="font-extrabold text-[11px] text-sky-950 flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                          <span>₹1,000 Advance Booking Payment</span>
                        </h4>
                        <p className="text-[10px] text-sky-800 mt-0.5">
                          Locks stock. Balance ₹{Math.max(0, cartTotalValue - 1000).toLocaleString('en-IN')} on delivery.
                        </p>
                      </div>
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-sky-200 text-sky-900 shrink-0">
                        Rule
                      </span>
                    </div>

                    {inModalAdvancePaidRef ? (
                      <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <div className="min-w-0">
                            <span className="text-xs font-extrabold text-emerald-900 block truncate">
                              ₹1,000 Advance Paid & Verified ✓
                            </span>
                            <span className="text-[10px] font-mono text-emerald-700 block truncate">
                              Ref: {inModalAdvancePaidRef}
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <PaymentGateway
                        upiId={settings.upiId}
                        payeeName={settings.businessName}
                        amount={Math.min(settings.advanceBookingAmount || 1000, cartTotalValue)}
                        advanceAmount={Math.min(settings.advanceBookingAmount || 1000, cartTotalValue)}
                        note={`Advance Booking (${activeCartCustomer?.shopName || 'Retailer'})`}
                        accent="sky"
                        ctaLabel={
                          language === 'hi'
                            ? `₹${Math.min(settings.advanceBookingAmount || 1000, cartTotalValue).toLocaleString('en-IN')} Advance Pay Done ✓`
                            : language === 'or'
                            ? `₹${Math.min(settings.advanceBookingAmount || 1000, cartTotalValue).toLocaleString('en-IN')} Agrima Pay Done ✓`
                            : `Confirm ₹${Math.min(settings.advanceBookingAmount || 1000, cartTotalValue).toLocaleString('en-IN')} Advance Paid ✓`
                        }
                        onConfirmPaid={(refId) => {
                          setInModalAdvancePaidRef(refId);
                          showToast('Advance UPI payment verified! Tap Confirm Booking below.', 'success');
                        }}
                        compact
                      />
                    )}

                    <button
                      type="button"
                      disabled={!inModalAdvancePaidRef || cartTotalValue <= 0}
                      onClick={handleConfirmCartBooking}
                      className={`w-full py-2.5 rounded-xl font-black text-xs shadow-sm active:scale-98 transition disabled:opacity-45 disabled:cursor-not-allowed ${
                        inModalAdvancePaidRef
                          ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                          : 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950'
                      }`}
                    >
                      {tr('Confirm Booking & Send WhatsApp Order', language)}
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};
