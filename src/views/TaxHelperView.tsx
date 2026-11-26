import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Calculator, Download, Sparkles, AlertCircle, FileSpreadsheet, CheckCircle2 } from 'lucide-react';

export const TaxHelperView: React.FC = () => {
  const { orders, products, settings, showToast } = useApp();

  const [isExplaining, setIsExplaining] = useState(false);

  const taxableSales = orders.reduce((sum, o) => sum + o.subtotal, 0);
  const estimatedTaxCollected = Number((taxableSales * 0.18).toFixed(2));
  const estimatedInputTaxCredit = Number((taxableSales * 0.65 * 0.18).toFixed(2));
  const netGstPayable = Math.max(0, Number((estimatedTaxCollected - estimatedInputTaxCredit).toFixed(2)));

  const handleExportGstCsv = () => {
    let csv = 'InvoiceNo,Date,ShopName,GSTIN,State,TaxableValue,CGST_9,SGST_9,IGST_18,Total\n';
    orders.forEach((o) => {
      const isInter = o.address.includes('Bengal');
      const tax = Number((o.subtotal * 0.18).toFixed(2));
      const half = Number((tax / 2).toFixed(2));
      csv += `${o.orderNumber},${o.createdAt.split('T')[0]},"${o.shopName}",21BBERA7890Q1Z8,Odisha,${o.subtotal},${isInter ? 0 : half},${isInter ? 0 : half},${isInter ? tax : 0},${o.totalAmount}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GST_Sales_Report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('GST Sales CSV exported successfully!');
  };

  return (
    <div className="space-y-4 pb-28">
      {/* Header */}
      <div className="glass-card rounded-3xl p-4.5 border border-white/90 shadow-md flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center">
              <Calculator className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-slate-900">GST & Tax Helper</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">Estimate GST liability & input credit (HSN 3304)</p>
        </div>

        <button
          onClick={handleExportGstCsv}
          className="px-3.5 py-2.5 rounded-2xl bg-slate-900 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>GST CSV</span>
        </button>
      </div>

      {/* CA Disclaimer Notice */}
      <div className="p-3.5 rounded-3xl bg-amber-50 border border-amber-200 text-xs text-amber-950 flex items-start gap-2.5 shadow-xs">
        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold block">Important CA Disclaimer:</span>
          <span>
            This summary is an automated estimation for internal management. Please confirm all calculations with your Chartered Accountant (CA) before filing GSTR-1 or GSTR-3B.
          </span>
        </div>
      </div>

      {/* Tax Summary Numbers */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass-card rounded-3xl p-4 border border-white/90 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500">Taxable Wholesale Sales</span>
          <span className="text-xl font-black text-slate-900 block mt-0.5">
            ₹{taxableSales.toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-slate-400 mt-1 block">Output GST: ₹{estimatedTaxCollected.toLocaleString('en-IN')}</span>
        </div>

        <div className="glass-card rounded-3xl p-4 border border-white/90 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500">Estimated Net GST</span>
          <span className="text-xl font-black text-amber-600 block mt-0.5">
            ₹{netGstPayable.toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-emerald-600 font-semibold mt-1 block">
            After ITC: ₹{estimatedInputTaxCredit.toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {/* Ask Tax Helper Card */}
      <div className="glass-card rounded-3xl p-4.5 border border-sky-100 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-sky-600" /> Ask Tax Helper
          </h3>
          <button
            onClick={() => setIsExplaining(!isExplaining)}
            className="text-xs text-sky-600 font-bold hover:underline"
          >
            {isExplaining ? 'Hide Details' : 'Explain Tax Rules'}
          </button>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          In cosmetics (Lipsticks, Nail Polish, Kajal, Kits under HSN 3304), standard GST is 18%. For deliveries inside Odisha, it splits into 9% CGST and 9% SGST. For inter-state orders (e.g. West Bengal), 18% IGST applies.
        </p>

        {isExplaining && (
          <div className="mt-3 p-3 rounded-2xl bg-sky-50 text-xs text-sky-900 space-y-1.5 border border-sky-200">
            <p>• <b>Input Tax Credit (ITC):</b> You can claim GST paid on supplier purchases from Kolkata & Rajasthan against output tax.</p>
            <p>• <b>HSN Codes:</b> Lipsticks (33041000), Eye makeup (33042000), Nail polish (33043000), Mehendi cones (33049910 @ 5%).</p>
          </div>
        )}
      </div>
    </div>
  );
};
