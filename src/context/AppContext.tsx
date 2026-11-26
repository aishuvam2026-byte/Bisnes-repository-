import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  User,
  UserRole,
  Language,
  Customer,
  Product,
  Order,
  Payment,
  UdhaarRecord,
  ReturnRequest,
  Supplier,
  SupplierPurchaseOrder,
  Expense,
  MarketingClient,
  Deliverable,
  ChatbotEnquiry,
  BusinessSettings,
  AppNotification,
  ActivityLog,
  SupplierPrice,
  HubActivityLog,
  BusinessProfile,
  CustomerRegistration,
  DigitalMarketingServiceInfo,
  DigitalMarketingWork,
  WhatsAppAlertLog,
} from '../types';
import {
  INITIAL_SETTINGS,
  INITIAL_CUSTOMERS,
  INITIAL_PRODUCTS,
  INITIAL_ORDERS,
  INITIAL_UDHAAR,
  INITIAL_RETURNS,
  INITIAL_PAYMENTS,
  INITIAL_ENQUIRIES,
  INITIAL_SUPPLIERS,
  INITIAL_SUPPLIER_ORDERS,
  INITIAL_EXPENSES,
  INITIAL_MARKETING_CLIENTS,
  INITIAL_DELIVERABLES,
  DIGITAL_MARKETING_SERVICES,
  INITIAL_DIGITAL_MARKETING_WORKS,
} from '../data/seedData';
import { INITIAL_BUSINESSES } from '../data/businessSeedData';
import {
  SEED_HUB_CUSTOMERS,
  SEED_HUB_SUPPLIERS,
  SEED_SUPPLIER_PRICES,
  SEED_HUB_ACTIVITY_LOGS,
} from '../data/hubSeedData';
import { TRANSLATIONS } from '../data/translations';
import { onAuthStateChanged, User as FirebaseAuthUser } from 'firebase/auth';
import { disableNetwork, enableNetwork } from 'firebase/firestore';
import {
  auth,
  clearSheetsAccessToken,
  db,
  getSheetsAccessToken,
  getWorkspaceGoogleUser,
  initGoogleWorkspaceAuthListener,
  signInForGoogleSheets,
  signInWithGoogleFirebase,
  signOutFirebase,
  testConnection,
} from '../firebase';
import {
  deleteRenamedFirestoreDoc,
  loadWorkspaceFromFirestore,
  saveWhatsAppAlertToFirestore,
  subscribeToInventoryRealtime,
  subscribeToWhatsAppAlertsRealtime,
  syncWorkspaceToFirestore,
} from '../services/firebaseSync';
import {
  buildSheetTargetsForWorkspace,
  buildTablesForTarget,
  fetchSpreadsheetMetadata,
  fetchSpreadsheetTableValues,
  SheetFileRecord,
  SheetSyncHistoryEntry,
  SheetTargetDescriptor,
  syncTargetToGoogleSheet,
  WorkspaceTablesSource,
} from '../services/googleSheetsSync';

export interface LandedCostRoleConfig {
  ownerDefaultFreightPerPkt: number;
  ownerDefaultPackingPerPkt: number;
  ownerDefaultDamageBufferPerPkt: number;
  ownerDefaultGstPct: number;
  dukaniMinOrderValue: number;
  dukaniAdvanceAmount: number;
  dukaniFreeRadiusKm: number;
  dukaniMaxUdhaarPct: number;
  supplierTransportSplitPct: number;
  supplierCreditDays: number;
  supplierDamageTolerancePct: number;
  supplierTaxMode: 'CGST+SGST' | 'IGST';
}

export const DEFAULT_LANDED_COST_ROLE_CONFIG: LandedCostRoleConfig = {
  ownerDefaultFreightPerPkt: 15,
  ownerDefaultPackingPerPkt: 5,
  ownerDefaultDamageBufferPerPkt: 5,
  ownerDefaultGstPct: 18,
  dukaniMinOrderValue: 1000,
  dukaniAdvanceAmount: 1000,
  dukaniFreeRadiusKm: 150,
  dukaniMaxUdhaarPct: 10,
  supplierTransportSplitPct: 100,
  supplierCreditDays: 15,
  supplierDamageTolerancePct: 2,
  supplierTaxMode: 'IGST',
};

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  undoAction?: () => void;
}

interface AppContextType {
  user: User | null;
  role: UserRole;
  language: Language;
  t: (typeof TRANSLATIONS)['en'];
  setLanguage: (lang: Language) => void;
  setUser: (user: User | null) => void;
  switchRole: (role: UserRole) => void;
  switchCustomerAccount: (customerId: string) => void;
  switchSupplierAccount: (supplierId: string) => void;
  switchOwnerAccount: () => void;
  logout: () => void;
  isDemoMode: boolean;
  setIsDemoMode: (val: boolean) => void;
  syncStatus: 'synced' | 'syncing' | 'offline';

  // Navigation
  activeTab: string;
  setActiveTab: (tab: string) => void;
  activeSubPage: string | null;
  setActiveSubPage: (subPage: string | null) => void;
  openMorePage: (page: string) => void;

  // Time filter
  timeFilter: 'today' | 'week' | 'month' | 'year';
  setTimeFilter: (tf: 'today' | 'week' | 'month' | 'year') => void;
  selectedYear: number;
  setSelectedYear: (y: number) => void;
  selectedMonth: number | null; // 0-11 or null
  setSelectedMonth: (m: number | null) => void;

  // Data lists
  settings: BusinessSettings;
  updateSettings: (newSettings: Partial<BusinessSettings>) => void;
  customers: Customer[];
  products: Product[];
  orders: Order[];
  payments: Payment[];
  udhaar: UdhaarRecord[];
  returns: ReturnRequest[];
  suppliers: Supplier[];
  supplierOrders: SupplierPurchaseOrder[];
  supplierPrices: SupplierPrice[];
  expenses: Expense[];
  marketingClients: MarketingClient[];
  deliverables: Deliverable[];
  digitalMarketingServices: DigitalMarketingServiceInfo[];
  digitalMarketingWorks: DigitalMarketingWork[];
  enquiries: ChatbotEnquiry[];
  notifications: AppNotification[];
  activityLogs: ActivityLog[];
  hubActivityLogs: HubActivityLog[];
  customerRegistrations: CustomerRegistration[];

  // Mutators & Operations
  addOrder: (order: Omit<Order, 'id' | 'orderNumber' | 'createdAt'>) => Order;
  updateOrderStatus: (orderId: string, status: Order['status'], note?: string) => void;
  addPayment: (payment: Omit<Payment, 'id' | 'date'>) => void;
  confirmPayment: (paymentId: string) => void;
  addUdhaarEntry: (entry: Omit<UdhaarRecord, 'id' | 'date' | 'status'>) => void;
  clearUdhaarEntry: (udhaarId: string) => void;
  clearCustomerUdhaar: (customerId: string, amount?: number) => void;
  paySupplierBalance: (supplierId: string, amount: number, mode: string, note?: string) => void;
  addSupplierOrder: (order: Omit<SupplierPurchaseOrder, 'id' | 'poNumber'>) => SupplierPurchaseOrder;
  updateSupplierOrderStatus: (orderId: string, status: SupplierPurchaseOrder['status'], note?: string) => void;
  settleSupplierBill: (orderId: string, mode?: string) => void;
  addProduct: (product: Omit<Product, 'id' | 'piecesStock'>) => void;
  updateProductStock: (productId: string, packetDelta: number, reason: string) => void;
  updateProductOrganization: (
    productId: string,
    patch: {
      warehouseZone?: string;
      shelfCode?: string;
      reorderLevel?: number;
      supplierId?: string;
      supplierName?: string;
    }
  ) => void;
  whatsappAlerts: WhatsAppAlertLog[];
  autoWhatsAppAlertEnabled: boolean;
  setAutoWhatsAppAlertEnabled: (enabled: boolean) => void;
  autoReorderDraftEnabled: boolean;
  setAutoReorderDraftEnabled: (enabled: boolean) => void;
  isRealtimeInventoryConnected: boolean;
  sendDealerLowStockAlert: (
    product: Product,
    opts?: {
      suggestedReorderPackets?: number;
      triggerType?: WhatsAppAlertLog['triggerType'];
      supplierOverride?: Supplier;
    }
  ) => Promise<WhatsAppAlertLog>;
  autoReorderProduct: (
    product: Product,
    packetsToOrder: number,
    opts?: {
      sendWhatsAppAlert?: boolean;
      triggerType?: WhatsAppAlertLog['triggerType'];
      note?: string;
    }
  ) => Promise<SupplierPurchaseOrder | null>;
  addCustomer: (cust: Omit<Customer, 'id' | 'totalOrders' | 'totalSales' | 'pendingBalance' | 'pendingUdhaar' | 'lastOrderDate'>) => Customer;
  updateCustomer: (customerId: string, patch: Partial<Customer>) => void;
  editCustomerWithId: (oldId: string, patch: Partial<Customer> & { newId?: string }) => boolean;
  deleteCustomer: (customerId: string, reason?: string) => void;
  addSupplier: (supplier: Omit<Supplier, 'id'>) => Supplier;
  updateSupplier: (supplierId: string, patch: Partial<Supplier>) => void;
  editSupplierWithId: (oldId: string, patch: Partial<Supplier> & { newId?: string }) => boolean;
  editOwnerIdProfile: (patch: { ownerName?: string; businessName?: string; ownerPhone?: string; businessAddress?: string; upiId?: string }) => void;
  editBusinessWithId: (oldId: string, patch: Partial<BusinessProfile> & { newId?: string }) => boolean;
  updateSupplierPrice: (priceId: string, patch: Partial<SupplierPrice>) => void;
  logHubActivity: (log: Omit<HubActivityLog, 'id' | 'timestamp'>) => void;
  addReturnRequest: (req: Omit<ReturnRequest, 'id' | 'createdAt' | 'status'>) => void;
  resolveReturnRequest: (returnId: string, status: 'APPROVED' | 'REJECTED', outcome?: 'Replacement' | 'Credit note' | 'Rejected', note?: string) => void;
  addExpense: (expense: Omit<Expense, 'id'>) => void;
  convertEnquiryToOrder: (enquiryId: string) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  deleteNotification: (id: string) => void;
  addNotification: (notif: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => void;
  logActivity: (action: string, details: string, reason?: string) => void;
  addCustomerRegistration: (input: {
    shopName: string;
    ownerName: string;
    whatsapp: string;
    address: string;
    city?: string;
    email?: string;
    source?: 'App Registration' | 'Google Form';
  }) => CustomerRegistration;
  approveCustomerRegistration: (regId: string) => Customer | null;
  rejectCustomerRegistration: (regId: string) => void;
  markRegistrationsSyncedToSheet: () => void;
  applyDigitalMarketingService: (input: {
    clientId: string;
    clientRole: 'customer' | 'supplier';
    clientName: string;
    ownerName: string;
    phone: string;
    serviceId: string;
    notes?: string;
  }) => DigitalMarketingWork;
  updateDigitalMarketingWorkStatus: (
    workId: string,
    status: DigitalMarketingWork['status']
  ) => void;
  incrementDigitalMarketingPost: (workId: string) => void;
  verifyRetailerLogin: (identifier: string) => {
    ok: boolean;
    customer?: Customer;
    reason?: string;
  };
  verifySupplierLogin: (identifier: string) => {
    ok: boolean;
    supplier?: Supplier;
    reason?: string;
  };

  // Modals
  isQuickAddOpen: boolean;
  setIsQuickAddOpen: (open: boolean) => void;
  isAiModalOpen: boolean;
  setIsAiModalOpen: (open: boolean) => void;
  isNotificationCenterOpen: boolean;
  setIsNotificationCenterOpen: (open: boolean) => void;
  isMenuDrawerOpen: boolean;
  setIsMenuDrawerOpen: (open: boolean) => void;
  isBusinessSwitcherOpen: boolean;
  setIsBusinessSwitcherOpen: (open: boolean) => void;
  isCreateBusinessOpen: boolean;
  setIsCreateBusinessOpen: (open: boolean) => void;

  // Global Wholesale Cart
  cart: Record<string, number>;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  addToCart: (product: Product, qty?: number) => void;
  setCartItemQty: (productId: string, qty: number) => void;
  clearCart: () => void;
  totalCartItems: number;
  cartTotalValue: number;

  // Multi-Business ID System
  businesses: BusinessProfile[];
  activeBusinessId: string;
  activeBusiness: BusinessProfile;
  switchBusiness: (businessId: string) => void;
  addBusiness: (business: Omit<BusinessProfile, 'id' | 'createdAt'> & { customId?: string }) => BusinessProfile;
  updateBusiness: (businessId: string, patch: Partial<BusinessProfile>) => void;
  deleteBusiness: (businessId: string) => void;
  addProductToBusiness: (businessId: string, product: Omit<Product, 'id' | 'piecesStock'>) => void;
  addCustomerToBusiness: (businessId: string, customer: Omit<Customer, 'id' | 'totalOrders' | 'totalSales' | 'pendingBalance' | 'pendingUdhaar' | 'lastOrderDate'>) => Customer;
  addSupplierToBusiness: (businessId: string, supplier: Omit<Supplier, 'id'>) => Supplier;

  // Onboarding
  onboardingDismissed: boolean;
  dismissOnboarding: () => void;

  // Toast
  toasts: ToastMessage[];
  showToast: (message: string, type?: ToastMessage['type'], undoAction?: () => void) => void;
  dismissToast: (id: string) => void;

  // Data helpers
  resetToDemoData: () => void;
  exportAllDataCsv: () => void;

  // Landed Cost 3-ID Role Config
  landedCostConfig: LandedCostRoleConfig;
  updateLandedCostConfig: (patch: Partial<LandedCostRoleConfig>) => void;

  // Firebase Cloud Firestore Sync
  firebaseUser: { uid: string; email: string | null; displayName: string | null } | null;
  firebaseSyncState: 'idle' | 'syncing' | 'synced' | 'error';
  firebaseConnected: boolean;
  lastFirebaseSyncAt: string | null;
  lastFirebaseError: string | null;
  syncedCollectionsCount: number;
  connectAndSyncFirebase: () => Promise<void>;
  syncToFirebase: () => Promise<void>;
  pullFromFirebase: () => Promise<void>;
  disconnectFirebase: () => Promise<void>;

  // Google Sheets Multi-ID & Multi-Table Sync
  hasSheetsAuth: boolean;
  sheetsSyncState: 'idle' | 'syncing' | 'synced' | 'error';
  sheetsAutoSync: boolean;
  lastSheetsError: string | null;
  sheetRegistry: Record<string, SheetFileRecord>;
  sheetHistory: SheetSyncHistoryEntry[];
  sheetTargets: SheetTargetDescriptor[];
  activeSheetTarget: SheetTargetDescriptor | null;
  connectGoogleSheetsAccount: () => Promise<boolean>;
  disconnectGoogleSheetsAccount: () => void;
  setSheetsAutoSyncEnabled: (enabled: boolean) => void;
  syncOneTargetSheet: (
    target: SheetTargetDescriptor,
    mode?: SheetSyncHistoryEntry['mode']
  ) => Promise<SheetFileRecord | null>;
  syncAllTargetsForOwner: () => Promise<{ succeeded: number; failed: number }>;
  linkExistingSpreadsheetForTarget: (
    target: SheetTargetDescriptor,
    spreadsheetIdOrUrl: string
  ) => Promise<boolean>;
  pullTableFromGoogleSheet: (
    spreadsheetId: string,
    tableName: string
  ) => Promise<{ sheetTitle: string; rows: string[][] } | null>;
  getTablesForTarget: (target: SheetTargetDescriptor) => ReturnType<typeof buildTablesForTarget>;
  recordSheetError: (message: string) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    return (localStorage.getItem('rupam_lang') as Language) || 'en';
  });

  const [isDemoMode, setIsDemoMode] = useState<boolean>(true);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline'>('synced');

  // Firebase state
  const [firebaseUser, setFirebaseUser] = useState<{
    uid: string;
    email: string | null;
    displayName: string | null;
  } | null>(null);
  const [firebaseSyncState, setFirebaseSyncState] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const [firebaseConnected, setFirebaseConnected] = useState<boolean>(false);
  const [lastFirebaseSyncAt, setLastFirebaseSyncAt] = useState<string | null>(() => {
    return localStorage.getItem('rupam_firebase_last_sync') || null;
  });
  const [lastFirebaseError, setLastFirebaseError] = useState<string | null>(null);
  const [syncedCollectionsCount, setSyncedCollectionsCount] = useState<number>(0);
  const [isRealtimeInventoryConnected, setIsRealtimeInventoryConnected] = useState<boolean>(false);

  // Automated WhatsApp Dealer Alerts & Auto-Reorder automation state
  const [whatsappAlerts, setWhatsappAlerts] = useState<WhatsAppAlertLog[]>(() => {
    try {
      const saved = localStorage.getItem('rupam_whatsapp_alerts_v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [autoWhatsAppAlertEnabled, setAutoWhatsAppAlertEnabledState] = useState<boolean>(() => {
    const saved = localStorage.getItem('rupam_auto_wa_alert_v1');
    return saved === null ? true : saved === 'true';
  });
  const [autoReorderDraftEnabled, setAutoReorderDraftEnabledState] = useState<boolean>(() => {
    return localStorage.getItem('rupam_auto_reorder_draft_v1') === 'true';
  });
  const recentAutoAlertRef = useRef<Record<string, number>>({});

  const setAutoWhatsAppAlertEnabled = (enabled: boolean) => {
    setAutoWhatsAppAlertEnabledState(enabled);
    localStorage.setItem('rupam_auto_wa_alert_v1', String(enabled));
    showToast(
      enabled
        ? 'Automated WhatsApp low-stock dealer alerts enabled'
        : 'Automated WhatsApp low-stock dealer alerts paused',
      'info'
    );
  };

  const setAutoReorderDraftEnabled = (enabled: boolean) => {
    setAutoReorderDraftEnabledState(enabled);
    localStorage.setItem('rupam_auto_reorder_draft_v1', String(enabled));
    showToast(
      enabled
        ? 'Auto-draft Supplier PO on low stock enabled'
        : 'Auto-draft Supplier PO on low stock disabled',
      'info'
    );
  };

  useEffect(() => {
    localStorage.setItem('rupam_whatsapp_alerts_v1', JSON.stringify(whatsappAlerts));
  }, [whatsappAlerts]);

  // Google Sheets Workspace state (token cached strictly in memory via firebase.ts)
  const [hasSheetsAuth, setHasSheetsAuth] = useState<boolean>(() => Boolean(getSheetsAccessToken()));
  const [sheetsSyncState, setSheetsSyncState] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const [sheetsAutoSync, setSheetsAutoSync] = useState<boolean>(() => {
    return localStorage.getItem('rupam_sheets_autosync_v1') === 'true';
  });
  const [sheetsAutoSyncConfirmedThisSession, setSheetsAutoSyncConfirmedThisSession] = useState<boolean>(false);
  const [lastSheetsError, setLastSheetsError] = useState<string | null>(null);
  const [sheetRegistry, setSheetRegistry] = useState<Record<string, SheetFileRecord>>(() => {
    try {
      const saved = localStorage.getItem('rupam_gsheet_registry_v1');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [sheetHistory, setSheetHistory] = useState<SheetSyncHistoryEntry[]>(() => {
    try {
      const saved = localStorage.getItem('rupam_gsheet_history_v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Landed Cost 3-ID Role Settings Table Config
  const [landedCostConfig, setLandedCostConfig] = useState<LandedCostRoleConfig>(() => {
    const saved = localStorage.getItem('rupam_landed_cost_rules_v1');
    if (saved) {
      try {
        return { ...DEFAULT_LANDED_COST_ROLE_CONFIG, ...JSON.parse(saved) };
      } catch {
        // fallback
      }
    }
    return DEFAULT_LANDED_COST_ROLE_CONFIG;
  });

  // Network offline listener & auth-gated Firestore connection probe
  useEffect(() => {
    const isOnline = typeof navigator === 'undefined' || navigator.onLine !== false;
    if (!isOnline) {
      setSyncStatus('offline');
      setFirebaseConnected(false);
      void disableNetwork(db).catch(() => {});
    } else {
      setFirebaseConnected(true);
    }

    const unsubAuth = onAuthStateChanged(auth, (fbUser: FirebaseAuthUser | null) => {
      if (fbUser) {
        setFirebaseUser({
          uid: fbUser.uid,
          email: fbUser.email,
          displayName: fbUser.displayName,
        });
        testConnection().then((res) => {
          setFirebaseConnected(res.ok);
        });
      } else {
        const wsUser = getWorkspaceGoogleUser();
        setFirebaseUser(wsUser);
        setFirebaseConnected(typeof navigator === 'undefined' || navigator.onLine !== false);
      }
    });

    const unsubSheetsToken = initGoogleWorkspaceAuthListener((hasToken, wsUser) => {
      setHasSheetsAuth(hasToken);
      if (wsUser) {
        setFirebaseUser(wsUser);
      } else if (!auth.currentUser) {
        setFirebaseUser(null);
      }
    });

    const handleOnline = () => {
      setSyncStatus('syncing');
      void enableNetwork(db).catch(() => {});
      testConnection().then((res) => {
        setFirebaseConnected(res.ok);
        setSyncStatus('synced');
      });
    };
    const handleOffline = () => {
      setSyncStatus('offline');
      setFirebaseConnected(false);
      void disableNetwork(db).catch(() => {});
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      unsubAuth();
      unsubSheetsToken();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Pre-configured default login state (starts logged in as Owner for smooth review, role switcher available)
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('rupam_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fallback
      }
    }
    return {
      id: 'owner-shuvam',
      name: 'Shuvam Behera',
      phone: '1234567890',
      email: 'Rupamb2b@gmail.com',
      role: 'owner',
    };
  });

  const role: UserRole = user?.role || 'owner';

  const [activeTab, setActiveTab] = useState<string>('home');
  const [activeSubPage, setActiveSubPage] = useState<string | null>(null);

  // Time filter
  const [timeFilter, setTimeFilter] = useState<'today' | 'week' | 'month' | 'year'>('month');
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

  // State collections with localStorage persistence
  const [settings, setSettings] = useState<BusinessSettings>(() => {
    const s = localStorage.getItem('rupam_settings');
    return s ? JSON.parse(s) : INITIAL_SETTINGS;
  });

  // Multi-Business ID System state
  const [businesses, setBusinesses] = useState<BusinessProfile[]>(() => {
    const s = localStorage.getItem('rupam_businesses_v1');
    if (s) {
      try {
        return JSON.parse(s);
      } catch (e) {
        // fallback
      }
    }
    return INITIAL_BUSINESSES;
  });

  const [activeBusinessId, setActiveBusinessId] = useState<string>(() => {
    const s = localStorage.getItem('rupam_active_biz_v1');
    return s || INITIAL_BUSINESSES[0].id;
  });

  const activeBusiness: BusinessProfile =
    businesses.find((b) => b.id === activeBusinessId) || businesses[0] || INITIAL_BUSINESSES[0];

  useEffect(() => {
    localStorage.setItem('rupam_businesses_v1', JSON.stringify(businesses));
  }, [businesses]);

  useEffect(() => {
    localStorage.setItem('rupam_active_biz_v1', activeBusinessId);
  }, [activeBusinessId]);

  const [customers, setCustomers] = useState<Customer[]>(() => {
    const s = localStorage.getItem('rupam_customers_hub_v2');
    if (s) {
      try {
        return JSON.parse(s);
      } catch (e) {
        // fallback
      }
    }
    return SEED_HUB_CUSTOMERS;
  });

  const [products, setProducts] = useState<Product[]>(() => {
    const s = localStorage.getItem('rupam_products');
    return s ? JSON.parse(s) : INITIAL_PRODUCTS;
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    const s = localStorage.getItem('rupam_orders');
    return s ? JSON.parse(s) : INITIAL_ORDERS;
  });

  const [payments, setPayments] = useState<Payment[]>(() => {
    const s = localStorage.getItem('rupam_payments');
    return s ? JSON.parse(s) : INITIAL_PAYMENTS;
  });

  const [udhaar, setUdhaar] = useState<UdhaarRecord[]>(() => {
    const s = localStorage.getItem('rupam_udhaar');
    return s ? JSON.parse(s) : INITIAL_UDHAAR;
  });

  const [returns, setReturns] = useState<ReturnRequest[]>(() => {
    const s = localStorage.getItem('rupam_returns');
    return s ? JSON.parse(s) : INITIAL_RETURNS;
  });

  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    const s = localStorage.getItem('rupam_suppliers_hub_v2');
    if (s) {
      try {
        return JSON.parse(s);
      } catch (e) {
        // fallback
      }
    }
    return SEED_HUB_SUPPLIERS;
  });

  const [supplierOrders, setSupplierOrders] = useState<SupplierPurchaseOrder[]>(() => {
    const s = localStorage.getItem('rupam_supplier_orders_v1');
    if (s) {
      try {
        return JSON.parse(s);
      } catch (e) {
        // fallback
      }
    }
    return INITIAL_SUPPLIER_ORDERS;
  });

  const [supplierPrices, setSupplierPrices] = useState<SupplierPrice[]>(() => {
    const s = localStorage.getItem('rupam_supplier_prices_v2');
    if (s) {
      try {
        return JSON.parse(s);
      } catch (e) {
        // fallback
      }
    }
    return SEED_SUPPLIER_PRICES;
  });

  const [hubActivityLogs, setHubActivityLogs] = useState<HubActivityLog[]>(() => {
    const s = localStorage.getItem('rupam_hub_logs_v2');
    if (s) {
      try {
        return JSON.parse(s);
      } catch (e) {
        // fallback
      }
    }
    return SEED_HUB_ACTIVITY_LOGS;
  });
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const s = localStorage.getItem('rupam_expenses');
    return s ? JSON.parse(s) : INITIAL_EXPENSES;
  });
  const [marketingClients] = useState<MarketingClient[]>(INITIAL_MARKETING_CLIENTS);
  const [deliverables] = useState<Deliverable[]>(INITIAL_DELIVERABLES);
  const [digitalMarketingServices] = useState<DigitalMarketingServiceInfo[]>(DIGITAL_MARKETING_SERVICES);
  const [digitalMarketingWorks, setDigitalMarketingWorks] = useState<DigitalMarketingWork[]>(() => {
    const saved = localStorage.getItem('rupam_digital_marketing_works_v1');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {
        // fallback
      }
    }
    return INITIAL_DIGITAL_MARKETING_WORKS;
  });
  const [enquiries, setEnquiries] = useState<ChatbotEnquiry[]>(() => {
    const s = localStorage.getItem('rupam_enquiries');
    return s ? JSON.parse(s) : INITIAL_ENQUIRIES;
  });

  const INITIAL_CUSTOMER_REGISTRATIONS: CustomerRegistration[] = [
    {
      id: 'REG-1001',
      registeredAt: '2026-11-15T09:30:00.000Z',
      registeredAtDisplay: '15 Nov 2026, 03:00 PM',
      shopName: 'Maa Tarini Beauty & Fancy',
      ownerName: 'Ramesh Chandra Sahoo',
      whatsapp: '9437881122',
      address: 'Station Road, Choudwar, Cuttack 754025',
      city: 'Choudwar',
      source: 'Google Form',
      status: 'Pending',
      syncedToSheet: false,
    },
  ];

  const [customerRegistrations, setCustomerRegistrations] = useState<CustomerRegistration[]>(() => {
    const saved = localStorage.getItem('rupam_customer_registrations_v1');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        // fallback
      }
    }
    return INITIAL_CUSTOMER_REGISTRATIONS;
  });

  useEffect(() => {
    localStorage.setItem('rupam_customer_registrations_v1', JSON.stringify(customerRegistrations));
  }, [customerRegistrations]);

  useEffect(() => {
    localStorage.setItem('rupam_digital_marketing_works_v1', JSON.stringify(digitalMarketingWorks));
  }, [digitalMarketingWorks]);

  const INITIAL_NOTIFICATIONS: AppNotification[] = [
    {
      id: 'notif-1',
      title: 'Dispatch Alert',
      message: 'Confirm balance call for 2 orders scheduled today before van dispatch.',
      timestamp: 'Today, 08:30 AM',
      type: 'dispatch',
      priority: 'high',
      read: false,
      linkTab: 'delivery',
    },
    {
      id: 'notif-2',
      title: 'Low Stock Alert',
      message: 'Matte Liquid Lipstick & Kajal are below reorder level (<= 5 packets).',
      timestamp: 'Today, 07:15 AM',
      type: 'stock',
      priority: 'high',
      read: false,
      linkTab: 'stock',
    },
    {
      id: 'notif-3',
      title: 'Advance Payment Pending',
      message: 'Verify ₹1,000 UPI advance booking payment for Maa Durga Fancy Store.',
      timestamp: 'Today, 06:40 AM',
      type: 'payment',
      priority: 'high',
      read: false,
      linkTab: 'khata',
    },
    {
      id: 'notif-4',
      title: 'New Wholesale Order',
      message: 'Kalyani Bangles booked 18 wholesale packets worth ₹6,400.',
      timestamp: 'Today, 05:50 AM',
      type: 'order',
      priority: 'normal',
      read: false,
      linkTab: 'orders',
    },
    {
      id: 'notif-5',
      title: 'Udhaar Reminder',
      message: 'Maa Mangala Cosmetics has ₹450 pending udhaar due before next dispatch.',
      timestamp: 'Yesterday, 04:20 PM',
      type: 'udhaar',
      priority: 'high',
      read: false,
      linkTab: 'khata',
    },
    {
      id: 'notif-6',
      title: 'New WhatsApp Enquiry',
      message: 'Maa Bhuasuni Gift Center requested wholesale catalogue & rate card.',
      timestamp: '2 days ago',
      type: 'order',
      priority: 'normal',
      read: true,
      linkTab: 'enquiries',
    },
  ];

  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    const saved = localStorage.getItem('rupam_notifications_v1');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        // fallback to defaults
      }
    }
    return INITIAL_NOTIFICATIONS;
  });

  useEffect(() => {
    localStorage.setItem('rupam_notifications_v1', JSON.stringify(notifications));
  }, [notifications]);

  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([
    {
      id: 'act-1',
      timestamp: new Date().toLocaleTimeString(),
      actor: 'Shuvam Behera',
      role: 'Owner',
      action: 'System Initialized',
      details: 'Demo wholesale database loaded with 20 shops, 40 products, and 60 orders.',
    },
  ]);

  // Modals & UI states
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const [isMenuDrawerOpen, setIsMenuDrawerOpen] = useState(false);
  const [isBusinessSwitcherOpen, setIsBusinessSwitcherOpen] = useState(false);
  const [isCreateBusinessOpen, setIsCreateBusinessOpen] = useState(false);
  const [cart, setCart] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('rupam_wholesale_cart_v1');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [onboardingDismissed, setOnboardingDismissed] = useState<boolean>(() => {
    return localStorage.getItem('rupam_onboarding_dismissed') === 'true';
  });

  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (message: string, type: ToastMessage['type'] = 'success', undoAction?: () => void) => {
    const id = 'toast-' + Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type, undoAction }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const dismissOnboarding = () => {
    setOnboardingDismissed(true);
    localStorage.setItem('rupam_onboarding_dismissed', 'true');
  };

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('rupam_lang', lang);
  };

  const logActivity = (action: string, details: string, reason?: string) => {
    const newLog: ActivityLog = {
      id: 'act-' + Date.now(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      actor: user?.name || 'User',
      role: user?.role || 'Guest',
      action,
      details,
      reason,
    };
    setActivityLogs((prev) => [newLog, ...prev.slice(0, 99)]);
  };

  const updateSettings = (newSettings: Partial<BusinessSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem('rupam_settings', JSON.stringify(updated));
      return updated;
    });
    logActivity('Updated Settings', 'Business configuration updated');
    showToast('Settings saved successfully');
  };

  // Sync state to localStorage
  useEffect(() => {
    localStorage.setItem('rupam_orders', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('rupam_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('rupam_customers_hub_v2', JSON.stringify(customers));
  }, [customers]);

  useEffect(() => {
    localStorage.setItem('rupam_suppliers_hub_v2', JSON.stringify(suppliers));
  }, [suppliers]);

  useEffect(() => {
    localStorage.setItem('rupam_supplier_prices_v2', JSON.stringify(supplierPrices));
  }, [supplierPrices]);

  useEffect(() => {
    localStorage.setItem('rupam_hub_logs_v2', JSON.stringify(hubActivityLogs));
  }, [hubActivityLogs]);

  useEffect(() => {
    localStorage.setItem('rupam_supplier_orders_v1', JSON.stringify(supplierOrders));
  }, [supplierOrders]);

  useEffect(() => {
    localStorage.setItem('rupam_udhaar', JSON.stringify(udhaar));
  }, [udhaar]);

  useEffect(() => {
    localStorage.setItem('rupam_payments', JSON.stringify(payments));
  }, [payments]);

  useEffect(() => {
    localStorage.setItem('rupam_landed_cost_rules_v1', JSON.stringify(landedCostConfig));
  }, [landedCostConfig]);

  useEffect(() => {
    localStorage.setItem('rupam_wholesale_cart_v1', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (product: Product, qty = 1) => {
    const addQty = Math.max(1, qty);
    setCart((prev) => ({
      ...prev,
      [product.id]: (prev[product.id] || 0) + addQty,
    }));
    showToast(`Added ${addQty} pkts of ${product.name} to cart!`, 'success');
  };

  const setCartItemQty = (productId: string, qty: number) => {
    setCart((prev) => {
      if (qty <= 0) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }
      return { ...prev, [productId]: qty };
    });
  };

  const clearCart = () => {
    setCart({});
  };

  const totalCartItems = Object.values(cart).reduce((sum, q) => sum + q, 0);
  const cartTotalValue = Object.entries(cart).reduce((sum, [pId, qty]) => {
    const prod = products.find((p) => p.id === pId);
    return sum + (prod ? prod.sellingPrice * qty : 0);
  }, 0);

  const updateLandedCostConfig = (patch: Partial<LandedCostRoleConfig>) => {
    setLandedCostConfig((prev) => ({ ...prev, ...patch }));
    showToast('Landed Cost role settings updated');
  };

  const syncToFirebase = async () => {
    if (!auth.currentUser) {
      showToast('Please connect Google account to sync with Cloud Firestore', 'warning');
      return;
    }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setSyncStatus('offline');
      setFirebaseConnected(false);
      showToast('Device offline — changes saved locally and will sync when online', 'warning');
      return;
    }
    setFirebaseSyncState('syncing');
    setSyncStatus('syncing');
    setLastFirebaseError(null);
    try {
      await enableNetwork(db).catch(() => {});
      const result = await syncWorkspaceToFirestore({
        role,
        activeBusinessId,
        settings,
        businesses,
        customers,
        suppliers,
        products,
        orders,
        payments,
        udhaar,
        supplierOrders,
        returns,
        expenses,
      });
      setFirebaseSyncState('synced');
      setSyncStatus('synced');
      setFirebaseConnected(true);
      setSyncedCollectionsCount(result.collectionsSynced.length);
      setLastFirebaseSyncAt(result.timestamp);
      localStorage.setItem('rupam_firebase_last_sync', result.timestamp);
      showToast(
        `Firebase synced! ${result.syncedCount} records across ${result.collectionsSynced.length} collections.`,
        'success'
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Firebase sync failed';
      const isOfflineErr = message.includes('offline') || message.includes('unavailable');
      setFirebaseSyncState('error');
      setSyncStatus(isOfflineErr ? 'offline' : 'synced');
      if (isOfflineErr) setFirebaseConnected(false);
      setLastFirebaseError(message);
      showToast(
        isOfflineErr
          ? 'Cloud Firestore unreachable right now — data safely kept offline'
          : 'Firebase sync error recorded — check error details in Menu',
        'error'
      );
    }
  };

  const isPullingRef = useRef(false);

  const mergeById = <T extends { id: string }>(localItems: T[], remoteItems: Partial<T>[]): T[] => {
    if (!remoteItems.length) return localItems;
    const map = new Map<string, T>();
    localItems.forEach((item) => map.set(item.id, item));
    remoteItems.forEach((remote) => {
      if (!remote.id) return;
      const existing = map.get(remote.id);
      if (existing) {
        map.set(remote.id, { ...existing, ...remote });
      } else {
        map.set(remote.id, remote as T);
      }
    });
    return Array.from(map.values());
  };

  const pullFromFirebase = async () => {
    if (!auth.currentUser) {
      showToast('Please connect Google account to load from Cloud Firestore', 'warning');
      return;
    }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setSyncStatus('offline');
      setFirebaseConnected(false);
      showToast('Device offline — operating from local storage cache', 'warning');
      return;
    }
    setFirebaseSyncState('syncing');
    setSyncStatus('syncing');
    setLastFirebaseError(null);
    isPullingRef.current = true;
    try {
      await enableNetwork(db).catch(() => {});
      const loaded = await loadWorkspaceFromFirestore();
      if (loaded.recordCount > 0) {
        if (loaded.settings) {
          setSettings((prev) => ({ ...prev, ...loaded.settings }));
        }
        if (loaded.businesses.length > 0) {
          setBusinesses((prev) => mergeById(prev, loaded.businesses));
        }
        if (loaded.customers.length > 0) {
          setCustomers((prev) => mergeById(prev, loaded.customers));
        }
        if (loaded.suppliers.length > 0) {
          setSuppliers((prev) => mergeById(prev, loaded.suppliers));
        }
        if (loaded.products.length > 0) {
          setProducts((prev) => mergeById(prev, loaded.products));
        }
        if (loaded.orders.length > 0) {
          setOrders((prev) => mergeById(prev, loaded.orders));
        }
        if (loaded.payments.length > 0) {
          setPayments((prev) => mergeById(prev, loaded.payments));
        }
        if (loaded.udhaar.length > 0) {
          setUdhaar((prev) => mergeById(prev, loaded.udhaar));
        }
        if (loaded.supplierOrders.length > 0) {
          setSupplierOrders((prev) => mergeById(prev, loaded.supplierOrders));
        }
        if (loaded.returns.length > 0) {
          setReturns((prev) => mergeById(prev, loaded.returns));
        }
        if (loaded.expenses.length > 0) {
          setExpenses((prev) => mergeById(prev, loaded.expenses));
        }
        showToast(`Loaded ${loaded.recordCount} cloud records from Firestore!`, 'success');
      } else {
        showToast('Cloud Firestore connected (no remote records yet — ready to sync).', 'info');
      }
      setFirebaseSyncState('synced');
      setSyncStatus('synced');
      setFirebaseConnected(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Firebase load failed';
      const isOfflineErr = message.includes('offline') || message.includes('unavailable');
      setFirebaseSyncState('error');
      setSyncStatus(isOfflineErr ? 'offline' : 'synced');
      if (isOfflineErr) setFirebaseConnected(false);
      setLastFirebaseError(message);
      showToast(
        isOfflineErr
          ? 'Cloud Firestore unreachable right now — using local data'
          : 'Firebase cloud load error — check error details in Menu',
        'error'
      );
    } finally {
      setTimeout(() => {
        isPullingRef.current = false;
      }, 500);
    }
  };

  const connectAndSyncFirebase = async () => {
    setFirebaseSyncState('syncing');
    setLastFirebaseError(null);
    try {
      if (!auth.currentUser) {
        const fbUser = await signInWithGoogleFirebase();
        setFirebaseUser({
          uid: fbUser.uid,
          email: fbUser.email,
          displayName: fbUser.displayName,
        });
        setHasSheetsAuth(Boolean(getSheetsAccessToken()));
      }
      await pullFromFirebase();
      await syncToFirebase();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Google Sign-In / Sync cancelled';
      setFirebaseSyncState('error');
      setLastFirebaseError(message);
      showToast('Firebase connection failed or cancelled', 'error');
    }
  };

  const disconnectFirebase = async () => {
    try {
      await signOutFirebase();
      clearSheetsAccessToken();
      setHasSheetsAuth(false);
      setSheetsAutoSyncConfirmedThisSession(false);
      setFirebaseUser(null);
      setFirebaseSyncState('idle');
      setLastFirebaseError(null);
      showToast('Disconnected from Google / Firebase session', 'info');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign-out failed';
      setLastFirebaseError(message);
    }
  };

  // Auto-sync once when Firebase Auth becomes active on session load
  useEffect(() => {
    if (firebaseUser && auth.currentUser && firebaseSyncState === 'idle') {
      void (async () => {
        await pullFromFirebase();
        await syncToFirebase();
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firebaseUser?.uid]);

  // Real-time Firestore onSnapshot listeners for live inventory & automated WhatsApp alerts
  useEffect(() => {
    const currentUid = auth.currentUser?.uid;
    if (!firebaseUser || !currentUid) {
      setIsRealtimeInventoryConnected(false);
      return;
    }

    setIsRealtimeInventoryConnected(true);
    const unsubInventory = subscribeToInventoryRealtime(currentUid, (remoteProducts) => {
      isPullingRef.current = true;
      setProducts((prev) => mergeById(prev, remoteProducts));
      setTimeout(() => {
        isPullingRef.current = false;
      }, 400);
    });

    const unsubAlerts = subscribeToWhatsAppAlertsRealtime(currentUid, (remoteAlerts) => {
      if (remoteAlerts.length === 0) return;
      setWhatsappAlerts((prev) => {
        const merged = new Map<string, WhatsAppAlertLog>();
        prev.forEach((a) => merged.set(a.id, a));
        remoteAlerts.forEach((a) => merged.set(a.id, a));
        return Array.from(merged.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      });
    });

    return () => {
      unsubInventory();
      unsubAlerts();
      setIsRealtimeInventoryConnected(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firebaseUser?.uid]);

  // Continuous debounced auto-sync to Firestore whenever workspace data changes while connected
  const hasBootedAutoSyncRef = useRef(false);
  useEffect(() => {
    if (!firebaseUser || isPullingRef.current) return;
    if (!hasBootedAutoSyncRef.current) {
      hasBootedAutoSyncRef.current = true;
      return;
    }
    const timer = setTimeout(() => {
      if (auth.currentUser && firebaseSyncState !== 'syncing') {
        void syncToFirebase();
      }
    }, 2500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    firebaseUser?.uid,
    orders,
    customers,
    suppliers,
    products,
    payments,
    udhaar,
    supplierOrders,
    returns,
    expenses,
    businesses,
    settings,
  ]);

  // Auth & Roles
  const switchCustomerAccount = (customerId: string) => {
    const cust = customers.find((c) => c.id === customerId) || customers[0];
    if (!cust) {
      showToast('No Retailer ID available', 'error');
      return;
    }
    const custUser: User = {
      id: cust.id,
      name: `${cust.shopName} (${cust.ownerName})`,
      phone: cust.phone,
      email: cust.email || `${cust.id}@retailer.com`,
      role: 'customer',
      customerId: cust.id,
    };
    setUser(custUser);
    localStorage.setItem('rupam_user', JSON.stringify(custUser));
    setActiveTab('home');
    setActiveSubPage(null);
    showToast(`Logged in as Retailer: ${cust.shopName} (${cust.villageOrTown || cust.city || 'Nuapatna'})`);
  };

  const switchSupplierAccount = (supplierId: string) => {
    const supp = suppliers.find((s) => s.id === supplierId) || suppliers[0];
    if (!supp) {
      showToast('No Supplier ID available', 'error');
      return;
    }
    const suppUser: User = {
      id: supp.id,
      name: `${supp.name}`,
      phone: supp.phone,
      email: `${supp.id}@supplier.com`,
      role: 'supplier',
      supplierId: supp.id,
    };
    setUser(suppUser);
    localStorage.setItem('rupam_user', JSON.stringify(suppUser));
    setActiveTab('home');
    setActiveSubPage(null);
    showToast(`Logged in as Supplier: ${supp.name} (${supp.city || 'Kolkata'})`);
  };

  const switchOwnerAccount = () => {
    const ownerUser: User = {
      id: 'owner-shuvam',
      name: `${settings.ownerName || 'Shuvam Behera'} (Owner)`,
      phone: settings.ownerPhone || '1234567890',
      email: 'Rupamb2b@gmail.com',
      role: 'owner',
    };
    setUser(ownerUser);
    localStorage.setItem('rupam_user', JSON.stringify(ownerUser));
    setActiveTab('home');
    setActiveSubPage(null);
    showToast(`Logged in as Owner (${settings.ownerName || 'Shuvam Behera'} - Full Master Admin)`);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // MULTI-BUSINESS ID SYSTEM OPERATIONS (WONNER ALAG ALAG BISNES)
  // ═══════════════════════════════════════════════════════════════════════════
  const switchBusiness = (bizId: string) => {
    const biz = businesses.find((b) => b.id === bizId);
    if (!biz) return;
    setActiveBusinessId(bizId);
    setSettings((prev) => ({
      ...prev,
      businessName: biz.companyName,
      ownerName: biz.ownerName,
      businessAddress: biz.address,
      ownerPhone: biz.phone,
      upiId: biz.upiId,
      minOrderValue: biz.minOrderValue || prev.minOrderValue,
      freeDeliveryRadiusKm: biz.freeDeliveryRadiusKm || prev.freeDeliveryRadiusKm,
    }));
    logActivity('Switched Business', `Active Business ID: ${biz.id} (${biz.companyName})`);
    showToast(`Switched active business to ${biz.companyName} (${biz.id})`, 'info');
  };

  const addBusiness = (
    data: Omit<BusinessProfile, 'id' | 'createdAt'> & { customId?: string }
  ): BusinessProfile => {
    const newId =
      data.customId && data.customId.trim()
        ? data.customId.trim().toUpperCase()
        : `BIZ-${String(businesses.length + 1).padStart(3, '0')}`;

    const newBiz: BusinessProfile = {
      id: newId,
      companyName: data.companyName,
      ownerName: data.ownerName || 'Shuvam Behera',
      category: data.category || 'General Wholesale',
      tagline: data.tagline,
      phone: data.phone || '1234567890',
      whatsapp: data.whatsapp || data.phone || '1234567890',
      email: data.email,
      address: data.address || 'Nuapatna, Cuttack',
      city: data.city || 'Nuapatna',
      state: data.state || 'Odisha',
      pincode: data.pincode,
      gstNumber: data.gstNumber,
      upiId: data.upiId || 'shuvam.rupam@upi',
      minOrderValue: data.minOrderValue || 1000,
      freeDeliveryRadiusKm: data.freeDeliveryRadiusKm || 150,
      productIds: data.productIds || [],
      customerIds: data.customerIds || [],
      supplierIds: data.supplierIds || [],
      createdAt: new Date().toISOString().split('T')[0],
      isDefault: false,
    };

    setBusinesses((prev) => [...prev, newBiz]);
    setActiveBusinessId(newBiz.id);
    setSettings((prev) => ({
      ...prev,
      businessName: newBiz.companyName,
      ownerName: newBiz.ownerName,
      businessAddress: newBiz.address,
      ownerPhone: newBiz.phone,
      upiId: newBiz.upiId,
    }));
    logActivity('Created Business', `Created Business ID: ${newBiz.id} (${newBiz.companyName})`);
    showToast(`New Business ID ${newBiz.id} created & activated!`, 'success');
    return newBiz;
  };

  const updateBusiness = (businessId: string, patch: Partial<BusinessProfile>) => {
    setBusinesses((prev) =>
      prev.map((b) => (b.id === businessId ? { ...b, ...patch } : b))
    );
    if (activeBusinessId === businessId) {
      if (patch.companyName) setSettings((s) => ({ ...s, businessName: patch.companyName! }));
      if (patch.ownerName) setSettings((s) => ({ ...s, ownerName: patch.ownerName! }));
      if (patch.phone) setSettings((s) => ({ ...s, ownerPhone: patch.phone! }));
    }
    showToast('Business profile updated', 'info');
  };

  const deleteBusiness = (businessId: string) => {
    if (businesses.length <= 1) {
      showToast('Cannot delete the last business profile', 'error');
      return;
    }
    setBusinesses((prev) => prev.filter((b) => b.id !== businessId));
    if (activeBusinessId === businessId) {
      const remaining = businesses.filter((b) => b.id !== businessId);
      switchBusiness(remaining[0].id);
    }
    showToast('Business profile removed', 'info');
  };

  const addProductToBusiness = (businessId: string, product: Omit<Product, 'id' | 'piecesStock'>) => {
    const piecesStock = product.packetStock * product.packSize;
    const newProduct: Product = {
      ...product,
      id: `prod-${Date.now()}`,
      piecesStock,
      businessId,
    };
    setProducts((prev) => [newProduct, ...prev]);
    setBusinesses((prev) =>
      prev.map((b) =>
        b.id === businessId
          ? { ...b, productIds: [...(b.productIds || []), newProduct.id] }
          : b
      )
    );
    logActivity('Added Product to Business', `${newProduct.name} to ${businessId}`);
    showToast(`Product added to Business ${businessId}`, 'success');
  };

  const addCustomerToBusiness = (
    businessId: string,
    cust: Omit<Customer, 'id' | 'totalOrders' | 'totalSales' | 'pendingBalance' | 'pendingUdhaar' | 'lastOrderDate'>
  ): Customer => {
    const newCustomer: Customer = {
      ...cust,
      id: `cust-${Date.now()}`,
      totalOrders: 0,
      totalSales: 0,
      pendingBalance: 0,
      pendingUdhaar: 0,
      lastOrderDate: new Date().toISOString().split('T')[0],
      businessId,
    };
    setCustomers((prev) => [newCustomer, ...prev]);
    setBusinesses((prev) =>
      prev.map((b) =>
        b.id === businessId
          ? { ...b, customerIds: [...(b.customerIds || []), newCustomer.id] }
          : b
      )
    );
    logActivity('Added Retailer to Business', `${newCustomer.shopName} to ${businessId}`);
    showToast(`Retailer shop added to Business ${businessId}`, 'success');
    return newCustomer;
  };

  const addSupplierToBusiness = (businessId: string, sup: Omit<Supplier, 'id'>): Supplier => {
    const newSupplier: Supplier = {
      ...sup,
      id: `supp-${Date.now()}`,
      businessId,
    };
    setSuppliers((prev) => [newSupplier, ...prev]);
    setBusinesses((prev) =>
      prev.map((b) =>
        b.id === businessId
          ? { ...b, supplierIds: [...(b.supplierIds || []), newSupplier.id] }
          : b
      )
    );
    logActivity('Added Supplier to Business', `${newSupplier.name} to ${businessId}`);
    showToast(`Supplier added to Business ${businessId}`, 'success');
    return newSupplier;
  };

  const switchRole = (newRole: UserRole) => {
    if (newRole === 'customer') {
      const defaultCust = customers[0];
      switchCustomerAccount(defaultCust?.id || 'cust-demo-1');
    } else if (newRole === 'supplier') {
      const defaultSupp = suppliers[0];
      switchSupplierAccount(defaultSupp?.id || 'sup-1');
    } else {
      switchOwnerAccount();
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('rupam_user');
  };

  const openMorePage = (pageName: string) => {
    setActiveSubPage(pageName);
  };

  // Mutators
  const addOrder = (orderData: Omit<Order, 'id' | 'orderNumber' | 'createdAt'>): Order => {
    const newId = 'ord-' + Date.now();
    const newOrderNumber = 'RUP-26-' + (orders.length + 107).toString();
    const newOrder: Order = {
      ...orderData,
      id: newId,
      orderNumber: newOrderNumber,
      createdAt: new Date().toISOString(),
      hasUnboxingVideoReminderSent: true,
      businessId: orderData.businessId || activeBusinessId,
    };

    // Deduct stock
    setProducts((prev) =>
      prev.map((p) => {
        const item = orderData.items.find((it) => it.productId === p.id);
        if (item) {
          const remainingPackets = Math.max(0, p.packetStock - item.packetQty);
          return {
            ...p,
            packetStock: remainingPackets,
            piecesStock: remainingPackets * p.packSize,
            isLowStock: remainingPackets <= p.reorderLevel,
          };
        }
        return p;
      })
    );

    // Update customer stats
    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id === orderData.customerId) {
          return {
            ...c,
            totalOrders: c.totalOrders + 1,
            totalSales: c.totalSales + orderData.totalAmount,
            pendingBalance: c.pendingBalance + orderData.balanceAmount,
            lastOrderDate: new Date().toISOString().split('T')[0],
          };
        }
        return c;
      })
    );

    setOrders((prev) => [newOrder, ...prev]);
    logActivity('Created Order', `Order #${newOrderNumber} for ₹${newOrder.totalAmount.toLocaleString('en-IN')}`);
    showToast(`Order #${newOrderNumber} created successfully!`);
    return newOrder;
  };

  const updateOrderStatus = (orderId: string, newStatus: Order['status'], note = '') => {
    const oldOrder = orders.find((o) => o.id === orderId);
    if (!oldOrder) return;
    const oldStatus = oldOrder.status;

    setOrders((prev) =>
      prev.map((o) => {
        if (o.id === orderId) {
          return {
            ...o,
            status: newStatus,
            statusHistory: [
              ...o.statusHistory,
              {
                status: newStatus,
                timestamp: new Date().toISOString(),
                note: note || `Status changed to ${newStatus}`,
                by: user?.name || 'Staff',
              },
            ],
          };
        }
        return o;
      })
    );

    logActivity('Status Change', `Order #${oldOrder.orderNumber}: ${oldStatus} -> ${newStatus}`, note);
    showToast(`Order #${oldOrder.orderNumber} updated to ${newStatus}`, 'info', () => {
      // Undo callback
      updateOrderStatus(orderId, oldStatus, 'Reverted by Undo');
    });
  };

  const addPayment = (paymentData: Omit<Payment, 'id' | 'date'>) => {
    const newPayment: Payment = {
      ...paymentData,
      id: 'pay-' + Date.now(),
      date: new Date().toISOString(),
    };

    setPayments((prev) => [newPayment, ...prev]);

    if (newPayment.confirmedByOwner) {
      // Settle customer balance
      setCustomers((prev) =>
        prev.map((c) => {
          if (c.id === paymentData.customerId) {
            return {
              ...c,
              pendingBalance: Math.max(0, c.pendingBalance - paymentData.amount),
            };
          }
          return c;
        })
      );

      // Keep linked Order's advancePaid & balanceAmount in sync
      if (paymentData.orderId) {
        setOrders((prev) =>
          prev.map((o) => {
            if (o.id === paymentData.orderId) {
              const isAdvance = paymentData.type === 'Advance';
              return {
                ...o,
                advanceAmount: isAdvance ? paymentData.amount : o.advanceAmount,
                advancePaid: o.advancePaid || isAdvance,
                advanceDate: isAdvance && !o.advanceDate ? new Date().toISOString() : o.advanceDate,
                balanceAmount: Math.max(0, o.balanceAmount - paymentData.amount),
              };
            }
            return o;
          })
        );
      }
    }

    logActivity('Recorded Payment', `₹${paymentData.amount} from ${paymentData.customerName} (${paymentData.mode})`);
    showToast(`Payment of ₹${paymentData.amount.toLocaleString('en-IN')} recorded!`);
  };

  const confirmPayment = (paymentId: string) => {
    setPayments((prev) =>
      prev.map((p) => {
        if (p.id === paymentId) {
          return { ...p, confirmedByOwner: true };
        }
        return p;
      })
    );
    showToast('Payment verified and confirmed by Owner!');
  };

  const addUdhaarEntry = (entry: Omit<UdhaarRecord, 'id' | 'date' | 'status'>) => {
    const newUdhaar: UdhaarRecord = {
      ...entry,
      id: 'udh-' + Date.now(),
      date: new Date().toISOString().split('T')[0],
      status: 'Pending',
    };
    setUdhaar((prev) => [newUdhaar, ...prev]);

    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id === entry.customerId) {
          return { ...c, pendingUdhaar: c.pendingUdhaar + entry.shortageAmount };
        }
        return c;
      })
    );

    logActivity('Udhaar Created', `₹${entry.shortageAmount} recorded for ${entry.shopName}`);
    showToast(`Udhaar entry of ₹${entry.shortageAmount} recorded (Rule: must clear before next order)`);
  };

  const clearUdhaarEntry = (udhaarId: string) => {
    const item = udhaar.find((u) => u.id === udhaarId);
    if (!item) return;

    setUdhaar((prev) =>
      prev.map((u) => (u.id === udhaarId ? { ...u, status: 'Cleared', clearedDate: new Date().toISOString() } : u))
    );

    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id === item.customerId) {
          return { ...c, pendingUdhaar: Math.max(0, c.pendingUdhaar - item.shortageAmount) };
        }
        return c;
      })
    );

    logActivity('Cleared Udhaar', `₹${item.shortageAmount} cleared for ${item.shopName}`);
    showToast(`Udhaar cleared! Retailer can now book new orders.`);
  };

  const clearCustomerUdhaar = (customerId: string, amount?: number) => {
    const cust = customers.find((c) => c.id === customerId);
    const clearedAmt = amount !== undefined ? amount : (cust?.pendingUdhaar || 0);

    setUdhaar((prev) =>
      prev.map((u) =>
        (u.customerId === customerId || (cust && u.shopName === cust.shopName)) && u.status === 'Pending'
          ? { ...u, status: 'Cleared', clearedDate: new Date().toISOString() }
          : u
      )
    );

    setCustomers((prev) =>
      prev.map((c) => (c.id === customerId ? { ...c, pendingUdhaar: 0 } : c))
    );

    if (clearedAmt > 0 && cust) {
      addPayment({
        customerId: cust.id,
        customerName: cust.ownerName,
        shopName: cust.shopName,
        amount: clearedAmt,
        mode: 'UPI',
        referenceId: 'UPI/CLR-' + Date.now().toString().slice(-6),
        confirmedByOwner: true,
        note: 'Instant Udhaar clearance before booking new wholesale order',
        type: 'Udhaar',
      });
    }

    logActivity('Cleared Udhaar', `Udhaar of ₹${clearedAmt} cleared for ${cust?.shopName || customerId}`);
    showToast(`Udhaar ₹${clearedAmt} cleared! Ab retailer naya order book kar sakte hain.`);
  };

  const addProduct = (prodData: Omit<Product, 'id' | 'piecesStock'>) => {
    const newProd: Product = {
      ...prodData,
      id: 'prod-' + Date.now(),
      piecesStock: prodData.packetStock * prodData.packSize,
      businessId: prodData.businessId || activeBusinessId,
    };
    setProducts((prev) => [newProd, ...prev]);
    logActivity('Added Product', `${newProd.name} (${newProd.packSize}pk)`);
    showToast(`Product "${newProd.name}" added to inventory.`);
  };

  const resolveSupplierForProduct = (product: Product): Supplier | undefined =>
    suppliers.find((s) => s.id === product.supplierId) ||
    suppliers.find((s) => product.supplierName && s.name === product.supplierName) ||
    suppliers.find((s) => product.brand && s.brands?.includes(product.brand)) ||
    suppliers.find((s) => s.categories?.includes(product.category)) ||
    suppliers[0];

  const sendDealerLowStockAlert = async (
    product: Product,
    opts?: {
      suggestedReorderPackets?: number;
      triggerType?: WhatsAppAlertLog['triggerType'];
      supplierOverride?: Supplier;
    }
  ): Promise<WhatsAppAlertLog> => {
    const supplier = opts?.supplierOverride || resolveSupplierForProduct(product);
    const dealerName = supplier?.name || product.supplierName || 'Wholesale Dealer';
    const dealerId = supplier?.id || product.supplierId || 'sup-1';
    const dealerPhone = supplier?.whatsapp || supplier?.phone || settings.ownerPhone || '9830012345';
    const suggestedQty = Math.max(
      1,
      Number(
        opts?.suggestedReorderPackets ??
          Math.max(10, product.reorderLevel * 2 - product.packetStock)
      )
    );
    const triggerType = opts?.triggerType || 'Manual';
    const alertId = `wa-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

    let logEntry: WhatsAppAlertLog;
    try {
      const resp = await fetch('/api/whatsapp/low-stock-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId: dealerId,
          supplierName: dealerName,
          phone: dealerPhone,
          productName: product.name,
          sku: product.sku,
          packSize: product.packSize,
          currentPackets: product.packetStock,
          reorderLevel: product.reorderLevel,
          suggestedReorderPackets: suggestedQty,
          businessName: activeBusiness.companyName || settings.businessName,
          triggerType,
        }),
      });
      const data = (await resp.json().catch(() => ({}))) as any;

      const status: WhatsAppAlertLog['status'] = data?.delivered
        ? 'Sent (WA API)'
        : resp.ok && data?.ok
        ? 'Queued (WA Link)'
        : 'Failed';

      logEntry = {
        id: alertId,
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        supplierId: dealerId,
        supplierName: dealerName,
        phone: dealerPhone,
        currentPackets: product.packetStock,
        reorderLevel: product.reorderLevel,
        suggestedReorderPackets: suggestedQty,
        triggerType,
        status,
        provider: String(data?.provider || 'whatsapp_cloud_api'),
        messageId: data?.messageId ? String(data.messageId) : undefined,
        message:
          String(data?.message || '') ||
          `Restock alert for ${product.name} (${product.packetStock} pkts left). Needed: ${suggestedQty} pkts.`,
        fallbackUrl:
          String(data?.fallbackUrl || '') ||
          `https://wa.me/91${dealerPhone.replace(/\D/g, '').slice(-10)}`,
        error: data?.error ? String(data.error) : undefined,
        createdAt: data?.sentAt || new Date().toISOString(),
      };

      if (status === 'Sent (WA API)') {
        showToast(`WhatsApp API alert delivered to ${dealerName} for ${product.name}`, 'success');
      } else if (status === 'Queued (WA Link)') {
        showToast(`Restock alert saved for ${dealerName} (WA Cloud API ready for Secrets; 1-tap WA link active)`, 'info');
      } else {
        showToast(`WhatsApp alert error: ${logEntry.error || 'Delivery failed'}`, 'error');
      }
    } catch (err: any) {
      const digits = dealerPhone.replace(/\D/g, '').slice(-10);
      const fallbackMsg = `Low stock alert for ${product.name} (${product.sku}): ${product.packetStock} pkts left. Please supply ${suggestedQty} pkts.`;
      logEntry = {
        id: alertId,
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        supplierId: dealerId,
        supplierName: dealerName,
        phone: dealerPhone,
        currentPackets: product.packetStock,
        reorderLevel: product.reorderLevel,
        suggestedReorderPackets: suggestedQty,
        triggerType,
        status: 'Failed',
        provider: 'whatsapp_cloud_api',
        message: fallbackMsg,
        fallbackUrl: `https://wa.me/91${digits}?text=${encodeURIComponent(fallbackMsg)}`,
        error: err?.message || 'Network error calling WhatsApp API',
        createdAt: new Date().toISOString(),
      };
      showToast(`WhatsApp API request failed: ${logEntry.error}`, 'error');
    }

    setWhatsappAlerts((prev) => [logEntry, ...prev].slice(0, 120));
    logActivity(
      'Automated WhatsApp Stock Alert',
      `${triggerType}: ${product.name} (${product.packetStock} pkts) -> ${dealerName} [${logEntry.status}]`
    );
    addNotification({
      title:
        product.packetStock <= 0
          ? `Out of Stock Alert: ${product.name}`
          : `Low Stock Alert: ${product.name}`,
      message: `${dealerName} alerted to restock ${suggestedQty} pkts (${logEntry.status}).`,
      type: 'stock',
      priority: 'high',
      linkTab: 'stock',
    });
    void saveWhatsAppAlertToFirestore(logEntry, activeBusinessId);
    return logEntry;
  };

  const autoReorderProduct = async (
    product: Product,
    packetsToOrder: number,
    opts?: {
      sendWhatsAppAlert?: boolean;
      triggerType?: WhatsAppAlertLog['triggerType'];
      note?: string;
    }
  ): Promise<SupplierPurchaseOrder | null> => {
    const qty = Math.max(1, Math.round(Number(packetsToOrder) || 0));
    const supplier = resolveSupplierForProduct(product);
    if (!supplier) {
      showToast(`No dealer mapped for ${product.name}. Please add a supplier first.`, 'error');
      return null;
    }
    const lineTotal = qty * product.purchaseCost;
    const leadDays = supplier.leadTimeDays || 4;
    const expectedDate = new Date(Date.now() + leadDays * 86400000).toISOString().split('T')[0];

    const createdPo = addSupplierOrder({
      supplierId: supplier.id,
      supplierName: supplier.name,
      orderDate: new Date().toISOString().split('T')[0],
      expectedDate,
      items: [
        {
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          packets: qty,
          packSize: product.packSize,
          purchaseCostPerPacket: product.purchaseCost,
          totalAmount: lineTotal,
        },
      ],
      totalAmount: lineTotal,
      advancePaid: 0,
      balanceDue: lineTotal,
      paymentStatus: 'Payment Due',
      status: 'Confirmed',
      ownerNotes:
        opts?.note ||
        `Automated Reorder PO (${opts?.triggerType || 'Forecast-Reorder'}) for ${product.name} (${qty} pkts)`,
    });

    if (opts?.sendWhatsAppAlert !== false) {
      await sendDealerLowStockAlert(product, {
        suggestedReorderPackets: qty,
        triggerType: opts?.triggerType || 'Forecast-Reorder',
        supplierOverride: supplier,
      });
    }

    return createdPo;
  };

  const updateProductOrganization = (
    productId: string,
    patch: {
      warehouseZone?: string;
      shelfCode?: string;
      reorderLevel?: number;
      supplierId?: string;
      supplierName?: string;
    }
  ) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== productId) return p;
        const nextReorder =
          patch.reorderLevel !== undefined ? Math.max(0, Number(patch.reorderLevel)) : p.reorderLevel;
        return {
          ...p,
          warehouseZone: patch.warehouseZone !== undefined ? patch.warehouseZone : p.warehouseZone,
          shelfCode: patch.shelfCode !== undefined ? patch.shelfCode : p.shelfCode,
          reorderLevel: nextReorder,
          isLowStock: p.packetStock <= nextReorder,
          supplierId: patch.supplierId !== undefined ? patch.supplierId : p.supplierId,
          supplierName: patch.supplierName !== undefined ? patch.supplierName : p.supplierName,
        };
      })
    );
    logActivity('Stock Organization Updated', `Updated shelf/zone/reorder settings for ${productId}`);
    showToast('Inventory organization & reorder threshold updated!', 'success');
  };

  const updateProductStock = (productId: string, packetDelta: number, reason: string) => {
    const existingProd = products.find((p) => p.id === productId);
    const nextQty = existingProd ? Math.max(0, existingProd.packetStock + packetDelta) : 0;

    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === productId) {
          const newQty = Math.max(0, p.packetStock + packetDelta);
          return {
            ...p,
            packetStock: newQty,
            piecesStock: newQty * p.packSize,
            isLowStock: newQty <= p.reorderLevel,
            lastRestockedAt: packetDelta > 0 ? new Date().toISOString() : p.lastRestockedAt,
          };
        }
        return p;
      })
    );
    logActivity('Stock Adjustment', `Product ${productId} delta: ${packetDelta} pkts`, reason);
    showToast(`Stock updated (${packetDelta > 0 ? '+' : ''}${packetDelta} pkts)`);

    // Automatically alert dealer via WhatsApp Business API when stock drops to low / out of stock
    if (existingProd && packetDelta < 0 && nextQty <= existingProd.reorderLevel) {
      const updatedSnapshot: Product = {
        ...existingProd,
        packetStock: nextQty,
        piecesStock: nextQty * existingProd.packSize,
        isLowStock: true,
      };
      const lastSentTs = recentAutoAlertRef.current[productId] || 0;
      const cooldownElapsed = Date.now() - lastSentTs > 5 * 60 * 1000;

      if (autoWhatsAppAlertEnabled && cooldownElapsed) {
        recentAutoAlertRef.current[productId] = Date.now();
        void sendDealerLowStockAlert(updatedSnapshot, { triggerType: 'Auto-Trigger' });
      }

      if (autoReorderDraftEnabled && cooldownElapsed) {
        const hasOpenPo = supplierOrders.some(
          (po) =>
            (po.status === 'Draft' || po.status === 'Confirmed') &&
            po.items.some((it) => it.productId === productId)
        );
        if (!hasOpenPo) {
          const needed = Math.max(10, existingProd.reorderLevel * 2 - nextQty);
          void autoReorderProduct(updatedSnapshot, needed, {
            sendWhatsAppAlert: false,
            triggerType: 'Auto-Trigger',
            note: `Auto-generated PO when stock dropped to ${nextQty} pkts`,
          });
        }
      }
    }
  };

  const addCustomer = (custData: Omit<Customer, 'id' | 'totalOrders' | 'totalSales' | 'pendingBalance' | 'pendingUdhaar' | 'lastOrderDate'>): Customer => {
    const newCust: Customer = {
      ...custData,
      id: 'cust-' + Date.now(),
      totalOrders: 0,
      totalSales: 0,
      pendingBalance: 0,
      pendingUdhaar: 0,
      lastOrderDate: new Date().toISOString().split('T')[0],
      businessId: custData.businessId || activeBusinessId,
    };
    setCustomers((prev) => [newCust, ...prev]);
    logActivity('Added Retailer', `${newCust.shopName} (${newCust.city}, ${newCust.distanceKm}km)`);
    showToast(`Retailer "${newCust.shopName}" registered.`);
    return newCust;
  };

  const addReturnRequest = (req: Omit<ReturnRequest, 'id' | 'createdAt' | 'status'>) => {
    const newReq: ReturnRequest = {
      ...req,
      id: 'ret-' + Date.now(),
      createdAt: new Date().toISOString(),
      status: 'PENDING',
    };
    setReturns((prev) => [newReq, ...prev]);
    logActivity('Return Submitted', `Return request for order #${req.orderNumber}`);
    showToast('Return request submitted for owner video verification.');
  };

  const resolveReturnRequest = (
    returnId: string,
    status: 'APPROVED' | 'REJECTED',
    outcome?: 'Replacement' | 'Credit note' | 'Rejected',
    note = ''
  ) => {
    setReturns((prev) =>
      prev.map((r) => {
        if (r.id === returnId) {
          return { ...r, status, outcome, ownerNote: note };
        }
        return r;
      })
    );
    logActivity('Return Decision', `Return #${returnId}: ${status} (${outcome})`, note);
    showToast(`Return request marked as ${status}`);
  };

  const addExpense = (expData: Omit<Expense, 'id'>) => {
    const newExp: Expense = {
      ...expData,
      id: 'exp-' + Date.now(),
    };
    setExpenses((prev) => [newExp, ...prev]);
    logActivity('Added Expense', `₹${expData.amount} for ${expData.category}`);
    showToast(`Expense of ₹${expData.amount} recorded.`);
  };

  const convertEnquiryToOrder = (enquiryId: string) => {
    const enq = enquiries.find((e) => e.id === enquiryId);
    if (!enq) return;

    // Match or create customer
    let cust = customers.find((c) => c.phone === enq.phone);
    if (!cust) {
      cust = addCustomer({
        shopName: enq.shopName,
        ownerName: enq.ownerName,
        phone: enq.phone,
        whatsapp: enq.phone,
        address: enq.address,
        landmark: enq.landmark,
        city: 'Cuttack',
        state: 'Odisha',
        lat: 20.4856,
        lng: 85.8344,
        distanceKm: enq.distanceKm || 25,
        category: 'General Fancy',
        tags: 'New',
      });
    }

    setEnquiries((prev) => prev.map((e) => (e.id === enquiryId ? { ...e, status: 'Converted' } : e)));
    setActiveTab('orders');
    setActiveSubPage(null);
    showToast(`Enquiry converted! Select products to book order for ${enq.shopName}.`);
  };

  const markNotificationRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const deleteNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    showToast('Notification deleted', 'info');
  };

  const addNotification = (notif: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => {
    const nowLabel = `Today, ${new Date().toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
    const newItem: AppNotification = {
      ...notif,
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: nowLabel,
      read: false,
    };
    setNotifications((prev) => [newItem, ...prev]);
  };

  const normalizeDigits10 = (raw?: string): string => {
    if (!raw) return '';
    const digits = raw.replace(/\D/g, '');
    return digits.length >= 10 ? digits.slice(-10) : digits;
  };

  const verifyRetailerLogin = (
    identifier: string
  ): { ok: boolean; customer?: Customer; reason?: string } => {
    const clean = identifier.trim();
    if (!clean) {
      return { ok: false, reason: 'Please enter Retailer ID, Mobile Number, or Email.' };
    }
    const cleanPhone = normalizeDigits10(clean);
    const cleanLower = clean.toLowerCase();

    const matched = customers.find((c) => {
      if (c.id.toLowerCase() === cleanLower) return true;
      if (c.email && c.email.toLowerCase() === cleanLower) return true;
      if (cleanPhone.length === 10) {
        if (normalizeDigits10(c.phone) === cleanPhone) return true;
        if (normalizeDigits10(c.whatsapp) === cleanPhone) return true;
      }
      return false;
    });

    if (!matched) {
      return {
        ok: false,
        reason:
          'Yeh Retailer ID / Mobile Owner app me added nahi hai. Keval Owner dwara saved Retailer ID hi login ho sakte hain, ya New Retailer Registration form bharein.',
      };
    }

    if (matched.isBlocked) {
      return {
        ok: false,
        reason: `Yeh Retailer ID blocked hai${matched.blockReason ? `: ${matched.blockReason}` : '.'}`,
      };
    }

    return { ok: true, customer: matched };
  };

  const verifySupplierLogin = (
    identifier: string
  ): { ok: boolean; supplier?: Supplier; reason?: string } => {
    const clean = identifier.trim();
    if (!clean) {
      return { ok: false, reason: 'Please enter Supplier ID or Mobile Number.' };
    }
    const cleanPhone = normalizeDigits10(clean);
    const cleanLower = clean.toLowerCase();

    const matched = suppliers.find((s) => {
      if (s.id.toLowerCase() === cleanLower) return true;
      if (cleanPhone.length === 10) {
        if (normalizeDigits10(s.phone) === cleanPhone) return true;
        if (s.whatsapp && normalizeDigits10(s.whatsapp) === cleanPhone) return true;
      }
      return false;
    });

    if (!matched) {
      return {
        ok: false,
        reason:
          'Yeh Supplier ID / Mobile Owner app me added nahi hai. Keval Owner dwara add kiye gaye Supplier ID hi login ho sakte hain.',
      };
    }

    if (matched.status === 'Blocked') {
      return {
        ok: false,
        reason: 'Yeh Supplier ID blocked hai. Kripya Owner (Shuvam Behera) se sampark karein.',
      };
    }

    return { ok: true, supplier: matched };
  };

  const addCustomerRegistration = (input: {
    shopName: string;
    ownerName: string;
    whatsapp: string;
    address: string;
    city?: string;
    email?: string;
    source?: 'App Registration' | 'Google Form';
  }): CustomerRegistration => {
    const now = new Date();
    const displayDateTime = now.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    const cleanWhatsapp = normalizeDigits10(input.whatsapp) || input.whatsapp.trim();
    const newReg: CustomerRegistration = {
      id: `REG-${Date.now().toString().slice(-6)}`,
      registeredAt: now.toISOString(),
      registeredAtDisplay: displayDateTime,
      shopName: input.shopName.trim(),
      ownerName: input.ownerName.trim(),
      whatsapp: cleanWhatsapp,
      address: input.address.trim(),
      city: input.city?.trim() || 'Cuttack',
      email: input.email?.trim() || undefined,
      source: input.source || 'Google Form',
      status: 'Pending',
      syncedToSheet: false,
    };

    setCustomerRegistrations((prev) => [newReg, ...prev]);

    const notifItem: AppNotification = {
      id: `notif-reg-${Date.now()}`,
      title: 'New Retailer Registration',
      message: `${newReg.shopName} (${newReg.ownerName}) • WhatsApp: ${newReg.whatsapp} • ${displayDateTime}`,
      timestamp: displayDateTime,
      type: 'order',
      priority: 'high',
      read: false,
      linkTab: 'home',
    };
    setNotifications((prev) => [notifItem, ...prev]);
    logActivity(
      'New Retailer Registration',
      `${newReg.shopName} (${newReg.ownerName}) • WhatsApp: ${newReg.whatsapp} at ${displayDateTime}`
    );
    showToast(`Registration submitted (${displayDateTime})! Owner home & Google Sheet queue me save ho gaya.`, 'success');
    return newReg;
  };

  const approveCustomerRegistration = (regId: string): Customer | null => {
    const reg = customerRegistrations.find((r) => r.id === regId);
    if (!reg) return null;

    const cleanWhatsapp = normalizeDigits10(reg.whatsapp);
    let targetCustomer = customers.find(
      (c) =>
        (cleanWhatsapp.length === 10 &&
          (normalizeDigits10(c.phone) === cleanWhatsapp || normalizeDigits10(c.whatsapp) === cleanWhatsapp)) ||
        (reg.email && c.email && c.email.toLowerCase() === reg.email.toLowerCase())
    );

    if (!targetCustomer) {
      targetCustomer = addCustomer({
        shopName: reg.shopName,
        ownerName: reg.ownerName,
        phone: reg.whatsapp,
        whatsapp: reg.whatsapp,
        email: reg.email,
        address: reg.address,
        landmark: reg.address,
        city: reg.city || 'Cuttack',
        state: 'Odisha',
        lat: 20.4856,
        lng: 85.8344,
        distanceKm: 25,
        category: 'Cosmetics & Fancy',
        tags: 'New',
        status: 'New',
        villageOrTown: reg.city || reg.address.split(',')[0] || 'Cuttack',
      });
    }

    setCustomerRegistrations((prev) =>
      prev.map((r) =>
        r.id === regId
          ? { ...r, status: 'Approved', approvedCustomerId: targetCustomer!.id }
          : r
      )
    );
    showToast(
      `Approved! Retailer ID ${targetCustomer.id} (${targetCustomer.shopName}) ab login kar sakte hain.`,
      'success'
    );
    return targetCustomer;
  };

  const rejectCustomerRegistration = (regId: string) => {
    setCustomerRegistrations((prev) =>
      prev.map((r) => (r.id === regId ? { ...r, status: 'Rejected' } : r))
    );
    showToast('Registration marked as rejected', 'info');
  };

  const markRegistrationsSyncedToSheet = () => {
    const nowIso = new Date().toISOString();
    setCustomerRegistrations((prev) =>
      prev.map((r) => ({ ...r, syncedToSheet: true, lastSyncedAt: nowIso }))
    );
  };

  const applyDigitalMarketingService = (input: {
    clientId: string;
    clientRole: 'customer' | 'supplier';
    clientName: string;
    ownerName: string;
    phone: string;
    serviceId: string;
    notes?: string;
  }): DigitalMarketingWork => {
    const service =
      digitalMarketingServices.find((s) => s.id === input.serviceId) || digitalMarketingServices[0];
    const today = new Date().toISOString().split('T')[0];
    const newWork: DigitalMarketingWork = {
      id: `dmw-${Date.now().toString().slice(-5)}`,
      clientId: input.clientId,
      clientRole: input.clientRole,
      clientName: input.clientName,
      ownerName: input.ownerName,
      phone: input.phone,
      serviceId: service.id,
      serviceName: service.name,
      status: 'Applied',
      postsDone: 0,
      targetPosts: service.defaultTargetPosts,
      appliedDate: today,
      notes: input.notes?.trim() || `${service.name} requested by ${input.clientName}`,
      price: service.price,
    };
    setDigitalMarketingWorks((prev) => [newWork, ...prev]);
    addNotification({
      title: 'Digital Marketing Service Applied',
      message: `${input.clientName} (${input.clientRole === 'supplier' ? 'Supplier' : 'Retailer'}) applied for ${service.name}.`,
      type: 'order',
      priority: 'normal',
      linkTab: 'home',
    });
    logActivity(
      'Digital Marketing Apply',
      `${input.clientName} applied for ${service.name}`
    );
    showToast(`Applied for ${service.name}!`, 'success');
    return newWork;
  };

  const updateDigitalMarketingWorkStatus = (
    workId: string,
    status: DigitalMarketingWork['status']
  ) => {
    setDigitalMarketingWorks((prev) =>
      prev.map((w) => (w.id === workId ? { ...w, status } : w))
    );
    showToast(`Digital marketing status updated to ${status}`, 'success');
  };

  const incrementDigitalMarketingPost = (workId: string) => {
    const today = new Date().toISOString().split('T')[0];
    setDigitalMarketingWorks((prev) =>
      prev.map((w) => {
        if (w.id !== workId) return w;
        const nextPosts = w.postsDone + 1;
        const nextStatus =
          nextPosts >= w.targetPosts
            ? 'Completed'
            : w.status === 'Applied'
            ? 'Running'
            : w.status;
        return {
          ...w,
          postsDone: nextPosts,
          status: nextStatus,
          lastPostDate: today,
        };
      })
    );
    showToast('Published post count updated (+1 Post)!', 'success');
  };

  const updateCustomer = (customerId: string, patch: Partial<Customer>) => {
    setCustomers((prev) => prev.map((c) => (c.id === customerId ? { ...c, ...patch } : c)));
    if (user?.role === 'customer' && user.customerId === customerId) {
      const updatedUser: User = {
        ...user,
        name:
          patch.shopName || patch.ownerName
            ? `${patch.shopName || user.name.split(' (')[0]} (${patch.ownerName || 'Retailer'})`
            : user.name,
        phone: patch.phone || user.phone,
      };
      setUser(updatedUser);
      localStorage.setItem('rupam_user', JSON.stringify(updatedUser));
    }
    showToast('Retailer ID profile updated');
  };

  const editCustomerWithId = (
    oldId: string,
    patch: Partial<Customer> & { newId?: string }
  ): boolean => {
    const cleanNewId = (patch.newId || oldId).trim();
    if (!cleanNewId) {
      showToast('Retailer ID cannot be empty', 'error');
      return false;
    }
    if (cleanNewId !== oldId && customers.some((c) => c.id === cleanNewId)) {
      showToast(`Retailer ID "${cleanNewId}" already exists!`, 'error');
      return false;
    }
    const { newId: _ignored, ...fields } = patch;
    void _ignored;

    setCustomers((prev) =>
      prev.map((c) => (c.id === oldId ? { ...c, ...fields, id: cleanNewId } : c))
    );

    if (cleanNewId !== oldId) {
      setOrders((prev) =>
        prev.map((o) =>
          o.customerId === oldId
            ? {
                ...o,
                customerId: cleanNewId,
                shopName: fields.shopName || o.shopName,
                customerName: fields.ownerName || o.customerName,
                phone: fields.phone || o.phone,
              }
            : o
        )
      );
      setUdhaar((prev) =>
        prev.map((u) => (u.customerId === oldId ? { ...u, customerId: cleanNewId } : u))
      );
      setPayments((prev) =>
        prev.map((p) => (p.customerId === oldId ? { ...p, customerId: cleanNewId } : p))
      );
      setReturns((prev) =>
        prev.map((r) => (r.customerId === oldId ? { ...r, customerId: cleanNewId } : r))
      );
      setBusinesses((prev) =>
        prev.map((b) => ({
          ...b,
          customerIds: (b.customerIds || []).map((cid) => (cid === oldId ? cleanNewId : cid)),
        }))
      );
    }

    if (user?.role === 'customer' && user.customerId === oldId) {
      const target = customers.find((c) => c.id === oldId);
      const updatedUser: User = {
        ...user,
        id: cleanNewId,
        customerId: cleanNewId,
        name: `${fields.shopName || target?.shopName || 'Retailer'} (${fields.ownerName || target?.ownerName || 'Owner'})`,
        phone: fields.phone || target?.phone || user.phone,
      };
      setUser(updatedUser);
      localStorage.setItem('rupam_user', JSON.stringify(updatedUser));
    }

    if (cleanNewId !== oldId) {
      void deleteRenamedFirestoreDoc('customers', oldId).catch(() => {});
    }

    logActivity('Edited Retailer ID', `Updated ${oldId}${cleanNewId !== oldId ? ` -> ${cleanNewId}` : ''}`);
    showToast(`Retailer ID (${cleanNewId}) saved successfully!`, 'success');
    return true;
  };

  const deleteCustomer = (customerId: string, reason?: string) => {
    const target = customers.find((c) => c.id === customerId);
    setCustomers((prev) => prev.filter((c) => c.id !== customerId));
    logHubActivity({
      actor: user?.name || 'Shuvam Behera (Owner)',
      role: 'owner',
      entityType: 'customer',
      entityId: customerId,
      entityName: target?.shopName || customerId,
      action: 'Delete Retailer',
      details: `Retailer moved to trash/removed`,
      reason: reason || 'Owner deleted retailer record',
    });
    showToast(`Retailer removed`, 'info', () => {
      if (target) {
        setCustomers((prev) => [target, ...prev]);
        showToast('Retailer restored');
      }
    });
  };

  const addSupplier = (supplierData: Omit<Supplier, 'id'>): Supplier => {
    const newSupp: Supplier = {
      ...supplierData,
      id: 'supp-' + Date.now(),
      businessId: supplierData.businessId || activeBusinessId,
    };
    setSuppliers((prev) => [newSupp, ...prev]);
    logHubActivity({
      actor: user?.name || 'Shuvam Behera (Owner)',
      role: 'owner',
      entityType: 'supplier',
      entityId: newSupp.id,
      entityName: newSupp.name,
      action: 'Add Supplier',
      details: `Registered ${newSupp.name} (${newSupp.type || 'Supplier'})`,
    });
    showToast(`Supplier "${newSupp.name}" registered successfully!`);
    return newSupp;
  };

  const updateSupplier = (supplierId: string, patch: Partial<Supplier>) => {
    setSuppliers((prev) => prev.map((s) => (s.id === supplierId ? { ...s, ...patch } : s)));
    if (user?.role === 'supplier' && user.supplierId === supplierId) {
      const updatedUser: User = {
        ...user,
        name: patch.name || user.name,
        phone: patch.phone || user.phone,
      };
      setUser(updatedUser);
      localStorage.setItem('rupam_user', JSON.stringify(updatedUser));
    }
    showToast('Supplier ID profile updated');
  };

  const editSupplierWithId = (
    oldId: string,
    patch: Partial<Supplier> & { newId?: string }
  ): boolean => {
    const cleanNewId = (patch.newId || oldId).trim();
    if (!cleanNewId) {
      showToast('Supplier ID cannot be empty', 'error');
      return false;
    }
    if (cleanNewId !== oldId && suppliers.some((s) => s.id === cleanNewId)) {
      showToast(`Supplier ID "${cleanNewId}" already exists!`, 'error');
      return false;
    }
    const { newId: _ignored, ...fields } = patch;
    void _ignored;

    setSuppliers((prev) =>
      prev.map((s) => (s.id === oldId ? { ...s, ...fields, id: cleanNewId } : s))
    );

    if (cleanNewId !== oldId) {
      setProducts((prev) =>
        prev.map((p) => (p.supplierId === oldId ? { ...p, supplierId: cleanNewId } : p))
      );
      setSupplierOrders((prev) =>
        prev.map((po) =>
          po.supplierId === oldId
            ? { ...po, supplierId: cleanNewId, supplierName: fields.name || po.supplierName }
            : po
        )
      );
      setSupplierPrices((prev) =>
        prev.map((sp) => (sp.supplierId === oldId ? { ...sp, supplierId: cleanNewId } : sp))
      );
      setBusinesses((prev) =>
        prev.map((b) => ({
          ...b,
          supplierIds: (b.supplierIds || []).map((sid) => (sid === oldId ? cleanNewId : sid)),
        }))
      );
    }

    if (user?.role === 'supplier' && user.supplierId === oldId) {
      const target = suppliers.find((s) => s.id === oldId);
      const updatedUser: User = {
        ...user,
        id: cleanNewId,
        supplierId: cleanNewId,
        name: fields.name || target?.name || user.name,
        phone: fields.phone || target?.phone || user.phone,
      };
      setUser(updatedUser);
      localStorage.setItem('rupam_user', JSON.stringify(updatedUser));
    }

    if (cleanNewId !== oldId) {
      void deleteRenamedFirestoreDoc('suppliers', oldId).catch(() => {});
    }

    logActivity('Edited Supplier ID', `Updated ${oldId}${cleanNewId !== oldId ? ` -> ${cleanNewId}` : ''}`);
    showToast(`Supplier ID (${cleanNewId}) saved successfully!`, 'success');
    return true;
  };

  const editOwnerIdProfile = (patch: {
    ownerName?: string;
    businessName?: string;
    ownerPhone?: string;
    businessAddress?: string;
    upiId?: string;
  }) => {
    setSettings((prev) => {
      const updated = { ...prev, ...patch };
      localStorage.setItem('rupam_settings', JSON.stringify(updated));
      return updated;
    });
    setBusinesses((prev) =>
      prev.map((b) =>
        b.id === activeBusinessId
          ? {
              ...b,
              ownerName: patch.ownerName ?? b.ownerName,
              companyName: patch.businessName ?? b.companyName,
              phone: patch.ownerPhone ?? b.phone,
              address: patch.businessAddress ?? b.address,
              upiId: patch.upiId ?? b.upiId,
            }
          : b
      )
    );
    if (user?.role === 'owner') {
      const updatedUser: User = {
        ...user,
        name: `${patch.ownerName || settings.ownerName} (Owner)`,
        phone: patch.ownerPhone || settings.ownerPhone,
      };
      setUser(updatedUser);
      localStorage.setItem('rupam_user', JSON.stringify(updatedUser));
    }
    logActivity('Edited Owner ID', `Updated Owner profile (${patch.ownerName || settings.ownerName})`);
    showToast('Owner ID profile saved successfully!', 'success');
  };

  const editBusinessWithId = (
    oldId: string,
    patch: Partial<BusinessProfile> & { newId?: string }
  ): boolean => {
    const cleanNewId = (patch.newId || oldId).trim().toUpperCase();
    if (!cleanNewId) {
      showToast('Owner Business ID cannot be empty', 'error');
      return false;
    }
    if (cleanNewId !== oldId && businesses.some((b) => b.id === cleanNewId)) {
      showToast(`Business ID "${cleanNewId}" already exists!`, 'error');
      return false;
    }
    const { newId: _ignored, ...fields } = patch;
    void _ignored;

    setBusinesses((prev) =>
      prev.map((b) => (b.id === oldId ? { ...b, ...fields, id: cleanNewId } : b))
    );

    if (cleanNewId !== oldId) {
      setProducts((prev) => prev.map((p) => (p.businessId === oldId ? { ...p, businessId: cleanNewId } : p)));
      setCustomers((prev) => prev.map((c) => (c.businessId === oldId ? { ...c, businessId: cleanNewId } : c)));
      setSuppliers((prev) => prev.map((s) => (s.businessId === oldId ? { ...s, businessId: cleanNewId } : s)));
      setOrders((prev) => prev.map((o) => (o.businessId === oldId ? { ...o, businessId: cleanNewId } : o)));
      if (activeBusinessId === oldId) {
        setActiveBusinessId(cleanNewId);
      }
    }

    if (activeBusinessId === oldId || activeBusinessId === cleanNewId) {
      setSettings((prev) => {
        const updated = {
          ...prev,
          businessName: fields.companyName || prev.businessName,
          ownerName: fields.ownerName || prev.ownerName,
          ownerPhone: fields.phone || prev.ownerPhone,
          businessAddress: fields.address || prev.businessAddress,
          upiId: fields.upiId || prev.upiId,
        };
        localStorage.setItem('rupam_settings', JSON.stringify(updated));
        return updated;
      });
    }

    if (cleanNewId !== oldId) {
      void deleteRenamedFirestoreDoc('businesses', oldId).catch(() => {});
    }

    logActivity('Edited Owner Business ID', `Updated ${oldId}${cleanNewId !== oldId ? ` -> ${cleanNewId}` : ''}`);
    showToast(`Owner Business ID (${cleanNewId}) saved successfully!`, 'success');
    return true;
  };

  const updateSupplierPrice = (priceId: string, patch: Partial<SupplierPrice>) => {
    setSupplierPrices((prev) => prev.map((p) => (p.id === priceId ? { ...p, ...patch } : p)));
    showToast('Supplier quotation updated');
  };

  const paySupplierBalance = (supplierId: string, amount: number, mode: string, note = '') => {
    setSuppliers((prev) =>
      prev.map((s) => {
        if (s.id === supplierId) {
          const currentDue = s.dueAmount || s.pendingDues || 0;
          const newDue = Math.max(0, currentDue - amount);
          return {
            ...s,
            dueAmount: newDue,
            pendingDues: newDue,
            paymentStatus: newDue === 0 ? 'All Clear' : 'Dues Pending',
          };
        }
        return s;
      })
    );

    // Update PO balance
    setSupplierOrders((prev) =>
      prev.map((po) => {
        if (po.supplierId === supplierId && po.balanceDue > 0) {
          const cleared = Math.min(po.balanceDue, amount);
          const newBal = po.balanceDue - cleared;
          return {
            ...po,
            balanceDue: newBal,
            advancePaid: po.advancePaid + cleared,
            paymentStatus: newBal === 0 ? 'Settled' : 'Partial',
          };
        }
        return po;
      })
    );

    // Add payment entry into payments history
    const targetSupplier = suppliers.find((s) => s.id === supplierId);
    const modeNormalized: 'UPI' | 'Cash' | 'Bank' | 'Bus-cash' = mode.includes('Cash') ? 'Cash' : mode.includes('UPI') ? 'UPI' : 'Bank';
    const payEntry: Payment = {
      id: 'pay-sup-' + Date.now(),
      customerId: supplierId,
      customerName: targetSupplier?.contactPerson || targetSupplier?.name || 'Supplier',
      shopName: targetSupplier?.name || 'Supplier Outward',
      amount,
      mode: modeNormalized,
      referenceId: `SUP-PAY-${Date.now().toString().slice(-6)}`,
      confirmedByOwner: true,
      date: new Date().toISOString().split('T')[0],
      note: note || `Supplier payment to ${targetSupplier?.name || supplierId} via ${mode}`,
      type: 'Supplier Due',
    };
    setPayments((prev) => [payEntry, ...prev]);

    logActivity('Owner Payment to Supplier', `Paid ₹${amount.toLocaleString('en-IN')} via ${mode} to supplier (${supplierId})`, note);
    showToast(`Payment of ₹${amount.toLocaleString('en-IN')} to supplier recorded!`);
  };

  const addSupplierOrder = (orderData: Omit<SupplierPurchaseOrder, 'id' | 'poNumber'>): SupplierPurchaseOrder => {
    const id = 'spo-' + Date.now();
    const poNumber = `PO-${orderData.supplierId.toUpperCase().replace(/\W/g, '').slice(-3)}-2026-${Math.floor(100 + Math.random() * 900)}`;
    const newOrder: SupplierPurchaseOrder = {
      ...orderData,
      id,
      poNumber,
    };
    setSupplierOrders((prev) => [newOrder, ...prev]);

    setSuppliers((prev) =>
      prev.map((s) => {
        if (s.id === orderData.supplierId) {
          const currentDue = s.dueAmount || s.pendingDues || 0;
          const newDue = currentDue + orderData.balanceDue;
          return {
            ...s,
            dueAmount: newDue,
            pendingDues: newDue,
            totalPurchases: (s.totalPurchases || 0) + orderData.totalAmount,
          };
        }
        return s;
      })
    );

    logActivity('Created Supplier Purchase Order', `${poNumber} for ${orderData.supplierName}: ₹${orderData.totalAmount}`);
    showToast(`Purchase Order ${poNumber} created successfully!`);
    return newOrder;
  };

  const updateSupplierOrderStatus = (orderId: string, status: SupplierPurchaseOrder['status'], note?: string) => {
    setSupplierOrders((prev) =>
      prev.map((po) => (po.id === orderId ? { ...po, status, ownerNotes: note || po.ownerNotes } : po))
    );
    showToast(`Purchase Order status updated to "${status}"`);
  };

  const settleSupplierBill = (orderId: string, mode = 'Bank/UPI') => {
    let clearedAmount = 0;
    let targetSupplierId = '';
    let targetPoNumber = '';

    setSupplierOrders((prev) =>
      prev.map((po) => {
        if (po.id === orderId) {
          clearedAmount = po.balanceDue;
          targetSupplierId = po.supplierId;
          targetPoNumber = po.poNumber;
          return {
            ...po,
            balanceDue: 0,
            advancePaid: po.totalAmount,
            paymentStatus: 'Settled',
            status: po.status === 'Draft' || po.status === 'Confirmed' ? 'Dispatched' : po.status,
          };
        }
        return po;
      })
    );

    if (targetSupplierId && clearedAmount > 0) {
      setSuppliers((prev) =>
        prev.map((s) => {
          if (s.id === targetSupplierId) {
            const currentDue = s.dueAmount || s.pendingDues || 0;
            const newDue = Math.max(0, currentDue - clearedAmount);
            return {
              ...s,
              dueAmount: newDue,
              pendingDues: newDue,
              paymentStatus: newDue === 0 ? 'All Clear' : 'Dues Pending',
            };
          }
          return s;
        })
      );

      const targetSupplier = suppliers.find((s) => s.id === targetSupplierId);
      const modeNormalized: 'UPI' | 'Cash' | 'Bank' | 'Bus-cash' = mode.includes('Cash') ? 'Cash' : mode.includes('UPI') ? 'UPI' : 'Bank';
      const payEntry: Payment = {
        id: 'pay-sup-' + Date.now(),
        customerId: targetSupplierId,
        customerName: targetSupplier?.contactPerson || targetSupplier?.name || 'Supplier',
        shopName: targetSupplier?.name || 'Supplier Outward',
        amount: clearedAmount,
        mode: modeNormalized,
        referenceId: `BILL-PAY-${Date.now().toString().slice(-6)}`,
        confirmedByOwner: true,
        date: new Date().toISOString().split('T')[0],
        note: `Settled consignment bill #${targetPoNumber} via ${mode}`,
        type: 'Supplier Due',
      };
      setPayments((prev) => [payEntry, ...prev]);
    }

    logActivity('Settled Supplier Bill', `PO ${targetPoNumber}: Settled bill amount of ₹${clearedAmount.toLocaleString('en-IN')} via ${mode}`);
    showToast(`Bill #${targetPoNumber} marked as Paid & Settled!`, 'success');
  };

  const logHubActivity = (logData: Omit<HubActivityLog, 'id' | 'timestamp'>) => {
    const entry: HubActivityLog = {
      ...logData,
      id: 'hal-' + Date.now(),
      timestamp: new Date().toISOString(),
    };
    setHubActivityLogs((prev) => [entry, ...prev.slice(0, 99)]);
  };

  const resetToDemoData = () => {
    localStorage.removeItem('rupam_orders');
    localStorage.removeItem('rupam_products');
    localStorage.removeItem('rupam_customers');
    localStorage.removeItem('rupam_customers_hub_v2');
    localStorage.removeItem('rupam_suppliers_hub_v2');
    localStorage.removeItem('rupam_supplier_prices_v2');
    localStorage.removeItem('rupam_hub_logs_v2');
    localStorage.removeItem('rupam_udhaar');
    localStorage.removeItem('rupam_returns');
    localStorage.removeItem('rupam_expenses');
    localStorage.removeItem('rupam_settings');
    localStorage.removeItem('rupam_notifications_v1');

    setOrders(INITIAL_ORDERS);
    setProducts(INITIAL_PRODUCTS);
    setCustomers(SEED_HUB_CUSTOMERS);
    setSuppliers(SEED_HUB_SUPPLIERS);
    setSupplierPrices(SEED_SUPPLIER_PRICES);
    setHubActivityLogs(SEED_HUB_ACTIVITY_LOGS);
    setUdhaar(INITIAL_UDHAAR);
    setReturns(INITIAL_RETURNS);
    setExpenses(INITIAL_EXPENSES);
    setSettings(INITIAL_SETTINGS);
    setNotifications(INITIAL_NOTIFICATIONS);

    showToast('Demo data restored successfully!');
  };

  const exportAllDataCsv = () => {
    const json = JSON.stringify({ orders, products, customers, udhaar, payments, expenses }, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rupam_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Complete business backup exported!');
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // GOOGLE SHEETS MULTI-ID & MULTI-TABLE SYNC ENGINE
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    localStorage.setItem('rupam_gsheet_registry_v1', JSON.stringify(sheetRegistry));
  }, [sheetRegistry]);

  useEffect(() => {
    localStorage.setItem('rupam_gsheet_history_v1', JSON.stringify(sheetHistory));
  }, [sheetHistory]);

  useEffect(() => {
    localStorage.setItem('rupam_sheets_autosync_v1', sheetsAutoSync ? 'true' : 'false');
  }, [sheetsAutoSync]);

  const workspaceTablesSource: WorkspaceTablesSource = {
    role,
    user,
    settings,
    businesses,
    activeBusinessId,
    customers,
    suppliers,
    products,
    orders,
    supplierOrders,
    payments,
    udhaar,
    returns,
    expenses,
    supplierPrices,
    enquiries,
    customerRegistrations,
    digitalMarketingWorks,
  };

  const sheetTargets = buildSheetTargetsForWorkspace({
    role,
    user,
    businesses,
    customers,
    suppliers,
    settings,
  });

  const activeSheetTarget: SheetTargetDescriptor | null = sheetTargets[0] || null;

  const appendSheetHistory = (entry: Omit<SheetSyncHistoryEntry, 'id' | 'timestamp'>) => {
    setSheetHistory((prev) => [
      {
        ...entry,
        id: 'sh-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
        timestamp: new Date().toISOString(),
      },
      ...prev.slice(0, 79),
    ]);
  };

  const recordSheetError = (message: string) => {
    setLastSheetsError(message);
    setSheetsSyncState('error');
  };

  const connectGoogleSheetsAccount = async (): Promise<boolean> => {
    try {
      const res = await signInForGoogleSheets();
      setFirebaseUser({
        uid: res.user.uid,
        email: res.user.email,
        displayName: res.user.displayName,
      });
      setHasSheetsAuth(true);
      setLastSheetsError(null);
      showToast(
        res.user.email
          ? `Connected Gmail (${res.user.email}) for Google Sheets!`
          : 'Connected Google Sheets account successfully!',
        'success'
      );
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Google Sign-In failed';
      setLastSheetsError(msg);
      showToast(msg, 'error');
      return false;
    }
  };

  const disconnectGoogleSheetsAccount = () => {
    clearSheetsAccessToken();
    setHasSheetsAuth(false);
    setSheetsAutoSyncConfirmedThisSession(false);
    setSheetsAutoSync(false);
    setLastSheetsError(null);
    showToast('Disconnected Google Sheets Gmail session. You can sign in with another Gmail ID.', 'info');
  };

  const setSheetsAutoSyncEnabled = (enabled: boolean) => {
    setSheetsAutoSync(enabled);
    if (enabled) {
      setSheetsAutoSyncConfirmedThisSession(true);
      showToast('Auto Sync turned ON for your Google Sheet!', 'success');
    } else {
      setSheetsAutoSyncConfirmedThisSession(false);
      showToast('Auto Sync turned OFF', 'info');
    }
  };

  const getTablesForTarget = (target: SheetTargetDescriptor) =>
    buildTablesForTarget(target, workspaceTablesSource, sheetRegistry);

  const syncOneTargetSheet = async (
    target: SheetTargetDescriptor,
    mode: SheetSyncHistoryEntry['mode'] = 'Manual'
  ): Promise<SheetFileRecord | null> => {
    const token = getSheetsAccessToken();
    if (!token) {
      setHasSheetsAuth(false);
      const errMsg = 'Google Sheets sign-in required. Click "Sign in with Google" first.';
      if (mode !== 'Auto Sync') {
        setLastSheetsError(errMsg);
        showToast(errMsg, 'warning');
      }
      return null;
    }

    setSheetsSyncState('syncing');
    setLastSheetsError(null);
    const tables = buildTablesForTarget(target, workspaceTablesSource, sheetRegistry);

    try {
      const existingRec = sheetRegistry[target.fileKey];
      const updatedRecord = await syncTargetToGoogleSheet(
        token,
        target,
        tables,
        existingRec,
        firebaseUser?.email || undefined
      );

      setSheetRegistry((prev) => ({
        ...prev,
        [target.fileKey]: updatedRecord,
      }));
      if (target.targetRole === 'owner' || target.targetRole === 'business') {
        const nowIso = new Date().toISOString();
        setCustomerRegistrations((prev) =>
          prev.map((r) => ({ ...r, syncedToSheet: true, lastSyncedAt: nowIso }))
        );
      }
      setSheetsSyncState('synced');
      appendSheetHistory({
        fileKey: target.fileKey,
        label: target.label,
        spreadsheetId: updatedRecord.spreadsheetId,
        tablesCount: updatedRecord.tables.length,
        rowsCount: updatedRecord.totalRows,
        mode,
        status: 'Success',
        message: `Synced ${updatedRecord.tables.length} tables (${updatedRecord.totalRows} rows)`,
      });
      logActivity(
        'Google Sheets Sync',
        `${target.label} -> ${updatedRecord.tables.length} tables, ${updatedRecord.totalRows} rows`
      );
      if (mode === 'Manual') {
        showToast(
          `Synced ${updatedRecord.tables.length} tables (${updatedRecord.totalRows} rows) to ${target.label}!`,
          'success'
        );
      }
      return updatedRecord;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Google Sheets sync failed';
      setLastSheetsError(msg);
      setSheetsSyncState('error');
      if (msg.toLowerCase().includes('401') || msg.toLowerCase().includes('invalid authentication') || msg.toLowerCase().includes('invalid credentials')) {
        clearSheetsAccessToken();
        setHasSheetsAuth(false);
      }
      appendSheetHistory({
        fileKey: target.fileKey,
        label: target.label,
        spreadsheetId: sheetRegistry[target.fileKey]?.spreadsheetId || '',
        tablesCount: tables.length,
        rowsCount: 0,
        mode,
        status: 'Error',
        message: msg,
      });
      if (mode !== 'Auto Sync') {
        showToast(`Sheet sync error: ${msg}`, 'error');
      }
      return null;
    }
  };

  const syncAllTargetsForOwner = async (): Promise<{ succeeded: number; failed: number }> => {
    if (role !== 'owner') {
      if (activeSheetTarget) {
        const res = await syncOneTargetSheet(activeSheetTarget, 'Manual');
        return { succeeded: res ? 1 : 0, failed: res ? 0 : 1 };
      }
      return { succeeded: 0, failed: 0 };
    }

    const token = getSheetsAccessToken();
    if (!token) {
      setHasSheetsAuth(false);
      showToast('Please Sign in with Google first to sync all ID files.', 'warning');
      return { succeeded: 0, failed: sheetTargets.length };
    }

    setSheetsSyncState('syncing');
    setLastSheetsError(null);
    let succeeded = 0;
    let failed = 0;
    let workingRegistry = { ...sheetRegistry };

    // Sync individual IDs first so Owner Master's ID_Files_Index has all updated URLs/IDs, then sync Owner Master last
    const orderedTargets = [
      ...sheetTargets.filter((t) => t.fileKey !== 'owner-master'),
      ...sheetTargets.filter((t) => t.fileKey === 'owner-master'),
    ];

    for (const tgt of orderedTargets) {
      const tables = buildTablesForTarget(tgt, workspaceTablesSource, workingRegistry);
      try {
        const updatedRecord = await syncTargetToGoogleSheet(
          token,
          tgt,
          tables,
          workingRegistry[tgt.fileKey],
          firebaseUser?.email || undefined
        );
        workingRegistry = {
          ...workingRegistry,
          [tgt.fileKey]: updatedRecord,
        };
        succeeded += 1;
        appendSheetHistory({
          fileKey: tgt.fileKey,
          label: tgt.label,
          spreadsheetId: updatedRecord.spreadsheetId,
          tablesCount: updatedRecord.tables.length,
          rowsCount: updatedRecord.totalRows,
          mode: 'Bulk Sync',
          status: 'Success',
          message: `Synced ${updatedRecord.tables.length} tables (${updatedRecord.totalRows} rows)`,
        });
      } catch (err) {
        failed += 1;
        const msg = err instanceof Error ? err.message : 'Sync failed';
        setLastSheetsError(msg);
        appendSheetHistory({
          fileKey: tgt.fileKey,
          label: tgt.label,
          spreadsheetId: workingRegistry[tgt.fileKey]?.spreadsheetId || '',
          tablesCount: tables.length,
          rowsCount: 0,
          mode: 'Bulk Sync',
          status: 'Error',
          message: msg,
        });
      }
    }

    setSheetRegistry(workingRegistry);
    setSheetsSyncState(failed === 0 ? 'synced' : 'error');
    showToast(
      `Synced ${succeeded} separate Google Sheet files${failed > 0 ? ` (${failed} failed)` : ''}!`,
      failed > 0 ? 'warning' : 'success'
    );
    return { succeeded, failed };
  };

  const linkExistingSpreadsheetForTarget = async (
    target: SheetTargetDescriptor,
    spreadsheetIdOrUrl: string
  ): Promise<boolean> => {
    const token = getSheetsAccessToken();
    if (!token) {
      showToast('Please Sign in with Google first to link an existing Sheet.', 'warning');
      return false;
    }
    const raw = spreadsheetIdOrUrl.trim();
    const urlMatch = raw.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    const spreadsheetId = urlMatch ? urlMatch[1] : raw;
    if (!spreadsheetId) {
      showToast('Please enter a valid Google Sheet ID or URL.', 'error');
      return false;
    }

    try {
      const meta = await fetchSpreadsheetMetadata(token, spreadsheetId);
      setSheetRegistry((prev) => ({
        ...prev,
        [target.fileKey]: {
          fileKey: target.fileKey,
          targetId: target.targetId,
          targetRole: target.targetRole,
          label: target.label,
          spreadsheetId: meta.spreadsheetId,
          spreadsheetUrl: meta.spreadsheetUrl,
          tables: meta.sheetTitles,
          totalRows: prev[target.fileKey]?.totalRows || 0,
          lastSyncedAt: new Date().toISOString(),
          syncedByEmail: firebaseUser?.email || undefined,
          lastError: null,
        },
      }));
      showToast(`Linked "${meta.title}" to ${target.label}!`, 'success');
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not access that Google Sheet';
      setLastSheetsError(msg);
      showToast(msg, 'error');
      return false;
    }
  };

  const pullTableFromGoogleSheet = async (
    spreadsheetId: string,
    tableName: string
  ): Promise<{ sheetTitle: string; rows: string[][] } | null> => {
    const token = getSheetsAccessToken();
    if (!token) {
      showToast('Sign in with Google first to read live Google Sheet data.', 'warning');
      return null;
    }
    try {
      setSheetsSyncState('syncing');
      const data = await fetchSpreadsheetTableValues(token, spreadsheetId, tableName);
      setSheetsSyncState('synced');
      return data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch live sheet rows';
      setLastSheetsError(msg);
      setSheetsSyncState('error');
      showToast(msg, 'error');
      return null;
    }
  };

  // Continuous debounced Auto Sync for Google Sheets when explicitly enabled & confirmed by user
  const hasBootedSheetsAutoSyncRef = useRef(false);
  useEffect(() => {
    if (!sheetsAutoSync || !sheetsAutoSyncConfirmedThisSession || !hasSheetsAuth) return;
    if (!hasBootedSheetsAutoSyncRef.current) {
      hasBootedSheetsAutoSyncRef.current = true;
      return;
    }
    if (!activeSheetTarget) return;
    const timer = setTimeout(() => {
      if (getSheetsAccessToken() && sheetsSyncState !== 'syncing') {
        void syncOneTargetSheet(activeSheetTarget, 'Auto Sync');
      }
    }, 3000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    sheetsAutoSync,
    sheetsAutoSyncConfirmedThisSession,
    hasSheetsAuth,
    role,
    activeSheetTarget?.fileKey,
    orders,
    customers,
    suppliers,
    products,
    payments,
    udhaar,
    supplierOrders,
    returns,
    expenses,
    businesses,
    supplierPrices,
    enquiries,
    customerRegistrations,
    digitalMarketingWorks,
    settings,
  ]);

  return (
    <AppContext.Provider
      value={{
        user,
        role,
        language,
        t: TRANSLATIONS[language] || TRANSLATIONS.en,
        setLanguage,
        setUser,
        switchRole,
        switchCustomerAccount,
        switchSupplierAccount,
        switchOwnerAccount,
        logout,
        isDemoMode,
        setIsDemoMode,
        syncStatus,
        activeTab,
        setActiveTab,
        activeSubPage,
        setActiveSubPage,
        openMorePage,
        timeFilter,
        setTimeFilter,
        selectedYear,
        setSelectedYear,
        selectedMonth,
        setSelectedMonth,
        settings,
        updateSettings,
        customers,
        products,
        orders,
        payments,
        udhaar,
        returns,
        suppliers,
        supplierOrders,
        supplierPrices,
        expenses,
        marketingClients,
        deliverables,
        digitalMarketingServices,
        digitalMarketingWorks,
        enquiries,
        notifications,
        activityLogs,
        hubActivityLogs,
        customerRegistrations,
        addOrder,
        updateOrderStatus,
        addPayment,
        confirmPayment,
        addUdhaarEntry,
        clearUdhaarEntry,
        clearCustomerUdhaar,
        paySupplierBalance,
        addSupplierOrder,
        updateSupplierOrderStatus,
        settleSupplierBill,
        addProduct,
        updateProductStock,
        updateProductOrganization,
        whatsappAlerts,
        autoWhatsAppAlertEnabled,
        setAutoWhatsAppAlertEnabled,
        autoReorderDraftEnabled,
        setAutoReorderDraftEnabled,
        isRealtimeInventoryConnected,
        sendDealerLowStockAlert,
        autoReorderProduct,
        addCustomer,
        updateCustomer,
        editCustomerWithId,
        deleteCustomer,
        addSupplier,
        updateSupplier,
        editSupplierWithId,
        editOwnerIdProfile,
        editBusinessWithId,
        updateSupplierPrice,
        logHubActivity,
        addReturnRequest,
        resolveReturnRequest,
        addExpense,
        convertEnquiryToOrder,
        markNotificationRead,
        markAllNotificationsRead,
        deleteNotification,
        addNotification,
        logActivity,
        addCustomerRegistration,
        approveCustomerRegistration,
        rejectCustomerRegistration,
        markRegistrationsSyncedToSheet,
        applyDigitalMarketingService,
        updateDigitalMarketingWorkStatus,
        incrementDigitalMarketingPost,
        verifyRetailerLogin,
        verifySupplierLogin,
        isQuickAddOpen,
        setIsQuickAddOpen,
        isAiModalOpen,
        setIsAiModalOpen,
        isNotificationCenterOpen,
        setIsNotificationCenterOpen,
        isMenuDrawerOpen,
        setIsMenuDrawerOpen,
        isBusinessSwitcherOpen,
        setIsBusinessSwitcherOpen,
        isCreateBusinessOpen,
        setIsCreateBusinessOpen,
        cart,
        isCartOpen,
        setIsCartOpen,
        addToCart,
        setCartItemQty,
        clearCart,
        totalCartItems,
        cartTotalValue,
        businesses,
        activeBusinessId,
        activeBusiness,
        switchBusiness,
        addBusiness,
        updateBusiness,
        deleteBusiness,
        addProductToBusiness,
        addCustomerToBusiness,
        addSupplierToBusiness,
        onboardingDismissed,
        dismissOnboarding,
        toasts,
        showToast,
        dismissToast,
        resetToDemoData,
        exportAllDataCsv,
        landedCostConfig,
        updateLandedCostConfig,
        firebaseUser,
        firebaseSyncState,
        firebaseConnected,
        lastFirebaseSyncAt,
        lastFirebaseError,
        syncedCollectionsCount,
        connectAndSyncFirebase,
        syncToFirebase,
        pullFromFirebase,
        disconnectFirebase,
        hasSheetsAuth,
        sheetsSyncState,
        sheetsAutoSync,
        lastSheetsError,
        sheetRegistry,
        sheetHistory,
        sheetTargets,
        activeSheetTarget,
        connectGoogleSheetsAccount,
        disconnectGoogleSheetsAccount,
        setSheetsAutoSyncEnabled,
        syncOneTargetSheet,
        syncAllTargetsForOwner,
        linkExistingSpreadsheetForTarget,
        pullTableFromGoogleSheet,
        getTablesForTarget,
        recordSheetError,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
