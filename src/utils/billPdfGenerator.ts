import { jsPDF } from 'jspdf';
import { BusinessSettings, Order, Product } from '../types';

export interface StructuredBillItem {
  srNo: number;
  productId: string;
  category: string;
  modelCode: string;
  packInfo: string;
  hsnCode: string;
  singlePrice: number;
  qty: number;
  totalPieces: number;
  totalPrice: number;
}

export interface CategoryBillGroup {
  category: string;
  items: StructuredBillItem[];
  categoryTotal: number;
  categoryPackets: number;
}

export interface StructuredOrderBill {
  orderNumber: string;
  invoiceDate: string;
  expectedDeliveryDate: string;
  status: string;
  trackingNumber: string;
  shopName: string;
  ownerName: string;
  phone: string;
  address: string;
  landmark: string;
  distanceKm: number;
  categories: string[];
  groups: CategoryBillGroup[];
  items: StructuredBillItem[];
  totalPackets: number;
  totalPieces: number;
  subtotal: number;
  discountAmount: number;
  gstRatePercent: number;
  cgstAmount: number;
  sgstAmount: number;
  gstAmount: number;
  extraCharge: number;
  grandTotal: number;
  advancePaidAmount: number;
  balancePayable: number;
}

function findMatchingProduct(
  products: Product[],
  productId: string,
  productName: string
): Product | undefined {
  const byId = products.find((p) => p.id === productId);
  if (byId) return byId;
  const normalized = productName.trim().toLowerCase();
  return products.find((p) => p.name.trim().toLowerCase() === normalized);
}

export function getOrderCategoriesSummary(
  order: Order,
  products: Product[]
): {
  categories: string[];
  totalItems: number;
  totalPackets: number;
  totalPieces: number;
} {
  const seen = new Set<string>();
  const categories: string[] = [];
  let totalPackets = 0;
  let totalPieces = 0;

  for (const item of order.items) {
    const prod = findMatchingProduct(products, item.productId, item.productName);
    const cat = prod?.category?.trim() || 'Wholesale Cosmetics';
    if (!seen.has(cat)) {
      seen.add(cat);
      categories.push(cat);
    }
    totalPackets += Number(item.packetQty || 0);
    totalPieces += Number(item.totalPieces || item.packetQty * (item.packSize || 6));
  }

  return {
    categories: categories.length > 0 ? categories : ['Wholesale Items'],
    totalItems: order.items.length,
    totalPackets,
    totalPieces,
  };
}

export function buildStructuredOrderBill(
  order: Order,
  products: Product[]
): StructuredOrderBill {
  const rawItems: Omit<StructuredBillItem, 'srNo'>[] = order.items.map((item, idx) => {
    const prod = findMatchingProduct(products, item.productId, item.productName);
    const category = prod?.category?.trim() || 'Wholesale Cosmetics';
    const rawCode = prod?.sku?.trim() || item.productId?.trim() || `ITM-${idx + 1}`;
    const modelCode = rawCode.toUpperCase();
    const shadePart = item.shadeOrSize || prod?.shadeOrSize;
    const packInfo = shadePart
      ? `${item.packSize} pcs/pkt · ${shadePart}`
      : `${item.packSize} pcs/pkt`;
    const hsnCode = item.hsnCode || prod?.hsnCode || '3304';
    const singlePrice = Number(item.unitPricePerPacket || 0);
    const qty = Number(item.packetQty || 0);
    const totalPieces = Number(item.totalPieces || qty * (item.packSize || 6));
    const totalPrice = Number(item.totalPrice || singlePrice * qty);

    return {
      productId: item.productId,
      category,
      modelCode,
      packInfo,
      hsnCode,
      singlePrice,
      qty,
      totalPieces,
      totalPrice,
    };
  });

  // Group items cleanly by Category so every category's items appear together
  const groupMap = new Map<string, Omit<StructuredBillItem, 'srNo'>[]>();
  for (const item of rawItems) {
    const existing = groupMap.get(item.category) || [];
    existing.push(item);
    groupMap.set(item.category, existing);
  }

  const groups: CategoryBillGroup[] = [];
  const numberedItems: StructuredBillItem[] = [];
  let runningSr = 1;

  for (const [category, catItems] of groupMap.entries()) {
    const numberedCatItems: StructuredBillItem[] = catItems.map((it) => {
      const full: StructuredBillItem = { ...it, srNo: runningSr++ };
      numberedItems.push(full);
      return full;
    });
    groups.push({
      category,
      items: numberedCatItems,
      categoryTotal: numberedCatItems.reduce((s, i) => s + i.totalPrice, 0),
      categoryPackets: numberedCatItems.reduce((s, i) => s + i.qty, 0),
    });
  }

  const itemsSum = numberedItems.reduce((s, i) => s + i.totalPrice, 0);
  const subtotal = itemsSum > 0 ? itemsSum : Number(order.subtotal || 0);
  const discountAmount = Number(order.discountAmount || 0);
  const taxableBase = Math.max(0, subtotal - discountAmount);
  const gstRatePercent = 5;
  const gstAmount =
    order.taxAmount && order.taxAmount > 0
      ? Number(order.taxAmount)
      : Math.round((taxableBase * gstRatePercent) / 100);
  const cgstAmount = Math.floor(gstAmount / 2);
  const sgstAmount = gstAmount - cgstAmount;
  const extraCharge = Number(order.deliveryCharge || 0);
  const grandTotal = Math.max(0, taxableBase + gstAmount + extraCharge);
  const advancePaidAmount = order.advancePaid ? Number(order.advanceAmount || 0) : 0;
  const balancePayable = Math.max(0, grandTotal - advancePaidAmount);

  const totalPackets = numberedItems.reduce((s, i) => s + i.qty, 0);
  const totalPieces = numberedItems.reduce((s, i) => s + i.totalPieces, 0);

  return {
    orderNumber: order.orderNumber,
    invoiceDate: (order.createdAt || order.expectedDeliveryDate || '').slice(0, 10) || 'Today',
    expectedDeliveryDate: order.expectedDeliveryDate || 'Scheduled',
    status: order.status,
    trackingNumber: order.trackingNumber || `TRK-${order.orderNumber}`,
    shopName: order.shopName,
    ownerName: order.customerName,
    phone: order.phone,
    address: order.address || 'Odisha',
    landmark: order.landmark || '',
    distanceKm: order.distanceKm || 0,
    categories: groups.map((g) => g.category),
    groups,
    items: numberedItems,
    totalPackets,
    totalPieces,
    subtotal,
    discountAmount,
    gstRatePercent,
    cgstAmount,
    sgstAmount,
    gstAmount,
    extraCharge,
    grandTotal,
    advancePaidAmount,
    balancePayable,
  };
}

export const BILL_RULES_AND_WARNINGS = {
  udhaarRule:
    'UDHAAR RULE (Max 10% Policy): Delivery par max 10% shortage Udhaar sirf verified retailers ke liye allowed hai. Purana Udhaar clear kiye bina agla order dispatch nahi hoga.',
  returnRule:
    'RETURN & EXCHANGE RULE: Parcel kholte samay continuous uncut unboxing video banana zaroori hai. Damage ya wrong item claim 24 hours ke andar WhatsApp par video bhej kar karein. Khula ya used cosmetic/bangle packet return nahi hoga.',
  warnings: [
    'Minimum Rs. 1,000 booking advance carton packing ke baad non-refundable hai.',
    'Delivery ke samay box seal, packet count aur 4-digit Delivery OTP verify karke hi sign karein.',
    'Goods once sold will not be taken back without valid continuous unboxing video proof.',
    'Payment sirf official UPI ID par karein aur payment screenshot WhatsApp par share karein.',
    'All billing & dispatch disputes are subject to Cuttack, Odisha jurisdiction only.',
  ],
};

function fmtRs(val: number): string {
  return `Rs. ${Math.round(val).toLocaleString('en-IN')}`;
}

export function generateOrderBillPdf(
  order: Order,
  products: Product[],
  settings: BusinessSettings
): { blob: Blob; file: File; fileName: string; bill: StructuredOrderBill } {
  const bill = buildStructuredOrderBill(order, products);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  const contentWidth = pageWidth - margin * 2;

  const ensureSpace = (neededMm: number, currentY: number): number => {
    if (currentY + neededMm > pageHeight - 16) {
      doc.addPage();
      return 16;
    }
    return currentY;
  };

  // 1. Top Corporate Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 34, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text((settings.businessName || 'RUPAM WHOLESALE HUB').toUpperCase(), margin, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225);
  doc.text(settings.businessAddress || 'Nuapatna, Cuttack, Odisha - 754035', margin, 18);
  doc.text(
    `Phone: +91 ${settings.ownerPhone || '9437123456'}  |  GSTIN: ${settings.businessGstin || '21AABCR4821K1Z5'}  |  UPI: ${settings.upiId || 'rupamwholesale@upi'}`,
    margin,
    23.5
  );
  doc.text('B2B Wholesale Cosmetics, Bangles & Imitation Jewellery Hub', margin, 29);

  // Right title badge inside banner
  doc.setFillColor(2, 132, 199); // sky-600
  doc.roundedRect(pageWidth - margin - 52, 8, 52, 18, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('TAX INVOICE & CHALLAN', pageWidth - margin - 26, 15, { align: 'center' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`#${bill.orderNumber}`, pageWidth - margin - 26, 21.5, { align: 'center' });

  let y = 40;

  // 2. Party & Invoice Metadata Boxes
  const halfW = (contentWidth - 4) / 2;
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, halfW, 28, 2, 2, 'FD');
  doc.roundedRect(margin + halfW + 4, y, halfW, 28, 2, 2, 'FD');

  // Left: Bill To
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('BILL TO (RETAILER)', margin + 3.5, y + 5.5);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.text(bill.shopName.slice(0, 34), margin + 3.5, y + 11.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  doc.setTextColor(51, 65, 85);
  doc.text(`Owner: ${bill.ownerName}  |  Ph: ${bill.phone}`, margin + 3.5, y + 17);
  const addrLine = `${bill.address}${bill.landmark ? `, ${bill.landmark}` : ''}`.slice(0, 48);
  doc.text(addrLine, margin + 3.5, y + 22);
  doc.text(`Distance: ${bill.distanceKm} km from Nuapatna Hub`, margin + 3.5, y + 26.2);

  // Right: Challan & Dispatch Info
  const rx = margin + halfW + 7.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('INVOICE & DISPATCH DETAILS', rx, y + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  doc.setTextColor(15, 23, 42);
  doc.text(`Bill Date: ${bill.invoiceDate}   |   Exp. Delivery: ${bill.expectedDeliveryDate}`, rx, y + 11.5);
  doc.text(`Order Status: ${bill.status}   |   Tracking: ${bill.trackingNumber}`, rx, y + 17);
  doc.text(`Total Pack: ${bill.totalPackets} pkts (${bill.totalPieces} pcs)`, rx, y + 22);
  const catPreview = `Categories: ${bill.categories.join(', ')}`.slice(0, 46);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(3, 105, 161);
  doc.text(catPreview, rx, y + 26.2);

  y += 33;

  // 3. Itemized Table Header (Category | Model/Code/ID | Single Price | Qty | Total)
  const colSr = margin + 2;
  const colCat = margin + 12;
  const colCode = margin + 56;
  const colRate = margin + 125;
  const colQty = margin + 150;
  const colTotal = margin + contentWidth - 2;

  const drawTableHeader = (topY: number): number => {
    doc.setFillColor(30, 41, 59);
    doc.rect(margin, topY, contentWidth, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text('#', colSr, topY + 5.3);
    doc.text('CATEGORY', colCat, topY + 5.3);
    doc.text('MODEL / CODE / ID', colCode, topY + 5.3);
    doc.text('SINGLE RATE', colRate, topY + 5.3, { align: 'right' });
    doc.text('QTY', colQty, topY + 5.3, { align: 'right' });
    doc.text('TOTAL', colTotal, topY + 5.3, { align: 'right' });
    return topY + 8;
  };

  y = drawTableHeader(y);

  // Render grouped by Category
  for (const group of bill.groups) {
    y = ensureSpace(16, y);
    if (y === 16) y = drawTableHeader(y);

    // Category sub-banner
    doc.setFillColor(240, 249, 255); // sky-50
    doc.setDrawColor(186, 230, 253);
    doc.rect(margin, y, contentWidth, 6.5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(3, 105, 161);
    doc.text(`CATEGORY: ${group.category.toUpperCase()}`, margin + 3, y + 4.5);
    doc.text(
      `${group.categoryPackets} pkts  |  ${fmtRs(group.categoryTotal)}`,
      colTotal,
      y + 4.5,
      { align: 'right' }
    );
    y += 6.5;

    for (const item of group.items) {
      y = ensureSpace(11, y);
      if (y === 16) y = drawTableHeader(y);

      const rowH = 9.5;
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, y + rowH, margin + contentWidth, y + rowH);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.2);
      doc.setTextColor(71, 85, 105);
      doc.text(String(item.srNo), colSr, y + 5.2);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(item.category.slice(0, 21), colCat, y + 5.2);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(item.modelCode.slice(0, 26), colCode, y + 4.6);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(`HSN ${item.hsnCode} · ${item.packInfo}`.slice(0, 34), colCode, y + 8.1);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.2);
      doc.setTextColor(15, 23, 42);
      doc.text(fmtRs(item.singlePrice), colRate, y + 5.2, { align: 'right' });

      doc.setFont('helvetica', 'bold');
      doc.text(`${item.qty} pkt`, colQty, y + 4.6, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(100, 116, 139);
      doc.text(`(${item.totalPieces} pcs)`, colQty, y + 8.1, { align: 'right' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text(fmtRs(item.totalPrice), colTotal, y + 5.2, { align: 'right' });

      y += rowH;
    }
  }

  y += 4;
  y = ensureSpace(46, y);

  // 4. Totals Summary Box (Right) + Payment Details Box (Left)
  const leftBoxW = contentWidth * 0.48;
  const rightBoxW = contentWidth * 0.49;
  const rightBoxX = margin + contentWidth - rightBoxW;

  // Left: Payment Info Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, leftBoxW, 40, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('PAYMENT & SETTLEMENT SUMMARY', margin + 3.5, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text(`UPI ID: ${settings.upiId || 'rupamwholesale@upi'}`, margin + 3.5, y + 12.5);
  doc.text(`Advance Paid: ${fmtRs(bill.advancePaidAmount)}`, margin + 3.5, y + 18.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(180, 83, 9); // amber-700
  doc.text(`Balance Due on Delivery: ${fmtRs(bill.balancePayable)}`, margin + 3.5, y + 26);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Helpline / WhatsApp: +91 ${settings.ownerPhone || '9437123456'}`, margin + 3.5, y + 32.5);
  doc.text(`Total Pack: ${bill.totalPackets} pkts (${bill.totalPieces} pcs)`, margin + 3.5, y + 37);

  // Right: Subtotal + GST + Extra Charge + Grand Total
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(rightBoxX, y, rightBoxW, 40, 2, 2, 'FD');

  let ty = y + 6;
  const labelX = rightBoxX + 4;
  const valX = rightBoxX + rightBoxW - 4;

  const drawTotalRow = (label: string, val: string, muted = false) => {
    doc.setFont('helvetica', muted ? 'normal' : 'bold');
    doc.setFontSize(8.2);
    doc.setTextColor(muted ? 71 : 15, muted ? 85 : 23, muted ? 105 : 42);
    doc.text(label, labelX, ty);
    doc.text(val, valX, ty, { align: 'right' });
    ty += 5.8;
  };

  drawTotalRow('Subtotal:', fmtRs(bill.subtotal), true);
  if (bill.discountAmount > 0) {
    drawTotalRow('Discount:', `- ${fmtRs(bill.discountAmount)}`, true);
  }
  drawTotalRow(
    `GST (${bill.gstRatePercent}% · CGST ${fmtRs(bill.cgstAmount)} + SGST ${fmtRs(bill.sgstAmount)}):`,
    fmtRs(bill.gstAmount),
    true
  );
  drawTotalRow('Extra / Packing & Delivery Charge:', fmtRs(bill.extraCharge), true);

  // Grand Total dark strip
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(rightBoxX + 2, y + 28.5, rightBoxW - 4, 9.5, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(255, 255, 255);
  doc.text('GRAND TOTAL', rightBoxX + 5, y + 34.7);
  doc.text(fmtRs(bill.grandTotal), rightBoxX + rightBoxW - 5, y + 34.7, { align: 'right' });

  y += 45;
  y = ensureSpace(62, y);

  // 5. Warnings, Instructions, Udhaar Rule & Return Rule Box
  doc.setFillColor(255, 251, 235); // amber-50
  doc.setDrawColor(252, 211, 77); // amber-300
  doc.roundedRect(margin, y, contentWidth, 56, 2, 2, 'FD');

  let ry = y + 5.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(146, 64, 14); // amber-900
  doc.text('IMPORTANT WARNINGS, INSTRUCTIONS, UDHAAR RULE & RETURN POLICY', margin + 3.5, ry);
  ry += 4.8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.4);
  doc.setTextColor(153, 27, 27); // red-800
  const udhaarLines = doc.splitTextToSize(`• ${BILL_RULES_AND_WARNINGS.udhaarRule}`, contentWidth - 7);
  doc.text(udhaarLines, margin + 3.5, ry);
  ry += udhaarLines.length * 3.5 + 1.2;

  doc.setTextColor(30, 58, 138); // blue-900
  const returnLines = doc.splitTextToSize(`• ${BILL_RULES_AND_WARNINGS.returnRule}`, contentWidth - 7);
  doc.text(returnLines, margin + 3.5, ry);
  ry += returnLines.length * 3.5 + 1.2;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(51, 65, 85);
  for (let i = 0; i < BILL_RULES_AND_WARNINGS.warnings.length; i++) {
    const wLines = doc.splitTextToSize(
      `${i + 1}. ${BILL_RULES_AND_WARNINGS.warnings[i]}`,
      contentWidth - 7
    );
    doc.text(wLines, margin + 3.5, ry);
    ry += wLines.length * 3.3 + 0.8;
  }

  y += 61;
  y = ensureSpace(18, y);

  // 6. Signature & Footer Row
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, y + 10, margin + 52, y + 10);
  doc.line(pageWidth - margin - 56, y + 10, pageWidth - margin, y + 10);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(71, 85, 105);
  doc.text('Receiver Signature (Retailer)', margin, y + 14.5);
  doc.text(
    `Authorized Signatory (${settings.businessName || 'Rupam Wholesale'})`,
    pageWidth - margin,
    y + 14.5,
    { align: 'right' }
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(
    'This is a computer-generated Wholesale Tax Invoice & Dispatch Challan. Thank you for doing business with us.',
    pageWidth / 2,
    pageHeight - 7,
    { align: 'center' }
  );

  const fileName = `Bill_${order.orderNumber.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
  const blob = doc.output('blob');
  const file = new File([blob], fileName, { type: 'application/pdf' });

  return { blob, file, fileName, bill };
}

export function triggerPdfDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = 'noreferrer';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function buildWhatsAppBillText(
  bill: StructuredOrderBill,
  settings: BusinessSettings,
  fileName: string
): string {
  const lines: string[] = [
    `*${settings.businessName || 'Rupam Wholesale'} — Tax Invoice & Challan*`,
    `Order: *#${bill.orderNumber}* | Date: ${bill.invoiceDate}`,
    `Shop: ${bill.shopName} (${bill.ownerName})`,
    `Categories: *${bill.categories.join(', ')}*`,
    '',
    '*Items Breakdown:*',
  ];

  for (const grp of bill.groups) {
    lines.push(`[${grp.category}]`);
    for (const it of grp.items) {
      lines.push(
        `• Code: ${it.modelCode} | Rs.${it.singlePrice} x ${it.qty} pkt = *Rs.${it.totalPrice.toLocaleString('en-IN')}*`
      );
    }
  }

  lines.push(
    '',
    `Subtotal: Rs.${bill.subtotal.toLocaleString('en-IN')}`,
    `GST (${bill.gstRatePercent}%): Rs.${bill.gstAmount.toLocaleString('en-IN')}`,
    `Extra Charge: Rs.${bill.extraCharge.toLocaleString('en-IN')}`,
    `*Grand Total: Rs.${bill.grandTotal.toLocaleString('en-IN')}*`,
    `Advance Paid: Rs.${bill.advancePaidAmount.toLocaleString('en-IN')}`,
    `*Balance Due: Rs.${bill.balancePayable.toLocaleString('en-IN')}*`,
    '',
    `PDF File: ${fileName}`,
    `UPI: ${settings.upiId || 'rupamwholesale@upi'}`,
    'Rule: Max 10% Udhaar | Unboxing video mandatory within 24 hrs for return.'
  );

  return lines.join('\n');
}

export async function downloadAndShareBillPdfOnWhatsApp(
  order: Order,
  products: Product[],
  settings: BusinessSettings,
  recipientPhone: string,
  onNotify?: (msg: string, type?: 'success' | 'error' | 'info') => void
): Promise<void> {
  const { blob, file, fileName, bill } = generateOrderBillPdf(order, products, settings);
  const waText = buildWhatsAppBillText(bill, settings, fileName);

  // 1. Always download the PDF file cleanly
  triggerPdfDownload(blob, fileName);

  // 2. If native mobile file sharing (PDF attachment to WhatsApp) is supported, use it
  const nav = navigator as Navigator & {
    canShare?: (data?: ShareData) => boolean;
    share?: (data?: ShareData) => Promise<void>;
  };

  if (typeof nav.canShare === 'function' && typeof nav.share === 'function') {
    try {
      if (nav.canShare({ files: [file] })) {
        await nav.share({
          files: [file],
          title: `Invoice #${bill.orderNumber}`,
          text: waText,
        });
        onNotify?.(`Bill PDF (${fileName}) downloaded & shared!`, 'success');
        return;
      }
    } catch {
      // Fall through cleanly to WhatsApp link below if user dismissed share sheet
    }
  }

  // 3. Open WhatsApp chat with formatted bill text via anchor click (no window.open)
  const digits = (recipientPhone || settings.ownerPhone || '9437123456').replace(/\D/g, '');
  const cleanPhone = digits.length >= 10 ? digits.slice(-10) : '9437123456';
  const waUrl = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(waText)}`;

  const link = document.createElement('a');
  link.href = waUrl;
  link.target = '_blank';
  link.rel = 'noreferrer';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  onNotify?.(
    `Bill PDF (${fileName}) downloaded! Attach PDF in WhatsApp chat to send.`,
    'success'
  );
}
