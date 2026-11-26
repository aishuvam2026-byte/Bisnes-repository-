import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Supplier } from '../types';
import { Building2, Phone, Star, Plus, Calculator, AlertTriangle, CheckCircle2, X, Pencil } from 'lucide-react';
import { calculateLandedCost } from '../utils/businessRules';

export const SuppliersView: React.FC = () => {
  const { suppliers, settings, showToast, role, user, openMorePage, editSupplierWithId } = useApp();

  const activeSupplierId = user?.supplierId || 'sup-1';
  const visibleSuppliers = role === 'supplier' ? suppliers.filter((s) => s.id === activeSupplierId) : suppliers;

  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [purchasePrice, setPurchasePrice] = useState<number>(200);
  const [freight, setFreight] = useState<number>(15);
  const [packing, setPacking] = useState<number>(5);
  const [damageAllowance, setDamageAllowance] = useState<number>(5);
  const [targetSellingPrice, setTargetSellingPrice] = useState<number>(320);

  // Edit Supplier ID Form
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [editSupId, setEditSupId] = useState('');
  const [editSupName, setEditSupName] = useState('');
  const [editSupContact, setEditSupContact] = useState('');
  const [editSupPhone, setEditSupPhone] = useState('');
  const [editSupCity, setEditSupCity] = useState('');
  const [editSupTerms, setEditSupTerms] = useState('');

  const openEditSup = (s: Supplier) => {
    setEditingSupplier(s);
    setEditSupId(s.id);
    setEditSupName(s.name);
    setEditSupContact(s.contactPerson || '');
    setEditSupPhone(s.phone);
    setEditSupCity(s.city || '');
    setEditSupTerms(s.paymentTerms);
  };

  const handleSaveEditSup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSupplier) return;
    const ok = editSupplierWithId(editingSupplier.id, {
      newId: editSupId.trim() || editingSupplier.id,
      name: editSupName.trim() || editingSupplier.name,
      contactPerson: editSupContact.trim() || undefined,
      phone: editSupPhone.trim() || editingSupplier.phone,
      city: editSupCity.trim() || undefined,
      paymentTerms: editSupTerms.trim() || editingSupplier.paymentTerms,
    });
    if (ok) {
      setEditingSupplier(null);
    }
  };

  const calc = calculateLandedCost(purchasePrice, freight, packing, damageAllowance, targetSellingPrice);

  return (
    <div className="space-y-4 pb-28">
      {/* Header */}
      <div className="glass-card rounded-3xl p-4.5 border border-white/90 shadow-md flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-teal-500 text-white flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-slate-900">
              {role === 'supplier' ? 'My Supplier Profile & Terms' : 'Suppliers & C&F Partners'}
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {role === 'supplier'
              ? 'Authorized wholesale stockist relationship with Rupam Wholesale'
              : 'Authorized wholesale stockists & factory sourcing'}
          </p>
        </div>

        <button
          onClick={() => setIsCalculatorOpen(true)}
          className="px-3.5 py-2 rounded-2xl bg-teal-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition"
        >
          <Calculator className="w-4 h-4" />
          <span>Landed Cost</span>
        </button>
      </div>

      {/* Supplier Cards */}
      <div className="space-y-3">
        {visibleSuppliers.map((s) => (
          <div
            key={s.id}
            className="glass-card rounded-3xl p-4 border border-white/90 shadow-sm space-y-2.5"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-900 border border-purple-200">
                    ID: {s.id}
                  </span>
                  <h3 className="font-bold text-slate-900 text-sm">{s.name}</h3>
                </div>
                <p className="text-xs text-teal-700 font-semibold mt-0.5">{s.brandAuth}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{s.address}</p>
              </div>

              <div className="text-right">
                <span className="flex items-center gap-1 text-xs font-bold text-amber-500 justify-end">
                  <Star className="w-3.5 h-3.5 fill-amber-400" /> {s.rating}
                </span>
                {s.dueAmount > 0 && (
                  <span className="text-[11px] text-rose-600 font-bold block mt-1">
                    Dues: ₹{s.dueAmount.toLocaleString('en-IN')}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-600">
              <span>Terms: {s.paymentTerms}</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => openEditSup(s)}
                  className="px-2.5 py-1 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 font-bold flex items-center gap-1 transition"
                >
                  <Pencil className="w-3 h-3" /> Edit ID
                </button>
                <a
                  href={`tel:${s.phone}`}
                  className="px-3 py-1 rounded-xl bg-sky-50 text-sky-700 font-bold flex items-center gap-1"
                >
                  <Phone className="w-3.5 h-3.5" /> Call
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Landed Cost Calculator Modal */}
      {isCalculatorOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-t-3xl p-5 shadow-2xl border-t border-slate-100 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <h3 className="font-bold text-slate-900 text-base">Landed Cost & Real Margin Calculator</h3>
              <button
                onClick={() => setIsCalculatorOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Purchase Cost / Pkt</label>
                  <input
                    type="number"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Freight Transport / Pkt</label>
                  <input
                    type="number"
                    value={freight}
                    onChange={(e) => setFreight(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Carton & Bubble Pack</label>
                  <input
                    type="number"
                    value={packing}
                    onChange={(e) => setPacking(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Transit Damage Buffer</label>
                  <input
                    type="number"
                    value={damageAllowance}
                    onChange={(e) => setDamageAllowance(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">Wholesale Selling Price / Pkt</label>
                <input
                  type="number"
                  value={targetSellingPrice}
                  onChange={(e) => setTargetSellingPrice(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-bold text-slate-800"
                />
              </div>

              {/* Result Summary */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-600">Calculated Landed Cost:</span>
                  <span className="font-bold text-slate-900">₹{calc.landedCost}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Net Profit per Packet:</span>
                  <span className="font-bold text-emerald-600">₹{calc.marginAmount}</span>
                </div>
                <div className="flex justify-between text-sm font-black pt-1 border-t border-slate-200">
                  <span>Actual Margin:</span>
                  <span className={calc.isMarginHealthy ? 'text-emerald-700' : 'text-rose-600'}>
                    {calc.marginPercent}% {calc.isMarginHealthy ? '✓ Healthy' : '⚠️ Below Min 15%'}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCalculatorOpen(false);
                    openMorePage('landedCost');
                  }}
                  className="flex-1 py-3 rounded-2xl bg-slate-900 text-white font-bold text-xs shadow-sm"
                >
                  Open ID Rule Settings Table
                </button>
                <button
                  onClick={() => {
                    showToast('Landed cost saved for reference');
                    setIsCalculatorOpen(false);
                  }}
                  className="flex-1 py-3 rounded-2xl bg-teal-600 text-white font-bold text-sm shadow-md"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT SUPPLIER ID MODAL */}
      {editingSupplier && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="font-black text-slate-900 text-base">Edit Supplier ID &amp; Profile</h3>
                <p className="text-[11px] text-slate-500">Supplier ID aur details update karein</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingSupplier(null)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveEditSup} className="space-y-2.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Supplier ID *</label>
                <input
                  type="text"
                  required
                  value={editSupId}
                  onChange={(e) => setEditSupId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 font-mono font-bold text-slate-900"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Firm Name *</label>
                  <input
                    type="text"
                    required
                    value={editSupName}
                    onChange={(e) => setEditSupName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={editSupContact}
                    onChange={(e) => setEditSupContact(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Phone</label>
                  <input
                    type="tel"
                    value={editSupPhone}
                    onChange={(e) => setEditSupPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">City</label>
                  <input
                    type="text"
                    value={editSupCity}
                    onChange={(e) => setEditSupCity(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300"
                  />
                </div>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Payment Terms</label>
                <input
                  type="text"
                  value={editSupTerms}
                  onChange={(e) => setEditSupTerms(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-2xl bg-purple-700 hover:bg-purple-800 text-white font-black text-xs shadow-sm transition"
              >
                Save Supplier ID Changes
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
