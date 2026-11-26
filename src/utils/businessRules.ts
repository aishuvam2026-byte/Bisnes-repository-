/**
 * Rupam B2B Cosmetic & FMCG Wholesale Business Rules
 * Enforces business logic:
 * 1. Min order value = ₹1,000
 * 2. Full packets only (6 or 12 pcs)
 * 3. Advance ₹1,000 required for booking
 * 4. Free delivery within 150 km of Nuapatna (754035)
 * 5. Udhaar rule: <= 10% shortage allowed on delivery, clears before next order; > 10% forces Hold
 * 6. Return rule: Continuous unboxing video mandatory; opened/unsold not returnable
 * 7. Landed cost & margin calculator
 * 8. GST calculation (CGST+SGST for Odisha intra-state, IGST for inter-state)
 */

export interface BusinessConfig {
  minOrderValue: number;
  advanceBookingAmount: number;
  freeDeliveryRadiusKm: number;
  deliveryChargePerKmOverRadius: number;
  maxUdhaarShortagePercent: number;
  minMarginPercent: number;
  businessState: string;
  businessAddress: string;
  businessCoordinates: { lat: number; lng: number };
}

export const DEFAULT_BUSINESS_CONFIG: BusinessConfig = {
  minOrderValue: 1000,
  advanceBookingAmount: 1000,
  freeDeliveryRadiusKm: 150,
  deliveryChargePerKmOverRadius: 15,
  maxUdhaarShortagePercent: 10,
  minMarginPercent: 15,
  businessState: 'Odisha',
  businessAddress: 'Nuapatna, Cuttack, Odisha 754035',
  businessCoordinates: { lat: 20.4856, lng: 85.8344 }, // Nuapatna, Cuttack
};

export function validateOrderMinimum(total: number, minOrderValue = 1000): {
  valid: boolean;
  min: number;
  error?: string;
} {
  if (total < minOrderValue) {
    return {
      valid: false,
      min: minOrderValue,
      error: `Minimum order value is ₹${minOrderValue.toLocaleString('en-IN')}. Current total is ₹${total.toLocaleString('en-IN')}.`,
    };
  }
  return { valid: true, min: minOrderValue };
}

export function validatePacketQuantity(packets: number, packSize: 6 | 12): {
  valid: boolean;
  pieces: number;
  error?: string;
} {
  if (!Number.isInteger(packets) || packets <= 0) {
    return {
      valid: false,
      pieces: 0,
      error: 'Quantity must be in full whole packets (minimum 1 packet). Loose pieces not allowed.',
    };
  }
  return {
    valid: true,
    pieces: packets * packSize,
  };
}

export function calculateDeliveryFee(
  distanceKm: number,
  config: BusinessConfig = DEFAULT_BUSINESS_CONFIG
): {
  isFree: boolean;
  distanceKm: number;
  charge: number;
  warning?: string;
} {
  if (distanceKm <= config.freeDeliveryRadiusKm) {
    return {
      isFree: true,
      distanceKm,
      charge: 0,
    };
  }
  const extraKm = Math.ceil(distanceKm - config.freeDeliveryRadiusKm);
  const charge = extraKm * config.deliveryChargePerKmOverRadius;
  return {
    isFree: false,
    distanceKm,
    charge,
    warning: `Outside free delivery radius (150 km). Distance: ${distanceKm} km (+₹${charge} delivery fee).`,
  };
}

export function checkUdhaarAllowed(
  shortageAmount: number,
  totalBill: number,
  maxTolerancePct = 10
): {
  allowed: boolean;
  shortagePct: number;
  reason: string;
} {
  if (shortageAmount <= 0) {
    return {
      allowed: true,
      shortagePct: 0,
      reason: 'No shortage. Full payment received.',
    };
  }
  const shortagePct = Number(((shortageAmount / totalBill) * 100).toFixed(1));
  if (shortagePct <= maxTolerancePct) {
    return {
      allowed: true,
      shortagePct,
      reason: `Shortage is ${shortagePct}% (<= ${maxTolerancePct}% tolerance). Udhaar entry created; must be cleared before next order.`,
    };
  }
  return {
    allowed: false,
    shortagePct,
    reason: `Shortage is ${shortagePct}% which exceeds the ${maxTolerancePct}% limit. Order must be placed On Hold.`,
  };
}

export function checkCustomerCanOrder(
  pendingUdhaarTotal: number,
  ownerOverride = false,
  overrideReason = ''
): {
  allowed: boolean;
  reason?: string;
} {
  if (pendingUdhaarTotal <= 0) {
    return { allowed: true };
  }
  if (ownerOverride && overrideReason.trim().length >= 3) {
    return {
      allowed: true,
      reason: `Owner override applied: "${overrideReason.trim()}". Pending udhaar: ₹${pendingUdhaarTotal}.`,
    };
  }
  return {
    allowed: false,
    reason: `Customer has pending udhaar of ₹${pendingUdhaarTotal.toLocaleString('en-IN')}. General credit is disallowed; must clear dues before booking new orders.`,
  };
}

export function validateReturnRequest(
  hasContinuousVideo: boolean,
  isOpenedOrUnsold: boolean,
  damageNotes: string
): {
  status: 'APPROVED' | 'REJECTED';
  reason: string;
} {
  if (!hasContinuousVideo) {
    return {
      status: 'REJECTED',
      reason: 'Mandatory continuous unboxing video from sealed parcel opening is missing. Auto-rejected.',
    };
  }
  if (isOpenedOrUnsold) {
    return {
      status: 'REJECTED',
      reason: 'Opened goods or unsold stock are not eligible for return.',
    };
  }
  if (!damageNotes || damageNotes.trim().length < 5) {
    return {
      status: 'REJECTED',
      reason: 'Clear damage description and timestamp details are required.',
    };
  }
  return {
    status: 'APPROVED',
    reason: 'Continuous unboxing video verified. Return approved for replacement or credit note.',
  };
}

export function calculateLandedCost(
  purchasePrice: number,
  freightPerPacket: number,
  packingPerPacket: number,
  damageAllowancePerPacket: number,
  sellingPrice: number
): {
  landedCost: number;
  marginAmount: number;
  marginPercent: number;
  isMarginHealthy: boolean;
} {
  const landedCost = Number((purchasePrice + freightPerPacket + packingPerPacket + damageAllowancePerPacket).toFixed(2));
  const marginAmount = Number((sellingPrice - landedCost).toFixed(2));
  const marginPercent = sellingPrice > 0 ? Number(((marginAmount / sellingPrice) * 100).toFixed(1)) : 0;
  return {
    landedCost,
    marginAmount,
    marginPercent,
    isMarginHealthy: marginPercent >= 15,
  };
}

export function calculateTaxSplit(
  taxableAmount: number,
  gstRatePct: number,
  customerState = 'Odisha',
  businessState = 'Odisha'
): {
  isInterState: boolean;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
  totalWithTax: number;
} {
  const isInterState = customerState.trim().toLowerCase() !== businessState.trim().toLowerCase();
  const totalTax = Number(((taxableAmount * gstRatePct) / 100).toFixed(2));
  if (isInterState) {
    return {
      isInterState: true,
      cgst: 0,
      sgst: 0,
      igst: totalTax,
      totalTax,
      totalWithTax: Number((taxableAmount + totalTax).toFixed(2)),
    };
  }
  const halfTax = Number((totalTax / 2).toFixed(2));
  return {
    isInterState: false,
    cgst: halfTax,
    sgst: halfTax,
    igst: 0,
    totalTax,
    totalWithTax: Number((taxableAmount + totalTax).toFixed(2)),
  };
}

/**
 * Haversine formula to calculate distance in km from Nuapatna
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2 = 20.4856, // Nuapatna, Cuttack
  lon2 = 85.8344
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}
