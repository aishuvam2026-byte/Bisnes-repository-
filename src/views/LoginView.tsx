import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { CustomerRegistration, Language, UserRole } from '../types';
import { tr } from '../data/translations';
import { signInWithGoogleFirebase } from '../firebase';
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  ExternalLink,
  FileSpreadsheet,
  Globe,
  KeyRound,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  RefreshCw,
  Shield,
  Store,
  UserPlus,
} from 'lucide-react';

export const LoginView: React.FC = () => {
  const {
    setUser,
    language,
    setLanguage,
    showToast,
    settings,
    verifyRetailerLogin,
    verifySupplierLogin,
    addCustomerRegistration,
    hasSheetsAuth,
    connectGoogleSheetsAccount,
    sheetTargets,
    syncOneTargetSheet,
    markRegistrationsSyncedToSheet,
  } = useApp();

  const [selectedRole, setSelectedRole] = useState<UserRole>('customer');
  const [retailerPortalMode, setRetailerPortalMode] = useState<'login' | 'register'>('login');
  const [method, setMethod] = useState<'phone' | 'email'>('phone');

  // Login Form states
  const [phone, setPhone] = useState('');
  const [identifierInput, setIdentifierInput] = useState('');
  const [password, setPassword] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpValues, setOtpValues] = useState(['', '', '', '', '', '']);
  const [resendTimer, setResendTimer] = useState(30);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // New Retailer Registration (Google Form) state
  const [regShopName, setRegShopName] = useState('');
  const [regOwnerName, setRegOwnerName] = useState('');
  const [regWhatsapp, setRegWhatsapp] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [liveDateTime, setLiveDateTime] = useState<string>(() =>
    new Date().toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  );
  const [submittedReg, setSubmittedReg] = useState<CustomerRegistration | null>(null);
  const [isSyncingSheet, setIsSyncingSheet] = useState(false);
  const [confirmSheetSave, setConfirmSheetSave] = useState(false);

  // Live clock for Registration Date & Time stamp
  useEffect(() => {
    const timer = setInterval(() => {
      setLiveDateTime(
        new Date().toLocaleString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        })
      );
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // Auto-decrement OTP timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (otpSent && resendTimer > 0) {
      interval = setInterval(() => setResendTimer((prev) => prev - 1), 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [otpSent, resendTimer]);

  const handleRoleChange = (nextRole: UserRole) => {
    setSelectedRole(nextRole);
    setAuthError(null);
    setOtpSent(false);
    setOtpValues(['', '', '', '', '', '']);
    setSubmittedReg(null);
    setConfirmSheetSave(false);
    if (nextRole !== 'customer') {
      setRetailerPortalMode('login');
    }
  };

  const handleSendOtp = () => {
    setAuthError(null);
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) {
      const msg = 'Please enter a valid 10-digit mobile number';
      setAuthError(msg);
      showToast(msg, 'error');
      return;
    }

    if (selectedRole === 'customer') {
      const check = verifyRetailerLogin(digits);
      if (!check.ok) {
        setAuthError(check.reason || 'Retailer ID not added by Owner.');
        showToast('Retailer ID Owner app me added nahi hai', 'error');
        return;
      }
    } else if (selectedRole === 'supplier') {
      const check = verifySupplierLogin(digits);
      if (!check.ok) {
        setAuthError(check.reason || 'Supplier ID not added by Owner.');
        showToast('Supplier ID Owner app me added nahi hai', 'error');
        return;
      }
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setOtpSent(true);
      setResendTimer(30);
      showToast('OTP sent to +91 ' + digits);
    }, 400);
  };

  const handleOtpChange = (index: number, val: string) => {
    if (val.length > 1) val = val.slice(-1);
    const newOtp = [...otpValues];
    newOtp[index] = val;
    setOtpValues(newOtp);

    if (val && index < 5) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleVerifyOtp = () => {
    setAuthError(null);
    const fullOtp = otpValues.join('');
    if (fullOtp.length < 6) {
      showToast('Please enter complete 6-digit OTP', 'error');
      return;
    }
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      if (selectedRole === 'owner') {
        setUser({
          id: 'owner-shuvam',
          name: `${settings.ownerName || 'Shuvam Behera'} (Owner)`,
          phone: phone || settings.ownerPhone || '1234567890',
          email: 'Rupamb2b@gmail.com',
          role: 'owner',
        });
        showToast(`Welcome back, ${settings.ownerName || 'Shuvam Behera'} (Owner)!`);
        return;
      }

      if (selectedRole === 'customer') {
        const check = verifyRetailerLogin(phone);
        if (!check.ok || !check.customer) {
          setAuthError(check.reason || 'Retailer ID not found in Owner list.');
          showToast('Login blocked: Owner ne yeh Retailer ID add nahi kiya hai', 'error');
          return;
        }
        const cust = check.customer;
        setUser({
          id: cust.id,
          name: `${cust.shopName} (${cust.ownerName})`,
          phone: cust.phone,
          email: cust.email || `${cust.id}@retailer.com`,
          role: 'customer',
          customerId: cust.id,
        });
        showToast(`Welcome, ${cust.shopName}!`);
        return;
      }

      // Supplier strict login
      const supCheck = verifySupplierLogin(phone);
      if (!supCheck.ok || !supCheck.supplier) {
        setAuthError(supCheck.reason || 'Supplier ID not found in Owner list.');
        showToast('Login blocked: Owner ne yeh Supplier ID add nahi kiya hai', 'error');
        return;
      }
      const supp = supCheck.supplier;
      setUser({
        id: supp.id,
        name: supp.name,
        phone: supp.phone,
        email: `${supp.id}@supplier.com`,
        role: 'supplier',
        supplierId: supp.id,
      });
      showToast(`Welcome, ${supp.name}!`);
    }, 400);
  };

  const handleIdentifierAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (!identifierInput.trim() || !password) {
      showToast('Please enter ID / Email and password', 'error');
      return;
    }
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      if (selectedRole === 'owner') {
        setUser({
          id: 'owner-shuvam',
          name: `${settings.ownerName || 'Shuvam Behera'} (Owner)`,
          phone: settings.ownerPhone || '1234567890',
          email: identifierInput.trim(),
          role: 'owner',
        });
        showToast(`Welcome, ${settings.ownerName || 'Shuvam Behera'}!`);
        return;
      }

      if (selectedRole === 'customer') {
        const check = verifyRetailerLogin(identifierInput);
        if (!check.ok || !check.customer) {
          setAuthError(check.reason || 'Retailer ID not found.');
          showToast('Retailer ID Owner app me added nahi hai', 'error');
          return;
        }
        const cust = check.customer;
        setUser({
          id: cust.id,
          name: `${cust.shopName} (${cust.ownerName})`,
          phone: cust.phone,
          email: cust.email || `${cust.id}@retailer.com`,
          role: 'customer',
          customerId: cust.id,
        });
        showToast(`Welcome, ${cust.shopName}!`);
        return;
      }

      const supCheck = verifySupplierLogin(identifierInput);
      if (!supCheck.ok || !supCheck.supplier) {
        setAuthError(supCheck.reason || 'Supplier ID not found.');
        showToast('Supplier ID Owner app me added nahi hai', 'error');
        return;
      }
      const supp = supCheck.supplier;
      setUser({
        id: supp.id,
        name: supp.name,
        phone: supp.phone,
        email: `${supp.id}@supplier.com`,
        role: 'supplier',
        supplierId: supp.id,
      });
      showToast(`Welcome, ${supp.name}!`);
    }, 400);
  };

  const handleSocialLogin = async () => {
    setAuthError(null);
    setIsSubmitting(true);
    try {
      const fbUser = await signInWithGoogleFirebase();
      const displayName = fbUser.displayName || 'User';
      const emailAddr = fbUser.email || '';

      if (selectedRole === 'owner') {
        setUser({
          id: fbUser.uid || 'owner-shuvam',
          name: `${displayName} (Owner)`,
          phone: settings.ownerPhone || '1234567890',
          email: emailAddr || 'Rupamb2b@gmail.com',
          role: 'owner',
        });
        showToast(`Connected with Google (${emailAddr})!`, 'success');
        return;
      }

      if (selectedRole === 'customer') {
        const check = verifyRetailerLogin(emailAddr);
        if (!check.ok || !check.customer) {
          setAuthError(
            `Google email "${emailAddr}" Owner dwara kisi Retailer ID par added nahi hai. Apna Owner-registered Mobile/ID use karein ya New Retailer Registration bharein.`
          );
          showToast('Yeh Gmail Retailer ID par registered nahi hai', 'error');
          return;
        }
        const cust = check.customer;
        setUser({
          id: cust.id,
          name: `${cust.shopName} (${cust.ownerName})`,
          phone: cust.phone,
          email: cust.email || emailAddr,
          role: 'customer',
          customerId: cust.id,
        });
        showToast(`Welcome, ${cust.shopName}!`, 'success');
        return;
      }

      const supCheck = verifySupplierLogin(emailAddr);
      if (!supCheck.ok || !supCheck.supplier) {
        setAuthError(
          `Google email "${emailAddr}" Owner dwara kisi Supplier ID par added nahi hai. Apna Owner-added Supplier Mobile/ID use karein.`
        );
        showToast('Yeh Gmail Supplier ID par registered nahi hai', 'error');
        return;
      }
      const supp = supCheck.supplier;
      setUser({
        id: supp.id,
        name: supp.name,
        phone: supp.phone,
        email: emailAddr,
        role: 'supplier',
        supplierId: supp.id,
      });
      showToast(`Welcome, ${supp.name}!`, 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Google Sign-In cancelled';
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitRegistration = (e: React.FormEvent) => {
    e.preventDefault();
    const digits = regWhatsapp.replace(/\D/g, '');
    if (!regShopName.trim() || !regOwnerName.trim() || digits.length < 10 || !regAddress.trim()) {
      showToast('Kripya Dokan Name, Owner Name, 10-digit WhatsApp Number aur Address bharein', 'error');
      return;
    }

    const created = addCustomerRegistration({
      shopName: regShopName.trim(),
      ownerName: regOwnerName.trim(),
      whatsapp: digits.slice(-10),
      address: regAddress.trim(),
      email: regEmail.trim() || undefined,
      source: 'Google Form',
    });

    setSubmittedReg(created);
    setRegShopName('');
    setRegOwnerName('');
    setRegWhatsapp('');
    setRegAddress('');
    setRegEmail('');
  };

  const handleSaveRegistrationToGoogleSheet = async () => {
    setIsSyncingSheet(true);
    try {
      let authorized = hasSheetsAuth;
      if (!authorized) {
        authorized = await connectGoogleSheetsAccount();
      }
      if (!authorized) {
        setConfirmSheetSave(false);
        return;
      }
      const ownerTarget = sheetTargets.find((t) => t.fileKey === 'owner-master') || sheetTargets[0];
      if (!ownerTarget) {
        showToast('Owner Master Google Sheet target not found right now; saved in Owner queue.', 'info');
        setConfirmSheetSave(false);
        return;
      }
      const rec = await syncOneTargetSheet(ownerTarget, 'Manual');
      if (rec) {
        markRegistrationsSyncedToSheet();
        setSubmittedReg((prev) => (prev ? { ...prev, syncedToSheet: true } : prev));
        showToast('Registration Google Sheet (Customer_Registrations table) me save ho gaya!', 'success');
      }
      setConfirmSheetSave(false);
    } finally {
      setIsSyncingSheet(false);
    }
  };

  const hasCustomGoogleFormUrl =
    settings.googleFormEnquiryUrl &&
    !settings.googleFormEnquiryUrl.includes('forms.gle/example');

  return (
    <div className="min-h-screen w-full py-3 px-2.5 sm:px-5 md:px-6 flex flex-col justify-center max-w-lg mx-auto">
      {/* Top Brand & Language Bar */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl overflow-hidden bg-sky-50 flex items-center justify-center shadow-md shadow-sky-500/20 border border-white shrink-0">
            <img
              src="/assets/aistudio/IMG_20261113_083134_a6a26f75.jpg"
              alt="Rupam App Icon"
              className="w-full h-full object-cover scale-[1.09]"
            />
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-slate-900 text-base sm:text-lg leading-tight truncate">Rupam B2B</h1>
            <p className="text-[11px] text-slate-500 truncate">Nuapatna, Cuttack • Wholesale</p>
          </div>
        </div>

        {/* Language switch */}
        <button
          onClick={() => {
            const next: Language = language === 'en' ? 'hi' : language === 'hi' ? 'or' : 'en';
            setLanguage(next);
          }}
          className="px-2 py-1 rounded-xl bg-white border border-slate-200 text-[11px] font-semibold text-slate-700 flex items-center gap-1 shadow-xs shrink-0"
        >
          <Globe className="w-3 h-3 text-slate-500" />
          <span>{language === 'en' ? 'English' : language === 'hi' ? 'Hinglish' : 'Odia'}</span>
        </button>
      </div>

      {/* Main Glass Card */}
      <div className="glass-card rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xl border border-white/80">
        {/* Step 1: 3-Role Selection Cards (Retailer / Supplier / Owner) */}
        <div className="mb-4">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
            {tr('1. Select Your Role', language)}
          </label>
          <div className="grid grid-cols-3 gap-2">
            {/* Retailer */}
            <button
              type="button"
              onClick={() => handleRoleChange('customer')}
              className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border text-left transition-all ${
                selectedRole === 'customer'
                  ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-400 shadow-sm ring-2 ring-amber-500/25'
                  : 'bg-white/80 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center mb-1.5">
                <Store className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-slate-900 text-xs sm:text-sm truncate">{tr('Retailer', language)}</h3>
              <p className="text-[9px] sm:text-[10px] text-slate-500 mt-0.5 truncate">Login / Register</p>
            </button>

            {/* Supplier */}
            <button
              type="button"
              onClick={() => handleRoleChange('supplier')}
              className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border text-left transition-all ${
                selectedRole === 'supplier'
                  ? 'bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-400 shadow-sm ring-2 ring-purple-500/25'
                  : 'bg-white/80 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center mb-1.5">
                <Building2 className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-slate-900 text-xs sm:text-sm truncate">Supplier</h3>
              <p className="text-[9px] sm:text-[10px] text-slate-500 mt-0.5 truncate">Saved ID Only</p>
            </button>

            {/* Owner */}
            <button
              type="button"
              onClick={() => handleRoleChange('owner')}
              className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border text-left transition-all ${
                selectedRole === 'owner'
                  ? 'bg-gradient-to-br from-sky-50 to-blue-50 border-blue-400 shadow-sm ring-2 ring-blue-500/25'
                  : 'bg-white/80 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center mb-1.5">
                <Shield className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-slate-900 text-xs sm:text-sm truncate">{tr('Owner', language)}</h3>
              <p className="text-[9px] sm:text-[10px] text-slate-500 mt-0.5 truncate">Master Hub</p>
            </button>
          </div>
        </div>

        {/* Strictly Retailer-Only Mode Switcher: Existing Login vs New Retailer Registration */}
        {selectedRole === 'customer' && (
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-amber-50 border border-amber-200/80 mb-3.5">
            <button
              type="button"
              onClick={() => {
                setRetailerPortalMode('login');
                setAuthError(null);
                setSubmittedReg(null);
              }}
              className={`py-2 px-2 rounded-lg text-[11px] font-extrabold transition flex items-center justify-center gap-1.5 ${
                retailerPortalMode === 'login'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-amber-900 hover:bg-amber-100/70'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Retailer Login</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setRetailerPortalMode('register');
                setAuthError(null);
              }}
              className={`py-2 px-2 rounded-lg text-[11px] font-extrabold transition flex items-center justify-center gap-1.5 ${
                retailerPortalMode === 'register'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-emerald-900 hover:bg-emerald-100/70'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>New Retailer Registration</span>
            </button>
          </div>
        )}

        {/* Supplier ID Notice (No self-registration allowed for Supplier) */}
        {selectedRole === 'supplier' && (
          <div className="mb-3.5 p-2.5 rounded-xl bg-purple-50 border border-purple-200 text-[11px] text-purple-900 flex items-start gap-2">
            <ClipboardCheck className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
            <span>
              <strong>Owner-Added ID Verification:</strong> Keval wahi Supplier login ho sakte hain jinhe pehle Owner ne app me add kiya ho. Supplier registration khulega nahi.
            </span>
          </div>
        )}

        {/* RETAILER NEW REGISTRATION FORM (GOOGLE FORM + GOOGLE SHEETS) */}
        {selectedRole === 'customer' && retailerPortalMode === 'register' ? (
          submittedReg ? (
            <div className="space-y-3 animate-in fade-in duration-200">
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-extrabold text-sm text-emerald-950">
                      Registration Submitted Successfully!
                    </h3>
                    <p className="text-[11px] text-emerald-800">
                      Owner (Shuvam Behera) Home Page par send ho gaya hai
                    </p>
                  </div>
                </div>

                <div className="bg-white/90 rounded-xl p-3 border border-emerald-200/80 text-xs space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-slate-500">Registration ID:</span>
                    <span className="font-mono font-extrabold text-slate-900">{submittedReg.id}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-slate-500">Date & Time:</span>
                    <span className="font-bold text-emerald-800">{submittedReg.registeredAtDisplay}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-slate-500">Dokan Name:</span>
                    <span className="font-extrabold text-slate-900">{submittedReg.shopName}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-slate-500">Owner Name:</span>
                    <span className="font-semibold text-slate-800">{submittedReg.ownerName}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-slate-500">WhatsApp Number:</span>
                    <span className="font-bold text-slate-900">+91 {submittedReg.whatsapp}</span>
                  </div>
                  <div className="pt-1 border-t border-slate-100 text-[11px]">
                    <span className="font-bold text-slate-500 block">Address:</span>
                    <span className="text-slate-800">{submittedReg.address}</span>
                  </div>
                </div>

                {/* Google Sheet Sync Option (explicit user confirmation) */}
                {submittedReg.syncedToSheet ? (
                  <div className="p-2.5 rounded-xl bg-emerald-100 border border-emerald-300 text-[11px] font-bold text-emerald-900 flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span>Google Sheet (Customer_Registrations table) me saved!</span>
                  </div>
                ) : confirmSheetSave ? (
                  <div className="p-2.5 rounded-xl bg-white border border-emerald-300 space-y-2 text-[11px]">
                    <p className="font-bold text-slate-800">
                      Confirm saving this Retailer registration into Google Sheet?
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setConfirmSheetSave(false)}
                        className="flex-1 py-1.5 rounded-lg bg-slate-100 text-slate-700 font-bold"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={isSyncingSheet}
                        onClick={() => void handleSaveRegistrationToGoogleSheet()}
                        className="flex-1 py-1.5 rounded-lg bg-emerald-600 text-white font-bold flex items-center justify-center gap-1"
                      >
                        {isSyncingSheet ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                        )}
                        <span>Confirm Save</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmSheetSave(true)}
                    className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Save Directly to Google Sheet</span>
                  </button>
                )}

                <p className="text-[11px] text-emerald-800 leading-snug">
                  Owner approve karne ke baad aap apne WhatsApp number <strong>{submittedReg.whatsapp}</strong> se Retailer Login kar sakenge.
                </p>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setSubmittedReg(null)}
                    className="py-2 rounded-xl bg-white border border-slate-200 text-slate-800 font-bold text-xs"
                  >
                    New Form
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSubmittedReg(null);
                      setRetailerPortalMode('login');
                    }}
                    className="py-2 rounded-xl bg-slate-900 text-white font-bold text-xs"
                  >
                    Back to Login
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmitRegistration} className="space-y-3">
              {/* Google Form Style Top Strip with Live Registration Date & Time */}
              <div className="p-3 rounded-2xl bg-gradient-to-r from-violet-50 via-sky-50 to-emerald-50 border border-violet-200/80 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-violet-800 flex items-center gap-1">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                    Google Form • Retailer Registration
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-slate-800 border border-slate-200 flex items-center gap-1 shrink-0">
                    <CalendarClock className="w-3 h-3 text-sky-600" />
                    {liveDateTime}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Sirf naye Retailer shopkeeper registration karein. Details Owner Home Page aur Google Sheet me save hongi.
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">
                  1. Dokan Name (Shop Name) *
                </label>
                <div className="relative">
                  <Store className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={regShopName}
                    onChange={(e) => setRegShopName(e.target.value)}
                    placeholder="e.g. Maa Tarini Cosmetic & Fancy"
                    className="w-full pl-9 pr-3 py-2.5 rounded-2xl bg-white border border-slate-200 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">
                    2. Owner Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={regOwnerName}
                    onChange={(e) => setRegOwnerName(e.target.value)}
                    placeholder="e.g. Ramesh Sahoo"
                    className="w-full px-3 py-2.5 rounded-2xl bg-white border border-slate-200 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">
                    3. WhatsApp Number *
                  </label>
                  <div className="relative">
                    <MessageSquare className="w-4 h-4 text-emerald-600 absolute left-3 top-2.5" />
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      value={regWhatsapp}
                      onChange={(e) => setRegWhatsapp(e.target.value.replace(/\D/g, ''))}
                      placeholder="10-digit WhatsApp"
                      className="w-full pl-9 pr-3 py-2.5 rounded-2xl bg-white border border-slate-200 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">
                  4. Full Address (Market, Town, District) *
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <textarea
                    rows={2}
                    required
                    value={regAddress}
                    onChange={(e) => setRegAddress(e.target.value)}
                    placeholder="Shop location, Market name, Tehsil, PIN"
                    className="w-full pl-9 pr-3 py-2 rounded-2xl bg-white border border-slate-200 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">
                  5. Email (Optional)
                </label>
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="shopname@gmail.com (optional)"
                  className="w-full px-3 py-2 rounded-2xl bg-white border border-slate-200 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-sm shadow-md active:scale-98 transition flex items-center justify-center gap-2"
              >
                <ClipboardCheck className="w-4 h-4" />
                <span>Submit Google Form & Save Registration</span>
              </button>

              {hasCustomGoogleFormUrl && (
                <a
                  href={settings.googleFormEnquiryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open External Google Form Link</span>
                </a>
              )}
            </form>
          )
        ) : (
          <>
            {/* Error Banner when unadded ID attempts login */}
            {authError && (
              <div className="mb-3.5 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <p className="leading-snug font-semibold">{authError}</p>
                </div>
                {selectedRole === 'customer' && (
                  <button
                    type="button"
                    onClick={() => {
                      setAuthError(null);
                      setRetailerPortalMode('register');
                      if (phone.length >= 10) setRegWhatsapp(phone.slice(-10));
                    }}
                    className="w-full py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center justify-center gap-1.5 transition"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>New Retailer? Fill Registration Form →</span>
                  </button>
                )}
              </div>
            )}

            {/* Step 2: Auth Method Tabs */}
            <div className="flex rounded-xl bg-slate-100 p-0.5 mb-3.5 border border-slate-200/80">
              <button
                type="button"
                onClick={() => {
                  setMethod('phone');
                  setOtpSent(false);
                  setAuthError(null);
                }}
                className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 ${
                  method === 'phone' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Phone className="w-3 h-3" /> {tr('Phone OTP', language)}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMethod('email');
                  setAuthError(null);
                }}
                className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 ${
                  method === 'email' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Mail className="w-3 h-3" />
                {selectedRole === 'owner' ? tr('Email & Password', language) : 'Saved ID / Email'}
              </button>
            </div>

            {/* Method 1: Phone OTP */}
            {method === 'phone' && (
              <div className="space-y-4">
                {!otpSent ? (
                  <div>
                    <label className="text-xs font-bold text-slate-600 mb-1.5 block">
                      {tr('Mobile Number', language)}{' '}
                      {selectedRole !== 'owner' && (
                        <span className="text-[10px] font-semibold text-slate-400">
                          (Owner-added mobile only)
                        </span>
                      )}
                    </label>
                    <div className="flex gap-2">
                      <div className="px-3 py-2.5 rounded-2xl bg-slate-100 border border-slate-200 text-sm font-semibold text-slate-700 shrink-0">
                        +91
                      </div>
                      <input
                        type="tel"
                        maxLength={10}
                        value={phone}
                        onChange={(e) => {
                          setPhone(e.target.value.replace(/\D/g, ''));
                          setAuthError(null);
                        }}
                        placeholder="Enter 10-digit registered mobile"
                        className="flex-1 px-3.5 py-2.5 rounded-2xl bg-white border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={phone.length < 10 || isSubmitting}
                      className="w-full mt-3 py-3 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-bold text-sm shadow-md shadow-sky-600/30 disabled:opacity-50 active:scale-98 transition flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                      {tr('Send 6-Digit OTP', language)}
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold text-slate-600">{tr('Enter 6-Digit Code', language)}</label>
                      <button
                        type="button"
                        onClick={() => setOtpSent(false)}
                        className="text-xs text-sky-600 font-semibold"
                      >
                        {tr('Change Phone', language)}
                      </button>
                    </div>

                    {/* 6 Digit auto-focus boxes */}
                    <div className="grid grid-cols-6 gap-1.5 mb-2.5">
                      {otpValues.map((v, i) => (
                        <input
                          key={i}
                          id={`otp-input-${i}`}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={v}
                          onChange={(e) => handleOtpChange(i, e.target.value)}
                          placeholder="•"
                          className="w-full h-10 sm:h-12 text-center text-base sm:text-lg font-bold rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                        />
                      ))}
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                      <span>Resend in {resendTimer}s</span>
                      {resendTimer === 0 && (
                        <button
                          type="button"
                          onClick={handleSendOtp}
                          className="text-sky-600 font-bold hover:underline"
                        >
                          Resend Now
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={handleVerifyOtp}
                      disabled={isSubmitting}
                      className="w-full py-3 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-bold text-sm shadow-md shadow-sky-600/30 active:scale-98 transition flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      {tr('Verify & Enter', language)}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Method 2: Saved ID / Email & Password */}
            {method === 'email' && (
              <form onSubmit={handleIdentifierAuth} className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">
                    {selectedRole === 'owner'
                      ? 'Owner Email'
                      : selectedRole === 'customer'
                      ? 'Saved Retailer ID or Email'
                      : 'Saved Supplier ID or Mobile'}
                  </label>
                  <input
                    type="text"
                    value={identifierInput}
                    onChange={(e) => {
                      setIdentifierInput(e.target.value);
                      setAuthError(null);
                    }}
                    placeholder={
                      selectedRole === 'owner'
                        ? 'Rupamb2b@gmail.com'
                        : selectedRole === 'customer'
                        ? 'e.g. cust-demo-1 or registered email'
                        : 'e.g. sup-1 or registered phone'
                    }
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-white border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-white border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-2 py-3 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 text-white font-bold text-sm shadow-md shadow-sky-600/30 active:scale-98 transition flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                  {tr('Sign In', language)}
                </button>
              </form>
            )}

            {/* Divider */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white/90 px-2 text-slate-400 font-medium">{tr('Or continue with', language)}</span>
              </div>
            </div>

            {/* Google Login */}
            <button
              type="button"
              onClick={() => void handleSocialLogin()}
              disabled={isSubmitting}
              className="w-full py-2.5 px-3 rounded-2xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-2 shadow-xs transition disabled:opacity-60"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.15z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.24C.45 8.15 0 9.92 0 12s.45 3.85 1.24 5.42l4.04-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};
