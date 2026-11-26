import React from 'react';
import { useApp } from '../context/AppContext';
import { Home, ShoppingBag, Package, BookOpen, Grid, Plus, BookMarked, Sparkles } from 'lucide-react';

export const BottomNav: React.FC = () => {
  const {
    role,
    activeTab,
    setActiveTab,
    setActiveSubPage,
    setIsQuickAddOpen,
    setIsAiModalOpen,
    orders,
    products,
    udhaar,
    t,
  } = useApp();

  // Badges calculation
  const pendingOrdersCount = orders.filter(
    (o) => o.status === 'Booked' || o.status === 'Advance Pending' || o.status === 'Packed'
  ).length;
  const lowStockCount = products.filter((p) => p.isLowStock).length;
  const pendingUdhaarCount = udhaar.filter((u) => u.status === 'Pending').length;

  const handleTabClick = (tabKey: string) => {
    setActiveTab(tabKey);
    setActiveSubPage(null);
  };

  return (
    <>
      {/* Floating Chatbot & Add (+) Buttons Stacked cleanly on Bottom-Right */}
      <div className="fixed bottom-19 sm:bottom-22 right-2 sm:right-4 md:right-6 z-40 flex flex-col items-center gap-2 pointer-events-auto">
        {/* AI Sahayak Chatbot Button */}
        <button
          type="button"
          onClick={() => setIsAiModalOpen(true)}
          className="flex flex-col items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-600 text-white shadow-lg shadow-purple-600/30 border-2 border-white active:scale-95 hover:scale-105 transition-all duration-150 group relative"
          aria-label="AI Sahayak Chatbot"
          title="AI Sahayak Chatbot"
        >
          <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-200" />
          <span className="text-[8px] sm:text-[9px] font-black tracking-tight mt-0.5 leading-none">
            {t.aiChat}
          </span>
        </button>

        {/* Quick Add (+) Button */}
        <button
          type="button"
          onClick={() => setIsQuickAddOpen(true)}
          className="flex flex-col items-center justify-center w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-gradient-to-tr from-sky-500 via-sky-600 to-blue-600 text-white shadow-xl shadow-sky-600/35 border-2 border-white/95 active:scale-95 hover:scale-105 transition-all duration-150 group"
          aria-label="Quick Add (+)"
          title="Quick Add (+)"
        >
          <Plus className="w-4 h-4 sm:w-5 sm:h-5 stroke-[3] group-hover:rotate-90 transition-transform duration-200" />
          <span className="text-[9px] sm:text-[10px] font-black tracking-tight leading-none mt-0.5">
            {role === 'owner' ? t.quickAdd : t.quickOrder}
          </span>
        </button>
      </div>

      {/* Compact Floating Bottom Navigation Bar */}
      <nav
        className="fixed bottom-1.5 sm:bottom-2.5 inset-x-2 sm:inset-x-4 md:inset-x-6 z-30"
        role="navigation"
        aria-label="Bottom Navigation"
      >
        <div className="glass-nav rounded-2xl sm:rounded-3xl px-1 sm:px-3 py-1.5 flex items-center justify-between shadow-lg border border-white/90">
          {/* Tab 1: Home */}
          <button
            onClick={() => handleTabClick('home')}
            className={`flex-1 flex flex-col items-center justify-center transition-all duration-200 ${
              activeTab === 'home' ? '-translate-y-1' : ''
            }`}
            aria-label={t.home}
          >
            <div
              className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all ${
                activeTab === 'home'
                  ? 'bg-gradient-to-tr from-sky-600 to-blue-600 text-white shadow-md shadow-sky-500/30 scale-105'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              <Home className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[2.2]" />
            </div>
            <span
              className={`text-[10px] sm:text-[11px] mt-0.5 tracking-tight leading-none ${
                activeTab === 'home' ? 'font-bold text-slate-900' : 'font-medium text-slate-600'
              }`}
            >
              {t.home}
            </span>
          </button>

          {/* Tab 2: Orders / My Orders */}
          <button
            onClick={() => handleTabClick('orders')}
            className={`flex-1 flex flex-col items-center justify-center relative transition-all duration-200 ${
              activeTab === 'orders' ? '-translate-y-1' : ''
            }`}
            aria-label={t.orders}
          >
            <div
              className={`relative w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all ${
                activeTab === 'orders'
                  ? 'bg-gradient-to-tr from-sky-600 to-blue-600 text-white shadow-md shadow-sky-500/30 scale-105'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              <ShoppingBag className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[2.2]" />
              {pendingOrdersCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-600 text-white text-[9px] font-bold min-w-3.5 h-3.5 px-1 rounded-full flex items-center justify-center shadow-xs">
                  {pendingOrdersCount}
                </span>
              )}
            </div>
            <span
              className={`text-[10px] sm:text-[11px] mt-0.5 tracking-tight leading-none ${
                activeTab === 'orders' ? 'font-bold text-slate-900' : 'font-medium text-slate-600'
              }`}
            >
              {t.orders}
            </span>
          </button>

          {/* Tab 3: Stock / Catalogue */}
          <button
            onClick={() => handleTabClick(role === 'owner' ? 'stock' : 'catalogue')}
            className={`flex-1 flex flex-col items-center justify-center relative transition-all duration-200 ${
              activeTab === 'stock' || activeTab === 'catalogue' ? '-translate-y-1' : ''
            }`}
            aria-label={role === 'owner' ? t.stock : t.catalogue}
          >
            <div
              className={`relative w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all ${
                activeTab === 'stock' || activeTab === 'catalogue'
                  ? 'bg-gradient-to-tr from-sky-600 to-blue-600 text-white shadow-md shadow-sky-500/30 scale-105'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              {role === 'owner' ? (
                <Package className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[2.2]" />
              ) : (
                <BookMarked className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[2.2]" />
              )}
              {role === 'owner' && lowStockCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-600 text-white text-[9px] font-bold min-w-3.5 h-3.5 px-1 rounded-full flex items-center justify-center shadow-xs">
                  {lowStockCount}
                </span>
              )}
            </div>
            <span
              className={`text-[10px] sm:text-[11px] mt-0.5 tracking-tight leading-none ${
                activeTab === 'stock' || activeTab === 'catalogue'
                  ? 'font-bold text-slate-900'
                  : 'font-medium text-slate-600'
              }`}
            >
              {role === 'owner' ? t.stock : t.catalogue}
            </span>
          </button>

          {/* Tab 4: Book/Khata / My Khata */}
          <button
            onClick={() => handleTabClick('khata')}
            className={`flex-1 flex flex-col items-center justify-center relative transition-all duration-200 ${
              activeTab === 'khata' ? '-translate-y-1' : ''
            }`}
            aria-label={t.khata}
          >
            <div
              className={`relative w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all ${
                activeTab === 'khata'
                  ? 'bg-gradient-to-tr from-sky-600 to-blue-600 text-white shadow-md shadow-sky-500/30 scale-105'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              <BookOpen className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[2.2]" />
              {pendingUdhaarCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-600 text-white text-[9px] font-bold min-w-3.5 h-3.5 px-1 rounded-full flex items-center justify-center shadow-xs">
                  {pendingUdhaarCount}
                </span>
              )}
            </div>
            <span
              className={`text-[10px] sm:text-[11px] mt-0.5 tracking-tight leading-none ${
                activeTab === 'khata' ? 'font-bold text-slate-900' : 'font-medium text-slate-600'
              }`}
            >
              {t.khata}
            </span>
          </button>

          {/* Tab 5: More */}
          <button
            onClick={() => handleTabClick('more')}
            className={`flex-1 flex flex-col items-center justify-center transition-all duration-200 ${
              activeTab === 'more' ? '-translate-y-1' : ''
            }`}
            aria-label={t.more}
          >
            <div
              className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all ${
                activeTab === 'more'
                  ? 'bg-gradient-to-tr from-sky-600 to-blue-600 text-white shadow-md shadow-sky-500/30 scale-105'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              <Grid className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[2.2]" />
            </div>
            <span
              className={`text-[10px] sm:text-[11px] mt-0.5 tracking-tight leading-none ${
                activeTab === 'more' ? 'font-bold text-slate-900' : 'font-medium text-slate-600'
              }`}
            >
              {t.more}
            </span>
          </button>
        </div>
      </nav>
    </>
  );
};
