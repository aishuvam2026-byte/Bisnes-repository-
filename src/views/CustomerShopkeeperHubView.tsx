import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Customer, Supplier, SupplierPrice, HubActivityLog } from '../types';
import {
  Users,
  Building2,
  Store,
  Truck,
  Phone,
  MessageSquare,
  Search,
  Filter,
  ArrowUpDown,
  Plus,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  DollarSign,
  TrendingUp,
  MapPin,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  Download,
  Upload,
  Share2,
  CreditCard,
  Package,
  RotateCcw,
  Sparkles,
  Award,
  Eye,
  Trash2,
  Check,
  X,
  FileSpreadsheet,
  Layers,
  ArrowRight,
  Send,
  HelpCircle,
  Percent,
  Calendar,
  AlertCircle,
  Copy,
  Info,
  User,
  Receipt,
  ShoppingBag,
} from 'lucide-react';

type MainSection = 'customers' | 'suppliers' | 'compare';
type CustomerCategoryTab = 'shopType' | 'status' | 'payment' | 'area' | 'value';
type SupplierCategoryTab = 'type' | 'category' | 'status' | 'payment' | 'rating';

export const CustomerShopkeeperHubView: React.FC = () => {
  const {
    role,
    user,
    customers,
    suppliers,
    supplierPrices,
    hubActivityLogs,
    orders,
    udhaar,
    payments,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    addSupplier,
    updateSupplier,
    updateSupplierPrice,
    logHubActivity,
    clearUdhaarEntry,
    showToast,
    openMorePage,
    setActiveTab,
    setActiveSubPage,
    activeBusiness,
  } = useApp();



  const isDukaniLogin = role === 'customer';
  const isSupplierLogin = role === 'supplier';
  const activeCustomerId = user?.customerId || customers[0]?.id;
  const activeSupplierId = user?.supplierId || suppliers[0]?.id;

  // Navigation State
  const [activeSection, setActiveSection] = useState<MainSection>(
    role === 'supplier' ? 'suppliers' : 'customers'
  );
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(() => {
    return role === 'customer' ? (user?.customerId || customers[0]?.id) : null;
  });
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(() => {
    return role === 'supplier' ? (user?.supplierId || suppliers[0]?.id) : null;
  });

  // Tabs within list views
  const [customerTab, setCustomerTab] = useState<CustomerCategoryTab>('shopType');
  const [supplierTab, setSupplierTab] = useState<SupplierCategoryTab>('type');

  // Search & Filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilterChip, setActiveFilterChip] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'latest' | 'highestSales' | 'highestDue' | 'name'>('latest');

  // Profile Active Tabs
  const [customerProfileTab, setCustomerProfileTab] = useState<
    'overview' | 'orders' | 'khata' | 'delivery' | 'returns' | 'documents' | 'notes' | 'activity'
  >('overview');
  const [supplierProfileTab, setSupplierProfileTab] = useState<
    'overview' | 'prices' | 'purchases' | 'dues' | 'quality' | 'documents' | 'notes'
  >('overview');

  // Modals
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [blockReasonInput, setBlockReasonInput] = useState('');
  const [targetBlockCustomer, setTargetBlockCustomer] = useState<Customer | null>(null);

  // Quick Call Log Modal
  const [isCallLogModalOpen, setIsCallLogModalOpen] = useState(false);
  const [callLogType, setCallLogType] = useState<string>('Order Confirmation');
  const [callLogNote, setCallLogNote] = useState<string>('');

  // Selected Entities - Strictly scoped to logged-in user if customer or supplier
  const currentCustomer = useMemo(() => {
    if (role === 'customer') {
      return customers.find((c) => c.id === activeCustomerId) || customers[0];
    }
    return customers.find((c) => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId, role, activeCustomerId]);

  const currentSupplier = useMemo(() => {
    if (role === 'supplier') {
      return suppliers.find((s) => s.id === activeSupplierId) || suppliers[0];
    }
    return suppliers.find((s) => s.id === selectedSupplierId) || null;
  }, [suppliers, selectedSupplierId, role, activeSupplierId]);

  // ══════════════════════════════════════════════════════════════════
  // SMART ALERTS (Top 3 on Hub Home)
  // ══════════════════════════════════════════════════════════════════
  const smartAlerts = useMemo(() => {
    const alerts: Array<{
      id: string;
      title: string;
      desc: string;
      badge: string;
      color: string;
      actionText: string;
      action: () => void;
    }> = [];

    // Alert 1: Udhaar Due
    const udhaarPendingCount = customers.filter((c) => (c.pendingUdhaar || 0) > 0);
    const totalUdhaarPending = udhaarPendingCount.reduce((sum, c) => sum + (c.pendingUdhaar || 0), 0);
    if (udhaarPendingCount.length > 0) {
      alerts.push({
        id: 'udhaar-alert',
        title: `${udhaarPendingCount.length} Retailer Udhaar Overdue`,
        desc: `₹${totalUdhaarPending.toLocaleString('en-IN')} pending. Must clear before dispatching next order!`,
        badge: 'Khata Rule',
        color: 'from-rose-500/10 to-amber-500/10 border-rose-200 text-rose-800',
        actionText: 'Review Udhaar',
        action: () => {
          setActiveSection('customers');
          setCustomerTab('payment');
          setActiveFilterChip('Udhaar Pending');
        },
      });
    }

    // Alert 2: Inactive shops
    const inactiveCount = customers.filter((c) => c.status === 'Inactive');
    if (inactiveCount.length > 0) {
      alerts.push({
        id: 'inactive-alert',
        title: `${inactiveCount.length} Shops Inactive (30+ Days)`,
        desc: 'No order placed recently. Send festive catalogue and free poster offer.',
        badge: 'Follow-up',
        color: 'from-amber-500/10 to-yellow-500/10 border-amber-200 text-amber-800',
        actionText: 'View Inactive',
        action: () => {
          setActiveSection('customers');
          setCustomerTab('status');
          setActiveFilterChip('Inactive');
        },
      });
    }

    // Alert 3: Supplier Price comparison or credit dues
    const duesPendingSuppliers = suppliers.filter((s) => (s.paymentStatus === 'Due' || s.paymentStatus === 'Overdue'));
    if (duesPendingSuppliers.length > 0) {
      alerts.push({
        id: 'supplier-dues',
        title: `${duesPendingSuppliers.length} Supplier Invoices Due`,
        desc: 'Review credit cycles to maintain top priority distributor pricing.',
        badge: 'Suppliers',
        color: 'from-blue-500/10 to-indigo-500/10 border-blue-200 text-blue-800',
        actionText: 'Check Dues',
        action: () => {
          setActiveSection('suppliers');
          setSupplierTab('payment');
          setActiveFilterChip('All');
        },
      });
    }

    return alerts.slice(0, 3);
  }, [customers, suppliers]);

  // ══════════════════════════════════════════════════════════════════
  // FILTERED & SORTED CUSTOMERS
  // ══════════════════════════════════════════════════════════════════
  const filteredCustomers = useMemo(() => {
    return customers.filter((cust) => {
      // Search
      const q = searchQuery.toLowerCase();
      const matchSearch =
        !q ||
        cust.shopName.toLowerCase().includes(q) ||
        cust.ownerName.toLowerCase().includes(q) ||
        cust.phone.includes(q) ||
        (cust.city || '').toLowerCase().includes(q) ||
        (cust.villageOrTown || '').toLowerCase().includes(q);

      if (!matchSearch) return false;

      // Category filters
      if (activeFilterChip !== 'All') {
        if (customerTab === 'shopType') {
          if (cust.shopType !== activeFilterChip) return false;
        } else if (customerTab === 'status') {
          if (cust.status !== activeFilterChip) return false;
        } else if (customerTab === 'payment') {
          if (activeFilterChip === 'All Clear' && (cust.pendingBalance > 0 || (cust.pendingUdhaar || 0) > 0)) return false;
          if (activeFilterChip === 'Advance Pending' && cust.paymentStatus !== 'Advance Pending') return false;
          if (activeFilterChip === 'Balance Due' && cust.pendingBalance <= 0) return false;
          if (activeFilterChip === 'Udhaar Pending' && (cust.pendingUdhaar || 0) <= 0) return false;
        } else if (customerTab === 'area') {
          if (activeFilterChip === 'Inside 150 km' && cust.distanceKm > 150) return false;
          if (activeFilterChip === 'Outside 150 km' && cust.distanceKm <= 150) return false;
          if (activeFilterChip !== 'Inside 150 km' && activeFilterChip !== 'Outside 150 km') {
            if (cust.villageOrTown !== activeFilterChip && cust.city !== activeFilterChip) return false;
          }
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'highestSales') return b.totalSales - a.totalSales;
      if (sortBy === 'highestDue') return (b.pendingBalance + (b.pendingUdhaar || 0)) - (a.pendingBalance + (a.pendingUdhaar || 0));
      if (sortBy === 'name') return a.shopName.localeCompare(b.shopName);
      return (b.lastOrderDate || '').localeCompare(a.lastOrderDate || '');
    });
  }, [customers, searchQuery, customerTab, activeFilterChip, sortBy]);

  // ══════════════════════════════════════════════════════════════════
  // FILTERED & SORTED SUPPLIERS
  // ══════════════════════════════════════════════════════════════════
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((supp) => {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        !q ||
        supp.name.toLowerCase().includes(q) ||
        supp.phone.includes(q) ||
        (supp.city || '').toLowerCase().includes(q) ||
        (supp.contactPerson || '').toLowerCase().includes(q);

      if (!matchSearch) return false;

      if (activeFilterChip !== 'All') {
        if (supplierTab === 'type') {
          if (supp.type !== activeFilterChip) return false;
        } else if (supplierTab === 'category') {
          if (!supp.categories?.includes(activeFilterChip)) return false;
        } else if (supplierTab === 'status') {
          if (supp.status !== activeFilterChip) return false;
        } else if (supplierTab === 'payment') {
          if (supp.paymentTerms !== activeFilterChip) return false;
        } else if (supplierTab === 'rating') {
          if (activeFilterChip === 'Top Rated (4.5★+)' && (supp.qualityRating || 0) < 4.5) return false;
          if (activeFilterChip === 'On-Time (95%+)' && (supp.deliveryOnTimeRate || 0) < 95) return false;
          if (activeFilterChip === 'Low Damage' && (supp.damageRate || 0) > 1.5) return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'highestSales') return (b.totalPurchases || 0) - (a.totalPurchases || 0);
      if (sortBy === 'highestDue') return (b.pendingDues || 0) - (a.pendingDues || 0);
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return (b.qualityRating || 0) - (a.qualityRating || 0);
    });
  }, [suppliers, searchQuery, supplierTab, activeFilterChip, sortBy]);

  // ══════════════════════════════════════════════════════════════════
  // VCARD EXPORT (Sync all Dukani Bhai to phone address book)
  // ══════════════════════════════════════════════════════════════════
  const handleExportVCard = () => {
    let vcfData = '';
    customers.forEach((c) => {
      vcfData += `BEGIN:VCARD\r\nVERSION:3.0\r\nFN:${c.shopName} (${c.ownerName})\r\nORG:Rupam B2B Customer\r\nTEL;TYPE=CELL:${c.phone}\r\nADR;TYPE=WORK:;;${c.address || ''};${c.villageOrTown || c.city || ''};Odisha;754035;India\r\nNOTE:Distance: ${c.distanceKm}km | Shop: ${c.shopType || c.category} | Sales: Rs ${c.totalSales}\r\nEND:VCARD\r\n`;
    });

    suppliers.forEach((s) => {
      vcfData += `BEGIN:VCARD\r\nVERSION:3.0\r\nFN:${s.name} (${s.contactPerson || 'Dealer'})\r\nORG:Rupam Wholesale Supplier\r\nTEL;TYPE=WORK:${s.phone}\r\nADR;TYPE=WORK:;;${s.city || ''};${s.state || ''};;India\r\nNOTE:Supplier Type: ${s.type} | Rating: ${s.qualityRating || 5} Stars\r\nEND:VCARD\r\n`;
    });

    const blob = new Blob([vcfData], { type: 'text/vcard;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Rupam_B2B_Phone_Contacts_${new Date().toISOString().split('T')[0]}.vcf`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('vCard generated! Tap downloaded file to import contacts directly into phone.');
  };

  // ══════════════════════════════════════════════════════════════════
  // CSV EXPORT
  // ══════════════════════════════════════════════════════════════════
  const handleExportCsv = () => {
    let csv = '';
    if (activeSection === 'customers') {
      csv = 'Shop Name,Owner Name,Phone,WhatsApp,Shop Type,Status,Village/Town,Distance KM,Free Delivery,Total Orders,Total Sales,Pending Balance,Pending Udhaar\n';
      customers.forEach((c) => {
        csv += `"${c.shopName}","${c.ownerName}","${c.phone}","${c.whatsapp || c.phone}","${c.shopType || ''}","${c.status || ''}","${c.villageOrTown || c.city}","${c.distanceKm}","${c.distanceKm <= 150 ? 'YES' : 'NO'}",${c.totalOrders},${c.totalSales},${c.pendingBalance},${c.pendingUdhaar || 0}\n`;
      });
    } else {
      csv = 'Supplier Name,Type,Contact Person,Phone,City,State,Quality Rating,Pending Dues,Payment Terms,Status\n';
      suppliers.forEach((s) => {
        csv += `"${s.name}","${s.type}","${s.contactPerson || ''}","${s.phone}","${s.city || ''}","${s.state || ''}",${s.qualityRating || 0},${s.pendingDues || 0},"${s.paymentTerms || ''}","${s.status || ''}"\n`;
      });
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Rupam_${activeSection}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast(`${activeSection === 'customers' ? 'Retailers' : 'Suppliers'} CSV exported successfully.`);
  };

  // ══════════════════════════════════════════════════════════════════
  // WHATSAPP MESSAGE HELPERS
  // ══════════════════════════════════════════════════════════════════
  const sendWhatsAppMessage = (phone: string, text: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const fullPhone = cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone;
    const url = `https://wa.me/${fullPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleSendCatalogueWhatsApp = (cust: Customer) => {
    const text = `Namaskar ${cust.ownerName} bhai (Rupam B2B Wholesale, Nuapatna).\n\nHere is our updated cosmetic & FMCG wholesale catalogue with wholesale packet rates:\nhttps://rupamb2b.web.app\n\n📌 Minimum order: ₹1,000\n📌 Packets only (6 or 12 pcs)\n📌 Free delivery in 150 km\n\nReply with your packet list or call Shuvam Behera directly!`;
    sendWhatsAppMessage(cust.whatsapp || cust.phone, text);
    showToast('Opened WhatsApp with catalogue message');
  };

  const handleSendUdhaarReminderWhatsApp = (cust: Customer) => {
    const text = `Namaskar ${cust.ownerName} bhai (${cust.shopName}).\n\nGentle reminder from Rupam Wholesale, Nuapatna:\nYour pending udhaar balance is ₹${cust.pendingUdhaar || 0}.\n\nAs per our wholesale rule, previous udhaar shortage must be settled before your next stock dispatch.\n\nUPI: 1234567890@upi (Shuvam Behera)\nBank: SBI Nuapatna (A/c: 3982019281, IFSC: SBIN0002102)\n\nPlease share screenshot after payment. Dhanyabad!`;
    sendWhatsAppMessage(cust.whatsapp || cust.phone, text);
    showToast('Opened WhatsApp with Udhaar statement reminder');
  };

  // ══════════════════════════════════════════════════════════════════
  // RENDER: CUSTOMER PROFILE (VIEW / DETAIL MODAL)
  // ══════════════════════════════════════════════════════════════════
  if (selectedCustomerId && currentCustomer) {
    const customerOrders = orders.filter((o) => o.customerId === currentCustomer.id);
    const customerUdhaars = udhaar.filter((u) => u.customerId === currentCustomer.id);
    const customerPayments = payments.filter((p) => p.customerId === currentCustomer.id);

    const currentStep = currentCustomer.stepProgress || 1;
    const steps = [
      { id: 1, name: 'Add Profile', done: currentStep >= 1 },
      { id: 2, name: 'Verified', done: currentStep >= 2 },
      { id: 3, name: 'Wholesale Terms', done: currentStep >= 3 },
      { id: 4, name: 'First Order', done: currentStep >= 4 },
      { id: 5, name: 'Khata Active', done: currentStep >= 5 },
      { id: 6, name: 'Delivery Checked', done: currentStep >= 6 },
      { id: 7, name: 'Regular Follow-up', done: currentStep >= 7 },
    ];

    return (
      <div className="space-y-4 pb-12 animate-fadeIn">
        {/* Top Back Nav */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              if (isDukaniLogin) {
                setActiveSubPage(null);
              } else {
                setSelectedCustomerId(null);
              }
            }}
            className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 bg-white/80 hover:bg-white px-3 py-1.5 rounded-xl border border-gray-200/80 shadow-xs"
          >
            ← {isDukaniLogin ? 'Back to More' : 'Back to Hub'}
          </button>
          <div className="flex items-center gap-2">
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                currentCustomer.status === 'Active' || currentCustomer.status === 'Regular'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : currentCustomer.status === 'Risky'
                  ? 'bg-rose-100 text-rose-800 border border-rose-300'
                  : 'bg-amber-100 text-amber-800 border border-amber-300'
              }`}
            >
              {currentCustomer.status || 'Active'}
            </span>
            {currentCustomer.isBlocked && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-600 text-white font-bold">BLOCKED</span>
            )}
          </div>
        </div>

        {/* Warning Banners */}
        {(currentCustomer.pendingUdhaar || 0) > 0 && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start justify-between gap-3 shadow-xs">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-rose-700">Khata Udhaar Notice</p>
                <p className="text-sm font-semibold">
                  Pending Udhaar: ₹{currentCustomer.pendingUdhaar}. Must clear before next dispatch!
                </p>
              </div>
            </div>
            <button
              onClick={() => handleSendUdhaarReminderWhatsApp(currentCustomer)}
              className="px-2.5 py-1 text-xs font-bold bg-rose-600 text-white rounded-lg hover:bg-rose-700 shrink-0 shadow-xs"
            >
              Remind
            </button>
          </div>
        )}

        {currentCustomer.distanceKm > 150 && (
          <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center gap-2.5 text-xs font-medium">
            <Truck className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Distance <strong>{currentCustomer.distanceKm} km</strong> from Nuapatna. (Outside 150 km free delivery radius. Delivery/transport charge applies).
            </span>
          </div>
        )}

        {/* Profile Card Header */}
        <div className="p-5 rounded-3xl bg-white/90 backdrop-blur-md border border-sky-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-sky-200/40 via-indigo-100/30 to-transparent rounded-full -mr-10 -mt-10 pointer-events-none" />

          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white flex items-center justify-center font-bold text-xl shadow-md">
                {currentCustomer.shopName.charAt(0)}
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 leading-tight">{currentCustomer.shopName}</h2>
                <p className="text-xs text-gray-600">
                  {currentCustomer.ownerName} • <span className="font-semibold text-gray-800">{currentCustomer.shopType || 'Cosmetics'}</span>
                </p>
                <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-sky-600" />
                  {currentCustomer.villageOrTown || currentCustomer.city}, Odisha •{' '}
                  <span className={currentCustomer.distanceKm <= 150 ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}>
                    {currentCustomer.distanceKm} km ({currentCustomer.distanceKm <= 150 ? 'Free Delivery' : 'Outside 150km'})
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* 7-Step Lifecycle Horizontal Bar */}
          <div className="mt-5 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-600 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                Retailer Lifecycle: Step {currentCustomer.stepProgress} of 7
              </span>
              <button
                onClick={() => {
                  const next = Math.min(7, (currentCustomer.stepProgress || 1) + 1);
                  updateCustomer(currentCustomer.id, { stepProgress: next });
                  showToast(`Progressed ${currentCustomer.shopName} to Step ${next}!`);
                }}
                className="text-xs text-sky-700 hover:text-sky-900 font-bold underline"
              >
                Mark Next Step Done →
              </button>
            </div>

            {/* Steps Track */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1">
              {steps.map((st) => (
                <div
                  key={st.id}
                  onClick={() => {
                    updateCustomer(currentCustomer.id, { stepProgress: st.id });
                    showToast(`Updated to Step ${st.id}: ${st.name}`);
                  }}
                  className={`flex-1 min-w-[70px] cursor-pointer text-center p-1.5 rounded-xl transition-all border ${
                    st.id === currentCustomer.stepProgress
                      ? 'bg-sky-50 border-sky-400 shadow-xs'
                      : st.done
                      ? 'bg-emerald-50/70 border-emerald-200'
                      : 'bg-gray-50/80 border-gray-200 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-center mb-0.5">
                    {st.done ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    ) : st.id === currentCustomer.stepProgress ? (
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-sky-600 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-sky-600" />
                      </div>
                    ) : (
                      <span className="text-[10px] font-bold text-gray-400">{st.id}</span>
                    )}
                  </div>
                  <p
                    className={`text-[9px] font-bold truncate leading-tight ${
                      st.id === currentCustomer.stepProgress
                        ? 'text-sky-800'
                        : st.done
                        ? 'text-emerald-800'
                        : 'text-gray-500'
                    }`}
                  >
                    {st.name}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="grid grid-cols-4 gap-2 mt-4 pt-3 border-t border-gray-100">
            <a
              href={`tel:${currentCustomer.phone}`}
              className="flex flex-col items-center justify-center p-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-800 border border-gray-200 transition-all text-center"
            >
              <Phone className="w-4 h-4 text-emerald-600 mb-1" />
              <span className="text-[10px] font-bold">Call</span>
            </a>
            <button
              onClick={() => sendWhatsAppMessage(currentCustomer.whatsapp || currentCustomer.phone, `Namaskar ${currentCustomer.ownerName} bhai, Shuvam from Rupam Wholesale here.`)}
              className="flex flex-col items-center justify-center p-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-800 border border-gray-200 transition-all text-center"
            >
              <MessageSquare className="w-4 h-4 text-emerald-600 mb-1" />
              <span className="text-[10px] font-bold">WhatsApp</span>
            </button>
            <button
              onClick={() => handleSendCatalogueWhatsApp(currentCustomer)}
              className="flex flex-col items-center justify-center p-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-800 border border-gray-200 transition-all text-center"
            >
              <FileText className="w-4 h-4 text-indigo-600 mb-1" />
              <span className="text-[10px] font-bold">Catalogue</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('orders');
                setActiveSubPage(null);
                showToast(`Booking new order for ${currentCustomer.shopName}`);
              }}
              className="flex flex-col items-center justify-center p-2 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 text-white transition-all text-center shadow-xs"
            >
              <Plus className="w-4 h-4 text-white mb-1" />
              <span className="text-[10px] font-bold">New Order</span>
            </button>
          </div>
        </div>

        {/* 8 Customer Profile Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'orders', label: `Orders (${customerOrders.length})` },
            { id: 'khata', label: 'Payments & Khata' },
            { id: 'delivery', label: 'Delivery' },
            { id: 'returns', label: 'Returns' },
            { id: 'documents', label: 'Documents' },
            { id: 'notes', label: 'Call Log & Notes' },
            { id: 'activity', label: 'Activity' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setCustomerProfileTab(tab.id as typeof customerProfileTab)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                customerProfileTab === tab.id
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-white/80 text-gray-600 hover:bg-white border border-gray-200/80'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB 1: OVERVIEW */}
        {customerProfileTab === 'overview' && (
          <div className="space-y-3 animate-fadeIn">
            {/* KPI Tiles */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-xl bg-white/90 border border-gray-100 shadow-xs">
                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Total Sales</span>
                <p className="text-base sm:text-lg font-black text-gray-900 mt-0.5">₹{currentCustomer.totalSales.toLocaleString('en-IN')}</p>
                <span className="text-[9px] text-gray-500">{currentCustomer.totalOrders} wholesale orders</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/90 border border-gray-100 shadow-xs">
                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Avg Order Value</span>
                <p className="text-base sm:text-lg font-black text-sky-700 mt-0.5">
                  ₹{currentCustomer.totalOrders > 0 ? Math.round(currentCustomer.totalSales / currentCustomer.totalOrders).toLocaleString('en-IN') : 0}
                </p>
                <span className="text-[9px] text-gray-500">Min order rule: ₹1,000</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/90 border border-gray-100 shadow-xs">
                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Pending Balance</span>
                <p className="text-base sm:text-lg font-black text-amber-600 mt-0.5">₹{currentCustomer.pendingBalance.toLocaleString('en-IN')}</p>
                <span className="text-[9px] text-gray-500">Due upon parcel delivery</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/90 border border-gray-100 shadow-xs">
                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Pending Udhaar</span>
                <p className={`text-base sm:text-lg font-black mt-0.5 ${(currentCustomer.pendingUdhaar || 0) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  ₹{(currentCustomer.pendingUdhaar || 0).toLocaleString('en-IN')}
                </p>
                <span className="text-[9px] text-gray-500">Max 10% shortage rule</span>
              </div>
            </div>

            {/* Dukani Bhai Wholesale Terms Checklist */}
            <div className="p-3 rounded-2xl bg-white/90 border border-sky-100 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                  Rupam Wholesale Terms Compliance
                </h3>
              </div>
              <div className="space-y-1.5 text-[11px] text-gray-700">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={currentCustomer.checklist?.minOrderAgreed ?? true}
                    onChange={(e) => {
                      updateCustomer(currentCustomer.id, {
                        checklist: { ...(currentCustomer.checklist || {}), minOrderAgreed: e.target.checked },
                      });
                    }}
                    className="w-3.5 h-3.5 shrink-0 mt-0.5 rounded text-sky-600 focus:ring-sky-500"
                  />
                  <span>₹1,000 Minimum Order policy explained & accepted</span>
                </label>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={currentCustomer.checklist?.fullPacketAgreed ?? true}
                    onChange={(e) => {
                      updateCustomer(currentCustomer.id, {
                        checklist: { ...(currentCustomer.checklist || {}), fullPacketAgreed: e.target.checked },
                      });
                    }}
                    className="w-3.5 h-3.5 shrink-0 mt-0.5 rounded text-sky-600 focus:ring-sky-500"
                  />
                  <span>Strict full packets only (6 or 12 pcs, no loose pieces)</span>
                </label>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={currentCustomer.checklist?.advancePolicyAgreed ?? true}
                    onChange={(e) => {
                      updateCustomer(currentCustomer.id, {
                        checklist: { ...(currentCustomer.checklist || {}), advancePolicyAgreed: e.target.checked },
                      });
                    }}
                    className="w-3.5 h-3.5 shrink-0 mt-0.5 rounded text-sky-600 focus:ring-sky-500"
                  />
                  <span>₹1,000 Advance booking fee before packing parcel</span>
                </label>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={currentCustomer.checklist?.udhaarRuleAgreed ?? true}
                    onChange={(e) => {
                      updateCustomer(currentCustomer.id, {
                        checklist: { ...(currentCustomer.checklist || {}), udhaarRuleAgreed: e.target.checked },
                      });
                    }}
                    className="w-3.5 h-3.5 shrink-0 mt-0.5 rounded text-sky-600 focus:ring-sky-500"
                  />
                  <span>Udhaar rule: Max 10% shortage, strictly cleared before next order</span>
                </label>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={currentCustomer.checklist?.unboxingVideoAgreed ?? true}
                    onChange={(e) => {
                      updateCustomer(currentCustomer.id, {
                        checklist: { ...(currentCustomer.checklist || {}), unboxingVideoAgreed: e.target.checked },
                      });
                    }}
                    className="w-3.5 h-3.5 shrink-0 mt-0.5 rounded text-sky-600 focus:ring-sky-500"
                  />
                  <span>Mandatory continuous unboxing video for breakage claims</span>
                </label>
              </div>
            </div>

            {/* Shop Details */}
            <div className="p-4 rounded-2xl bg-white/90 border border-gray-100 shadow-xs space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Shop Registration Details</h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-500">Phone:</span>
                  <p className="font-semibold text-gray-900">{currentCustomer.phone}</p>
                </div>
                <div>
                  <span className="text-gray-500">WhatsApp:</span>
                  <p className="font-semibold text-gray-900">{currentCustomer.whatsapp || currentCustomer.phone}</p>
                </div>
                <div>
                  <span className="text-gray-500">Shop Category:</span>
                  <p className="font-semibold text-gray-900">{currentCustomer.shopType || currentCustomer.category}</p>
                </div>
                <div>
                  <span className="text-gray-500">Language:</span>
                  <p className="font-semibold text-gray-900">{currentCustomer.checklist?.preferredLanguage || 'Odia / Hindi'}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-500">Full Address:</span>
                  <p className="font-semibold text-gray-900">{currentCustomer.address}, {currentCustomer.landmark || ''}, {currentCustomer.villageOrTown || currentCustomer.city}</p>
                </div>
                {currentCustomer.gstNumber && (
                  <div className="col-span-2">
                    <span className="text-gray-500">GST Number:</span>
                    <p className="font-semibold text-gray-900 font-mono">{currentCustomer.gstNumber}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Block / Unblock Action */}
            <div className="p-4 rounded-2xl bg-white/90 border border-gray-100 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-900">Account Status Control</p>
                <p className="text-[11px] text-gray-500">
                  {currentCustomer.isBlocked ? `Blocked: ${currentCustomer.blockReason || 'Hold'}` : 'Active retailer in good standing'}
                </p>
              </div>
              <button
                onClick={() => {
                  if (currentCustomer.isBlocked) {
                    updateCustomer(currentCustomer.id, { isBlocked: false, blockReason: '' });
                    showToast('Retailer unblocked');
                  } else {
                    setTargetBlockCustomer(currentCustomer);
                    setIsBlockModalOpen(true);
                  }
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                  currentCustomer.isBlocked
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'bg-rose-100 text-rose-700 hover:bg-rose-200 border border-rose-200'
                }`}
              >
                {currentCustomer.isBlocked ? 'Unblock Retailer' : 'Block Account'}
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: ORDERS */}
        {customerProfileTab === 'orders' && (
          <div className="space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Past Orders ({customerOrders.length})
              </h3>
              <button
                onClick={() => {
                  setActiveTab('orders');
                  setActiveSubPage(null);
                }}
                className="text-xs text-sky-600 font-bold hover:underline"
              >
                + Create New Order
              </button>
            </div>

            {customerOrders.length === 0 ? (
              <div className="p-8 text-center bg-white/80 rounded-2xl border border-gray-100">
                <Package className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-gray-700">No orders placed yet</p>
                <p className="text-xs text-gray-500 mt-1">Book their first wholesale order to activate Step 4!</p>
              </div>
            ) : (
              customerOrders.map((ord) => (
                <div key={ord.id} className="p-3.5 rounded-2xl bg-white/90 border border-gray-100 shadow-xs flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-gray-800">#{ord.orderNumber}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold">
                        {ord.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{ord.createdAt?.split('T')[0]} • {ord.items.length} items</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">₹{ord.totalAmount.toLocaleString('en-IN')}</p>
                    <span className="text-[10px] text-gray-500">Bal: ₹{ord.balanceAmount}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 3: PAYMENTS & KHATA */}
        {customerProfileTab === 'khata' && (
          <div className="space-y-3 animate-fadeIn">
            <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-50 to-indigo-50 border border-sky-100 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">Current Pending Udhaar</span>
                  <p className="text-2xl font-black text-rose-700 mt-0.5">₹{(currentCustomer.pendingUdhaar || 0).toLocaleString('en-IN')}</p>
                </div>
                {(currentCustomer.pendingUdhaar || 0) > 0 && (
                  <button
                    onClick={() => {
                      updateCustomer(currentCustomer.id, { pendingUdhaar: 0 });
                      showToast('Udhaar marked as fully cleared!');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-xs"
                  >
                    Clear Udhaar
                  </button>
                )}
              </div>
              <p className="text-[11px] text-gray-600 mt-2">
                Rule: 10% delivery shortage tolerance. Balance must be cleared before dispatching the next wholesale parcel.
              </p>
            </div>

            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mt-4">Udhaar Records</h3>
            {customerUdhaars.length === 0 ? (
              <div className="p-4 text-center bg-white/80 rounded-2xl border border-gray-100 text-xs text-gray-500">
                No past udhaar records. Account is in good standing!
              </div>
            ) : (
              customerUdhaars.map((u) => (
                <div key={u.id} className="p-3 rounded-2xl bg-white/90 border border-gray-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-gray-800">₹{u.shortageAmount}</span> - {u.notes || 'Delivery shortage'}
                    <p className="text-[10px] text-gray-500">{u.date}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${u.status === 'Cleared' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                    {u.status}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 4: DELIVERY */}
        {customerProfileTab === 'delivery' && (
          <div className="space-y-3 animate-fadeIn">
            <div className="p-4 rounded-2xl bg-white/90 border border-gray-100 shadow-xs space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-sky-600" />
                Delivery Radius & Route
              </h3>
              <div className="p-3 rounded-xl bg-sky-50/60 border border-sky-100 text-xs space-y-1">
                <p><strong>Baseline Depot:</strong> Nuapatna, Cuttack (754035)</p>
                <p><strong>Shop Distance:</strong> {currentCustomer.distanceKm} km</p>
                <p>
                  <strong>Delivery Status:</strong>{' '}
                  <span className={currentCustomer.distanceKm <= 150 ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'}>
                    {currentCustomer.distanceKm <= 150 ? 'FREE DELIVERY (Inside 150 km corridor)' : 'OUTSIDE 150 KM (Transport / freight charges apply)'}
                  </span>
                </p>
              </div>

              <div className="text-xs space-y-1 text-gray-600">
                <p><strong>Town/Village:</strong> {currentCustomer.villageOrTown || currentCustomer.city}</p>
                <p><strong>Landmark:</strong> {currentCustomer.landmark || 'Near main market'}</p>
                <p><strong>Complete Address:</strong> {currentCustomer.address}</p>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  onClick={() => {
                    const query = encodeURIComponent(`${currentCustomer.shopName}, ${currentCustomer.villageOrTown || currentCustomer.city}, Odisha`);
                    window.open(`https://maps.google.com/?q=${query}`, '_blank');
                  }}
                  className="flex-1 py-2 rounded-xl bg-sky-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  Open in Google Maps
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: RETURNS */}
        {customerProfileTab === 'returns' && (
          <div className="space-y-3 animate-fadeIn">
            <div className="p-4 rounded-2xl bg-white/90 border border-gray-100 shadow-xs space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                <RotateCcw className="w-4 h-4 text-amber-600" />
                Unboxing Video & Return Rules
              </h3>
              <p className="text-xs text-gray-600">
                Wholesale returns are strictly accepted only with a clear, uncut 360-degree unboxing video recorded at the time of opening the Rupam sealed parcel.
              </p>
            </div>
            <div className="p-6 text-center bg-white/80 rounded-2xl border border-gray-100 text-xs text-gray-500">
              No active return disputes on record.
            </div>
          </div>
        )}

        {/* TAB 6: DOCUMENTS */}
        {customerProfileTab === 'documents' && (
          <div className="space-y-3 animate-fadeIn">
            <div className="p-4 rounded-2xl bg-white/90 border border-gray-100 shadow-xs space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">Dukan Verification Documents</h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-center">
                  <Store className="w-6 h-6 text-sky-600 mx-auto mb-1" />
                  <p className="font-semibold text-gray-800">Shop Front Photo</p>
                  <span className="text-[10px] text-emerald-600 font-bold">Verified</span>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-center">
                  <FileText className="w-6 h-6 text-indigo-600 mx-auto mb-1" />
                  <p className="font-semibold text-gray-800">GST / Trade Cert</p>
                  <span className="text-[10px] text-gray-500 font-semibold">{currentCustomer.gstNumber ? 'Attached' : 'Not Provided'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: CALL LOG & NOTES */}
        {customerProfileTab === 'notes' && (
          <div className="space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">Call History & Owner Notes</h3>
              <button
                onClick={() => setIsCallLogModalOpen(true)}
                className="px-2.5 py-1 rounded-xl bg-sky-600 text-white font-bold text-xs"
              >
                + Log Call
              </button>
            </div>

            {/* Owner Note Box */}
            <div className="p-3.5 rounded-2xl bg-white/90 border border-gray-100 shadow-xs">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Owner Confidential Note</span>
              <textarea
                value={currentCustomer.ownerNotes || ''}
                onChange={(e) => updateCustomer(currentCustomer.id, { ownerNotes: e.target.value })}
                placeholder="E.g. Prefers Sunday afternoon deliveries. Sells mostly liquid lipsticks and bridal kits."
                className="w-full mt-1.5 p-2 rounded-xl border border-gray-200 text-xs text-gray-800 bg-gray-50 focus:bg-white focus:outline-sky-500 resize-none h-20"
              />
            </div>

            {/* Past Calls */}
            <div className="space-y-2">
              {(currentCustomer.callLogs || [
                { id: 'cl-1', date: 'Yesterday, 03:20 PM', type: 'Balance confirmation', note: 'Retailer confirmed parcel received in good condition, balance paid via PhonePe.' },
                { id: 'cl-2', date: '3 days ago', type: 'Catalogue follow-up', note: 'Asked for new festival offer rate sheet.' },
              ]).map((c) => (
                <div key={c.id} className="p-3 rounded-xl bg-white/90 border border-gray-100 text-xs">
                  <div className="flex items-center justify-between font-semibold text-gray-800">
                    <span>{c.type}</span>
                    <span className="text-[10px] text-gray-400 font-normal">{c.date}</span>
                  </div>
                  <p className="text-gray-600 mt-1">{c.note}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 8: ACTIVITY */}
        {customerProfileTab === 'activity' && (
          <div className="space-y-2 animate-fadeIn">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Audit & Money Edits Log</h3>
            {hubActivityLogs
              .filter((l) => l.entityId === currentCustomer.id)
              .map((log) => (
                <div key={log.id} className="p-2.5 rounded-xl bg-white/90 border border-gray-100 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-800">{log.action}</span>
                    <span className="text-[10px] text-gray-400">{log.timestamp.split('T')[0]}</span>
                  </div>
                  <p className="text-gray-600 text-[11px] mt-0.5">{log.details}</p>
                  {log.reason && <p className="text-amber-800 text-[10px] italic">Reason: {log.reason}</p>}
                </div>
              ))}
            {hubActivityLogs.filter((l) => l.entityId === currentCustomer.id).length === 0 && (
              <div className="p-4 text-center bg-white/80 rounded-2xl border border-gray-100 text-xs text-gray-500">
                No recent activity logged for this customer.
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════
  // RENDER: SUPPLIER PROFILE (VIEW / DETAIL MODAL)
  // ══════════════════════════════════════════════════════════════════
  if (selectedSupplierId && currentSupplier) {
    const supplierQuotes = supplierPrices.filter((p) => p.supplierId === currentSupplier.id);

    const supplierSteps = [
      { id: 1, name: 'Profile Added', done: (currentSupplier.stepProgress || 1) >= 1 },
      { id: 2, name: 'GST & Auth', done: (currentSupplier.stepProgress || 1) >= 2 },
      { id: 3, name: 'Terms Agreed', done: (currentSupplier.stepProgress || 1) >= 3 },
      { id: 4, name: 'Sample Tested', done: (currentSupplier.stepProgress || 1) >= 4 },
      { id: 5, name: 'Active POs', done: (currentSupplier.stepProgress || 1) >= 5 },
      { id: 6, name: 'Dues Paid', done: (currentSupplier.stepProgress || 1) >= 6 },
      { id: 7, name: 'Rated 4.5★+', done: (currentSupplier.stepProgress || 1) >= 7 },
    ];

    return (
      <div className="space-y-4 pb-12 animate-fadeIn">
        {/* Top Back Nav */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              if (isSupplierLogin) {
                setActiveSubPage(null);
              } else {
                setSelectedSupplierId(null);
              }
            }}
            className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 bg-white/80 hover:bg-white px-3 py-1.5 rounded-xl border border-gray-200/80 shadow-xs"
          >
            ← {isSupplierLogin ? 'Back to More' : 'Back to Suppliers'}
          </button>
          <div className="flex items-center gap-2">
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                currentSupplier.status === 'Active'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : currentSupplier.status === 'Backup'
                  ? 'bg-blue-100 text-blue-800 border border-blue-300'
                  : 'bg-amber-100 text-amber-800 border border-amber-300'
              }`}
            >
              {currentSupplier.status || 'Active'}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold">
              ★ {currentSupplier.qualityRating || 4.5}
            </span>
          </div>
        </div>

        {/* Header Card */}
        <div className="p-5 rounded-3xl bg-white/90 backdrop-blur-md border border-indigo-100 shadow-sm relative overflow-hidden">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-xl shadow-md">
                {currentSupplier.name.charAt(0)}
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 leading-tight">{currentSupplier.name}</h2>
                <p className="text-xs text-gray-600">
                  {currentSupplier.contactPerson || 'Contact'} • <span className="font-semibold text-gray-800">{currentSupplier.type}</span>
                </p>
                <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-indigo-600" />
                  {currentSupplier.city}, {currentSupplier.state}
                </p>
              </div>
            </div>
          </div>

          {/* Supplier Lifecycle Bar */}
          <div className="mt-5 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-600 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                Supplier Lifecycle: Step {currentSupplier.stepProgress || 1} of 7
              </span>
              <button
                onClick={() => {
                  const next = Math.min(7, (currentSupplier.stepProgress || 1) + 1);
                  updateSupplier(currentSupplier.id, { stepProgress: next });
                  showToast(`Progressed ${currentSupplier.name} to Step ${next}!`);
                }}
                className="text-xs text-indigo-700 hover:text-indigo-900 font-bold underline"
              >
                Mark Next Step Done →
              </button>
            </div>

            <div className="flex items-center gap-1 overflow-x-auto pb-1">
              {supplierSteps.map((st) => (
                <div
                  key={st.id}
                  onClick={() => {
                    updateSupplier(currentSupplier.id, { stepProgress: st.id });
                    showToast(`Updated to Step ${st.id}: ${st.name}`);
                  }}
                  className={`flex-1 min-w-[70px] cursor-pointer text-center p-1.5 rounded-xl transition-all border ${
                    st.id === (currentSupplier.stepProgress || 1)
                      ? 'bg-indigo-50 border-indigo-400 shadow-xs'
                      : st.done
                      ? 'bg-emerald-50/70 border-emerald-200'
                      : 'bg-gray-50/80 border-gray-200 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-center mb-0.5">
                    {st.done ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <span className="text-[10px] font-bold text-gray-400">{st.id}</span>
                    )}
                  </div>
                  <p className="text-[9px] font-bold truncate leading-tight text-gray-700">{st.name}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="grid grid-cols-4 gap-2 mt-4 pt-3 border-t border-gray-100">
            <a
              href={`tel:${currentSupplier.phone}`}
              className="flex flex-col items-center justify-center p-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-800 border border-gray-200 transition-all text-center"
            >
              <Phone className="w-4 h-4 text-emerald-600 mb-1" />
              <span className="text-[10px] font-bold">Call</span>
            </a>
            <button
              onClick={() => sendWhatsAppMessage(currentSupplier.whatsapp || currentSupplier.phone, `Namaskar ${currentSupplier.contactPerson || ''} ji, Shuvam from Rupam Wholesale, Odisha here.`)}
              className="flex flex-col items-center justify-center p-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-800 border border-gray-200 transition-all text-center"
            >
              <MessageSquare className="w-4 h-4 text-emerald-600 mb-1" />
              <span className="text-[10px] font-bold">WhatsApp</span>
            </button>
            <button
              onClick={() => {
                sendWhatsAppMessage(currentSupplier.whatsapp || currentSupplier.phone, `Please share your latest rate card and stock availability list.`);
              }}
              className="flex flex-col items-center justify-center p-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-800 border border-gray-200 transition-all text-center"
            >
              <DollarSign className="w-4 h-4 text-indigo-600 mb-1" />
              <span className="text-[10px] font-bold">Rates</span>
            </button>
            <button
              onClick={() => {
                showToast(`Creating Purchase Order for ${currentSupplier.name}`);
              }}
              className="flex flex-col items-center justify-center p-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white transition-all text-center shadow-xs"
            >
              <Plus className="w-4 h-4 text-white mb-1" />
              <span className="text-[10px] font-bold">New PO</span>
            </button>
          </div>
        </div>

        {/* 7 Supplier Profile Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'prices', label: `Quotes (${supplierQuotes.length})` },
            { id: 'purchases', label: 'Purchases' },
            { id: 'dues', label: 'Payments & Dues' },
            { id: 'quality', label: 'Quality & Damage' },
            { id: 'documents', label: 'Documents' },
            { id: 'notes', label: 'Notes & Log' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSupplierProfileTab(tab.id as typeof supplierProfileTab)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                supplierProfileTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white/80 text-gray-600 hover:bg-white border border-gray-200/80'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB 1: OVERVIEW */}
        {supplierProfileTab === 'overview' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3.5 rounded-2xl bg-white/90 border border-gray-100 shadow-xs">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Total Purchases</span>
                <p className="text-lg font-black text-gray-900 mt-0.5">₹{(currentSupplier.totalPurchases || 0).toLocaleString('en-IN')}</p>
                <span className="text-[10px] text-gray-500">Stock procurement</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-white/90 border border-gray-100 shadow-xs">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Pending Dues</span>
                <p className="text-lg font-black text-amber-600 mt-0.5">₹{(currentSupplier.pendingDues || 0).toLocaleString('en-IN')}</p>
                <span className="text-[10px] text-gray-500">Terms: {currentSupplier.paymentTerms}</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-white/90 border border-gray-100 shadow-xs">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">On-Time Delivery</span>
                <p className="text-lg font-black text-emerald-600 mt-0.5">{currentSupplier.deliveryOnTimeRate || 95}%</p>
                <span className="text-[10px] text-gray-500">Dispatch reliability</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-white/90 border border-gray-100 shadow-xs">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Damage Rate</span>
                <p className="text-lg font-black text-gray-800 mt-0.5">{currentSupplier.damageRate || 1.2}%</p>
                <span className="text-[10px] text-gray-500">Transit breakage</span>
              </div>
            </div>

            {/* Supplier Bank & UPI */}
            <div className="p-4 rounded-2xl bg-white/90 border border-gray-100 shadow-xs space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-indigo-600" />
                Payment & Banking Details
              </h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-500">UPI ID:</span>
                  <p className="font-mono font-bold text-gray-900">{currentSupplier.upiId || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-gray-500">Credit Days:</span>
                  <p className="font-bold text-gray-900">{currentSupplier.creditDays || 0} Days</p>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-500">Bank Details:</span>
                  <p className="font-semibold text-gray-800">
                    {typeof currentSupplier.bankDetails === 'object' && currentSupplier.bankDetails !== null
                      ? `${currentSupplier.bankDetails.bankName || ''} - A/C: ${currentSupplier.bankDetails.accountNumber || ''} (IFSC: ${currentSupplier.bankDetails.ifsc || ''})`
                      : (currentSupplier.bankDetails || 'Available on invoice')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: QUOTES & LANDED COST */}
        {supplierProfileTab === 'prices' && (
          <div className="space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">Landed Cost Calculation per Piece</h3>
            </div>

            {supplierQuotes.length === 0 ? (
              <div className="p-6 text-center bg-white/80 rounded-2xl border border-gray-100 text-xs text-gray-500">
                No active price items listed for this supplier.
              </div>
            ) : (
              supplierQuotes.map((q) => {
                const raw = q.rawPrice ?? (q.rawPricePerPacket / (q.packSize || 12));
                const freight = q.freightPerPiece ?? (q.freightPerPacket / (q.packSize || 12));
                const packing = q.packingPerPiece ?? (q.packingPerPacket / (q.packSize || 12));
                const damage = q.damageAllowancePerPiece ?? (q.damageAllowancePerPacket / (q.packSize || 12));
                const landedCost = raw + freight + packing + damage;
                return (
                  <div key={q.id} className="p-3.5 rounded-2xl bg-white/90 border border-gray-100 shadow-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-gray-900">{q.productName}</h4>
                      <span className="text-xs font-black text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-lg border border-indigo-200">
                        Landed: ₹{landedCost.toFixed(2)}/pc
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5 text-center text-[10px] bg-gray-50 p-2 rounded-xl">
                      <div>
                        <span className="text-gray-400 block">Raw Price</span>
                        <span className="font-bold text-gray-800">₹{raw.toFixed(1)}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block">+ Freight</span>
                        <span className="font-bold text-gray-800">₹{freight.toFixed(1)}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block">+ Packing</span>
                        <span className="font-bold text-gray-800">₹{packing.toFixed(1)}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block">+ Damage</span>
                        <span className="font-bold text-gray-800">₹{damage.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB 3: PURCHASES */}
        {supplierProfileTab === 'purchases' && (
          <div className="p-6 text-center bg-white/80 rounded-2xl border border-gray-100 text-xs text-gray-500">
            Past procurement bills and transport Bilties are stored safely.
          </div>
        )}

        {/* TAB 4: DUES */}
        {supplierProfileTab === 'dues' && (
          <div className="space-y-3 animate-fadeIn">
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100 shadow-xs">
              <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">Outstanding Dues</span>
              <p className="text-2xl font-black text-amber-700 mt-0.5">₹{(currentSupplier.pendingDues || 0).toLocaleString('en-IN')}</p>
              <p className="text-xs text-gray-600 mt-1">Payment Term: {currentSupplier.paymentTerms}</p>
            </div>
          </div>
        )}

        {/* TAB 5: QUALITY */}
        {supplierProfileTab === 'quality' && (
          <div className="p-4 rounded-2xl bg-white/90 border border-gray-100 space-y-2 text-xs">
            <h3 className="font-bold text-gray-800">Transit Breakage & Damage Tracking</h3>
            <p className="text-gray-600">
              Recorded damage rate: <strong>{currentSupplier.damageRate || 1.2}%</strong>.
              All damaged cartons are compensated with credit notes against the next PO.
            </p>
          </div>
        )}

        {/* TAB 6: DOCUMENTS */}
        {supplierProfileTab === 'documents' && (
          <div className="p-4 rounded-2xl bg-white/90 border border-gray-100 space-y-2 text-xs">
            <h3 className="font-bold text-gray-800">Authorization & Certificates</h3>
            <p className="text-gray-600">GST: <span className="font-mono font-bold">{currentSupplier.gstNumber || '21AABCU9603R1ZM'}</span></p>
            <p className="text-gray-600">Brands: {currentSupplier.brands?.join(', ') || 'Cosmetics & FMCG'}</p>
          </div>
        )}

        {/* TAB 7: NOTES */}
        {supplierProfileTab === 'notes' && (
          <div className="space-y-2 text-xs">
            <div className="p-3.5 rounded-2xl bg-white/90 border border-gray-100 shadow-xs">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Supplier Liaison Notes</span>
              <textarea
                defaultValue={
                  typeof currentSupplier.terms === 'object' && currentSupplier.terms !== null
                    ? `${currentSupplier.terms.paymentTerms || ''}. Min ${currentSupplier.terms.minOrderPackets || 10} pkts. Freight: ${currentSupplier.terms.freightArrangement || ''}`
                    : (currentSupplier.terms || 'Delivers via Transport Nagar Cuttack. 2-day delivery lead time.')
                }
                className="w-full mt-1.5 p-2 rounded-xl border border-gray-200 text-xs text-gray-800 bg-gray-50 resize-none h-20"
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════
  // RENDER: HUB HOME VIEW
  // ══════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-4 pb-12 animate-fadeIn">
      {/* Top Header Card */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            Retailer &amp; Supplier Hub
          </h1>
          <p className="text-xs text-gray-600">
            Retailer ID &amp; Supplier Network • Nuapatna Corridor
          </p>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 font-bold border border-blue-200">
          Owner Only
        </span>
      </div>

      {/* Active Business ID Context Banner */}
      <div className="p-3 rounded-2xl bg-indigo-50/80 border border-indigo-200/90 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono text-[10px] font-black text-indigo-700 bg-white px-2 py-0.5 rounded-lg border border-indigo-200">
            {activeBusiness.id}
          </span>
          <div className="min-w-0">
            <span className="font-extrabold text-slate-900 truncate block">
              {activeBusiness.companyName}
            </span>
            <span className="text-[10px] text-indigo-700">
              Active Network • {activeBusiness.category}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-bold text-[10px]">
            Active
          </span>
        </div>
      </div>

      {/* TWO BIG SWITCH CARDS (CUSTOMERS VS SUPPLIERS) */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => {
            setActiveSection('customers');
            setActiveFilterChip('All');
          }}
          className={`p-4 rounded-3xl text-left transition-all border relative overflow-hidden ${
            activeSection === 'customers'
              ? 'bg-gradient-to-br from-white via-sky-50/70 to-indigo-50/50 border-sky-400 shadow-md ring-2 ring-sky-300/40'
              : 'bg-white/70 hover:bg-white border-gray-200/80 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${activeSection === 'customers' ? 'bg-sky-600 text-white shadow-xs' : 'bg-gray-100 text-gray-600'}`}>
              <Store className="w-5 h-5" />
            </div>
            <span className="text-2xl font-black text-gray-900">{customers.length}</span>
          </div>
          <p className="text-sm font-bold text-gray-900 leading-tight">Retailers</p>
          <p className="text-[11px] text-gray-500 mt-0.5">Retailer ID • Buyers</p>
        </button>

        <button
          onClick={() => {
            setActiveSection('suppliers');
            setActiveFilterChip('All');
          }}
          className={`p-4 rounded-3xl text-left transition-all border relative overflow-hidden ${
            activeSection === 'suppliers'
              ? 'bg-gradient-to-br from-white via-indigo-50/70 to-purple-50/50 border-indigo-400 shadow-md ring-2 ring-indigo-300/40'
              : 'bg-white/70 hover:bg-white border-gray-200/80 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${activeSection === 'suppliers' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-gray-100 text-gray-600'}`}>
              <Building2 className="w-5 h-5" />
            </div>
            <span className="text-2xl font-black text-gray-900">{suppliers.length}</span>
          </div>
          <p className="text-sm font-bold text-gray-900 leading-tight">Suppliers</p>
          <p className="text-[11px] text-gray-500 mt-0.5">Dealers • Stock Source</p>
        </button>
      </div>

      {/* QUICK CROSS-TOOLS BAR */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setIsCompareModalOpen(true)}
          className="px-3 py-2 rounded-2xl bg-gradient-to-r from-sky-600 to-indigo-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs whitespace-nowrap"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Compare Best Supplier
        </button>
        <button
          onClick={handleExportVCard}
          className="px-3 py-2 rounded-2xl bg-white/90 hover:bg-white text-gray-700 font-bold text-xs flex items-center gap-1.5 border border-gray-200/80 shadow-xs whitespace-nowrap"
        >
          <Phone className="w-3.5 h-3.5 text-emerald-600" />
          Sync to Phone (vCard)
        </button>
        <button
          onClick={handleExportCsv}
          className="px-3 py-2 rounded-2xl bg-white/90 hover:bg-white text-gray-700 font-bold text-xs flex items-center gap-1.5 border border-gray-200/80 shadow-xs whitespace-nowrap"
        >
          <Download className="w-3.5 h-3.5 text-indigo-600" />
          Export CSV
        </button>
        <button
          onClick={() => {
            if (activeSection === 'customers') setIsAddCustomerOpen(true);
            else setIsAddSupplierOpen(true);
          }}
          className="px-3 py-2 rounded-2xl bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs whitespace-nowrap"
        >
          <Plus className="w-3.5 h-3.5" />
          Add {activeSection === 'customers' ? 'Retailer' : 'Supplier'}
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          NEEDS ATTENTION TODAY SECTION (RESTORED EXACTLY AS SCREENSHOT)
      ══════════════════════════════════════════════════════════════════ */}
      {smartAlerts.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center gap-1.5 px-1">
            <AlertCircle className="w-4 h-4 text-rose-500" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
              Needs Attention Today
            </h3>
          </div>

          <div className="space-y-2.5">
            {smartAlerts.map((alert) => (
              <div
                key={alert.id}
                className="p-4 rounded-3xl bg-white border border-rose-100/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-800 font-extrabold text-[10px] tracking-wider uppercase border border-slate-200 shrink-0">
                    {alert.badge}
                  </span>
                  <div className="min-w-0">
                    <h4 className="font-bold text-xs text-slate-900 leading-tight">
                      {alert.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                      {alert.desc}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={alert.action}
                  className="px-3.5 py-1.5 rounded-full bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold border border-slate-200 shadow-2xs shrink-0 self-start sm:self-auto transition active:scale-95 flex items-center gap-1"
                >
                  <span>{alert.actionText}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SEARCH & SORT BAR */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search by name, phone, village...`}
            className="w-full pl-9 pr-3 py-2 rounded-2xl bg-white/80 border border-gray-200 text-xs text-gray-800 placeholder-gray-400 focus:outline-sky-500"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          aria-label="Sort entities"
          className="px-2.5 py-2 rounded-2xl bg-white/80 border border-gray-200 text-xs font-semibold text-gray-700"
        >
          <option value="latest">Latest</option>
          <option value="highestSales">Highest Sales</option>
          <option value="highestDue">Highest Due</option>
          <option value="name">Name (A-Z)</option>
        </select>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          CATEGORY TABS (CUSTOMERS OR SUPPLIERS)
      ══════════════════════════════════════════════════════════════════ */}
      {activeSection === 'customers' ? (
        <div className="space-y-2">
          {/* 5 Main Customer Categories */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {[
              { id: 'shopType', label: '1. Shop Type' },
              { id: 'status', label: '2. Status' },
              { id: 'payment', label: '3. Payment' },
              { id: 'area', label: '4. Area & Distance' },
              { id: 'value', label: '5. Top Buyers' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setCustomerTab(tab.id as CustomerCategoryTab);
                  setActiveFilterChip('All');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  customerTab === tab.id
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'bg-white/80 text-gray-600 hover:bg-white border border-gray-200/80'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Filter Chips for Selected Category */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            {customerTab === 'shopType' &&
              ['All', 'Cosmetic Shop', 'General/Variety Store', 'Beauty Parlour', 'Kirana/Gift Shop', 'Others'].map((chip) => (
                <button
                  key={chip}
                  onClick={() => setActiveFilterChip(chip)}
                  className={`px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition-all ${
                    activeFilterChip === chip ? 'bg-sky-100 text-sky-800 font-bold border border-sky-300' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {chip}
                </button>
              ))}

            {customerTab === 'status' &&
              ['All', 'New', 'Active', 'Regular', 'Inactive', 'Risky'].map((chip) => (
                <button
                  key={chip}
                  onClick={() => setActiveFilterChip(chip)}
                  className={`px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition-all ${
                    activeFilterChip === chip ? 'bg-sky-100 text-sky-800 font-bold border border-sky-300' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {chip}
                </button>
              ))}

            {customerTab === 'payment' &&
              ['All', 'All Clear', 'Advance Pending', 'Balance Due', 'Udhaar Pending'].map((chip) => (
                <button
                  key={chip}
                  onClick={() => setActiveFilterChip(chip)}
                  className={`px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition-all ${
                    activeFilterChip === chip ? 'bg-sky-100 text-sky-800 font-bold border border-sky-300' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {chip}
                </button>
              ))}

            {customerTab === 'area' &&
              ['All', 'Inside 150 km', 'Outside 150 km', 'Nuapatna', 'Tigiria', 'Athagarh', 'Cuttack', 'Choudwar', 'Banki', 'Dhenkanal'].map((chip) => (
                <button
                  key={chip}
                  onClick={() => setActiveFilterChip(chip)}
                  className={`px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition-all ${
                    activeFilterChip === chip ? 'bg-sky-100 text-sky-800 font-bold border border-sky-300' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {chip}
                </button>
              ))}

            {customerTab === 'value' && (
              <span className="text-[11px] text-gray-500 italic py-1">
                Displaying highest wholesale buyers in order of total business volume
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {/* 5 Main Supplier Categories */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {[
              { id: 'type', label: '1. By Type' },
              { id: 'category', label: '2. Product Category' },
              { id: 'status', label: '3. Status' },
              { id: 'payment', label: '4. Payment Terms' },
              { id: 'rating', label: '5. Rating' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setSupplierTab(tab.id as SupplierCategoryTab);
                  setActiveFilterChip('All');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  supplierTab === tab.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white/80 text-gray-600 hover:bg-white border border-gray-200/80'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Supplier Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            {supplierTab === 'type' &&
              ['All', 'Manufacturer', 'Super Distributor', 'Authorized Dealer', 'Local Wholesaler', 'Packaging Vendor'].map((chip) => (
                <button
                  key={chip}
                  onClick={() => setActiveFilterChip(chip)}
                  className={`px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition-all ${
                    activeFilterChip === chip ? 'bg-indigo-100 text-indigo-800 font-bold border border-indigo-300' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {chip}
                </button>
              ))}

            {supplierTab === 'category' &&
              ['All', 'Color Cosmetics', 'Skincare', 'Haircare', 'Beauty Accessories', 'Packaging Materials'].map((chip) => (
                <button
                  key={chip}
                  onClick={() => setActiveFilterChip(chip)}
                  className={`px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition-all ${
                    activeFilterChip === chip ? 'bg-indigo-100 text-indigo-800 font-bold border border-indigo-300' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {chip}
                </button>
              ))}

            {supplierTab === 'status' &&
              ['All', 'Active', 'Backup', 'Trial/New', 'Blocked'].map((chip) => (
                <button
                  key={chip}
                  onClick={() => setActiveFilterChip(chip)}
                  className={`px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition-all ${
                    activeFilterChip === chip ? 'bg-indigo-100 text-indigo-800 font-bold border border-indigo-300' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {chip}
                </button>
              ))}

            {supplierTab === 'payment' &&
              ['All', 'Credit 15 Days', 'Credit 30 Days', '50% Advance', '100% Advance'].map((chip) => (
                <button
                  key={chip}
                  onClick={() => setActiveFilterChip(chip)}
                  className={`px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition-all ${
                    activeFilterChip === chip ? 'bg-indigo-100 text-indigo-800 font-bold border border-indigo-300' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {chip}
                </button>
              ))}

            {supplierTab === 'rating' &&
              ['All', 'Top Rated (4.5★+)', 'On-Time (95%+)', 'Low Damage'].map((chip) => (
                <button
                  key={chip}
                  onClick={() => setActiveFilterChip(chip)}
                  className={`px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition-all ${
                    activeFilterChip === chip ? 'bg-indigo-100 text-indigo-800 font-bold border border-indigo-300' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {chip}
                </button>
              ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          LIST OF CUSTOMERS OR SUPPLIERS
      ══════════════════════════════════════════════════════════════════ */}
      {activeSection === 'customers' ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-gray-500 font-medium px-1">
            <span>Showing {filteredCustomers.length} retailer shops</span>
            <span>Tap card to view full profile & khata</span>
          </div>

          {filteredCustomers.length === 0 ? (
            <div className="p-8 text-center bg-white/80 rounded-3xl border border-gray-100">
              <Store className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-gray-800">No retailers found</p>
              <p className="text-xs text-gray-500 mt-1">Try another search keyword or add a new retailer.</p>
              <button
                onClick={() => setIsAddCustomerOpen(true)}
                className="mt-4 px-4 py-2 rounded-xl bg-sky-600 text-white font-bold text-xs"
              >
                + Add Retailer
              </button>
            </div>
          ) : (
            filteredCustomers.map((cust) => {
              const hasUdhaar = (cust.pendingUdhaar || 0) > 0;
              const isOutsideRadius = cust.distanceKm > 150;
              const statusTag = cust.tags || cust.status || 'Regular';

              return (
                <div
                  key={cust.id}
                  onClick={() => {
                    setSelectedCustomerId(cust.id);
                    setCustomerProfileTab('overview');
                  }}
                  className="rounded-3xl bg-white p-4.5 border border-slate-100 shadow-xs hover:shadow-md transition cursor-pointer relative overflow-hidden space-y-3.5 group active:scale-[0.99]"
                >
                  {/* Top Header Row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-extrabold text-slate-900 text-base leading-tight">
                          {cust.shopName}
                        </h3>
                        <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                          {statusTag}
                        </span>
                      </div>

                      {/* Udhaar pill if pendingUdhaar > 0 */}
                      {hasUdhaar && (
                        <div className="mt-1">
                          <span className="inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded-md bg-rose-500 text-white shadow-2xs">
                            Udhaar: ₹{(cust.pendingUdhaar || 0).toLocaleString('en-IN')}
                          </span>
                        </div>
                      )}

                      {/* Owner Name and Phone */}
                      <p className="text-xs text-slate-700 font-medium mt-1 flex items-center gap-1.5 flex-wrap">
                        <span>{cust.ownerName}</span>
                        <span className="text-slate-400">•</span>
                        <span className="inline-flex items-center gap-1 text-slate-700">
                          <Phone className="w-3 h-3 fill-slate-700 stroke-none" />
                          <span className="font-mono">{cust.phone}</span>
                        </span>
                      </p>

                      {/* Location and Distance */}
                      <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{cust.villageOrTown || cust.city || 'Nuapatna'}</span>
                        <span className="text-slate-400">•</span>
                        <span className={isOutsideRadius ? 'text-amber-700 font-semibold' : 'text-emerald-700 font-semibold'}>
                          {cust.distanceKm} km ({isOutsideRadius ? 'Outside 150km' : 'Free Delivery'})
                        </span>
                      </p>
                    </div>

                    {/* Total Sales and Orders */}
                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        TOTAL SALES
                      </span>
                      <span className="text-lg font-black text-slate-900 block leading-tight">
                        ₹{(cust.totalSales || 0).toLocaleString('en-IN')}
                      </span>
                      <span className="text-xs text-slate-500 font-medium block mt-0.5">
                        {cust.totalOrders || 0} Orders
                      </span>
                    </div>
                  </div>

                  {/* Middle Row: 4 Category/Action Tiles in 4-Column Grid */}
                  <div className="grid grid-cols-4 gap-2 pt-1">
                    {/* 1. Personal */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCustomerId(cust.id);
                        setCustomerProfileTab('overview');
                      }}
                      className="p-2.5 rounded-2xl bg-white border border-slate-200/90 flex flex-col items-center justify-center gap-1 text-slate-700 shadow-2xs hover:bg-slate-50 active:scale-95 transition"
                    >
                      <User className="w-4 h-4 text-slate-600 mb-0.5" />
                      <span className="text-xs font-bold text-slate-700">Personal</span>
                    </button>

                    {/* 2. Udhaar / Clear */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCustomerId(cust.id);
                        setCustomerProfileTab('khata');
                      }}
                      className={`p-2.5 rounded-2xl border flex flex-col items-center justify-center gap-1 shadow-2xs active:scale-95 transition ${
                        hasUdhaar
                          ? 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100/60'
                          : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100/60'
                      }`}
                    >
                      <Receipt className="w-4 h-4 mb-0.5" />
                      <span className="text-xs font-bold">
                        {hasUdhaar ? `₹${(cust.pendingUdhaar || 0).toLocaleString('en-IN')}` : 'Clear 0'}
                      </span>
                    </button>

                    {/* 3. Dispatch */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCustomerId(cust.id);
                        setCustomerProfileTab('delivery');
                      }}
                      className="p-2.5 rounded-2xl bg-sky-50 border border-sky-200 flex flex-col items-center justify-center gap-1 text-sky-700 shadow-2xs hover:bg-sky-100/60 active:scale-95 transition"
                    >
                      <Truck className="w-4 h-4 mb-0.5" />
                      <span className="text-xs font-bold">Dispatch</span>
                    </button>

                    {/* 4. Orders */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCustomerId(cust.id);
                        setCustomerProfileTab('orders');
                      }}
                      className="p-2.5 rounded-2xl bg-indigo-50 border border-indigo-200 flex flex-col items-center justify-center gap-1 text-indigo-700 shadow-2xs hover:bg-indigo-100/60 active:scale-95 transition"
                    >
                      <ShoppingBag className="w-4 h-4 mb-0.5" />
                      <span className="text-xs font-bold truncate max-w-full">
                        {cust.totalOrders || 0} Orders
                      </span>
                    </button>
                  </div>

                  {/* Bottom Row Actions */}
                  <div
                    className="flex items-center justify-between pt-2 border-t border-slate-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => handleSendCatalogueWhatsApp(cust)}
                      className="text-sky-600 hover:text-sky-700 font-bold text-xs flex items-center gap-1.5 active:scale-95 transition"
                    >
                      <Share2 className="w-4 h-4" />
                      <span>Share Catalogue</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <a
                        href={`tel:${cust.phone}`}
                        className="w-9 h-9 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-600 border border-sky-100 flex items-center justify-center shadow-2xs active:scale-95 transition"
                        title="Call Dukandar"
                      >
                        <Phone className="w-4 h-4" />
                      </a>

                      <button
                        type="button"
                        onClick={() =>
                          sendWhatsAppMessage(
                            cust.whatsapp || cust.phone,
                            `Namaskar ${cust.ownerName} bhai, Shuvam from Rupam Wholesale Nuapatna.`
                          )
                        }
                        className="w-9 h-9 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-100 flex items-center justify-center shadow-2xs active:scale-95 transition"
                        title="WhatsApp"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCustomerId(cust.id);
                          setCustomerProfileTab('overview');
                        }}
                        className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1 shadow-xs active:scale-95 transition"
                      >
                        <span>Details</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })

          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-gray-500 font-medium px-1">
            <span>Showing {filteredSuppliers.length} verified suppliers</span>
            <span>Tap to inspect landed cost & quotes</span>
          </div>

          {filteredSuppliers.length === 0 ? (
            <div className="p-8 text-center bg-white/80 rounded-3xl border border-gray-100">
              <Building2 className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-gray-800">No suppliers found</p>
              <p className="text-xs text-gray-500 mt-1">Try another filter or register a new dealer.</p>
              <button
                onClick={() => setIsAddSupplierOpen(true)}
                className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs"
              >
                + Add Supplier
              </button>
            </div>
          ) : (
            filteredSuppliers.map((supp) => {
              const hasDues = (supp.pendingDues || 0) > 0;
              const poCount = Math.max(1, Math.round((supp.totalPurchases || 10000) / 15000));

              return (
                <div
                  key={supp.id}
                  onClick={() => {
                    setSelectedSupplierId(supp.id);
                    setSupplierProfileTab('overview');
                  }}
                  className="glass-card rounded-3xl p-4.5 border border-white/90 shadow-md hover:shadow-lg transition cursor-pointer active:scale-99 space-y-3"
                >
                  {/* Top Row: Firm Name, Tag, Dues Pill, Contact, Purchases */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-slate-900 leading-tight truncate">
                          {supp.name}
                        </h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          {supp.status === 'Active' ? 'Active Dealer' : supp.type}
                        </span>
                      </div>

                      {hasDues && (
                        <div className="mt-1">
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-rose-500 text-white shadow-2xs">
                            Dues: ₹{(supp.pendingDues || 0).toLocaleString('en-IN')}
                          </span>
                        </div>
                      )}

                      <p className="text-xs text-slate-600 mt-1 flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-slate-800">
                          {supp.contactPerson || 'Dealer Manager'}
                        </span>
                        <span>•</span>
                        <a
                          href={`tel:${supp.phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-slate-600 hover:text-slate-900 flex items-center gap-1"
                        >
                          <Phone className="w-3 h-3 text-slate-500" />
                          <span>{supp.phone}</span>
                        </a>
                      </p>

                      <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-indigo-500" />
                        <span>
                          {supp.city}, {supp.state}
                        </span>
                        <span>•</span>
                        <span className="text-indigo-600 font-semibold">
                          Lead: {supp.leadTimeDays || 2} Days
                        </span>
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        TOTAL PURCHASES
                      </span>
                      <span className="text-lg font-black text-slate-900 block leading-tight">
                        ₹{(supp.totalPurchases || 0).toLocaleString('en-IN')}
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium block mt-0.5">
                        {poCount} Supply Orders
                      </span>
                    </div>
                  </div>

                  {/* Middle Row: 4 Category/Action Tiles in 4-Column Grid */}
                  <div className="grid grid-cols-4 gap-2 pt-1">
                    {/* 1. Profile / Terms */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSupplierId(supp.id);
                        setSupplierProfileTab('overview');
                      }}
                      className="p-2.5 rounded-2xl bg-white border border-slate-200/90 flex flex-col items-center justify-center gap-1 text-slate-700 shadow-2xs hover:bg-slate-50 active:scale-95 transition"
                    >
                      <Building2 className="w-4 h-4 text-slate-600 mb-0.5" />
                      <span className="text-xs font-bold text-slate-700">Terms</span>
                    </button>

                    {/* 2. Dues Khata */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSupplierId(supp.id);
                        setSupplierProfileTab('dues');
                      }}
                      className={`p-2.5 rounded-2xl border flex flex-col items-center justify-center gap-1 shadow-2xs active:scale-95 transition ${
                        hasDues
                          ? 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100/60'
                          : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100/60'
                      }`}
                    >
                      <Receipt className="w-4 h-4 mb-0.5" />
                      <span className="text-xs font-bold">
                        {hasDues ? `₹${(supp.pendingDues || 0).toLocaleString('en-IN')}` : 'Clear 0'}
                      </span>
                    </button>

                    {/* 3. Products / Price List */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSupplierId(supp.id);
                        setSupplierProfileTab('prices');
                      }}
                      className="p-2.5 rounded-2xl bg-sky-50 border border-sky-200 flex flex-col items-center justify-center gap-1 text-sky-700 shadow-2xs hover:bg-sky-100/60 active:scale-95 transition"
                    >
                      <Package className="w-4 h-4 mb-0.5" />
                      <span className="text-xs font-bold truncate max-w-full">
                        {supp.categories?.length || 3} Categories
                      </span>
                    </button>

                    {/* 4. Supply POs */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSupplierId(supp.id);
                        setSupplierProfileTab('purchases');
                      }}
                      className="p-2.5 rounded-2xl bg-indigo-50 border border-indigo-200 flex flex-col items-center justify-center gap-1 text-indigo-700 shadow-2xs hover:bg-indigo-100/60 active:scale-95 transition"
                    >
                      <ShoppingBag className="w-4 h-4 mb-0.5" />
                      <span className="text-xs font-bold truncate max-w-full">
                        {poCount} POs
                      </span>
                    </button>
                  </div>

                  {/* Bottom Row Actions */}
                  <div
                    className="flex items-center justify-between pt-2 border-t border-slate-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        sendWhatsAppMessage(
                          supp.whatsapp || supp.phone,
                          `Namaskar ${supp.contactPerson || supp.name} ji, Shuvam from Rupam Wholesale Nuapatna. Please share your updated wholesale rate card, carton price list, and stock availability.`
                        )
                      }
                      className="text-sky-600 hover:text-sky-700 font-bold text-xs flex items-center gap-1.5 active:scale-95 transition"
                    >
                      <Share2 className="w-4 h-4" />
                      <span>Request Rate Card</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <a
                        href={`tel:${supp.phone}`}
                        className="w-9 h-9 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-600 border border-sky-100 flex items-center justify-center shadow-2xs active:scale-95 transition"
                        title="Call Dealer"
                      >
                        <Phone className="w-4 h-4" />
                      </a>

                      <button
                        type="button"
                        onClick={() =>
                          sendWhatsAppMessage(
                            supp.whatsapp || supp.phone,
                            `Namaskar ${supp.contactPerson || supp.name} ji, Shuvam from Rupam Wholesale Nuapatna.`
                          )
                        }
                        className="w-9 h-9 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-100 flex items-center justify-center shadow-2xs active:scale-95 transition"
                        title="WhatsApp"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSupplierId(supp.id);
                          setSupplierProfileTab('overview');
                        }}
                        className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1 shadow-xs active:scale-95 transition"
                      >
                        <span>Details</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          CROSS-TOOL MODAL: BEST SUPPLIER FOR PRODUCT COMPARISON
      ══════════════════════════════════════════════════════════════════ */}
      {isCompareModalOpen && (
        <CompareSupplierModal
          onClose={() => setIsCompareModalOpen(false)}
          supplierPrices={supplierPrices}
          suppliers={suppliers}
          onSendQuoteWhatsApp={(phone, text) => sendWhatsAppMessage(phone, text)}
        />
      )}

      {/* ══════════════════════════════════════════════════════════════════
          MODAL: ADD NEW CUSTOMER (WITH PHONE DUPLICATE CHECK)
      ══════════════════════════════════════════════════════════════════ */}
      {isAddCustomerOpen && (
        <AddCustomerHubModal
          onClose={() => setIsAddCustomerOpen(false)}
          existingCustomers={customers}
          onAddCustomer={(newCust) => {
            const added = addCustomer(newCust);
            setIsAddCustomerOpen(false);
            setSelectedCustomerId(added.id);
            setCustomerProfileTab('overview');
          }}
        />
      )}

      {/* ══════════════════════════════════════════════════════════════════
          MODAL: ADD NEW SUPPLIER (WITH PHONE DUPLICATE CHECK)
      ══════════════════════════════════════════════════════════════════ */}
      {isAddSupplierOpen && (
        <AddSupplierHubModal
          onClose={() => setIsAddSupplierOpen(false)}
          existingSuppliers={suppliers}
          onAddSupplier={(newSupp) => {
            const added = addSupplier(newSupp);
            setIsAddSupplierOpen(false);
            setSelectedSupplierId(added.id);
            setSupplierProfileTab('overview');
          }}
        />
      )}

      {/* ══════════════════════════════════════════════════════════════════
          MODAL: BLOCK CUSTOMER WITH REASON
      ══════════════════════════════════════════════════════════════════ */}
      {isBlockModalOpen && targetBlockCustomer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-gray-900">Block Retailer Account</h3>
            <p className="text-xs text-gray-600">
              Please enter the reason for blocking <strong>{targetBlockCustomer.shopName}</strong> (e.g. repeated payment default, cancelled parcel).
            </p>
            <input
              type="text"
              value={blockReasonInput}
              onChange={(e) => setBlockReasonInput(e.target.value)}
              placeholder="Reason for blocking..."
              className="w-full p-2.5 rounded-xl border border-gray-200 text-xs text-gray-800 focus:outline-rose-500"
            />
            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => {
                  setIsBlockModalOpen(false);
                  setTargetBlockCustomer(null);
                  setBlockReasonInput('');
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (targetBlockCustomer) {
                    updateCustomer(targetBlockCustomer.id, {
                      isBlocked: true,
                      blockReason: blockReasonInput || 'Owner action',
                      status: 'Risky',
                    });
                    logHubActivity({
                      actor: user?.name || 'Owner',
                      role: 'owner',
                      entityType: 'customer',
                      entityId: targetBlockCustomer.id,
                      entityName: targetBlockCustomer.shopName,
                      action: 'Block Retailer',
                      details: `Retailer blocked with reason: ${blockReasonInput || 'Owner action'}`,
                      reason: blockReasonInput || 'Blocked',
                    });
                    showToast(`Blocked ${targetBlockCustomer.shopName}`);
                  }
                  setIsBlockModalOpen(false);
                  setTargetBlockCustomer(null);
                  setBlockReasonInput('');
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-xs"
              >
                Confirm Block
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          MODAL: QUICK CALL LOG
      ══════════════════════════════════════════════════════════════════ */}
      {isCallLogModalOpen && currentCustomer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-gray-900">Log Phone Call</h3>
            <p className="text-xs text-gray-600">
              Record interaction with <strong>{currentCustomer.ownerName}</strong> ({currentCustomer.shopName})
            </p>
            <div className="space-y-2 text-xs">
              <label className="font-semibold text-gray-700 block">Call Purpose:</label>
              <select
                value={callLogType}
                onChange={(e) => setCallLogType(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-800"
              >
                <option value="Order Confirmation">Order Confirmation</option>
                <option value="Payment Reminder">Payment Reminder</option>
                <option value="Delivery Dispatch Call">Delivery Dispatch Call</option>
                <option value="Catalogue / Offer Follow-up">Catalogue / Offer Follow-up</option>
                <option value="Return / Damage Check">Return / Damage Check</option>
              </select>

              <label className="font-semibold text-gray-700 block mt-2">Notes:</label>
              <textarea
                value={callLogNote}
                onChange={(e) => setCallLogNote(e.target.value)}
                placeholder="Details of call discussion..."
                className="w-full p-2.5 rounded-xl border border-gray-200 text-xs text-gray-800 h-20 resize-none focus:outline-sky-500"
              />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => {
                  setIsCallLogModalOpen(false);
                  setCallLogNote('');
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const updatedLogs = [
                    {
                      id: 'cl-' + Date.now(),
                      date: 'Today, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                      type: callLogType,
                      note: callLogNote || 'Call logged by owner',
                    },
                    ...(currentCustomer.callLogs || []),
                  ];
                  updateCustomer(currentCustomer.id, { callLogs: updatedLogs });
                  showToast('Call logged successfully!');
                  setIsCallLogModalOpen(false);
                  setCallLogNote('');
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-sky-600 shadow-xs"
              >
                Save Call
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════
// SUB-COMPONENT: COMPARE SUPPLIERS MODAL
// ══════════════════════════════════════════════════════════════════════
const CompareSupplierModal: React.FC<{
  onClose: () => void;
  supplierPrices: SupplierPrice[];
  suppliers: Supplier[];
  onSendQuoteWhatsApp: (phone: string, text: string) => void;
}> = ({ onClose, supplierPrices, suppliers, onSendQuoteWhatsApp }) => {
  // Extract unique products
  const productOptions = useMemo(() => {
    const set = new Set<string>();
    supplierPrices.forEach((p) => set.add(p.productName));
    return Array.from(set);
  }, [supplierPrices]);

  const [selectedProduct, setSelectedProduct] = useState<string>(productOptions[0] || 'Matte Liquid Lipstick 12-Hour');

  const filteredQuotes = useMemo(() => {
    return supplierPrices
      .filter((p) => p.productName === selectedProduct)
      .map((p) => {
        const raw = p.rawPrice ?? (p.rawPricePerPacket / (p.packSize || 12));
        const freight = p.freightPerPiece ?? (p.freightPerPacket / (p.packSize || 12));
        const packing = p.packingPerPiece ?? (p.packingPerPacket / (p.packSize || 12));
        const damage = p.damageAllowancePerPiece ?? (p.damageAllowancePerPacket / (p.packSize || 12));
        const landed = raw + freight + packing + damage;
        const supp = suppliers.find((s) => s.id === p.supplierId);
        return {
          ...p,
          rawPriceCalculated: raw,
          freightCalculated: freight,
          packingCalculated: packing,
          damageCalculated: damage,
          landedCostCalculated: landed,
          moqCalculated: p.moq || (p.packSize ? p.packSize * 5 : 50),
          leadTimeCalculated: p.leadTimeDays || p.deliveryDays || 3,
          supplierDetails: supp,
        };
      })
      .sort((a, b) => a.landedCostCalculated - b.landedCostCalculated);
  }, [supplierPrices, selectedProduct, suppliers]);

  const cheapestSupplier = filteredQuotes[0];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl p-5 max-w-lg w-full max-h-[90vh] overflow-y-auto space-y-4 shadow-2xl">
        <div className="flex items-center justify-between pb-2 border-b border-gray-100">
          <div>
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-sky-600" />
              Best Supplier for this Product
            </h3>
            <p className="text-[11px] text-gray-500">Landed Cost comparison: Raw Price + Freight + Packing + Damage</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Product Selector */}
        <div>
          <label className="text-xs font-bold text-gray-700 block mb-1">Select Item to Compare:</label>
          <select
            value={selectedProduct}
            onChange={(e) => setSelectedProduct(e.target.value)}
            className="w-full p-2.5 rounded-2xl bg-gray-50 border border-gray-200 text-xs font-semibold text-gray-800"
          >
            {productOptions.map((prod) => (
              <option key={prod} value={prod}>
                {prod}
              </option>
            ))}
          </select>
        </div>

        {/* Comparison List */}
        <div className="space-y-3">
          {filteredQuotes.map((q, idx) => {
            const isWinner = idx === 0;
            return (
              <div
                key={q.id}
                className={`p-4 rounded-2xl border transition-all relative ${
                  isWinner
                    ? 'bg-gradient-to-r from-emerald-50/80 to-teal-50/80 border-emerald-300 shadow-xs ring-2 ring-emerald-300/40'
                    : 'bg-white border-gray-200'
                }`}
              >
                {isWinner && (
                  <span className="absolute -top-2.5 right-4 px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wider shadow-xs">
                    🏆 Lowest Landed Cost
                  </span>
                )}

                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-gray-900">{q.supplierName}</h4>
                    <p className="text-xs text-gray-500">
                      Min Order: {q.moqCalculated} pcs • Lead time: {q.leadTimeCalculated} days
                    </p>
                    <p className="text-xs text-gray-500">
                      Payment Terms: {q.supplierDetails?.paymentTerms || 'Advance'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-black text-gray-900">₹{q.landedCostCalculated.toFixed(2)}</p>
                    <span className="text-[10px] text-gray-500 block">per piece landed</span>
                  </div>
                </div>

                {/* Cost Breakdown */}
                <div className="grid grid-cols-4 gap-1 mt-3 pt-2 border-t border-gray-100 text-center text-[10px] bg-white/80 p-1.5 rounded-xl">
                  <div>
                    <span className="text-gray-400 block">Raw</span>
                    <span className="font-bold text-gray-800">₹{q.rawPriceCalculated.toFixed(1)}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Freight</span>
                    <span className="font-bold text-gray-800">₹{q.freightCalculated.toFixed(1)}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Packing</span>
                    <span className="font-bold text-gray-800">₹{q.packingCalculated.toFixed(1)}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Damage</span>
                    <span className="font-bold text-gray-800">₹{q.damageCalculated.toFixed(1)}</span>
                  </div>
                </div>

                <div className="mt-3 flex justify-end gap-2">
                  <button
                    onClick={() => {
                      if (q.supplierDetails) {
                        const text = `Namaskar ${q.supplierName}, need urgent quotation for 500 pcs of ${q.productName}. Please confirm current price and dispatch date.`;
                        onSendQuoteWhatsApp(q.supplierDetails.whatsapp || q.supplierDetails.phone, text);
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center gap-1 shadow-xs"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    Request Quote on WhatsApp
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════
// SUB-COMPONENT: ADD CUSTOMER MODAL (WITH DUPLICATE CHECK)
// ══════════════════════════════════════════════════════════════════════
const AddCustomerHubModal: React.FC<{
  onClose: () => void;
  existingCustomers: Customer[];
  onAddCustomer: (cust: Omit<Customer, 'id' | 'totalOrders' | 'totalSales' | 'pendingBalance' | 'pendingUdhaar' | 'lastOrderDate'>) => void;
}> = ({ onClose, existingCustomers, onAddCustomer }) => {
  const [shopName, setShopName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [shopType, setShopType] = useState('Cosmetic Shop');
  const [villageOrTown, setVillageOrTown] = useState('Nuapatna');
  const [address, setAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [distanceKm, setDistanceKm] = useState(15);
  const [gstNumber, setGstNumber] = useState('');

  // Duplicate Check
  const isDuplicatePhone = useMemo(() => {
    if (phone.length < 10) return false;
    return existingCustomers.some((c) => c.phone.replace(/\D/g, '') === phone.replace(/\D/g, ''));
  }, [phone, existingCustomers]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopName || !ownerName || !phone) {
      alert('Please fill shop name, owner name, and phone number.');
      return;
    }
    if (isDuplicatePhone) {
      alert('This phone number is already registered for another shopkeeper! Check existing list.');
      return;
    }

    onAddCustomer({
      shopName,
      ownerName,
      phone,
      whatsapp: whatsapp || phone,
      shopType: shopType as Customer['shopType'],
      category: shopType,
      villageOrTown,
      city: villageOrTown,
      state: 'Odisha',
      address: address || `${villageOrTown}, Cuttack, Odisha`,
      landmark,
      distanceKm: Number(distanceKm) || 15,
      gstNumber,
      status: 'New',
      tags: 'New',
      lat: 20.4856,
      lng: 85.8344,
      paymentStatus: 'All Clear',
      stepProgress: 1,
      checklist: {
        minOrderAgreed: true,
        fullPacketAgreed: true,
        advancePolicyAgreed: true,
        udhaarRuleAgreed: true,
        unboxingVideoAgreed: true,
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl p-5 max-w-md w-full max-h-[90vh] overflow-y-auto space-y-4 shadow-2xl">
        <div className="flex items-center justify-between pb-2 border-b border-gray-100">
          <div>
            <h3 className="text-base font-bold text-gray-900">Add Retailer (Retailer ID)</h3>
            <p className="text-xs text-gray-500">Step 1: Enter retailer shop &amp; owner verification details</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="font-bold text-gray-700 block mb-1">Shop Name *</label>
            <input
              type="text"
              required
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              placeholder="E.g. Maa Tarini Variety Store"
              className="w-full p-2.5 rounded-xl border border-gray-200 text-xs focus:outline-sky-500"
            />
          </div>

          <div>
            <label className="font-bold text-gray-700 block mb-1">Owner Name *</label>
            <input
              type="text"
              required
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              placeholder="E.g. Bikram Sahoo"
              className="w-full p-2.5 rounded-xl border border-gray-200 text-xs focus:outline-sky-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-bold text-gray-700 block mb-1">Phone Number *</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="10-digit number"
                className={`w-full p-2.5 rounded-xl border text-xs focus:outline-sky-500 ${
                  isDuplicatePhone ? 'border-rose-500 bg-rose-50' : 'border-gray-200'
                }`}
              />
              {isDuplicatePhone && (
                <span className="text-[10px] text-rose-600 font-bold block mt-0.5">⚠️ Already registered!</span>
              )}
            </div>

            <div>
              <label className="font-bold text-gray-700 block mb-1">WhatsApp Number</label>
              <input
                type="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="Defaults to phone"
                className="w-full p-2.5 rounded-xl border border-gray-200 text-xs focus:outline-sky-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-bold text-gray-700 block mb-1">Shop Type</label>
              <select
                value={shopType}
                onChange={(e) => setShopType(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-gray-200 text-xs font-semibold"
              >
                <option value="Cosmetic Shop">Cosmetic Shop</option>
                <option value="General/Variety Store">General/Variety Store</option>
                <option value="Beauty Parlour">Beauty Parlour</option>
                <option value="Kirana/Gift Shop">Kirana/Gift Shop</option>
                <option value="Others">Others</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-gray-700 block mb-1">Village / Town</label>
              <input
                type="text"
                value={villageOrTown}
                onChange={(e) => setVillageOrTown(e.target.value)}
                placeholder="Nuapatna / Tigiria / etc."
                className="w-full p-2.5 rounded-xl border border-gray-200 text-xs focus:outline-sky-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-bold text-gray-700 block mb-1">Distance from Nuapatna (km)</label>
              <input
                type="number"
                value={distanceKm}
                onChange={(e) => setDistanceKm(Number(e.target.value))}
                className="w-full p-2.5 rounded-xl border border-gray-200 text-xs focus:outline-sky-500"
              />
              <span className={`text-[10px] font-bold block mt-0.5 ${distanceKm <= 150 ? 'text-emerald-600' : 'text-amber-600'}`}>
                {distanceKm <= 150 ? '✓ Free Delivery (<= 150 km)' : '⚠️ Outside 150 km corridor'}
              </span>
            </div>

            <div>
              <label className="font-bold text-gray-700 block mb-1">GST Number (Optional)</label>
              <input
                type="text"
                value={gstNumber}
                onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                placeholder="21XXXXX..."
                className="w-full p-2.5 rounded-xl border border-gray-200 text-xs focus:outline-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-gray-700 block mb-1">Shop Address & Landmark</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Market road, near temple..."
              className="w-full p-2.5 rounded-xl border border-gray-200 text-xs focus:outline-sky-500"
            />
          </div>

          <div className="pt-3 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-gray-100 font-semibold text-gray-700 text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isDuplicatePhone}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 font-bold text-white text-xs shadow-md disabled:opacity-50"
            >
              Save Retailer &amp; Start Step 2
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════
// SUB-COMPONENT: ADD SUPPLIER MODAL (WITH DUPLICATE CHECK)
// ══════════════════════════════════════════════════════════════════════
const AddSupplierHubModal: React.FC<{
  onClose: () => void;
  existingSuppliers: Supplier[];
  onAddSupplier: (supp: Omit<Supplier, 'id'>) => void;
}> = ({ onClose, existingSuppliers, onAddSupplier }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState('Super Distributor');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [city, setCity] = useState('Cuttack');
  const [state, setState] = useState('Odisha');
  const [categories, setCategories] = useState('Color Cosmetics');
  const [paymentTerms, setPaymentTerms] = useState('Credit 15 Days');
  const [creditDays, setCreditDays] = useState(15);
  const [upiId, setUpiId] = useState('');

  const isDuplicatePhone = useMemo(() => {
    if (phone.length < 10) return false;
    return existingSuppliers.some((s) => s.phone.replace(/\D/g, '') === phone.replace(/\D/g, ''));
  }, [phone, existingSuppliers]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) {
      alert('Please fill company name and phone number.');
      return;
    }
    if (isDuplicatePhone) {
      alert('This phone number is already registered for another supplier!');
      return;
    }

    onAddSupplier({
      name,
      type: type as Supplier['type'],
      contactPerson,
      phone,
      whatsapp: whatsapp || phone,
      brandAuth: 'Authorized Partner',
      address: `${city}, ${state}`,
      rating: 4.8,
      dueAmount: 0,
      city,
      state,
      categories: [categories],
      paymentTerms,
      creditDays: Number(creditDays) || 0,
      upiId,
      status: 'Active',
      paymentStatus: 'Clear',
      stepProgress: 1,
      qualityRating: 4.8,
      deliveryOnTimeRate: 98,
      damageRate: 1.0,
      totalPurchases: 0,
      pendingDues: 0,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl p-5 max-w-md w-full max-h-[90vh] overflow-y-auto space-y-4 shadow-2xl">
        <div className="flex items-center justify-between pb-2 border-b border-gray-100">
          <div>
            <h3 className="text-base font-bold text-gray-900">Add Supplier / Dealer</h3>
            <p className="text-xs text-gray-500">Register procurement partner & terms</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="font-bold text-gray-700 block mb-1">Company / Dealer Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="E.g. Shree Ganesh Cosmetics Wholesalers"
              className="w-full p-2.5 rounded-xl border border-gray-200 text-xs focus:outline-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-bold text-gray-700 block mb-1">Supplier Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-gray-200 text-xs font-semibold"
              >
                <option value="Manufacturer">Manufacturer</option>
                <option value="Super Distributor">Super Distributor</option>
                <option value="Authorized Dealer">Authorized Dealer</option>
                <option value="Local Wholesaler">Local Wholesaler</option>
                <option value="Packaging Vendor">Packaging Vendor</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-gray-700 block mb-1">Contact Person</label>
              <input
                type="text"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="E.g. Rajesh Bhai"
                className="w-full p-2.5 rounded-xl border border-gray-200 text-xs focus:outline-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-bold text-gray-700 block mb-1">Phone Number *</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="10-digit number"
                className={`w-full p-2.5 rounded-xl border text-xs focus:outline-indigo-500 ${
                  isDuplicatePhone ? 'border-rose-500 bg-rose-50' : 'border-gray-200'
                }`}
              />
              {isDuplicatePhone && (
                <span className="text-[10px] text-rose-600 font-bold block mt-0.5">⚠️ Already registered!</span>
              )}
            </div>

            <div>
              <label className="font-bold text-gray-700 block mb-1">City, State</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Cuttack / Surat / Delhi"
                className="w-full p-2.5 rounded-xl border border-gray-200 text-xs focus:outline-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-bold text-gray-700 block mb-1">Payment Terms</label>
              <select
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-gray-200 text-xs font-semibold"
              >
                <option value="Credit 15 Days">Credit 15 Days</option>
                <option value="Credit 30 Days">Credit 30 Days</option>
                <option value="50% Advance">50% Advance</option>
                <option value="100% Advance">100% Advance</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-gray-700 block mb-1">UPI ID (for payments)</label>
              <input
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="dealer@upi"
                className="w-full p-2.5 rounded-xl border border-gray-200 text-xs focus:outline-indigo-500"
              />
            </div>
          </div>

          <div className="pt-3 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-gray-100 font-semibold text-gray-700 text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isDuplicatePhone}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 font-bold text-white text-xs shadow-md disabled:opacity-50"
            >
              Register Supplier
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
