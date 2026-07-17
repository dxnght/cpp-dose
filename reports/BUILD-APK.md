# Build the Android APK (field build)

Everything on the JS side is ready: `predev`/`prebuild` compile the field bundle,
the PWA manifest has icons, and touch targets are ≥48 px. The only missing piece is
the Android toolchain on your Mac. This is the one-time setup + build.

> Reminder (Constitution Art. II/III): a **field** build only exposes `VERIFIED`
> records. Run `npm run gate:release` before shipping — it must pass. Right now 6
> clinical records are verified, so the app has real content.

## 0. Try it without the toolchain first (fastest)

You don't need Android SDK just to see/test the app on your phone:

```bash
npm install
npm run dev          # opens a local dev server (predev compiles the field bundle)
```

Open the printed URL in Chrome on your phone (same Wi-Fi) → menu → **Add to Home
Screen**. That installs the PWA (offline, icon, fullscreen). Good enough to trial
the UX. The APK below is only needed for native haptics + a real installable app.

## 1. Install JDK 17 + Android SDK

Easiest: **Android Studio** (bundles the SDK + an OpenJDK 17).

- Download Android Studio → install → open once → let it install the default SDK.
- Install a JDK 17 if you don't have one: `brew install --cask temurin@17`
  (or use the JDK bundled with Android Studio).

Set environment variables (add to `~/.zshrc`):

```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 17)
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin"
```

Then `source ~/.zshrc`. Check: `java -version` → 17; `adb --version` works.

## 2. One-time: ensure the Android project exists

`android/` is git-ignored (regenerated from the web build). If it's missing:

```bash
npm install
npm run build
npx cap add android      # only if android/ does not exist yet
```

(If `android/` already exists, skip `cap add`.)

## 3. Build the debug APK

```bash
npm run apk:debug
```

That runs: `build` → `cap sync android` → `./gradlew assembleDebug`. Output:

```
android/app/build/outputs/apk/debug/app-debug.apk
```

## 4. Put it on your phone

- USB + `adb install -r android/app/build/outputs/apk/debug/app-debug.apk`, or
- copy the APK to the phone and open it (enable "install unknown apps" once).

## 5. Field-hardening checklist (SC-6 / Sprint 3)

- [x] All interactive targets ≥ 48 px (audited in `theme.css`).
- [x] Custom app icon (blue droplet) + maskable icon in `public/` and the manifest.
- [x] Offline: no runtime network (CI offline test green; CSP `connect-src 'self'`).
- [x] Disclaimer on first run + reachable from every screen.
- [ ] **Lighthouse PWA installability** — run it yourself once:
      `npm run build && npm run preview`, open the preview URL in Chrome →
      DevTools → Lighthouse → "Progressive Web App" → Analyze. Expect installability
      to pass (manifest + icons + service worker are in place).
- [ ] On-device: airplane-mode run of all modules; confirm metronome/flash/timer.

## Troubleshooting

- **`EPERM ... unlink dist/...` on build** — a stale `dist/`. `rm -rf dist` then rebuild.
- **`Unable to locate a Java Runtime`** — `JAVA_HOME` not set / not 17. See step 1.
- **`Unsupported class file major version NN`** (e.g. 70) — Gradle 8.2.1 (Capacitor 6)
  needs **JDK 17**; your shell is on a newer JDK. Fix:
  `export JAVA_HOME=$(/usr/libexec/java_home -v 17)` then rebuild. In Android Studio:
  Settings → Build Tools → Gradle → **Gradle JDK → 17**. (Install if missing:
  `brew install --cask temurin@17`.)
- **`Cannot find module @rollup/rollup-*`** — delete `node_modules` + `package-lock.json`
  and `npm install` again (a known npm optional-deps quirk).
- **Gradle SDK errors** — open `android/` once in Android Studio; it will offer to
  install the matching SDK/build-tools, then retry `npm run apk:debug`.

## App identity

- appId `ua.cpp.dose`, name `CPP-DOSE` (`capacitor.config.ts`).
- To regenerate all Android launcher icons from the source
  `public/icon-1024.png`: `npx @capacitor/assets generate --android` (optional
  polish; the debug build works without it).
