import React from 'react';
import { useApp } from '../context/AppContext';
import {
  X,
  Building2,
  Check,
  Plus,
  Store,
  Users,
  Package,
  MapPin,
  Phone,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface BusinessSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BusinessSwitcherModal: React.FC<BusinessSwitcherModalProps> = ({ isOpen, onClose }) => {
  const {
    businesses,
    activeBusinessId,
    switchBusiness,
    setIsCreateBusinessOpen,
    products,
    customers,
    suppliers,
  } = useApp();

  if (!isOpen) return null;

  const handleSelectBusiness = (bizId: string) => {
    switchBusiness(bizId);
    onClose();
  };

  const handleOpenCreateNew = () => {
    onClose();
    setIsCreateBusinessOpen(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center font-black text-indigo-300">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base leading-tight">Switch Business ID</h3>
              <p className="text-[11px] text-slate-300">
                Manage multiple companies, products & retail networks
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Button: Create New Business */}
        <div className="p-3 bg-indigo-50/70 border-b border-indigo-100 flex items-center justify-between shrink-0">
          <div>
            <span className="text-xs font-bold text-indigo-950 block">Owner Multi-Business Manager</span>
            <span className="text-[11px] text-slate-500">
              Total {businesses.length} Business IDs registered
            </span>
          </div>
          <button
            type="button"
            onClick={handleOpenCreateNew}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Business ID</span>
          </button>
        </div>

        {/* Business List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {businesses.map((biz) => {
            const isActive = biz.id === activeBusinessId;
            // Count products, customers, suppliers associated with this business
            const bizProductsCount = products.filter(
              (p) => p.businessId === biz.id || (!p.businessId && biz.id === 'BIZ-NP-001')
            ).length;
            const bizCustomersCount = customers.filter(
              (c) => c.businessId === biz.id || (!c.businessId && biz.id === 'BIZ-NP-001')
            ).length;
            const bizSuppliersCount = suppliers.filter(
              (s) => s.businessId === biz.id || (!s.businessId && biz.id === 'BIZ-NP-001')
            ).length;

            return (
              <div
                key={biz.id}
                onClick={() => handleSelectBusiness(biz.id)}
                className={`p-4 rounded-3xl border-2 transition cursor-pointer relative overflow-hidden space-y-2.5 ${
                  isActive
                    ? 'bg-gradient-to-br from-indigo-50/80 via-white to-blue-50/60 border-indigo-500 shadow-md ring-2 ring-indigo-400/20'
                    : 'bg-white border-slate-200/90 hover:border-indigo-300 hover:bg-slate-50/60 shadow-xs'
                }`}
              >
                {isActive && (
                  <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-bl-2xl flex items-center gap-1">
                    <Check className="w-3 h-3 stroke-[3]" />
                    <span>Active Now</span>
                  </div>
                )}

                <div className="flex items-start justify-between pr-16">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-black text-indigo-700 bg-indigo-100/80 px-2 py-0.5 rounded-lg border border-indigo-200">
                        {biz.id}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 px-2 py-0.5 rounded-full bg-slate-100">
                        {biz.category}
                      </span>
                    </div>
                    <h4 className="text-base font-extrabold text-slate-900 mt-1 leading-snug">
                      {biz.companyName}
                    </h4>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      <span>{biz.ownerName} • {biz.city}, Odisha</span>
                    </p>
                  </div>
                </div>

                {biz.tagline && (
                  <p className="text-[11px] text-indigo-900/80 italic font-medium">
                    "{biz.tagline}"
                  </p>
                )}

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center text-xs font-bold">
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center justify-center gap-1 text-indigo-600 mb-0.5">
                      <Package className="w-3.5 h-3.5" />
                      <span className="text-xs font-black">{bizProductsCount}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-semibold">Products</span>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center justify-center gap-1 text-amber-600 mb-0.5">
                      <Store className="w-3.5 h-3.5" />
                      <span className="text-xs font-black">{bizCustomersCount}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-semibold">Retailer Shops</span>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center justify-center gap-1 text-purple-600 mb-0.5">
                      <Users className="w-3.5 h-3.5" />
                      <span className="text-xs font-black">{bizSuppliersCount}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-semibold">Suppliers</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-[11px] text-slate-500 font-mono">
                    UPI: {biz.upiId}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectBusiness(biz.id);
                    }}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1 transition ${
                      isActive
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-900 text-white hover:bg-slate-800'
                    }`}
                  >
                    <span>{isActive ? 'Current Active' : 'Switch to this Business'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
