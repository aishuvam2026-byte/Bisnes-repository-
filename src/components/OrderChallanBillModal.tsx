import React, { useState } from 'react';
import {
  X,
  Download,
  MessageSquare,
  FileText,
  AlertTriangle,
  ShieldCheck,
  RotateCcw,
  Wallet,
} from 'lucide-react';
import { BusinessSettings, Order, Product } from '../types';
import {
  BILL_RULES_AND_WARNINGS,
  buildStructuredOrderBill,
  downloadAndShareBillPdfOnWhatsApp,
  generateOrderBillPdf,
  triggerPdfDownload,
} from '../utils/billPdfGenerator';

interface OrderChallanBillModalProps {
  order: Order | null;
  products: Product[];
  settings: BusinessSettings;
  recipientPhone: string;
  onClose: () => void;
  onNotify?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const OrderChallanBillModal: React.FC<OrderChallanBillModalProps> = ({
  order,
  products,
  settings,
  recipientPhone,
  onClose,
  onNotify,
}) => {
  const [isExporting, setIsExporting] = useState(false);

  if (!order) return null;

  const bill = buildStructuredOrderBill(order, products);

  const handleDownloadOnly = () => {
    setIsExporting(true);
    try {
      const { blob, fileName } = generateOrderBillPdf(order, products, settings);
      triggerPdfDownload(blob, fileName);
      onNotify?.(`Bill PDF downloaded (${fileName})`, 'success');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadAndWhatsApp = async () => {
    setIsExporting(true);
    try {
      await downloadAndShareBillPdfOnWhatsApp(
        order,
        products,
        settings,
        recipientPhone,
        onNotify
      );
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/55 backdrop-blur-xs p-0 sm:p-4">
      <div className="w-full max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 max-h-[92vh] flex flex-col overflow-hidden">
        {/* Top Modal Header */}
        <div className="px-4 sm:px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-sky-600 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm sm:text-base truncate">
                Tax Invoice & Dispatch Challan
              </h3>
              <p className="text-[11px] text-slate-300 truncate tabular-nums">
                #{bill.orderNumber} · {bill.invoiceDate} · {bill.status}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Bill"
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center shrink-0 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Invoice Document Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Seller & Retailer Header Block */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Supplier / Wholesale Hub
              </span>
              <p className="text-xs sm:text-sm font-bold text-slate-900">
                {settings.businessName || 'Rupam Wholesale Hub'}
              </p>
              <p className="text-[11px] text-slate-600">
                {settings.businessAddress || 'Nuapatna, Cuttack, Odisha'}
              </p>
              <p className="text-[11px] text-slate-600 tabular-nums">
                Ph: +91 {settings.ownerPhone || '9437123456'} · GSTIN:{' '}
                {settings.businessGstin || '21AABCR4821K1Z5'}
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Bill To (Retailer)
              </span>
              <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                {bill.shopName}
              </p>
              <p className="text-[11px] text-slate-600 tabular-nums">
                {bill.ownerName} · +91 {bill.phone}
              </p>
              <p className="text-[11px] text-slate-600 truncate">
                {bill.address}
                {bill.landmark ? `, ${bill.landmark}` : ''} · Exp: {bill.expectedDeliveryDate}
              </p>
            </div>
          </div>

          {/* Category Summary Line */}
          <div className="px-3 py-2 rounded-xl bg-sky-50/70 border border-sky-200/70 flex items-center justify-between gap-2 flex-wrap text-xs">
            <span className="font-bold text-sky-900">
              Categories: {bill.categories.join(' · ')}
            </span>
            <span className="font-bold text-slate-700 tabular-nums">
              {bill.totalPackets} pkts ({bill.totalPieces} pcs)
            </span>
          </div>

          {/* Itemized Table: Category, Model/Code/ID, Single Price, Qty, Total Price */}
          <div className="rounded-2xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider">
                    <th className="py-2.5 px-2.5">#</th>
                    <th className="py-2.5 px-2.5">Category</th>
                    <th className="py-2.5 px-2.5">Model / Code / ID</th>
                    <th className="py-2.5 px-2.5 text-right">Single Price</th>
                    <th className="py-2.5 px-2.5 text-right">Qty</th>
                    <th className="py-2.5 px-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {bill.groups.map((grp) => (
                    <React.Fragment key={grp.category}>
                      <tr className="bg-slate-50/90">
                        <td
                          colSpan={6}
                          className="py-1.5 px-2.5 text-[11px] font-bold text-sky-800"
                        >
                          <div className="flex items-center justify-between">
                            <span>Category: {grp.category}</span>
                            <span className="tabular-nums text-slate-600">
                              {grp.categoryPackets} pkts · ₹{grp.categoryTotal.toLocaleString('en-IN')}
                            </span>
                          </div>
                        </td>
                      </tr>
                      {grp.items.map((item) => (
                        <tr key={`${item.srNo}-${item.modelCode}`} className="bg-white">
                          <td className="py-2.5 px-2.5 text-slate-500 font-semibold tabular-nums">
                            {item.srNo}
                          </td>
                          <td className="py-2.5 px-2.5 font-semibold text-slate-800 whitespace-nowrap">
                            {item.category}
                          </td>
                          <td className="py-2.5 px-2.5">
                            <span className="font-mono font-bold text-slate-900 block">
                              {item.modelCode}
                            </span>
                            <span className="text-[10px] text-slate-500 block">
                              HSN {item.hsnCode} · {item.packInfo}
                            </span>
                          </td>
                          <td className="py-2.5 px-2.5 text-right font-semibold text-slate-800 tabular-nums whitespace-nowrap">
                            ₹{item.singlePrice.toLocaleString('en-IN')}
                          </td>
                          <td className="py-2.5 px-2.5 text-right tabular-nums whitespace-nowrap">
                            <span className="font-bold text-slate-900 block">
                              {item.qty} pkt
                            </span>
                            <span className="text-[10px] text-slate-500 block">
                              {item.totalPieces} pcs
                            </span>
                          </td>
                          <td className="py-2.5 px-2.5 text-right font-black text-slate-900 tabular-nums whitespace-nowrap">
                            ₹{item.totalPrice.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals Calculation: Subtotal + GST + Extra Charge = Grand Total */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-700">
              <span className="font-medium">Subtotal</span>
              <span className="font-bold text-slate-900 tabular-nums">
                ₹{bill.subtotal.toLocaleString('en-IN')}
              </span>
            </div>

            {bill.discountAmount > 0 && (
              <div className="flex items-center justify-between text-emerald-700">
                <span className="font-medium">Discount</span>
                <span className="font-bold tabular-nums">
                  - ₹{bill.discountAmount.toLocaleString('en-IN')}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between text-slate-700">
              <span className="font-medium">
                GST ({bill.gstRatePercent}% · CGST ₹{bill.cgstAmount.toLocaleString('en-IN')} + SGST ₹
                {bill.sgstAmount.toLocaleString('en-IN')})
              </span>
              <span className="font-bold text-slate-900 tabular-nums">
                ₹{bill.gstAmount.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="flex items-center justify-between text-slate-700">
              <span className="font-medium">Extra / Packing & Delivery Charge</span>
              <span className="font-bold text-slate-900 tabular-nums">
                ₹{bill.extraCharge.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-sm">
              <span className="font-black text-slate-900">Grand Total</span>
              <span className="font-black text-slate-900 text-base tabular-nums">
                ₹{bill.grandTotal.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="pt-2 border-t border-dashed border-slate-200 grid grid-cols-2 gap-2 text-[11px]">
              <div className="bg-white rounded-xl p-2 border border-slate-200/80">
                <span className="text-slate-500 block">Advance Paid</span>
                <span className="font-bold text-emerald-700 tabular-nums">
                  ₹{bill.advancePaidAmount.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="bg-white rounded-xl p-2 border border-amber-200/80 text-right">
                <span className="text-amber-700 block">Balance Payable</span>
                <span className="font-black text-amber-900 tabular-nums">
                  ₹{bill.balancePayable.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>

          {/* Warnings, Instructions, Udhaar Rule & Return Rule */}
          <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-3.5 space-y-2.5 text-[11px] leading-relaxed">
            <div className="flex items-center gap-1.5 font-bold text-amber-950 text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
              <span>Important Instructions, Warnings, Udhaar & Return Policy</span>
            </div>

            <div className="space-y-2">
              <div className="p-2.5 rounded-xl bg-white border border-rose-200/80 text-slate-700">
                <div className="flex items-center gap-1.5 font-bold text-rose-700 mb-0.5">
                  <Wallet className="w-3.5 h-3.5 shrink-0" />
                  <span>Udhaar Rule</span>
                </div>
                <p>{BILL_RULES_AND_WARNINGS.udhaarRule}</p>
              </div>

              <div className="p-2.5 rounded-xl bg-white border border-sky-200/80 text-slate-700">
                <div className="flex items-center gap-1.5 font-bold text-sky-800 mb-0.5">
                  <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                  <span>Return & Unboxing Policy</span>
                </div>
                <p>{BILL_RULES_AND_WARNINGS.returnRule}</p>
              </div>

              <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 text-slate-700 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-900">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Warnings, Payment & Dispatch Instructions</span>
                </div>
                <ol className="list-decimal list-inside space-y-0.5 text-slate-600">
                  {BILL_RULES_AND_WARNINGS.warnings.map((rule, idx) => (
                    <li key={idx}>{rule}</li>
                  ))}
                </ol>
                <div className="pt-1.5 mt-1.5 border-t border-slate-100 flex items-center justify-between flex-wrap gap-1 text-[10px] text-slate-500">
                  <span>Official UPI: {settings.upiId || 'rupamwholesale@upi'}</span>
                  <span>Tracking: {bill.trackingNumber}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Action Footer (NO Pay Now Button) */}
        <div className="px-4 sm:px-5 py-3 bg-white border-t border-slate-200 flex items-center gap-2 flex-wrap shrink-0">
          <button
            type="button"
            disabled={isExporting}
            onClick={handleDownloadAndWhatsApp}
            className="flex-1 min-w-[180px] py-2.5 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs active:scale-[0.98] transition"
          >
            <MessageSquare className="w-4 h-4 shrink-0" />
            <span>Download Bill PDF & Send WhatsApp</span>
          </button>

          <button
            type="button"
            disabled={isExporting}
            onClick={handleDownloadOnly}
            className="py-2.5 px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white font-bold text-xs flex items-center justify-center gap-1.5 active:scale-[0.98] transition"
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            <span>PDF</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
