import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Sparkles,
  CheckCircle2,
  Phone,
  MessageSquare,
  Play,
  Plus,
  Layers,
  Megaphone,
  FileText,
} from 'lucide-react';
import { DigitalMarketingWork } from '../types';

export const MarketingView: React.FC = () => {
  const {
    role,
    user,
    customers,
    suppliers,
    marketingClients,
    deliverables,
    digitalMarketingServices,
    digitalMarketingWorks,
    applyDigitalMarketingService,
    updateDigitalMarketingWorkStatus,
    incrementDigitalMarketingPost,
  } = useApp();

  const loggedInCustomer = customers.find((c) => c.id === user?.customerId) || customers[0];
  const loggedInSupplier = suppliers.find((s) => s.id === user?.supplierId) || suppliers[0];
  const activeClientId =
    role === 'customer'
      ? loggedInCustomer?.id || ''
      : role === 'supplier'
      ? loggedInSupplier?.id || ''
      : '';

  const [statusFilter, setStatusFilter] = useState<'All' | 'Applied' | 'Running' | 'Completed'>('All');
  const [selectedServiceFilter, setSelectedServiceFilter] = useState<string>('ALL');
  const [showAddJob, setShowAddJob] = useState(false);
  const [clientKey, setClientKey] = useState<string>(() =>
    customers[0] ? `customer:${customers[0].id}` : ''
  );
  const [serviceId, setServiceId] = useState<string>(
    digitalMarketingServices[0]?.id || 'srv-whatsapp'
  );
  const [jobNotes, setJobNotes] = useState('');

  // Scoped works: Owner sees ALL, Retailer/Supplier sees ONLY THIS ID
  const scopedWorks = useMemo(() => {
    if (role === 'owner') return digitalMarketingWorks;
    return digitalMarketingWorks.filter((w) => w.clientId === activeClientId);
  }, [role, digitalMarketingWorks, activeClientId]);

  const scopedDeliverables = useMemo(() => {
    if (role === 'owner') return deliverables;
    const myName =
      role === 'customer' ? loggedInCustomer?.shopName : loggedInSupplier?.name;
    return deliverables.filter(
      (d) => myName && d.clientShopName.toLowerCase() === myName.toLowerCase()
    );
  }, [role, deliverables, loggedInCustomer, loggedInSupplier]);

  const totalMarketingRevenue = useMemo(() => {
    if (role !== 'owner') {
      return scopedWorks.reduce((sum, w) => sum + w.price, 0);
    }
    const subsRev = marketingClients.reduce((sum, c) => sum + c.price, 0);
    const activeWorkRev = digitalMarketingWorks
      .filter((w) => w.status === 'Running' || w.status === 'Completed')
      .reduce((sum, w) => sum + w.price, 0);
    return Math.max(subsRev, activeWorkRev);
  }, [role, scopedWorks, marketingClients, digitalMarketingWorks]);

  const serviceSummaries = useMemo(() => {
    return digitalMarketingServices.map((srv) => {
      const works = digitalMarketingWorks.filter((w) => w.serviceId === srv.id);
      return {
        service: srv,
        totalClients: works.length,
        applied: works.filter((w) => w.status === 'Applied').length,
        running: works.filter((w) => w.status === 'Running').length,
        completed: works.filter((w) => w.status === 'Completed').length,
        postsDone: works.reduce((sum, w) => sum + w.postsDone, 0),
        clients: Array.from(new Set(works.map((w) => w.clientName))),
      };
    });
  }, [digitalMarketingServices, digitalMarketingWorks]);

  const filteredWorks = useMemo(() => {
    return scopedWorks.filter((w) => {
      if (statusFilter !== 'All' && w.status !== statusFilter) return false;
      if (role === 'owner' && selectedServiceFilter !== 'ALL' && w.serviceId !== selectedServiceFilter) {
        return false;
      }
      return true;
    });
  }, [scopedWorks, statusFilter, selectedServiceFilter, role]);

  const handleAssignOrApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (role === 'customer' && loggedInCustomer) {
      applyDigitalMarketingService({
        clientId: loggedInCustomer.id,
        clientRole: 'customer',
        clientName: loggedInCustomer.shopName,
        ownerName: loggedInCustomer.ownerName,
        phone: loggedInCustomer.whatsapp || loggedInCustomer.phone,
        serviceId,
        notes: jobNotes,
      });
    } else if (role === 'supplier' && loggedInSupplier) {
      applyDigitalMarketingService({
        clientId: loggedInSupplier.id,
        clientRole: 'supplier',
        clientName: loggedInSupplier.name,
        ownerName: loggedInSupplier.contactPerson || 'Partner Desk',
        phone: loggedInSupplier.whatsapp || loggedInSupplier.phone,
        serviceId,
        notes: jobNotes,
      });
    } else {
      const [cRole, cId] = clientKey.split(':');
      if (cRole === 'supplier') {
        const supp = suppliers.find((s) => s.id === cId) || suppliers[0];
        if (!supp) return;
        applyDigitalMarketingService({
          clientId: supp.id,
          clientRole: 'supplier',
          clientName: supp.name,
          ownerName: supp.contactPerson || 'Partner Desk',
          phone: supp.whatsapp || supp.phone,
          serviceId,
          notes: jobNotes,
        });
      } else {
        const cust = customers.find((c) => c.id === cId) || customers[0];
        if (!cust) return;
        applyDigitalMarketingService({
          clientId: cust.id,
          clientRole: 'customer',
          clientName: cust.shopName,
          ownerName: cust.ownerName,
          phone: cust.whatsapp || cust.phone,
          serviceId,
          notes: jobNotes,
        });
      }
    }
    setJobNotes('');
    setShowAddJob(false);
  };

  const badgeStyle = (st: DigitalMarketingWork['status']) => {
    switch (st) {
      case 'Applied':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'Running':
        return 'bg-sky-100 text-sky-900 border-sky-300';
      case 'Completed':
        return 'bg-emerald-600 text-white border-emerald-600';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const totalPostsDone = scopedWorks.reduce((s, w) => s + w.postsDone, 0);

  return (
    <div className="space-y-4 pb-28">
      {/* Top Banner */}
      <div className="glass-card rounded-3xl p-4.5 border border-white/90 shadow-md">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-xs font-semibold text-rose-600 uppercase tracking-wider flex items-center gap-1">
              <Megaphone className="w-3.5 h-3.5" />
              {role === 'owner'
                ? 'Owner Digital Marketing Full Detail'
                : `My Digital Marketing Full Detail (${activeClientId})`}
            </span>
            <h2 className="text-lg font-bold text-slate-900 mt-0.5">
              {role === 'owner'
                ? 'All Services • Client Work & Posts Tracker'
                : `${role === 'supplier' ? loggedInSupplier?.name : loggedInCustomer?.shopName}`}
            </h2>
            <p className="text-xs text-slate-500">
              {role === 'owner'
                ? `${digitalMarketingServices.length} Services • ${digitalMarketingWorks.length} Retailer/Supplier Campaigns • ${totalPostsDone} Posts Done`
                : `${scopedWorks.length} Services • ${totalPostsDone} Posts Published for your ID`}
            </p>
          </div>

          <div className="text-right shrink-0">
            <span className="text-[10px] font-bold text-slate-400 block">
              {role === 'owner' ? 'Active Mkt Value' : 'My Plan Value'}
            </span>
            <span className="text-lg font-black text-rose-600 block">
              ₹{totalMarketingRevenue.toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>

      {/* Owner: All Services Offered + Customer Count Table */}
      {role === 'owner' && (
        <div className="glass-card rounded-3xl border border-pink-200/80 overflow-hidden shadow-sm">
          <div className="px-4 py-3 bg-pink-50/90 border-b border-pink-200/70 flex items-center justify-between gap-2">
            <h3 className="text-xs font-extrabold text-pink-900 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-pink-600" />
              Owner Digital Marketing Services & Clients Count
            </h3>
            <button
              type="button"
              onClick={() => setShowAddJob((v) => !v)}
              className="px-2.5 py-1 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-[10px] font-extrabold flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              <span>Add Job</span>
            </button>
          </div>

          <div className="overflow-x-auto bg-white">
            <table className="w-full text-left border-collapse min-w-[520px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold text-slate-600 uppercase">
                  <th className="py-2 px-3">Digital Marketing Service</th>
                  <th className="py-2 px-2 text-center">Clients</th>
                  <th className="py-2 px-2 text-center">Applied</th>
                  <th className="py-2 px-2 text-center">Running</th>
                  <th className="py-2 px-2 text-center">Done</th>
                  <th className="py-2 px-2 text-center">Total Posts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {serviceSummaries.map((row) => (
                  <tr
                    key={row.service.id}
                    onClick={() =>
                      setSelectedServiceFilter((prev) =>
                        prev === row.service.id ? 'ALL' : row.service.id
                      )
                    }
                    className={`cursor-pointer transition ${
                      selectedServiceFilter === row.service.id
                        ? 'bg-pink-50/80'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="py-2.5 px-3">
                      <span className="font-extrabold text-slate-900 block">
                        {row.service.name}
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        ₹{row.service.price}/{row.service.billingCycle} •{' '}
                        {row.clients.length > 0 ? row.clients.join(', ') : 'No customers yet'}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-center font-black text-slate-900">
                      {row.totalClients}
                    </td>
                    <td className="py-2.5 px-2 text-center font-bold text-amber-700">
                      {row.applied}
                    </td>
                    <td className="py-2.5 px-2 text-center font-bold text-sky-700">
                      {row.running}
                    </td>
                    <td className="py-2.5 px-2 text-center font-bold text-emerald-700">
                      {row.completed}
                    </td>
                    <td className="py-2.5 px-2 text-center font-black text-pink-700">
                      {row.postsDone}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Retailer / Supplier: Available Services Catalog + Apply Button */}
      {role !== 'owner' && (
        <div className="glass-card rounded-3xl border border-pink-200/80 overflow-hidden shadow-sm bg-white">
          <div className="px-4 py-3 bg-pink-50/90 border-b border-pink-200/70 flex items-center justify-between gap-2">
            <h3 className="text-xs font-extrabold text-pink-900 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-pink-600" />
              Available Digital Marketing Services
            </h3>
            <button
              type="button"
              onClick={() => setShowAddJob((v) => !v)}
              className="px-2.5 py-1 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-[10px] font-extrabold flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              <span>Apply for Service</span>
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {digitalMarketingServices.map((srv) => (
              <div key={srv.id} className="p-3 flex items-center justify-between gap-2 text-xs">
                <div>
                  <span className="font-extrabold text-slate-900 block">{srv.name}</span>
                  <span className="text-[11px] text-slate-500 block">{srv.description}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setServiceId(srv.id);
                    setShowAddJob(true);
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-pink-50 hover:bg-pink-600 text-pink-700 hover:text-white border border-pink-200 text-[11px] font-extrabold shrink-0 transition"
                >
                  ₹{srv.price} • Apply
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Apply / Assign Form */}
      {showAddJob && (
        <form
          onSubmit={handleAssignOrApply}
          className="glass-card rounded-3xl p-4 bg-white border border-pink-200 space-y-2.5 shadow-sm"
        >
          <span className="text-xs font-black text-slate-900 block">
            {role === 'owner'
              ? 'Assign Digital Marketing Service to Retailer / Supplier'
              : 'Apply for Digital Marketing Service'}
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {role === 'owner' && (
              <select
                value={clientKey}
                onChange={(e) => setClientKey(e.target.value)}
                className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold"
                aria-label="Choose Client"
              >
                <optgroup label="Retailers">
                  {customers.map((c) => (
                    <option key={c.id} value={`customer:${c.id}`}>
                      {c.shopName} ({c.id})
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Suppliers">
                  {suppliers.map((s) => (
                    <option key={s.id} value={`supplier:${s.id}`}>
                      {s.name} ({s.id})
                    </option>
                  ))}
                </optgroup>
              </select>
            )}

            <select
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
              className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold"
              aria-label="Choose Service"
            >
              {digitalMarketingServices.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} (₹{s.price}/{s.billingCycle})
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={jobNotes}
              onChange={(e) => setJobNotes(e.target.value)}
              placeholder="Campaign details / festival offer notes"
              className="flex-1 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-pink-600 text-white font-extrabold text-xs shrink-0"
            >
              {role === 'owner' ? 'Assign' : 'Submit Apply'}
            </button>
          </div>
        </form>
      )}

      {/* Full Client Work Detail Tracker */}
      <div className="glass-card rounded-3xl p-4 border border-white/90 shadow-md space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h3 className="text-sm font-black text-slate-900">
            {role === 'owner'
              ? `Retailer & Supplier Work Details (${filteredWorks.length})`
              : `My Digital Marketing Work Details (${filteredWorks.length})`}
          </h3>
          <div className="flex items-center gap-1 flex-wrap">
            {(['All', 'Applied', 'Running', 'Completed'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-xl text-[10px] font-extrabold border transition ${
                  statusFilter === st
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-600 border-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {filteredWorks.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-500">
            No digital marketing work records found for this filter.
          </div>
        ) : (
          <div className="space-y-2">
            {filteredWorks.map((w) => {
              const pct = Math.min(100, Math.round((w.postsDone / Math.max(1, w.targetPosts)) * 100));
              const phoneDigits = (w.phone || '').replace(/\D/g, '');
              return (
                <div
                  key={w.id}
                  className="p-3 rounded-2xl bg-white border border-slate-200/80 space-y-2 shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-extrabold text-xs sm:text-sm text-slate-900">
                          {w.clientName}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                            w.clientRole === 'supplier'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {w.clientRole === 'supplier' ? 'Supplier' : 'Retailer'}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">{w.clientId}</span>
                      </div>
                      <p className="text-xs font-bold text-pink-700 mt-0.5">{w.serviceName}</p>
                      <p className="text-[11px] text-slate-500">
                        Applied: {w.appliedDate}
                        {w.lastPostDate ? ` • Last Post: ${w.lastPostDate}` : ''} • ₹{w.price}
                      </p>
                      {w.notes && <p className="text-[11px] text-slate-600 mt-0.5">{w.notes}</p>}
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black border shrink-0 ${badgeStyle(w.status)}`}
                    >
                      {w.status}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className="text-slate-700">
                        Posts Published: {w.postsDone} / {w.targetPosts}
                      </span>
                      <span className="text-pink-700">{pct}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mt-1">
                      <div
                        className="h-full bg-gradient-to-r from-pink-500 to-emerald-500 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {role === 'owner' && (
                    <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        {phoneDigits && (
                          <>
                            <a
                              href={`tel:+91${phoneDigits}`}
                              className="px-2.5 py-1 rounded-xl bg-sky-100 text-sky-800 font-bold text-[10px] flex items-center gap-1"
                            >
                              <Phone className="w-3 h-3" />
                              <span>Call</span>
                            </a>
                            <a
                              href={`https://wa.me/91${phoneDigits}`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center gap-1"
                            >
                              <MessageSquare className="w-3 h-3" />
                              <span>WhatsApp</span>
                            </a>
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {w.status === 'Applied' && (
                          <button
                            type="button"
                            onClick={() => updateDigitalMarketingWorkStatus(w.id, 'Running')}
                            className="px-2.5 py-1 rounded-xl bg-sky-600 text-white font-bold text-[10px] flex items-center gap-1"
                          >
                            <Play className="w-3 h-3" />
                            <span>Start Work</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => incrementDigitalMarketingPost(w.id)}
                          className="px-2.5 py-1 rounded-xl bg-emerald-600 text-white font-bold text-[10px]"
                        >
                          +1 Post
                        </button>
                        {w.status !== 'Completed' && (
                          <button
                            type="button"
                            onClick={() => updateDigitalMarketingWorkStatus(w.id, 'Completed')}
                            className="px-2.5 py-1 rounded-xl bg-slate-800 text-white font-bold text-[10px] flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Complete</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Owner: Free Sample Poster Conversion Funnel */}
      {role === 'owner' && (
        <div className="glass-card rounded-3xl p-4 border border-rose-100 shadow-sm">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-rose-500" /> "1 Free Sample Poster" Lead Tracker
          </h3>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-lg font-black text-slate-800 block">4</span>
              <span className="text-[10px] text-slate-500 font-semibold">Offered</span>
            </div>
            <div className="p-2.5 rounded-2xl bg-amber-50 border border-amber-200">
              <span className="text-lg font-black text-amber-700 block">3</span>
              <span className="text-[10px] text-amber-600 font-semibold">Delivered</span>
            </div>
            <div className="p-2.5 rounded-2xl bg-emerald-50 border border-emerald-200">
              <span className="text-lg font-black text-emerald-700 block">2</span>
              <span className="text-[10px] text-emerald-600 font-semibold">Converted</span>
            </div>
          </div>
        </div>
      )}

      {/* Deliverables Tracker (Scoped for Retailer/Supplier, Full for Owner) */}
      <div className="glass-card rounded-3xl p-4.5 border border-white/90 shadow-md">
        <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-1.5">
          <FileText className="w-4 h-4 text-pink-600" />
          <span>{role === 'owner' ? 'Recent Social Deliverables' : 'My Campaign Deliverables'}</span>
        </h3>
        {scopedDeliverables.length === 0 ? (
          <p className="text-xs text-slate-500">No deliverables uploaded for this ID yet.</p>
        ) : (
          <div className="space-y-2">
            {scopedDeliverables.map((d) => (
              <div
                key={d.id}
                className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2 text-xs"
              >
                <div>
                  <span className="font-bold text-slate-900 block">{d.title}</span>
                  <span className="text-[11px] text-slate-500">
                    {d.clientShopName} • Due: {d.dueDate}
                  </span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                    d.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {d.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
