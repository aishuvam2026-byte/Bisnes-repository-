import React from 'react';
import { useApp } from '../context/AppContext';
import { tr } from '../data/translations';
import { ShoppingBag, CreditCard, PackagePlus, UserPlus, Building2, Receipt, QrCode, X } from 'lucide-react';

interface QuickAddSheetProps {
  onSelectAction: (action: string) => void;
}

export const QuickAddSheet: React.FC<QuickAddSheetProps> = ({ onSelectAction }) => {
  const { isQuickAddOpen, setIsQuickAddOpen, role, t, language } = useApp();

  if (!isQuickAddOpen) return null;

  const ownerActions = [
    { id: 'new-order', label: t.newOrder, icon: ShoppingBag, color: 'from-blue-500 to-indigo-600', desc: 'Book wholesale order (min ₹1,000)' },
    { id: 'add-payment', label: t.addPayment, icon: CreditCard, color: 'from-emerald-500 to-teal-600', desc: 'Record UPI, Cash or Bank transfer' },
    { id: 'add-stock', label: t.addStock, icon: PackagePlus, color: 'from-amber-500 to-orange-600', desc: 'Stock In from supplier or adjustment' },
    { id: 'add-customer', label: t.addCustomer, icon: UserPlus, color: 'from-sky-500 to-cyan-600', desc: 'Register Retailer ID & calculate distance' },
    { id: 'add-supplier', label: tr('Add Supplier', language), icon: Building2, color: 'from-purple-500 to-indigo-600', desc: 'Register wholesaler, stockist or factory' },
    { id: 'add-expense', label: t.addExpense, icon: Receipt, color: 'from-pink-500 to-rose-600', desc: 'Freight, packing, delivery, fuel' },
    { id: 'scan-barcode', label: tr('Scan Barcode', language), icon: QrCode, color: 'from-slate-600 to-slate-800', desc: 'Lookup item or quick packet count' },
  ];

  const customerActions = [
    { id: 'new-order', label: tr('Place Order', language), icon: ShoppingBag, color: 'from-blue-500 to-indigo-600', desc: 'Choose 6/12 pc cosmetic packs' },
    { id: 'make-payment', label: tr('Pay Advance / Dues', language), icon: CreditCard, color: 'from-emerald-500 to-teal-600', desc: 'Instant UPI to Shuvam Behera' },
    { id: 'contact-owner', label: tr('Call Shuvam Bhai', language), icon: UserPlus, color: 'from-sky-500 to-cyan-600', desc: 'Discuss delivery or wholesale inquiry' },
  ];

  const actions = role === 'owner' ? ownerActions : customerActions;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl bg-white rounded-t-3xl p-5 shadow-2xl border-t border-slate-100 max-h-[85vh] overflow-y-auto"
        role="dialog"
        aria-label="Quick Actions Sheet"
      >
        {/* Handle bar */}
        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-4" />

        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              {role === 'owner' ? tr('Quick Actions', language) : tr('What would you like to do?', language)}
            </h3>
            <p className="text-xs text-slate-500">Tap an option to start immediately</p>
          </div>
          <button
            onClick={() => setIsQuickAddOpen(false)}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          {actions.map((act) => {
            const Icon = act.icon;
            return (
              <button
                key={act.id}
                onClick={() => {
                  setIsQuickAddOpen(false);
                  onSelectAction(act.id);
                }}
                className="flex flex-col items-start p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 text-left transition active:scale-98"
              >
                <div
                  className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${act.color} text-white flex items-center justify-center shadow-md mb-2`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-sm font-bold text-slate-900 leading-snug">{act.label}</span>
                <span className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{act.desc}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
