import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { tr } from '../data/translations';
import { Printer, Share2, Store, Factory, Layers } from 'lucide-react';
import { calculateTaxSplit } from '../utils/businessRules';

export const InvoicesView: React.FC = () => {
  const { orders, supplierOrders, suppliers, customers, settings, role, user, language } = useApp();

  const [billSection, setBillSection] = useState<'all' | 'retailer' | 'supplier'>('all');
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [selectedPoId, setSelectedPoId] = useState<string>('');
  const [includeGst, setIncludeGst] = useState<boolean>(settings.gstEnabled);

  const loggedInCustomer = useMemo(
    () => customers.find((c) => c.id === user?.customerId) || customers[0],
    [customers, user?.customerId]
  );

  const loggedInSupplier = useMemo(
    () => suppliers.find((s) => s.id === user?.supplierId) || suppliers[0],
    [suppliers, user?.supplierId]
  );

  const userOrders = useMemo(() => {
    if (role === 'customer') {
      const custId = loggedInCustomer?.id || user?.customerId || 'cust-demo-1';
      return orders.filter(
        (o) => o.customerId === custId || (loggedInCustomer?.phone && o.phone === loggedInCustomer.phone)
      );
    }
    return orders;
  }, [orders, role, loggedInCustomer, user?.customerId]);

  const userSupplierPOs = useMemo(() => {
    if (role === 'supplier') {
      const suppId = loggedInSupplier?.id || user?.supplierId;
      return suppId ? supplierOrders.filter((po) => po.supplierId === suppId) : supplierOrders;
    }
    return supplierOrders;
  }, [supplierOrders, role, loggedInSupplier, user?.supplierId]);

  const selectedOrder =
    userOrders.find((o) => o.id === selectedOrderId) || userOrders[0] || null;
  const selectedPo =
    userSupplierPOs.find((po) => po.id === selectedPoId) || userSupplierPOs[0] || null;

  const selectedPoSupplier = selectedPo
    ? suppliers.find((s) => s.id === selectedPo.supplierId)
    : undefined;

  const handlePrint = () => {
    window.print();
  };

  const renderRetailerInvoiceSection = () => {
    if (!selectedOrder) {
      return (
        <div className="glass-card rounded-3xl p-6 text-center text-xs sm:text-sm text-slate-500 border border-slate-200">
          No retailer bills found for this account.
        </div>
      );
    }

    const tax = calculateTaxSplit(
      selectedOrder.subtotal,
      18,
      selectedOrder.address.includes('Bengal') ? 'West Bengal' : 'Odisha',
      settings.businessState
    );

    const whatsappMessage = `*INVOICE: ${settings.businessName} Wholesale*\nInvoice #: INV-${selectedOrder.orderNumber}\nBill To: ${selectedOrder.shopName} (${selectedOrder.customerName})\nTotal Amount: ₹${selectedOrder.totalAmount}\nAdvance Paid: ₹${selectedOrder.advanceAmount}\nBalance Due: ₹${selectedOrder.balanceAmount}\nPay via UPI: ${settings.upiId}\nNote: Continuous unboxing video required for any transit damage claims.\nThank you! - ${settings.ownerName}`;
    const whatsappHref = `https://wa.me/91${selectedOrder.phone.replace(/\D/g, '')}?text=${encodeURIComponent(whatsappMessage)}`;

    return (
      <div className="space-y-3">
        {role === 'owner' && (
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
                <Store className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky-700 block leading-none">
                  Section 1
                </span>
                <h3 className="text-sm font-black text-slate-900">
                  {tr('Retailer Bills', language)} ({userOrders.length})
                </h3>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIncludeGst((v) => !v)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition ${
                includeGst
                  ? 'bg-sky-50 text-sky-800 border-sky-200'
                  : 'bg-slate-50 text-slate-500 border-slate-200'
              }`}
            >
              GST: {includeGst ? 'ON' : 'OFF'}
            </button>
          </div>
        )}

        {/* Top Retailer Invoice Selector & Actions */}
        <div className="glass-card rounded-2xl sm:rounded-3xl p-3 sm:p-4 border border-white/90 shadow-sm flex items-center justify-between gap-2">
          <select
            value={selectedOrder.id}
            onChange={(e) => setSelectedOrderId(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 max-w-[175px] sm:max-w-[260px] truncate"
            aria-label="Select Retailer Invoice"
          >
            {userOrders.map((o) => (
              <option key={o.id} value={o.id}>
                #{o.orderNumber} - {o.shopName}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handlePrint}
              className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition"
              title="Print Invoice"
            >
              <Printer className="w-4 h-4" />
            </button>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition"
            >
              <Share2 className="w-3.5 h-3.5" /> {tr('WhatsApp', language)}
            </a>
          </div>
        </div>

        {/* Retailer Tax Invoice Document Card */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 shadow-md border border-slate-200/90 text-slate-800 print:shadow-none print:border-none">
          <div className="flex flex-wrap justify-between items-start gap-2 border-b border-slate-200 pb-3 mb-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-500 to-blue-600 text-white font-black text-base flex items-center justify-center">
                  R
                </div>
                <h2 className="text-base sm:text-xl font-black text-slate-900 tracking-tight">{settings.businessName}</h2>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-1 font-medium">{settings.businessAddress}</p>
              <p className="text-[11px] sm:text-xs text-slate-500">Proprietor: {settings.ownerName} • {settings.ownerPhone}</p>
              {includeGst && (
                <p className="text-[10px] sm:text-[11px] font-mono text-slate-600 mt-0.5">GSTIN: {settings.businessGstin}</p>
              )}
            </div>

            <div className="text-right">
              <span className="text-[10px] sm:text-xs font-bold text-sky-700 uppercase tracking-widest block">TAX INVOICE</span>
              <span className="text-sm sm:text-base font-black font-mono text-slate-900 block mt-0.5">
                INV-{selectedOrder.orderNumber}
              </span>
              <span className="text-[11px] text-slate-400 block mt-0.5">Date: {selectedOrder.createdAt.split('T')[0]}</span>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 border border-slate-200/80 mb-3 text-xs">
            <span className="font-bold text-[10px] text-slate-400 uppercase tracking-wider block mb-0.5">
              Billed To ({tr('Retailer', language)})
            </span>
            <h3 className="font-bold text-slate-900 text-xs sm:text-sm">{selectedOrder.shopName}</h3>
            <p className="text-[11px] text-slate-600 mt-0.5">{selectedOrder.customerName} • Phone: {selectedOrder.phone}</p>
            <p className="text-[11px] text-slate-500">{selectedOrder.address}, {selectedOrder.landmark}</p>
          </div>

          <div className="overflow-x-auto no-scrollbar mb-3 rounded-xl border border-slate-100">
            <table className="w-full text-left text-[10px] sm:text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600 font-bold bg-slate-50 whitespace-nowrap">
                  <th className="py-1.5 px-1.5 sm:py-2 sm:px-2">#</th>
                  <th className="py-1.5 px-1.5 sm:py-2 sm:px-2">{tr('Item Description', language)}</th>
                  <th className="py-1.5 px-1.5 sm:py-2 sm:px-2 text-center">{tr('Pack', language)}</th>
                  <th className="py-1.5 px-1.5 sm:py-2 sm:px-2 text-center">{tr('Pkts', language)}</th>
                  <th className="py-1.5 px-1.5 sm:py-2 sm:px-2 text-center">{tr('Pcs', language)}</th>
                  <th className="py-1.5 px-1.5 sm:py-2 sm:px-2 text-right">{tr('Rate', language)}</th>
                  <th className="py-1.5 px-1.5 sm:py-2 sm:px-2 text-right">{tr('Amount', language)}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {selectedOrder.items.map((it, idx) => (
                  <tr key={idx}>
                    <td className="py-1.5 px-1.5 sm:py-2 sm:px-2 text-slate-400">{idx + 1}</td>
                    <td className="py-1.5 px-1.5 sm:py-2 sm:px-2 font-semibold text-slate-900 min-w-[110px]">{it.productName}</td>
                    <td className="py-1.5 px-1.5 sm:py-2 sm:px-2 text-center text-slate-500 whitespace-nowrap">{it.packSize} pcs</td>
                    <td className="py-1.5 px-1.5 sm:py-2 sm:px-2 text-center font-bold text-slate-800">{it.packetQty}</td>
                    <td className="py-1.5 px-1.5 sm:py-2 sm:px-2 text-center text-slate-500">{it.totalPieces}</td>
                    <td className="py-1.5 px-1.5 sm:py-2 sm:px-2 text-right text-slate-600 whitespace-nowrap">₹{it.unitPricePerPacket}</td>
                    <td className="py-1.5 px-1.5 sm:py-2 sm:px-2 text-right font-bold text-slate-900 whitespace-nowrap">₹{it.totalPrice.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t border-slate-200 pt-3 flex flex-col sm:flex-row justify-between items-stretch sm:items-start gap-3 text-xs">
            <div className="flex sm:block items-center gap-3">
              <img src={settings.upiQrUrl} alt="UPI QR" className="w-18 h-18 sm:w-22 sm:h-22 border border-slate-200 rounded-xl p-1 shrink-0" />
              <div>
                <span className="font-bold text-slate-700 block mb-0.5 text-[11px]">Pay via UPI QR:</span>
                <span className="text-[10px] text-slate-500 font-mono block break-all">{settings.upiId}</span>
              </div>
            </div>

            <div className="w-full sm:w-56 space-y-1 text-right bg-slate-50/70 sm:bg-transparent p-2.5 sm:p-0 rounded-xl">
              <div className="flex justify-between text-slate-600 text-[11px]">
                <span>{tr('Subtotal:', language)}</span>
                <span className="font-semibold text-slate-900">₹{selectedOrder.subtotal.toLocaleString('en-IN')}</span>
              </div>
              {selectedOrder.deliveryCharge > 0 && (
                <div className="flex justify-between text-slate-600 text-[11px]">
                  <span>{tr('Delivery Charge:', language)}</span>
                  <span className="font-semibold text-slate-900">+₹{selectedOrder.deliveryCharge}</span>
                </div>
              )}
              {includeGst && (
                <>
                  <div className="flex justify-between text-slate-500 text-[10px]">
                    <span>CGST (9%):</span>
                    <span>₹{tax.cgst}</span>
                  </div>
                  <div className="flex justify-between text-slate-500 text-[10px]">
                    <span>SGST (9%):</span>
                    <span>₹{tax.sgst}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between border-t border-slate-200 pt-1 text-xs sm:text-sm font-black text-slate-900">
                <span>{tr('Grand Total:', language)}</span>
                <span>₹{selectedOrder.totalAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-semibold text-[11px]">
                <span>{tr('Advance Paid:', language)}</span>
                <span>-₹{selectedOrder.advanceAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1 text-xs sm:text-sm font-black text-amber-700">
                <span>{tr('Balance Due:', language)}</span>
                <span>₹{selectedOrder.balanceAmount.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[10px] text-slate-500 space-y-1">
            <p>
              <b>Notice:</b> Continuous uncut unboxing video from sealed parcel opening is mandatory for any transit damage claim.
            </p>
            <p>
              Goods once sold in wholesale full packets are not returnable for unsold stock. Free delivery within 150 km of Nuapatna.
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderSupplierInvoiceSection = () => {
    if (!selectedPo) {
      return (
        <div className="glass-card rounded-3xl p-6 text-center text-xs sm:text-sm text-slate-500 border border-slate-200">
          No supplier purchase bills found for this account.
        </div>
      );
    }

    const supplierPhone = selectedPoSupplier?.whatsapp || selectedPoSupplier?.phone || settings.ownerPhone;
    const poWhatsappMessage = `*SUPPLIER PURCHASE BILL: ${settings.businessName}*\nPO #: ${selectedPo.poNumber}\nSupplier: ${selectedPo.supplierName}\nLot Total: ₹${selectedPo.totalAmount}\nAdvance Paid: ₹${selectedPo.advancePaid}\nBalance Due: ₹${selectedPo.balanceDue}\nPayment Status: ${selectedPo.paymentStatus}\nBilty: ${selectedPo.biltyNumber || 'N/A'} (${selectedPo.transportCompany || 'Transport'})\n- ${settings.ownerName}, Nuapatna`;
    const poWhatsappHref = `https://wa.me/91${supplierPhone.replace(/\D/g, '')}?text=${encodeURIComponent(poWhatsappMessage)}`;

    return (
      <div className="space-y-3">
        {role === 'owner' && (
          <div className="flex items-center justify-between px-1 pt-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                <Factory className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-700 block leading-none">
                  Section 2
                </span>
                <h3 className="text-sm font-black text-slate-900">
                  {tr('Supplier Bills', language)} ({userSupplierPOs.length})
                </h3>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-800 border border-purple-200">
              Purchase PO
            </span>
          </div>
        )}

        {/* Top Supplier PO Selector & Actions */}
        <div className="glass-card rounded-2xl sm:rounded-3xl p-3 sm:p-4 border border-purple-200/80 shadow-sm flex items-center justify-between gap-2">
          <select
            value={selectedPo.id}
            onChange={(e) => setSelectedPoId(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl bg-purple-50/70 border border-purple-200 text-xs font-bold text-slate-800 max-w-[175px] sm:max-w-[260px] truncate"
            aria-label="Select Supplier Purchase Bill"
          >
            {userSupplierPOs.map((po) => (
              <option key={po.id} value={po.id}>
                {po.poNumber} - {po.supplierName}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handlePrint}
              className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition"
              title="Print Supplier Bill"
            >
              <Printer className="w-4 h-4" />
            </button>
            <a
              href={poWhatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition"
            >
              <Share2 className="w-3.5 h-3.5" /> {tr('WhatsApp', language)}
            </a>
          </div>
        </div>

        {/* Supplier Purchase Invoice Document Card */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 shadow-md border border-purple-200/80 text-slate-800 print:shadow-none print:border-none">
          <div className="flex flex-wrap justify-between items-start gap-2 border-b border-slate-200 pb-3 mb-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-700 text-white font-black text-base flex items-center justify-center">
                  S
                </div>
                <h2 className="text-base sm:text-xl font-black text-slate-900 tracking-tight">
                  {selectedPo.supplierName}
                </h2>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-1 font-medium">
                {selectedPoSupplier?.address || selectedPoSupplier?.city || 'Wholesale Supply Hub'}
              </p>
              <p className="text-[11px] sm:text-xs text-slate-500">
                Contact: {selectedPoSupplier?.contactPerson || 'Sales Desk'} • {supplierPhone}
              </p>
              {(selectedPoSupplier?.gstin || selectedPoSupplier?.gstNumber) && (
                <p className="text-[10px] sm:text-[11px] font-mono text-slate-600 mt-0.5">
                  GSTIN: {selectedPoSupplier.gstin || selectedPoSupplier.gstNumber}
                </p>
              )}
            </div>

            <div className="text-right">
              <span className="text-[10px] sm:text-xs font-bold text-purple-700 uppercase tracking-widest block">
                SUPPLIER PURCHASE BILL
              </span>
              <span className="text-sm sm:text-base font-black font-mono text-slate-900 block mt-0.5">
                {selectedPo.poNumber}
              </span>
              <span className="text-[11px] text-slate-400 block mt-0.5">Date: {selectedPo.orderDate}</span>
            </div>
          </div>

          {/* Buyer & Transport Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3 text-xs">
            <div className="bg-purple-50/70 rounded-xl p-2.5 border border-purple-100">
              <span className="font-bold text-[10px] text-purple-700 uppercase tracking-wider block mb-0.5">
                Buyer (Wholesale Hub)
              </span>
              <h4 className="font-bold text-slate-900 text-xs">{settings.businessName}</h4>
              <p className="text-[11px] text-slate-600">{settings.ownerName} • {settings.businessAddress}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200/80">
              <span className="font-bold text-[10px] text-slate-500 uppercase tracking-wider block mb-0.5">
                Transport & Bilty
              </span>
              <h4 className="font-bold text-slate-900 text-xs">{selectedPo.transportCompany || 'Roadways Cargo'}</h4>
              <p className="text-[11px] text-slate-600">
                Bilty: {selectedPo.biltyNumber || 'Pending'} • Status: <b>{selectedPo.status}</b>
              </p>
            </div>
          </div>

          {/* Purchase Line Items */}
          <div className="overflow-x-auto no-scrollbar mb-3 rounded-xl border border-slate-100">
            <table className="w-full text-left text-[10px] sm:text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600 font-bold bg-purple-50/60 whitespace-nowrap">
                  <th className="py-1.5 px-1.5 sm:py-2 sm:px-2">#</th>
                  <th className="py-1.5 px-1.5 sm:py-2 sm:px-2">{tr('Item Description', language)}</th>
                  <th className="py-1.5 px-1.5 sm:py-2 sm:px-2 text-center">SKU</th>
                  <th className="py-1.5 px-1.5 sm:py-2 sm:px-2 text-center">{tr('Pack', language)}</th>
                  <th className="py-1.5 px-1.5 sm:py-2 sm:px-2 text-center">{tr('Pkts', language)}</th>
                  <th className="py-1.5 px-1.5 sm:py-2 sm:px-2 text-right">{tr('Rate', language)}</th>
                  <th className="py-1.5 px-1.5 sm:py-2 sm:px-2 text-right">{tr('Amount', language)}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {selectedPo.items.map((it, idx) => (
                  <tr key={idx}>
                    <td className="py-1.5 px-1.5 sm:py-2 sm:px-2 text-slate-400">{idx + 1}</td>
                    <td className="py-1.5 px-1.5 sm:py-2 sm:px-2 font-semibold text-slate-900 min-w-[110px]">{it.productName}</td>
                    <td className="py-1.5 px-1.5 sm:py-2 sm:px-2 text-center font-mono text-slate-500">{it.sku}</td>
                    <td className="py-1.5 px-1.5 sm:py-2 sm:px-2 text-center text-slate-500 whitespace-nowrap">{it.packSize} pcs</td>
                    <td className="py-1.5 px-1.5 sm:py-2 sm:px-2 text-center font-bold text-slate-800">{it.packets}</td>
                    <td className="py-1.5 px-1.5 sm:py-2 sm:px-2 text-right text-slate-600 whitespace-nowrap">₹{it.purchaseCostPerPacket}</td>
                    <td className="py-1.5 px-1.5 sm:py-2 sm:px-2 text-right font-bold text-slate-900 whitespace-nowrap">₹{it.totalAmount.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Supplier Settlement Summary */}
          <div className="border-t border-slate-200 pt-3 flex flex-col sm:flex-row justify-between items-stretch sm:items-start gap-3 text-xs">
            <div className="space-y-1">
              <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-black bg-purple-100 text-purple-800 border border-purple-200">
                Payment Status: {selectedPo.paymentStatus}
              </span>
              {selectedPo.ownerNotes && (
                <p className="text-[11px] text-slate-500 max-w-xs">{selectedPo.ownerNotes}</p>
              )}
            </div>

            <div className="w-full sm:w-56 space-y-1 text-right bg-purple-50/50 sm:bg-transparent p-2.5 sm:p-0 rounded-xl">
              <div className="flex justify-between text-xs sm:text-sm font-black text-slate-900">
                <span>Lot Total:</span>
                <span>₹{selectedPo.totalAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-semibold text-[11px]">
                <span>{tr('Advance Paid:', language)}</span>
                <span>-₹{selectedPo.advancePaid.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1 text-xs sm:text-sm font-black text-purple-800">
                <span>{tr('Balance Due:', language)}</span>
                <span>₹{selectedPo.balanceDue.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (role === 'supplier') {
    return <div className="space-y-4 pb-24 sm:pb-28">{renderSupplierInvoiceSection()}</div>;
  }

  if (role === 'customer') {
    return <div className="space-y-4 pb-24 sm:pb-28">{renderRetailerInvoiceSection()}</div>;
  }

  // Owner View: Two Sections (Retailer Bills + Supplier Bills)
  return (
    <div className="space-y-4 pb-24 sm:pb-28">
      {/* Owner Section Switcher */}
      <div className="glass-card rounded-2xl p-2 border border-white/90 shadow-xs flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setBillSection('all')}
          className={`flex-1 min-w-[100px] py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
            billSection === 'all'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{tr('All Bills', language)}</span>
        </button>

        <button
          type="button"
          onClick={() => setBillSection('retailer')}
          className={`flex-1 min-w-[115px] py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
            billSection === 'retailer'
              ? 'bg-sky-600 text-white shadow-xs'
              : 'bg-sky-50/70 text-sky-800 hover:bg-sky-100'
          }`}
        >
          <Store className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{tr('Retailer Bills', language)} ({userOrders.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setBillSection('supplier')}
          className={`flex-1 min-w-[115px] py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
            billSection === 'supplier'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'bg-purple-50/70 text-purple-800 hover:bg-purple-100'
          }`}
        >
          <Factory className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{tr('Supplier Bills', language)} ({userSupplierPOs.length})</span>
        </button>
      </div>

      {(billSection === 'all' || billSection === 'retailer') && renderRetailerInvoiceSection()}

      {(billSection === 'all' || billSection === 'supplier') && renderSupplierInvoiceSection()}
    </div>
  );
};
