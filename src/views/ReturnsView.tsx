import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ReturnRequest } from '../types';
import {
  RotateCcw,
  Video,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Plus,
  ExternalLink,
  ShieldAlert,
  X,
} from 'lucide-react';
import { validateReturnRequest } from '../utils/businessRules';

export const ReturnsView: React.FC = () => {
  const { returns, orders, addReturnRequest, resolveReturnRequest, showToast, role, user } = useApp();

  const activeCustomerId = user?.customerId || 'cust-demo-1';
  const visibleReturns = role === 'customer'
    ? returns.filter((r) => r.customerId === activeCustomerId)
    : returns;
  const visibleOrders = role === 'customer'
    ? orders.filter((o) => o.customerId === activeCustomerId)
    : orders;

  const [isNewReturnOpen, setIsNewReturnOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [isOpenedOrUnsold, setIsOpenedOrUnsold] = useState(false);
  const [damageNotes, setDamageNotes] = useState('');
  const [damageValue, setDamageValue] = useState<number>(300);

  const [decisionModalReturn, setDecisionModalReturn] = useState<ReturnRequest | null>(null);
  const [ownerDecisionNote, setOwnerDecisionNote] = useState('');

  const handleCreateReturn = (e: React.FormEvent) => {
    e.preventDefault();
    const ord = orders.find((o) => o.id === selectedOrderId);
    if (!ord) {
      showToast('Please select an order', 'error');
      return;
    }

    const check = validateReturnRequest(Boolean(videoUrl.trim()), isOpenedOrUnsold, damageNotes);

    addReturnRequest({
      orderId: ord.id,
      orderNumber: ord.orderNumber,
      customerId: ord.customerId,
      customerName: ord.customerName,
      shopName: ord.shopName,
      phone: ord.phone,
      videoUrl: videoUrl.trim(),
      damagePhotos: ['https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=400'],
      damageDescription: damageNotes,
      itemsSummary: 'Damaged item reported by retailer',
      estimatedDamageValue: Number(damageValue),
      ownerNote: check.reason,
    });

    setIsNewReturnOpen(false);
    if (check.status === 'REJECTED') {
      showToast(`Return auto-rejected: ${check.reason}`, 'error');
    }
  };

  const handleResolveDecision = (status: 'APPROVED' | 'REJECTED', outcome: 'Replacement' | 'Credit note' | 'Rejected') => {
    if (!decisionModalReturn) return;
    resolveReturnRequest(decisionModalReturn.id, status, outcome, ownerDecisionNote);
    setDecisionModalReturn(null);
  };

  return (
    <div className="space-y-3 pb-24">
      {/* Top Banner with Strict Unboxing Policy */}
      <div className="glass-card rounded-2xl p-3 sm:p-4 border border-white/90 shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-rose-500 text-white flex items-center justify-center shrink-0">
                <RotateCcw className="w-3.5 h-3.5" />
              </div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 truncate">Returns & Damage Claims</h2>
            </div>
            <p className="text-[11px] text-slate-500 mt-1 leading-snug">
              Strict Business Rule #7: Continuous unboxing video is mandatory. No video = Auto-reject.
            </p>
          </div>

          <button
            onClick={() => setIsNewReturnOpen(true)}
            className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 text-white font-bold text-[11px] flex items-center gap-1 shadow-sm shadow-rose-500/25 active:scale-95 transition shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Claim</span>
          </button>
        </div>
      </div>

      {/* Return Requests List */}
      <div className="space-y-2.5">
        {visibleReturns.map((r) => (
          <div
            key={r.id}
            className="glass-card rounded-2xl p-3 border border-white/90 shadow-xs space-y-2"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <span className="font-mono text-[10px] font-bold text-slate-400">Order #{r.orderNumber}</span>
                <h3 className="font-bold text-slate-900 text-xs sm:text-sm mt-0.5 truncate">{r.shopName}</h3>
                <p className="text-[11px] text-slate-500 truncate">{r.customerName} • {r.createdAt.split('T')[0]}</p>
              </div>

              <div className="text-right shrink-0">
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    r.status === 'APPROVED'
                      ? 'bg-emerald-100 text-emerald-800'
                      : r.status === 'REJECTED'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {r.status} {r.outcome ? `(${r.outcome})` : ''}
                </span>
                <span className="text-[11px] font-bold text-slate-800 block mt-1">
                  Est: ₹{r.estimatedDamageValue}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-700 bg-slate-50 p-2 rounded-xl border border-slate-100">
              <b>Damage:</b> {r.damageDescription}
            </p>

            {/* Video verification pill */}
            <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-100">
              {r.videoUrl ? (
                <a
                  href={r.videoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sky-600 hover:text-sky-800 font-bold flex items-center gap-1"
                >
                  <Video className="w-3.5 h-3.5" /> View Unboxing Video <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <span className="text-rose-600 font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Missing Unboxing Video
                </span>
              )}

              {r.status === 'PENDING' && role === 'owner' && (
                <button
                  onClick={() => setDecisionModalReturn(r)}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 text-white font-bold text-[10px]"
                >
                  Review Claim
                </button>
              )}
            </div>

            {r.ownerNote && (
              <p className="text-[10px] text-slate-500 italic">
                <b>Owner Note:</b> {r.ownerNote}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* New Return Request Modal */}
      {isNewReturnOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-t-3xl p-5 shadow-2xl border-t border-slate-100 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <h3 className="font-bold text-slate-900 text-base">File Damage Return Request</h3>
              <button
                onClick={() => setIsNewReturnOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateReturn} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">Select Order *</label>
                <select
                  required
                  value={selectedOrderId}
                  onChange={(e) => setSelectedOrderId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-800"
                >
                  <option value="">-- Choose Delivered Order --</option>
                  {visibleOrders.map((o) => (
                    <option key={o.id} value={o.id}>
                      #{o.orderNumber} - {o.shopName} (₹{o.totalAmount})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">
                  Continuous Unboxing Video Link * (Mandatory)
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://drive.google.com/file/... or video URL"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-white border border-slate-200 text-xs"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Must show unbroken parcel tape and uninterrupted unpacking.
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">Description of Broken Items *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Describe cracked items, broken bottles, or missing seals"
                  value={damageNotes}
                  onChange={(e) => setDamageNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">Estimated Damage Value (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={damageValue}
                  onChange={(e) => setDamageValue(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs"
                />
              </div>

              <div className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-50 text-[11px]">
                <input
                  type="checkbox"
                  id="unsoldCheck"
                  checked={isOpenedOrUnsold}
                  onChange={(e) => setIsOpenedOrUnsold(e.target.checked)}
                  className="w-3.5 h-3.5 shrink-0 mt-0.5 rounded text-rose-600"
                />
                <label htmlFor="unsoldCheck" className="text-slate-700 cursor-pointer leading-snug">
                  Are these opened or unsold items? (Rule: Unsold goods cannot be returned)
                </label>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-600 text-white font-bold text-sm shadow-md active:scale-98 transition"
              >
                Submit Return Claim
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Decision Review Modal for Owner */}
      {decisionModalReturn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl">
            <h3 className="font-bold text-slate-900 text-base mb-1">Verify Return Request</h3>
            <p className="text-xs text-slate-500 mb-3">{decisionModalReturn.shopName}</p>

            <div className="p-3 rounded-xl bg-slate-50 text-xs mb-3 space-y-1">
              <p><b>Items:</b> {decisionModalReturn.damageDescription}</p>
              <p><b>Claim:</b> ₹{decisionModalReturn.estimatedDamageValue}</p>
            </div>

            <div className="mb-4">
              <label className="text-xs font-bold text-slate-600 mb-1 block">Decision Note</label>
              <input
                type="text"
                placeholder="e.g. Unboxing video verified. Replacement in bus dispatch."
                value={ownerDecisionNote}
                onChange={(e) => setOwnerDecisionNote(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 mb-2">
              <button
                onClick={() => handleResolveDecision('APPROVED', 'Replacement')}
                className="py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs"
              >
                Approve (Replace)
              </button>
              <button
                onClick={() => handleResolveDecision('APPROVED', 'Credit note')}
                className="py-2.5 rounded-xl bg-sky-600 text-white font-bold text-xs"
              >
                Approve (Credit)
              </button>
            </div>
            <button
              onClick={() => handleResolveDecision('REJECTED', 'Rejected')}
              className="w-full py-2.5 rounded-xl bg-rose-600 text-white font-bold text-xs"
            >
              Reject (No valid unboxing video)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
