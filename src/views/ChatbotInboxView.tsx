import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ChatbotEnquiry } from '../types';
import { Inbox, Phone, MessageSquare, ArrowRight, UserPlus, ShoppingBag, CheckCircle2 } from 'lucide-react';

export const ChatbotInboxView: React.FC = () => {
  const { enquiries, convertEnquiryToOrder, showToast, settings } = useApp();

  const [activeTab, setActiveTab] = useState<'inbox' | 'templates'>('inbox');

  const templates = [
    {
      title: 'Min Order & Pack Size Policy',
      text: 'Namaste! Rupam B2B Wholesale rule: Minimum order is ₹1,000 in full packets (6 or 12 pcs). ₹1,000 advance required for booking confirmation.',
    },
    {
      title: '150 km Free Delivery Policy',
      text: 'Namaste! We offer 100% Free Delivery within 150 km radius of Nuapatna, Cuttack. Expected delivery within 1-5 days via bus or delivery vehicle.',
    },
    {
      title: 'Continuous Unboxing Video Policy',
      text: 'Important: To protect your parcel against transit damage, please record an uncut continuous unboxing video from sealed opening. No claim without video.',
    },
    {
      title: 'Udhaar / Credit Policy',
      text: 'Rupam wholesale operates without general credit. On delivery, only up to 10% change shortage is allowed as udhaar, which must be cleared before your next order.',
    },
  ];

  return (
    <div className="space-y-4 pb-28">
      {/* Header */}
      <div className="glass-card rounded-3xl p-4.5 border border-white/90 shadow-md">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-500 text-white flex items-center justify-center">
            <Inbox className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">WhatsApp Chatbot Leads</h2>
            <p className="text-xs text-slate-500">4 Points collected: Shop+Owner, Address+Landmark, Items, Phone</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex rounded-2xl bg-slate-100 p-1 border border-slate-200/80">
        <button
          onClick={() => setActiveTab('inbox')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'inbox' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
          }`}
        >
          Enquiries ({enquiries.length})
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'templates' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
          }`}
        >
          Quick-Reply Templates
        </button>
      </div>

      {/* Tab 1: Enquiries */}
      {activeTab === 'inbox' && (
        <div className="space-y-3">
          {enquiries.map((e) => (
            <div
              key={e.id}
              className="glass-card rounded-3xl p-4 border border-white/90 shadow-sm space-y-2.5"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{e.shopName}</h3>
                  <p className="text-xs text-slate-500">{e.ownerName} • {e.phone}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{e.address}, {e.landmark}</p>
                </div>

                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    e.status === 'New'
                      ? 'bg-sky-100 text-sky-800'
                      : e.status === 'Converted'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {e.status}
                </span>
              </div>

              {/* Product inquiry text */}
              <div className="p-2.5 rounded-xl bg-slate-50 text-xs text-slate-700 border border-slate-100">
                <span className="font-bold block text-slate-500 text-[10px] uppercase">Requested Items:</span>
                {e.productListText}
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 gap-2">
                <div className="flex gap-1.5">
                  <a
                    href={`tel:${e.phone}`}
                    className="w-8 h-8 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center"
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                  <a
                    href={`https://wa.me/91${e.phone.replace(/\D/g, '')}?text=Namaste%20${encodeURIComponent(
                      e.shopName
                    )}!%20Shuvam%20Behera%20from%20Rupam%20Wholesale%20here.`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </a>
                </div>

                {e.status !== 'Converted' && (
                  <button
                    onClick={() => convertEnquiryToOrder(e.id)}
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-white font-bold text-xs flex items-center gap-1 shadow-xs"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" /> Convert to Order
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 2: WhatsApp Templates */}
      {activeTab === 'templates' && (
        <div className="space-y-3">
          {templates.map((t, idx) => (
            <div key={idx} className="glass-card rounded-3xl p-4 border border-white/90 shadow-sm space-y-2">
              <h4 className="font-bold text-slate-900 text-xs">{t.title}</h4>
              <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                {t.text}
              </p>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(t.text);
                  showToast('Template copied to clipboard!');
                }}
                className="text-xs text-sky-600 font-bold hover:underline block text-right"
              >
                Copy Text
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
