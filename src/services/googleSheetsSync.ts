import {
  BusinessProfile,
  BusinessSettings,
  ChatbotEnquiry,
  Customer,
  CustomerRegistration,
  DigitalMarketingWork,
  Expense,
  Order,
  Payment,
  Product,
  ReturnRequest,
  Supplier,
  SupplierPrice,
  SupplierPurchaseOrder,
  UdhaarRecord,
  User,
  UserRole,
} from '../types';

export interface SheetTableDataset {
  tableName: string;
  label: string;
  description: string;
  headers: string[];
  rows: (string | number | boolean)[][];
}

export interface SheetFileRecord {
  fileKey: string;
  targetId: string;
  targetRole: UserRole | 'business';
  label: string;
  spreadsheetId: string;
  spreadsheetUrl: string;
  tables: string[];
  totalRows: number;
  lastSyncedAt: string;
  syncedByEmail?: string;
  lastError?: string | null;
}

export interface SheetTargetDescriptor {
  fileKey: string;
  targetId: string;
  targetRole: UserRole | 'business';
  label: string;
  sheetTitle: string;
  subtitle: string;
}

export interface SheetSyncHistoryEntry {
  id: string;
  timestamp: string;
  fileKey: string;
  label: string;
  spreadsheetId: string;
  tablesCount: number;
  rowsCount: number;
  mode: 'Manual' | 'Auto Sync' | 'Bulk Sync' | 'Pull';
  status: 'Success' | 'Error';
  message: string;
}

export interface WorkspaceTablesSource {
  role: UserRole;
  user: User | null;
  settings: BusinessSettings;
  businesses: BusinessProfile[];
  activeBusinessId: string;
  customers: Customer[];
  suppliers: Supplier[];
  products: Product[];
  orders: Order[];
  supplierOrders: SupplierPurchaseOrder[];
  payments: Payment[];
  udhaar: UdhaarRecord[];
  returns: ReturnRequest[];
  expenses: Expense[];
  supplierPrices: SupplierPrice[];
  enquiries: ChatbotEnquiry[];
  customerRegistrations: CustomerRegistration[];
  digitalMarketingWorks: DigitalMarketingWork[];
}

const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

function sanitizeSheetTabName(raw: string): string {
  return raw
    .replace(/[\\/?*[\]:]/g, '_')
    .trim()
    .slice(0, 80);
}

function cell(val: unknown): string | number | boolean {
  if (val === null || val === undefined) return '';
  if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
  if (typeof val === 'boolean') return val;
  return String(val).slice(0, 1000);
}

/**
 * Returns the target Google Sheet file descriptors allowed for the currently logged-in ID.
 * - Owner sees the Master All-Data file + separate file per Business ID, Retailer ID, and Supplier ID.
 * - Retailer sees ONLY their own Retailer ID Google Sheet file.
 * - Supplier sees ONLY their own Supplier ID Google Sheet file.
 */
export function buildSheetTargetsForWorkspace(
  source: Pick<WorkspaceTablesSource, 'role' | 'user' | 'businesses' | 'customers' | 'suppliers' | 'settings'>
): SheetTargetDescriptor[] {
  const { role, user, businesses, customers, suppliers, settings } = source;

  if (role === 'customer') {
    const cust = customers.find((c) => c.id === user?.customerId) || customers[0];
    if (!cust) return [];
    return [
      {
        fileKey: `customer-${cust.id}`,
        targetId: cust.id,
        targetRole: 'customer',
        label: `${cust.shopName} (Retailer ID)`,
        sheetTitle: `Rupam_Retailer_${cust.id}_${cust.shopName}`.slice(0, 90),
        subtitle: `Retailer ID: ${cust.id} • ${cust.ownerName} • ${cust.villageOrTown || cust.city}`,
      },
    ];
  }

  if (role === 'supplier') {
    const supp = suppliers.find((s) => s.id === user?.supplierId) || suppliers[0];
    if (!supp) return [];
    return [
      {
        fileKey: `supplier-${supp.id}`,
        targetId: supp.id,
        targetRole: 'supplier',
        label: `${supp.name} (Supplier ID)`,
        sheetTitle: `Rupam_Supplier_${supp.id}_${supp.name}`.slice(0, 90),
        subtitle: `Supplier ID: ${supp.id} • ${supp.city || 'Wholesale'} • ${supp.brandAuth}`,
      },
    ];
  }

  // Owner: Master file with ALL data + separate files for every Business, Retailer, and Supplier ID
  const list: SheetTargetDescriptor[] = [
    {
      fileKey: 'owner-master',
      targetId: 'owner-master',
      targetRole: 'owner',
      label: `Owner Master - All Data (${settings.businessName})`,
      sheetTitle: `Rupam_Owner_Master_All_Data_${settings.ownerName}`.slice(0, 90),
      subtitle: `All Businesses, Retailers, Suppliers, Products, Orders & Khata Tables`,
    },
  ];

  businesses.forEach((b) => {
    list.push({
      fileKey: `business-${b.id}`,
      targetId: b.id,
      targetRole: 'business',
      label: `${b.companyName} (Business ID)`,
      sheetTitle: `Rupam_Business_${b.id}_${b.companyName}`.slice(0, 90),
      subtitle: `Business ID: ${b.id} • ${b.city}, ${b.state}`,
    });
  });

  customers.forEach((c) => {
    list.push({
      fileKey: `customer-${c.id}`,
      targetId: c.id,
      targetRole: 'customer',
      label: `${c.shopName} (Retailer ID)`,
      sheetTitle: `Rupam_Retailer_${c.id}_${c.shopName}`.slice(0, 90),
      subtitle: `Retailer ID: ${c.id} • ${c.ownerName} • ${c.phone}`,
    });
  });

  suppliers.forEach((s) => {
    list.push({
      fileKey: `supplier-${s.id}`,
      targetId: s.id,
      targetRole: 'supplier',
      label: `${s.name} (Supplier ID)`,
      sheetTitle: `Rupam_Supplier_${s.id}_${s.name}`.slice(0, 90),
      subtitle: `Supplier ID: ${s.id} • ${s.city || 'Hub'} • ${s.phone}`,
    });
  });

  return list;
}

/**
 * Generates separate normalized tables for any target descriptor.
 */
export function buildTablesForTarget(
  target: SheetTargetDescriptor,
  source: WorkspaceTablesSource,
  registry: Record<string, SheetFileRecord>
): SheetTableDataset[] {
  if (target.targetRole === 'customer') {
    const cust = source.customers.find((c) => c.id === target.targetId) || source.customers[0];
    if (!cust) return [];
    const custOrders = source.orders.filter(
      (o) => o.customerId === cust.id || (cust.phone && o.phone === cust.phone)
    );
    const custPayments = source.payments.filter((p) => p.customerId === cust.id);
    const custUdhaar = source.udhaar.filter(
      (u) => u.customerId === cust.id || u.shopName === cust.shopName
    );
    const custReturns = source.returns.filter((r) => r.customerId === cust.id);

    return [
      {
        tableName: 'Account_Profile',
        label: 'Retailer Profile',
        description: 'Retailer ID account & credit summary',
        headers: [
          'Retailer ID',
          'Shop Name',
          'Owner Name',
          'Phone',
          'WhatsApp',
          'Village/City',
          'Distance (Km)',
          'Pending Balance',
          'Pending Udhaar',
          'Total Orders',
          'Total Sales',
          'Status',
        ],
        rows: [
          [
            cell(cust.id),
            cell(cust.shopName),
            cell(cust.ownerName),
            cell(cust.phone),
            cell(cust.whatsapp),
            cell(cust.villageOrTown || cust.city),
            cell(cust.distanceKm),
            cell(cust.pendingBalance),
            cell(cust.pendingUdhaar),
            cell(cust.totalOrders),
            cell(cust.totalSales),
            cell(cust.status || cust.tags),
          ],
        ],
      },
      {
        tableName: 'My_Orders',
        label: 'My Orders',
        description: 'All wholesale orders placed by this Retailer ID',
        headers: [
          'Order ID',
          'Order Number',
          'Date',
          'Items Count',
          'Subtotal',
          'Delivery Charge',
          'Total Amount',
          'Advance Paid',
          'Balance Due',
          'Status',
        ],
        rows: custOrders.map((o) => [
          cell(o.id),
          cell(o.orderNumber),
          cell(o.createdAt.split('T')[0]),
          cell(o.items.length),
          cell(o.subtotal),
          cell(o.deliveryCharge),
          cell(o.totalAmount),
          cell(o.advanceAmount),
          cell(o.balanceAmount),
          cell(o.status),
        ]),
      },
      {
        tableName: 'My_Invoices',
        label: 'My Invoices',
        description: 'Invoice numbers and payment breakdowns for this Retailer ID',
        headers: [
          'Invoice #',
          'Order #',
          'Bill Date',
          'Shop Name',
          'Grand Total',
          'Advance Paid',
          'Balance Due',
          'Status',
          'UPI ID',
        ],
        rows: custOrders.map((o) => [
          `INV-${o.orderNumber}`,
          cell(o.orderNumber),
          cell(o.createdAt.split('T')[0]),
          cell(o.shopName),
          cell(o.totalAmount),
          cell(o.advanceAmount),
          cell(o.balanceAmount),
          cell(o.status),
          cell(source.settings.upiId),
        ]),
      },
      {
        tableName: 'My_Payments',
        label: 'My Payments',
        description: 'Advance, delivery balance, and Udhaar payments',
        headers: ['Payment ID', 'Date', 'Order #', 'Type', 'Mode', 'Amount', 'Reference ID', 'Confirmed'],
        rows: custPayments.map((p) => [
          cell(p.id),
          cell(p.date),
          cell(p.orderNumber || ''),
          cell(p.type || 'General'),
          cell(p.mode),
          cell(p.amount),
          cell(p.referenceId),
          cell(p.confirmedByOwner ? 'Yes' : 'Pending'),
        ]),
      },
      {
        tableName: 'My_Udhaar',
        label: 'My Udhaar',
        description: 'Shortage Udhaar records for this Retailer ID',
        headers: ['Udhaar ID', 'Date', 'Order #', 'Bill Amount', 'Shortage Amount', 'Shortage %', 'Status'],
        rows: custUdhaar.map((u) => [
          cell(u.id),
          cell(u.date),
          cell(u.orderNumber),
          cell(u.billAmount),
          cell(u.shortageAmount),
          cell(u.shortagePct),
          cell(u.status),
        ]),
      },
      {
        tableName: 'My_Returns',
        label: 'My Returns',
        description: 'Damage return & replacement claims',
        headers: ['Return ID', 'Order #', 'Items Summary', 'Estimated Value', 'Status', 'Outcome'],
        rows: custReturns.map((r) => [
          cell(r.id),
          cell(r.orderNumber),
          cell(r.itemsSummary),
          cell(r.estimatedDamageValue),
          cell(r.status),
          cell(r.outcome || ''),
        ]),
      },
      {
        tableName: 'Wholesale_Catalogue',
        label: 'Wholesale Catalogue',
        description: 'Active wholesale cosmetic SKU catalog & packet rates',
        headers: ['Product ID', 'SKU', 'Name', 'Brand', 'Category', 'Pack Size', 'Stock Pkts', 'Price/Pkt'],
        rows: source.products.map((p) => [
          cell(p.id),
          cell(p.sku),
          cell(p.name),
          cell(p.brand),
          cell(p.category),
          cell(p.packSize),
          cell(p.packetStock),
          cell(p.sellingPrice),
        ]),
      },
      {
        tableName: 'My_Digital_Marketing',
        label: 'My Digital Marketing',
        description: 'Digital marketing services applied & running for this Retailer ID',
        headers: ['Work ID', 'Service Name', 'Status', 'Posts Done', 'Target Posts', 'Applied Date', 'Last Post Date', 'Price'],
        rows: (source.digitalMarketingWorks || [])
          .filter((w) => w.clientId === cust.id)
          .map((w) => [
            cell(w.id),
            cell(w.serviceName),
            cell(w.status),
            cell(w.postsDone),
            cell(w.targetPosts),
            cell(w.appliedDate),
            cell(w.lastPostDate || ''),
            cell(w.price),
          ]),
      },
    ];
  }

  if (target.targetRole === 'supplier') {
    const supp = source.suppliers.find((s) => s.id === target.targetId) || source.suppliers[0];
    if (!supp) return [];
    const suppProducts = source.products.filter(
      (p) => p.supplierId === supp.id || (p.brand && supp.brands?.includes(p.brand))
    );
    const suppPOs = source.supplierOrders.filter((po) => po.supplierId === supp.id);
    const suppRates = source.supplierPrices.filter((sp) => sp.supplierId === supp.id);
    const suppPayments = source.payments.filter(
      (p) => p.customerId === supp.id || p.type === 'Supplier Due'
    );

    return [
      {
        tableName: 'Account_Profile',
        label: 'Supplier Profile',
        description: 'Supplier ID account & payable settlement summary',
        headers: [
          'Supplier ID',
          'Supplier Name',
          'Brand Auth',
          'Contact Person',
          'Phone',
          'City',
          'Payment Terms',
          'Payable Due',
          'Rating',
        ],
        rows: [
          [
            cell(supp.id),
            cell(supp.name),
            cell(supp.brandAuth),
            cell(supp.contactPerson || ''),
            cell(supp.phone),
            cell(supp.city || ''),
            cell(supp.paymentTerms),
            cell(supp.dueAmount ?? supp.pendingDues ?? 0),
            cell(supp.rating),
          ],
        ],
      },
      {
        tableName: 'Supplied_Products',
        label: 'Supplied Products',
        description: 'Hub inventory & low-stock alerts for this Supplier ID',
        headers: [
          'Product ID',
          'SKU',
          'Product Name',
          'Brand',
          'Pack Size',
          'Hub Stock (Pkts)',
          'Reorder Level',
          'Low Stock?',
          'Purchase Cost/Pkt',
        ],
        rows: suppProducts.map((p) => [
          cell(p.id),
          cell(p.sku),
          cell(p.name),
          cell(p.brand),
          cell(p.packSize),
          cell(p.packetStock),
          cell(p.reorderLevel),
          cell(p.isLowStock || p.packetStock <= p.reorderLevel ? 'LOW STOCK' : 'OK'),
          cell(p.purchaseCost),
        ]),
      },
      {
        tableName: 'Purchase_Orders',
        label: 'Purchase Orders',
        description: 'Owner procurement purchase orders & bilty dispatch tracking',
        headers: [
          'PO ID',
          'PO Number',
          'Order Date',
          'Expected Date',
          'Total Lot Amount',
          'Advance Paid',
          'Balance Due',
          'Payment Status',
          'Order Status',
          'Transport',
          'Bilty #',
        ],
        rows: suppPOs.map((po) => [
          cell(po.id),
          cell(po.poNumber),
          cell(po.orderDate),
          cell(po.expectedDate),
          cell(po.totalAmount),
          cell(po.advancePaid),
          cell(po.balanceDue),
          cell(po.paymentStatus),
          cell(po.status),
          cell(po.transportCompany || ''),
          cell(po.biltyNumber || ''),
        ]),
      },
      {
        tableName: 'Supplier_Bills',
        label: 'Supplier Bills',
        description: 'Purchase invoice & settlement ledger',
        headers: ['PO Number', 'Supplier', 'Bill Date', 'Lot Total', 'Advance Paid', 'Balance Due', 'Payment Status'],
        rows: suppPOs.map((po) => [
          cell(po.poNumber),
          cell(po.supplierName),
          cell(po.orderDate),
          cell(po.totalAmount),
          cell(po.advancePaid),
          cell(po.balanceDue),
          cell(po.paymentStatus),
        ]),
      },
      {
        tableName: 'Supplier_Rates',
        label: 'Rate Card & Landed Cost',
        description: 'Quoted raw prices, freight, packing & landed costs',
        headers: [
          'Rate ID',
          'Product',
          'Pack Size',
          'Raw Price/Pkt',
          'Freight/Pkt',
          'Packing/Pkt',
          'Damage Allowance',
          'Landed Cost/Pkt',
          'Lead Days',
          'Valid Till',
        ],
        rows: suppRates.map((r) => [
          cell(r.id),
          cell(r.productName),
          cell(r.packSize),
          cell(r.rawPricePerPacket),
          cell(r.freightPerPacket),
          cell(r.packingPerPacket),
          cell(r.damageAllowancePerPacket),
          cell(r.landedCostPerPacket),
          cell(r.deliveryDays),
          cell(r.validTill),
        ]),
      },
      {
        tableName: 'Supplier_Payments',
        label: 'Supplier Payments',
        description: 'Settlements paid to this Supplier ID',
        headers: ['Payment ID', 'Date', 'PO / Party', 'Mode', 'Amount', 'Reference ID', 'Confirmed'],
        rows: suppPayments.map((p) => [
          cell(p.id),
          cell(p.date),
          cell(p.shopName),
          cell(p.mode),
          cell(p.amount),
          cell(p.referenceId),
          cell(p.confirmedByOwner ? 'Yes' : 'Pending'),
        ]),
      },
      {
        tableName: 'My_Digital_Marketing',
        label: 'My Digital Marketing',
        description: 'Digital marketing services & brand promotions for this Supplier ID',
        headers: ['Work ID', 'Service Name', 'Status', 'Posts Done', 'Target Posts', 'Applied Date', 'Last Post Date', 'Price'],
        rows: (source.digitalMarketingWorks || [])
          .filter((w) => w.clientId === supp.id)
          .map((w) => [
            cell(w.id),
            cell(w.serviceName),
            cell(w.status),
            cell(w.postsDone),
            cell(w.targetPosts),
            cell(w.appliedDate),
            cell(w.lastPostDate || ''),
            cell(w.price),
          ]),
      },
    ];
  }

  // Owner or Business ID: filter by businessId if targetRole === 'business', otherwise ALL records
  const isBizScoped = target.targetRole === 'business';
  const bizId = target.targetId;
  const bizFilter = <T extends { businessId?: string }>(items: T[]): T[] => {
    if (!isBizScoped) return items;
    const matched = items.filter((item) => !item.businessId || item.businessId === bizId);
    return matched;
  };

  const scopedBusinesses = isBizScoped
    ? source.businesses.filter((b) => b.id === bizId)
    : source.businesses;
  const scopedProducts = bizFilter(source.products);
  const scopedCustomers = bizFilter(source.customers);
  const scopedSuppliers = bizFilter(source.suppliers);
  const scopedOrders = bizFilter(source.orders);
  const scopedPOs = source.supplierOrders;
  const scopedPayments = source.payments;
  const scopedUdhaar = source.udhaar;
  const scopedReturns = source.returns;
  const scopedExpenses = source.expenses;
  const scopedRates = source.supplierPrices;
  const scopedEnquiries = source.enquiries;

  const tables: SheetTableDataset[] = [
    {
      tableName: 'Businesses',
      label: 'Business Profiles',
      description: 'Multi-business company IDs & rules',
      headers: ['Business ID', 'Company Name', 'Owner Name', 'Category', 'Phone', 'City', 'State', 'UPI ID', 'Min Order'],
      rows: scopedBusinesses.map((b) => [
        cell(b.id),
        cell(b.companyName),
        cell(b.ownerName),
        cell(b.category),
        cell(b.phone),
        cell(b.city),
        cell(b.state),
        cell(b.upiId),
        cell(b.minOrderValue || 1000),
      ]),
    },
    {
      tableName: 'Products',
      label: 'Products & Stock',
      description: 'Full SKU catalog, packet stock, cost & margin',
      headers: [
        'Product ID',
        'SKU',
        'Product Name',
        'Brand',
        'Category',
        'Pack Size',
        'Packet Stock',
        'Pieces Stock',
        'Purchase Cost',
        'Selling Price',
        'Margin %',
        'Reorder Level',
        'Low Stock',
        'Supplier ID',
      ],
      rows: scopedProducts.map((p) => [
        cell(p.id),
        cell(p.sku),
        cell(p.name),
        cell(p.brand),
        cell(p.category),
        cell(p.packSize),
        cell(p.packetStock),
        cell(p.piecesStock),
        cell(p.purchaseCost),
        cell(p.sellingPrice),
        cell(p.marginPercent),
        cell(p.reorderLevel),
        cell(p.isLowStock || p.packetStock <= p.reorderLevel ? 'YES' : 'NO'),
        cell(p.supplierId || ''),
      ]),
    },
    {
      tableName: 'Retailers',
      label: 'Retailer IDs',
      description: 'All registered Retailer shopkeeper IDs & dues',
      headers: [
        'Retailer ID',
        'Shop Name',
        'Owner Name',
        'Phone',
        'City / Village',
        'Distance Km',
        'Pending Balance',
        'Pending Udhaar',
        'Total Orders',
        'Total Sales',
        'Tags',
      ],
      rows: scopedCustomers.map((c) => [
        cell(c.id),
        cell(c.shopName),
        cell(c.ownerName),
        cell(c.phone),
        cell(c.villageOrTown || c.city),
        cell(c.distanceKm),
        cell(c.pendingBalance),
        cell(c.pendingUdhaar),
        cell(c.totalOrders),
        cell(c.totalSales),
        cell(c.tags),
      ]),
    },
    {
      tableName: 'Suppliers',
      label: 'Supplier IDs',
      description: 'All registered Supplier partner IDs & payables',
      headers: ['Supplier ID', 'Name', 'Brand Auth', 'Phone', 'City', 'Payment Terms', 'Due Amount', 'Rating'],
      rows: scopedSuppliers.map((s) => [
        cell(s.id),
        cell(s.name),
        cell(s.brandAuth),
        cell(s.phone),
        cell(s.city || ''),
        cell(s.paymentTerms),
        cell(s.dueAmount ?? s.pendingDues ?? 0),
        cell(s.rating),
      ]),
    },
    {
      tableName: 'Retailer_Orders',
      label: 'Retailer Orders',
      description: 'All wholesale retailer orders & delivery statuses',
      headers: [
        'Order ID',
        'Order #',
        'Retailer ID',
        'Shop Name',
        'Phone',
        'Subtotal',
        'Delivery',
        'Total Amount',
        'Advance Paid',
        'Balance Due',
        'Status',
        'Created Date',
      ],
      rows: scopedOrders.map((o) => [
        cell(o.id),
        cell(o.orderNumber),
        cell(o.customerId),
        cell(o.shopName),
        cell(o.phone),
        cell(o.subtotal),
        cell(o.deliveryCharge),
        cell(o.totalAmount),
        cell(o.advanceAmount),
        cell(o.balanceAmount),
        cell(o.status),
        cell(o.createdAt.split('T')[0]),
      ]),
    },
    {
      tableName: 'Supplier_Orders',
      label: 'Supplier Purchase Orders',
      description: 'All procurement purchase orders & bilty records',
      headers: [
        'PO ID',
        'PO Number',
        'Supplier ID',
        'Supplier Name',
        'Order Date',
        'Total Amount',
        'Advance Paid',
        'Balance Due',
        'Payment Status',
        'Status',
        'Bilty #',
      ],
      rows: scopedPOs.map((po) => [
        cell(po.id),
        cell(po.poNumber),
        cell(po.supplierId),
        cell(po.supplierName),
        cell(po.orderDate),
        cell(po.totalAmount),
        cell(po.advancePaid),
        cell(po.balanceDue),
        cell(po.paymentStatus),
        cell(po.status),
        cell(po.biltyNumber || ''),
      ]),
    },
    {
      tableName: 'Payments',
      label: 'Payments & Khata',
      description: 'All inward Retailer & outward Supplier payment entries',
      headers: ['Payment ID', 'Date', 'Party ID', 'Shop / Supplier', 'Type', 'Mode', 'Amount', 'Reference ID', 'Confirmed'],
      rows: scopedPayments.map((p) => [
        cell(p.id),
        cell(p.date),
        cell(p.customerId),
        cell(p.shopName),
        cell(p.type || 'General'),
        cell(p.mode),
        cell(p.amount),
        cell(p.referenceId),
        cell(p.confirmedByOwner ? 'Confirmed' : 'Pending'),
      ]),
    },
    {
      tableName: 'Udhaar_Ledger',
      label: 'Udhaar Ledger',
      description: '10% tolerance delivery shortage Udhaar entries',
      headers: ['Udhaar ID', 'Date', 'Retailer ID', 'Shop Name', 'Order #', 'Bill Amount', 'Shortage Amount', 'Shortage %', 'Status'],
      rows: scopedUdhaar.map((u) => [
        cell(u.id),
        cell(u.date),
        cell(u.customerId),
        cell(u.shopName),
        cell(u.orderNumber),
        cell(u.billAmount),
        cell(u.shortageAmount),
        cell(u.shortagePct),
        cell(u.status),
      ]),
    },
    {
      tableName: 'Returns_Claims',
      label: 'Returns & Claims',
      description: 'Transit damage & unboxing video return requests',
      headers: ['Return ID', 'Order #', 'Shop Name', 'Estimated Value', 'Status', 'Outcome', 'Description'],
      rows: scopedReturns.map((r) => [
        cell(r.id),
        cell(r.orderNumber),
        cell(r.shopName),
        cell(r.estimatedDamageValue),
        cell(r.status),
        cell(r.outcome || ''),
        cell(r.damageDescription),
      ]),
    },
    {
      tableName: 'Expenses',
      label: 'Business Expenses',
      description: 'Freight, packing, rent, phone & salary expenses',
      headers: ['Expense ID', 'Date', 'Category', 'Amount', 'Paid Via', 'Description'],
      rows: scopedExpenses.map((e) => [
        cell(e.id),
        cell(e.date),
        cell(e.category),
        cell(e.amount),
        cell(e.paidVia),
        cell(e.description),
      ]),
    },
    {
      tableName: 'Supplier_Rates',
      label: 'Supplier Rate Cards',
      description: 'Supplier raw & landed cost quotes per packet',
      headers: ['Rate ID', 'Supplier Name', 'Product Name', 'Pack Size', 'Raw Price', 'Freight', 'Packing', 'Landed Cost', 'Lead Days'],
      rows: scopedRates.map((sp) => [
        cell(sp.id),
        cell(sp.supplierName),
        cell(sp.productName),
        cell(sp.packSize),
        cell(sp.rawPricePerPacket),
        cell(sp.freightPerPacket),
        cell(sp.packingPerPacket),
        cell(sp.landedCostPerPacket),
        cell(sp.deliveryDays),
      ]),
    },
    {
      tableName: 'Chatbot_Enquiries',
      label: 'Enquiries',
      description: 'WhatsApp & catalogue leads',
      headers: ['Enquiry ID', 'Date', 'Shop Name', 'Owner', 'Phone', 'Address', 'Status', 'Products'],
      rows: scopedEnquiries.map((eq) => [
        cell(eq.id),
        cell(eq.date),
        cell(eq.shopName),
        cell(eq.ownerName),
        cell(eq.phone),
        cell(eq.address),
        cell(eq.status),
        cell(eq.productListText),
      ]),
    },
    {
      tableName: 'Customer_Registrations',
      label: 'New Customer Registrations',
      description: 'Retailer Google Form & App registrations with registration date/time, WhatsApp, shop name, owner & address',
      headers: [
        'Registration ID',
        'Date & Time',
        'Shop Name',
        'Owner Name',
        'WhatsApp Number',
        'Address',
        'Email',
        'Source',
        'Status',
        'Approved Retailer ID',
      ],
      rows: (source.customerRegistrations || []).map((reg) => [
        cell(reg.id),
        cell(reg.registeredAtDisplay || reg.registeredAt),
        cell(reg.shopName),
        cell(reg.ownerName),
        cell(reg.whatsapp),
        cell(reg.address),
        cell(reg.email || ''),
        cell(reg.source || 'App Registration'),
        cell(reg.status),
        cell(reg.approvedCustomerId || ''),
      ]),
    },
    {
      tableName: 'Digital_Marketing_Work',
      label: 'Digital Marketing Services & Work',
      description: 'All Retailer & Supplier digital marketing service applications, running jobs & post counts',
      headers: [
        'Work ID',
        'Client ID',
        'Role',
        'Shop / Partner',
        'Owner / Contact',
        'Phone',
        'Service Name',
        'Status',
        'Posts Done',
        'Target Posts',
        'Applied Date',
        'Last Post Date',
        'Price',
      ],
      rows: (source.digitalMarketingWorks || []).map((w) => [
        cell(w.id),
        cell(w.clientId),
        cell(w.clientRole),
        cell(w.clientName),
        cell(w.ownerName),
        cell(w.phone),
        cell(w.serviceName),
        cell(w.status),
        cell(w.postsDone),
        cell(w.targetPosts),
        cell(w.appliedDate),
        cell(w.lastPostDate || ''),
        cell(w.price),
      ]),
    },
  ];

  // Add Master ID-File Registry index table for Owner Master spreadsheet
  if (target.fileKey === 'owner-master') {
    const registryList = Object.values(registry);
    tables.push({
      tableName: 'ID_Files_Index',
      label: 'All ID Sheet Files',
      description: 'Index of separate Google Sheet files linked to each ID',
      headers: ['File Key', 'Target ID', 'Role', 'File Label', 'Spreadsheet ID', 'Sheet URL', 'Tables', 'Rows', 'Last Synced'],
      rows: registryList.map((rec) => [
        cell(rec.fileKey),
        cell(rec.targetId),
        cell(rec.targetRole),
        cell(rec.label),
        cell(rec.spreadsheetId),
        cell(rec.spreadsheetUrl),
        cell(rec.tables.length),
        cell(rec.totalRows),
        cell(rec.lastSyncedAt),
      ]),
    });
  }

  return tables;
}

async function parseGoogleApiError(res: Response): Promise<string> {
  try {
    const json = await res.json();
    if (json?.error?.message) return String(json.error.message);
  } catch {
    // ignore JSON failure
  }
  return `Google Sheets HTTP ${res.status}`;
}

/**
 * Fetches spreadsheet metadata (verifies existence & reads exact sheet tab names without assuming "Sheet1").
 */
export async function fetchSpreadsheetMetadata(
  accessToken: string,
  spreadsheetId: string
): Promise<{
  spreadsheetId: string;
  spreadsheetUrl: string;
  title: string;
  sheetTitles: string[];
}> {
  const url = `${SHEETS_API_BASE}/${encodeURIComponent(spreadsheetId)}?fields=spreadsheetId,spreadsheetUrl,properties.title,sheets(properties(sheetId,title))`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(await parseGoogleApiError(res));
  }
  const data = await res.json();
  const sheetTitles = Array.isArray(data.sheets)
    ? data.sheets.map((s: { properties?: { title?: string } }) => s.properties?.title || '').filter(Boolean)
    : [];
  return {
    spreadsheetId: data.spreadsheetId,
    spreadsheetUrl:
      data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}/edit`,
    title: data.properties?.title || 'Rupam Google Sheet',
    sheetTitles,
  };
}

/**
 * Creates a brand new Google Sheet spreadsheet file for a specific ID with all separate tables initialized.
 */
export async function createSpreadsheetForTarget(
  accessToken: string,
  target: SheetTargetDescriptor,
  tables: SheetTableDataset[]
): Promise<{ spreadsheetId: string; spreadsheetUrl: string; sheetTitles: string[] }> {
  const safeSheets = tables.map((tbl, index) => ({
    properties: {
      title: sanitizeSheetTabName(tbl.tableName),
      index,
      gridProperties: {
        frozenRowCount: 1,
      },
    },
  }));

  const res = await fetch(SHEETS_API_BASE, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title: target.sheetTitle,
      },
      sheets: safeSheets,
    }),
  });

  if (!res.ok) {
    throw new Error(await parseGoogleApiError(res));
  }

  const created = await res.json();
  const sheetTitles = Array.isArray(created.sheets)
    ? created.sheets.map((s: { properties?: { title?: string } }) => s.properties?.title || '').filter(Boolean)
    : safeSheets.map((s) => s.properties.title);

  return {
    spreadsheetId: created.spreadsheetId,
    spreadsheetUrl:
      created.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${created.spreadsheetId}/edit`,
    sheetTitles,
  };
}

/**
 * Creates/verifies the separate Google Sheet file for a specific ID, ensures all separate table tabs exist,
 * clears prior data on those tabs, and writes the fresh headers + rows in one batchUpdate.
 */
export async function syncTargetToGoogleSheet(
  accessToken: string,
  target: SheetTargetDescriptor,
  tables: SheetTableDataset[],
  existingRecord?: SheetFileRecord,
  syncedByEmail?: string
): Promise<SheetFileRecord> {
  let spreadsheetId = existingRecord?.spreadsheetId || '';
  let spreadsheetUrl = existingRecord?.spreadsheetUrl || '';
  let existingTabs: string[] = [];

  if (spreadsheetId) {
    try {
      const meta = await fetchSpreadsheetMetadata(accessToken, spreadsheetId);
      spreadsheetId = meta.spreadsheetId;
      spreadsheetUrl = meta.spreadsheetUrl;
      existingTabs = meta.sheetTitles;
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      // If file was deleted in Drive (404), recreate cleanly; otherwise propagate auth/permission error
      if (msg.includes('404') || msg.toLowerCase().includes('not found')) {
        spreadsheetId = '';
      } else {
        throw err;
      }
    }
  }

  if (!spreadsheetId) {
    const created = await createSpreadsheetForTarget(accessToken, target, tables);
    spreadsheetId = created.spreadsheetId;
    spreadsheetUrl = created.spreadsheetUrl;
    existingTabs = created.sheetTitles;
  }

  // Ensure all required separate table tabs exist
  const existingSet = new Set(existingTabs);
  const missingTables = tables.filter((t) => !existingSet.has(sanitizeSheetTabName(t.tableName)));
  if (missingTables.length > 0) {
    const addRequests = missingTables.map((t) => ({
      addSheet: {
        properties: {
          title: sanitizeSheetTabName(t.tableName),
          gridProperties: { frozenRowCount: 1 },
        },
      },
    }));
    const addRes = await fetch(`${SHEETS_API_BASE}/${encodeURIComponent(spreadsheetId)}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requests: addRequests }),
    });
    if (!addRes.ok) {
      throw new Error(await parseGoogleApiError(addRes));
    }
  }

  // Clear old cell values on each table tab before writing updated rows
  const clearRanges = tables.map((t) => `'${sanitizeSheetTabName(t.tableName)}'!A1:Z2000`);
  const clearRes = await fetch(
    `${SHEETS_API_BASE}/${encodeURIComponent(spreadsheetId)}/values:batchClear`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ranges: clearRanges }),
    }
  );
  if (!clearRes.ok) {
    throw new Error(await parseGoogleApiError(clearRes));
  }

  // Batch write headers + rows for every separate table
  const valueRanges = tables.map((t) => ({
    range: `'${sanitizeSheetTabName(t.tableName)}'!A1`,
    majorDimension: 'ROWS',
    values: [t.headers, ...t.rows],
  }));

  const writeRes = await fetch(
    `${SHEETS_API_BASE}/${encodeURIComponent(spreadsheetId)}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: valueRanges,
      }),
    }
  );

  if (!writeRes.ok) {
    throw new Error(await parseGoogleApiError(writeRes));
  }

  const totalRows = tables.reduce((sum, t) => sum + t.rows.length, 0);

  return {
    fileKey: target.fileKey,
    targetId: target.targetId,
    targetRole: target.targetRole,
    label: target.label,
    spreadsheetId,
    spreadsheetUrl,
    tables: tables.map((t) => sanitizeSheetTabName(t.tableName)),
    totalRows,
    lastSyncedAt: new Date().toISOString(),
    syncedByEmail,
    lastError: null,
  };
}

/**
 * Reads live values from a specific table tab inside a spreadsheet (discovering tab names via metadata first).
 */
export async function fetchSpreadsheetTableValues(
  accessToken: string,
  spreadsheetId: string,
  tableName: string
): Promise<{ sheetTitle: string; rows: string[][] }> {
  const meta = await fetchSpreadsheetMetadata(accessToken, spreadsheetId);
  const safeName = sanitizeSheetTabName(tableName);
  const matchedTitle =
    meta.sheetTitles.find((t) => t.toLowerCase() === safeName.toLowerCase()) ||
    meta.sheetTitles[0];

  if (!matchedTitle) {
    return { sheetTitle: safeName, rows: [] };
  }

  const range = encodeURIComponent(`'${matchedTitle}'!A1:Z500`);
  const res = await fetch(`${SHEETS_API_BASE}/${encodeURIComponent(spreadsheetId)}/values/${range}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(await parseGoogleApiError(res));
  }
  const data = await res.json();
  const rows: string[][] = Array.isArray(data.values)
    ? data.values.map((r: unknown[]) => r.map((c) => (c == null ? '' : String(c))))
    : [];
  return { sheetTitle: matchedTitle, rows };
}
