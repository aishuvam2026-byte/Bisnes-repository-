import React from 'react';
import { useApp } from '../context/AppContext';
import {
  AlertTriangle,
  Wallet,
  Package,
  Phone,
  MessageSquare,
  ShoppingBag,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';

export const HubSnapshotView: React.FC = () => {
  const { products, udhaar, orders, setActiveTab } = useApp();

  const lowStockProducts = products.filter(
    (p) => p.isLowStock || p.packetStock <= p.reorderLevel
  );
  const pendingUdhaarList = udhaar.filter((u) => u.status === 'Pending');
  const pendingAdvanceOrders = orders.filter(
    (o) =>
      o.status === 'Advance Pending' ||
      o.status === 'Enquiry' ||
      (o.status === 'Booked' && !o.advancePaid)
  );
  const totalSales = orders.reduce((s, o) => s + o.totalAmount, 0);
  const totalUdhaarPending = pendingUdhaarList.reduce((s, u) => s + u.shortageAmount, 0);

  return (
    <div className="space-y-4 pb-28">
      {/* Banner */}
      <div className="glass-card rounded-3xl p-4.5 border border-sky-200/80 shadow-md bg-gradient-to-br from-sky-50/70 via-white to-amber-50/50">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-[10px] font-extrabold text-sky-700 uppercase tracking-wider flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              Full Detail • Owner Hub Snapshot
            </span>
            <h2 className="text-lg font-black text-slate-900 mt-0.5">
              Low Stock, Pending Udhaar & Dues Ledger
            </h2>
            <p className="text-xs text-slate-600">
              {lowStockProducts.length} Low Stock SKUs • {pendingUdhaarList.length} Udhaar Dues •{' '}
              {pendingAdvanceOrders.length} Advance Pending Orders
            </p>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[10px] font-bold text-slate-500 block">Total Sales</span>
            <span className="text-base font-black text-sky-700">
              ₹{totalSales.toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>

      {/* Section 1: Low Stock Items Full Table */}
      <div className="glass-card rounded-3xl border border-rose-200/80 overflow-hidden shadow-sm bg-white">
        <div className="px-4 py-2.5 bg-rose-50/90 border-b border-rose-200/70 flex items-center justify-between gap-2">
          <span className="text-xs font-extrabold text-rose-900 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            Low Stock Products ({lowStockProducts.length})
          </span>
          <button
            type="button"
            onClick={() => setActiveTab('stock')}
            className="text-xs font-extrabold text-rose-700 hover:underline flex items-center gap-0.5"
          >
            <span>Open Stock</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {lowStockProducts.length === 0 ? (
          <div className="p-4 text-center text-xs text-emerald-700 font-semibold">
            All products are stocked above reorder levels!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[520px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold text-slate-600 uppercase">
                  <th className="py-2 px-3">Product & SKU</th>
                  <th className="py-2 px-3">Brand</th>
                  <th className="py-2 px-3 text-center">Left Stock</th>
                  <th className="py-2 px-3 text-center">Reorder Level</th>
                  <th className="py-2 px-3 text-right">Landed Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {lowStockProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-rose-50/30">
                    <td className="py-2 px-3">
                      <span className="font-extrabold text-slate-900 block">{p.name}</span>
                      <span className="text-[10px] font-mono text-slate-500">{p.sku}</span>
                    </td>
                    <td className="py-2 px-3 text-slate-700">{p.brand}</td>
                    <td className="py-2 px-3 text-center font-black text-rose-600">
                      {p.packetStock} pk
                    </td>
                    <td className="py-2 px-3 text-center font-bold text-slate-600">
                      {p.reorderLevel} pk
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-slate-900">
                      ₹{p.purchaseCost}/pk
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Section 2: Pending Udhaar Dues Full Table */}
      <div className="glass-card rounded-3xl border border-amber-200/80 overflow-hidden shadow-sm bg-white">
        <div className="px-4 py-2.5 bg-amber-50/90 border-b border-amber-200/70 flex items-center justify-between gap-2">
          <span className="text-xs font-extrabold text-amber-900 flex items-center gap-1.5">
            <Wallet className="w-4 h-4 text-amber-700" />
            Pending Udhaar Dues ({pendingUdhaarList.length}) • ₹
            {totalUdhaarPending.toLocaleString('en-IN')}
          </span>
          <button
            type="button"
            onClick={() => setActiveTab('khata')}
            className="text-xs font-extrabold text-amber-800 hover:underline flex items-center gap-0.5"
          >
            <span>Open Khata</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {pendingUdhaarList.length === 0 ? (
          <div className="p-4 text-center text-xs text-emerald-700 font-semibold">
            No pending Udhaar dues!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[540px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold text-slate-600 uppercase">
                  <th className="py-2 px-3">Retailer Shop</th>
                  <th className="py-2 px-3">Order #</th>
                  <th className="py-2 px-3">Date</th>
                  <th className="py-2 px-3 text-right">Due Amount</th>
                  <th className="py-2 px-3 text-right">Contact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {pendingUdhaarList.map((u) => {
                  const digits = (u.phone || '').replace(/\D/g, '');
                  return (
                    <tr key={u.id} className="hover:bg-amber-50/30">
                      <td className="py-2 px-3">
                        <span className="font-extrabold text-slate-900 block">{u.shopName}</span>
                        <span className="text-[10px] text-slate-500">{u.customerName}</span>
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-slate-700">
                        {u.orderNumber}
                      </td>
                      <td className="py-2 px-3 text-slate-600">{u.date}</td>
                      <td className="py-2 px-3 text-right font-black text-amber-800">
                        ₹{u.shortageAmount.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2 px-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <a
                            href={`tel:+91${digits}`}
                            className="p-1.5 rounded-lg bg-sky-100 text-sky-700 hover:bg-sky-600 hover:text-white transition"
                            title={`Call ${u.shopName}`}
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                          <a
                            href={`https://wa.me/91${digits}?text=${encodeURIComponent(
                              `Namaste ${u.customerName} ji (${u.shopName})! Order ${u.orderNumber} ka ₹${u.shortageAmount} Udhaar balance clear karne ka reminder.`
                            )}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-600 hover:text-white transition"
                            title={`WhatsApp ${u.shopName}`}
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Section 3: Advance Pending Orders */}
      <div className="glass-card rounded-3xl border border-sky-200/80 overflow-hidden shadow-sm bg-white">
        <div className="px-4 py-2.5 bg-sky-50/90 border-b border-sky-200/70 flex items-center justify-between gap-2">
          <span className="text-xs font-extrabold text-sky-900 flex items-center gap-1.5">
            <ShoppingBag className="w-4 h-4 text-sky-600" />
            Pending Advance & Enquiry Orders ({pendingAdvanceOrders.length})
          </span>
          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className="text-xs font-extrabold text-sky-700 hover:underline flex items-center gap-0.5"
          >
            <span>Open Orders</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
        {pendingAdvanceOrders.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-500">No pending advance orders.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {pendingAdvanceOrders.map((ord) => (
              <div key={ord.id} className="p-3 flex items-center justify-between gap-2 text-xs">
                <div>
                  <span className="font-extrabold text-slate-900 block">
                    {ord.orderNumber} • {ord.shopName}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Bill ₹{ord.totalAmount.toLocaleString('en-IN')} • Status: {ord.status}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900">
                  Adv: ₹{ord.advanceAmount}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick link to Stock */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setActiveTab('stock')}
          className="px-4 py-2 rounded-2xl bg-slate-900 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-sm"
        >
          <Package className="w-4 h-4" />
          <span>Manage Inventory Stock</span>
        </button>
      </div>
    </div>
  );
};
