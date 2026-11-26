import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import {
  BusinessProfile,
  BusinessSettings,
  Customer,
  Expense,
  Order,
  Payment,
  Product,
  ReturnRequest,
  Supplier,
  SupplierPurchaseOrder,
  UdhaarRecord,
  UserRole,
  WhatsAppAlertLog,
} from '../types';

export interface WorkspaceSnapshotPayload {
  role: UserRole;
  activeBusinessId: string;
  settings: BusinessSettings;
  businesses: BusinessProfile[];
  customers: Customer[];
  suppliers: Supplier[];
  products: Product[];
  orders: Order[];
  payments: Payment[];
  udhaar: UdhaarRecord[];
  supplierOrders: SupplierPurchaseOrder[];
  returns: ReturnRequest[];
  expenses: Expense[];
}

export interface SyncResult {
  syncedCount: number;
  collectionsSynced: string[];
  timestamp: string;
}

const VALID_ID_RE = /^[a-zA-Z0-9_-]+$/;

function sanitizeId(raw: string | undefined, fallbackPrefix: string): string {
  const cleaned = (raw || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .slice(0, 128);
  if (cleaned && VALID_ID_RE.test(cleaned)) {
    return cleaned;
  }
  return `${fallbackPrefix}-${Date.now()}`;
}

function clampStr(val: string | undefined, maxLen: number, fallback = ''): string {
  const s = typeof val === 'string' ? val.trim() : fallback;
  return s.slice(0, maxLen);
}

function nonEmptyStr(val: string | undefined, maxLen: number, fallback: string): string {
  const s = clampStr(val, maxLen, fallback);
  return s.length > 0 ? s : fallback.slice(0, maxLen);
}

function nonNegNum(val: unknown, fallback = 0): number {
  const n = Number(val);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

const VALID_ORDER_STATUSES = new Set([
  'Enquiry',
  'Advance Pending',
  'Booked',
  'Packed',
  'Dispatched',
  'Delivered',
  'On Hold',
  'Reschedule',
  'Cancelled',
  'Returned',
]);

const VALID_PAYMENT_MODES = new Set(['UPI', 'Cash', 'Bank', 'Bus-cash']);
const VALID_PO_PAYMENT_STATUSES = new Set(['Advance Paid', 'Payment Due', 'Settled', 'Partial']);
const VALID_PO_STATUSES = new Set([
  'Draft',
  'Confirmed',
  'Dispatched',
  'In Transit',
  'Received at Hub',
  'Inspected',
  'Settled',
]);

async function getExistingDocsMap(
  collectionName: string,
  uid: string
): Promise<Map<string, Record<string, unknown>>> {
  try {
    const q = query(collection(db, collectionName), where('ownerUid', '==', uid));
    const snap = await getDocs(q);
    const map = new Map<string, Record<string, unknown>>();
    snap.forEach((d) => {
      map.set(d.id, d.data());
    });
    return map;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, collectionName);
  }
}

async function getExistingUsersMap(uid: string): Promise<Map<string, Record<string, unknown>>> {
  try {
    const q = query(collection(db, 'users'), where('uid', '==', uid));
    const snap = await getDocs(q);
    const map = new Map<string, Record<string, unknown>>();
    snap.forEach((d) => {
      map.set(d.id, d.data());
    });
    return map;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'users');
  }
}

interface PendingOp {
  collectionName: string;
  docId: string;
  type: 'create' | 'update';
  data: Record<string, unknown>;
}

async function commitOpsInChunks(ops: PendingOp[]): Promise<void> {
  const CHUNK_SIZE = 350;
  for (let i = 0; i < ops.length; i += CHUNK_SIZE) {
    const chunk = ops.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);
    for (const op of chunk) {
      const ref = doc(db, op.collectionName, op.docId);
      if (op.type === 'create') {
        batch.set(ref, {
          ...op.data,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        batch.update(ref, {
          ...op.data,
          updatedAt: serverTimestamp(),
        });
      }
    }
    try {
      await batch.commit();
    } catch (err) {
      const targetPath = chunk.map((c) => `${c.collectionName}/${c.docId}`).slice(0, 3).join(', ');
      handleFirestoreError(err, OperationType.WRITE, targetPath);
    }
  }
}

/**
 * Auto-setup & Full Sync of Rupam Business Manager state into Cloud Firestore
 * strictly adhering to firebase-blueprint.json & Eight-Pillar firestore.rules.
 */
export async function syncWorkspaceToFirestore(
  payload: WorkspaceSnapshotPayload
): Promise<SyncResult> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Please sign in with Google first to sync with Cloud Firestore.');
  }

  const uid = sanitizeId(currentUser.uid, 'user');
  const activeBizId = sanitizeId(payload.activeBusinessId, 'BIZ-NP-001');

  const [
    existingUsers,
    existingSettings,
    existingBusinesses,
    existingCustomers,
    existingSuppliers,
    existingProducts,
    existingOrders,
    existingPayments,
    existingUdhaar,
    existingSupplierOrders,
    existingReturns,
    existingExpenses,
  ] = await Promise.all([
    getExistingUsersMap(uid),
    getExistingDocsMap('settings', uid),
    getExistingDocsMap('businesses', uid),
    getExistingDocsMap('customers', uid),
    getExistingDocsMap('suppliers', uid),
    getExistingDocsMap('products', uid),
    getExistingDocsMap('orders', uid),
    getExistingDocsMap('payments', uid),
    getExistingDocsMap('udhaar', uid),
    getExistingDocsMap('supplierOrders', uid),
    getExistingDocsMap('returns', uid),
    getExistingDocsMap('expenses', uid),
  ]);

  const ops: PendingOp[] = [];
  const collectionsSynced = new Set<string>();

  // 1. User Account
  const userDocExists = existingUsers.has(uid);
  const safeRole =
    payload.role === 'customer' || payload.role === 'supplier' ? payload.role : 'owner';
  if (userDocExists) {
    ops.push({
      collectionName: 'users',
      docId: uid,
      type: 'update',
      data: {
        displayName: nonEmptyStr(currentUser.displayName || payload.settings.ownerName, 120, 'Rupam Owner'),
        role: safeRole,
        activeBusinessId: activeBizId,
      },
    });
  } else {
    ops.push({
      collectionName: 'users',
      docId: uid,
      type: 'create',
      data: {
        uid,
        email: clampStr(currentUser.email || '', 200),
        displayName: nonEmptyStr(currentUser.displayName || payload.settings.ownerName, 120, 'Rupam Owner'),
        role: safeRole,
        activeBusinessId: activeBizId,
      },
    });
  }
  collectionsSynced.add('users');

  // 2. Settings
  const settingsDocId = sanitizeId(`settings-${uid}`, 'settings');
  const settingsUpdateFields = {
    businessName: nonEmptyStr(payload.settings.businessName, 160, 'Rupam'),
    ownerName: nonEmptyStr(payload.settings.ownerName, 120, 'Shuvam Behera'),
    ownerPhone: clampStr(payload.settings.ownerPhone, 30),
    upiId: nonEmptyStr(payload.settings.upiId, 100, 'shuvam.rupam@upi'),
    minOrderValue: nonNegNum(payload.settings.minOrderValue, 1000),
    advanceBookingAmount: nonNegNum(payload.settings.advanceBookingAmount, 1000),
    freeDeliveryRadiusKm: nonNegNum(payload.settings.freeDeliveryRadiusKm, 150),
    deliveryChargePerKmOverRadius: nonNegNum(payload.settings.deliveryChargePerKmOverRadius, 15),
    maxUdhaarShortagePercent: nonNegNum(payload.settings.maxUdhaarShortagePercent, 10),
    minMarginPercent: nonNegNum(payload.settings.minMarginPercent, 15),
  };
  ops.push({
    collectionName: 'settings',
    docId: settingsDocId,
    type: existingSettings.has(settingsDocId) ? 'update' : 'create',
    data: existingSettings.has(settingsDocId)
      ? settingsUpdateFields
      : { id: settingsDocId, ownerUid: uid, ...settingsUpdateFields },
  });
  collectionsSynced.add('settings');

  // 3. Businesses
  for (const b of payload.businesses) {
    const id = sanitizeId(b.id, 'biz');
    const updateFields = {
      companyName: nonEmptyStr(b.companyName, 160, 'Rupam Wholesale'),
      ownerName: nonEmptyStr(b.ownerName, 120, 'Shuvam Behera'),
      category: clampStr(b.category, 100),
      phone: clampStr(b.phone, 30),
      address: clampStr(b.address, 300),
      city: clampStr(b.city, 80),
      state: clampStr(b.state, 80),
      upiId: nonEmptyStr(b.upiId, 100, 'shuvam.rupam@upi'),
      minOrderValue: nonNegNum(b.minOrderValue, 1000),
      freeDeliveryRadiusKm: nonNegNum(b.freeDeliveryRadiusKm, 150),
    };
    ops.push({
      collectionName: 'businesses',
      docId: id,
      type: existingBusinesses.has(id) ? 'update' : 'create',
      data: existingBusinesses.has(id) ? updateFields : { id, ownerUid: uid, ...updateFields },
    });
  }
  collectionsSynced.add('businesses');

  // 4. Customers
  for (const c of payload.customers) {
    const id = sanitizeId(c.id, 'cust');
    const bizId = sanitizeId(c.businessId, activeBizId);
    const updateFields = {
      shopName: nonEmptyStr(c.shopName, 160, 'Retailer Shop'),
      ownerName: nonEmptyStr(c.ownerName, 120, 'Shopkeeper'),
      phone: clampStr(c.phone, 30),
      address: clampStr(c.address, 300),
      city: clampStr(c.city, 80),
      state: clampStr(c.state, 80),
      distanceKm: nonNegNum(c.distanceKm, 0),
      category: clampStr(c.category, 80),
      pendingBalance: nonNegNum(c.pendingBalance, 0),
      pendingUdhaar: nonNegNum(c.pendingUdhaar, 0),
      totalOrders: nonNegNum(c.totalOrders, 0),
      totalSales: nonNegNum(c.totalSales, 0),
      lastOrderDate: clampStr(c.lastOrderDate, 40),
    };
    ops.push({
      collectionName: 'customers',
      docId: id,
      type: existingCustomers.has(id) ? 'update' : 'create',
      data: existingCustomers.has(id)
        ? updateFields
        : { id, ownerUid: uid, businessId: bizId, ...updateFields },
    });
  }
  collectionsSynced.add('customers');

  // 5. Suppliers
  for (const s of payload.suppliers) {
    const id = sanitizeId(s.id, 'sup');
    const bizId = sanitizeId(s.businessId, activeBizId);
    const ratingVal = Math.min(5, Math.max(0, Number(s.rating) || 4.5));
    const updateFields = {
      name: nonEmptyStr(s.name, 160, 'Wholesale Supplier'),
      brandAuth: clampStr(s.brandAuth, 160),
      phone: clampStr(s.phone, 30),
      address: clampStr(s.address, 300),
      paymentTerms: clampStr(s.paymentTerms, 120),
      rating: ratingVal,
      dueAmount: nonNegNum(s.dueAmount ?? s.pendingDues, 0),
      upiId: clampStr(s.upiId, 100),
    };
    ops.push({
      collectionName: 'suppliers',
      docId: id,
      type: existingSuppliers.has(id) ? 'update' : 'create',
      data: existingSuppliers.has(id)
        ? updateFields
        : { id, ownerUid: uid, businessId: bizId, ...updateFields },
    });
  }
  collectionsSynced.add('suppliers');

  // 6. Products
  for (const p of payload.products) {
    const id = sanitizeId(p.id, 'prod');
    const bizId = sanitizeId(p.businessId, activeBizId);
    const packSize = p.packSize === 6 ? 6 : 12;
    const updateFields = {
      name: nonEmptyStr(p.name, 180, 'Cosmetic Product'),
      sku: clampStr(p.sku, 80),
      brand: clampStr(p.brand, 100),
      category: clampStr(p.category, 100),
      packSize,
      packetStock: nonNegNum(p.packetStock, 0),
      piecesStock: nonNegNum(p.piecesStock, 0),
      purchaseCost: nonNegNum(p.purchaseCost, 0),
      sellingPrice: nonNegNum(p.sellingPrice, 0),
      marginPercent: Number.isFinite(Number(p.marginPercent)) ? Number(p.marginPercent) : 0,
      reorderLevel: nonNegNum(p.reorderLevel, 5),
      isLowStock: Boolean(p.isLowStock),
      supplierId: clampStr(p.supplierId, 128),
      warehouseZone: clampStr(p.warehouseZone, 80),
      shelfCode: clampStr(p.shelfCode, 40),
    };
    ops.push({
      collectionName: 'products',
      docId: id,
      type: existingProducts.has(id) ? 'update' : 'create',
      data: existingProducts.has(id)
        ? updateFields
        : { id, ownerUid: uid, businessId: bizId, ...updateFields },
    });
  }
  collectionsSynced.add('products');

  // 7. Orders
  for (const o of payload.orders) {
    const id = sanitizeId(o.id, 'ord');
    const bizId = sanitizeId(o.businessId, activeBizId);
    const status = VALID_ORDER_STATUSES.has(o.status) ? o.status : 'Booked';
    const existing = existingOrders.get(id);
    if (existing) {
      const prevStatus = String(existing.status || '');
      if (prevStatus === 'Cancelled' || prevStatus === 'Returned') {
        continue;
      }
      ops.push({
        collectionName: 'orders',
        docId: id,
        type: 'update',
        data: {
          totalAmount: nonNegNum(o.totalAmount, 0),
          advanceAmount: nonNegNum(o.advanceAmount, 0),
          advancePaid: Boolean(o.advancePaid),
          balanceAmount: nonNegNum(o.balanceAmount, 0),
          status,
        },
      });
    } else {
      ops.push({
        collectionName: 'orders',
        docId: id,
        type: 'create',
        data: {
          id,
          ownerUid: uid,
          businessId: bizId,
          orderNumber: nonEmptyStr(o.orderNumber, 80, id),
          customerId: clampStr(o.customerId, 128),
          customerName: clampStr(o.customerName, 120),
          shopName: nonEmptyStr(o.shopName, 160, 'Retailer Shop'),
          phone: clampStr(o.phone, 30),
          totalAmount: nonNegNum(o.totalAmount, 0),
          advanceAmount: nonNegNum(o.advanceAmount, 0),
          advancePaid: Boolean(o.advancePaid),
          balanceAmount: nonNegNum(o.balanceAmount, 0),
          status,
        },
      });
    }
  }
  collectionsSynced.add('orders');

  // 8. Payments
  for (const pay of payload.payments) {
    const amt = Number(pay.amount);
    if (!Number.isFinite(amt) || amt <= 0) continue;
    const id = sanitizeId(pay.id, 'pay');
    const mode = VALID_PAYMENT_MODES.has(pay.mode) ? pay.mode : 'UPI';
    if (existingPayments.has(id)) {
      ops.push({
        collectionName: 'payments',
        docId: id,
        type: 'update',
        data: {
          confirmedByOwner: Boolean(pay.confirmedByOwner),
          note: clampStr(pay.note, 400),
        },
      });
    } else {
      ops.push({
        collectionName: 'payments',
        docId: id,
        type: 'create',
        data: {
          id,
          ownerUid: uid,
          businessId: activeBizId,
          customerId: clampStr(pay.customerId, 128),
          customerName: clampStr(pay.customerName, 120),
          shopName: clampStr(pay.shopName, 160),
          amount: amt,
          mode,
          referenceId: nonEmptyStr(pay.referenceId, 120, `REF-${id}`),
          confirmedByOwner: Boolean(pay.confirmedByOwner),
          type: clampStr(pay.type || 'General', 40),
          note: clampStr(pay.note, 400),
          date: nonEmptyStr(pay.date, 50, new Date().toISOString().split('T')[0]),
        },
      });
    }
  }
  collectionsSynced.add('payments');

  // 9. Udhaar
  for (const u of payload.udhaar) {
    const id = sanitizeId(u.id, 'udh');
    const status = u.status === 'Cleared' ? 'Cleared' : 'Pending';
    const existing = existingUdhaar.get(id);
    if (existing) {
      if (existing.status === 'Cleared') continue;
      ops.push({
        collectionName: 'udhaar',
        docId: id,
        type: 'update',
        data: { status },
      });
    } else {
      ops.push({
        collectionName: 'udhaar',
        docId: id,
        type: 'create',
        data: {
          id,
          ownerUid: uid,
          businessId: activeBizId,
          customerId: clampStr(u.customerId, 128),
          shopName: nonEmptyStr(u.shopName, 160, 'Retailer Shop'),
          phone: clampStr(u.phone, 30),
          orderId: clampStr(u.orderId, 128),
          orderNumber: clampStr(u.orderNumber, 80),
          shortageAmount: nonNegNum(u.shortageAmount, 0),
          billAmount: nonNegNum(u.billAmount, 0),
          shortagePct: nonNegNum(u.shortagePct, 0),
          status,
          date: nonEmptyStr(u.date, 50, new Date().toISOString().split('T')[0]),
        },
      });
    }
  }
  collectionsSynced.add('udhaar');

  // 10. Supplier Purchase Orders
  for (const po of payload.supplierOrders) {
    const id = sanitizeId(po.id, 'spo');
    const paymentStatus = VALID_PO_PAYMENT_STATUSES.has(po.paymentStatus)
      ? po.paymentStatus
      : 'Payment Due';
    const status = VALID_PO_STATUSES.has(po.status) ? po.status : 'Confirmed';
    const existing = existingSupplierOrders.get(id);
    if (existing) {
      if (existing.status === 'Settled') continue;
      ops.push({
        collectionName: 'supplierOrders',
        docId: id,
        type: 'update',
        data: {
          advancePaid: nonNegNum(po.advancePaid, 0),
          balanceDue: nonNegNum(po.balanceDue, 0),
          paymentStatus,
          status,
        },
      });
    } else {
      ops.push({
        collectionName: 'supplierOrders',
        docId: id,
        type: 'create',
        data: {
          id,
          ownerUid: uid,
          businessId: activeBizId,
          poNumber: nonEmptyStr(po.poNumber, 80, id),
          supplierId: clampStr(po.supplierId, 128),
          supplierName: nonEmptyStr(po.supplierName, 160, 'Supplier'),
          totalAmount: nonNegNum(po.totalAmount, 0),
          advancePaid: nonNegNum(po.advancePaid, 0),
          balanceDue: nonNegNum(po.balanceDue, 0),
          paymentStatus,
          status,
          orderDate: clampStr(po.orderDate, 50),
        },
      });
    }
  }
  collectionsSynced.add('supplierOrders');

  // 11. Returns
  for (const r of payload.returns) {
    const id = sanitizeId(r.id, 'ret');
    const status =
      r.status === 'APPROVED' || r.status === 'REJECTED' ? r.status : 'PENDING';
    const existing = existingReturns.get(id);
    if (existing) {
      if (existing.status !== 'PENDING') continue;
      ops.push({
        collectionName: 'returns',
        docId: id,
        type: 'update',
        data: { status },
      });
    } else {
      ops.push({
        collectionName: 'returns',
        docId: id,
        type: 'create',
        data: {
          id,
          ownerUid: uid,
          businessId: activeBizId,
          orderId: clampStr(r.orderId, 128),
          orderNumber: clampStr(r.orderNumber, 80),
          customerId: clampStr(r.customerId, 128),
          shopName: clampStr(r.shopName, 160),
          videoUrl: nonEmptyStr(r.videoUrl, 500, 'https://rupam.local/unboxing-video'),
          damageDescription: clampStr(r.damageDescription, 500),
          status,
        },
      });
    }
  }
  collectionsSynced.add('returns');

  // 12. Expenses
  for (const ex of payload.expenses) {
    const id = sanitizeId(ex.id, 'exp');
    const updateFields = {
      category: nonEmptyStr(ex.category, 60, 'Others'),
      amount: nonNegNum(ex.amount, 0),
      date: nonEmptyStr(ex.date, 50, new Date().toISOString().split('T')[0]),
      description: clampStr(ex.description, 400),
      paidVia: clampStr(ex.paidVia, 60),
    };
    ops.push({
      collectionName: 'expenses',
      docId: id,
      type: existingExpenses.has(id) ? 'update' : 'create',
      data: existingExpenses.has(id)
        ? updateFields
        : { id, ownerUid: uid, businessId: activeBizId, ...updateFields },
    });
  }
  collectionsSynced.add('expenses');

  await commitOpsInChunks(ops);

  return {
    syncedCount: ops.length,
    collectionsSynced: Array.from(collectionsSynced),
    timestamp: new Date().toISOString(),
  };
}

export interface LoadedWorkspacePayload {
  recordCount: number;
  settings: Partial<BusinessSettings> | null;
  businesses: Partial<BusinessProfile>[];
  customers: Partial<Customer>[];
  suppliers: Partial<Supplier>[];
  products: Partial<Product>[];
  orders: Partial<Order>[];
  payments: Partial<Payment>[];
  udhaar: Partial<UdhaarRecord>[];
  supplierOrders: Partial<SupplierPurchaseOrder>[];
  returns: Partial<ReturnRequest>[];
  expenses: Partial<Expense>[];
}

/**
 * Loads all user-scoped collections from Cloud Firestore using handleFirestoreError tracking.
 */
export async function loadWorkspaceFromFirestore(): Promise<LoadedWorkspacePayload> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Please sign in with Google first to load data from Cloud Firestore.');
  }

  const uid = sanitizeId(currentUser.uid, 'user');

  const [
    settingsMap,
    businessesMap,
    customersMap,
    suppliersMap,
    productsMap,
    ordersMap,
    paymentsMap,
    udhaarMap,
    supplierOrdersMap,
    returnsMap,
    expensesMap,
  ] = await Promise.all([
    getExistingDocsMap('settings', uid),
    getExistingDocsMap('businesses', uid),
    getExistingDocsMap('customers', uid),
    getExistingDocsMap('suppliers', uid),
    getExistingDocsMap('products', uid),
    getExistingDocsMap('orders', uid),
    getExistingDocsMap('payments', uid),
    getExistingDocsMap('udhaar', uid),
    getExistingDocsMap('supplierOrders', uid),
    getExistingDocsMap('returns', uid),
    getExistingDocsMap('expenses', uid),
  ]);

  const settingsFirst = Array.from(settingsMap.values())[0] as Partial<BusinessSettings> | undefined;
  const businesses = Array.from(businessesMap.values()) as Partial<BusinessProfile>[];
  const customers = Array.from(customersMap.values()) as Partial<Customer>[];
  const suppliers = Array.from(suppliersMap.values()) as Partial<Supplier>[];
  const products = Array.from(productsMap.values()) as Partial<Product>[];
  const orders = Array.from(ordersMap.values()) as Partial<Order>[];
  const payments = Array.from(paymentsMap.values()) as Partial<Payment>[];
  const udhaar = Array.from(udhaarMap.values()) as Partial<UdhaarRecord>[];
  const supplierOrders = Array.from(supplierOrdersMap.values()) as Partial<SupplierPurchaseOrder>[];
  const returns = Array.from(returnsMap.values()) as Partial<ReturnRequest>[];
  const expenses = Array.from(expensesMap.values()) as Partial<Expense>[];

  const recordCount =
    (settingsFirst ? 1 : 0) +
    businesses.length +
    customers.length +
    suppliers.length +
    products.length +
    orders.length +
    payments.length +
    udhaar.length +
    supplierOrders.length +
    returns.length +
    expenses.length;

  return {
    recordCount,
    settings: settingsFirst || null,
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
  };
}

/**
 * Deletes an old Firestore document ID when an Owner/Retailer/Supplier ID is renamed.
 */
export async function deleteRenamedFirestoreDoc(
  collectionName: 'businesses' | 'customers' | 'suppliers',
  oldId: string
): Promise<void> {
  if (!auth.currentUser || (typeof navigator !== 'undefined' && navigator.onLine === false)) {
    return;
  }
  const cleanOldId = oldId.trim().replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 128);
  if (!cleanOldId || !VALID_ID_RE.test(cleanOldId)) return;
  try {
    await deleteDoc(doc(db, collectionName, cleanOldId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${collectionName}/${cleanOldId}`);
  }
}

/**
 * Real-time Cloud Firestore listener for live inventory stock updates.
 */
export function subscribeToInventoryRealtime(
  uid: string,
  onProductsUpdate: (remoteProducts: Partial<Product>[]) => void
): Unsubscribe {
  const safeUid = sanitizeId(uid, 'user');
  const q = query(collection(db, 'products'), where('ownerUid', '==', safeUid));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: Partial<Product>[] = [];
      snapshot.forEach((d) => {
        list.push(d.data() as Partial<Product>);
      });
      if (list.length > 0) {
        onProductsUpdate(list);
      }
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, 'products');
      } catch {
        // Logged via handleFirestoreError; keep UI resilient in offline/unverified states
      }
    }
  );
}

/**
 * Real-time Cloud Firestore listener for automated WhatsApp dealer restock alerts.
 */
export function subscribeToWhatsAppAlertsRealtime(
  uid: string,
  onAlertsUpdate: (remoteAlerts: WhatsAppAlertLog[]) => void
): Unsubscribe {
  const safeUid = sanitizeId(uid, 'user');
  const q = query(collection(db, 'whatsappAlerts'), where('ownerUid', '==', safeUid));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: WhatsAppAlertLog[] = [];
      snapshot.forEach((d) => {
        const raw = d.data() as Record<string, any>;
        const createdIso =
          raw.createdAt && typeof raw.createdAt.toDate === 'function'
            ? raw.createdAt.toDate().toISOString()
            : typeof raw.createdAt === 'string'
            ? raw.createdAt
            : new Date().toISOString();
        list.push({
          id: String(raw.id || d.id),
          productId: String(raw.productId || ''),
          productName: String(raw.productName || ''),
          sku: String(raw.sku || ''),
          supplierId: String(raw.supplierId || ''),
          supplierName: String(raw.supplierName || ''),
          phone: String(raw.phone || ''),
          currentPackets: Number(raw.currentPackets || 0),
          reorderLevel: Number(raw.reorderLevel || 0),
          suggestedReorderPackets: Number(raw.suggestedReorderPackets || 0),
          triggerType: raw.triggerType || 'Auto-Trigger',
          status: raw.status || 'Queued (WA Link)',
          provider: String(raw.provider || 'whatsapp_web_fallback'),
          messageId: raw.messageId ? String(raw.messageId) : undefined,
          message: String(raw.message || ''),
          fallbackUrl: String(raw.fallbackUrl || ''),
          error: raw.error ? String(raw.error) : undefined,
          createdAt: createdIso,
        });
      });
      list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      onAlertsUpdate(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, 'whatsappAlerts');
      } catch {
        // Logged via handleFirestoreError
      }
    }
  );
}

/**
 * Persists an automated WhatsApp low-stock dealer alert directly into Cloud Firestore.
 */
export async function saveWhatsAppAlertToFirestore(
  alert: WhatsAppAlertLog,
  activeBusinessId: string
): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser || (typeof navigator !== 'undefined' && navigator.onLine === false)) {
    return;
  }
  const uid = sanitizeId(currentUser.uid, 'user');
  const bizId = sanitizeId(activeBusinessId, 'BIZ-NP-001');
  const id = sanitizeId(alert.id, 'wa');

  const docPayload: Record<string, unknown> = {
    id,
    ownerUid: uid,
    businessId: bizId,
    productId: clampStr(alert.productId, 128),
    productName: nonEmptyStr(alert.productName, 180, 'Product'),
    sku: clampStr(alert.sku, 80),
    supplierId: clampStr(alert.supplierId, 128),
    supplierName: nonEmptyStr(alert.supplierName, 160, 'Wholesale Dealer'),
    phone: clampStr(alert.phone, 30),
    currentPackets: nonNegNum(alert.currentPackets, 0),
    reorderLevel: nonNegNum(alert.reorderLevel, 5),
    suggestedReorderPackets: nonNegNum(alert.suggestedReorderPackets, 10),
    triggerType: alert.triggerType,
    status: alert.status,
    provider: nonEmptyStr(alert.provider, 60, 'whatsapp_cloud_api'),
    message: nonEmptyStr(alert.message, 1200, 'Low stock restock alert'),
    fallbackUrl: clampStr(alert.fallbackUrl, 1600),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (alert.messageId) {
    docPayload.messageId = clampStr(alert.messageId, 180);
  }
  if (alert.error) {
    docPayload.error = clampStr(alert.error, 400);
  }

  try {
    await setDoc(doc(db, 'whatsappAlerts', id), docPayload);
  } catch (err) {
    try {
      handleFirestoreError(err, OperationType.CREATE, `whatsappAlerts/${id}`);
    } catch {
      // Logged via handleFirestoreError without breaking UI flow
    }
  }
}


