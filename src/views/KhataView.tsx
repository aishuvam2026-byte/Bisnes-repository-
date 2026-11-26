import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Payment, UdhaarRecord } from '../types';
import {
  CreditCard,
  Copy,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Phone,
  MessageSquare,
  Search,
  X,
  ArrowLeft,
  Check,
  Wallet,
  TrendingUp,
  Receipt,
  ShieldCheck,
  AlertOctagon,
  Store,
  Building2,
  Smartphone,
  BellRing,
} from 'lucide-react';
import { PaymentGateway } from '../components/PaymentGateway';
import {
  ReminderDispatcherModal,
  buildSmsHref,
  buildWhatsAppHref,
  loadAutoReminderSettings,
} from '../components/ReminderDispatcherModal';
import { tr } from '../data/translations';

export const KhataView: React.FC<{
  isNewPaymentOpenDirect?: boolean;
  onCloseNewPaymentDirect?: () => void;
}> = ({ isNewPaymentOpenDirect = false, onCloseNewPaymentDirect }) => {
  const {
    payments,
    udhaar,
    customers,
    suppliers,
    supplierOrders,
    paySupplierBalance,
    settleSupplierBill,
    addPayment,
    confirmPayment,
    clearUdhaarEntry,
    clearCustomerUdhaar,
    settings,
    showToast,
    role,
    user,
    setActiveTab,
    language,
    t,
    logActivity,
  } = useApp();

  const loggedInCustomer = customers.find((c) => c.id === user?.customerId) || customers[0];
  const loggedInSupplier = suppliers.find((s) => s.id === user?.supplierId) || suppliers[0];

  const [activeTab, setActiveTabFilter] = useState<'advance' | 'udhaar' | 'all' | 'income'>('udhaar');
  const [duesFilter, setDuesFilter] = useState<'all' | 'suppliers' | 'customers'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [qrAmount, setQrAmount] = useState<number>(1000);

  // Supplier Khata Record Payment state
  const [isSupplierRecordingPayment, setIsSupplierRecordingPayment] = useState(isNewPaymentOpenDirect);
  const [supplierPayAmount, setSupplierPayAmount] = useState<number>(
    Math.max(1000, loggedInSupplier?.dueAmount || loggedInSupplier?.pendingDues || 5000)
  );
  const [supplierPayPoId, setSupplierPayPoId] = useState<string>('');
  const [supplierPayMode, setSupplierPayMode] = useState<'UPI' | 'Bank' | 'Cash'>('UPI');
  const [supplierPayRef, setSupplierPayRef] = useState<string>('');
  const [supplierPayNote, setSupplierPayNote] = useState<string>('');
  const [supplierQrAmount, setSupplierQrAmount] = useState<number>(
    Math.max(1000, loggedInSupplier?.dueAmount || loggedInSupplier?.pendingDues || 5000)
  );

  // Supplier Due payment modal state
  const [payingSupplierPO, setPayingSupplierPO] = useState<typeof supplierOrders[0] | null>(null);
  const [paySupplierMode, setPaySupplierMode] = useState<'UPI' | 'Bank' | 'Cash'>('UPI');
  const [paySupplierRef, setPaySupplierRef] = useState<string>('');
  const [paySupplierNote, setPaySupplierNote] = useState<string>('');

  // Payment form modal state
  const [isRecordingPayment, setIsRecordingPayment] = useState(isNewPaymentOpenDirect);
  const [paymentAmount, setPaymentAmount] = useState<number>(1000);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    role === 'customer' ? loggedInCustomer?.id || '' : ''
  );
  const [paymentMode, setPaymentMode] = useState<'UPI' | 'Cash' | 'Bank' | 'Bus-cash'>('UPI');
  const [paymentType, setPaymentType] = useState<'Advance' | 'Balance' | 'Udhaar' | 'General'>('Advance');
  const [refId, setRefId] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [confirmedPaymentModal, setConfirmedPaymentModal] = useState<{
    customer: typeof customers[0];
    amount: number;
    mode: string;
    type: string;
    refId: string;
    date: string;
    whatsappMsg: string;
  } | null>(null);
  const [isPaymentReminderOpen, setIsPaymentReminderOpen] = useState(false);
  const [reminderTargetId, setReminderTargetId] = useState<string | undefined>(undefined);
  const [remindedIds, setRemindedIds] = useState<Record<string, string>>({});

  useEffect(() => {
    if (role === 'customer' && loggedInCustomer?.id) {
      setSelectedCustomerId(loggedInCustomer.id);
    }
  }, [role, loggedInCustomer?.id]);

  useEffect(() => {
    if (isNewPaymentOpenDirect) {
      if (role === 'supplier') {
        setIsSupplierRecordingPayment(true);
      } else {
        setIsRecordingPayment(true);
      }
    }
  }, [isNewPaymentOpenDirect, role]);

  useEffect(() => {
    const due = Math.max(1000, loggedInSupplier?.dueAmount || loggedInSupplier?.pendingDues || 5000);
    setSupplierPayAmount(due);
    setSupplierQrAmount(due);
  }, [loggedInSupplier?.id]);

  // 1. Calculations for Outstanding Udhaar
  const visibleUdhaar = useMemo(() => {
    return udhaar.filter((u) => {
      if (role === 'customer') {
        const isMyUdhaar = u.customerId === loggedInCustomer.id || u.shopName === loggedInCustomer.shopName;
        if (!isMyUdhaar) return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        u.shopName.toLowerCase().includes(q) ||
        u.customerName.toLowerCase().includes(q) ||
        u.phone.includes(q) ||
        u.orderNumber.toLowerCase().includes(q)
      );
    });
  }, [udhaar, role, loggedInCustomer, searchQuery]);

  const pendingUdhaarItems = useMemo(
    () => visibleUdhaar.filter((u) => u.status === 'Pending'),
    [visibleUdhaar]
  );

  const totalUdhaarPending = useMemo(
    () => pendingUdhaarItems.reduce((sum, u) => sum + u.shortageAmount, 0),
    [pendingUdhaarItems]
  );

  const pendingUdhaarShopsCount = useMemo(() => {
    return new Set(pendingUdhaarItems.map((u) => u.shopName || u.customerId)).size;
  }, [pendingUdhaarItems]);

  // 2. Calculations for Supplier Dues (Owner owes to suppliers for stock lots)
  const visibleSupplierPOs = useMemo(() => {
    return supplierOrders.filter((po) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        po.supplierName.toLowerCase().includes(q) ||
        po.poNumber.toLowerCase().includes(q) ||
        (po.biltyNumber && po.biltyNumber.toLowerCase().includes(q))
      );
    });
  }, [supplierOrders, searchQuery]);

  const pendingSupplierPOs = useMemo(
    () => visibleSupplierPOs.filter((po) => po.balanceDue > 0),
    [visibleSupplierPOs]
  );

  const totalSupplierPendingDues = useMemo(() => {
    return suppliers.reduce((sum, s) => sum + (s.dueAmount || s.pendingDues || 0), 0);
  }, [suppliers]);

  // 3. Calculations for Payments and Collections
  const visiblePayments = useMemo(() => {
    return payments.filter((p) => {
      if (role === 'customer') {
        const isMyPayment = p.customerId === loggedInCustomer.id || p.shopName === loggedInCustomer.shopName;
        if (!isMyPayment) return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        p.shopName.toLowerCase().includes(q) ||
        p.customerName.toLowerCase().includes(q) ||
        p.referenceId.toLowerCase().includes(q) ||
        (p.note && p.note.toLowerCase().includes(q))
      );
    });
  }, [payments, role, user, searchQuery]);

  // Advance payments (e.g. ₹1,000 booking payments)
  const advancePayments = useMemo(() => {
    return visiblePayments.filter((p) => {
      return (
        p.type === 'Advance' ||
        p.amount === 1000 ||
        (p.note && p.note.toLowerCase().includes('advance')) ||
        p.referenceId.toLowerCase().includes('adv')
      );
    });
  }, [visiblePayments]);

  // Today's collections calculation
  const todayUpiCollections = useMemo(() => {
    return visiblePayments
      .filter((p) => p.mode === 'UPI')
      .reduce((sum, p) => sum + p.amount, 0);
  }, [visiblePayments]);

  const todayCashCollections = useMemo(() => {
    return visiblePayments
      .filter((p) => p.mode === 'Cash' || p.mode === 'Bus-cash')
      .reduce((sum, p) => sum + p.amount, 0);
  }, [visiblePayments]);

  const todayTotalCollections = todayUpiCollections + todayCashCollections;

  const handleSavePayment = (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveCustomerId = role === 'customer' ? loggedInCustomer.id : selectedCustomerId;
    const cust = customers.find((c) => c.id === effectiveCustomerId);
    if (!cust) {
      showToast('Please choose a shopkeeper', 'error');
      return;
    }

    const assignedRefId = refId.trim() || `UPI/${Date.now().toString().slice(-8)}`;
    const todayStr = new Date().toISOString().split('T')[0];

    if (paymentType === 'Udhaar' && cust.pendingUdhaar > 0 && Number(paymentAmount) >= cust.pendingUdhaar) {
      clearCustomerUdhaar(cust.id, Number(paymentAmount));
    } else {
      addPayment({
        customerId: cust.id,
        customerName: cust.ownerName,
        shopName: cust.shopName,
        amount: Number(paymentAmount),
        mode: paymentMode,
        referenceId: assignedRefId,
        confirmedByOwner: role === 'owner',
        note: paymentNote || `${paymentType} payment via ${paymentMode}`,
        type: paymentType,
      });
    }

    showToast(
      role === 'owner'
        ? `Payment of ₹${paymentAmount.toLocaleString('en-IN')} verified & recorded!`
        : `Payment of ₹${paymentAmount.toLocaleString('en-IN')} recorded!`,
      'success'
    );
    setIsRecordingPayment(false);
    onCloseNewPaymentDirect?.();
    setRefId('');
    setPaymentNote('');

    const msg = `Namaste ${cust.shopName}!\n\nAapka payment successfully record ho gaya hai:\n\n• Amount: ₹${Number(paymentAmount).toLocaleString('en-IN')}\n• Mode: ${paymentMode}\n• Type: ${paymentType}\n• Ref ID: ${assignedRefId}\n• Date: ${todayStr}\n\n${
      paymentType === 'Advance'
        ? 'Aapka advance booking amount record ho gaya hai. Wholesale order confirm ho chuka hai!'
        : paymentType === 'Udhaar'
        ? 'Aapka purana udhaar shortage account clear ho chuka hai. Agla order dispatch ke liye taiyyar hai!'
        : 'Khata ledger update ho gaya hai.'
    }\n\nDhanyawad! - Rupam Wholesale, Nuapatna\nPhone: ${settings.ownerPhone}`;

    setConfirmedPaymentModal({
      customer: cust,
      amount: Number(paymentAmount),
      mode: paymentMode,
      type: paymentType,
      refId: assignedRefId,
      date: todayStr,
      whatsappMsg: msg,
    });
  };

  const buildUdhaarReminderMsg = (u: UdhaarRecord) =>
    `Namaste ${u.shopName}! Polite reminder from Rupam Wholesale: Aapka shortage balance ₹${u.shortageAmount} order #${u.orderNumber} ka baaki hai. Business rule ke mutabik naya order dispatch hone se pehle purana udhaar clear hona zaroori hai. Please pay via UPI: ${settings.upiId}. Dhanyawad! - ${settings.ownerName}, ${settings.businessAddress} (Phone: ${settings.ownerPhone})`;

  const handleSendUdhaarReminder = (u: UdhaarRecord) =>
    buildWhatsAppHref(u.phone, buildUdhaarReminderMsg(u));

  const handleSendUdhaarReminderSms = (u: UdhaarRecord) =>
    buildSmsHref(u.phone, buildUdhaarReminderMsg(u));

  const markInlineReminderSent = (id: string, name: string, via: 'WhatsApp' | 'SMS', amount: number) => {
    setRemindedIds((prev) => ({ ...prev, [id]: via }));
    logActivity('Payment Reminder Sent', `${via} payment reminder sent to ${name} for ₹${amount.toLocaleString('en-IN')}`);
    showToast(`${via} reminder opened for ${name}`, 'success');
  };

  const overdueCustomersOnly = useMemo(() => {
    const activeUdhaarNames = new Set(
      pendingUdhaarItems.map((u) => u.customerId || u.shopName.toLowerCase())
    );
    return customers.filter((c) => {
      const hasDue = (c.pendingUdhaar || 0) > 0 || (c.pendingBalance || 0) > 0;
      if (!hasDue) return false;
      const alreadyListed =
        activeUdhaarNames.has(c.id) || activeUdhaarNames.has(c.shopName.toLowerCase());
      if (alreadyListed) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        c.shopName.toLowerCase().includes(q) ||
        c.ownerName.toLowerCase().includes(q) ||
        c.phone.includes(q)
      );
    });
  }, [customers, pendingUdhaarItems, searchQuery]);

  const paymentAutoConfig = loadAutoReminderSettings();

  // ══════════════════════════════════════════════════════════════════
  // SUPPLIER SETTLEMENT & PAYABLE KHATA (STRICTLY SUPPLIER & OWNER DUES)
  // ══════════════════════════════════════════════════════════════════
  if (role === 'supplier') {
    const myPOs = supplierOrders.filter((po) => po.supplierId === loggedInSupplier.id);
    const ownerPayableDue = loggedInSupplier.dueAmount || loggedInSupplier.pendingDues || 0;
    const totalPurchasesByOwner =
      loggedInSupplier.totalPurchases || myPOs.reduce((sum, po) => sum + po.totalAmount, 0);
    const supplierUpiId = loggedInSupplier.upiId || 'kolkataglamour@hdfcbank';
    const mySupplierPayments = payments.filter(
      (p) => p.customerId === loggedInSupplier.id || p.shopName === loggedInSupplier.name
    );

    const handleSupplierRecordPayment = (e: React.FormEvent) => {
      e.preventDefault();
      if (supplierPayAmount <= 0) {
        showToast('Enter a valid payment amount', 'error');
        return;
      }
      const selectedPo = myPOs.find((p) => p.id === supplierPayPoId);
      const refCode = supplierPayRef.trim() || `SUP-UPI-${Date.now().toString().slice(-6)}`;

      if (selectedPo && supplierPayAmount >= selectedPo.balanceDue && selectedPo.balanceDue > 0) {
        settleSupplierBill(selectedPo.id, supplierPayMode);
      } else {
        paySupplierBalance(
          loggedInSupplier.id,
          Number(supplierPayAmount),
          supplierPayMode,
          supplierPayNote ||
            (selectedPo
              ? `Payment recorded for ${selectedPo.poNumber} (Ref: ${refCode})`
              : `Supplier payment recorded via ${supplierPayMode} (Ref: ${refCode})`)
        );
      }

      setIsSupplierRecordingPayment(false);
      onCloseNewPaymentDirect?.();
      setSupplierPayRef('');
      setSupplierPayNote('');
    };

    const statementWhatsappMsg = `Namaste Shuvam bhai! ${loggedInSupplier.name} ka payment settlement statement:
Current Owner Payable Balance: ₹${ownerPayableDue.toLocaleString('en-IN')}
Registered Bank: ${loggedInSupplier.bankDetails?.bankName || 'HDFC Bank'} (A/C: ${loggedInSupplier.bankDetails?.accountNumber || '921020038847192'}, IFSC: ${loggedInSupplier.bankDetails?.ifsc || 'HDFC0000128'})
UPI: ${supplierUpiId}

Please release RTGS/NEFT/UPI payment as per ${loggedInSupplier.paymentTerms} terms.`;

    return (
      <div className="space-y-3 pb-24">
        {/* Header with Record Payment CTA */}
        <div className="glass-card rounded-2xl sm:rounded-3xl p-3 sm:p-4 border border-purple-200/90 shadow-sm bg-gradient-to-br from-purple-50/80 via-white to-indigo-50/40 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold shadow-sm shrink-0">
                <Wallet className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-xs sm:text-base font-extrabold text-slate-900 leading-snug truncate">
                  {tr('Supplier Khata', language)}
                </h2>
                <p className="text-[10px] sm:text-xs text-slate-500 truncate">
                  {loggedInSupplier.name} ({loggedInSupplier.id})
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setSupplierPayAmount(ownerPayableDue > 0 ? ownerPayableDue : 5000);
                setIsSupplierRecordingPayment(true);
              }}
              className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-sm active:scale-95 transition shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t.recordPay}</span>
            </button>
          </div>

          {/* Dues Card */}
          <div className="p-3 rounded-xl bg-white border border-purple-100 shadow-2xs space-y-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                  Amount Owed by Nuapatna Hub
                </span>
                <span className="text-xl sm:text-2xl font-black text-purple-950 block mt-0.5">
                  ₹{ownerPayableDue.toLocaleString('en-IN')}
                </span>
              </div>
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-purple-100 text-purple-800 border border-purple-200 shrink-0">
                {loggedInSupplier.paymentTerms}
              </span>
            </div>

            <p className="text-[10px] text-slate-500">
              Total hub procurement: ₹{totalPurchasesByOwner.toLocaleString('en-IN')}
            </p>
          </div>
        </div>

        {/* Supplier UPI QR Code & All UPI Apps Payment Card */}
        <div className="glass-card rounded-2xl sm:rounded-3xl p-3 sm:p-4 border border-purple-200/80 shadow-sm bg-white space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-xs font-black text-slate-900 truncate">Supplier UPI QR & ID</h3>
              <p className="text-[9px] text-slate-500 truncate">PhonePe, GPay, Paytm, BHIM & All UPI</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[10px] font-bold text-slate-500">Amt (₹):</span>
              <input
                type="number"
                min={1}
                value={supplierQrAmount}
                onChange={(e) => setSupplierQrAmount(Math.max(1, Number(e.target.value)))}
                className="w-24 px-2 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs font-black text-slate-900"
              />
            </div>
          </div>

          <PaymentGateway
            upiId={supplierUpiId}
            payeeName={loggedInSupplier.name}
            amount={supplierQrAmount}
            note={`Supplier Settlement (${loggedInSupplier.name})`}
            accent="purple"
            ctaLabel={`${t.recordPay} (₹${supplierQrAmount.toLocaleString('en-IN')})`}
            onConfirmPaid={(refId) => {
              setSupplierPayAmount(supplierQrAmount);
              setSupplierPayMode('UPI');
              setSupplierPayRef(refId);
              setIsSupplierRecordingPayment(true);
            }}
            compact
          />
        </div>

        {/* Inline Record Payment Section for Supplier */}
        <div className="glass-card rounded-2xl sm:rounded-3xl p-3 sm:p-4 border border-slate-200 shadow-xs space-y-2.5 bg-white">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-[11px] text-slate-800 uppercase tracking-wider flex items-center gap-1">
              <CreditCard className="w-3.5 h-3.5 text-purple-600" />
              <span>Record Payment</span>
            </h3>
            <span className="text-[9px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded-full">
              Instant Ledger
            </span>
          </div>

          <form onSubmit={handleSupplierRecordPayment} className="space-y-2">
            <div className="grid grid-cols-2 gap-1.5">
              <div>
                <label className="text-[9px] font-bold text-slate-600 block mb-0.5">
                  Link PO (Optional)
                </label>
                <select
                  value={supplierPayPoId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSupplierPayPoId(id);
                    const matched = myPOs.find((p) => p.id === id);
                    if (matched && matched.balanceDue > 0) {
                      setSupplierPayAmount(matched.balanceDue);
                    }
                  }}
                  className="w-full px-2 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] font-medium text-slate-800"
                >
                  <option value="">General Account</option>
                  {myPOs
                    .filter((p) => p.balanceDue > 0)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.poNumber} (₹{p.balanceDue})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="text-[9px] font-bold text-slate-600 block mb-0.5">
                  Amount (₹) *
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={supplierPayAmount}
                  onChange={(e) => setSupplierPayAmount(Number(e.target.value))}
                  className="w-full px-2 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-black text-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-1">
              {(['UPI', 'Bank', 'Cash'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setSupplierPayMode(m)}
                  className={`py-1 rounded-lg text-[11px] font-bold border transition ${
                    supplierPayMode === m
                      ? 'bg-purple-700 text-white border-purple-700'
                      : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  {m === 'Bank' ? 'Bank IMPS' : m}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={supplierPayRef}
                onChange={(e) => setSupplierPayRef(e.target.value)}
                placeholder="UPI / UTR Ref ID"
                className="w-full px-2.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono"
              />
              <input
                type="text"
                value={supplierPayNote}
                onChange={(e) => setSupplierPayNote(e.target.value)}
                placeholder="Payment note (optional)"
                className="w-full px-2.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-700 to-indigo-700 text-white font-extrabold text-xs shadow-sm active:scale-98 transition"
            >
              Record Payment (₹{Number(supplierPayAmount || 0).toLocaleString('en-IN')})
            </button>
          </form>
        </div>

        {/* Bank & Settlement Details */}
        <div className="glass-card rounded-3xl p-4 border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-purple-600" />
              <span>Registered Bank Account for Owner Payments</span>
            </h3>
            <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold">
              Verified
            </span>
          </div>

          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-xs space-y-1.5 font-medium text-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Account Name:</span>
              <span className="font-bold text-slate-900">{loggedInSupplier.bankDetails?.accountName || loggedInSupplier.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Account Number:</span>
              <span className="font-mono font-bold text-slate-900">{loggedInSupplier.bankDetails?.accountNumber || '921020038847192'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Bank / IFSC:</span>
              <span className="font-bold text-slate-900">{loggedInSupplier.bankDetails?.bankName || 'HDFC Bank'} • {loggedInSupplier.bankDetails?.ifsc || 'HDFC0000128'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">UPI ID:</span>
              <span className="font-mono font-bold text-purple-800">{supplierUpiId}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <a
              href={`https://wa.me/91${(settings.ownerPhone || '9437123456').replace(/\D/g, '')}?text=${encodeURIComponent(statementWhatsappMsg)}`}
              target="_blank"
              rel="noreferrer"
              className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs active:scale-95 transition"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Send Statement to Owner</span>
            </a>
          </div>
        </div>

        {/* Recorded Payment History for Supplier */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">
              Recorded Payment History ({mySupplierPayments.length})
            </h3>
            <span className="text-xs text-slate-400">UPI / Bank / Cash</span>
          </div>

          {mySupplierPayments.length === 0 ? (
            <div className="glass-card rounded-2xl p-4 text-center text-xs text-slate-500">
              No payments recorded yet. Use Record Payment above after receiving settlement.
            </div>
          ) : (
            mySupplierPayments.map((p) => (
              <div
                key={p.id}
                className="glass-card rounded-2xl p-3.5 border border-purple-100 bg-white flex items-center justify-between gap-2"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-slate-900">{p.mode}</span>
                    <span className="text-[10px] font-mono text-slate-500">Ref: {p.referenceId}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">{p.note || 'Supplier Settlement'}</p>
                  <p className="text-[10px] text-slate-400">{p.date}</p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-emerald-700 block">
                    ₹{p.amount.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                    Recorded ✓
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* PO Consignment Financial Ledger */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">
              Consignment Billing & Payment Ledger ({myPOs.length})
            </h3>
            <span className="text-xs text-slate-400">Nuapatna Hub Sourcing</span>
          </div>

          <div className="space-y-2.5">
            {myPOs.map((po) => (
              <div key={po.id} className="glass-card rounded-2xl p-3.5 border border-slate-200/90 shadow-2xs space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-xs font-black text-slate-900">{po.poNumber}</span>
                    <span className="text-[10px] text-slate-400 block">• Date: {po.orderDate}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    po.paymentStatus === 'Settled'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {po.paymentStatus}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs bg-slate-50 p-2 rounded-xl">
                  <span className="text-slate-600">Total Lot: <strong>₹{po.totalAmount.toLocaleString('en-IN')}</strong></span>
                  <span className="text-emerald-700 font-semibold">Advance: ₹{po.advancePaid.toLocaleString('en-IN')}</span>
                  <span className="font-black text-purple-950">Pending Due: ₹{po.balanceDue.toLocaleString('en-IN')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modal version when triggered from + button or Quick Action */}
        {isSupplierRecordingPayment && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4">
            <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl border border-purple-100 space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="font-black text-slate-900 text-base">Record Supplier Payment</h3>
                <button
                  type="button"
                  onClick={() => {
                    setIsSupplierRecordingPayment(false);
                    onCloseNewPaymentDirect?.();
                  }}
                  className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={handleSupplierRecordPayment} className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={supplierPayAmount}
                    onChange={(e) => setSupplierPayAmount(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-base font-black text-slate-900"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(['UPI', 'Bank', 'Cash'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setSupplierPayMode(m)}
                      className={`py-2 rounded-xl text-xs font-bold border ${
                        supplierPayMode === m
                          ? 'bg-purple-700 text-white border-purple-700'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={supplierPayRef}
                  onChange={(e) => setSupplierPayRef(e.target.value)}
                  placeholder="UTR / UPI Transaction ID"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono"
                />
                <button
                  type="submit"
                  className="w-full py-3 rounded-2xl bg-purple-700 text-white font-extrabold text-sm shadow-md"
                >
                  Save Payment
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-24">
      {/* ══════════════════════════════════════════════════════════════════
          1. HEADER BLOCK
      ══════════════════════════════════════════════════════════════════ */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setActiveTab('home')}
              className="w-8 h-8 rounded-xl bg-white border border-slate-200/80 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition active:scale-95 shadow-xs shrink-0"
              aria-label="Back to Home"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  {role === 'customer' ? tr('My Khata', language) : t.khata}
                </h1>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200/80 truncate max-w-[140px]">
                  {role === 'customer' ? `${loggedInCustomer.shopName}` : 'Payments & Udhaar'}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setIsRecordingPayment(true)}
            className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-sm shadow-emerald-600/20 active:scale-95 transition shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t.recordPay}</span>
          </button>
        </div>

        {/* Rule 6 Subtitle in Hinglish */}
        <p className="text-[11px] text-slate-500 leading-snug px-0.5">
          <span className="font-bold text-slate-700">Rule 6:</span> Max 10% shortage Udhaar • Clear before next order.
        </p>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          2. TODAY'S COLLECTION SUMMARY
      ══════════════════════════════════════════════════════════════════ */}
      <div className="glass-card rounded-2xl sm:rounded-3xl p-3 sm:p-4 border border-white/90 shadow-sm space-y-2 bg-white/80">
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
          {tr("TODAY'S COLLECTION SUMMARY", language)}
        </span>

        <div className="grid grid-cols-2 gap-2">
          {/* UPI Collections Card */}
          <div className="p-2.5 sm:p-3 rounded-xl bg-emerald-50/80 border border-emerald-100/90 space-y-0.5">
            <span className="text-[10px] font-bold text-slate-600 block">{tr('UPI Collections', language)}</span>
            <span className="text-lg sm:text-2xl font-black text-emerald-700 block tracking-tight">
              ₹{todayUpiCollections.toLocaleString('en-IN')}
            </span>
          </div>

          {/* Cash Collections Card */}
          <div className="p-2.5 sm:p-3 rounded-xl bg-sky-50/80 border border-sky-100/90 space-y-0.5">
            <span className="text-[10px] font-bold text-slate-600 block">{tr('Cash Collections', language)}</span>
            <span className="text-lg sm:text-2xl font-black text-sky-700 block tracking-tight">
              ₹{todayCashCollections.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        <div className="pt-0.5 flex items-center justify-between text-[11px] text-slate-500 font-medium px-0.5">
          <span>Total today: <strong className="text-slate-900 font-black">₹{todayTotalCollections.toLocaleString('en-IN')}</strong></span>
          <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded-md">
            Cash + UPI
          </span>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          3. BUSINESS UPI QR & ALL UPI APPS PAYMENT CARD
      ══════════════════════════════════════════════════════════════════ */}
      <div className="glass-card rounded-2xl sm:rounded-3xl p-3 sm:p-4 border border-white/90 shadow-sm bg-white/85 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="text-xs font-black text-slate-900 block truncate">{tr('UPI QR & UPI ID', language)}</span>
            <span className="text-[9px] text-slate-500 block truncate">PhonePe, GPay, Paytm, BHIM & All UPI</span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] font-bold text-slate-500">Amt (₹):</span>
            <input
              type="number"
              min={1}
              value={qrAmount}
              onChange={(e) => setQrAmount(Math.max(1, Number(e.target.value)))}
              className="w-20 px-2 py-0.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-black text-slate-900"
            />
          </div>
        </div>

        <PaymentGateway
          upiId={settings.upiId}
          payeeName={settings.businessName}
          amount={qrAmount}
          note={`Khata Payment (${role === 'customer' ? loggedInCustomer.shopName : settings.businessName})`}
          accent="sky"
          ctaLabel={`${tr('Record UPI', language)} (₹${qrAmount.toLocaleString('en-IN')})`}
          onConfirmPaid={(generatedRef) => {
            setPaymentAmount(qrAmount);
            setPaymentMode('UPI');
            setRefId(generatedRef);
            if (role === 'customer') setSelectedCustomerId(loggedInCustomer.id);
            setIsRecordingPayment(true);
          }}
          compact
        />
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          4. TOTAL OUTSTANDING UDHAAR CARD
      ══════════════════════════════════════════════════════════════════ */}
      <div className="glass-card rounded-2xl sm:rounded-3xl p-3 sm:p-4 border border-rose-200 shadow-sm bg-gradient-to-br from-rose-50/60 to-white relative overflow-hidden">
        <div className="flex items-center justify-between mb-0.5">
          <div className="flex items-center gap-1.5 text-rose-700 font-bold text-xs">
            <AlertOctagon className="w-3.5 h-3.5 stroke-[2.2]" />
            <span>Total Outstanding Udhaar</span>
          </div>
          <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
            10% Max
          </span>
        </div>

        <div className="my-1">
          <span className="text-xl sm:text-2xl font-black text-rose-600 tracking-tight block">
            ₹{totalUdhaarPending.toLocaleString('en-IN')}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="text-[11px] text-slate-600 font-medium">
            {pendingUdhaarShopsCount} shops have dues. Clear before new orders.
          </p>
          {role === 'owner' && (pendingUdhaarItems.length > 0 || overdueCustomersOnly.length > 0) && (
            <button
              type="button"
              onClick={() => {
                setReminderTargetId(undefined);
                setIsPaymentReminderOpen(true);
              }}
              className="px-2.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-xs active:scale-95 transition"
            >
              <BellRing className="w-3.5 h-3.5" />
              <span>{tr('Send Payment Reminder', language)}</span>
            </button>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          5. DAILY INCOME & UDHAAR BOOK
      ══════════════════════════════════════════════════════════════════ */}
      <div className="glass-card rounded-2xl sm:rounded-3xl p-3 sm:p-4 border border-indigo-100/90 shadow-sm bg-gradient-to-br from-indigo-50/50 via-white to-sky-50/40 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs font-black text-slate-900 truncate">Daily Income & Udhaar Book</h3>
              <p className="text-[9px] text-slate-500 truncate">Cash, UPI & Dues Summary</p>
            </div>
          </div>
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-100 text-indigo-800 shrink-0">
            Live
          </span>
        </div>

        {/* 3 Metric Cards for Income Book */}
        <div className="grid grid-cols-3 gap-1.5 text-center">
          <div className="p-2 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
            <span className="text-[9px] font-bold text-slate-500 block">Collections</span>
            <span className="text-xs sm:text-sm font-black text-emerald-700 block mt-0.5">
              ₹{todayTotalCollections.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="p-2 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
            <span className="text-[9px] font-bold text-slate-500 block">Udhaar</span>
            <span className="text-xs sm:text-sm font-black text-rose-600 block mt-0.5">
              ₹{totalUdhaarPending.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="p-2 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
            <span className="text-[9px] font-bold text-slate-500 block">Safety</span>
            <span className="text-xs sm:text-sm font-black text-sky-700 block mt-0.5">
              10% Limit
            </span>
          </div>
        </div>

        {/* Hinglish Guidance Strip */}
        <div className="p-2 rounded-xl bg-slate-100/90 text-[10px] text-slate-700 flex items-start gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
          <span>
            <strong>Policy:</strong> Delivery par max 10% shortage udhaar allowed; agle dispatch se pehle clear hona zaroori hai.
          </span>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          6. NAVIGATION SUB-TABS (Udhaar & Dues Book | Payment History | Advance Received)
      ══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/90">
        <button
          onClick={() => setActiveTabFilter('udhaar')}
          className={`py-1.5 px-1 rounded-lg text-[11px] font-bold text-center transition flex flex-col items-center justify-center ${
            activeTab === 'udhaar'
              ? 'bg-sky-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span className="truncate max-w-full">{tr('Udhaar & Dues', language)}</span>
          <span className="text-[9px] opacity-90">
            ({role === 'owner' ? pendingUdhaarItems.length + pendingSupplierPOs.length : pendingUdhaarItems.length})
          </span>
        </button>

        <button
          onClick={() => setActiveTabFilter('all')}
          className={`py-1.5 px-1 rounded-lg text-[11px] font-bold text-center transition flex flex-col items-center justify-center ${
            activeTab === 'all'
              ? 'bg-sky-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span className="truncate max-w-full">{tr('Pay History', language)}</span>
          <span className="text-[9px] opacity-90">({visiblePayments.length})</span>
        </button>

        <button
          onClick={() => setActiveTabFilter('advance')}
          className={`py-1.5 px-1 rounded-lg text-[11px] font-bold text-center transition flex flex-col items-center justify-center ${
            activeTab === 'advance'
              ? 'bg-sky-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span className="truncate max-w-full">{tr('Advance', language)}</span>
          <span className="text-[9px] opacity-90">({advancePayments.length})</span>
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          7. SEARCH BAR
      ══════════════════════════════════════════════════════════════════ */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by retailer, supplier, PO #, ref ID, or phone..."
          className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-white border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500 shadow-2xs"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center absolute right-3 top-1/2 -translate-y-1/2 text-xs"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          8. CARDS LISTING (Udhaar & Dues Book, Payment History, or Advance Received)
      ══════════════════════════════════════════════════════════════════ */}
      {/* CASE A: ADVANCE RECEIVED */}
      {activeTab === 'advance' && (
        <div className="space-y-2.5">
          {advancePayments.length === 0 ? (
            <div className="glass-card rounded-3xl p-6 text-center text-slate-400">
              <Receipt className="w-9 h-9 mx-auto mb-2 text-slate-300" />
              <p className="text-xs font-bold text-slate-600">No advance payments found</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Naya order aane par ₹1,000 advance record karein.</p>
            </div>
          ) : (
            advancePayments.map((p) => (
              <div
                key={p.id}
                className="glass-card rounded-3xl p-4 border border-white/90 shadow-xs bg-white/85 space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="font-black text-slate-900 text-sm">{p.shopName}</h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 border border-sky-200">
                        Advance
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600">
                        {p.mode}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                      Ref: {p.referenceId} • {p.date}
                    </p>

                    <p className="text-[11px] text-slate-600 italic mt-0.5">
                      {p.note || 'Advance credited to PhonePe QR'}
                    </p>
                  </div>
                </div>

                <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-base font-black text-slate-900">
                    ₹{p.amount.toLocaleString('en-IN')}
                  </span>

                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Verified</span>
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* CASE B: UDHAAR & DUES BOOK (SUPPLIER DUES FOR OWNER + DUKANI UDHAAR) */}
      {activeTab === 'udhaar' && (
        <div className="space-y-3.5">
          {/* Dual Metrics Summary Banner (Owner sees both; Dukani sees strictly own Udhaar) */}
          {role === 'owner' && (
            <>
              <div className="grid grid-cols-2 gap-2.5">
                {/* Supplier Dues Payable */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-purple-50 via-white to-indigo-50 border-2 border-purple-200/90 shadow-xs space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-purple-700" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-purple-900">
                      Supplier Dues (Payable)
                    </span>
                  </div>
                  <span className="text-2xl font-black text-purple-950 block tracking-tight">
                    ₹{totalSupplierPendingDues.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[10px] font-bold text-purple-700 block">
                    {pendingSupplierPOs.length} Consignment Bills Due
                  </span>
                </div>

                {/* Dukani Shortage Udhaar Receivable */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-rose-50 via-white to-amber-50 border-2 border-rose-200/90 shadow-xs space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Store className="w-3.5 h-3.5 text-rose-700" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-rose-900">
                      Retailer Udhaar (10% Rule)
                    </span>
                  </div>
                  <span className="text-2xl font-black text-rose-600 block tracking-tight">
                    ₹{totalUdhaarPending.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[10px] font-bold text-rose-700 block">
                    {pendingUdhaarShopsCount} Shops Overdue
                  </span>
                </div>
              </div>

              {/* Dues Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                <button
                  onClick={() => setDuesFilter('all')}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap ${
                    duesFilter === 'all'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  All Dues ({pendingUdhaarItems.length + pendingSupplierPOs.length})
                </button>
                <button
                  onClick={() => setDuesFilter('suppliers')}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap flex items-center gap-1 ${
                    duesFilter === 'suppliers'
                      ? 'bg-purple-900 text-white shadow-xs'
                      : 'bg-purple-50 text-purple-900 border border-purple-200 hover:bg-purple-100'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Supplier Dues ({pendingSupplierPOs.length})</span>
                </button>
                <button
                  onClick={() => setDuesFilter('customers')}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap flex items-center gap-1 ${
                    duesFilter === 'customers'
                      ? 'bg-rose-900 text-white shadow-xs'
                      : 'bg-rose-50 text-rose-900 border border-rose-200 hover:bg-rose-100'
                  }`}
                >
                  <Store className="w-3.5 h-3.5" />
                  <span>Retailer Udhaar ({pendingUdhaarItems.length})</span>
                </button>
              </div>
            </>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              SUB-SECTION 1: SUPPLIER DUES & STOCK BILLS (OWNER ONLY)
          ══════════════════════════════════════════════════════════════════ */}
          {role === 'owner' && (duesFilter === 'all' || duesFilter === 'suppliers') && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-purple-700" />
                  <h4 className="font-extrabold text-xs text-purple-950 uppercase tracking-wider">
                    Supplier Udhaar & Consignment Bills ({visibleSupplierPOs.length})
                  </h4>
                </div>
                <span className="text-[10px] text-slate-500 font-semibold">Nuapatna Sourcing</span>
              </div>

              {visibleSupplierPOs.length === 0 ? (
                <div className="p-6 text-center bg-white rounded-3xl border border-purple-100 text-slate-400 space-y-1">
                  <Building2 className="w-8 h-8 text-purple-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-700">No Supplier bills found</p>
                  <p className="text-[11px] text-slate-400">Sabhi supplier payments clear hain!</p>
                </div>
              ) : (
                visibleSupplierPOs.map((po) => {
                  const isPending = po.balanceDue > 0;
                  const supplierObj = suppliers.find((s) => s.id === po.supplierId);
                  const supplierPhone = supplierObj?.phone || '9861000000';
                  const supplierBank = supplierObj?.bankDetails?.bankName || 'HDFC Bank';
                  const supplierAcc = supplierObj?.bankDetails?.accountNumber || '921020038847192';
                  const supplierIfsc = supplierObj?.bankDetails?.ifsc || 'HDFC0000128';
                  const supplierUpi = supplierObj?.upiId || 'supplier@hdfcbank';

                  const supplierStatementMsg = `Namaste ${po.supplierName}! Payment update from Shuvam Behera (Rupam Wholesale, Nuapatna):\nPO #${po.poNumber} Status: ${po.status}\nLot Value: ₹${po.totalAmount.toLocaleString('en-IN')}\nBalance Due: ₹${po.balanceDue.toLocaleString('en-IN')}\nPayment: ${isPending ? 'Processing' : 'Paid & Settled (✓)'}\nDhanyawad!`;

                  return (
                    <div
                      key={po.id}
                      className={`glass-card rounded-3xl p-4 border transition space-y-3 bg-white ${
                        isPending ? 'border-purple-300 shadow-sm' : 'border-slate-200 opacity-80'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="font-black text-slate-900 text-sm">{po.supplierName}</h4>
                            <span
                              className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${
                                isPending
                                  ? 'bg-purple-100 text-purple-900 border-purple-300'
                                  : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                              }`}
                            >
                              {isPending ? 'Due Payable' : 'Settled ✅'}
                            </span>
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700">
                              {po.poNumber}
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-500 mt-1">
                            Date: {po.orderDate} • Transport: {po.transportCompany || 'Roadways Cargo'} (Bilty: {po.biltyNumber || 'Pending'})
                          </p>

                          <div className="mt-1 text-xs text-slate-700 bg-slate-50 p-2 rounded-xl border border-slate-100">
                            {po.items.map((it, idx) => (
                              <span key={idx} className="block font-semibold">
                                • {it.productName}: {it.packets} pkts ({it.packets * it.packSize} pcs) = ₹{it.totalAmount.toLocaleString('en-IN')}
                              </span>
                            ))}
                          </div>

                          {/* Bank details preview */}
                          <p className="text-[10px] text-slate-500 mt-1.5 flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-700">Bank:</span> {supplierBank} (A/C: {supplierAcc}, IFSC: {supplierIfsc})
                            <span className="text-slate-300">•</span>
                            <span className="font-bold text-slate-700">UPI:</span> {supplierUpi}
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-[10px] font-bold text-purple-800 uppercase block">Pending Due</span>
                          <span
                            className={`text-lg font-black block ${
                              isPending ? 'text-purple-950' : 'text-slate-400 line-through'
                            }`}
                          >
                            ₹{po.balanceDue.toLocaleString('en-IN')}
                          </span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            Lot: ₹{po.totalAmount.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>

                      {/* Action Bar with Pay Button & WhatsApp */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <a
                            href={`https://wa.me/91${supplierPhone.replace(/\D/g, '')}?text=${encodeURIComponent(supplierStatementMsg)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="py-1.5 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center gap-1 border border-emerald-200 transition"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>WhatsApp Statement</span>
                          </a>

                          <a
                            href={`tel:${supplierPhone}`}
                            className="py-1.5 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1 transition"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                        </div>

                        {/* ══════════════════════════════════════════════════════════════════
                            PAY BUTTON ("pay bottom") TO PAY/SETTLE SUPPLIER DUE
                        ══════════════════════════════════════════════════════════════════ */}
                        {isPending ? (
                          <button
                            type="button"
                            onClick={() => {
                              setPayingSupplierPO(po);
                              setPaySupplierRef(`TXN-${Date.now().toString().slice(-6)}`);
                              setPaySupplierNote(`Settlement for PO #${po.poNumber}`);
                            }}
                            className="py-1.5 px-4 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>Pay Due (₹{po.balanceDue.toLocaleString('en-IN')})</span>
                          </button>
                        ) : (
                          <div className="px-3.5 py-1.5 rounded-xl bg-emerald-100 text-emerald-900 border border-emerald-300 font-black text-xs flex items-center gap-1.5 shadow-2xs">
                            <Check className="w-4 h-4 text-emerald-700 stroke-[3]" />
                            <span>Bill Paid & Settled (✓)</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              SUB-SECTION 2: DUKANI BHAI 10% SHORTAGE UDHAAR (RECEIVABLE)
          ══════════════════════════════════════════════════════════════════ */}
          {(role !== 'owner' || duesFilter === 'all' || duesFilter === 'customers') && (
            <div className="space-y-2.5 pt-2">
              <div className="flex items-center justify-between gap-2 px-1 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <Store className="w-4 h-4 text-rose-700" />
                  <h4 className="font-extrabold text-xs text-rose-950 uppercase tracking-wider">
                    Retailer 10% Shortage Udhaar ({visibleUdhaar.length})
                  </h4>
                </div>
                {role === 'owner' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setReminderTargetId(undefined);
                      setIsPaymentReminderOpen(true);
                    }}
                    className="px-2.5 py-1 rounded-full bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-200 font-bold text-[10px] flex items-center gap-1 transition active:scale-95"
                  >
                    <BellRing className="w-3 h-3" />
                    <span>
                      {tr('Payment Reminder', language)} • {paymentAutoConfig.paymentAutoEnabled ? 'Auto ON' : 'Manual'}
                    </span>
                  </button>
                ) : (
                  <span className="text-[10px] text-slate-500 font-semibold">150km Corridor</span>
                )}
              </div>

              {visibleUdhaar.length === 0 ? (
                <div className="glass-card rounded-3xl p-6 text-center text-slate-400">
                  <CheckCircle2 className="w-9 h-9 mx-auto mb-2 text-emerald-400" />
                  <p className="text-xs font-bold text-slate-600">Sabhi retailer udhaar clear hain!</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Kisi retailer ka koi pending dues nahi hai.</p>
                </div>
              ) : (
                visibleUdhaar.map((u) => {
                  const isPending = u.status === 'Pending';

                  return (
                    <div
                      key={u.id}
                      className={`glass-card rounded-3xl p-4 border transition bg-white/85 space-y-2.5 ${
                        isPending ? 'border-amber-200 shadow-xs' : 'border-slate-100 opacity-70'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="font-black text-slate-900 text-sm">{u.shopName}</h4>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                                isPending
                                  ? 'bg-amber-100 text-amber-800 border-amber-200'
                                  : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                              }`}
                            >
                              {isPending ? 'Pending Due' : 'Cleared ✅'}
                            </span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600">
                              Shortage: {u.shortagePct}%
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Order #{u.orderNumber} • Date: {u.date} • Bill: ₹{u.billAmount}
                          </p>

                          <p className="text-[11px] text-slate-600 italic mt-0.5">
                            {u.notes || 'Delivery shortage under 10% allowed. Agle order se pehle payment lena hai.'}
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <span
                            className={`text-lg font-black block ${
                              isPending ? 'text-rose-600' : 'text-slate-400 line-through'
                            }`}
                          >
                            ₹{u.shortageAmount.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>

                      {isPending && role === 'owner' && (
                        <div className="pt-2 border-t border-slate-100 space-y-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <a
                              href={handleSendUdhaarReminder(u)}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() =>
                                markInlineReminderSent(u.id, u.shopName, 'WhatsApp', u.shortageAmount)
                              }
                              className="flex-1 min-w-[105px] py-1.5 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-2xs transition active:scale-95"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>WhatsApp</span>
                            </a>

                            <a
                              href={handleSendUdhaarReminderSms(u)}
                              onClick={() =>
                                markInlineReminderSent(u.id, u.shopName, 'SMS', u.shortageAmount)
                              }
                              className="flex-1 min-w-[85px] py-1.5 px-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-2xs transition active:scale-95"
                            >
                              <Smartphone className="w-3.5 h-3.5" />
                              <span>{tr('SMS', language)}</span>
                            </a>

                            <a
                              href={`tel:${u.phone}`}
                              className="py-1.5 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1 transition"
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </a>

                            <button
                              type="button"
                              onClick={() => {
                                clearUdhaarEntry(u.id);
                                showToast(`Udhaar for ${u.shopName} cleared!`);
                              }}
                              className="py-1.5 px-3 rounded-xl bg-slate-900 text-white font-bold text-xs shadow-xs active:scale-95 transition"
                            >
                              Clear Dues
                            </button>
                          </div>

                          {remindedIds[u.id] && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              <Check className="w-3 h-3" />
                              {tr('Reminded', language)} ({remindedIds[u.id]})
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}

              {/* Additional Overdue Retailer Balances (Balance / Udhaar from Customer Master) */}
              {role === 'owner' && overdueCustomersOnly.length > 0 && (
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                      Overdue Retailer Account Balances ({overdueCustomersOnly.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setReminderTargetId(undefined);
                        setIsPaymentReminderOpen(true);
                      }}
                      className="text-[11px] font-bold text-rose-600 hover:text-rose-800"
                    >
                      Auto-Remind All →
                    </button>
                  </div>

                  {overdueCustomersOnly.map((cust) => {
                    const totalDue = (cust.pendingUdhaar || 0) + (cust.pendingBalance || 0);
                    const dueMsg = `Namaste ${cust.shopName} (${cust.ownerName})! Payment Reminder from ${settings.businessName}: Aapka total overdue balance ₹${totalDue.toLocaleString('en-IN')} baaki hai. Kripya agle dispatch se pehle UPI (${settings.upiId}) par clear karein. Phone: ${settings.ownerPhone}.`;
                    return (
                      <div
                        key={cust.id}
                        className="glass-card rounded-2xl p-3.5 border border-rose-100 bg-white space-y-2 shadow-2xs"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h4 className="font-black text-slate-900 text-sm truncate">{cust.shopName}</h4>
                            <p className="text-[11px] text-slate-500 truncate">
                              {cust.ownerName} • {cust.phone}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-[9px] font-bold text-slate-400 uppercase block">Overdue</span>
                            <span className="text-base font-black text-rose-600">
                              ₹{totalDue.toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 pt-1.5 border-t border-slate-100 flex-wrap">
                          <a
                            href={buildWhatsAppHref(cust.whatsapp || cust.phone, dueMsg)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() =>
                              markInlineReminderSent(cust.id, cust.shopName, 'WhatsApp', totalDue)
                            }
                            className="flex-1 py-1.5 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>WhatsApp</span>
                          </a>

                          <a
                            href={buildSmsHref(cust.phone, dueMsg)}
                            onClick={() =>
                              markInlineReminderSent(cust.id, cust.shopName, 'SMS', totalDue)
                            }
                            className="flex-1 py-1.5 px-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center justify-center gap-1"
                          >
                            <Smartphone className="w-3.5 h-3.5" />
                            <span>SMS</span>
                          </a>

                          <button
                            type="button"
                            onClick={() => {
                              setReminderTargetId(cust.id);
                              setIsPaymentReminderOpen(true);
                            }}
                            className="py-1.5 px-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-[11px] flex items-center gap-1"
                          >
                            <BellRing className="w-3 h-3" />
                            <span>Auto</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* CASE C: ALL PAYMENTS (Complete payment history: Inward + Outward Supplier Payments) */}
      {activeTab === 'all' && (
        <div className="space-y-2.5">
          {visiblePayments.length === 0 ? (
            <div className="glass-card rounded-3xl p-6 text-center text-slate-400">
              <CreditCard className="w-9 h-9 mx-auto mb-2 text-slate-300" />
              <p className="text-xs font-bold text-slate-600">No payment records found</p>
            </div>
          ) : (
            visiblePayments.map((p) => {
              const isSupplierPayment = p.type === 'Supplier Due' || p.note?.toLowerCase().includes('supplier') || p.referenceId.startsWith('SUP-');

              return (
                <div
                  key={p.id}
                  className={`glass-card rounded-3xl p-4 border shadow-xs space-y-2 ${
                    isSupplierPayment
                      ? 'border-purple-200/90 bg-gradient-to-br from-purple-50/40 via-white to-indigo-50/30'
                      : 'border-white/90 bg-white/85'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="font-black text-slate-900 text-sm">{p.shopName}</h4>
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                            isSupplierPayment
                              ? 'bg-purple-100 text-purple-900 border border-purple-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {p.mode}
                        </span>
                        {p.type && (
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${
                              isSupplierPayment
                                ? 'bg-purple-50 text-purple-800 border-purple-200'
                                : 'bg-sky-50 text-sky-700 border border-sky-100'
                            }`}
                          >
                            {p.type}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                        {p.customerName} • Ref: {p.referenceId}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Date: {p.date}</p>
                      {p.note && <p className="text-[11px] text-slate-600 italic mt-0.5">{p.note}</p>}
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`text-base font-black block ${
                          isSupplierPayment ? 'text-purple-900' : 'text-emerald-600'
                        }`}
                      >
                        {isSupplierPayment ? `-₹${p.amount.toLocaleString('en-IN')}` : `+₹${p.amount.toLocaleString('en-IN')}`}
                      </span>
                      {p.confirmedByOwner ? (
                        <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md mt-1 border border-emerald-100">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Verified
                        </span>
                      ) : (
                        <button
                          onClick={() => confirmPayment(p.id)}
                          className="px-2 py-1 rounded-lg bg-amber-500 text-white font-bold text-[10px] mt-1"
                        >
                          Confirm Now
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          PAY SUPPLIER DUE MODAL
      ══════════════════════════════════════════════════════════════════ */}
      {payingSupplierPO && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl border border-purple-100 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-2xl bg-purple-100 text-purple-800 flex items-center justify-center font-bold">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">Pay Supplier Due</h3>
                  <p className="text-xs text-slate-500">{payingSupplierPO.supplierName}</p>
                </div>
              </div>
              <button
                onClick={() => setPayingSupplierPO(null)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Bill Summary Box */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-purple-50 via-white to-indigo-50 border border-purple-200/90 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-slate-700">{payingSupplierPO.poNumber}</span>
                <span className="text-xs font-extrabold text-purple-900 bg-purple-100 px-2.5 py-0.5 rounded-full">
                  Balance Due
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-slate-500">Amount to Settle:</span>
                <span className="text-2xl font-black text-purple-950">
                  ₹{payingSupplierPO.balanceDue.toLocaleString('en-IN')}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 border-t border-purple-100 pt-1.5">
                Consignment: {payingSupplierPO.items.map((i) => `${i.productName} (${i.packets} pkts)`).join(', ')}
              </p>
            </div>

            {/* Supplier Bank & UPI Details */}
            {(() => {
              const sup = suppliers.find((s) => s.id === payingSupplierPO.supplierId);
              return (
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">
                    Supplier Payment Account
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Bank:</span>
                    <span className="font-bold text-slate-900">{sup?.bankDetails?.bankName || 'HDFC Bank'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Account No:</span>
                    <span className="font-mono font-bold text-slate-900">{sup?.bankDetails?.accountNumber || '921020038847192'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">IFSC:</span>
                    <span className="font-mono font-bold text-slate-900">{sup?.bankDetails?.ifsc || 'HDFC0000128'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">UPI ID:</span>
                    <span className="font-mono font-bold text-indigo-700">{sup?.upiId || 'kolkataglamour@hdfcbank'}</span>
                  </div>
                </div>
              );
            })()}

            {/* Select Payment Mode */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">Payment Mode</label>
              <div className="grid grid-cols-3 gap-2">
                {(['UPI', 'Bank', 'Cash'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPaySupplierMode(m)}
                    className={`py-2 px-3 rounded-xl text-xs font-extrabold border transition ${
                      paySupplierMode === m
                        ? 'bg-purple-900 text-white border-purple-950 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {m === 'Bank' ? 'Bank IMPS' : m}
                  </button>
                ))}
              </div>
            </div>

            {/* Reference Number */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">Bank UTR / Transaction Reference</label>
              <input
                type="text"
                value={paySupplierRef}
                onChange={(e) => setPaySupplierRef(e.target.value)}
                placeholder="e.g. UPI/398218721 or IMPS129841"
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
              />
            </div>

            {/* Confirm Payment Button */}
            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setPayingSupplierPO(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  settleSupplierBill(payingSupplierPO.id, paySupplierMode);
                  setPayingSupplierPO(null);
                }}
                className="flex-2 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-extrabold text-xs shadow-md active:scale-95 transition flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Confirm Payment (₹{payingSupplierPO.balanceDue.toLocaleString('en-IN')})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          9. RECORD NEW PAYMENT MODAL
      ══════════════════════════════════════════════════════════════════ */}
      {isRecordingPayment && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-black text-slate-900 text-base">Record Payment</h3>
                <p className="text-xs text-slate-500">Advance, delivery balance ya udhaar recovery jama karein</p>
              </div>
              <button
                onClick={() => {
                  setIsRecordingPayment(false);
                  onCloseNewPaymentDirect?.();
                }}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePayment} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">Retailer / Shop *</label>
                {role === 'customer' ? (
                  <div className="w-full px-3 py-2.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-950 font-bold">
                    {loggedInCustomer.shopName} ({loggedInCustomer.ownerName}) • Pending Due: ₹{loggedInCustomer.pendingBalance} / Udhaar: ₹{loggedInCustomer.pendingUdhaar}
                  </div>
                ) : (
                  <select
                    required
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800 font-medium"
                  >
                    <option value="">-- Choose Shop --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.shopName} ({c.ownerName}) - Due: ₹{c.pendingBalance}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">Amount (₹) *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-base font-black text-slate-900"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">Payment Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Advance', 'Balance', 'Udhaar'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setPaymentType(t)}
                      className={`py-2 rounded-xl text-xs font-bold border transition ${
                        paymentType === t
                          ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {t === 'Advance' ? 'Advance (₹1k)' : t === 'Balance' ? 'Delivery Balance' : 'Udhaar Clear'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">Payment Mode</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['UPI', 'Cash', 'Bank', 'Bus-cash'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPaymentMode(m)}
                      className={`py-2 rounded-xl text-xs font-bold border transition ${
                        paymentMode === m
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* UPI & QR Quick Card when UPI is chosen (All UPI Apps supported) */}
              {paymentMode === 'UPI' && (
                <PaymentGateway
                  upiId={settings.upiId}
                  payeeName={settings.businessName}
                  amount={Number(paymentAmount) || 1000}
                  note={`${paymentType} Payment`}
                  accent="sky"
                  showConfirmButton={false}
                  compact
                />
              )}

              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">Transaction / Ref ID (Optional)</label>
                <input
                  type="text"
                  value={refId}
                  onChange={(e) => setRefId(e.target.value)}
                  placeholder="e.g. UPI/2611029831 ya Cash Ref"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">Note (Optional)</label>
                <input
                  type="text"
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  placeholder="e.g. Advance credited to PhonePe QR"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-bold text-sm shadow-md active:scale-98 transition text-center"
                >
                  Record Payment
                </button>
                <button
                  type="button"
                  onClick={() => setIsRecordingPayment(false)}
                  className="py-3 px-4 rounded-2xl bg-slate-100 text-slate-700 font-bold text-xs"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          10. CONFIRMED PAYMENT & WHATSAPP RECEIPT MODAL
      ══════════════════════════════════════════════════════════════════ */}
      {confirmedPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border border-slate-100 space-y-4">
            <div className="text-center space-y-1">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="font-black text-slate-900 text-lg">Payment Confirmed!</h3>
              <p className="text-xs text-slate-500">
                {confirmedPaymentModal.type} payment successfully verified in Khata ledger
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Shop Name:</span>
                <span className="font-bold text-slate-900">{confirmedPaymentModal.customer.shopName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Owner:</span>
                <span className="font-medium text-slate-800">{confirmedPaymentModal.customer.ownerName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Amount Received:</span>
                <span className="font-black text-emerald-600 text-sm">
                  ₹{confirmedPaymentModal.amount.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Mode:</span>
                <span className="font-bold text-slate-700 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                  {confirmedPaymentModal.mode}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Reference ID:</span>
                <span className="font-mono text-slate-700">{confirmedPaymentModal.refId}</span>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <a
                href={`https://wa.me/91${confirmedPaymentModal.customer.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                  confirmedPaymentModal.whatsappMsg
                )}`}
                target="_blank"
                rel="noreferrer"
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/30 active:scale-98 transition"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Send WhatsApp Receipt & Confirmation</span>
              </a>

              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(confirmedPaymentModal.whatsappMsg);
                  showToast('Receipt message copied to clipboard!');
                }}
                className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition"
              >
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>Copy Receipt Text</span>
              </button>

              <button
                type="button"
                onClick={() => setConfirmedPaymentModal(null)}
                className="w-full py-2 text-slate-500 font-bold text-xs hover:text-slate-800 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      <ReminderDispatcherModal
        isOpen={isPaymentReminderOpen}
        onClose={() => {
          setIsPaymentReminderOpen(false);
          setReminderTargetId(undefined);
        }}
        mode="retailer_payment"
        initialTargetId={reminderTargetId}
      />
    </div>
  );
};
