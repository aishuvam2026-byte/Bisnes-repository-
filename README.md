# Rupam Business Manager (B2B Cosmetic & FMCG Wholesale)
**Proprietor:** Shuvam Behera  
**Location:** Nuapatna, Cuttack, Odisha 754035  
**Free Delivery Radius:** 150 km around Nuapatna Hub  

---

## 1. Overview
Rupam Business Manager is a mobile-first Progressive Web App (PWA) and Android APK package designed to run the entire wholesale cosmetics & FMCG operation from a single smartphone.

### Key Capabilities:
1. **Orders Stepper**: Minimum order value ₹1,000 enforced; wholesale full-packets only (6 or 12 pcs); ₹1,000 advance required for booking; auto-calculates distance from Nuapatna.
2. **Khata & Udhaar Ledger**: NO general credit. Strict rule allows up to 10% change shortage at delivery, which must be cleared before the next order. Deep-linked UPI QR generator (`upi://pay?pa=...`).
3. **Delivery Kanban Board & Dispatch Day Confirmation**: Call shopkeeper to confirm balance is ready before loading goods on buses or delivery vehicles.
4. **Damage & Returns**: Continuous uncut unboxing video from sealed parcel opening is mandatory. Auto-rejected if video is missing.
5. **Multi-Role Separation (Firestore Security Enforced)**:
   - **Owner (Shuvam Behera)**: Complete access, margins, landed costs, admin settings, and approval authority.
   - **Customer (Dukani Bhai)**: Sees only their own shop's orders, bills, payments, dues, delivery tracking, and place order requests. Never exposes purchase cost or other customer data.
6. **In-App AI Assistant (Server-Side Gemini 3.8-Flash Proxy)**: Multi-lingual (English, Hindi, Odia) assistant answering inventory, dispatch, policy, and udhaar questions.
7. **Map & 150 km Radius**: OpenStreetMap with Leaflet showing customer shop pins colored by payment/udhaar status and Nuapatna free delivery circle.
8. **Public SEO Landing Page**: Google Search optimized for wholesale cosmetic queries in Cuttack, Nuapatna, and Odisha with Schema.org JSON-LD structured data.

---

## 2. Demo Mode Credentials (Pre-Configured)
The app runs in `DEMO_MODE: true` with pre-seeded realistic Odisha wholesale data (20 shops, 40 cosmetic items, 60 historical orders across 24 months):

- **Owner Demo Account:**
  - Name: `Shuvam Behera`
  - Phone: `1234567890` (OTP: `123456`)
  - Email: `Rupamb2b@gmail.com`
  - Password: `Rupam@b2b`
- **Customer (Dukani Bhai) Demo Account:**
  - Name: `Shuvam Behera (Maa Mangala Cosmetics)`
  - Phone: `1234567890` (OTP: `123456`)
  - Email: `svmbhr@gmail.com`
  - Password: `svm@bhr`

*Note: Tap "Use Demo" on the login screen to automatically populate credentials. Remember to turn OFF DEMO_MODE in Settings and remove test credentials before production rollout.*

---

## 3. Firebase Authentication & Firestore Setup Guide
To connect your own Firebase project:

1. **Create Firebase Project**:
   - Go to [Firebase Console](https://console.firebase.google.com/) and create a project named `rupam-b2b`.
2. **Enable Authentication**:
   - Enable **Phone Auth**: In the Phone settings, add `+911234567890` as a Test Phone Number with verification code `123456`.
   - Enable **Email/Password Auth**.
   - Optional: Enable Google Sign-In and Microsoft Auth.
3. **Deploy Firestore Rules**:
   - Copy the rules from `/firestore.rules` into the Firebase Console -> Firestore -> Rules tab and click **Publish**.
4. **Configure Environment Variables**:
   - Set your `GEMINI_API_KEY` in `.env` (or via AI Studio Secrets).

---

## 4. How to Generate Android APK (APK File Generation Guide)
You can package this web app into an installable Android APK (`.apk` / `.aab`) in two quick ways:

### Method A: Google PWABuilder (Easiest - 1 Click APK)
1. Deploy your app or copy your live URL (`https://...`).
2. Visit [PWABuilder.com](https://www.pwabuilder.com/).
3. Paste the URL. PWABuilder detects `manifest.json` and `sw.js`.
4. Click **Package For Stores** -> Select **Android**.
5. Download the generated `.apk` and signed `.aab` for Google Play Store!

### Method B: Bubblewrap CLI (Google Official TWA APK Generator)
Run in your terminal:
```bash
npm install -g @bubblewrap/cli
bubblewrap init --manifest https://your-app-url/manifest.json
bubblewrap build
```
This produces `app-release-signed.apk` directly on your machine.

### Method C: PWA Direct Install (Android & iOS)
- On Android Chrome: Tap the top right 3 dots -> **"Install application"** or **"Add to Home Screen"**. The app installs as a standalone fullscreen app with icon on the phone home screen.

---

## 5. Google Business Profile & SEO Setup
1. **Google Business Profile (GBP)**:
   - Claim profile: "Rupam Wholesale Cosmetics & FMCG", Nuapatna, Cuttack 754035.
   - Set service area to 150 km around Nuapatna.
   - Add website URL linking to the public landing page route (`/`).
2. **Google Search Console**:
   - Submit your domain to Google Search Console.
   - The JSON-LD `LocalBusiness` and `WholesaleStore` schema embedded in `index.html` helps your wholesale business rank on Google search for queries like "cosmetics wholesale Nuapatna Cuttack".
