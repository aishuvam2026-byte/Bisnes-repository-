import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Contact, Phone, MessageSquare, Download, Search, Plus, User } from 'lucide-react';

export const ContactsView: React.FC = () => {
  const { customers, suppliers, settings, showToast } = useApp();
  const [searchQuery, setSearchQuery] = useState('');

  // Combined contacts list
  const allContacts = [
    ...customers.map((c) => ({
      id: c.id,
      name: c.ownerName,
      company: c.shopName,
      phone: c.phone,
      tag: 'Retailer',
      city: c.city,
    })),
    ...suppliers.map((s) => ({
      id: s.id,
      name: s.name,
      company: s.brandAuth,
      phone: s.phone,
      tag: 'Supplier',
      city: 'Burrabazar / Sojat',
    })),
    {
      id: 'driver-1',
      name: 'Babu Jena (Tempo Driver)',
      company: 'Nuapatna Cuttack Freight',
      phone: '9437198765',
      tag: 'Driver',
      city: 'Nuapatna',
    },
    {
      id: 'driver-2',
      name: 'Kalia Rout (Bus Conductor)',
      company: 'Maa Tarini Bus OD-05',
      phone: '9861054321',
      tag: 'Driver',
      city: 'Cuttack',
    },
  ];

  const filtered = allContacts.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery)
  );

  // Generate vCard for phone import
  const handleExportVCard = (contact: (typeof allContacts)[0]) => {
    const vCardData = `BEGIN:VCARD
VERSION:3.0
FN:${contact.name} (${contact.company})
ORG:${contact.company}
TEL;TYPE=CELL:${contact.phone}
NOTE:Rupam B2B Wholesale Contact (${contact.tag})
END:VCARD`;

    const blob = new Blob([vCardData], { type: 'text/vcard' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${contact.name.replace(/\s+/g, '_')}.vcf`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`vCard for ${contact.name} exported! Open on phone to save.`);
  };

  return (
    <div className="space-y-4 pb-28">
      {/* Header */}
      <div className="glass-card rounded-3xl p-4.5 border border-white/90 shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-violet-600 text-white flex items-center justify-center">
                <Contact className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-slate-900">Saved Business Contacts</h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">Retailers, C&amp;F suppliers, drivers &amp; bus conductors</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search contact, shop, or driver..."
          className="w-full pl-9 pr-3.5 py-2.5 rounded-2xl bg-white/90 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-xs"
        />
      </div>

      {/* Contacts List */}
      <div className="space-y-2.5">
        {filtered.map((c) => (
          <div
            key={c.id}
            className="glass-card rounded-2xl p-3.5 border border-white/90 shadow-sm flex items-center justify-between gap-3"
          >
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-slate-900 text-xs">{c.name}</h4>
                <span
                  className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                    c.tag === 'Retailer'
                      ? 'bg-sky-100 text-sky-800'
                      : c.tag === 'Supplier'
                      ? 'bg-teal-100 text-teal-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {c.tag}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">{c.company} • {c.city}</p>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <a
                href={`tel:${c.phone}`}
                className="w-8 h-8 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center hover:bg-sky-100 transition"
                title="Call"
              >
                <Phone className="w-3.5 h-3.5" />
              </a>
              <a
                href={`https://wa.me/91${c.phone.replace(/\D/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center hover:bg-emerald-100 transition"
                title="WhatsApp"
              >
                <MessageSquare className="w-3.5 h-3.5" />
              </a>
              <button
                onClick={() => handleExportVCard(c)}
                className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center hover:bg-slate-200 transition"
                title="Export vCard to Phone Contacts"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
