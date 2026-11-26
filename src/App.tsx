/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { QuickAddSheet } from './components/QuickAddSheet';
import { AiAssistantSheet } from './components/AiAssistantSheet';
import { NotificationCenterModal } from './components/NotificationCenterModal';
import { WholesaleCartModal } from './components/WholesaleCartModal';
import { ToastContainer } from './components/ToastContainer';
import { MenuDrawer } from './components/MenuDrawer';
import { Sparkles } from 'lucide-react';

// Views
import { LoginView } from './views/LoginView';
import { HomeView } from './views/HomeView';
import { OrdersView } from './views/OrdersView';
import { StockView } from './views/StockView';
import { KhataView } from './views/KhataView';
import { MoreGridView } from './views/MoreGridView';
import { CustomersView } from './views/CustomersView';
import { DeliveryView } from './views/DeliveryView';
import { InvoicesView } from './views/InvoicesView';
import { ReturnsView } from './views/ReturnsView';
import { MapView } from './views/MapView';
import { ContactsView } from './views/ContactsView';
import { TaxHelperView } from './views/TaxHelperView';
import { SuppliersView } from './views/SuppliersView';
import { ExpensesView } from './views/ExpensesView';
import { ReportsView } from './views/ReportsView';
import { MarketingView } from './views/MarketingView';
import { ChatbotInboxView } from './views/ChatbotInboxView';
import { SettingsView } from './views/SettingsView';
import { CustomerPortalView } from './views/CustomerPortalView';
import { PublicLandingView } from './views/PublicLandingView';
import { SeoManagerView } from './views/SeoManagerView';
import { RateCardView } from './views/RateCardView';
import { DispatchSlipView } from './views/DispatchSlipView';
import { CustomerShopkeeperHubView } from './views/CustomerShopkeeperHubView';
import { BusinessHubView } from './views/BusinessHubView';
import { LandedCostView } from './views/LandedCostView';
import { GoogleSheetsView } from './views/GoogleSheetsView';
import { RegistrationsView } from './views/RegistrationsView';
import { HubSnapshotView } from './views/HubSnapshotView';
import { PartnerOrdersDetailView } from './views/PartnerOrdersDetailView';
import { BusinessSwitcherModal } from './components/BusinessSwitcherModal';
import { CreateBusinessModal } from './components/CreateBusinessModal';

const MainLayout: React.FC = () => {
  const {
    user,
    role,
    activeTab,
    activeSubPage,
    setActiveSubPage,
    setActiveTab,
    openMorePage,
    setIsAiModalOpen,
    isBusinessSwitcherOpen,
    setIsBusinessSwitcherOpen,
    isCreateBusinessOpen,
    setIsCreateBusinessOpen,
  } = useApp();

  // Quick Action Modal states
  const [directNewOrder, setDirectNewOrder] = useState(false);
  const [directNewProduct, setDirectNewProduct] = useState(false);
  const [directNewCustomer, setDirectNewCustomer] = useState(false);
  const [directNewPayment, setDirectNewPayment] = useState(false);
  const [directNewExpense, setDirectNewExpense] = useState(false);

  if (!user) {
    return <LoginView />;
  }

  const handleSelectQuickAction = (actionId: string) => {
    switch (actionId) {
      case 'new-order':
        setActiveTab('orders');
        setActiveSubPage(null);
        setDirectNewOrder(true);
        break;
      case 'add-payment':
        setActiveTab('khata');
        setActiveSubPage(null);
        setDirectNewPayment(true);
        break;
      case 'add-stock':
        setActiveTab('stock');
        setActiveSubPage(null);
        setDirectNewProduct(true);
        break;
      case 'add-customer':
        setActiveTab('more');
        setActiveSubPage('customers');
        setDirectNewCustomer(true);
        break;
      case 'add-supplier':
        setActiveTab('more');
        setActiveSubPage('customerHub');
        break;
      case 'add-expense':
        setActiveTab('more');
        setActiveSubPage('expenses');
        setDirectNewExpense(true);
        break;
      case 'scan-barcode':
        setActiveTab('stock');
        setActiveSubPage(null);
        break;
      default:
        break;
    }
  };

  // Determine what view to render
  const renderContent = () => {
    if (activeSubPage) {
      switch (activeSubPage) {
        case 'customers':
          return (
            <CustomersView
              isNewCustomerOpenDirect={directNewCustomer}
              onCloseNewCustomerDirect={() => setDirectNewCustomer(false)}
            />
          );
        case 'delivery':
          return <DeliveryView />;
        case 'invoices':
          return <InvoicesView />;
        case 'returns':
          return <ReturnsView />;
        case 'map':
          return <MapView />;
        case 'contacts':
          return <ContactsView />;
        case 'taxHelper':
          return <TaxHelperView />;
        case 'suppliers':
          return <SuppliersView />;
        case 'expenses':
          return (
            <ExpensesView
              isNewExpenseOpenDirect={directNewExpense}
              onCloseNewExpenseDirect={() => setDirectNewExpense(false)}
            />
          );
        case 'reports':
          return <ReportsView />;
        case 'marketing':
          return <MarketingView />;
        case 'enquiries':
          return <ChatbotInboxView />;
        case 'settings':
          return <SettingsView />;
        case 'landing':
          return <PublicLandingView onBackToApp={() => setActiveSubPage(null)} />;
        case 'seo':
          return <SeoManagerView />;
        case 'rateCard':
          return <RateCardView />;
        case 'dispatchSlip':
          return <DispatchSlipView />;
        case 'customerHub':
          return <CustomerShopkeeperHubView />;
        case 'businessHub':
          return <BusinessHubView />;
        case 'landedCost':
          return <LandedCostView />;
        case 'googleSheets':
          return <GoogleSheetsView />;
        case 'registrations':
          return <RegistrationsView />;
        case 'hubSnapshot':
          return <HubSnapshotView />;
        case 'myFullOrders':
          return <PartnerOrdersDetailView />;
        case 'myFullSupplyPOs':
          return <PartnerOrdersDetailView />;
        default:
          return <MoreGridView />;
      }
    }

    switch (activeTab) {
      case 'home':
        return role === 'customer' ? (
          <CustomerPortalView
            onOpenNewOrder={() => {
              setActiveTab('orders');
              setDirectNewOrder(true);
            }}
            onOpenKhata={() => setActiveTab('khata')}
          />
        ) : (
          <HomeView
            onOpenNewOrder={() => {
              setActiveTab('orders');
              setDirectNewOrder(true);
            }}
            onOpenNewProduct={() => {
              setActiveTab('stock');
              setDirectNewProduct(true);
            }}
            onOpenNewCustomer={() => {
              setActiveTab('more');
              setActiveSubPage('customers');
              setDirectNewCustomer(true);
            }}
            onOpenDeliveryCall={() => {
              setActiveTab('more');
              setActiveSubPage('delivery');
            }}
          />
        );
      case 'orders':
        return (
          <OrdersView
            isNewOrderOpenDirect={directNewOrder}
            onCloseNewOrderDirect={() => setDirectNewOrder(false)}
          />
        );
      case 'stock':
      case 'catalogue':
        return (
          <StockView
            isNewProductOpenDirect={directNewProduct}
            onCloseNewProductDirect={() => setDirectNewProduct(false)}
          />
        );
      case 'khata':
        return (
          <KhataView
            isNewPaymentOpenDirect={directNewPayment}
            onCloseNewPaymentDirect={() => setDirectNewPayment(false)}
          />
        );
      case 'more':
        return <MoreGridView />;
      default:
        return <HomeView onOpenNewOrder={() => {}} onOpenNewProduct={() => {}} onOpenNewCustomer={() => {}} onOpenDeliveryCall={() => {}} />;
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col bg-transparent relative overflow-x-hidden">
      <Header />

      {/* Main Content Area with responsive edge-to-edge mobile-friendly padding */}
      <main className="flex-1 w-full px-2 sm:px-4 md:px-6 pt-2 pb-24 sm:pb-28" role="main">
        {renderContent()}
      </main>

      {/* Bottom Navigation with 5 clean tabs & right elevated '+' Add button */}
      <BottomNav />

      {/* Sheets & Modals */}
      <MenuDrawer />
      <QuickAddSheet onSelectAction={handleSelectQuickAction} />
      <AiAssistantSheet />
      <NotificationCenterModal />
      <WholesaleCartModal />
      <BusinessSwitcherModal
        isOpen={isBusinessSwitcherOpen}
        onClose={() => setIsBusinessSwitcherOpen(false)}
      />
      <CreateBusinessModal
        isOpen={isCreateBusinessOpen}
        onClose={() => setIsCreateBusinessOpen(false)}
      />
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
