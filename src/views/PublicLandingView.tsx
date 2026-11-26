import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Sparkles,
  Phone,
  MessageSquare,
  ShieldCheck,
  Truck,
  Package,
  MapPin,
  CheckCircle2,
  ArrowRight,
  Send,
} from 'lucide-react';

export const PublicLandingView: React.FC<{ onBackToApp?: () => void }> = ({ onBackToApp }) => {
  const { settings, showToast, addCustomerRegistration } = useApp();

  const [shopName, setShopName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [itemsList, setItemsList] = useState('');
  const [submittedAtDisplay, setSubmittedAtDisplay] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmitEnquiry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopName.trim() || !ownerName.trim() || phone.replace(/\D/g, '').length < 10 || !address.trim()) {
      showToast('Please fill Dokan Name, Owner Name, 10-digit WhatsApp Number and Address', 'error');
      return;
    }
    const created = addCustomerRegistration({
      shopName: shopName.trim(),
      ownerName: ownerName.trim(),
      whatsapp: phone.replace(/\D/g, '').slice(-10),
      address: itemsList.trim() ? `${address.trim()} (${itemsList.trim()})` : address.trim(),
      source: 'Google Form',
    });
    setSubmittedAtDisplay(created.registeredAtDisplay);
    setSubmitted(true);
    showToast('Retailer Registration received! Sent to Owner Home & Google Sheet.');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-indigo-50 text-slate-800 pb-20">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 px-2.5 sm:px-5 md:px-6 py-3 bg-white/80 backdrop-blur-md border-b border-slate-200/60">
        <div className="w-full flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl overflow-hidden bg-sky-50 flex items-center justify-center shadow-md border border-white">
              <img
                src="/assets/aistudio/IMG_20261113_083134_a6a26f75.jpg"
                alt="Rupam App Icon"
                className="w-full h-full object-cover scale-[1.09]"
              />
            </div>
            <div>
              <h1 className="font-bold text-slate-900 text-sm leading-tight">Rupam Wholesale</h1>
              <p className="text-[11px] text-slate-500">Nuapatna, Cuttack • Odisha</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`https://wa.me/91${settings.ownerPhone.replace(/\D/g, '')}?text=Namaste!%20I%20want%20wholesale%20cosmetics%20catalogue`}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center gap-1 shadow-xs"
            >
              <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
            </a>
            {onBackToApp && (
              <button
                onClick={onBackToApp}
                className="px-2.5 py-1.5 rounded-xl bg-slate-900 text-white font-bold text-xs"
              >
                App Login
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="w-full px-2.5 sm:px-5 md:px-6 pt-5 space-y-4">
        <div className="text-center space-y-2">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-800 border border-sky-200 inline-block">
            B2B Cosmetic & FMCG Wholesale
          </span>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-snug">
            Direct Wholesale Cosmetics for Odisha Retailers
          </h2>
          <p className="text-xs text-slate-600 max-w-xs mx-auto leading-relaxed">
            Supplying cosmetics, beauty items, and fancy goods to shopkeepers across Cuttack, Bhubaneswar, Jajpur, Kendrapara and all Odisha.
          </p>
        </div>

        {/* 3 Core Value Props */}
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="glass-card rounded-2xl p-3 border border-white shadow-xs">
            <Truck className="w-5 h-5 text-sky-600 mx-auto mb-1" />
            <span className="font-bold text-slate-900 block text-[11px]">Free Delivery</span>
            <span className="text-[10px] text-slate-500">150 km Radius</span>
          </div>
          <div className="glass-card rounded-2xl p-3 border border-white shadow-xs">
            <Package className="w-5 h-5 text-blue-600 mx-auto mb-1" />
            <span className="font-bold text-slate-900 block text-[11px]">Min ₹1,000</span>
            <span className="text-[10px] text-slate-500">Full 6/12 packs</span>
          </div>
          <div className="glass-card rounded-2xl p-3 border border-white shadow-xs">
            <ShieldCheck className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
            <span className="font-bold text-slate-900 block text-[11px]">Quality Assured</span>
            <span className="text-[10px] text-slate-500">Unboxing video rule</span>
          </div>
        </div>

        {/* Wholesale Product Categories */}
        <div className="glass-card rounded-3xl p-4.5 border border-white shadow-md">
          <h3 className="font-bold text-slate-900 text-sm mb-3">Popular Wholesale Categories</h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {['Lipstick & Gloss (6/12pk)', 'HD Nail Polish Packs', 'Herbal Kajal & Eyeliner', 'Bridal Makeup Kits', 'Korean Hair Clips', 'Sojat Organic Mehendi'].map((cat, i) => (
              <div key={i} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 font-semibold text-slate-800 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-sky-500" /> {cat}
              </div>
            ))}
          </div>
        </div>

        {/* Built-in Retailer Registration Google Form */}
        <div className="glass-card rounded-3xl p-5 border border-white shadow-md">
          <h3 className="font-bold text-slate-900 text-sm mb-1">New Retailer Registration (Google Form)</h3>
          <p className="text-xs text-slate-500 mb-3">Fill Dokan Name, Owner Name, WhatsApp & Address — saved to Owner Home & Google Sheet</p>

          {submitted ? (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center text-xs text-emerald-900 space-y-1.5">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-1" />
              <span className="font-bold block text-sm">Dhanyabad! Registration Received</span>
              <p className="text-[11px] font-semibold">Date & Time: {submittedAtDisplay}</p>
              <p>Shuvam Behera (Rupam Nuapatna) has received your shop details and will approve your Retailer ID shortly.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmitEnquiry} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-600 block mb-1">1. Dokan Name (Shop Name) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Maa Tarini Fancy Store"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1">2. Owner Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Sahoo"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1">3. WhatsApp Number *</label>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  placeholder="10-digit WhatsApp number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1">4. Full Address *</label>
                <input
                  type="text"
                  required
                  placeholder="Market name, Town, District, PIN"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1">5. Products Interested In (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Lipstick 12pk, Nail Polish, Bindi, Mehendi"
                  value={itemsList}
                  onChange={(e) => setItemsList(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 text-white font-bold text-sm shadow-md active:scale-98 transition flex items-center justify-center gap-1.5"
              >
                <Send className="w-4 h-4" /> Submit Registration to Shuvam Behera
              </button>
            </form>
          )}
        </div>

        {/* Location & Contact Info */}
        <div className="glass-card rounded-3xl p-4.5 border border-white shadow-md text-xs text-slate-600 space-y-2">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <MapPin className="w-4 h-4 text-sky-600" /> Nuapatna Wholesale Office
          </div>
          <p>Nuapatna, Cuttack, Odisha 754035 (Near Daily Market Square)</p>
          <p>Proprietor: Shuvam Behera • Phone: {settings.ownerPhone}</p>
        </div>
      </div>
    </div>
  );
};
