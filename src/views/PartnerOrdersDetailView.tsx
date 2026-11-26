import React from 'react';
import { useApp } from '../context/AppContext';
import {
  ShoppingBag,
  Truck,
  Package,
  FileText,
  Phone,
  MessageSquare,
  ChevronRight,
} from 'lucide-react';

export const PartnerOrdersDetailView: React.FC = () => {
  const {
    role,
    user,
    customers,
    suppliers,
    orders,
    supplierOrders,
    products,
    settings,
    openMorePage,
    setActiveTab,
    setActiveSubPage,
  } = useApp();

  if (role === 'supplier') {
    const loggedInSupplier = suppliers.find((s) => s.id === user?.supplierId) || suppliers[0];
    const myPOs = supplierOrders.filter((po) => po.supplierId === loggedInSupplier.id);
    const mySuppliedProducts = products.filter(
      (p) =>
        p.supplierId === loggedInSupplier.id ||
        (p.brand && loggedInSupplier.brands?.includes(p.brand))
    );

    return (
      <div className="space-y-4 pb-28">
        <div className="glass-card rounded-3xl p-4.5 border border-purple-200/80 shadow-md bg-gradient-to-br from-purple-50/70 via-white to-indigo-50/50">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[10px] font-extrabold text-purple-700 uppercase tracking-wider block">
                Full Detail • Supplier ID: {loggedInSupplier.id}
              </span>
              <h2 className="text-lg font-black text-slate-900 mt-0.5">
                My Supply Orders, Bilty & Hub Stock
              </h2>
              <p className="text-xs text-slate-600">
                {loggedInSupplier.name} • {myPOs.length} POs • {mySuppliedProducts.length} Supplied SKUs
              </p>
            </div>
            <button
              type="button"
              onClick={() => openMorePage('invoices')}
              className="px-3 py-1.5 rounded-xl bg-purple-600 text-white text-xs font-extrabold shrink-0"
            >
              View Bills
            </button>
          </div>
        </div>

        {/* Full POs Table (Strictly THIS Supplier ID) */}
        <div className="glass-card rounded-3xl border border-purple-200/80 overflow-hidden shadow-sm bg-white">
          <div className="px-4 py-2.5 bg-slate-900 text-white flex items-center justify-between gap-2">
            <span className="text-xs font-extrabold flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-purple-300" />
              All Purchase Orders & Item Breakdown ({myPOs.length})
            </span>
            <span className="text-[10px] text-purple-300 font-mono">{loggedInSupplier.id}</span>
          </div>
          {myPOs.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-500">No purchase orders yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold text-slate-600 uppercase">
                    <th className="py-2 px-3">PO #</th>
                    <th className="py-2 px-3">Date / Expected</th>
                    <th className="py-2 px-3">Items & Packets</th>
                    <th className="py-2 px-3">Total Lot</th>
                    <th className="py-2 px-3">Advance</th>
                    <th className="py-2 px-3">Balance Due</th>
                    <th className="py-2 px-3">Bilty & Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {myPOs.map((po) => (
                    <tr key={po.id} className="hover:bg-purple-50/30">
                      <td className="py-2 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {po.poNumber}
                      </td>
                      <td className="py-2 px-3 text-slate-600 whitespace-nowrap">
                        <span className="block">{po.orderDate}</span>
                        <span className="text-[10px] text-slate-400">ETA: {po.expectedDate}</span>
                      </td>
                      <td className="py-2 px-3 text-slate-700">
                        {po.items.map((it) => `${it.productName} (${it.packets}pk)`).join(', ')}
                      </td>
                      <td className="py-2 px-3 font-black text-slate-900 whitespace-nowrap">
                        ₹{po.totalAmount.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2 px-3 font-bold text-emerald-700 whitespace-nowrap">
                        ₹{po.advancePaid.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2 px-3 font-bold text-purple-800 whitespace-nowrap">
                        ₹{po.balanceDue.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-900 block w-fit">
                          {po.status}
                        </span>
                        {po.biltyNumber && (
                          <span className="text-[10px] font-mono text-slate-500">
                            {po.biltyNumber}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Supplied Products at Hub */}
        <div className="glass-card rounded-3xl border border-indigo-200/80 overflow-hidden shadow-sm bg-white">
          <div className="px-4 py-2.5 bg-indigo-50/90 border-b border-indigo-200/70 flex items-center justify-between gap-2">
            <span className="text-xs font-extrabold text-indigo-900 flex items-center gap-1.5">
              <Package className="w-4 h-4 text-indigo-600" />
              My Supplied Products Stock at Hub ({mySuppliedProducts.length})
            </span>
          </div>
          {mySuppliedProducts.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-500">No supplied products linked yet.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {mySuppliedProducts.map((p) => (
                <div key={p.id} className="p-3 flex items-center justify-between gap-2 text-xs">
                  <div>
                    <span className="font-extrabold text-slate-900 block">{p.name}</span>
                    <span className="text-[11px] text-slate-500">
                      {p.brand} • Pack of {p.packSize} • SKU: {p.sku}
                    </span>
                  </div>
                  <div className="text-right">
                    <span
                      className={`font-black block ${
                        p.isLowStock || p.packetStock <= p.reorderLevel
                          ? 'text-rose-600'
                          : 'text-emerald-700'
                      }`}
                    >
                      {p.packetStock} pk
                    </span>
                    <span className="text-[10px] text-slate-500">Cost ₹{p.purchaseCost}/pk</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Retailer Full Orders & Item Details (Strictly THIS Retailer ID)
  const loggedInCustomer = customers.find((c) => c.id === user?.customerId) || customers[0];
  const myOrders = orders.filter(
    (o) =>
      o.customerId === loggedInCustomer.id ||
      (loggedInCustomer.phone && o.phone === loggedInCustomer.phone)
  );

  return (
    <div className="space-y-4 pb-28">
      <div className="glass-card rounded-3xl p-4.5 border border-sky-200/80 shadow-md bg-gradient-to-br from-sky-50/70 via-white to-amber-50/40">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-[10px] font-extrabold text-sky-700 uppercase tracking-wider block">
              Full Detail • Retailer ID: {loggedInCustomer.id}
            </span>
            <h2 className="text-lg font-black text-slate-900 mt-0.5">
              My Full Orders, Items & Tracking Ledger
            </h2>
            <p className="text-xs text-slate-600">
              {loggedInCustomer.shopName} • {myOrders.length} Total Orders
            </p>
          </div>
          <button
            type="button"
            onClick={() => openMorePage('invoices')}
            className="px-3 py-1.5 rounded-xl bg-sky-600 text-white text-xs font-extrabold flex items-center gap-1 shrink-0"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>GST Bills</span>
          </button>
        </div>
      </div>

      <div className="glass-card rounded-3xl border border-sky-200/80 overflow-hidden shadow-sm bg-white">
        <div className="px-4 py-2.5 bg-slate-900 text-white flex items-center justify-between gap-2">
          <span className="text-xs font-extrabold flex items-center gap-1.5">
            <ShoppingBag className="w-4 h-4 text-sky-300" />
            My Complete Orders Table ({myOrders.length})
          </span>
          <span className="text-[10px] text-sky-300 font-mono">{loggedInCustomer.id}</span>
        </div>

        {myOrders.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-500">No orders placed yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold text-slate-600 uppercase">
                  <th className="py-2 px-3">Order #</th>
                  <th className="py-2 px-3">Date</th>
                  <th className="py-2 px-3">Items Breakdown</th>
                  <th className="py-2 px-3">Bill Total</th>
                  <th className="py-2 px-3">Advance Paid</th>
                  <th className="py-2 px-3">Balance Due</th>
                  <th className="py-2 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {myOrders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-sky-50/40">
                    <td className="py-2 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {ord.orderNumber}
                    </td>
                    <td className="py-2 px-3 text-slate-600 whitespace-nowrap">
                      {(ord.createdAt || '').split('T')[0]}
                    </td>
                    <td className="py-2 px-3 text-slate-700">
                      {ord.items.map((it) => `${it.productName} (${it.packetQty}pk)`).join(', ')}
                    </td>
                    <td className="py-2 px-3 font-black text-slate-900 whitespace-nowrap">
                      ₹{ord.totalAmount.toLocaleString('en-IN')}
                    </td>
                    <td className="py-2 px-3 font-bold text-emerald-700 whitespace-nowrap">
                      ₹{ord.advanceAmount.toLocaleString('en-IN')}
                    </td>
                    <td className="py-2 px-3 font-bold text-amber-700 whitespace-nowrap">
                      ₹{ord.balanceAmount.toLocaleString('en-IN')}
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-sky-100 text-sky-900">
                        {ord.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <a
            href={`tel:${settings.ownerPhone}`}
            className="px-3.5 py-2 rounded-2xl bg-sky-600 text-white font-bold text-xs flex items-center gap-1.5"
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Call Owner</span>
          </a>
          <a
            href={`https://wa.me/91${settings.ownerPhone.replace(/\D/g, '')}`}
            target="_blank"
            rel="noreferrer"
            className="px-3.5 py-2 rounded-2xl bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>WhatsApp Hub</span>
          </a>
        </div>

        <button
          type="button"
          onClick={() => {
            setActiveSubPage(null);
            setActiveTab('orders');
          }}
          className="px-4 py-2 rounded-2xl bg-slate-900 text-white font-extrabold text-xs flex items-center gap-1"
        >
          <span>Open Orders Tab</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
