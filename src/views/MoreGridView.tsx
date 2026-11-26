import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { tr } from '../data/translations';
import {
  Users,
  Truck,
  FileText,
  RotateCcw,
  Store,
  Package,
  AlertTriangle,
  Building2,
  ScanLine,
  BookOpen,
  Receipt,
  Calculator,
  BarChart3,
  Share2,
  Sparkles,
  Inbox,
  Globe,
  MapPin,
  Contact,
  Settings,
  Database,
  LayoutGrid,
  ShoppingBag,
  Wallet,
  Megaphone,
  SlidersHorizontal,
  Search,
  X,
  ChevronRight,
  Camera,
  FileCode,
  Tag,
  ClipboardList,
  ArrowRight,
  CheckCircle2,
  Download,
  Smartphone,
  Check,
  ExternalLink,
  HelpCircle,
  FileSpreadsheet,
  UserPlus,
  TrendingUp,
} from 'lucide-react';

type CategoryId = 'all' | 'orders_delivery' | 'stock' | 'finance' | 'marketing' | 'operations';
type RolePerspective = 'owner' | 'customer' | 'supplier';

interface ToolItem {
  id: string;
  stepNumber: number;
  stepLabel: string;
  nextStepHint: string;
  label: string;
  hindiLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  category: 'orders_delivery' | 'stock' | 'finance' | 'marketing' | 'operations';
  tag: string;
  badge: string;
  desc: string;
  actionType: 'subpage' | 'tab' | 'barcode' | 'backup';
  target?: string;
  isNew?: boolean;
}

export const MoreGridView: React.FC = () => {
  const {
    openMorePage,
    setActiveTab,
    setActiveSubPage,
    role,
    user,
    language,
    customers,
    suppliers,
    exportAllDataCsv,
    resetToDemoData,
    products,
    showToast,
  } = useApp();

  const loggedInCustomer = customers.find((c) => c.id === user?.customerId) || customers[0];
  const loggedInSupplier = suppliers.find((s) => s.id === user?.supplierId) || suppliers[0];

  // Strictly lock More section perspective to the active open role
  const rolePerspective: RolePerspective =
    role === 'customer' ? 'customer' : role === 'supplier' ? 'supplier' : 'owner';

  const [selectedCategory, setSelectedCategory] = useState<CategoryId>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isBarcodeOpen, setIsBarcodeOpen] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const [scannedProduct, setScannedProduct] = useState<typeof products[0] | null>(null);

  // Complete tools ordered in chronological business workflow order ("kis kaam ke baad kaunsa tool dekhna chahiye")
  const allTools: ToolItem[] = [
    // ══════════════════════════════════════════════════════════════════
    // CATEGORY 0: Multi-Business & Owner Management
    // ══════════════════════════════════════════════════════════════════
    {
      id: 'businessHub',
      stepNumber: 0,
      stepLabel: '🌟 Multi-Business IDs: Company & Owner Hub (Step 0)',
      nextStepHint: 'Next: Step 1 Retailer & Supplier Network',
      label: 'Multi-Business IDs & Companies',
      hindiLabel: 'Owner Alag Alag Business ID Hub',
      icon: Building2,
      color: 'from-indigo-600 via-purple-600 to-blue-700',
      category: 'operations',
      tag: 'Multi-Company • Business ID • Products • Retailers • Suppliers',
      badge: '🏢 Multi-Business Hub',
      desc: 'Owner ke alag alag business ke liye alag alag Business ID banayein: Naya Company Name, Owner Name, Products, Retailer shops aur Suppliers manage karein.',
      actionType: 'subpage',
      target: 'businessHub',
      isNew: true,
    },
    // ══════════════════════════════════════════════════════════════════
    // CATEGORY 1: Orders & Delivery Workflow (7 tools)
    // ══════════════════════════════════════════════════════════════════
    {
      id: 'customerHub',
      stepNumber: 1,
      stepLabel: '🌟 Master Hub: Retailer & Supplier Network (Step 1)',
      nextStepHint: 'Next: New Registrations, Invoices & Dispatch',
      label: 'Retailer & Supplier Hub',
      hindiLabel: 'Retailer & Supplier All-in-One Hub',
      icon: Users,
      color: 'from-sky-500 via-indigo-600 to-purple-600',
      category: 'orders_delivery',
      tag: 'Retailer ID + Suppliers + 7-Step Lifecycle + Landed Cost',
      badge: '👑 Step 1: Master Hub',
      desc: 'Owner Master Control Room: Retailer category, udhaar limits, 150km radius, supplier landed cost compare, 7-step lifecycle, and direct phonebook sync.',
      actionType: 'subpage',
      target: 'customerHub',
      isNew: true,
    },
    {
      id: 'registrations',
      stepNumber: 1,
      stepLabel: 'Full Detail: New Customer Registrations',
      nextStepHint: 'Next: Approve & Auto-Create Retailer ID',
      label: 'New Customer Registrations Full Detail',
      hindiLabel: 'New Retailer Registrations, Call & Sheet',
      icon: UserPlus,
      color: 'from-emerald-500 to-teal-600',
      category: 'orders_delivery',
      tag: 'Count Table + Call/WhatsApp + Google Sheet Sync',
      badge: 'Full Detail',
      desc: 'Sabhi naye retailer registration forms ka full detail: Pending/Approved counts, DateTime, WhatsApp/Call icon, Approve/Reject aur Google Sheet status.',
      actionType: 'subpage',
      target: 'registrations',
      isNew: true,
    },
    {
      id: 'customers',
      stepNumber: 1,
      stepLabel: 'Step 1: Retailer Selection',
      nextStepHint: 'Next: Online Catalogue & Booking',
      label: 'Retailers Directory',
      hindiLabel: 'Retailer & Shop Directory',
      icon: Users,
      color: 'from-blue-500 to-indigo-600',
      category: 'orders_delivery',
      tag: 'Retailer ID & 150km Radius',
      badge: 'Step 1: Identify',
      desc: 'Sabse pehle retailer ka naam, dukan ka pata, phone number aur Nuapatna se 150km free delivery radius verify karein.',
      actionType: 'subpage',
      target: 'customers',
    },
    {
      id: 'landing',
      stepNumber: 2,
      stepLabel: 'Step 2: Online Advance Booking',
      nextStepHint: 'Next: Pakka GST Invoice',
      label: 'Retailer Self-Order Portal',
      hindiLabel: 'Retailer Online Self-Order Link',
      icon: Store,
      color: 'from-violet-500 to-purple-600',
      category: 'orders_delivery',
      tag: '₹1,000 Advance Booking Link',
      badge: 'Step 2: Advance Book',
      desc: 'Retailer ko online catalogue link bhejein jahan woh kewal poore packets (6/12 pcs) me select karke ₹1,000 advance pay karega.',
      actionType: 'subpage',
      target: 'landing',
    },
    {
      id: 'invoices',
      stepNumber: 3,
      stepLabel: 'Step 3: B2B GST Invoice',
      nextStepHint: 'Next: Parcel Box Chalan',
      label: 'Invoices & B2B Bills',
      hindiLabel: 'Wholesale Bills & GST Invoices',
      icon: FileText,
      color: 'from-emerald-500 to-teal-600',
      category: 'orders_delivery',
      tag: 'GST Bill & Balance Ledger',
      badge: 'Step 3: Bill & Share',
      desc: 'Order confirm hote hi invoice banayein, ₹1,000 advance minus karke balance bill show karein aur 1-click WhatsApp par bhejein.',
      actionType: 'subpage',
      target: 'invoices',
    },
    {
      id: 'dispatchSlip',
      stepNumber: 4,
      stepLabel: 'Step 4: Box Label & Chalan',
      nextStepHint: 'Next: Dispatch & Balance Confirmation Call',
      label: 'Parcel Chalan & Box Label',
      hindiLabel: 'Parcel Chalan & Box Sticker',
      icon: ClipboardList,
      color: 'from-amber-500 to-orange-600',
      category: 'orders_delivery',
      tag: 'Box Outer Pasting Label',
      badge: 'Step 4: Box Sticker',
      desc: 'Maal pack hone par parcel dibbe par paste karne wali parchi print karein — jisme balance amount aur mandatory continuous video warning printed hoti hai.',
      actionType: 'subpage',
      target: 'dispatchSlip',
      isNew: true,
    },
    {
      id: 'delivery',
      stepNumber: 5,
      stepLabel: 'Step 5: Dispatch & Delivery',
      nextStepHint: 'Next: Unboxing Video Claim Review',
      label: 'Delivery Board & Dispatches',
      hindiLabel: 'Delivery Kanban & Dispatch Calls',
      icon: Truck,
      color: 'from-sky-500 to-blue-600',
      category: 'orders_delivery',
      tag: '1-5 Days Bus/Van & Confirmation Call',
      badge: 'Step 5: Dispatch & Call',
      desc: 'Dispatch day morning me "Balance ready hai?" call confirm karein. Ready hone par bus/van me load karein, no hone par hold karein.',
      actionType: 'subpage',
      target: 'delivery',
    },
    {
      id: 'returns',
      stepNumber: 6,
      stepLabel: 'Step 6: Returns & Damage Claims',
      nextStepHint: 'Workflow Completed ✅',
      label: 'Returns & Damage Claims',
      hindiLabel: 'Returns & Damage Verification',
      icon: RotateCcw,
      color: 'from-rose-500 to-red-600',
      category: 'orders_delivery',
      tag: 'Uncut Unboxing Video Mandatory',
      badge: 'Step 6: Video Verify',
      desc: 'Delivery ke baad agar dukandar damage claim kare, to continuous uncut video proof verify karein. Video na hone par claim reject.',
      actionType: 'subpage',
      target: 'returns',
    },

    // ══════════════════════════════════════════════════════════════════
    // CATEGORY 2: Stock & Procurement Workflow (5 tools)
    // ══════════════════════════════════════════════════════════════════
    {
      id: 'suppliers',
      stepNumber: 1,
      stepLabel: 'Step 1: Wholesale Purchase',
      nextStepHint: 'Next: Barcode Stock Input',
      label: 'Suppliers & Purchases',
      hindiLabel: 'Suppliers & Procurement',
      icon: Building2,
      color: 'from-teal-500 to-emerald-600',
      category: 'stock',
      tag: 'Cuttack & Kolkata Vendors',
      badge: 'Step 1: Purchase',
      desc: 'Suppliers se wholesale cosmetic purchase karein, landed cost add karein aur margin calculate karein.',
      actionType: 'subpage',
      target: 'suppliers',
    },
    {
      id: 'barcode',
      stepNumber: 2,
      stepLabel: 'Step 2: Barcode Inward',
      nextStepHint: 'Next: Full Packet Inventory',
      label: 'Barcode & QR Scanner',
      hindiLabel: 'Barcode & SKU Scanner',
      icon: ScanLine,
      color: 'from-cyan-500 to-blue-600',
      category: 'stock',
      tag: 'Camera Scanner & SKU Entry',
      badge: 'Step 2: Scan In',
      desc: 'Warehouse me aaye naye carton ka barcode scan karein aur instant packet quantity update karein.',
      actionType: 'barcode',
    },
    {
      id: 'stock',
      stepNumber: 3,
      stepLabel: 'Step 3: Packet Inventory',
      nextStepHint: 'Next: Low Stock Alerts',
      label: 'Products & Full Packets',
      hindiLabel: 'Cosmetic Stock & Full Packets',
      icon: Package,
      color: 'from-amber-500 to-orange-600',
      category: 'stock',
      tag: 'Full 6 or 12 Pieces Packets',
      badge: 'Step 3: Inventory',
      desc: 'Lipstick, Nail Polish, Bindi, Kajal aur Eyeliner ka total stock dekhein (kewal full 6/12 packets).',
      actionType: 'tab',
      target: 'stock',
    },
    {
      id: 'lowStock',
      stepNumber: 4,
      stepLabel: 'Step 4: Reorder Alert',
      nextStepHint: 'Next: Share Rate Card with Shops',
      label: 'Low Stock Alerts',
      hindiLabel: 'Low Stock Alerts & Reorder',
      icon: AlertTriangle,
      color: 'from-red-500 to-rose-600',
      category: 'stock',
      tag: 'Alert when under 5 packets',
      badge: 'Step 4: Reorder',
      desc: 'Kam ho rahe packets ki red warning check karke supplier ko time par naye maal ka order bhejein.',
      actionType: 'tab',
      target: 'stock',
    },
    {
      id: 'rateCard',
      stepNumber: 5,
      stepLabel: 'Step 5: Share Rate Card',
      nextStepHint: 'Workflow Completed ✅',
      label: 'Wholesale Rate Card',
      hindiLabel: 'Wholesale Rate Card & Price List',
      icon: Tag,
      color: 'from-sky-500 to-blue-600',
      category: 'stock',
      tag: '1-Click Rate Card Share',
      badge: 'Step 5: Share Rates',
      desc: 'Dukandaron ke WhatsApp par share karne ke liye cosmetic wholesale packet rate aur per-piece margin list.',
      actionType: 'subpage',
      target: 'rateCard',
      isNew: true,
    },

    // ══════════════════════════════════════════════════════════════════
    // CATEGORY 3: Accounts & Tax Workflow (4 tools)
    // ══════════════════════════════════════════════════════════════════
    {
      id: 'khata',
      stepNumber: 1,
      stepLabel: 'Step 1: Udhaar Recovery',
      nextStepHint: 'Next: Daily Shop Expenses',
      label: 'Khata & Udhaar Rules',
      hindiLabel: 'Udhaar Ledger & 10% Rule',
      icon: BookOpen,
      color: 'from-blue-600 to-indigo-700',
      category: 'finance',
      tag: 'Max 10% Shortage Rule',
      badge: 'Step 1: Collect Due',
      desc: 'Delivery par max 10% shortage allow karke udhaar record karein. Purana dues baki hone par naya order block rahega.',
      actionType: 'tab',
      target: 'khata',
    },
    {
      id: 'expenses',
      stepNumber: 2,
      stepLabel: 'Step 2: Daily Expenses',
      nextStepHint: 'Next: Monthly GST Summary',
      label: 'Daily Expenses & P&L',
      hindiLabel: 'Shop Expenses & P&L',
      icon: Receipt,
      color: 'from-purple-500 to-indigo-600',
      category: 'finance',
      tag: 'Freight, Packing & Operations',
      badge: 'Step 2: Expenses',
      desc: 'Bus freight, delivery van, packing tape, chai-nashta aur shop rent add karke net profit calculate karein.',
      actionType: 'subpage',
      target: 'expenses',
    },
    {
      id: 'taxHelper',
      stepNumber: 3,
      stepLabel: 'Step 3: GST Tax Report',
      nextStepHint: 'Next: 2-Year Business Growth',
      label: 'GST & Tax Helper',
      hindiLabel: 'GST Tax Summary for CA',
      icon: Calculator,
      color: 'from-amber-500 to-orange-600',
      category: 'finance',
      tag: 'GSTR-1, 3B & Input Credit',
      badge: 'Step 3: GST & CA',
      desc: 'Month-end par total taxable sales, Input Tax Credit (ITC) aur CA ke liye required report generate karein.',
      actionType: 'subpage',
      target: 'taxHelper',
    },
    {
      id: 'reports',
      stepNumber: 4,
      stepLabel: 'Step 4: 2-Year Growth',
      nextStepHint: 'Next: Hub Stock & Dues Full Detail',
      label: '2-Year Reports & Analytics',
      hindiLabel: '2-Year Sales & P&L Trends',
      icon: BarChart3,
      color: 'from-blue-600 to-indigo-800',
      category: 'finance',
      tag: '24 Months Sales & Profit Graph',
      badge: 'Step 4: P&L Analytics',
      desc: 'Year-over-year comparison, top cosmetic items, profit margin aur CSV Excel export analysis.',
      actionType: 'subpage',
      target: 'reports',
    },
    {
      id: 'hubSnapshot',
      stepNumber: 5,
      stepLabel: 'Full Detail: Hub Stock & Pending Dues',
      nextStepHint: 'Workflow Completed ✅',
      label: 'Hub Stock & Pending Dues Full Detail',
      hindiLabel: 'Low Stock, Udhaar Recovery & Advance Dues',
      icon: TrendingUp,
      color: 'from-amber-500 to-rose-600',
      category: 'finance',
      tag: 'Low Stock SKUs + Udhaar Call + Advance Pending',
      badge: 'Full Detail',
      desc: 'Low stock alert products table, pending udhaar dues list (Call & WhatsApp icons) aur pending advance orders full detail.',
      actionType: 'subpage',
      target: 'hubSnapshot',
      isNew: true,
    },

    // ══════════════════════════════════════════════════════════════════
    // CATEGORY 4: Marketing & Growth (5 tools)
    // ══════════════════════════════════════════════════════════════════
    {
      id: 'seo',
      stepNumber: 1,
      stepLabel: 'Step 1: Google SEO Setup',
      nextStepHint: 'Next: Live Public Website',
      label: 'Robots.txt & Sitemap SEO Hub',
      hindiLabel: 'Google Robots & Sitemap Hub',
      icon: FileCode,
      color: 'from-emerald-500 to-teal-600',
      category: 'marketing',
      tag: 'robots.txt & sitemap.xml',
      badge: 'Step 1: Google SEO',
      desc: 'Google search indexing ke liye robots.txt aur sitemap.xml manage karein taki Cuttack wholesale shopkeepers aapko aasani se dhundh sakein.',
      actionType: 'subpage',
      target: 'seo',
      isNew: true,
    },
    {
      id: 'landing_seo',
      stepNumber: 2,
      stepLabel: 'Step 2: Live Wholesale Website',
      nextStepHint: 'Next: WhatsApp Leads',
      label: 'Google SEO Public Site',
      hindiLabel: 'Google Search Public Website',
      icon: Globe,
      color: 'from-emerald-600 to-green-700',
      category: 'marketing',
      tag: 'Rupam Wholesale on Google',
      badge: 'Step 2: Web Presence',
      desc: 'Cuttack, Nuapatna aur Odisha wholesale market ke liye aapki live public storefront aur catalogue preview.',
      actionType: 'subpage',
      target: 'landing',
    },
    {
      id: 'enquiries',
      stepNumber: 3,
      stepLabel: 'Step 3: New Leads',
      nextStepHint: 'Next: Daily Offer Posters',
      label: 'Chatbot WhatsApp Inbox',
      hindiLabel: 'Chatbot Leads Inbox',
      icon: Inbox,
      color: 'from-indigo-500 to-blue-600',
      category: 'marketing',
      tag: 'WhatsApp 4-Point Lead Capture',
      badge: 'Step 3: New Leads',
      desc: 'Naye dukandaron ki enquiry dekhein: dukan naam, district/town, aur ₹1,000 advance booking status.',
      actionType: 'subpage',
      target: 'enquiries',
    },
    {
      id: 'posters',
      stepNumber: 4,
      stepLabel: 'Step 4: Offer Posters',
      nextStepHint: 'Next: Local Marketing Clients',
      label: 'WhatsApp Promo Posters',
      hindiLabel: 'WhatsApp Offer Posters',
      icon: Sparkles,
      color: 'from-fuchsia-500 to-pink-600',
      category: 'marketing',
      tag: 'Daily Status Poster Generator',
      badge: 'Step 4: Promo Posters',
      desc: 'Daily WhatsApp status aur festival offer posters banayein taki wholesale dukanon se turant naye orders aayein.',
      actionType: 'subpage',
      target: 'marketing',
    },
    {
      id: 'marketing',
      stepNumber: 5,
      stepLabel: 'Full Detail: Agency Services & Client Posts',
      nextStepHint: 'Workflow Completed ✅',
      label: 'Digital Marketing Full Detail & Posts',
      hindiLabel: 'All Services, Applied Clients, Running Work & Posts',
      icon: Share2,
      color: 'from-pink-500 to-rose-600',
      category: 'marketing',
      tag: 'Owner Services + Applied + Running + Post Count',
      badge: 'Full Detail',
      desc: 'Sabhi digital marketing services ka overview, kis retailer/supplier ne apply kiya, kiska kaam chal raha hai aur kitne posts hue sab detail dekhein.',
      actionType: 'subpage',
      target: 'marketing',
      isNew: true,
    },

    // ══════════════════════════════════════════════════════════════════
    // CATEGORY 5: Operations & Settings (4 tools)
    // ══════════════════════════════════════════════════════════════════
    {
      id: 'map',
      stepNumber: 1,
      stepLabel: 'Step 1: Distance & Radius',
      nextStepHint: 'Next: Phone Contacts Sync',
      label: '150km Free Radius Map',
      hindiLabel: '150km Radius Interactive Map',
      icon: MapPin,
      color: 'from-cyan-500 to-sky-600',
      category: 'operations',
      tag: '150 km Free Delivery Zone',
      badge: 'Step 1: GPS Radius',
      desc: 'Nuapatna hub se 150 km free delivery radius dekhein aur 150 km se bahar bus/tempo freight check karein.',
      actionType: 'subpage',
      target: 'map',
    },
    {
      id: 'contacts',
      stepNumber: 2,
      stepLabel: 'Step 2: Contacts Sync',
      nextStepHint: 'Next: Business Rules & Settings',
      label: 'Saved Contacts & vCard',
      hindiLabel: 'Retailer Contacts & Quick Sync',
      icon: Contact,
      color: 'from-violet-500 to-purple-600',
      category: 'operations',
      tag: 'Phonebook & WhatsApp vCard',
      badge: 'Step 2: vCard Sync',
      desc: 'Sabhi retailers aur suppliers ke saved mobile numbers aur instant phonebook vCard download.',
      actionType: 'subpage',
      target: 'contacts',
    },
    {
      id: 'settings',
      stepNumber: 3,
      stepLabel: 'Step 3: Admin Rules & Settings',
      nextStepHint: 'Next: Safe Cloud Backup',
      label: 'Settings & Admin Rules',
      hindiLabel: 'Owner Admin & Rules Settings',
      icon: Settings,
      color: 'from-slate-700 to-slate-900',
      category: 'operations',
      tag: 'Rules, UPI QR & Security',
      badge: 'Step 3: Business Rules',
      desc: 'Minimum Order ₹1,000 rule, 10% max udhaar rule, full 6/12 packets aur UPI QR settings manage karein.',
      actionType: 'subpage',
      target: 'settings',
    },
    {
      id: 'googleSheets',
      stepNumber: 4,
      stepLabel: 'Step 4: Live Google Sheets & Auto Sync',
      nextStepHint: 'Workflow Completed ✅',
      label: 'Google Sheets (All IDs & Tables)',
      hindiLabel: 'Google Sheets Live & Auto Sync',
      icon: FileSpreadsheet,
      color: 'from-emerald-600 to-green-700',
      category: 'operations',
      tag: 'Separate ID Files + Auto Sync',
      badge: 'Step 4: Google Sheets',
      desc: 'Har ID ke liye alag Google Sheet file aur sabhi data ki alag tables banaye, Auto Sync ON karein aur live sheet dekhein.',
      actionType: 'subpage',
      target: 'googleSheets',
    },
    {
      id: 'backup_tool',
      stepNumber: 5,
      stepLabel: 'Step 5: Data Security',
      nextStepHint: 'Workflow Completed ✅',
      label: 'Cloud Sync & Data Backup',
      hindiLabel: 'Cloud Sync & Data Backup',
      icon: Database,
      color: 'from-slate-800 to-zinc-900',
      category: 'operations',
      tag: 'Safe JSON & CSV Export',
      badge: 'Step 5: Backup',
      desc: '1-click me poora business data safe JSON me backup download karein ya restore karein.',
      actionType: 'backup',
    },
  ];

  // ══════════════════════════════════════════════════════════════════
  // ══════════════════════════════════════════════════════════════════
  // ROLE SECTION 2: Retailer Tools (Strictly scoped to logged-in Retailer)
  // ══════════════════════════════════════════════════════════════════
  const customerTools: ToolItem[] = [
    {
      id: 'landing',
      stepNumber: 1,
      stepLabel: 'Step 1: Retailer Self-Order Portal',
      nextStepHint: 'Next: My Orders & Items Full Detail',
      label: 'Retailer Self-Order & Catalogue',
      hindiLabel: 'Online Order & ₹1,000 Advance',
      icon: Store,
      color: 'from-violet-500 to-purple-600',
      category: 'orders_delivery',
      tag: '₹1,000 Advance Booking Link',
      badge: 'Step 1: Order Booking',
      desc: 'Full cosmetic packets select karke direct wholesale order book karein. ₹1,000 advance UPI se pay karein aur balance delivery par dein.',
      actionType: 'subpage',
      target: 'landing',
    },
    {
      id: 'myFullOrders',
      stepNumber: 2,
      stepLabel: 'Full Detail: My Orders & Items Breakdown',
      nextStepHint: 'Next: Parcel Box Chalan & Tracking',
      label: 'My Orders & Items Full Detail',
      hindiLabel: 'Complete Order Table, Items, Advance & Balance',
      icon: ShoppingBag,
      color: 'from-emerald-500 to-teal-600',
      category: 'orders_delivery',
      tag: 'My ID Scoped Full Order Ledger',
      badge: 'Full Detail',
      desc: 'Apni Retailer ID ke sabhi orders ki complete table: items breakdown, advance paid status, balance payable aur dispatch tracking.',
      actionType: 'subpage',
      target: 'myFullOrders',
      isNew: true,
    },
    {
      id: 'dispatchSlip',
      stepNumber: 3,
      stepLabel: 'Step 3: Parcel Box Chalan & Delivery',
      nextStepHint: 'Next: Khata & Udhaar Payment History',
      label: 'Parcel Chalan & Delivery Tracking',
      hindiLabel: 'Parcel Chalan & Box Sticker',
      icon: ClipboardList,
      color: 'from-amber-500 to-orange-600',
      category: 'orders_delivery',
      tag: 'Parcel Box Sticker & Auto-Tracking',
      badge: 'Step 3: Delivery Chalan',
      desc: 'Apne parcel dibbe par lagi parchi dekhein, bus/tempo delivery tracking check karein aur continuous unboxing video rule verify karein.',
      actionType: 'subpage',
      target: 'dispatchSlip',
    },
    {
      id: 'khata',
      stepNumber: 4,
      stepLabel: 'Step 4: My Khata & Udhaar Ledger',
      nextStepHint: 'Next: Digital Marketing Full Detail',
      label: 'My Khata & Udhaar Ledger',
      hindiLabel: 'My Udhaar & 10% Safety Ledger',
      icon: BookOpen,
      color: 'from-blue-600 to-indigo-700',
      category: 'finance',
      tag: 'Advance Receipts & Shortage Udhaar',
      badge: 'Step 4: Khata Ledger',
      desc: 'Apna payment statement dekhein: ₹1,000 advance receipt, balance paid, aur max 10% shortage udhaar clearance ledger.',
      actionType: 'tab',
      target: 'khata',
    },
    {
      id: 'marketing',
      stepNumber: 5,
      stepLabel: 'Full Detail: My Digital Marketing',
      nextStepHint: 'Next: Returns & Damage Claims',
      label: 'My Digital Marketing Full Detail',
      hindiLabel: 'Applied Services, Running Campaigns & Posts',
      icon: Megaphone,
      color: 'from-pink-500 to-rose-600',
      category: 'marketing',
      tag: 'My ID Promotions & Deliverables',
      badge: 'Full Detail',
      desc: 'Apni shop ke liye active digital marketing kaam, deliverables, total posts aur nayi marketing service ke liye apply karein.',
      actionType: 'subpage',
      target: 'marketing',
      isNew: true,
    },
    {
      id: 'returns',
      stepNumber: 6,
      stepLabel: 'Step 6: Returns & Damage Claims',
      nextStepHint: 'Retailer Workflow Completed ✅',
      label: 'Returns & Damage Claims',
      hindiLabel: 'Returns & Video Proof Verification',
      icon: RotateCcw,
      color: 'from-rose-500 to-red-600',
      category: 'orders_delivery',
      tag: 'Continuous Unboxing Video Mandatory',
      badge: 'Step 6: Claims',
      desc: 'Transit damage claim ke liye sealed parcel kholte waqt continuous uncut unboxing video attach karein.',
      actionType: 'subpage',
      target: 'returns',
    },
  ];

  // ROLE SECTION 3: Supplier Tools (Strictly scoped to logged-in Supplier)
  // ══════════════════════════════════════════════════════════════════
  const supplierTools: ToolItem[] = [
    {
      id: 'suppliers',
      stepNumber: 1,
      stepLabel: 'Step 1: Supply Orders & Stock Supply',
      nextStepHint: 'Next: My POs, Bilty & Stock Full Detail',
      label: 'My Supply Orders to Rupam',
      hindiLabel: 'Suppliers & Vendor Network',
      icon: Building2,
      color: 'from-purple-500 to-indigo-600',
      category: 'stock',
      tag: 'Stock Dispatch to Nuapatna Hub',
      badge: 'Step 1: Supply Orders',
      desc: 'Rupam Wholesale dwara diye gaye purchase orders dekhein, stock ready mark karein aur Nuapatna hub dispatch manage karein.',
      actionType: 'subpage',
      target: 'suppliers',
    },
    {
      id: 'myFullSupplyPOs',
      stepNumber: 2,
      stepLabel: 'Full Detail: My POs, Bilty & Hub Stock',
      nextStepHint: 'Next: Quoted Rate Card & Landed Margins',
      label: 'My POs, Bilty & Stock Full Detail',
      hindiLabel: 'Complete Supply POs, GST Bills & Hub Valuation',
      icon: FileText,
      color: 'from-emerald-500 to-teal-600',
      category: 'stock',
      tag: 'My ID Scoped PO & Hub Stock Table',
      badge: 'Full Detail',
      desc: 'Apni Supplier ID ke sabhi Purchase Orders, transport bilty numbers, payment status aur Nuapatna hub par maujood stock ki poori list.',
      actionType: 'subpage',
      target: 'myFullSupplyPOs',
      isNew: true,
    },
    {
      id: 'rateCard',
      stepNumber: 3,
      stepLabel: 'Step 3: Supplied Products & Price List',
      nextStepHint: 'Next: Supplied Stock Inventory',
      label: 'My Quoted Rate Card & Catalog',
      hindiLabel: 'Supplier Price List & Quotes',
      icon: Tag,
      color: 'from-sky-500 to-blue-600',
      category: 'stock',
      tag: 'Pack of 6/12 Rates & Landed Margin',
      badge: 'Step 3: Rate Card',
      desc: 'Lipstick, nail polish, kajal aur bridal kits ke quoted wholesale rates, batch numbers aur minimum order terms update karein.',
      actionType: 'subpage',
      target: 'rateCard',
    },
    {
      id: 'stock',
      stepNumber: 4,
      stepLabel: 'Step 4: Supplied Stock & Valuation',
      nextStepHint: 'Next: My Digital Marketing Full Detail',
      label: 'My Supplied Stock Inventory',
      hindiLabel: 'Supplied Products & Valuation',
      icon: Package,
      color: 'from-amber-500 to-orange-600',
      category: 'stock',
      tag: 'Stock at Nuapatna Hub',
      badge: 'Step 4: Stock',
      desc: 'Rupam Wholesale warehouse me available aapke brand ke products aur inventory valuation dekhein.',
      actionType: 'tab',
      target: 'stock',
    },
    {
      id: 'marketing',
      stepNumber: 5,
      stepLabel: 'Full Detail: My Brand Marketing',
      nextStepHint: 'Next: Payables Khata & Settlement',
      label: 'My Digital Marketing Full Detail',
      hindiLabel: 'Brand Promotions, Running Ads & Posts',
      icon: Megaphone,
      color: 'from-pink-500 to-rose-600',
      category: 'marketing',
      tag: 'My Supplier ID Brand Campaigns',
      badge: 'Full Detail',
      desc: 'Apne brand ke digital marketing campaigns, running posts count aur nayi promotion service apply karne ka full detail.',
      actionType: 'subpage',
      target: 'marketing',
      isNew: true,
    },
    {
      id: 'khata',
      stepNumber: 6,
      stepLabel: 'Step 6: Payables & Settlement Khata',
      nextStepHint: 'Supplier Workflow Completed ✅',
      label: 'Supplier Dues & Payment Ledger',
      hindiLabel: 'Supplier Ledger & Settlement',
      icon: BookOpen,
      color: 'from-emerald-500 to-teal-600',
      category: 'finance',
      tag: 'Payments from Rupam Wholesale',
      badge: 'Step 6: Dues Khata',
      desc: 'Rupam Wholesale se aane wale payments dekhein: advance received, pending balance, aur bank settlement records.',
      actionType: 'tab',
      target: 'khata',
    },
  ];

  // Dynamic active tool list based on role perspective
  const activeToolList = useMemo(() => {
    if (rolePerspective === 'customer') return customerTools;
    if (rolePerspective === 'supplier') return supplierTools;
    return allTools;
  }, [rolePerspective, allTools, customerTools, supplierTools]);

  // Category definitions with Order & Delivery merged into 1 section
  const categories: {
    id: CategoryId;
    label: string;
    flowSummary: string;
    icon: React.ComponentType<{ className?: string }>;
    count: number;
  }[] = useMemo(
    () => [
      {
        id: 'all',
        label: tr('All Tools', language),
        flowSummary: `All ${allTools.length} business tools in step-by-step order`,
        icon: LayoutGrid,
        count: allTools.length,
      },
      {
        id: 'orders_delivery',
        label: `📦 ${tr('Orders & Delivery', language)}`,
        flowSummary: 'Retailer Check ➔ Online Booking ➔ Invoices ➔ Box Chalan ➔ Dispatch ➔ Claim',
        icon: Truck,
        count: allTools.filter((t) => t.category === 'orders_delivery').length,
      },
      {
        id: 'stock',
        label: `🏷️ ${tr('Stock & Purchases', language)}`,
        flowSummary: 'Procurement ➔ Barcode ➔ Inventory ➔ Reorder Alert ➔ Rate Card',
        icon: Package,
        count: allTools.filter((t) => t.category === 'stock').length,
      },
      {
        id: 'finance',
        label: `💰 ${tr('Accounts & Tax', language)}`,
        flowSummary: '10% Udhaar Recovery ➔ Daily Expenses ➔ GST Reports ➔ Growth Trends',
        icon: Wallet,
        count: allTools.filter((t) => t.category === 'finance').length,
      },
      {
        id: 'marketing',
        label: `🚀 ${tr('Marketing & Growth', language)}`,
        flowSummary: 'Google SEO ➔ Live Website ➔ Leads ➔ Posters ➔ Marketing',
        icon: Megaphone,
        count: allTools.filter((t) => t.category === 'marketing').length,
      },
      {
        id: 'operations',
        label: `⚙️ ${tr('Operations & Settings', language)}`,
        flowSummary: '150km Radius Map ➔ Contacts Sync ➔ Admin Rules ➔ CSV Backup',
        icon: SlidersHorizontal,
        count: allTools.filter((t) => t.category === 'operations').length,
      },
    ],
    [allTools, language]
  );

  // Filter tools based on category & search query
  const filteredTools = useMemo(() => {
    let result = activeToolList;
    if (rolePerspective === 'owner' && selectedCategory !== 'all') {
      result = result.filter((t) => t.category === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (t) =>
          t.label.toLowerCase().includes(q) ||
          t.hindiLabel.toLowerCase().includes(q) ||
          t.desc.toLowerCase().includes(q) ||
          t.tag.toLowerCase().includes(q) ||
          t.badge.toLowerCase().includes(q) ||
          t.stepLabel.toLowerCase().includes(q)
      );
    }
    return result;
  }, [activeToolList, rolePerspective, selectedCategory, searchQuery]);

  // Download Handlers

  // Group tools by category for structured overview when "All" is active and no search
  const categoryGroups = [
    {
      id: 'orders_delivery' as const,
      title: 'Orders & Delivery Workflow',
      subtitle: 'Flow: Retailer Check ➔ Booking ➔ Invoices ➔ Box Chalan ➔ Dispatch ➔ Claim Review',
      icon: Truck,
      color: 'from-sky-500 to-blue-600',
    },
    {
      id: 'stock' as const,
      title: 'Stock & Procurement Workflow',
      subtitle: 'Flow: Wholesale Purchase ➔ Barcode Scan ➔ Packet Stock ➔ Reorder Alerts ➔ Rate Card',
      icon: Package,
      color: 'from-amber-500 to-orange-600',
    },
    {
      id: 'finance' as const,
      title: 'Accounts & Tax Workflow',
      subtitle: 'Flow: 10% Udhaar Recovery ➔ Daily Expenses ➔ GST Reports ➔ 2-Year Growth',
      icon: Wallet,
      color: 'from-blue-600 to-indigo-700',
    },
    {
      id: 'marketing' as const,
      title: 'Marketing & Leads Workflow',
      subtitle: 'Flow: Google SEO Setup ➔ Live Website ➔ New Leads ➔ Offer Posters ➔ Marketing',
      icon: Megaphone,
      color: 'from-pink-500 to-rose-600',
    },
    {
      id: 'operations' as const,
      title: 'Daily Operations & Settings',
      subtitle: 'Flow: 150 km Radius ➔ Contacts Sync ➔ Business Rules ➔ Safe Backup',
      icon: SlidersHorizontal,
      color: 'from-slate-700 to-slate-900',
    },
  ];

  const handleToolClick = (tool: ToolItem) => {
    if (tool.actionType === 'subpage' && tool.target) {
      openMorePage(tool.target);
    } else if (tool.actionType === 'tab' && tool.target) {
      setActiveTab(tool.target);
      setActiveSubPage(null);
    } else if (tool.actionType === 'barcode') {
      setIsBarcodeOpen(true);
    } else if (tool.actionType === 'backup') {
      exportAllDataCsv();
    }
  };

  const handleBarcodeSearch = (code: string) => {
    const found = products.find(
      (p) =>
        p.sku.toLowerCase() === code.toLowerCase() ||
        p.id.toLowerCase() === code.toLowerCase() ||
        p.name.toLowerCase().includes(code.toLowerCase())
    );
    setScannedProduct(found || null);
  };

  return (
    <div className="space-y-3 pb-24">
      {/* ══════════════════════════════════════════════════════════════════
          ROLE-SPECIFIC SECTION HEADER (LOCKED TO ACTIVE OPEN ACCOUNT)
      ══════════════════════════════════════════════════════════════════ */}
      <div className="glass-card rounded-2xl sm:rounded-3xl p-3 sm:p-4 border border-white/90 shadow-sm relative overflow-hidden bg-gradient-to-br from-sky-500/10 via-indigo-500/5 to-transparent">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span
              className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full inline-block mb-1 border ${
                rolePerspective === 'owner'
                  ? 'bg-blue-100/90 text-blue-800 border-blue-200'
                  : rolePerspective === 'customer'
                  ? 'bg-amber-100/90 text-amber-900 border-amber-200'
                  : 'bg-purple-100/90 text-purple-900 border-purple-200'
              }`}
            >
              {rolePerspective === 'owner'
                ? '👑 Wholesale Master Owner Control'
                : rolePerspective === 'customer'
                ? `🛍️ ${tr('Retailer Account', language)}: ${loggedInCustomer.shopName}`
                : `🏭 ${tr('Supplier Account', language)}: ${loggedInSupplier.name}`}
            </span>
            <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight truncate">
              {rolePerspective === 'owner'
                ? tr('Business Tools & Step-by-Step Flow', language)
                : rolePerspective === 'customer'
                ? tr('Retailer Business Tools & Orders', language)
                : tr('Supplier Business Tools & Supply Hub', language)}
            </h2>
            <p className="text-[10px] sm:text-xs text-slate-600 font-medium mt-0.5 leading-snug">
              {rolePerspective === 'owner'
                ? 'Step 0 Multi-Business Hub ➔ Step 1 Master Network ➔ Orders, Invoices, Delivery, Finance & Operations'
                : rolePerspective === 'customer'
                ? `Retailer: ${loggedInCustomer.ownerName} • ID: ${loggedInCustomer.id} • ${loggedInCustomer.villageOrTown || loggedInCustomer.city || 'Nuapatna'} (150km Radius)`
                : `Dealer: ${loggedInSupplier.contactPerson || loggedInSupplier.name} • ID: ${loggedInSupplier.id} • ${loggedInSupplier.city || 'Kolkata'} (${loggedInSupplier.brandAuth || 'Stockist'})`}
            </p>
          </div>
          <div
            className={`w-9 h-9 rounded-xl text-white flex items-center justify-center shadow-sm shrink-0 ${
              rolePerspective === 'owner'
                ? 'bg-gradient-to-tr from-sky-500 to-blue-600 shadow-sky-500/25'
                : rolePerspective === 'customer'
                ? 'bg-gradient-to-tr from-amber-500 to-orange-600 shadow-amber-500/25'
                : 'bg-gradient-to-tr from-purple-500 to-indigo-600 shadow-purple-500/25'
            }`}
          >
            {rolePerspective === 'owner' ? (
              <LayoutGrid className="w-4 h-4" />
            ) : rolePerspective === 'customer' ? (
              <Store className="w-4 h-4" />
            ) : (
              <Building2 className="w-4 h-4" />
            )}
          </div>
        </div>

        {/* Search Bar */}
        <div className="mt-2.5 relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              rolePerspective === 'owner'
                ? 'Search tools (e.g. Orders, Delivery, Chalan, GST, Video, Rate Card)...'
                : rolePerspective === 'customer'
                ? 'Search retailer tools (e.g. Order, Bill, Udhaar, Rate Card)...'
                : 'Search supplier tools (e.g. Suppliers, Barcode, Stock, Damage)...'
            }
            className="w-full pl-8.5 pr-8 py-2 rounded-xl bg-white/90 border border-slate-200/90 text-[11px] font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40 shadow-xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

      </div>

      {/* Top Category Scroll Bar (Only visible in Owner perspective when all tools are active) */}
      {rolePerspective === 'owner' && (
        <div className="space-y-1">
          <div className="flex items-center justify-between px-0.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
              Select Department Workflow
            </span>
            <span className="text-[10px] text-sky-600 font-bold">
              {filteredTools.length} tools step-by-step
            </span>
          </div>

          <div className="overflow-x-auto no-scrollbar scroll-smooth flex items-center gap-1.5 pb-1 pt-0.5">
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] whitespace-nowrap transition-all duration-200 shrink-0 ${
                    isSelected
                      ? 'bg-gradient-to-r from-sky-500 via-sky-600 to-blue-600 text-white font-bold shadow-sm shadow-sky-500/25'
                      : 'bg-white/85 hover:bg-white text-slate-700 font-semibold border border-slate-200/80 shadow-2xs active:scale-95'
                  }`}
                >
                  <Icon className={`w-3 h-3 ${isSelected ? 'text-white' : 'text-slate-500'}`} />
                  <span>{cat.label}</span>
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                      isSelected ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {cat.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          ROLE 1: OWNER VIEW CONTENT
      ══════════════════════════════════════════════════════════════════ */}
      {rolePerspective === 'owner' ? (
        selectedCategory === 'all' && !searchQuery.trim() ? (
          // Structured Step-by-Step Sections for Owner
          <div className="space-y-4">
            {categoryGroups.map((group) => {
              const groupTools = allTools.filter((t) => t.category === group.id);
              const GroupIcon = group.icon;
              return (
                <div key={group.id} className="space-y-2.5">
                  {/* Category Header with Step Pipeline Breadcrumb */}
                  <div className="glass-card rounded-2xl p-3 border border-slate-200/80 bg-white/70 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-7 h-7 rounded-xl bg-gradient-to-tr ${group.color} text-white flex items-center justify-center shadow-xs shrink-0`}
                        >
                          <GroupIcon className="w-4 h-4" />
                        </div>
                        <h3 className="text-xs sm:text-sm font-black text-slate-900 tracking-tight">
                          {tr(group.title, language)}
                        </h3>
                      </div>
                      <span className="text-[10px] font-bold text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-full">
                        {groupTools.length} Steps
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium pl-9 leading-relaxed">
                      {group.subtitle}
                    </p>
                  </div>

                  {/* 2-Column Grid of Sequenced Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {groupTools.map((tool) => (
                      <ToolCard key={tool.id} tool={tool} onClick={() => handleToolClick(tool)} openLabel={tr('Open', language)} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // Filtered Grid for Owner Active Category or Search
          <div className="space-y-3">
            {selectedCategory !== 'all' && (
              <div className="glass-card rounded-2xl p-3 border border-sky-200 bg-sky-50/70 text-xs text-sky-950 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0" />
                <span>
                  <strong>Step-by-Step Flow: </strong>
                  {categories.find((c) => c.id === selectedCategory)?.flowSummary}
                </span>
              </div>
            )}

            {filteredTools.length === 0 ? (
              <div className="glass-card rounded-3xl p-8 text-center border border-dashed border-slate-300">
                <Search className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-slate-700">No tools found</h4>
                <p className="text-xs text-slate-500 mt-1">
                  "{searchQuery}" ke liye koi tool nahi mila. Try another search or filter.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                  }}
                  className="mt-3 px-3 py-1.5 rounded-xl bg-sky-600 text-white font-bold text-xs shadow-xs"
                >
                  View All Tools
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredTools.map((tool) => (
                  <ToolCard key={tool.id} tool={tool} onClick={() => handleToolClick(tool)} openLabel={tr('Open', language)} />
                ))}
              </div>
            )}
          </div>
        )
      ) : rolePerspective === 'customer' ? (
        // ══════════════════════════════════════════════════════════════════
        // ROLE 2: CUSTOMER VIEW (7 Sequential Buyer Steps)
        // ══════════════════════════════════════════════════════════════════
        <div className="space-y-4">
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 text-blue-950 text-xs space-y-1 shadow-xs">
            <div className="flex items-center gap-2 font-bold text-blue-900">
              <Store className="w-4 h-4 text-blue-700" />
              <span>Retailer Buying Guide (Step-by-Step Flow)</span>
            </div>
            <p className="text-[11px] text-blue-800">
              Step 1 to Step 7 to Order: Catalogue Select ➔ Rates Check ➔ Pakka Bill ➔ Box Slip ➔ 10% Udhaar ➔ 150km Radius ➔ Unboxing 
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredTools.map((tool) => (
              <ToolCard key={tool.id} tool={tool} onClick={() => handleToolClick(tool)} openLabel={tr('Open', language)} />
            ))}
          </div>
        </div>
      ) : (
        // ══════════════════════════════════════════════════════════════════
        // ROLE 3: SUPPLIER VIEW (6 Sequential Procurement Steps)
        // ══════════════════════════════════════════════════════════════════
        <div className="space-y-4">
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200/80 text-indigo-950 text-xs space-y-1 shadow-xs">
            <div className="flex items-center gap-2 font-bold text-indigo-900">
              <Building2 className="w-4 h-4 text-indigo-700" />
              <span>Procurement & Supplier Guide (Step-by-Step Flow)</span>
            </div>
            <p className="text-[11px] text-indigo-800">
              Step 1 to Step 6 to Order: Supplier Network ➔ Rates Compare (Landed Cost) ➔ Inward Barcode ➔ Inventory ➔ -Order PO ➔ Damage Recovery
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredTools.map((tool) => (
              <ToolCard key={tool.id} tool={tool} onClick={() => handleToolClick(tool)} openLabel={tr('Open', language)} />
            ))}
          </div>
        </div>
      )}

      {/* Bottom Quick Backup & Demo Data Bar */}
      {role === 'owner' && (
        <div className="glass-card rounded-2xl p-3 border border-slate-200/80 flex items-center justify-between gap-2 shadow-xs">
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-slate-900 block flex items-center gap-1">
              <Database className="w-3.5 h-3.5 text-sky-600 shrink-0" /> Data Backup & Demo Reset
            </span>
            <span className="text-[10px] text-slate-500 truncate block">
              Download safe JSON backup or restore demo data
            </span>
          </div>
          <div className="flex gap-1.5 shrink-0">
            <button
              onClick={exportAllDataCsv}
              className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-black text-white font-bold text-[11px] shadow-xs active:scale-95 transition"
              title="Download JSON Backup"
            >
              Backup
            </button>
            <button
              onClick={resetToDemoData}
              className="px-2 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] active:scale-95 transition"
              title="Reset Demo Data"
            >
              Reset
            </button>
          </div>
        </div>
      )}

      {/* Barcode Scanner Modal */}
      {isBarcodeOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="glass-card bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-white/80 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-2xl bg-sky-500 text-white flex items-center justify-center shadow-md shadow-sky-500/30">
                  <ScanLine className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Barcode & SKU Scanner</h3>
                  <p className="text-[11px] text-slate-500">Scan cosmetic box barcode or enter SKU</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsBarcodeOpen(false);
                  setScannedProduct(null);
                  setManualBarcode('');
                }}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Camera Viewfinder Simulation */}
            <div className="relative rounded-2xl bg-slate-950 aspect-video flex flex-col items-center justify-center text-white overflow-hidden border-2 border-sky-400/80">
              <div className="absolute inset-x-8 top-6 bottom-6 border-2 border-dashed border-sky-400 rounded-xl animate-pulse flex items-center justify-center">
                <span className="text-[10px] font-bold text-sky-300 tracking-wider uppercase bg-black/50 px-2 py-0.5 rounded">
                  Scan Area
                </span>
              </div>
              <Camera className="w-8 h-8 text-sky-400/80 mb-1" />
              <span className="text-[11px] text-slate-300 font-medium">Camera scanner active</span>
            </div>

            {/* Quick manual SKU input */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700">Enter Manual SKU or Code:</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualBarcode}
                  onChange={(e) => setManualBarcode(e.target.value)}
                  placeholder="e.g. LIP-MAT-01, KAJ-COL-01"
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono"
                />
                <button
                  onClick={() => handleBarcodeSearch(manualBarcode)}
                  className="px-3.5 py-2 rounded-xl bg-sky-600 text-white font-bold text-xs"
                >
                  Search
                </button>
              </div>
            </div>

            {/* Scanned Result */}
            {scannedProduct && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-emerald-950">{scannedProduct.name}</h4>
                  <p className="text-[11px] text-emerald-700">
                    Pack Size: {scannedProduct.packSize} pcs | Stock: {scannedProduct.packetStock} Packets
                  </p>
                  <p className="text-xs font-black text-emerald-900 mt-0.5">
                    ₹{scannedProduct.sellingPrice} / Packet
                  </p>
                </div>
                <button
                  onClick={() => {
                    setIsBarcodeOpen(false);
                    setActiveTab('stock');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-emerald-700 text-white font-bold text-xs"
                >
                  View in Stock
                </button>
              </div>
            )}
          </div>
        </div>
      )}


    </div>
  );
};

// Sub-component: Individual Sequenced Tool Card
const ToolCard: React.FC<{ tool: ToolItem; onClick: () => void; openLabel: string }> = ({ tool, onClick, openLabel }) => {
  const Icon = tool.icon;
  return (
    <button
      onClick={onClick}
      className="glass-card rounded-2xl p-3 sm:p-3.5 flex flex-col items-start text-left border border-white/90 shadow-xs hover:shadow-md transition active:scale-98 group relative overflow-hidden bg-white/85"
    >
      {/* Top Header: Icon + Step Tag + New/Rule Tag */}
      <div className="flex items-start justify-between gap-2 w-full mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${tool.color} text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform shrink-0`}
          >
            <Icon className="w-4 h-4 stroke-[2.2]" />
          </div>
          <span className="text-[9px] font-black uppercase tracking-wider text-sky-700 bg-sky-50 border border-sky-200/80 px-1.5 py-0.5 rounded-md truncate">
            {tool.stepLabel}
          </span>
        </div>

        <div className="flex items-center flex-wrap justify-end gap-1 shrink-0">
          {tool.isNew && (
            <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-emerald-500 text-white tracking-wider">
              NEW
            </span>
          )}
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 group-hover:bg-sky-50 group-hover:text-sky-700 transition-colors">
            {tool.badge}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="w-full">
        <h3 className="font-black text-slate-900 text-xs sm:text-sm leading-tight group-hover:text-sky-700 transition-colors">
          {tool.label}
        </h3>
        <p className="text-[10px] font-bold text-slate-500 mt-0.5 leading-tight">
          {tool.hindiLabel}
        </p>
        <p className="text-[10px] sm:text-[11px] text-slate-600 line-clamp-2 mt-1 leading-snug font-normal">
          {tool.desc}
        </p>
      </div>

      {/* Footer: Workflow Guidance - What to do next */}
      <div className="mt-2.5 pt-2 border-t border-slate-100 w-full flex items-center justify-between gap-2 text-[10px] font-bold text-sky-600 group-hover:text-blue-700">
        <span className="text-[9px] sm:text-[10px] text-slate-500 font-medium truncate">
          {tool.nextStepHint}
        </span>
        <span className="flex items-center gap-0.5 shrink-0">
          {openLabel} <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
        </span>
      </div>
    </button>
  );
};
