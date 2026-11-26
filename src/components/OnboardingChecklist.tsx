import React from 'react';
import { useApp } from '../context/AppContext';
import { CheckCircle2, Circle, Sparkles, X, ChevronRight } from 'lucide-react';

export const OnboardingChecklist: React.FC<{
  onAddProduct: () => void;
  onAddCustomer: () => void;
  onCreateOrder: () => void;
}> = ({ onAddProduct, onAddCustomer, onCreateOrder }) => {
  const { products, customers, orders, onboardingDismissed, dismissOnboarding, role } = useApp();

  if (onboardingDismissed || role !== 'owner') return null;

  const hasProduct = products.length > 0;
  const hasCustomer = customers.length > 0;
  const hasOrder = orders.length > 0;

  const completedCount = (hasProduct ? 1 : 0) + (hasCustomer ? 1 : 0) + (hasOrder ? 1 : 0);
  const isComplete = completedCount === 3;

  if (isComplete) return null;

  return (
    <div className="glass-card rounded-2xl p-3 mb-3 relative border border-sky-200/80 shadow-sm">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-sky-500 text-white flex items-center justify-center">
            <Sparkles className="w-3 h-3" />
          </div>
          <h3 className="text-xs font-bold text-slate-900">Get Started with Rupam Wholesale</h3>
        </div>
        <button
          onClick={dismissOnboarding}
          className="text-slate-400 hover:text-slate-600 p-1"
          aria-label="Dismiss checklist"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <p className="text-[11px] text-slate-500 mb-2">
        Setup your inventory and Retailer shops to start booking orders:
      </p>

      {/* Progress bar */}
      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mb-2.5">
        <div
          className="bg-gradient-to-r from-sky-500 to-blue-600 h-full transition-all duration-300"
          style={{ width: `${(completedCount / 3) * 100}%` }}
        />
      </div>

      <div className="space-y-1.5">
        {/* Step 1 */}
        <button
          onClick={onAddProduct}
          className="w-full flex items-center justify-between p-2 rounded-xl bg-white/80 hover:bg-white border border-slate-200/70 text-left transition"
        >
          <div className="flex items-center gap-2">
            {hasProduct ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            ) : (
              <Circle className="w-4 h-4 text-slate-300 shrink-0" />
            )}
            <div>
              <span className={`text-[11px] font-semibold block ${hasProduct ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                1. Add your first cosmetic product
              </span>
              <p className="text-[9px] text-slate-500">Lipstick, Nail Polish, Bindi (6/12 pc packs)</p>
            </div>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        </button>

        {/* Step 2 */}
        <button
          onClick={onAddCustomer}
          className="w-full flex items-center justify-between p-2 rounded-xl bg-white/80 hover:bg-white border border-slate-200/70 text-left transition"
        >
          <div className="flex items-center gap-2">
            {hasCustomer ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            ) : (
              <Circle className="w-4 h-4 text-slate-300 shrink-0" />
            )}
            <div>
              <span className={`text-[11px] font-semibold block ${hasCustomer ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                2. Add your first Retailer ID
              </span>
              <p className="text-[9px] text-slate-500">Auto distance from Nuapatna (150 km free)</p>
            </div>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        </button>

        {/* Step 3 */}
        <button
          onClick={onCreateOrder}
          className="w-full flex items-center justify-between p-2 rounded-xl bg-white/80 hover:bg-white border border-slate-200/70 text-left transition"
        >
          <div className="flex items-center gap-2">
            {hasOrder ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            ) : (
              <Circle className="w-4 h-4 text-slate-300 shrink-0" />
            )}
            <div>
              <span className={`text-[11px] font-semibold block ${hasOrder ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                3. Create your first wholesale order
              </span>
              <p className="text-[9px] text-slate-500">Min ₹1,000 order & ₹1,000 advance rule</p>
            </div>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        </button>
      </div>
    </div>
  );
};
