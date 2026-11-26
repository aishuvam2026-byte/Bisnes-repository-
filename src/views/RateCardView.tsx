import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  FileText,
  Share2,
  Printer,
  Copy,
  Check,
  Search,
  Package,
  Sparkles,
  Phone,
  Building2,
} from 'lucide-react';

export const RateCardView: React.FC = () => {
  const { products, settings, showToast, role, user, suppliers } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [copied, setCopied] = useState(false);
  const [search, setSearch] = useState('');

  const categories = ['All', ...Array.from(new Set(products.map((p) => p.category)))];

  const filtered = products.filter((p) => {
    const matchCat = selectedCategory === 'All' || p.category === selectedCategory;
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const generateWhatsAppRateCard = () => {
    let msg = `*RUPAM B2B COSMETIC & FMCG WHOLESALE*\n`;
    msg += `Owner: Shuvam Behera | Nuapatna, Cuttack\n`;
    msg += `Contact: +91-${settings.ownerPhone}\n`;
    msg += `===============================\n`;
    msg += `*LATEST WHOLESALE PRICE LIST*\n`;
    msg += `*(Strictly Sold in Full Packets Only - 6/12 pcs)*\n\n`;

    filtered.forEach((p, idx) => {
      const pieceRate = Math.round(p.sellingPrice / p.packSize);
      msg += `${idx + 1}. *${p.name}*\n`;
      msg += `   - Pack: ${p.packSize} pcs | ₹${p.sellingPrice}/pkt (₹${pieceRate}/pc)\n`;
    });

    msg += `\n===============================\n`;
    msg += `*Wholesale Terms:*\n`;
    msg += `• Minimum order: ₹1,000 in full packets\n`;
    msg += `• Advance booking: ₹1,000\n`;
    msg += `• Free delivery within 150 km of Nuapatna\n`;
    msg += `• Continuous unboxing video required for damage claims\n`;
    msg += `\n*Reply with your required items & packet count!*`;

    return encodeURIComponent(msg);
  };

  const copyTextList = () => {
    let msg = `RUPAM B2B WHOLESALE PRICE LIST\nNuapatna, Cuttack\n\n`;
    filtered.forEach((p, idx) => {
      const pieceRate = Math.round(p.sellingPrice / p.packSize);
      msg += `${idx + 1}. ${p.name} - ₹${p.sellingPrice} per packet (${p.packSize} pcs, ₹${pieceRate}/pc)\n`;
    });
    navigator.clipboard.writeText(msg);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    showToast('Price list copied to clipboard!', 'success');
  };

  return (
    <div className="space-y-4 pb-28">
      {/* Top Banner */}
      <div className="glass-card rounded-3xl p-4.5 border border-white/90 shadow-sm relative overflow-hidden bg-gradient-to-br from-sky-500/10 via-indigo-500/10 to-transparent">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700 bg-sky-100/80 px-2 py-0.5 rounded-full inline-block mb-1">
              Wholesale Rate Card
            </span>
            <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
              Wholesale Rate Card & Price List
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Dukandaro ko 1-click me WhatsApp par share karne yogya rate list
            </p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 text-white flex items-center justify-center shadow-md shadow-sky-500/25 shrink-0">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mt-3.5">
          <a
            href={`https://wa.me/?text=${generateWhatsAppRateCard()}`}
            target="_blank"
            rel="noreferrer"
            className="flex-1 py-2.5 px-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/25 active:scale-95 transition"
          >
            <Share2 className="w-4 h-4" /> Share on WhatsApp
          </a>
          <button
            onClick={copyTextList}
            className="py-2.5 px-3.5 rounded-2xl bg-slate-900 hover:bg-black text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs active:scale-95 transition"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items (e.g. Matte Lipstick, Kajal, Bindi)..."
            className="w-full pl-9 pr-3 py-2 rounded-2xl bg-white border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-sky-500/40"
          />
        </div>

        {/* Category Chips */}
        <div className="overflow-x-auto no-scrollbar flex items-center gap-1.5 pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-slate-900 text-white font-bold'
                  : 'bg-white text-slate-600 font-medium border border-slate-200/80'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Product Rate Items */}
      <div className="space-y-4">
        {role === 'supplier' ? (
          (() => {
            const loggedInSupplier = suppliers.find((s) => s.id === user?.supplierId) || suppliers[0];
            const activeSupplierId = loggedInSupplier?.id || 'sup-1';
            const mySupplied = filtered.filter(
              (p) => p.supplierId === activeSupplierId || (p.brand && loggedInSupplier?.brands?.includes(p.brand))
            );
            const otherSupplied = filtered.filter(
              (p) => !(p.supplierId === activeSupplierId || (p.brand && loggedInSupplier?.brands?.includes(p.brand)))
            );

            return (
              <div className="space-y-4">
                {/* 1. TOP: My Brand Products */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>My Supplied Brand Items ({mySupplied.length})</span>
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      {loggedInSupplier?.name || 'My Sourcing'}
                    </span>
                  </div>

                  {mySupplied.map((p) => {
                    const pieceRate = Math.round(p.sellingPrice / p.packSize);
                    return (
                      <div
                        key={p.id}
                        className="glass-card rounded-2xl p-3.5 border-2 border-emerald-200/90 shadow-xs flex items-center justify-between gap-3 bg-white"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-xs shrink-0 border border-emerald-200">
                            {p.packSize}P
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-emerald-600 text-white">
                                My Supply
                              </span>
                              <h4 className="font-bold text-slate-900 text-xs truncate">{p.name}</h4>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {p.category} • Sourced @ ₹{p.purchaseCost} • Hub Stock: {p.packetStock} pkts
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-sm font-black text-slate-900 block leading-tight">
                            ₹{p.sellingPrice}
                          </span>
                          <span className="text-[10px] font-semibold text-emerald-600 block">
                            (₹{pieceRate}/pc)
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  {mySupplied.length === 0 ? (
                    <div className="p-6 text-center bg-white rounded-2xl border border-slate-200">
                      <p className="text-xs text-slate-500">No products mapped under this supplier ID.</p>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })()
        ) : (
          <div>
            <div className="flex items-center justify-between px-1 mb-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                Rate List ({filtered.length} Items)
              </span>
              <span className="text-[11px] font-bold text-sky-600">
                Kewal Full Packet Bikri (6/12 pieces)
              </span>
            </div>

            <div className="space-y-2">
              {filtered.map((p) => {
                const pieceRate = Math.round(p.sellingPrice / p.packSize);
                return (
                  <div
                    key={p.id}
                    className="glass-card rounded-2xl p-3.5 border border-white/90 shadow-xs flex items-center justify-between gap-3 bg-white/80"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-black text-xs shrink-0 border border-sky-100">
                        {p.packSize}P
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-slate-900 text-xs truncate">{p.name}</h4>
                        <p className="text-[11px] text-slate-500">
                          {p.category} • SKU: {p.sku} • {p.shadeOrSize}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-sm font-black text-slate-900 block leading-tight">
                        ₹{p.sellingPrice}
                      </span>
                      <span className="text-[10px] font-semibold text-emerald-600 block">
                        (₹{pieceRate}/pc)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Wholesale Rules reminder */}
      <div className="glass-card rounded-2xl p-3.5 border border-sky-100 bg-sky-50/50 space-y-1 text-[11px] text-slate-600">
        <span className="font-bold text-sky-900 block">⚠️ Rupam Wholesale Rules:</span>
        <p>• Minimum wholesale order ₹1,000 hona zaroori hai. Loose piece nahi diye jaate.</p>
        <p>• Parcel book karne ke liye ₹1,000 advance zaroori hai.</p>
        <p>• Nuapatna se 150 km ke andar bus ya delivery van se free delivery.</p>
      </div>
    </div>
  );
};
