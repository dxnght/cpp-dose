# Build the iPhone app (native, offline, no server)

Same offline model as the Android APK — the WebView loads the bundled `dist/`,
there is no server and no network at runtime. Vibration now goes through
**Capacitor Haptics** (real taps on the device; `navigator.vibrate` doesn't exist
in the iOS WebView). Requires a **Mac**.

> Release reminder (Constitution Art. II/III): only `VERIFIED` records ship. Run
> `npm run gate:release` before a field build. 6 clinical records are verified now.

## 1. Prerequisites (Mac)

- **Xcode** (App Store) + Command Line Tools: `xcode-select --install`.
- **CocoaPods** (Capacitor 6 uses it for iOS deps): `brew install cocoapods`
  (or `sudo gem install cocoapods`).
- **Node** (same as for the web build).
- An **Apple ID** for signing:
  - **Free Apple ID** — sideload to *your own* iPhone, but the app **re-signs every
    7 days** (just re-run the build to refresh).
  - **$99/yr Apple Developer** — durable installs + **TestFlight** (to hand the app
    to other medics) + App Store. There is no free "just install the .ipa" on iOS.

## 2. One-time: create the iOS project

```bash
npm install               # picks up @capacitor/ios
npm run build             # compiles the field bundle + web build
npx cap add ios           # creates the ios/ Xcode project (only if it doesn't exist)
```

`ios/` is git-ignored (regenerated from the web build, like `android/`).

## 3. Build + run on your iPhone

```bash
npm run ios:open          # build → cap sync ios → open Xcode
```

In Xcode:
1. Select the **App** target → **Signing & Capabilities** → set **Team** to your
   Apple ID (check "Automatically manage signing").
2. Plug in your iPhone, pick it as the run destination, press **▶ Run**.
3. First launch on device: iPhone → **Settings → General → VPN & Device Management**
   → trust your developer certificate.

For a shareable build: Xcode → **Product → Archive** → Distribute (TestFlight/Ad Hoc;
needs the paid account).

## 4. After any web/code change

```bash
npm run build && npx cap sync ios     # copies the new web build into ios/
```

## App identity / polish

- appId `ua.cpp.dose`, name `CPP-DOSE` (`capacitor.config.ts`) — shared with Android.
- Launcher icons from `public/icon-1024.png` (optional):
  `npx @capacitor/assets generate --ios`.
- Target iOS 15+.

## What works on native iOS (vs the PWA)

- ✅ **Vibration / haptics** (Capacitor Haptics) — the silent vibration pacing works.
- ✅ Reliable audio, screen wake-lock, no cache eviction, true fullscreen, offline.
- The **PWA (Add to Home Screen)** remains the no-Mac fallback, but on iOS it has no
  vibration and can evict its cache after weeks of disuse — see the chat notes.

## Troubleshooting

- **`xcodebuild requires Xcode, but active developer directory ... CommandLineTools`**
  — `pod install` needs the **full Xcode**, not just Command Line Tools. Install Xcode
  (App Store), then point the toolchain at it:
  `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer`, then
  `sudo xcodebuild -license accept` and open Xcode once. Verify with `xcode-select -p`.
- **CocoaPods errors** — `cd ios/App && pod install`, then reopen Xcode.
- **Signing "no team"** — add your Apple ID in Xcode → Settings → Accounts, then pick
  it as the Team.
- **`ua.cpp.dose` bundle-id conflict** (rare) — change `appId` in
  `capacitor.config.ts`, then `npx cap sync ios`.
- **White screen on launch** — you didn't `npm run build` before `cap sync`; rebuild.
