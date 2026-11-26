import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Globe,
  FileCode,
  CheckCircle2,
  Copy,
  ExternalLink,
  Search,
  Share2,
  ShieldAlert,
  Code,
  Check,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

export const SeoManagerView: React.FC = () => {
  const { settings, showToast } = useApp();
  const [copiedRobots, setCopiedRobots] = useState(false);
  const [copiedSitemap, setCopiedSitemap] = useState(false);
  const [copiedMeta, setCopiedMeta] = useState(false);

  const currentHost = typeof window !== 'undefined' ? window.location.origin : 'https://ais-pre-3vem2cgp33psllr4f4axbo-183095847228.asia-east1.run.app';
  const sitemapUrl = `${currentHost}/sitemap.xml`;
  const robotsUrl = `${currentHost}/robots.txt`;
  const landingUrl = `${currentHost}/landing`;

  const robotsContent = `# Robots.txt for Rupam Cosmetic & FMCG Wholesale
User-agent: *
Allow: /
Allow: /landing
Disallow: /app/
Disallow: /admin/
Disallow: /api/

Sitemap: ${sitemapUrl}`;

  const sitemapXmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${currentHost}/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${landingUrl}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
</urlset>`;

  const jsonLdSchema = JSON.stringify(
    {
      '@context': 'https://schema.org',
      '@type': 'WholesaleStore',
      name: 'Rupam Cosmetic & FMCG Wholesale',
      founder: 'Shuvam Behera',
      address: {
        '@type': 'PostalAddress',
        streetAddress: 'Nuapatna',
        addressLocality: 'Cuttack',
        addressRegion: 'Odisha',
        postalCode: '754035',
        addressCountry: 'IN',
      },
      telephone: `+91-${settings.ownerPhone}`,
      priceRange: '₹₹',
      description:
        'B2B Cosmetic & FMCG Wholesale supplier for Odisha shopkeepers. Lipsticks, Kajal, Bindi, Nail polish, Mehendi full packet wholesale.',
    },
    null,
    2
  );

  const copyToClipboard = (text: string, type: 'robots' | 'sitemap' | 'meta') => {
    navigator.clipboard.writeText(text);
    if (type === 'robots') {
      setCopiedRobots(true);
      setTimeout(() => setCopiedRobots(false), 2000);
    } else if (type === 'sitemap') {
      setCopiedSitemap(true);
      setTimeout(() => setCopiedSitemap(false), 2000);
    } else {
      setCopiedMeta(true);
      setTimeout(() => setCopiedMeta(false), 2000);
    }
    showToast('Copied to clipboard!', 'success');
  };

  return (
    <div className="space-y-4 pb-28">
      {/* Header Banner */}
      <div className="glass-card rounded-3xl p-4.5 border border-white/90 shadow-sm relative overflow-hidden bg-gradient-to-br from-emerald-500/10 via-sky-500/10 to-transparent">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full inline-block mb-1">
              Google Search & SEO Hub
            </span>
            <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
              Robots.txt & Sitemap Manager
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Google Search par Rupam Cosmetics rank karane aur crawling control tool
            </p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/25 shrink-0">
            <Globe className="w-5 h-5" />
          </div>
        </div>

        {/* Status Pills */}
        <div className="grid grid-cols-3 gap-2 mt-3.5">
          <div className="p-2.5 rounded-2xl bg-white/90 border border-emerald-200/80 text-center">
            <span className="text-[10px] text-slate-500 font-bold block">Robots.txt</span>
            <span className="text-xs font-black text-emerald-600 flex items-center justify-center gap-1 mt-0.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Active (Live)
            </span>
          </div>
          <div className="p-2.5 rounded-2xl bg-white/90 border border-sky-200/80 text-center">
            <span className="text-[10px] text-slate-500 font-bold block">Sitemap.xml</span>
            <span className="text-xs font-black text-sky-600 flex items-center justify-center gap-1 mt-0.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> 2 Pages
            </span>
          </div>
          <div className="p-2.5 rounded-2xl bg-white/90 border border-purple-200/80 text-center">
            <span className="text-[10px] text-slate-500 font-bold block">Indexing</span>
            <span className="text-xs font-black text-purple-600 flex items-center justify-center gap-1 mt-0.5">
              <Sparkles className="w-3.5 h-3.5" /> B2B Verified
            </span>
          </div>
        </div>
      </div>

      {/* Google SERP Preview Card */}
      <div className="glass-card rounded-3xl p-4 border border-white/90 shadow-xs space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
            <Search className="w-4 h-4 text-sky-600" /> Google Search Result Preview
          </span>
          <span className="text-[10px] text-slate-500 font-semibold">Live Snippet</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <div className="w-4 h-4 rounded-full bg-sky-500 text-white flex items-center justify-center text-[9px] font-bold">
              R
            </div>
            <span>{currentHost} › landing</span>
          </div>
          <h4 className="text-sm font-bold text-blue-700 hover:underline cursor-pointer leading-tight">
            Rupam B2B Cosmetic Wholesale | Nuapatna, Cuttack | Direct Factory Rates
          </h4>
          <p className="text-xs text-slate-600 leading-relaxed">
            Odisha's trusted cosmetic & FMCG wholesale platform. Lipsticks, Kajal, Bindi, Nail Polish & Makeup Kits in full packets. ₹1,000 min order, free delivery within 150 km of Nuapatna, Cuttack.
          </p>
        </div>
      </div>

      {/* Robots.txt Card */}
      <div className="glass-card rounded-3xl p-4 border border-white/90 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-1.5">
              <FileCode className="w-4 h-4 text-emerald-600" /> robots.txt Configuration
            </h3>
            <p className="text-[11px] text-slate-500">
              Search Engine Bots Permissions (Allow public, Disallow app & admin)
            </p>
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => copyToClipboard(robotsContent, 'robots')}
              className="px-2.5 py-1.5 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center gap-1 active:scale-95 transition"
            >
              {copiedRobots ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedRobots ? 'Copied' : 'Copy'}</span>
            </button>
            <a
              href={robotsUrl}
              target="_blank"
              rel="noreferrer"
              className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        <div className="rounded-2xl bg-slate-900 text-emerald-400 p-3 font-mono text-[11px] leading-relaxed overflow-x-auto">
          <pre>{robotsContent}</pre>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
          <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
          <span>
            <code>/app/</code> aur <code>/admin/</code> ko search engine se hide kiya gaya hai taaki business data secure rahe.
          </span>
        </div>
      </div>

      {/* Sitemap.xml Card */}
      <div className="glass-card rounded-3xl p-4 border border-white/90 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-1.5">
              <Code className="w-4 h-4 text-sky-600" /> sitemap.xml File
            </h3>
            <p className="text-[11px] text-slate-500">
              Google Search Console me submit karne ke liye
            </p>
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => copyToClipboard(sitemapUrl, 'sitemap')}
              className="px-2.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center gap-1 active:scale-95 transition"
            >
              {copiedSitemap ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSitemap ? 'URL Copied' : 'Copy URL'}</span>
            </button>
            <a
              href={sitemapUrl}
              target="_blank"
              rel="noreferrer"
              className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        <div className="rounded-2xl bg-slate-900 text-sky-300 p-3 font-mono text-[11px] leading-relaxed overflow-x-auto max-h-44">
          <pre>{sitemapXmlContent}</pre>
        </div>
      </div>

      {/* Schema.org Structured Data */}
      <div className="glass-card rounded-3xl p-4 border border-white/90 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" /> Schema.org LocalBusiness (JSON-LD)
            </h3>
            <p className="text-[11px] text-slate-500">Google Maps aur Search par shop ka rich snippet</p>
          </div>
          <button
            onClick={() => copyToClipboard(jsonLdSchema, 'meta')}
            className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1"
          >
            {copiedMeta ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedMeta ? 'Copied' : 'Copy JSON'}</span>
          </button>
        </div>

        <div className="rounded-2xl bg-slate-900 text-amber-300 p-3 font-mono text-[10px] leading-relaxed overflow-x-auto max-h-36">
          <pre>{jsonLdSchema}</pre>
        </div>
      </div>

      {/* Target Keywords for Cuttack & Odisha */}
      <div className="glass-card rounded-3xl p-4 border border-white/90 shadow-xs space-y-2">
        <h3 className="text-xs sm:text-sm font-black text-slate-900">
          Target Wholesale Keywords
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {[
            'Cosmetic Wholesale Nuapatna',
            'Cuttack Wholesale Market',
            'Lipstick Full Packets Wholesale',
            'Kajal & Bindi Wholesale Odisha',
            'FMCG Wholesale Cuttack',
            'Beauty Parlour Cosmetic Supplier',
            'Shuvam Behera Rupam',
            '150km Free Delivery Cosmetics',
          ].map((kw, i) => (
            <span
              key={i}
              className="text-[11px] font-semibold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-xl border border-slate-200/70"
            >
              {kw}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
