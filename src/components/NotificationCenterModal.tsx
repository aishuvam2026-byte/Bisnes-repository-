import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { tr } from '../data/translations';
import { AppNotification } from '../types';
import {
  X,
  CheckCircle,
  Bell,
  Truck,
  AlertTriangle,
  CreditCard,
  ShoppingBag,
  Trash2,
  ArrowRight,
  Flame,
  Clock,
  History,
  Wallet,
} from 'lucide-react';

type NotifFilterKey =
  | 'all'
  | 'recent'
  | 'old'
  | 'high'
  | 'order'
  | 'stock'
  | 'udhaar'
  | 'payment'
  | 'dispatch';

const MAIN_TABS = new Set(['home', 'orders', 'stock', 'catalogue', 'khata', 'more']);

const PAGE_LABELS: Record<string, string> = {
  home: 'Home',
  orders: 'Orders',
  stock: 'Stock',
  catalogue: 'Stock Catalogue',
  khata: 'Khata',
  more: 'More Tools',
  delivery: 'Delivery Board',
  invoices: 'Invoices',
  returns: 'Returns & Damage',
  suppliers: 'Suppliers',
  expenses: 'Expenses',
  reports: 'Reports',
  settings: 'Settings',
  enquiries: 'Chatbot Inbox',
  customers: 'Retailers',
  customerHub: 'Retailer & Supplier Hub',
  landedCost: 'Landed Cost',
};

const isRecentNotif = (n: AppNotification): boolean => {
  const ts = (n.timestamp || '').toLowerCase();
  return ts.startsWith('today') || ts.includes('just now') || ts.includes('min') || ts.includes('hr');
};

const isHighNotif = (n: AppNotification): boolean => n.priority === 'high';

export const NotificationCenterModal: React.FC = () => {
  const {
    isNotificationCenterOpen,
    setIsNotificationCenterOpen,
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
    setActiveTab,
    setActiveSubPage,
    openMorePage,
    language,
  } = useApp();

  const [activeFilter, setActiveFilter] = useState<NotifFilterKey>('all');
  const [selectedNotifId, setSelectedNotifId] = useState<string | null>(null);

  const counts = useMemo(() => {
    const recent = notifications.filter(isRecentNotif).length;
    const old = notifications.filter((n) => !isRecentNotif(n)).length;
    const high = notifications.filter(isHighNotif).length;
    const order = notifications.filter((n) => n.type === 'order').length;
    const stock = notifications.filter((n) => n.type === 'stock').length;
    const udhaar = notifications.filter((n) => n.type === 'udhaar').length;
    const payment = notifications.filter((n) => n.type === 'payment').length;
    const dispatch = notifications.filter((n) => n.type === 'dispatch').length;
    return {
      all: notifications.length,
      recent,
      old,
      high,
      order,
      stock,
      udhaar,
      payment,
      dispatch,
    };
  }, [notifications]);

  const filteredNotifs = useMemo(() => {
    switch (activeFilter) {
      case 'recent':
        return notifications.filter(isRecentNotif);
      case 'old':
        return notifications.filter((n) => !isRecentNotif(n));
      case 'high':
        return notifications.filter(isHighNotif);
      case 'order':
      case 'stock':
      case 'udhaar':
      case 'payment':
      case 'dispatch':
        return notifications.filter((n) => n.type === activeFilter);
      default:
        return notifications;
    }
  }, [notifications, activeFilter]);

  if (!isNotificationCenterOpen) return null;

  const filterTabs: Array<{
    key: NotifFilterKey;
    label: string;
    count: number;
    badgeTone?: string;
  }> = [
    { key: 'all', label: tr('All', language), count: counts.all },
    { key: 'recent', label: tr('Recent', language), count: counts.recent },
    { key: 'old', label: tr('Old', language), count: counts.old },
    {
      key: 'high',
      label: tr('High', language),
      count: counts.high,
      badgeTone: 'text-rose-700 bg-rose-100 border-rose-200',
    },
    { key: 'dispatch', label: tr('Dispatch', language), count: counts.dispatch },
    { key: 'stock', label: tr('Stock', language), count: counts.stock },
    { key: 'udhaar', label: tr('Udhaar', language), count: counts.udhaar },
    { key: 'payment', label: tr('Payment', language), count: counts.payment },
    { key: 'order', label: tr('Orders', language), count: counts.order },
  ];

  const getIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'dispatch':
        return <Truck className="w-4 h-4 text-sky-600" />;
      case 'stock':
        return <AlertTriangle className="w-4 h-4 text-amber-600" />;
      case 'udhaar':
        return <CreditCard className="w-4 h-4 text-rose-600" />;
      case 'payment':
        return <Wallet className="w-4 h-4 text-emerald-600" />;
      default:
        return <ShoppingBag className="w-4 h-4 text-blue-600" />;
    }
  };

  const getCategoryTag = (type: AppNotification['type']) => {
    switch (type) {
      case 'dispatch':
        return { label: tr('Dispatch', language), cls: 'bg-sky-50 text-sky-800 border-sky-200' };
      case 'stock':
        return { label: tr('Stock', language), cls: 'bg-amber-50 text-amber-800 border-amber-200' };
      case 'udhaar':
        return { label: tr('Udhaar', language), cls: 'bg-rose-50 text-rose-800 border-rose-200' };
      case 'payment':
        return { label: tr('Payment', language), cls: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
      default:
        return { label: tr('Orders', language), cls: 'bg-blue-50 text-blue-800 border-blue-200' };
    }
  };

  const handleSelectRow = (id: string) => {
    setSelectedNotifId((prev) => (prev === id ? null : id));
  };

  const handleOpenNotifPage = (e: React.MouseEvent, notif: AppNotification) => {
    e.stopPropagation();
    markNotificationRead(notif.id);
    setSelectedNotifId(null);
    setIsNotificationCenterOpen(false);
    if (notif.linkTab) {
      if (MAIN_TABS.has(notif.linkTab)) {
        setActiveSubPage(null);
        setActiveTab(notif.linkTab);
      } else {
        openMorePage(notif.linkTab);
      }
    }
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (selectedNotifId === id) {
      setSelectedNotifId(null);
    }
    deleteNotification(id);
  };

  const recentGroup = filteredNotifs.filter(isRecentNotif);
  const oldGroup = filteredNotifs.filter((n) => !isRecentNotif(n));

  const renderNotifCard = (n: AppNotification) => {
    const isSelected = selectedNotifId === n.id;
    const cat = getCategoryTag(n.type);
    const targetPageName = n.linkTab ? PAGE_LABELS[n.linkTab] || n.linkTab : 'App';

    return (
      <div
        key={n.id}
        onClick={() => handleSelectRow(n.id)}
        className={`p-3 rounded-2xl border transition cursor-pointer space-y-2 ${
          isSelected
            ? 'bg-sky-50/90 border-sky-400 ring-1 ring-sky-300 shadow-sm'
            : n.read
            ? 'bg-slate-50/75 border-slate-200/70 text-slate-600 hover:bg-slate-100/70'
            : 'bg-white border-sky-200 text-slate-900 shadow-xs hover:border-sky-300'
        }`}
      >
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-white border border-slate-200/80 flex items-center justify-center shrink-0 mt-0.5">
            {getIcon(n.type)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-1.5 min-w-0">
                {!n.read && <span className="w-2 h-2 rounded-full bg-sky-600 shrink-0" />}
                <span className="font-bold text-xs text-slate-900 truncate">{n.title}</span>
              </div>
              <span className="text-[10px] text-slate-400 shrink-0">{n.timestamp}</span>
            </div>

            <p className="text-xs text-slate-600 mt-0.5 leading-snug">{n.message}</p>

            {/* Tags row: Category + Priority + Target hint */}
            <div className="flex items-center flex-wrap gap-1.5 mt-1.5">
              <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-extrabold border ${cat.cls}`}>
                {cat.label}
              </span>
              {isHighNotif(n) && (
                <span className="px-1.5 py-0.5 rounded-md text-[9px] font-extrabold bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-0.5">
                  <Flame className="w-2.5 h-2.5" />
                  {tr('High', language)}
                </span>
              )}
              <span className="text-[9px] text-slate-400 font-semibold">
                • {targetPageName}
              </span>
            </div>
          </div>

          {/* Delete Icon Button */}
          <button
            type="button"
            onClick={(e) => handleDelete(e, n.id)}
            className="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/80 flex items-center justify-center shrink-0 active:scale-95 transition"
            aria-label={tr('Delete', language)}
            title={tr('Delete', language)}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Expanded Action Row when Clicked: Show explicit "Open" button */}
        {isSelected && (
          <div className="pt-2 border-t border-sky-200/80 flex items-center justify-between gap-2">
            <span className="text-[10px] font-semibold text-sky-900 truncate">
              {tr('Go to', language)}: <strong>{targetPageName}</strong>
            </span>
            <button
              type="button"
              onClick={(e) => handleOpenNotifPage(e, n)}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white font-black text-xs flex items-center gap-1 shadow-sm active:scale-95 transition shrink-0"
            >
              <span>{tr('Open', language)}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/45 backdrop-blur-xs">
      <div
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 flex flex-col max-h-[86vh] overflow-hidden"
        role="dialog"
        aria-label={tr('Notifications', language)}
      >
        {/* Header */}
        <div className="p-3.5 sm:p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
              <Bell className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-slate-900 text-sm sm:text-base truncate">
                  {tr('Notifications', language)}
                </h3>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-sky-600 text-white">
                  {counts.all}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 truncate">
                {language === 'hi'
                  ? 'Click karke Open dabayein ya Delete karein'
                  : language === 'or'
                  ? 'Click kari Open dabantu ba Delete karantu'
                  : 'Tap any alert to show Open button, or delete'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={markAllNotificationsRead}
              className="text-[11px] text-sky-600 hover:text-sky-800 font-bold"
            >
              {tr('Mark all read', language)}
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedNotifId(null);
                setIsNotificationCenterOpen(false);
              }}
              className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-500 flex items-center justify-center"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Top Category-Wise Filter Bar: All first, then Recent, Old, High, and all Categories with counts */}
        <div className="px-3.5 py-2.5 bg-slate-50/70 border-b border-slate-100 space-y-2">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            {filterTabs.map((tab) => {
              const isActive = activeFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    setActiveFilter(tab.key);
                    setSelectedNotifId(null);
                  }}
                  className={`whitespace-nowrap px-2.5 py-1.5 rounded-xl text-[11px] font-extrabold border flex items-center gap-1.5 transition shrink-0 ${
                    isActive
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-black border ${
                      isActive
                        ? 'bg-white/20 text-white border-white/20'
                        : tab.badgeTone || 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
          {filteredNotifs.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <CheckCircle className="w-10 h-10 mx-auto text-emerald-400 mb-2" />
              <p className="text-sm font-semibold text-slate-600">
                {tr('All caught up! No notifications.', language)}
              </p>
            </div>
          ) : activeFilter === 'all' ? (
            <>
              {recentGroup.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-sky-600" />
                      <span>{tr('Recent', language)}</span>
                    </h4>
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                      {recentGroup.length}
                    </span>
                  </div>
                  <div className="space-y-2">{recentGroup.map(renderNotifCard)}</div>
                </div>
              )}

              {oldGroup.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1">
                      <History className="w-3.5 h-3.5 text-slate-500" />
                      <span>{tr('Old', language)}</span>
                    </h4>
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                      {oldGroup.length}
                    </span>
                  </div>
                  <div className="space-y-2">{oldGroup.map(renderNotifCard)}</div>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-2">{filteredNotifs.map(renderNotifCard)}</div>
          )}
        </div>
      </div>
    </div>
  );
};
