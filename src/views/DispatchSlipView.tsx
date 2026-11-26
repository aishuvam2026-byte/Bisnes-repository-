import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Truck,
  Printer,
  Share2,
  Package,
  Phone,
  MapPin,
  AlertOctagon,
  CheckCircle2,
  Calendar,
} from 'lucide-react';

export const DispatchSlipView: React.FC = () => {
  const { orders, settings, showToast, role, user } = useApp();

  const activeCustomerId = user?.customerId || 'cust-demo-1';
  const visibleOrders = role === 'customer'
    ? orders.filter((o) => o.customerId === activeCustomerId)
    : orders;

  const [selectedOrderId, setSelectedOrderId] = useState<string>(
    visibleOrders.length > 0 ? visibleOrders[0].id : ''
  );

  const selectedOrder = visibleOrders.find((o) => o.id === selectedOrderId) || visibleOrders[0];

  const handlePrint = () => {
    window.print();
  };

  const shareSlipWhatsApp = () => {
    if (!selectedOrder) return;
    let msg = `*RUPAM WHOLESALE PARCEL DISPATCH SLIP*\n`;
    msg += `===============================\n`;
    msg += `*Order #:* ${selectedOrder.orderNumber}\n`;
    msg += `*Shop:* ${selectedOrder.shopName}\n`;
    msg += `*Owner:* ${selectedOrder.customerName} (${selectedOrder.phone})\n`;
    msg += `*Destination:* ${selectedOrder.address}, ${selectedOrder.landmark} (${selectedOrder.distanceKm} km)\n`;
    msg += `*Transport:* ${selectedOrder.busOrVehicleNumber || 'Bus / Local Vehicle'}\n`;
    msg += `-------------------------------\n`;
    msg += `*Total Parcel Value:* ₹${selectedOrder.totalAmount}\n`;
    msg += `*Advance Paid:* ₹${selectedOrder.advanceAmount} ✅\n`;
    msg += `*Balance to Pay on Delivery:* ₹${selectedOrder.balanceAmount} 💰\n`;
    msg += `===============================\n`;
    msg += `*⚠️ MANDATORY UNBOXING VIDEO NOTICE:*\n`;
    msg += `Please record a continuous single video from opening the sealed parcel tape to checking all packets. Without video proof, no damage claim is accepted.`;

    const url = `https://wa.me/91${selectedOrder.phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-4 pb-28">
      {/* Top Banner */}
      <div className="glass-card rounded-3xl p-4.5 border border-white/90 shadow-sm relative overflow-hidden bg-gradient-to-br from-amber-500/10 via-sky-500/10 to-transparent">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-full inline-block mb-1">
              Dispatch & Transport Chalan
            </span>
            <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
              Parcel Chalan & Box Label
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Bus aur delivery vahan ke liye parcel box par chipkane wali chalan slip
            </p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-md shadow-amber-500/25 shrink-0">
            <Truck className="w-5 h-5" />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mt-3.5">
          <button
            onClick={shareSlipWhatsApp}
            className="flex-1 py-2.5 px-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/25 active:scale-95 transition"
          >
            <Share2 className="w-4 h-4" /> Share Chalan on WhatsApp
          </button>
          <button
            onClick={handlePrint}
            className="py-2.5 px-3.5 rounded-2xl bg-slate-900 hover:bg-black text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs active:scale-95 transition"
          >
            <Printer className="w-4 h-4" /> Print
          </button>
        </div>
      </div>

      {/* Select Order Dropdown */}
      <div className="glass-card rounded-2xl p-3 border border-white/90">
        <label className="text-[11px] font-bold text-slate-600 block mb-1">
          Dispatch Hetu Order Chunein:
        </label>
        <select
          value={selectedOrderId}
          onChange={(e) => setSelectedOrderId(e.target.value)}
          className="w-full p-2.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
        >
          {visibleOrders.map((o) => (
            <option key={o.id} value={o.id}>
              {o.orderNumber} - {o.shopName} ({o.status} • Bal: ₹{o.balanceAmount})
            </option>
          ))}
        </select>
      </div>

      {/* Printable Parcel Slip */}
      {selectedOrder && (
        <div className="glass-card rounded-3xl p-5 border-2 border-slate-900 shadow-md bg-white space-y-4 print:m-0 print:border-black">
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-3 flex items-start justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                B2B WHOLESALE PARCEL
              </span>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">
                RUPAM COSMETICS
              </h3>
              <p className="text-xs text-slate-600 font-medium">
                Nuapatna, Tigiria, Cuttack, Odisha - 754035
              </p>
              <p className="text-xs text-slate-800 font-bold">
                M: +91-{settings.ownerPhone} (Shuvam Behera)
              </p>
            </div>
            <div className="text-right">
              <span className="text-sm font-black text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-300 inline-block">
                {selectedOrder.orderNumber}
              </span>
              <p className="text-[11px] text-slate-500 mt-1">
                Date: {new Date(selectedOrder.createdAt).toLocaleDateString('en-IN')}
              </p>
            </div>
          </div>

          {/* Delivery To Details */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
              DELIVER TO (Recipient Shop):
            </span>
            <h4 className="text-base font-black text-slate-900">{selectedOrder.shopName}</h4>
            <p className="text-xs font-bold text-slate-800">
              {selectedOrder.customerName} • 📞 {selectedOrder.phone}
            </p>
            <p className="text-xs text-slate-600">
              {selectedOrder.address}, {selectedOrder.landmark} ({selectedOrder.distanceKm} km from Nuapatna)
            </p>
            {selectedOrder.distanceKm > 150 && (
              <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md inline-block mt-1">
                ⚠️ Outside 150km Free Radius
              </span>
            )}
          </div>

          {/* Transport Info */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 block">Transport / Bus:</span>
              <span className="font-bold text-slate-800">
                {selectedOrder.busOrVehicleNumber || 'Local Bus Service'}
              </span>
            </div>
            <div className="p-2.5 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 block">Total Packets:</span>
              <span className="font-bold text-slate-800">
                {selectedOrder.items.reduce((s, it) => s + it.packetQty, 0)} Full Packets
              </span>
            </div>
          </div>

          {/* Amount Box */}
          <div className="p-3.5 rounded-2xl bg-sky-50 border border-sky-200 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-sky-800 uppercase block">
                Balance to Collect (Baki Rakam):
              </span>
              <span className="text-2xl font-black text-sky-950">
                ₹{selectedOrder.balanceAmount.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="text-right text-xs text-slate-600">
              <p>Total: ₹{selectedOrder.totalAmount}</p>
              <p className="text-emerald-700 font-bold">Advance: ₹{selectedOrder.advanceAmount} (Paid)</p>
            </div>
          </div>

          {/* Mandatory Video Warning Box */}
          <div className="p-3 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-900 text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-black text-rose-700">
              <AlertOctagon className="w-4 h-4 shrink-0" />
              <span>Unboxing Video Zaroori (Mandatory Video Proof):</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Parcel kholte samay sealed tape se lekar packet ginne tak ka ek continuous uncut video record karein. Video na hone par damage claim nahi liya jayega.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
