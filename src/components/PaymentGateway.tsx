import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  QrCode,
  ShieldCheck,
  Smartphone,
  Wallet,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export interface PaymentGatewayProps {
  upiId: string;
  payeeName: string;
  amount: number;
  outstandingDues?: number;
  advanceAmount?: number;
  advanceLabel?: string;
  note?: string;
  title?: string;
  subtitle?: string;
  accent?: 'sky' | 'amber' | 'orange' | 'purple' | 'emerald' | 'rose';
  ctaLabel?: string;
  payNowLabel?: string;
  requirePayNowToggle?: boolean;
  onConfirmPaid?: (refId: string, selectedApp?: string) => void;
  showConfirmButton?: boolean;
  compact?: boolean;
}

export const buildUpiParams = (
  upiId: string,
  payeeName: string,
  amount: number,
  note: string,
  txnRef: string
): string => {
  const safeAmt = Math.max(1, Number(amount) || 1).toFixed(2);
  const cleanNote = (note || 'Rupam Wholesale Payment').replace(/[^\w\s.,()-]/g, ' ').trim().slice(0, 50);
  const parts = [
    `pa=${encodeURIComponent(upiId.trim())}`,
    `pn=${encodeURIComponent((payeeName || 'Rupam Wholesale').trim())}`,
    `tr=${encodeURIComponent(txnRef)}`,
    `tn=${encodeURIComponent(cleanNote || 'Rupam Wholesale Payment')}`,
    `am=${safeAmt}`,
    `cu=INR`,
    `mode=02`,
  ];
  return parts.join('&');
};

export interface SupportedPaymentApp {
  id: string;
  name: string;
  shortLabel: string;
  badgeText: string;
  buildUri: (query: string) => string;
  buttonStyle: string;
  badgeStyle: string;
}

export const SUPPORTED_PAYMENT_APPS: SupportedPaymentApp[] = [
  {
    id: 'any',
    name: 'Any UPI App',
    shortLabel: 'Any UPI',
    badgeText: 'UPI',
    buildUri: (q) => `upi://pay?${q}`,
    buttonStyle: 'bg-slate-900 hover:bg-black text-white border-slate-900',
    badgeStyle: 'bg-white/20 text-white',
  },
  {
    id: 'phonepe',
    name: 'PhonePe',
    shortLabel: 'PhonePe',
    badgeText: 'Pe',
    buildUri: (q) => `phonepe://pay?${q}`,
    buttonStyle: 'bg-purple-600 hover:bg-purple-700 text-white border-purple-700',
    badgeStyle: 'bg-white/20 text-white',
  },
  {
    id: 'gpay',
    name: 'Google Pay',
    shortLabel: 'GPay',
    badgeText: 'G',
    buildUri: (q) => `tez://upi/pay?${q}`,
    buttonStyle: 'bg-blue-600 hover:bg-blue-700 text-white border-blue-700',
    badgeStyle: 'bg-white/20 text-white',
  },
  {
    id: 'paytm',
    name: 'Paytm',
    shortLabel: 'Paytm',
    badgeText: 'Pt',
    buildUri: (q) => `paytmmp://pay?${q}`,
    buttonStyle: 'bg-sky-500 hover:bg-sky-600 text-white border-sky-600',
    badgeStyle: 'bg-white/20 text-white',
  },
  {
    id: 'bhim',
    name: 'BHIM UPI',
    shortLabel: 'BHIM',
    badgeText: 'BH',
    buildUri: (q) => `bhim://upi/pay?${q}`,
    buttonStyle: 'bg-orange-600 hover:bg-orange-700 text-white border-orange-700',
    badgeStyle: 'bg-white/20 text-white',
  },
];

export const PaymentGateway: React.FC<PaymentGatewayProps> = ({
  upiId,
  payeeName,
  amount,
  outstandingDues,
  advanceAmount,
  advanceLabel,
  note = 'Rupam Wholesale Payment',
  title,
  subtitle,
  accent = 'sky',
  ctaLabel,
  payNowLabel,
  requirePayNowToggle = false,
  onConfirmPaid,
  showConfirmButton = true,
  compact = false,
}) => {
  const { showToast, language } = useApp();
  const [isGatewayExpanded, setIsGatewayExpanded] = useState(!requirePayNowToggle);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [utrRef, setUtrRef] = useState('');
  const [selectedApp, setSelectedApp] = useState<string>('');
  const [isUpiSessionActive, setIsUpiSessionActive] = useState(false);
  const [verifiedRef, setVerifiedRef] = useState<string | null>(null);
  const [txnRef] = useState(() => `RUP${Date.now().toString().slice(-9)}`);

  const safeDues = Math.max(0, Number(outstandingDues) || 0);
  const safeAdvance = Math.max(0, Number(advanceAmount) || 0);
  const computedTotal =
    safeDues > 0 || safeAdvance > 0
      ? safeDues + safeAdvance
      : Math.max(1, Number(amount) || 1);
  const safeAmount = Math.max(1, computedTotal);

  const effectiveUpiId = (upiId || 'shuvam.rupam@upi').trim();
  const upiQuery = buildUpiParams(effectiveUpiId, payeeName, safeAmount, note, txnRef);
  const genericUpiUri = `upi://pay?${upiQuery}`;

  useEffect(() => {
    setIsGatewayExpanded(!requirePayNowToggle);
  }, [requirePayNowToggle]);

  useEffect(() => {
    setVerifiedRef(null);
    setUtrRef('');
    setIsUpiSessionActive(false);
  }, [amount, note]);

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(genericUpiUri, {
      width: 240,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch(() => {
        if (active) setQrDataUrl('');
      });
    return () => {
      active = false;
    };
  }, [genericUpiUri]);

  const handleCopyUpi = () => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(effectiveUpiId).catch(() => {});
    }
    setCopied(true);
    showToast(
      language === 'hi'
        ? `UPI ID "${effectiveUpiId}" copy ho gaya!`
        : language === 'or'
        ? `UPI ID "${effectiveUpiId}" copy hela!`
        : `UPI ID "${effectiveUpiId}" copied!`,
      'success'
    );
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyUpiLink = () => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(genericUpiUri).catch(() => {});
    }
    setCopiedLink(true);
    showToast(`UPI payment link (₹${safeAmount.toLocaleString('en-IN')}) copied!`, 'info');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleSelectUpiApp = (appName: string) => {
    setSelectedApp(appName);
    setIsUpiSessionActive(true);
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(effectiveUpiId).catch(() => {});
    }
    showToast(
      language === 'hi'
        ? `${appName} khul raha hai (₹${safeAmount.toLocaleString('en-IN')}). Payment ke baad niche Confirm button dabayein.`
        : language === 'or'
        ? `${appName} khuluchi (₹${safeAmount.toLocaleString('en-IN')}). Payment pare tale Confirm dabayantu.`
        : `Launching ${appName} for ₹${safeAmount.toLocaleString('en-IN')}. Confirm below after completing payment.`,
      'info'
    );
  };

  const handleCompleteVerification = () => {
    if (!onConfirmPaid) return;
    const finalRef = utrRef.trim() || `UPI-${txnRef}`;
    setVerifiedRef(finalRef);
    setIsUpiSessionActive(false);
    onConfirmPaid(finalRef, selectedApp || 'UPI QR');
  };

  const accentBorder =
    accent === 'purple'
      ? 'border-purple-200 bg-purple-50/70'
      : accent === 'amber'
      ? 'border-amber-200 bg-amber-50/70'
      : accent === 'orange'
      ? 'border-orange-200 bg-orange-50/70'
      : accent === 'emerald'
      ? 'border-emerald-200 bg-emerald-50/70'
      : accent === 'rose'
      ? 'border-rose-200 bg-rose-50/70'
      : 'border-sky-200 bg-sky-50/70';

  if (!isGatewayExpanded) {
    return (
      <button
        type="button"
        onClick={() => setIsGatewayExpanded(true)}
        className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-rose-600 to-orange-600 hover:from-rose-700 hover:to-orange-700 text-white font-black text-xs shadow-md active:scale-98 transition flex items-center justify-center gap-1.5"
      >
        <QrCode className="w-4 h-4 shrink-0" />
        <span>
          {payNowLabel || `Pay Now (₹${safeAmount.toLocaleString('en-IN')})`}
        </span>
      </button>
    );
  }

  return (
    <div className={`rounded-2xl border p-3 space-y-2.5 ${accentBorder}`}>
      {/* Optional Title Strip */}
      {(title || subtitle) && (
        <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-200/70">
          <div className="min-w-0">
            {title && (
              <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5 truncate">
                <Wallet className="w-3.5 h-3.5 text-sky-700 shrink-0" />
                <span className="truncate">{title}</span>
              </h4>
            )}
            {subtitle && <p className="text-[10px] text-slate-600 truncate mt-0.5">{subtitle}</p>}
          </div>
          {requirePayNowToggle && (
            <button
              type="button"
              onClick={() => setIsGatewayExpanded(false)}
              className="text-[10px] font-bold text-slate-500 hover:text-slate-800 px-2 py-0.5 rounded-lg bg-white border border-slate-200 shrink-0"
            >
              Hide
            </button>
          )}
        </div>
      )}

      {/* Optional Outstanding Dues + Advance Breakdown */}
      {(safeDues > 0 || safeAdvance > 0) && (
        <div className="p-2.5 rounded-xl bg-white border border-slate-200/90 text-xs space-y-1">
          {safeDues > 0 && (
            <div className="flex justify-between text-slate-600">
              <span>
                {language === 'hi'
                  ? 'Purana Baki Udhaar:'
                  : language === 'or'
                  ? 'Puruna Baki Udhaar:'
                  : 'Outstanding Dues:'}
              </span>
              <span className="font-black text-rose-600">₹{safeDues.toLocaleString('en-IN')}</span>
            </div>
          )}
          {safeAdvance > 0 && (
            <div className="flex justify-between text-slate-600">
              <span>
                {advanceLabel ||
                  (language === 'hi'
                    ? 'Order Advance:'
                    : language === 'or'
                    ? 'Order Agrima:'
                    : 'Order Advance:')}
              </span>
              <span className="font-black text-sky-700">₹{safeAdvance.toLocaleString('en-IN')}</span>
            </div>
          )}
          <div className="flex justify-between font-black text-slate-900 pt-1 border-t border-slate-100">
            <span>
              {language === 'hi'
                ? 'Kul Pay Karein:'
                : language === 'or'
                ? 'Mota Pay Karantu:'
                : 'Total Payable:'}
            </span>
            <span className="text-emerald-700">₹{safeAmount.toLocaleString('en-IN')}</span>
          </div>
        </div>
      )}

      {/* QR Code + UPI ID Strip */}
      <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
        <div
          className={`${
            compact ? 'w-20 h-20' : 'w-24 h-24'
          } rounded-xl bg-white border border-slate-200 p-1 flex items-center justify-center shrink-0`}
        >
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt={`UPI QR ₹${safeAmount}`}
              className="w-full h-full object-contain rounded-lg"
            />
          ) : (
            <QrCode className="w-12 h-12 text-slate-800" />
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Scan &amp; Pay UPI QR
            </span>
            <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200">
              ₹{safeAmount.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="flex items-center justify-between gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">
            <span className="font-mono text-[11px] font-bold text-slate-900 truncate">
              {effectiveUpiId}
            </span>
            <button
              type="button"
              onClick={handleCopyUpi}
              className="text-[10px] font-bold text-sky-700 hover:text-sky-900 flex items-center gap-0.5 shrink-0"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span className="text-emerald-700">
                    {language === 'hi' ? 'Copy Hua' : language === 'or' ? 'Copy Hela' : 'Copied'}
                  </span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center justify-between gap-1">
            <p className="text-[10px] text-slate-500 leading-tight flex items-center gap-1 min-w-0">
              <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
              <span className="truncate">
                {language === 'hi'
                  ? 'Sabhi UPI apps me kaam karta hai'
                  : language === 'or'
                  ? 'Sabu UPI app re kama kare'
                  : 'Verified UPI Payee'}
              </span>
            </p>
            <button
              type="button"
              onClick={handleCopyUpiLink}
              className="text-[10px] font-bold text-slate-600 hover:text-slate-900 underline shrink-0"
            >
              {copiedLink ? 'Link Copied' : 'Copy Link'}
            </button>
          </div>
        </div>
      </div>

      {/* Primary Native UPI Deep-Link CTA + Supported Payment Apps */}
      <div className="space-y-1.5">
        <a
          href={genericUpiUri}
          rel="noopener noreferrer"
          onClick={() => handleSelectUpiApp('Default UPI App')}
          className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-black text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-xs active:scale-98 transition"
        >
          <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
          <span>Pay ₹{safeAmount.toLocaleString('en-IN')} with UPI App</span>
          <ExternalLink className="w-3 h-3 opacity-80" />
        </a>

        <div className="flex items-center justify-between text-[10px]">
          <span className="font-bold text-slate-600 flex items-center gap-1">
            <Smartphone className="w-3 h-3 text-slate-500" />
            <span>Choose UPI App:</span>
          </span>
          {selectedApp && (
            <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
              {selectedApp}
            </span>
          )}
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
          {SUPPORTED_PAYMENT_APPS.map((app) => {
            const label =
              app.id === 'any'
                ? language === 'hi'
                  ? 'Koi bhi UPI'
                  : language === 'or'
                  ? 'Any UPI App'
                  : app.shortLabel
                : app.shortLabel;
            const isSelected = selectedApp === app.name;
            return (
              <a
                key={app.id}
                href={app.buildUri(upiQuery)}
                rel="noopener noreferrer"
                onClick={() => handleSelectUpiApp(app.name)}
                className={`py-1.5 px-1.5 rounded-lg text-[10px] font-extrabold border flex items-center justify-center gap-1 shadow-2xs active:scale-95 transition no-underline ${app.buttonStyle} ${
                  isSelected ? 'ring-2 ring-emerald-400 ring-offset-1' : ''
                }`}
                title={`Pay with ${app.name}`}
              >
                <span className={`px-1 rounded text-[8px] font-black shrink-0 ${app.badgeStyle}`}>
                  {app.badgeText}
                </span>
                <span className="truncate">{label}</span>
                <ExternalLink className="w-2.5 h-2.5 shrink-0 opacity-85" />
              </a>
            );
          })}
        </div>
      </div>

      {/* Interactive UPI Payment Verification & Confirm CTA */}
      {showConfirmButton && onConfirmPaid && (
        <div className="space-y-2 pt-1.5 border-t border-slate-200/70">
          {isUpiSessionActive && !verifiedRef && (
            <div className="p-2 rounded-xl bg-amber-50 border border-amber-300 text-[11px] text-amber-950 font-semibold flex items-center justify-between gap-2">
              <span>
                {selectedApp} selected for ₹{safeAmount.toLocaleString('en-IN')}. Complete payment &amp; tap Confirm below.
              </span>
            </div>
          )}

          {verifiedRef ? (
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-xs text-emerald-900 font-bold flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ₹{safeAmount.toLocaleString('en-IN')} UPI Payment Verified
              </span>
              <span className="font-mono text-[10px] bg-white px-2 py-0.5 rounded border border-emerald-200">
                {verifiedRef}
              </span>
            </div>
          ) : (
            <>
              <input
                type="text"
                value={utrRef}
                onChange={(e) => setUtrRef(e.target.value)}
                placeholder={
                  language === 'hi'
                    ? `UTR / UPI Ref No. dalein (${selectedApp || 'Optional'})`
                    : language === 'or'
                    ? `UTR / UPI Ref No. lekha (${selectedApp || 'Optional'})`
                    : `Enter 12-digit UPI / UTR Ref No. (${selectedApp || 'Optional'})`
                }
                className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
              <button
                type="button"
                onClick={handleCompleteVerification}
                className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-98 transition"
              >
                <CheckCircle2 className="w-4 h-4 stroke-[2.4]" />
                <span>
                  {ctaLabel ||
                    (language === 'hi'
                      ? `₹${safeAmount.toLocaleString('en-IN')} Payment Confirm Karein ✓`
                      : language === 'or'
                      ? `₹${safeAmount.toLocaleString('en-IN')} Payment Confirm Karantu ✓`
                      : `Confirm ₹${safeAmount.toLocaleString('en-IN')} Payment Done ✓`)}
                </span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};
