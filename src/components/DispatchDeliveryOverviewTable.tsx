import React from 'react';
import { Order, SupplierPurchaseOrder } from '../types';
import {
  Truck,
  CheckCircle2,
  PackageCheck,
  Send,
  BadgeCheck,
  AlertTriangle,
} from 'lucide-react';

export type DispatchOverviewStage =
  | 'Order Confirm'
  | 'Dispatch'
  | 'Dispatched'
  | 'Delivered'
  | 'Delivery Delay';

interface DispatchDeliveryOverviewTableProps {
  mode: 'orders' | 'supplierPOs';
  orders?: Order[];
  supplierOrders?: SupplierPurchaseOrder[];
  title?: string;
  onStageClick?: (stage: DispatchOverviewStage) => void;
}

const REFERENCE_TODAY = '2026-11-09';

export const DispatchDeliveryOverviewTable: React.FC<DispatchDeliveryOverviewTableProps> = ({
  mode,
  orders = [],
  supplierOrders = [],
  title = 'Dispatches & Delivery Overview',
  onStageClick,
}) => {
  const unitLabel = mode === 'supplierPOs' ? 'POs' : 'Orders';

  const stages =
    mode === 'orders'
      ? (() => {
          const confirmList = orders.filter(
            (o) =>
              o.status === 'Booked' ||
              o.status === 'Advance Pending' ||
              o.status === 'Enquiry' ||
              o.status === 'On Hold' ||
              o.status === 'Reschedule'
          );
          const dispatchList = orders.filter((o) => o.status === 'Packed');
          const dispatchedList = orders.filter((o) => o.status === 'Dispatched');
          const deliveredList = orders.filter((o) => o.status === 'Delivered');
          const delayList = orders.filter(
            (o) =>
              o.expectedDeliveryDate &&
              o.expectedDeliveryDate < REFERENCE_TODAY &&
              o.status !== 'Delivered' &&
              o.status !== 'Cancelled' &&
              o.status !== 'Returned'
          );

          const sumAmt = (list: Order[]) =>
            list.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

          return [
            {
              key: 'Order Confirm' as DispatchOverviewStage,
              count: confirmList.length,
              amount: sumAmt(confirmList),
              icon: CheckCircle2,
              boxClass: 'bg-sky-50/70 border-sky-200/90 hover:bg-sky-50',
              labelClass: 'text-sky-700',
              valueClass: 'text-sky-950',
              iconClass: 'text-sky-600',
            },
            {
              key: 'Dispatch' as DispatchOverviewStage,
              count: dispatchList.length,
              amount: sumAmt(dispatchList),
              icon: PackageCheck,
              boxClass: 'bg-blue-50/70 border-blue-200/90 hover:bg-blue-50',
              labelClass: 'text-blue-700',
              valueClass: 'text-blue-950',
              iconClass: 'text-blue-600',
            },
            {
              key: 'Dispatched' as DispatchOverviewStage,
              count: dispatchedList.length,
              amount: sumAmt(dispatchedList),
              icon: Send,
              boxClass: 'bg-indigo-50/70 border-indigo-200/90 hover:bg-indigo-50',
              labelClass: 'text-indigo-700',
              valueClass: 'text-indigo-950',
              iconClass: 'text-indigo-600',
            },
            {
              key: 'Delivered' as DispatchOverviewStage,
              count: deliveredList.length,
              amount: sumAmt(deliveredList),
              icon: BadgeCheck,
              boxClass: 'bg-emerald-50/70 border-emerald-200/90 hover:bg-emerald-50',
              labelClass: 'text-emerald-700',
              valueClass: 'text-emerald-950',
              iconClass: 'text-emerald-600',
            },
            {
              key: 'Delivery Delay' as DispatchOverviewStage,
              count: delayList.length,
              amount: sumAmt(delayList),
              icon: AlertTriangle,
              boxClass: 'bg-rose-50/70 border-rose-200/90 hover:bg-rose-50',
              labelClass: 'text-rose-700',
              valueClass: 'text-rose-950',
              iconClass: 'text-rose-600',
            },
          ];
        })()
      : (() => {
          const confirmList = supplierOrders.filter((po) => po.status === 'Draft');
          const dispatchList = supplierOrders.filter((po) => po.status === 'Confirmed');
          const dispatchedList = supplierOrders.filter(
            (po) => po.status === 'Dispatched' || po.status === 'In Transit'
          );
          const deliveredList = supplierOrders.filter(
            (po) =>
              po.status === 'Received at Hub' ||
              po.status === 'Inspected' ||
              po.status === 'Settled'
          );
          const delayList = supplierOrders.filter(
            (po) =>
              po.expectedDate &&
              po.expectedDate < REFERENCE_TODAY &&
              po.status !== 'Received at Hub' &&
              po.status !== 'Inspected' &&
              po.status !== 'Settled'
          );

          const sumAmt = (list: SupplierPurchaseOrder[]) =>
            list.reduce((sum, po) => sum + (po.totalAmount || 0), 0);

          return [
            {
              key: 'Order Confirm' as DispatchOverviewStage,
              count: confirmList.length,
              amount: sumAmt(confirmList),
              icon: CheckCircle2,
              boxClass: 'bg-sky-50/70 border-sky-200/90 hover:bg-sky-50',
              labelClass: 'text-sky-700',
              valueClass: 'text-sky-950',
              iconClass: 'text-sky-600',
            },
            {
              key: 'Dispatch' as DispatchOverviewStage,
              count: dispatchList.length,
              amount: sumAmt(dispatchList),
              icon: PackageCheck,
              boxClass: 'bg-blue-50/70 border-blue-200/90 hover:bg-blue-50',
              labelClass: 'text-blue-700',
              valueClass: 'text-blue-950',
              iconClass: 'text-blue-600',
            },
            {
              key: 'Dispatched' as DispatchOverviewStage,
              count: dispatchedList.length,
              amount: sumAmt(dispatchedList),
              icon: Send,
              boxClass: 'bg-indigo-50/70 border-indigo-200/90 hover:bg-indigo-50',
              labelClass: 'text-indigo-700',
              valueClass: 'text-indigo-950',
              iconClass: 'text-indigo-600',
            },
            {
              key: 'Delivered' as DispatchOverviewStage,
              count: deliveredList.length,
              amount: sumAmt(deliveredList),
              icon: BadgeCheck,
              boxClass: 'bg-emerald-50/70 border-emerald-200/90 hover:bg-emerald-50',
              labelClass: 'text-emerald-700',
              valueClass: 'text-emerald-950',
              iconClass: 'text-emerald-600',
            },
            {
              key: 'Delivery Delay' as DispatchOverviewStage,
              count: delayList.length,
              amount: sumAmt(delayList),
              icon: AlertTriangle,
              boxClass: 'bg-rose-50/70 border-rose-200/90 hover:bg-rose-50',
              labelClass: 'text-rose-700',
              valueClass: 'text-rose-950',
              iconClass: 'text-rose-600',
            },
          ];
        })();

  const totalCount = mode === 'supplierPOs' ? supplierOrders.length : orders.length;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      <div className="px-3.5 py-2.5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Truck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
          <h3 className="text-[11px] sm:text-xs font-extrabold text-slate-800 truncate">
            {title}
          </h3>
        </div>
        <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 tabular-nums shrink-0">
          {totalCount} {unitLabel}
        </span>
      </div>

      <div className="p-2.5 grid grid-cols-2 sm:grid-cols-5 gap-2">
        {stages.map((stage) => {
          const Icon = stage.icon;
          const isInteractive = Boolean(onStageClick);
          return (
            <button
              key={stage.key}
              type="button"
              disabled={!isInteractive}
              onClick={() => onStageClick?.(stage.key)}
              className={`p-2.5 rounded-xl border text-left transition ${stage.boxClass} ${
                isInteractive ? 'cursor-pointer active:scale-[0.98]' : 'cursor-default'
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span
                  className={`text-[9px] font-bold uppercase tracking-wider truncate ${stage.labelClass}`}
                >
                  {stage.key}
                </span>
                <Icon className={`w-3 h-3 shrink-0 ${stage.iconClass}`} />
              </div>
              <span
                className={`text-sm sm:text-base font-black block mt-1 tabular-nums leading-tight ${stage.valueClass}`}
              >
                {stage.count} {unitLabel}
              </span>
              <span className="text-[10px] font-semibold text-slate-500 block mt-0.5 tabular-nums truncate">
                ₹{stage.amount.toLocaleString('en-IN')}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
