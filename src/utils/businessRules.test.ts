import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateOrderMinimum,
  validatePacketQuantity,
  calculateDeliveryFee,
  checkUdhaarAllowed,
  checkCustomerCanOrder,
  validateReturnRequest,
  calculateLandedCost,
  calculateTaxSplit,
  calculateDistanceKm,
  DEFAULT_BUSINESS_CONFIG,
} from './businessRules.js';

test('validateOrderMinimum blocks orders under ₹1,000', () => {
  const under = validateOrderMinimum(850);
  assert.equal(under.valid, false);
  assert.match(under.error || '', /Minimum order value is ₹1,000/);

  const exact = validateOrderMinimum(1000);
  assert.equal(exact.valid, true);

  const above = validateOrderMinimum(5500);
  assert.equal(above.valid, true);
});

test('validatePacketQuantity allows only whole packets and computes pieces correctly', () => {
  const pack6 = validatePacketQuantity(5, 6);
  assert.equal(pack6.valid, true);
  assert.equal(pack6.pieces, 30);

  const pack12 = validatePacketQuantity(3, 12);
  assert.equal(pack12.valid, true);
  assert.equal(pack12.pieces, 36);

  const fractional = validatePacketQuantity(2.5, 6);
  assert.equal(fractional.valid, false);

  const zeroOrNegative = validatePacketQuantity(0, 12);
  assert.equal(zeroOrNegative.valid, false);
});

test('calculateDeliveryFee enforces 150 km free delivery from Nuapatna', () => {
  const inside = calculateDeliveryFee(85, DEFAULT_BUSINESS_CONFIG);
  assert.equal(inside.isFree, true);
  assert.equal(inside.charge, 0);

  const boundary = calculateDeliveryFee(150, DEFAULT_BUSINESS_CONFIG);
  assert.equal(boundary.isFree, true);
  assert.equal(boundary.charge, 0);

  const outside = calculateDeliveryFee(170, DEFAULT_BUSINESS_CONFIG);
  assert.equal(outside.isFree, false);
  assert.equal(outside.charge, 20 * 15); // 20 km * ₹15
  assert.match(outside.warning || '', /Outside free delivery radius/);
});

test('checkUdhaarAllowed permits shortage <= 10% and blocks > 10%', () => {
  // 5% shortage on ₹10,000 bill = ₹500
  const allowed = checkUdhaarAllowed(500, 10000, 10);
  assert.equal(allowed.allowed, true);
  assert.equal(allowed.shortagePct, 5);

  // Exactly 10% shortage on ₹10,000 bill = ₹1,000
  const exact = checkUdhaarAllowed(1000, 10000, 10);
  assert.equal(exact.allowed, true);
  assert.equal(exact.shortagePct, 10);

  // 15% shortage on ₹10,000 bill = ₹1,500
  const blocked = checkUdhaarAllowed(1500, 10000, 10);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.shortagePct, 15);
  assert.match(blocked.reason, /exceeds the 10% limit/);
});

test('checkCustomerCanOrder blocks if customer has unpaid udhaar unless owner overrides', () => {
  const cleanCustomer = checkCustomerCanOrder(0);
  assert.equal(cleanCustomer.allowed, true);

  const owingCustomer = checkCustomerCanOrder(2500);
  assert.equal(owingCustomer.allowed, false);
  assert.match(owingCustomer.reason || '', /pending udhaar of ₹2,500/);

  const overridden = checkCustomerCanOrder(2500, true, 'Regular customer promised clearance on Friday');
  assert.equal(overridden.allowed, true);
  assert.match(overridden.reason || '', /Owner override applied/);
});

test('validateReturnRequest requires continuous unboxing video', () => {
  const noVideo = validateReturnRequest(false, false, 'Broken lipstick inside');
  assert.equal(noVideo.status, 'REJECTED');
  assert.match(noVideo.reason, /unboxing video/);

  const openedGoods = validateReturnRequest(true, true, 'Unsold cosmetic items');
  assert.equal(openedGoods.status, 'REJECTED');
  assert.match(openedGoods.reason, /unsold/);

  const valid = validateReturnRequest(true, false, 'Lipstick tip cracked inside bubble wrap parcel');
  assert.equal(valid.status, 'APPROVED');
});

test('calculateLandedCost calculates real margin correctly', () => {
  // purchase 100, freight 5, packing 3, damage allowance 2 = 110 landed cost. Selling at 150
  const result = calculateLandedCost(100, 5, 3, 2, 150);
  assert.equal(result.landedCost, 110);
  assert.equal(result.marginAmount, 40);
  assert.equal(result.marginPercent, 26.7);
  assert.equal(result.isMarginHealthy, true);
});

test('calculateTaxSplit splits CGST/SGST intra-state and IGST inter-state', () => {
  const intra = calculateTaxSplit(1000, 18, 'Odisha', 'Odisha');
  assert.equal(intra.isInterState, false);
  assert.equal(intra.cgst, 90);
  assert.equal(intra.sgst, 90);
  assert.equal(intra.igst, 0);
  assert.equal(intra.totalTax, 180);

  const inter = calculateTaxSplit(1000, 18, 'West Bengal', 'Odisha');
  assert.equal(inter.isInterState, true);
  assert.equal(inter.cgst, 0);
  assert.equal(inter.sgst, 0);
  assert.equal(inter.igst, 180);
  assert.equal(inter.totalTax, 180);
});

test('calculateDistanceKm computes distance from Nuapatna accurately', () => {
  // Bhubaneswar is ~30 km from Nuapatna/Cuttack
  const dist = calculateDistanceKm(20.2961, 85.8245);
  assert.ok(dist >= 15 && dist <= 40, `Distance should be ~20-30km, got ${dist}`);
});
