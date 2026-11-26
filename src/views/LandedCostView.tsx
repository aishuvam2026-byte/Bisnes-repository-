import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { tr } from '../data/translations';
import { calculateLandedCost, calculateTaxSplit } from '../utils/businessRules';
import {
  ArrowLeft,
  Building2,
  Calculator,
  CheckCircle2,
  Package,
  Shield,
  Store,
  AlertTriangle,
  Save,
} from 'lucide-react';

export const LandedCostView: React.FC = () => {
  const {
    role,
    user,
    language,
    products,
    settings,
    updateSettings,
    landedCostConfig,
    updateLandedCostConfig,
    setActiveSubPage,
    showToast,
  } = useApp();

  const activeSupplierId = user?.supplierId || 'sup-1';
  const selectableProducts = useMemo(() => {
    if (role === 'supplier') {
      return products.filter((p) => !p.supplierId || p.supplierId === activeSupplierId);
    }
    return products;
  }, [products, role, activeSupplierId]);

  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [packSize, setPackSize] = useState<6 | 12>(12);
  const [purchasePrice, setPurchasePrice] = useState<number>(240);
  const [freight, setFreight] = useState<number>(landedCostConfig.ownerDefaultFreightPerPkt);
  const [packing, setPacking] = useState<number>(landedCostConfig.ownerDefaultPackingPerPkt);
  const [damageAllowance, setDamageAllowance] = useState<number>(
    landedCostConfig.ownerDefaultDamageBufferPerPkt
  );
  const [gstRate, setGstRate] = useState<number>(landedCostConfig.ownerDefaultGstPct);
  const [customerState, setCustomerState] = useState<string>('Odisha');
  const [sellingPrice, setSellingPrice] = useState<number>(360);

  const handleSelectProduct = (prodId: string) => {
    setSelectedProductId(prodId);
    const prod = selectableProducts.find((p) => p.id === prodId);
    if (prod) {
      setPackSize(prod.packSize);
      setPurchasePrice(prod.purchaseCost);
      setSellingPrice(prod.sellingPrice);
      setGstRate(prod.gstRate || landedCostConfig.ownerDefaultGstPct);
    }
  };

  const calc = calculateLandedCost(
    purchasePrice,
    freight,
    packing,
    damageAllowance,
    sellingPrice
  );
  const tax = calculateTaxSplit(calc.landedCost, gstRate, customerState, settings.businessState);
  const landedPerPiece = Number((calc.landedCost / packSize).toFixed(2));
  const sellingPerPiece = Number((sellingPrice / packSize).toFixed(2));

  const saveOwnerRuleDefaults = () => {
    updateLandedCostConfig({
      ownerDefaultFreightPerPkt: freight,
      ownerDefaultPackingPerPkt: packing,
      ownerDefaultDamageBufferPerPkt: damageAllowance,
      ownerDefaultGstPct: gstRate,
    });
    showToast('Saved current calculator values as default Landed Cost rules!', 'success');
  };

  return (
    <div className="space-y-3 pb-24 sm:pb-28">
      {/* Header */}
      <div className="glass-card rounded-2xl sm:rounded-3xl p-3 sm:p-4 border border-white/90 shadow-sm bg-gradient-to-br from-teal-50 via-white to-sky-50 space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => setActiveSubPage(null)}
              className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 shadow-2xs active:scale-95 transition shrink-0"
              aria-label="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-black text-slate-900 leading-tight flex items-center gap-1.5 truncate">
                <Calculator className="w-4 h-4 text-teal-600 shrink-0" />
                <span className="truncate">{tr('Landed Cost Calculator', language)}</span>
              </h1>
              <p className="text-[10px] sm:text-[11px] text-slate-500 truncate">
                Purchase + Freight + Packing + Damage + GST • {role === 'owner' ? 'Owner ID' : role === 'supplier' ? 'Supplier ID' : 'Retailer ID'}
              </p>
            </div>
          </div>

          <span
            className={`text-[9px] sm:text-[10px] font-black uppercase px-2 py-0.5 rounded-full border shrink-0 whitespace-nowrap ${
              role === 'owner'
                ? 'bg-blue-100 text-blue-800 border-blue-200'
                : role === 'supplier'
                ? 'bg-purple-100 text-purple-800 border-purple-200'
                : 'bg-amber-100 text-amber-900 border-amber-200'
            }`}
          >
            {role === 'owner' ? 'Owner ID' : role === 'supplier' ? 'Supplier ID' : 'Retailer ID'}
          </span>
        </div>
      </div>

      {/* Interactive Calculator Card */}
      <div className="glass-card rounded-2xl sm:rounded-3xl p-3 sm:p-4 border border-slate-200/90 bg-white shadow-sm space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5 text-teal-600" />
            <span>{tr('Packet Cost & Margin Simulator', language)}</span>
          </h2>
          {role === 'owner' && (
            <button
              type="button"
              onClick={saveOwnerRuleDefaults}
              className="px-2 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-[10px] sm:text-[11px] font-bold flex items-center gap-1 transition shrink-0"
            >
              <Save className="w-3 h-3" />
              <span>{tr('Save Default', language)}</span>
            </button>
          )}
        </div>

        {/* Optional Product Prefill */}
        <div>
          <label className="text-[10px] sm:text-[11px] font-bold text-slate-600 block mb-1">
            {tr('Load Existing Product (Optional)', language)}
          </label>
          <select
            value={selectedProductId}
            onChange={(e) => handleSelectProduct(e.target.value)}
            className="w-full px-2.5 py-1.5 sm:py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800"
          >
            <option value="">-- Custom / Manual Calculation --</option>
            {selectableProducts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.packSize} pcs) — Cost ₹{p.purchaseCost} / Sell ₹{p.sellingPrice}
              </option>
            ))}
          </select>
        </div>

        {/* Inputs Grid */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] font-bold text-slate-600 block mb-1">
              {tr('Base Purchase / Pkt (₹)', language)}
            </label>
            <input
              type="number"
              min={0}
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(Number(e.target.value))}
              className="w-full px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-600 block mb-1">
              {tr('Full Packet Size', language)}
            </label>
            <div className="grid grid-cols-2 gap-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200">
              {([6, 12] as const).map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => setPackSize(sz)}
                  className={`py-1.5 rounded-lg text-[11px] font-extrabold transition ${
                    packSize === sz
                      ? 'bg-teal-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {sz} pcs
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-600 block mb-1">
              {tr('Freight / Pkt (₹)', language)}
            </label>
            <input
              type="number"
              min={0}
              value={freight}
              onChange={(e) => setFreight(Number(e.target.value))}
              className="w-full px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-600 block mb-1">
              {tr('Carton & Pack / Pkt (₹)', language)}
            </label>
            <input
              type="number"
              min={0}
              value={packing}
              onChange={(e) => setPacking(Number(e.target.value))}
              className="w-full px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-600 block mb-1">
              {tr('Damage Buffer / Pkt (₹)', language)}
            </label>
            <input
              type="number"
              min={0}
              value={damageAllowance}
              onChange={(e) => setDamageAllowance(Number(e.target.value))}
              className="w-full px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-600 block mb-1">
              {tr('GST (%) & State', language)}
            </label>
            <div className="flex gap-1">
              <select
                value={gstRate}
                onChange={(e) => setGstRate(Number(e.target.value))}
                className="w-1/2 px-1.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] font-bold text-slate-800"
              >
                {[0, 5, 12, 18, 28].map((r) => (
                  <option key={r} value={r}>
                    {r}% GST
                  </option>
                ))}
              </select>
              <select
                value={customerState}
                onChange={(e) => setCustomerState(e.target.value)}
                className="w-1/2 px-1.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] font-bold text-slate-800"
              >
                <option value="Odisha">Odisha</option>
                <option value="West Bengal">Outside</option>
              </select>
            </div>
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-600 block mb-1">
            {tr('Wholesale Selling Price / Pkt (₹)', language)}
          </label>
          <input
            type="number"
            min={0}
            value={sellingPrice}
            onChange={(e) => setSellingPrice(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-xl bg-sky-50/70 border border-sky-200 text-xs sm:text-sm font-black text-slate-900"
          />
        </div>

        {/* Live Calculation Summary */}
        <div className="p-3 rounded-2xl bg-slate-900 text-white space-y-1.5 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-300 text-[11px]">{tr('Landed Cost (Ex-GST):', language)}</span>
            <span className="font-black text-sm sm:text-base text-amber-300 tabular-nums">
              ₹{calc.landedCost.toLocaleString('en-IN')} (₹{landedPerPiece}/pc)
            </span>
          </div>
          <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-slate-300 gap-2">
            <span>
              GST ({tax.isInterState ? `IGST ${gstRate}%` : `CGST ${gstRate / 2}% + SGST ${gstRate / 2}%`}):
            </span>
            <span className="font-bold text-white tabular-nums">
              +₹{tax.totalTax} → ₹{tax.totalWithTax}/pkt incl. GST
            </span>
          </div>
          <div className="flex items-center justify-between pt-1.5 border-t border-slate-700/80 gap-2">
            <div>
              <span className="text-slate-300 block text-[10px]">{tr('Net Wholesale Profit', language)}</span>
              <span className="font-black text-emerald-400 text-xs sm:text-sm tabular-nums">
                ₹{calc.marginAmount}/pkt (Sell ₹{sellingPerPiece}/pc)
              </span>
            </div>
            <div className="text-right">
              <span className="text-slate-300 block text-[10px]">
                Min Rule: {settings.minMarginPercent}%
              </span>
              <span
                className={`inline-flex items-center gap-1 font-black text-xs sm:text-sm tabular-nums ${
                  calc.marginPercent >= settings.minMarginPercent
                    ? 'text-emerald-400'
                    : 'text-rose-400'
                }`}
              >
                {calc.marginPercent >= settings.minMarginPercent ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5" />
                )}
                <span>{calc.marginPercent}% Margin</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          ACTIVE ID RULE SETTING TABLE (Strictly matches currently open ID)
      ══════════════════════════════════════════════════════════════════ */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1 gap-2">
          <h2 className="text-[11px] font-black uppercase tracking-wider text-slate-700 truncate">
            {role === 'owner'
              ? tr('Owner ID Rule Settings Table', language)
              : role === 'supplier'
              ? tr('Supplier ID Rule Settings Table', language)
              : tr('Retailer ID Rule Settings Table', language)}
          </h2>
          <span
            className={`text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 whitespace-nowrap ${
              role === 'owner'
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : role === 'supplier'
                ? 'bg-purple-50 text-purple-700 border-purple-200'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}
          >
            {role === 'owner' ? 'Owner Active' : role === 'supplier' ? 'Supplier Active' : 'Retailer Active'}
          </span>
        </div>

        {/* TABLE 1: OWNER ID RULE SETTING TABLE */}
        {role === 'owner' && (
          <div className="glass-card rounded-2xl sm:rounded-3xl p-3 sm:p-4 border border-blue-200/90 bg-white shadow-xs space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                  <Shield className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-black text-slate-900 truncate">
                    {tr('Owner Margin & Overhead Rules', language)}
                  </h3>
                  <p className="text-[10px] text-slate-500 truncate">
                    Master Hub control rules for wholesale pricing
                  </p>
                </div>
              </div>
              <span className="text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 shrink-0">
                Editable
              </span>
            </div>

            <div className="overflow-x-auto no-scrollbar rounded-xl sm:rounded-2xl border border-slate-200">
              <table className="w-full text-left border-collapse text-[10px] sm:text-xs">
                <thead>
                  <tr className="bg-blue-50/90 text-blue-950 font-black text-[10px] sm:text-[11px] whitespace-nowrap">
                    <th className="py-1.5 px-2 sm:py-2 sm:px-3 border-b border-blue-100">{tr('Rule / Parameter', language)}</th>
                    <th className="py-1.5 px-2 sm:py-2 sm:px-3 border-b border-blue-100">{tr('Active Value', language)}</th>
                    <th className="py-1.5 px-2 sm:py-2 sm:px-3 border-b border-blue-100">{tr('Hub Policy Action', language)}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[10px] sm:text-[11px]">
                  <tr>
                    <td className="py-1.5 px-2 sm:py-2 sm:px-3 font-bold text-slate-800 whitespace-nowrap">{tr('Min Wholesale Margin', language)}</td>
                    <td className="py-1.5 px-2 sm:py-2 sm:px-3 font-black text-blue-700 whitespace-nowrap">
                      <input
                        type="number"
                        value={settings.minMarginPercent}
                        onChange={(e) =>
                          updateSettings({ minMarginPercent: Math.max(0, Number(e.target.value)) })
                        }
                        className="w-12 sm:w-16 px-1.5 py-0.5 rounded-lg border border-blue-200 bg-blue-50/50 text-[11px] sm:text-xs font-black"
                      />
                      {' %'}
                    </td>
                    <td className="py-1.5 px-2 sm:py-2 sm:px-3 text-slate-600">Blocks below-margin alerts</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 px-2 sm:py-2 sm:px-3 font-bold text-slate-800 whitespace-nowrap">{tr('Default Freight / Pkt', language)}</td>
                    <td className="py-1.5 px-2 sm:py-2 sm:px-3 font-black text-slate-900 whitespace-nowrap">
                      ₹{landedCostConfig.ownerDefaultFreightPerPkt}
                    </td>
                    <td className="py-1.5 px-2 sm:py-2 sm:px-3 text-slate-600">Roadways cargo inward</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 px-2 sm:py-2 sm:px-3 font-bold text-slate-800 whitespace-nowrap">{tr('Packing & Bubble / Pkt', language)}</td>
                    <td className="py-1.5 px-2 sm:py-2 sm:px-3 font-black text-slate-900 whitespace-nowrap">
                      ₹{landedCostConfig.ownerDefaultPackingPerPkt}
                    </td>
                    <td className="py-1.5 px-2 sm:py-2 sm:px-3 text-slate-600">Carton, tape &amp; safety wrap</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 px-2 sm:py-2 sm:px-3 font-bold text-slate-800 whitespace-nowrap">{tr('Damage Allowance / Pkt', language)}</td>
                    <td className="py-1.5 px-2 sm:py-2 sm:px-3 font-black text-slate-900 whitespace-nowrap">
                      ₹{landedCostConfig.ownerDefaultDamageBufferPerPkt}
                    </td>
                    <td className="py-1.5 px-2 sm:py-2 sm:px-3 text-slate-600">Breakage risk reserve</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 px-2 sm:py-2 sm:px-3 font-bold text-slate-800 whitespace-nowrap">{tr('Extra KM Freight (>150km)', language)}</td>
                    <td className="py-1.5 px-2 sm:py-2 sm:px-3 font-black text-blue-700 whitespace-nowrap">
                      ₹{settings.deliveryChargePerKmOverRadius}/km
                    </td>
                    <td className="py-1.5 px-2 sm:py-2 sm:px-3 text-slate-600">Beyond free 150km radius</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TABLE 2: DUKANI (CUSTOMER) ID RULE SETTING TABLE */}
        {role === 'customer' && (
          <div className="glass-card rounded-2xl sm:rounded-3xl p-3 sm:p-4 border border-amber-200/90 bg-white shadow-xs space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0">
                  <Store className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-black text-slate-900 truncate">
                    {tr('Retailer Buying & Credit Rules', language)}
                  </h3>
                  <p className="text-[10px] text-slate-500 truncate">
                    Retailer landed billing &amp; dispatch eligibility
                  </p>
                </div>
              </div>
              <span className="text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 shrink-0">
                Retailer
              </span>
            </div>

            <div className="overflow-x-auto no-scrollbar rounded-xl sm:rounded-2xl border border-slate-200">
              <table className="w-full text-left border-collapse text-[10px] sm:text-xs">
                <thead>
                  <tr className="bg-amber-50/90 text-amber-950 font-black text-[10px] sm:text-[11px] whitespace-nowrap">
                    <th className="py-1.5 px-2 sm:py-2 sm:px-3 border-b border-amber-100">{tr('Retailer Rule', language)}</th>
                    <th className="py-1.5 px-2 sm:py-2 sm:px-3 border-b border-amber-100">{tr('Limit / Value', language)}</th>
                    <th className="py-1.5 px-2 sm:py-2 sm:px-3 border-b border-amber-100">{tr('Impact on Order Cost', language)}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[10px] sm:text-[11px]">
                  <tr>
                    <td className="py-1.5 px-2 sm:py-2 sm:px-3 font-bold text-slate-800 whitespace-nowrap">{tr('Full Packet Rule', language)}</td>
                    <td className="py-1.5 px-2 sm:py-2 sm:px-3 font-black text-amber-800 whitespace-nowrap">6 or 12 pcs/pkt</td>
                    <td className="py-1.5 px-2 sm:py-2 sm:px-3 text-slate-600">Loose pieces disabled</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 px-2 sm:py-2 sm:px-3 font-bold text-slate-800 whitespace-nowrap">{tr('Minimum Order Value', language)}</td>
                    <td className="py-1.5 px-2 sm:py-2 sm:px-3 font-black text-amber-800 whitespace-nowrap">
                      ₹{settings.minOrderValue.toLocaleString('en-IN')}
                    </td>
                    <td className="py-1.5 px-2 sm:py-2 sm:px-3 text-slate-600">Min wholesale cart value</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 px-2 sm:py-2 sm:px-3 font-bold text-slate-800 whitespace-nowrap">{tr('Advance Booking', language)}</td>
                    <td className="py-1.5 px-2 sm:py-2 sm:px-3 font-black text-amber-800 whitespace-nowrap">
                      ₹{settings.advanceBookingAmount.toLocaleString('en-IN')} UPI
                    </td>
                    <td className="py-1.5 px-2 sm:py-2 sm:px-3 text-slate-600">Deducted from final bill</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 px-2 sm:py-2 sm:px-3 font-bold text-slate-800 whitespace-nowrap">{tr('Free Delivery Radius', language)}</td>
                    <td className="py-1.5 px-2 sm:py-2 sm:px-3 font-black text-emerald-700 whitespace-nowrap">
                      Up to {settings.freeDeliveryRadiusKm} km
                    </td>
                    <td className="py-1.5 px-2 sm:py-2 sm:px-3 text-slate-600">₹0 freight within 150 km</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 px-2 sm:py-2 sm:px-3 font-bold text-slate-800 whitespace-nowrap">{tr('Max Shortage Udhaar', language)}</td>
                    <td className="py-1.5 px-2 sm:py-2 sm:px-3 font-black text-rose-700 whitespace-nowrap">
                      Max {settings.maxUdhaarShortagePercent}%
                    </td>
                    <td className="py-1.5 px-2 sm:py-2 sm:px-3 text-slate-600">Clear before next dispatch</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 px-2 sm:py-2 sm:px-3 font-bold text-slate-800 whitespace-nowrap">{tr('Damage Return Claim', language)}</td>
                    <td className="py-1.5 px-2 sm:py-2 sm:px-3 font-black text-slate-900 whitespace-nowrap">Uncut Video</td>
                    <td className="py-1.5 px-2 sm:py-2 sm:px-3 text-slate-600">Sealed unboxing video mandatory</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TABLE 3: SUPPLIER ID RULE SETTING TABLE */}
        {role === 'supplier' && (
          <div className="glass-card rounded-2xl sm:rounded-3xl p-3 sm:p-4 border border-purple-200/90 bg-white shadow-xs space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0">
                  <Building2 className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-black text-slate-900 truncate">
                    {tr('Supplier Procurement & Settlement Rules', language)}
                  </h3>
                  <p className="text-[10px] text-slate-500 truncate">
                    Factory/C&amp;F rate card, bilty freight &amp; settlement
                  </p>
                </div>
              </div>
              <span className="text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 shrink-0">
                Vendor Rules
              </span>
            </div>

            <div className="overflow-x-auto no-scrollbar rounded-xl sm:rounded-2xl border border-slate-200">
              <table className="w-full text-left border-collapse text-[10px] sm:text-xs">
                <thead>
                  <tr className="bg-purple-50/90 text-purple-950 font-black text-[10px] sm:text-[11px] whitespace-nowrap">
                    <th className="py-1.5 px-2 sm:py-2 sm:px-3 border-b border-purple-100">{tr('Supplier Setting', language)}</th>
                    <th className="py-1.5 px-2 sm:py-2 sm:px-3 border-b border-purple-100">{tr('Standard Rule', language)}</th>
                    <th className="py-1.5 px-2 sm:py-2 sm:px-3 border-b border-purple-100">{tr('Settlement Impact', language)}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[10px] sm:text-[11px]">
                  <tr>
                    <td className="py-1.5 px-2 sm:py-2 sm:px-3 font-bold text-slate-800 whitespace-nowrap">{tr('Tax / GST ITC Mode', language)}</td>
                    <td className="py-1.5 px-2 sm:py-2 sm:px-3 font-black text-purple-800 whitespace-nowrap">
                      <select
                        value={landedCostConfig.supplierTaxMode}
                        onChange={(e) =>
                          updateLandedCostConfig({
                            supplierTaxMode: e.target.value as 'CGST+SGST' | 'IGST',
                          })
                        }
                        className="px-1.5 py-0.5 rounded-lg border border-purple-200 bg-purple-50 text-[10px] sm:text-[11px] font-black"
                      >
                        <option value="IGST">IGST (Inter-State)</option>
                        <option value="CGST+SGST">CGST+SGST (Odisha)</option>
                      </select>
                    </td>
                    <td className="py-1.5 px-2 sm:py-2 sm:px-3 text-slate-600">Input credit on GST bill</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 px-2 sm:py-2 sm:px-3 font-bold text-slate-800 whitespace-nowrap">{tr('Transport & Bilty', language)}</td>
                    <td className="py-1.5 px-2 sm:py-2 sm:px-3 font-black text-purple-800 whitespace-nowrap">
                      {landedCostConfig.supplierTransportSplitPct}% Hub Billed
                    </td>
                    <td className="py-1.5 px-2 sm:py-2 sm:px-3 text-slate-600">Bilty no. before Hub QC</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 px-2 sm:py-2 sm:px-3 font-bold text-slate-800 whitespace-nowrap">{tr('Damage Tolerance', language)}</td>
                    <td className="py-1.5 px-2 sm:py-2 sm:px-3 font-black text-purple-800 whitespace-nowrap">
                      Max {landedCostConfig.supplierDamageTolerancePct}%
                    </td>
                    <td className="py-1.5 px-2 sm:py-2 sm:px-3 text-slate-600">Excess breakage in PO</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 px-2 sm:py-2 sm:px-3 font-bold text-slate-800 whitespace-nowrap">{tr('Credit & Settlement', language)}</td>
                    <td className="py-1.5 px-2 sm:py-2 sm:px-3 font-black text-purple-800 whitespace-nowrap">
                      {landedCostConfig.supplierCreditDays} Days Net
                    </td>
                    <td className="py-1.5 px-2 sm:py-2 sm:px-3 text-slate-600">UPI / NEFT after Hub QC</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 px-2 sm:py-2 sm:px-3 font-bold text-slate-800 whitespace-nowrap">{tr('Rate Quote Lock', language)}</td>
                    <td className="py-1.5 px-2 sm:py-2 sm:px-3 font-black text-slate-900 whitespace-nowrap">Full 6/12 Packet</td>
                    <td className="py-1.5 px-2 sm:py-2 sm:px-3 text-slate-600">Includes freight+pack</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
