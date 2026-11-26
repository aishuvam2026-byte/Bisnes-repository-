import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Order, OrderStatus } from '../types';
import {
  Truck,
  Phone,
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Video,
  DollarSign,
  Package,
  Calendar,
  X,
} from 'lucide-react';

import { DispatchCallSheetModal } from '../components/DispatchCallSheetModal';

export const DeliveryView: React.FC = () => {
  const { orders, updateOrderStatus, showToast, settings } = useApp();

  const [isCallSheetOpen, setIsCallSheetOpen] = useState(false);
  const [selectedOrderForDispatch, setSelectedOrderForDispatch] = useState<Order | null>(null);
  const [balanceReady, setBalanceReady] = useState<boolean>(true);
  const [deliveryCost, setDeliveryCost] = useState<number>(120);
  const [deliveryMode, setDeliveryMode] = useState<string>('Bus Transport');
  const [trackingNotes, setTrackingNotes] = useState<string>('Maa Tarini Bus Nuapatna counter');

  const REFERENCE_TODAY = '2026-03-11';
  const delayedOrders = orders.filter(
    (o) =>
      o.expectedDeliveryDate &&
      o.expectedDeliveryDate < REFERENCE_TODAY &&
      o.status !== 'Delivered' &&
      o.status !== 'Cancelled' &&
      o.status !== 'Returned'
  );

  // 4 Primary Kanban Stages (followed by 5. Delivery Delay below)
  const columns: { label: string; status: OrderStatus; color: string }[] = [
    { label: '1. Order Confirm', status: 'Booked', color: 'border-sky-300 bg-sky-50/40' },
    { label: '2. Dispatch', status: 'Packed', color: 'border-blue-300 bg-blue-50/40' },
    { label: '3. Dispatched', status: 'Dispatched', color: 'border-indigo-300 bg-indigo-50/40' },
    { label: '4. Delivered', status: 'Delivered', color: 'border-emerald-300 bg-emerald-50/40' },
  ];

  // Dispatch day confirm handler (rule #5)
  const handleConfirmDispatchCall = (order: Order, isReady: boolean) => {
    if (isReady) {
      updateOrderStatus(
        order.id,
        'Dispatched',
        `Dispatch confirmed: retailer confirmed balance ready. Sent via ${deliveryMode}. Delivery cost: ₹${deliveryCost}`
      );
      showToast(`Dispatch order #${order.orderNumber} for ${order.shopName} marked as completed!`, 'success');
    } else {
      updateOrderStatus(
        order.id,
        'On Hold',
        'Dispatch call: Retailer balance money is NOT ready. Placed on Hold per Rule #5.'
      );
      showToast(`Order #${order.orderNumber} placed On Hold pending funds`, 'warning');
    }
    setSelectedOrderForDispatch(null);
  };

  return (
    <div className="space-y-4 pb-28">
      {/* Top Banner */}
      <div className="glass-card rounded-3xl p-4.5 border border-white/90 shadow-md">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-sky-500 text-white flex items-center justify-center">
                <Truck className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-slate-900">Wholesale Delivery Board</h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Nuapatna Hub • Bus & Local Vehicle Dispatches • 150 km Radius
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsCallSheetOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs active:scale-95 transition shrink-0"
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Open Call Sheet</span>
          </button>
        </div>

        {/* Unboxing video reminder banner */}
        <div className="mt-3 p-2.5 rounded-2xl bg-sky-50 border border-sky-200 text-xs text-sky-900 flex items-center gap-2">
          <Video className="w-4 h-4 text-sky-600 shrink-0" />
          <span>
            <b>Staff Reminder:</b> Instruct every shopkeeper: "Record continuous uncut unboxing video when opening the sealed parcel."
          </span>
        </div>
      </div>

      {/* 1. Order Confirm -> 2. Dispatch -> 3. Dispatched -> 4. Delivered */}
      <div className="space-y-4">
        {columns.map((col) => {
          const colOrders =
            col.status === 'Booked'
              ? orders.filter(
                  (o) =>
                    o.status === 'Booked' ||
                    o.status === 'Advance Pending' ||
                    o.status === 'On Hold' ||
                    o.status === 'Reschedule'
                )
              : orders.filter((o) => o.status === col.status);

          return (
            <div key={col.status} className={`glass-card rounded-3xl p-4 border ${col.color}`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <span>{col.label}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-slate-700 shadow-xs tabular-nums">
                    {colOrders.length}
                  </span>
                </h3>
              </div>

              <div className="space-y-2.5">
                {colOrders.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2">No orders in this section</p>
                ) : (
                  colOrders.map((ord) => (
                    <div
                      key={ord.id}
                      className="bg-white/95 rounded-2xl p-3 shadow-xs border border-slate-200/80 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] text-slate-400 font-bold">#{ord.orderNumber}</span>
                          <span className="font-bold text-slate-900 text-xs truncate">{ord.shopName}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                          {ord.address || 'Odisha'} • ₹{ord.totalAmount.toLocaleString('en-IN')} (Due: ₹{ord.balanceAmount})
                        </p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {col.status === 'Booked' && (
                          <button
                            onClick={() => updateOrderStatus(ord.id, 'Packed', 'Moved to Dispatch')}
                            className="px-2.5 py-1 rounded-xl bg-blue-600 text-white font-bold text-[11px]"
                          >
                            Move to Dispatch
                          </button>
                        )}
                        {col.status === 'Packed' && (
                          <button
                            onClick={() => setSelectedOrderForDispatch(ord)}
                            className="px-2.5 py-1 rounded-xl bg-indigo-600 text-white font-bold text-[11px]"
                          >
                            Mark Dispatched
                          </button>
                        )}
                        {col.status === 'Dispatched' && (
                          <button
                            onClick={() => updateOrderStatus(ord.id, 'Delivered', 'Delivered safely')}
                            className="px-2.5 py-1 rounded-xl bg-emerald-600 text-white font-bold text-[11px]"
                          >
                            Mark Delivered
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}

        {/* 5. Delivery Delay Section (After Delivered) */}
        <div className="glass-card rounded-3xl p-4 border border-rose-300 bg-rose-50/50 space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-rose-900 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>5. Delivery Delay</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white tabular-nums">
                {delayedOrders.length}
              </span>
            </h3>
            <span className="text-[10px] font-bold text-rose-700">Overdue Orders</span>
          </div>

          {delayedOrders.length === 0 ? (
            <p className="text-xs text-emerald-700 font-semibold py-1">
              No delayed deliveries — all orders are on schedule.
            </p>
          ) : (
            <div className="space-y-2">
              {delayedOrders.map((ord) => {
                const delayDays = Math.max(
                  1,
                  Math.floor(
                    (new Date(REFERENCE_TODAY).getTime() - new Date(ord.expectedDeliveryDate).getTime()) /
                      (1000 * 60 * 60 * 24)
                  )
                );
                return (
                  <div
                    key={ord.id}
                    className="bg-white rounded-2xl p-3 border border-rose-200 flex items-center justify-between gap-2 shadow-2xs"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-[10px] font-bold text-slate-400">#{ord.orderNumber}</span>
                        <span className="font-bold text-slate-900 text-xs truncate">{ord.shopName}</span>
                        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-rose-100 text-rose-700 border border-rose-200">
                          {delayDays}d Delay
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Exp: {ord.expectedDeliveryDate} • Due: ₹{ord.balanceAmount.toLocaleString('en-IN')}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <a
                        href={`tel:${ord.phone}`}
                        className="w-8 h-8 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                      <button
                        type="button"
                        onClick={() => setSelectedOrderForDispatch(ord)}
                        className="px-2.5 py-1.5 rounded-xl bg-rose-600 text-white font-bold text-[11px]"
                      >
                        Dispatch Now
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Dispatch Day Call Confirmation Modal */}
      {selectedOrderForDispatch && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-t-3xl p-4 shadow-2xl border-t border-slate-100 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 mb-2.5">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Dispatch Day Confirmation</h3>
                <p className="text-[11px] text-slate-500">
                  {selectedOrderForDispatch.shopName} • Order #{selectedOrderForDispatch.orderNumber}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrderForDispatch(null)}
                className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 space-y-0.5 mb-3">
              <span className="font-bold block">Business Rule #5:</span>
              <span>
                Call shopkeeper to ask: <b>"Is balance payment of ₹{selectedOrderForDispatch.balanceAmount} ready?"</b>
              </span>
            </div>

            {/* Quick Call Button */}
            <div className="flex gap-2 mb-3">
              <a
                href={`tel:${selectedOrderForDispatch.phone}`}
                className="flex-1 py-2 rounded-xl bg-sky-600 text-white font-bold text-[11px] flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Phone className="w-3.5 h-3.5" /> Call Shop ({selectedOrderForDispatch.phone})
              </a>
              <a
                href={`https://wa.me/91${selectedOrderForDispatch.phone.replace(/\D/g, '')}?text=Namaste!%20Rupam%20Wholesale%20dispatch%20check:%20Is%20balance%20payment%20ready%20for%20order%20${selectedOrderForDispatch.orderNumber}?`}
                target="_blank"
                rel="noreferrer"
                className="py-2 px-3 rounded-xl bg-emerald-600 text-white font-bold text-[11px] flex items-center justify-center gap-1 shadow-xs"
              >
                <MessageSquare className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Ready Yes/No Toggle */}
            <div className="mb-3">
              <label className="text-[11px] font-bold text-slate-700 block mb-1.5">
                Did the shopkeeper confirm balance is ready?
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setBalanceReady(true)}
                  className={`py-2 px-2 rounded-xl font-bold text-[11px] border transition flex items-center justify-center gap-1 ${
                    balanceReady ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' : 'bg-slate-50 text-slate-700'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> YES (Send Parcel)
                </button>
                <button
                  type="button"
                  onClick={() => setBalanceReady(false)}
                  className={`py-2 px-2 rounded-xl font-bold text-[11px] border transition flex items-center justify-center gap-1 ${
                    !balanceReady ? 'bg-rose-600 text-white border-rose-600 shadow-xs' : 'bg-slate-50 text-slate-700'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> NO (On Hold)
                </button>
              </div>
            </div>

            {balanceReady && (
              <div className="space-y-2.5 mb-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 mb-1 block">
                    Delivery Cost Tracker (Bus freight / tempo)
                  </label>
                  <input
                    type="number"
                    value={deliveryCost}
                    onChange={(e) => setDeliveryCost(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 mb-1 block">Transport / Bus Details</label>
                  <input
                    type="text"
                    value={trackingNotes}
                    onChange={(e) => setTrackingNotes(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs"
                  />
                </div>
              </div>
            )}

            <button
              onClick={() => handleConfirmDispatchCall(selectedOrderForDispatch, balanceReady)}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-white font-bold text-xs shadow-md active:scale-98 transition"
            >
              Apply Status Update
            </button>
          </div>
        </div>
      )}

      {/* Dispatch Call Sheet Modal */}
      <DispatchCallSheetModal
        isOpen={isCallSheetOpen}
        onClose={() => setIsCallSheetOpen(false)}
      />
    </div>
  );
};
