export type UserRole = 'owner' | 'customer' | 'supplier';

export type Language = 'en' | 'hi' | 'or';

export interface User {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: UserRole;
  customerId?: string; // If customer, links to their customer profile
  supplierId?: string; // If supplier, links to their supplier profile
  businessId?: string; // Active business ID for owner
}

export type OrderStatus =
  | 'Enquiry'
  | 'Advance Pending'
  | 'Booked'
  | 'Packed'
  | 'Dispatched'
  | 'Delivered'
  | 'On Hold'
  | 'Reschedule'
  | 'Cancelled'
  | 'Returned';

export interface OrderItem {
  productId: string;
  productName: string;
  shadeOrSize?: string;
  packSize: 6 | 12;
  packetQty: number; // in packets
  totalPieces: number;
  unitPricePerPacket: number;
  totalPrice: number;
  hsnCode?: string;
  gstRate?: number;
}

export interface TimelineEvent {
  status: OrderStatus;
  timestamp: string;
  note: string;
  by: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  shopName: string;
  phone: string;
  whatsapp?: string;
  address: string;
  landmark: string;
  distanceKm: number;
  items: OrderItem[];
  subtotal: number;
  discountAmount: number;
  discountReason?: string;
  deliveryCharge: number;
  taxAmount: number;
  totalAmount: number;
  advanceAmount: number;
  advancePaid: boolean;
  advanceDate?: string;
  balanceAmount: number;
  status: OrderStatus;
  statusHistory: TimelineEvent[];
  expectedDeliveryDate: string;
  dispatchDate?: string;
  deliveredDate?: string;
  trackingNumber?: string;
  busOrVehicleNumber?: string;
  driverPhone?: string;
  balanceReadyConfirmed?: boolean;
  notes?: string;
  createdAt: string;
  hasUnboxingVideoReminderSent?: boolean;
  businessId?: string;
}

export interface Customer {
  id: string;
  businessId?: string;
  shopName: string;
  ownerName: string;
  phone: string;
  whatsapp: string;
  email?: string;
  address: string;
  landmark: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  distanceKm: number;
  gstNumber?: string;
  upiId?: string;
  category: string;
  notes?: string;
  tags: 'New' | 'Regular' | 'Risky';
  pendingBalance: number;
  pendingUdhaar: number;
  totalOrders: number;
  totalSales: number;
  lastOrderDate: string;
  // Hub fields
  shopType?: 'Cosmetic Shop' | 'General/Variety Store' | 'Beauty Parlour' | 'Kirana/Gift Shop' | 'Others';
  status?: 'New' | 'Active' | 'Regular' | 'Inactive' | 'Risky';
  paymentStatus?: 'All Clear' | 'Advance Pending' | 'Balance Due' | 'Udhaar Pending';
  villageOrTown?: string;
  stepProgress?: number; // 1 to 7
  checklist?: {
    minOrderAgreed?: boolean;
    fullPacketsOnly?: boolean;
    fullPacketAgreed?: boolean;
    advanceAgreed?: boolean;
    advancePolicyAgreed?: boolean;
    udhaarRuleAgreed?: boolean;
    unboxingVideoAgreed?: boolean;
    preferredLanguage?: 'English' | 'Hindi' | 'Odia' | string;
    deliveryNotes?: string;
  };
  shopPhotoUrl?: string;
  ownerNotes?: string;
  isBlocked?: boolean;
  blockReason?: string;
  freeSamplePosterStatus?: 'Offered' | 'Delivered' | 'Converted' | 'None';
  callLogs?: { id: string; date: string; type: string; summary?: string; note?: string; staffName?: string }[];
  documents?: { id: string; title: string; type: 'Invoice' | 'Statement' | 'GST' | 'Shop Photo'; date: string; url?: string }[];
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  brand: string;
  category: string;
  shadeOrSize: string;
  packSize: 6 | 12; // Pack size 6 or 12 pcs
  packetStock: number; // in packets
  piecesStock: number; // packetStock * packSize
  purchaseCost: number; // Landed cost per packet
  sellingPrice: number; // Selling price per packet
  marginPercent: number;
  reorderLevel: number; // in packets
  isLowStock: boolean;
  expiryDate: string;
  batchNumber: string;
  hsnCode: string;
  gstRate: number;
  imageUrl: string;
  reservedPackets: number; // packets booked in active orders
  supplierId?: string;
  supplierName?: string;
  businessId?: string;
  warehouseZone?: string;
  shelfCode?: string;
  lastRestockedAt?: string;
}

export interface Payment {
  id: string;
  orderId?: string;
  orderNumber?: string;
  customerId: string;
  customerName: string;
  shopName: string;
  amount: number;
  mode: 'UPI' | 'Cash' | 'Bank' | 'Bus-cash';
  referenceId: string;
  screenshotUrl?: string;
  confirmedByOwner: boolean;
  date: string;
  note?: string;
  type?: 'Advance' | 'Balance' | 'Udhaar' | 'General' | 'Supplier Due';
}

export interface UdhaarRecord {
  id: string;
  customerId: string;
  customerName: string;
  shopName: string;
  phone: string;
  orderId: string;
  orderNumber: string;
  shortageAmount: number;
  billAmount: number;
  shortagePct: number;
  date: string;
  status: 'Pending' | 'Cleared';
  clearedDate?: string;
  notes?: string;
}

export interface ReturnRequest {
  id: string;
  orderId: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  shopName: string;
  phone: string;
  videoUrl: string; // Mandatory continuous unboxing video link
  damagePhotos: string[];
  damageDescription: string;
  itemsSummary: string;
  estimatedDamageValue: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  outcome?: 'Replacement' | 'Credit note' | 'Rejected';
  ownerNote?: string;
  createdAt: string;
}

export interface Supplier {
  id: string;
  businessId?: string;
  name: string;
  brandAuth: string;
  gstin?: string;
  gstNumber?: string;
  phone: string;
  address: string;
  paymentTerms: string;
  rating: number;
  dueAmount: number;
  // Hub fields
  type?: 'Manufacturer' | 'Authorised Distributor' | 'Super Distributor' | 'Wholesaler' | 'Local Mandi/Dealer' | 'Local Wholesaler' | 'Packaging Vendor' | 'Others';
  categories?: string[];
  brands?: string[];
  status?: 'Active' | 'On Trial' | 'Trial/New' | 'Backup' | 'Blocked';
  paymentStatus?: 'Dues Pending' | 'Advance Given' | 'All Clear' | 'Due' | 'Overdue' | 'Clear';
  city?: string;
  state?: string;
  contactPerson?: string;
  whatsapp?: string;
  stepProgress?: number; // 1 to 7
  totalPurchases?: number;
  pendingDues?: number;
  creditDays?: number;
  leadTimeDays?: number;
  terms?: any;
  bankDetails?: any;
  upiId?: string;
  authorisationDocs?: { id: string; title: string; date: string }[];
  qualityRating?: number;
  deliveryOnTimeRate?: number;
  damageRate?: number;
  lastPurchaseDate?: string;
  ownerNotes?: string;
  callLogs?: { id: string; date: string; type: string; summary?: string; note?: string }[];
}

export interface SupplierPurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  orderDate: string;
  expectedDate: string;
  items: {
    productId: string;
    productName: string;
    sku: string;
    packets: number;
    packSize: number;
    purchaseCostPerPacket: number;
    totalAmount: number;
  }[];
  totalAmount: number;
  advancePaid: number;
  balanceDue: number;
  paymentStatus: 'Advance Paid' | 'Payment Due' | 'Settled' | 'Partial';
  status: 'Draft' | 'Confirmed' | 'Dispatched' | 'In Transit' | 'Received at Hub' | 'Inspected' | 'Settled';
  transportCompany?: string;
  biltyNumber?: string;
  dispatchedDate?: string;
  receivedDate?: string;
  ownerNotes?: string;
}

export interface SupplierPrice {
  id: string;
  supplierId: string;
  supplierName: string;
  productId: string;
  productName: string;
  packSize: 6 | 12;
  rawPrice?: number;
  rawPricePerPacket: number;
  freightPerPiece?: number;
  freightPerPacket: number;
  packingPerPiece?: number;
  packingPerPacket: number;
  damageAllowancePerPiece?: number;
  damageAllowancePerPacket: number;
  otherPerPacket: number;
  landedCostPerPacket: number;
  landedCost?: number;
  deliveryDays: number;
  leadTimeDays?: number;
  moq?: number;
  damagePercent: number;
  validTill: string;
}

export interface HubActivityLog {
  id: string;
  timestamp: string;
  targetType?: 'Customer' | 'Supplier';
  targetId?: string;
  targetName?: string;
  action: string;
  performedBy?: string;
  actor?: string;
  role?: string;
  entityType?: string;
  entityId?: string;
  entityName?: string;
  details?: string;
  reason?: string;
}

export interface Purchase {
  id: string;
  purchaseNumber: string;
  supplierId: string;
  supplierName: string;
  date: string;
  totalAmount: number;
  totalFreight: number;
  totalPacking: number;
  totalLandedCost: number;
  itemsCount: number;
  status: 'Draft' | 'Received' | 'Paid';
}

export interface Expense {
  id: string;
  category: 'Freight' | 'Delivery' | 'Packing' | 'Marketing' | 'Phone/Internet' | 'Salary' | 'Rent' | 'Others';
  amount: number;
  date: string;
  description: string;
  paidVia: string;
}

export interface MarketingClient {
  id: string;
  shopName: string;
  ownerName: string;
  phone: string;
  packageType: 'One-time setup' | 'Basic monthly' | 'Standard monthly';
  price: number;
  startDate: string;
  renewalDate: string;
  status: 'Active' | 'Pending Renewal' | 'Paused';
  freeSamplePosterStatus: 'Offered' | 'Delivered' | 'Converted';
}

export interface Deliverable {
  id: string;
  clientId: string;
  clientShopName: string;
  title: string;
  type: 'Poster' | 'Caption' | 'Scheduled Post' | 'Catalogue Item';
  dueDate: string;
  status: 'Draft' | 'Approved' | 'Published';
  previewUrl?: string;
}

export interface ChatbotEnquiry {
  id: string;
  shopName: string;
  ownerName: string;
  phone: string;
  address: string;
  landmark: string;
  distanceKm?: number;
  productListText: string;
  status: 'New' | 'Called' | 'Converted' | 'Lost';
  date: string;
  notes?: string;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  actor: string;
  role: string;
  action: string;
  details: string;
  reason?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: 'order' | 'stock' | 'payment' | 'dispatch' | 'udhaar';
  priority?: 'high' | 'normal';
  read: boolean;
  linkTab?: string;
}

export interface BusinessSettings {
  minOrderValue: number;
  advanceBookingAmount: number;
  freeDeliveryRadiusKm: number;
  deliveryChargePerKmOverRadius: number;
  maxUdhaarShortagePercent: number;
  minMarginPercent: number;
  gstEnabled: boolean;
  businessGstin: string;
  upiId: string;
  upiQrUrl: string;
  ownerName: string;
  ownerPhone: string;
  businessName: string;
  businessState: string;
  businessAddress: string;
  businessCoordinates: { lat: number; lng: number };
  googleFormEnquiryUrl: string;
  googleFormFeedbackUrl: string;
  monthlySalesTarget: number;
}

export interface BusinessProfile {
  id: string; // e.g. 'BIZ-NP-001'
  companyName: string;
  ownerName: string;
  category: string;
  tagline?: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  address: string;
  city: string;
  state: string;
  pincode?: string;
  gstNumber?: string;
  upiId: string;
  minOrderValue?: number;
  freeDeliveryRadiusKm?: number;
  productIds?: string[];
  customerIds?: string[];
  supplierIds?: string[];
  createdAt: string;
  isDefault?: boolean;
}

export interface CustomerRegistration {
  id: string;
  registeredAt: string;
  registeredAtDisplay: string;
  shopName: string;
  ownerName: string;
  whatsapp: string;
  address: string;
  city?: string;
  email?: string;
  source: 'App Registration' | 'Google Form';
  status: 'Pending' | 'Approved' | 'Rejected';
  approvedCustomerId?: string;
  syncedToSheet?: boolean;
  lastSyncedAt?: string;
  notes?: string;
}

export interface DigitalMarketingServiceInfo {
  id: string;
  name: string;
  category: 'WhatsApp' | 'Poster' | 'Reels & Ads' | 'Landing & SEO' | 'Full Package';
  price: number;
  billingCycle: 'Per Post' | 'One-Time' | 'Monthly';
  defaultTargetPosts: number;
  description: string;
}

export interface DigitalMarketingWork {
  id: string;
  clientId: string;
  clientRole: 'customer' | 'supplier';
  clientName: string;
  ownerName: string;
  phone: string;
  serviceId: string;
  serviceName: string;
  status: 'Applied' | 'Running' | 'Completed' | 'Paused';
  postsDone: number;
  targetPosts: number;
  appliedDate: string;
  lastPostDate?: string;
  notes?: string;
  price: number;
}

export interface DemandForecastItem {
  productId: string;
  predicted30DayPackets: number;
  daysOfCover: number;
  urgency: 'Critical' | 'High' | 'Medium' | 'Healthy';
  recommendedReorderPackets: number;
  suggestedAction: string;
  reason: string;
}

export interface DemandForecastReport {
  model: string;
  generatedAt: string;
  summary: string;
  criticalCount: number;
  totalRecommendedPackets: number;
  estimatedReorderBudget: number;
  items: DemandForecastItem[];
}

export interface WhatsAppAlertLog {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  supplierId: string;
  supplierName: string;
  phone: string;
  currentPackets: number;
  reorderLevel: number;
  suggestedReorderPackets: number;
  triggerType: 'Auto-Trigger' | 'Manual' | 'Batch' | 'Forecast-Reorder';
  status: 'Sent (WA API)' | 'Queued (WA Link)' | 'Failed';
  provider: string;
  messageId?: string;
  message: string;
  fallbackUrl: string;
  error?: string;
  createdAt: string;
}

