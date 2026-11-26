import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { Sparkles, X, Send, Bot, User as UserIcon, Phone, MessageSquare, Zap } from 'lucide-react';

export const AiAssistantSheet: React.FC = () => {
  const {
    isAiModalOpen,
    setIsAiModalOpen,
    role,
    language,
    orders,
    products,
    udhaar,
    payments,
    customers,
    suppliers,
    supplierOrders,
    settings,
    activeBusiness,
    user,
  } = useApp();

  const loggedInCustomer = customers.find((c) => c.id === user?.customerId) || customers[0];
  const loggedInSupplier = suppliers.find((s) => s.id === user?.supplierId) || suppliers[0];

  const getWelcomeText = () => {
    if (role === 'owner') {
      const totalSales = orders.reduce((sum, o) => sum + o.totalAmount, 0);
      if (language === 'hi') {
        return `Namaste ${settings.ownerName}! ${activeBusiness.companyName} me abhi ${orders.length} orders (₹${totalSales.toLocaleString('en-IN')}) hain. Stock, udhaar, dispatch ya UPI ke baare me poochiye — instant reply milega.`;
      }
      if (language === 'or') {
        return `Namaskar ${settings.ownerName}! ${activeBusiness.companyName} re ${orders.length} ti orders (₹${totalSales.toLocaleString('en-IN')}) achhi. Stock, udhaar ba dispatch bishayare pachari paribe.`;
      }
      return `Hello ${settings.ownerName}! ${activeBusiness.companyName} has ${orders.length} orders (₹${totalSales.toLocaleString('en-IN')}). Ask me about low stock, udhaar, dispatches, or supplier dues for an instant answer.`;
    }
    if (role === 'supplier') {
      const myPOs = supplierOrders.filter((po) => po.supplierId === loggedInSupplier.id);
      const due = loggedInSupplier.dueAmount || loggedInSupplier.pendingDues || 0;
      if (language === 'hi') {
        return `Namaste ${loggedInSupplier.name}! Aapke ${myPOs.length} supply POs hain aur pending payable ₹${due.toLocaleString('en-IN')} hai. Payment, QR/UPI ya rate card ke baare me poochiye.`;
      }
      return `Welcome ${loggedInSupplier.name}! You have ${myPOs.length} supply POs with ₹${due.toLocaleString('en-IN')} payable due. Ask about PO status, UPI/QR payment, or landed cost rules.`;
    }
    if (language === 'hi') {
      return `Namaste ${loggedInCustomer.shopName}! Rupam wholesale me minimum order ₹${settings.minOrderValue.toLocaleString('en-IN')} hai (6/12 full packets). ₹${settings.advanceBookingAmount.toLocaleString('en-IN')} advance se order book hota hai.`;
    }
    if (language === 'or') {
      return `Namaskar ${loggedInCustomer.shopName}! Sarbanimna order ₹${settings.minOrderValue.toLocaleString('en-IN')} (6/12 full packet). Apana khata, order ba delivery bishayare pachari paribe.`;
    }
    return `Welcome ${loggedInCustomer.shopName}! Min wholesale order is ₹${settings.minOrderValue.toLocaleString('en-IN')} (6/12 full packets). Ask about your dues, order tracking, UPI QR payment, or return rules.`;
  };

  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'assistant'; text: string }>>(() => [
    { sender: 'assistant', text: getWelcomeText() },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMessages([{ sender: 'assistant', text: getWelcomeText() }]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, language, user?.id, activeBusiness.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (!isAiModalOpen) return null;

  const ownerSuggestions = [
    'Which products are low on stock?',
    'How much udhaar is pending?',
    'Show today dispatches & holds',
    'Supplier dues & UPI details',
  ];

  const customerSuggestions = [
    'Check my pending dues & udhaar',
    'What is the minimum order & packet rule?',
    'How to pay via UPI / QR Code?',
    'Delivery time & unboxing video rule',
  ];

  const supplierSuggestions = [
    'Show my pending POs & dues',
    'How to record payment or UPI QR?',
    'What are landed cost & GST rules?',
    'My supplied stock count at Hub',
  ];

  const suggestions =
    role === 'owner'
      ? ownerSuggestions
      : role === 'supplier'
      ? supplierSuggestions
      : customerSuggestions;

  const buildInstantLiveAnswer = (rawMsg: string): string | null => {
    const q = rawMsg.toLowerCase().trim();

    const lowStockProducts = products.filter((p) => p.isLowStock || p.packetStock <= p.reorderLevel);
    const pendingUdhaar = udhaar.filter((u) => u.status === 'Pending');
    const pendingUdhaarTotal = pendingUdhaar.reduce((sum, u) => sum + u.shortageAmount, 0);
    const dispatchOrders = orders.filter((o) => o.status === 'Dispatched' || o.status === 'Packed');
    const holdOrders = orders.filter((o) => o.status === 'On Hold');
    const supplierDueTotal = suppliers.reduce((sum, s) => sum + (s.dueAmount || s.pendingDues || 0), 0);

    // Greetings
    if (/^(hi|hello|hey|namaste|namaskar|hii|hy)\b/.test(q)) {
      return getWelcomeText();
    }

    // SUPPLIER ROLE INSTANT ANSWERS
    if (role === 'supplier') {
      const myPOs = supplierOrders.filter((po) => po.supplierId === loggedInSupplier.id);
      const myPendingPOs = myPOs.filter((po) => po.balanceDue > 0);
      const myDue = loggedInSupplier.dueAmount || loggedInSupplier.pendingDues || 0;
      const myProducts = products.filter(
        (p) => p.supplierId === loggedInSupplier.id || p.supplierName === loggedInSupplier.name
      );

      if (q.includes('po') || q.includes('order') || q.includes('due') || q.includes('pending') || q.includes('balance') || q.includes('settlement')) {
        return `You have ${myPOs.length} POs (${myPendingPOs.length} with pending balance). Total payable due from Nuapatna Hub is ₹${myDue.toLocaleString('en-IN')}. Payment terms: ${loggedInSupplier.paymentTerms}.`;
      }
      if (q.includes('upi') || q.includes('qr') || q.includes('pay') || q.includes('khata') || q.includes('record')) {
        return `Your registered UPI ID is ${loggedInSupplier.upiId || 'kolkataglamour@hdfcbank'}. Open the Khata tab to view your scannable UPI QR code, copy your UPI ID, or use "Record Payment" to log UPI/Bank/Cash settlements.`;
      }
      if (q.includes('stock') || q.includes('product') || q.includes('valuation') || q.includes('inventory')) {
        const totalPkts = myProducts.reduce((s, p) => s + p.packetStock, 0);
        const totalVal = myProducts.reduce((s, p) => s + p.packetStock * p.purchaseCost, 0);
        return `${myProducts.length} of your SKUs are tracked at Nuapatna Hub (${totalPkts} packets total, purchase valuation ₹${totalVal.toLocaleString('en-IN')}). Check the Stock tab for item-wise stock.`;
      }
      if (q.includes('landed') || q.includes('cost') || q.includes('margin') || q.includes('gst') || q.includes('rule')) {
        return `Landed Cost = Purchase Rate + Freight + Packing + Damage Buffer + GST (CGST+SGST for Odisha, IGST for outside). Open Menu > Landed Cost Calculator to check your Supplier ID Rule Settings Table.`;
      }
      return `Supplier Summary for ${loggedInSupplier.name}: ${myPOs.length} POs, ₹${myDue.toLocaleString('en-IN')} due, ${myProducts.length} active SKUs. Ask about POs, UPI QR, stock, or landed cost!`;
    }

    // DUKANI (CUSTOMER) ROLE INSTANT ANSWERS
    if (role === 'customer') {
      const myOrders = orders.filter(
        (o) => o.customerId === loggedInCustomer.id || o.shopName === loggedInCustomer.shopName
      );
      const myUdhaar = pendingUdhaar.filter(
        (u) => u.customerId === loggedInCustomer.id || u.shopName === loggedInCustomer.shopName
      );
      const myUdhaarAmt = myUdhaar.reduce((s, u) => s + u.shortageAmount, 0);

      if (q.includes('due') || q.includes('udhaar') || q.includes('balance') || q.includes('khata') || q.includes('pending')) {
        return `${loggedInCustomer.shopName}: Pending order balance is ₹${loggedInCustomer.pendingBalance.toLocaleString('en-IN')} and pending Udhaar is ₹${myUdhaarAmt.toLocaleString('en-IN')}. Clear old udhaar via UPI in Khata before booking your next dispatch.`;
      }
      if (q.includes('min') || q.includes('rule') || q.includes('packet') || q.includes('pack') || q.includes('advance') || q.includes('kam')) {
        return `Wholesale Rules: Minimum order is ₹${settings.minOrderValue.toLocaleString('en-IN')}. All items sell in full 6 or 12 piece packets only. Pay ₹${settings.advanceBookingAmount.toLocaleString('en-IN')} advance via UPI to confirm booking.`;
      }
      if (q.includes('upi') || q.includes('qr') || q.includes('pay') || q.includes('payment')) {
        return `Pay directly to UPI ID "${settings.upiId}" (${settings.businessName}). Go to the Khata tab for the scannable QR Code, "Open UPI App" button, and "Record Payment" form.`;
      }
      if (q.includes('deliver') || q.includes('time') || q.includes('radius') || q.includes('free') || q.includes('track') || q.includes('order')) {
        return `You have ${myOrders.length} wholesale orders. Delivery is FREE within ${settings.freeDeliveryRadiusKm} km of Nuapatna (takes 1-5 days by bus/van). Beyond ${settings.freeDeliveryRadiusKm} km costs ₹${settings.deliveryChargePerKmOverRadius}/km.`;
      }
      if (q.includes('return') || q.includes('damage') || q.includes('video') || q.includes('broken')) {
        return `Damage Claim Rule: A continuous, uncut unboxing video starting from the sealed parcel opening is mandatory. Opened or unsold items are not returnable.`;
      }
      if (q.includes('landed') || q.includes('cost') || q.includes('margin') || q.includes('calc')) {
        return `Open Menu > Landed Cost Calculator to simulate packet cost, GST split, and view the Retailer Buying & Credit Rule Settings Table.`;
      }
      return `Hi ${loggedInCustomer.shopName}! You have ${myOrders.length} orders and ₹${myUdhaarAmt.toLocaleString('en-IN')} pending udhaar. Min order is ₹${settings.minOrderValue}, UPI: ${settings.upiId}.`;
    }

    // OWNER ROLE INSTANT ANSWERS
    if (q.includes('stock') || q.includes('low') || q.includes('inventory') || q.includes('product')) {
      const names = lowStockProducts.slice(0, 4).map((p) => `${p.name} (${p.packetStock} pkts)`).join(', ');
      return lowStockProducts.length > 0
        ? `${lowStockProducts.length} products are low on stock: ${names}. Open Stock tab to adjust inventory or place a supplier PO.`
        : `All ${products.length} products are stocked above reorder levels!`;
    }
    if (q.includes('udhaar') || q.includes('due') || q.includes('pending') || q.includes('khata') || q.includes('supplier')) {
      const shops = Array.from(new Set(pendingUdhaar.map((u) => u.shopName))).slice(0, 3).join(', ');
      return `Retailer Udhaar Pending: ₹${pendingUdhaarTotal.toLocaleString('en-IN')} across ${pendingUdhaar.length} entries${shops ? ` (${shops})` : ''}. Supplier Payables Due: ₹${supplierDueTotal.toLocaleString('en-IN')}.`;
    }
    if (q.includes('dispatch') || q.includes('today') || q.includes('hold') || q.includes('deliver') || q.includes('order')) {
      return `Orders Summary: ${orders.length} total orders • ${dispatchOrders.length} Packed/Dispatched • ${holdOrders.length} On Hold. Confirm morning balance call before loading onto bus/van (Free within ${settings.freeDeliveryRadiusKm}km).`;
    }
    if (q.includes('upi') || q.includes('qr') || q.includes('pay') || q.includes('collection')) {
      const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
      return `Total recorded Khata payments: ₹${totalPaid.toLocaleString('en-IN')} across ${payments.length} entries. Active UPI ID: ${settings.upiId}. Open Khata tab to view QR or settle supplier bills.`;
    }
    if (q.includes('landed') || q.includes('cost') || q.includes('margin') || q.includes('calc')) {
      return `Minimum wholesale margin rule is ${settings.minMarginPercent}%. Open Menu > Landed Cost Calculator to simulate packet landed cost + GST and configure your active ID Rule Settings Table.`;
    }
    if (q.includes('rule') || q.includes('policy') || q.includes('min') || q.includes('return') || q.includes('video')) {
      return `Rupam Rules: ₹${settings.minOrderValue} min order, 6/12 full packets only, ₹${settings.advanceBookingAmount} advance, free delivery <=${settings.freeDeliveryRadiusKm}km, <=${settings.maxUdhaarShortagePercent}% udhaar cap (must clear before next order), uncut unboxing video required for claims.`;
    }
    if (q.includes('sale') || q.includes('revenue') || q.includes('summary') || q.includes('report') || q.includes('firebase')) {
      const totalSales = orders.reduce((sum, o) => sum + o.totalAmount, 0);
      return `${activeBusiness.companyName} Live Summary: ₹${totalSales.toLocaleString('en-IN')} order volume (${orders.length} orders), ${customers.length} shops, ${suppliers.length} suppliers, ${lowStockProducts.length} low-stock alerts. Use Menu > Firebase Data Sync to back up to Firestore.`;
    }

    return null;
  };

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || inputMessage;
    if (!text.trim() || isLoading) return;

    const userMsg = text.trim();
    setInputMessage('');
    setMessages((prev) => [...prev, { sender: 'user', text: userMsg }]);

    // Instant deterministic live-data response (0ms latency!)
    const instantReply = buildInstantLiveAnswer(userMsg);
    if (instantReply) {
      setMessages((prev) => [...prev, { sender: 'assistant', text: instantReply }]);
      return;
    }

    // Fast server/AI fallback with strict 2.5s timeout so user never waits long
    setIsLoading(true);
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 2500);

    try {
      const totalSales = orders.reduce((sum, o) => sum + o.totalAmount, 0);
      const pendingUdhaarTotal = udhaar
        .filter((u) => u.status === 'Pending')
        .reduce((sum, u) => sum + u.shortageAmount, 0);

      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          role,
          language,
          message: userMsg,
          context: {
            ownerName: settings.ownerName,
            businessName: activeBusiness.companyName,
            totalOrders: orders.length,
            totalSales,
            lowStockCount: products.filter((p) => p.isLowStock).length,
            pendingUdhaarTotal,
            dispatchesToday: orders.filter((o) => o.status === 'Dispatched' || o.status === 'Packed').length,
            minOrderValue: settings.minOrderValue,
            advanceBookingAmount: settings.advanceBookingAmount,
            freeDeliveryRadiusKm: settings.freeDeliveryRadiusKm,
            upiId: settings.upiId,
          },
        }),
      });

      window.clearTimeout(timeoutId);
      if (!response.ok) throw new Error('Server error');

      const data = await response.json();
      setMessages((prev) => [...prev, { sender: 'assistant', text: data.reply }]);
    } catch {
      window.clearTimeout(timeoutId);
      const fallbackText =
        role === 'owner'
          ? `Quick Answer: ${orders.length} orders active, ₹${udhaar.filter((u) => u.status === 'Pending').reduce((s, u) => s + u.shortageAmount, 0).toLocaleString('en-IN')} pending udhaar, ${products.filter((p) => p.isLowStock).length} low-stock items. Tap a suggestion chip above for instant metrics.`
          : role === 'supplier'
          ? `Quick Answer: Your pending payable is ₹${(loggedInSupplier.dueAmount || 0).toLocaleString('en-IN')} (Terms: ${loggedInSupplier.paymentTerms}). Check Khata for UPI QR & Payment Recording.`
          : `Quick Answer: Min order ₹${settings.minOrderValue}, full 6/12 packets, ₹${settings.advanceBookingAmount} advance via UPI (${settings.upiId}). Tap Call or Chat below for urgent help!`;
      setMessages((prev) => [...prev, { sender: 'assistant', text: fallbackText }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl bg-white rounded-t-3xl shadow-2xl border-t border-slate-100 flex flex-col h-[82vh] max-h-[700px]"
        role="dialog"
        aria-label="AI Assistant"
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-sky-50 via-indigo-50 to-white rounded-t-3xl">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-sky-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                {role === 'owner'
                  ? 'Rupam AI Business Assistant'
                  : role === 'supplier'
                  ? 'Rupam Supplier Helper'
                  : 'Rupam Retailer Helper'}
              </h3>
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-500" />
                <span>
                  {language === 'hi' ? 'Hindi (Hinglish)' : language === 'or' ? 'Odia (Roman)' : 'English'} • Instant Answers
                </span>
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsAiModalOpen(false)}
            className="w-8 h-8 rounded-full bg-white/80 border border-slate-200 text-slate-500 flex items-center justify-center hover:text-slate-800"
            aria-label="Close Assistant"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message history */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex gap-2.5 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.sender === 'assistant' && (
                <div className="w-7 h-7 rounded-lg bg-sky-500 text-white flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-gradient-to-r from-sky-600 to-blue-600 text-white shadow-sm'
                    : 'bg-white border border-slate-200/80 text-slate-800 shadow-xs'
                }`}
              >
                {m.text}
              </div>
              {m.sender === 'user' && (
                <div className="w-7 h-7 rounded-lg bg-slate-800 text-white flex items-center justify-center shrink-0 mt-0.5">
                  <UserIcon className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-2.5 items-center text-xs text-slate-500">
              <div className="w-7 h-7 rounded-lg bg-sky-500 text-white flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl px-3.5 py-2 text-slate-500 italic">
                Fetching quick answer...
              </div>
            </div>
          )}

          {/* Customer/Supplier contact helper */}
          {role !== 'owner' && (
            <div className="mt-3 p-3 rounded-2xl bg-sky-50 border border-sky-200 text-xs text-sky-900 flex items-center justify-between gap-2">
              <span>Need direct call or WhatsApp support?</span>
              <div className="flex gap-1.5 shrink-0">
                <a
                  href={`tel:${settings.ownerPhone}`}
                  className="px-2.5 py-1 rounded-lg bg-sky-600 text-white font-bold flex items-center gap-1"
                >
                  <Phone className="w-3 h-3" /> Call
                </a>
                <a
                  href={`https://wa.me/${settings.ownerPhone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold flex items-center gap-1"
                >
                  <MessageSquare className="w-3 h-3" /> Chat
                </a>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggestion chips */}
        <div className="px-4 py-2 border-t border-slate-100 bg-white">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
            {suggestions.map((s, idx) => (
              <button
                key={idx}
                onClick={() => void handleSend(s)}
                className="whitespace-nowrap px-3 py-1 rounded-full text-xs font-medium bg-slate-100 hover:bg-sky-50 hover:text-sky-700 text-slate-700 border border-slate-200/80 transition shrink-0"
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Input box */}
        <div className="p-3 bg-white border-t border-slate-100 flex items-center gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void handleSend()}
            placeholder={
              role === 'owner'
                ? 'Ask about stock, udhaar, sales...'
                : role === 'supplier'
                ? 'Ask about POs, UPI QR, landed cost...'
                : 'Ask about dues, min order, delivery...'
            }
            className="flex-1 px-4 py-2.5 rounded-2xl bg-slate-100 border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
          <button
            onClick={() => void handleSend()}
            disabled={!inputMessage.trim() || isLoading}
            className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-600 to-blue-600 text-white flex items-center justify-center disabled:opacity-50 shadow-md shadow-sky-600/30 active:scale-95 transition"
            aria-label="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
