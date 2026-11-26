# Building Rupam Business Manager Native Android Debug APK

This project is configured with a native Android wrapper project and automated CI/CD to build a genuine installable debug APK (`app-debug.apk`).

---

## 🚀 Option 1: Automated GitHub Actions Build (Zero Setup)
A workflow has been configured at `.github/workflows/build-apk.yml`.
1. Push your repository to GitHub.
2. Go to the **Actions** tab in GitHub.
3. Select **Build Android Debug APK** and click **Run workflow**.
4. Once completed (approx. 2-3 mins), download the `rupam-business-manager-debug-apk` artifact containing `app-debug.apk`.
5. Transfer `app-debug.apk` to your Android phone (or WhatsApp/Drive) and tap to install!

---

## 💻 Option 2: Local Gradle Build (Command Line / Android Studio)
If you have Java 17+ and the Android SDK installed:

```bash
# Navigate to the Android project directory
cd android

# Generate debug keystore if not already present
keytool -genkey -v -keystore debug.keystore \
  -storepass android -alias androiddebugkey -keypass android \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -dname "CN=Android Debug,O=Android,C=US"

# Build the genuine debug APK
./gradlew assembleDebug

# Output APK path:
# android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 📱 Option 3: Instant 1-Tap PWA Install (WebAPK on Android)
The app is fully PWA-enabled with service workers and Web App Manifest:
1. Open the application URL in Google Chrome on your Android device.
2. Tap the **Install** banner or Chrome menu (⋮) -> **Install app** (or **Add to Home screen**).
3. Android Google Play Services automatically compiles and installs a genuine system WebAPK with full standalone windowing, offline caching, and launcher icon.

---

## 📦 Option 4: Bubblewrap CLI (Official Google TWA Generator)
You can also package this app into an Android package using Google's Bubblewrap CLI:
```bash
npm install -g @bubblewrap/cli
bubblewrap init --manifest="https://<YOUR_APP_URL>/manifest.json"
bubblewrap build
```
This produces `app-release-signed.apk` and `app-release-bundle.aab`.
