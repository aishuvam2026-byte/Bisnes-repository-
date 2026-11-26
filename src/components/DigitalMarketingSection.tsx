import React, { useMemo } from 'react';
import {
  Megaphone,
  ChevronRight,
  Users,
  Clock,
  PlayCircle,
  CheckCircle2,
  Maximize2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { tr } from '../data/translations';

export const DigitalMarketingSection: React.FC = () => {
  const {
    role,
    user,
    language,
    customers,
    suppliers,
    digitalMarketingServices,
    digitalMarketingWorks,
    openMorePage,
  } = useApp();

  const loggedInCustomer = customers.find((c) => c.id === user?.customerId) || customers[0];
  const loggedInSupplier = suppliers.find((s) => s.id === user?.supplierId) || suppliers[0];

  const activeClientId =
    role === 'customer'
      ? loggedInCustomer?.id || ''
      : role === 'supplier'
      ? loggedInSupplier?.id || ''
      : '';

  const scopedWorks = useMemo(() => {
    if (role === 'owner') return digitalMarketingWorks;
    return digitalMarketingWorks.filter((w) => w.clientId === activeClientId);
  }, [role, digitalMarketingWorks, activeClientId]);

  const serviceOverviewRows = useMemo(() => {
    return digitalMarketingServices.map((srv) => {
      const works = digitalMarketingWorks.filter((w) => w.serviceId === srv.id);
      return {
        id: srv.id,
        name: srv.name,
        clients: works.length,
        running: works.filter((w) => w.status === 'Running').length,
        posts: works.reduce((sum, w) => sum + (w.postsDone || 0), 0),
      };
    });
  }, [digitalMarketingServices, digitalMarketingWorks]);

  const totalApplied = scopedWorks.filter((w) => w.status === 'Applied').length;
  const totalRunning = scopedWorks.filter((w) => w.status === 'Running').length;
  const totalPosts = scopedWorks.reduce((sum, w) => sum + (w.postsDone || 0), 0);

  return (
    <section className="space-y-1.5">
      {/* Table Headline */}
      <div className="flex items-center justify-between px-0.5">
        <div className="flex items-center gap-2 min-w-0">
          <Megaphone className="w-4 h-4 text-rose-600 shrink-0" />
          <h2 className="text-xs sm:text-sm font-bold text-slate-800 truncate">
            {tr('Digital Marketing', language)}
          </h2>
          <span className="text-xs font-bold text-slate-400 tabular-nums">
            {scopedWorks.length}
          </span>
        </div>

        <button
          type="button"
          onClick={() => openMorePage('marketing')}
          className="text-[11px] font-bold text-rose-700 hover:text-rose-900 flex items-center gap-1 whitespace-nowrap shrink-0 transition"
        >
          <Maximize2 className="w-3 h-3" />
          <span>Full Detail</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Compact 4-Column Icon + Count Row */}
        <div
          onClick={() => openMorePage('marketing')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && openMorePage('marketing')}
          className="grid grid-cols-4 divide-x divide-slate-100 cursor-pointer hover:bg-slate-50/60 transition"
        >
          <div className="py-2.5 px-1.5 flex flex-col items-center text-center">
            <Users className="w-3.5 h-3.5 text-slate-500 mb-1" />
            <span className="text-sm font-black text-slate-900 tabular-nums leading-none">
              {scopedWorks.length}
            </span>
            <span className="text-[10px] font-medium text-slate-500 mt-1 truncate max-w-full">
              {role === 'owner' ? 'Clients' : 'Plans'}
            </span>
          </div>

          <div className="py-2.5 px-1.5 flex flex-col items-center text-center">
            <Clock className="w-3.5 h-3.5 text-amber-600 mb-1" />
            <span className="text-sm font-black text-amber-700 tabular-nums leading-none">
              {totalApplied}
            </span>
            <span className="text-[10px] font-medium text-slate-500 mt-1 truncate max-w-full">
              Applied
            </span>
          </div>

          <div className="py-2.5 px-1.5 flex flex-col items-center text-center">
            <PlayCircle className="w-3.5 h-3.5 text-sky-600 mb-1" />
            <span className="text-sm font-black text-sky-700 tabular-nums leading-none">
              {totalRunning}
            </span>
            <span className="text-[10px] font-medium text-slate-500 mt-1 truncate max-w-full">
              Running
            </span>
          </div>

          <div className="py-2.5 px-1.5 flex flex-col items-center text-center">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mb-1" />
            <span className="text-sm font-black text-emerald-700 tabular-nums leading-none">
              {totalPosts}
            </span>
            <span className="text-[10px] font-medium text-slate-500 mt-1 truncate max-w-full">
              Posts
            </span>
          </div>
        </div>

        {/* Short Scannable Table */}
        <div className="border-t border-slate-100">
          {role === 'owner' ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-[10px] font-semibold text-slate-500 border-b border-slate-100">
                  <th className="py-1.5 px-3">Service</th>
                  <th className="py-1.5 px-2 text-right">Clients</th>
                  <th className="py-1.5 px-2 text-right">Live</th>
                  <th className="py-1.5 px-3 text-right">Posts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {serviceOverviewRows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => openMorePage('marketing')}
                    className="hover:bg-slate-50 cursor-pointer transition"
                  >
                    <td className="py-2 px-3 font-semibold text-slate-800 truncate max-w-[160px]">
                      {row.name}
                    </td>
                    <td className="py-2 px-2 text-right font-bold text-slate-900 tabular-nums">
                      {row.clients}
                    </td>
                    <td className="py-2 px-2 text-right font-bold text-sky-700 tabular-nums">
                      {row.running}
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-emerald-700 tabular-nums">
                      {row.posts}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : scopedWorks.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-[10px] font-semibold text-slate-500 border-b border-slate-100">
                  <th className="py-1.5 px-3">Service</th>
                  <th className="py-1.5 px-2 text-right">Posts</th>
                  <th className="py-1.5 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {scopedWorks.slice(0, 3).map((w) => (
                  <tr
                    key={w.id}
                    onClick={() => openMorePage('marketing')}
                    className="hover:bg-slate-50 cursor-pointer transition"
                  >
                    <td className="py-2 px-3 font-semibold text-slate-800 truncate max-w-[170px]">
                      {w.serviceName}
                    </td>
                    <td className="py-2 px-2 text-right font-bold text-slate-900 tabular-nums">
                      {w.postsDone}/{w.targetPosts}
                    </td>
                    <td className="py-2 px-3 text-right font-semibold text-sky-700 whitespace-nowrap">
                      {w.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <button
              type="button"
              onClick={() => openMorePage('marketing')}
              className="w-full py-2.5 px-3 text-xs font-medium text-slate-500 hover:bg-slate-50 flex items-center justify-between transition"
            >
              <span>No active services</span>
              <span className="text-rose-600 font-semibold">Apply</span>
            </button>
          )}
        </div>

        {/* Clean Full Detail Footer Button */}
        <button
          type="button"
          onClick={() => openMorePage('marketing')}
          className="w-full px-3.5 py-2.5 border-t border-slate-100 bg-slate-50/60 hover:bg-rose-50/60 text-xs font-bold text-slate-700 hover:text-rose-700 flex items-center justify-between transition"
        >
          <span className="flex items-center gap-1.5">
            <Maximize2 className="w-3.5 h-3.5 text-rose-600" />
            <span>Full Detail</span>
          </span>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>
      </div>
    </section>
  );
};
