import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Order } from '../types';
import {
  Video,
  Phone,
  MessageSquare,
  CheckCircle2,
  PauseCircle,
  X,
  Send,
  ExternalLink,
  Check,
  Copy,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

interface DispatchCallSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DispatchCallSheetModal: React.FC<DispatchCallSheetModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { orders, updateOrderStatus, showToast } = useApp();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [broadcastActiveIndex, setBroadcastActiveIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  // Filter dispatch candidate orders (On Hold, Dispatched, Packed, Booked)
  const dispatchOrders = orders.filter(
    (o) =>
      o.status === 'On Hold' ||
      o.status === 'Dispatched' ||
      o.status === 'Packed' ||
      o.status === 'Booked'
  );

  // Generate complete WhatsApp dispatch text with items, price, balance, and unboxing video rule
  const generateOrderWhatsAppMessage = (ord: Order) => {
    const itemsList = ord.items
      .map((it, idx) => `${idx + 1}. ${it.productName} - ${it.packetQty} packet (${it.totalPieces || it.packetQty * it.packSize} pcs) = Rs ${it.totalPrice}`)
      .join('\n');

    return `Namaste ${ord.shopName}!
Wholesale Dispatch Update from Rupam Wholesale, Nuapatna.

Order No: ${ord.orderNumber.startsWith('RUP-') ? ord.orderNumber : 'RUP-' + ord.orderNumber}
Dukandar: ${ord.customerName}
Delivery Address: ${ord.address} (${ord.distanceKm} km)

--- ORDER DETAILS ---
${itemsList}

--- PAYMENT SUMMARY ---
Total Order Value: Rs ${ord.totalAmount.toLocaleString('en-IN')}
Advance Paid: Rs ${ord.advanceAmount.toLocaleString('en-IN')} (Verified)
Balance to Collect on Delivery: Rs ${ord.balanceAmount.toLocaleString('en-IN')}

MANDATORY INSTRUCTION:
"Record a continuous unboxing video from sealed parcel opening to checking items. Damage claims cannot be accepted without continuous video proof."

Thank you for doing business with Rupam Wholesale!`;
  };

  // Toggle Confirm Dispatch (YES)
  const handleConfirmYes = (ord: Order) => {
    updateOrderStatus(
      ord.id,
      'Dispatched',
      'Dispatch confirmed: Retailer confirmed balance payment ready. Goods released.'
    );
    showToast(
      `Dispatch order #${ord.orderNumber} for ${ord.shopName} confirmed! Status updated to Dispatched.`,
      'success'
    );
  };

  // Toggle Place On Hold (NO)
  const handleConfirmNo = (ord: Order) => {
    updateOrderStatus(
      ord.id,
      'On Hold',
      'Dispatch call: Retailer balance money not ready. Placed on Hold per Rule 5.'
    );
    showToast(
      `Order #${ord.orderNumber} for ${ord.shopName} placed On Hold pending balance funds.`,
      'warning'
    );
  };

  // 1-Click Send All WhatsApp button
  const handleSendAllWhatsApp = () => {
    if (dispatchOrders.length === 0) {
      showToast('No dispatch orders available to send message.', 'info');
      return;
    }

    // Immediately open WhatsApp for the first shop
    const firstOrder = dispatchOrders[0];
    const firstMsg = generateOrderWhatsAppMessage(firstOrder);
    const cleanPhone = firstOrder.phone.replace(/\D/g, '');
    window.open(`https://wa.me/91${cleanPhone}?text=${encodeURIComponent(firstMsg)}`, '_blank');

    // Activate broadcast tracker queue for the owner
    setBroadcastActiveIndex(0);
    showToast(
      `WhatsApp order details & balance price opened for ${firstOrder.shopName}! Next shops queued.`,
      'success'
    );
  };

  const handleCopyMessage = (ord: Order) => {
    const msg = generateOrderWhatsAppMessage(ord);
    navigator.clipboard.writeText(msg);
    setCopiedId(ord.id);
    showToast(`Order details and price for ${ord.shopName} copied to clipboard!`, 'info');
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-slate-50 sm:rounded-3xl rounded-t-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header bar */}
        <div className="px-4 py-3 bg-white border-b border-slate-200/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-500 to-blue-600 text-white flex items-center justify-center shadow-xs">
              <Phone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-sm">Dispatch Day Call Sheet</h3>
              <p className="text-[11px] text-slate-500">Staff verification before loading parcel van</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable content matching screenshot layout */}
        <div className="p-3 overflow-y-auto space-y-2.5 flex-1">
          {/* Card 1: Mandatory Instruction Banner (Yellow/Amber tint) */}
          <div className="rounded-xl p-2.5 bg-gradient-to-r from-amber-50 via-amber-50/90 to-yellow-50 border border-amber-200/90 shadow-2xs flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Video className="w-3.5 h-3.5" />
            </div>
            <div className="space-y-0.5">
              <h4 className="text-[11px] font-bold text-slate-900 leading-snug">
                Mandatory Instruction to Tell Every Retailer:
              </h4>
              <p className="text-[11px] text-slate-700 leading-snug">
                "Record a continuous unboxing video from sealed parcel opening to checking items. Damage claims cannot be accepted without continuous video proof."
              </p>
            </div>
          </div>

          {/* Card 2: Today's Dispatch Confirmation Subheader + 1-Click Broadcast Button */}
          <div className="rounded-xl p-3 bg-white border border-slate-200/90 shadow-2xs space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="text-xs font-bold text-slate-900">
                  Today's Dispatch Confirmation Call Sheet
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Staff calls each shop before loading goods. Toggle YES to release parcel, or NO to put on hold.
                </p>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 shrink-0">
                {dispatchOrders.length} Shops
              </span>
            </div>

            {/* The Requested Single Button: 1-Click Send All WhatsApp */}
            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleSendAllWhatsApp}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm active:scale-98 transition"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Send WhatsApp Order Details & Price to All Shops ({dispatchOrders.length})</span>
                <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-md font-mono">1 Click</span>
              </button>
              <p className="text-[11px] text-slate-400 text-center mt-1">
                Ek click me sabhi dukan ko unka order items, balance price or continuous unboxing video rule chala jayega.
              </p>
            </div>

            {/* Broadcast Step Tracker (if triggered) */}
            {broadcastActiveIndex !== null && (
              <div className="p-2.5 rounded-xl bg-emerald-50/90 border border-emerald-200 text-xs text-emerald-900 space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="font-bold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span>WhatsApp Broadcast Queue ({broadcastActiveIndex + 1}/{dispatchOrders.length})</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setBroadcastActiveIndex(null)}
                    className="text-[10px] text-emerald-700 hover:underline"
                  >
                    Done
                  </button>
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                  {dispatchOrders.map((ord, idx) => (
                    <button
                      key={ord.id}
                      type="button"
                      onClick={() => {
                        setBroadcastActiveIndex(idx);
                        const msg = generateOrderWhatsAppMessage(ord);
                        window.open(`https://wa.me/91${ord.phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition flex items-center gap-1 ${
                        idx === broadcastActiveIndex
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : idx < broadcastActiveIndex
                          ? 'bg-emerald-100 text-emerald-800 line-through'
                          : 'bg-white text-emerald-800 border border-emerald-200'
                      }`}
                    >
                      <span>{ord.shopName.split(' ')[0]}</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Cards List matching the user's screenshot */}
          <div className="space-y-3">
            {dispatchOrders.map((ord) => {
              const formattedOrderNum = ord.orderNumber.startsWith('RUP-')
                ? ord.orderNumber
                : `RUP-${ord.orderNumber}`;

              const isDispatched = ord.status === 'Dispatched';
              const isOnHold = ord.status === 'On Hold';

              return (
                <div
                  key={ord.id}
                  className="rounded-xl p-3 bg-white border border-slate-200/90 shadow-2xs space-y-2.5"
                >
                  {/* Top row: Order Number + Status on left, Balance to collect on right */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm font-mono tracking-tight">
                          {formattedOrderNum}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isDispatched
                              ? 'bg-sky-100 text-sky-800 border border-sky-200'
                              : isOnHold
                              ? 'bg-sky-100 text-sky-800 border border-sky-200'
                              : 'bg-slate-100 text-slate-800 border border-slate-200'
                          }`}
                        >
                          {ord.status}
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-900 text-sm mt-1">{ord.shopName}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {ord.customerName} • {ord.address} ({ord.distanceKm} km)
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[11px] text-slate-400 font-medium block">
                        Balance to collect
                      </span>
                      <span className="text-base font-black text-amber-700 block">
                        ₹{ord.balanceAmount.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  {/* Action buttons row: Call Dukandar & WhatsApp Call Note */}
                  <div className="grid grid-cols-2 gap-2">
                    <a
                      href={`tel:${ord.phone}`}
                      className="py-2 px-3 rounded-xl bg-sky-50 hover:bg-sky-100 border border-sky-100 text-sky-800 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition"
                    >
                      <Phone className="w-3.5 h-3.5 text-sky-600" />
                      <span>Call Dukandar</span>
                    </a>
                    <a
                      href={`https://wa.me/91${ord.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                        generateOrderWhatsAppMessage(ord)
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      className="py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                      <span>WhatsApp Call Note</span>
                    </a>
                  </div>

                  {/* Horizontal divider */}
                  <div className="border-t border-slate-200"></div>

                  {/* Prompt & Toggle buttons matching screenshot */}
                  <div>
                    <p className="text-[11px] font-semibold text-slate-800 mb-1.5">
                      Is balance payment ready?
                    </p>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleConfirmYes(ord)}
                        className={`py-2 px-2 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1 transition active:scale-95 border ${
                          isDispatched
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>YES: Confirm Dispatch</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleConfirmNo(ord)}
                        className={`py-2 px-2 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1 transition active:scale-95 border ${
                          isOnHold
                            ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                            : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                        }`}
                      >
                        <PauseCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>NO: Place On Hold</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-white border-t border-slate-200/80 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500 font-medium">
            Rule 5: Nuapatna Hub balance verification
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition"
          >
            Close Sheet
          </button>
        </div>
      </div>
    </div>
  );
};
