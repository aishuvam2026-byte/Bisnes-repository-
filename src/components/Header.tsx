import React from 'react';
import { useApp } from '../context/AppContext';
import { Menu, ArrowLeft, Bell, LogOut, ShoppingCart } from 'lucide-react';

export const Header: React.FC = () => {
  const {
    user,
    role,
    customers,
    suppliers,
    logout,
    notifications,
    setIsNotificationCenterOpen,
    setIsMenuDrawerOpen,
    activeSubPage,
    setActiveSubPage,
    activeBusiness,
    totalCartItems,
    setIsCartOpen,
    t,
  } = useApp();

  const unreadCount = notifications.filter((n) => !n.read).length;
  const loggedInCustomer = customers.find((c) => c.id === user?.customerId) || customers[0];
  const loggedInSupplier = suppliers.find((s) => s.id === user?.supplierId) || suppliers[0];

  const selectedIdLabel =
    role === 'owner'
      ? `${t.ownerId} (${activeBusiness.id})`
      : role === 'customer'
      ? `${t.dukaniId}: ${loggedInCustomer?.shopName || user?.customerId || 'Retailer'}`
      : `${t.supplierId}: ${loggedInSupplier?.name || user?.supplierId || 'Supplier'}`;

  return (
    <header className="sticky top-0 z-30 w-full px-2.5 sm:px-4 md:px-6 py-1.5 sm:py-2 backdrop-blur-md bg-white/85 border-b border-white/60">
      <div className="flex items-center justify-between gap-2 w-full">
        {/* Left: Menu button (≡) + App Logo tile + Rupam B2B & Selected ID only */}
        <div className="flex items-center gap-2 min-w-0">
          {activeSubPage ? (
            <button
              onClick={() => setActiveSubPage(null)}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white shadow-xs border border-slate-200/70 flex items-center justify-center text-slate-700 active:scale-95 transition shrink-0"
              aria-label="Back to previous page"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.3]" />
            </button>
          ) : (
            <button
              onClick={() => setIsMenuDrawerOpen(true)}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/90 hover:bg-white shadow-xs border border-slate-200/80 flex items-center justify-center text-slate-800 active:scale-95 transition shrink-0"
              aria-label="Open Menu Drawer"
              title="Open Menu"
            >
              <Menu className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.3]" />
            </button>
          )}

          {/* Uploaded App Icon Tile */}
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl overflow-hidden bg-sky-50 flex items-center justify-center shadow-sm shadow-sky-500/20 border border-white/80 shrink-0">
            <img
              src="/assets/aistudio/IMG_20261113_083134_a6a26f75.jpg"
              alt="Rupam App Icon"
              className="w-full h-full object-cover scale-[1.09]"
            />
          </div>

          {/* ONLY Rupam B2B + Selected ID Chip (nothing else written) */}
          <div className="flex items-center gap-1.5 min-w-0">
            <h1 className="text-xs sm:text-sm font-black text-slate-900 tracking-tight whitespace-nowrap">
              {t.appTitle}
            </h1>
            <span
              className={`text-[9px] sm:text-[10px] font-extrabold px-2 py-0.5 rounded-full border truncate max-w-[125px] sm:max-w-[230px] ${
                role === 'owner'
                  ? 'bg-blue-50 text-blue-900 border-blue-200'
                  : role === 'customer'
                  ? 'bg-amber-50 text-amber-900 border-amber-200'
                  : 'bg-purple-50 text-purple-900 border-purple-200'
              }`}
              title={selectedIdLabel}
            >
              {selectedIdLabel}
            </span>
          </div>
        </div>

        {/* Right: Wholesale Cart Icon + Notifications Bell & Logout Icon */}
        <div className="flex items-center gap-1.5 shrink-0">
          {role !== 'supplier' && (
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 relative flex items-center justify-center border border-amber-200 shadow-xs active:scale-95 transition"
              aria-label="Open Wholesale Cart"
              title="Wholesale Cart"
            >
              <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.2]" />
              {totalCartItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-amber-500 text-slate-950 font-black text-[8px] min-w-3.5 h-3.5 px-1 rounded-full flex items-center justify-center shadow-sm border border-white">
                  {totalCartItems > 99 ? '99+' : totalCartItems}
                </span>
              )}
            </button>
          )}

          <button
            onClick={() => setIsNotificationCenterOpen(true)}
            className="w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-xl bg-white/90 text-slate-700 relative flex items-center justify-center border border-slate-200/80 shadow-xs active:scale-95 transition"
            aria-label="Notifications"
            title="Notifications"
          >
            <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.2]" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-600 text-white font-bold text-[8px] min-w-3.5 h-3.5 px-1 rounded-full flex items-center justify-center shadow-sm">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          <button
            onClick={logout}
            className="w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-xl bg-white/90 text-slate-400 hover:text-rose-600 flex items-center justify-center border border-slate-200/80 shadow-xs active:scale-95 transition"
            title={t.logout}
            aria-label={t.logout}
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
