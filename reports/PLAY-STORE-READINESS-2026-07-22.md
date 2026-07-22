# Google Play Readiness — Assessment & Checklist

- **Date:** 2026-07-22
- **Method:** codebase audit (package.json, capacitor.config, android/ gitignored
  build files, manifest, CI) + current Google Play Console policy research
  (sources at bottom — policy pages fetched directly, not from training data).
- **Scope:** is CPP-DOSE ready to submit to Google Play, what's missing, what
  are the mandatory steps.

## Bottom line

**Not ready yet — but nothing here is a big engineering lift on its own.**
Most of it is store-listing chores nobody has started (icon, privacy policy,
screenshots) plus two real technical items (signing, target API level) and
one genuine strategic question that's worth deciding deliberately rather than
discovering mid-submission.

## Settle this first: is public Google Play even the right channel?

Three things point the same direction and are worth a deliberate decision,
not a default:

1. The `USE_EXACT_ALARM` permission (added 2026-07-21 for locked-screen
   alarms) has a comment in `AndroidManifest.xml` that says explicitly:
   *"this app is sideloaded, not Play-Store-distributed, so the Play policy
   restriction on this permission doesn't apply."* That assumption was true
   when written and stops being true the moment this goes to Play (see
   below — it's a real compliance conflict, not just a stale comment).
2. `ROADMAP.md`'s own v1.0 decision log talks about shipping as **"Android
   APK + PWA"**, not a Play Store listing — sideloading directly to known
   medic units was the implicit plan.
3. Google's Health Content and Services policy (in force since Jan 2026)
   puts CPP-DOSE squarely in scope ("Clinical Decision Support... includes
   drug dosage calculators") — that's a manageable declaration, not a
   blocker by itself, but it's real review surface for a tool this narrow
   and specialized.

None of this rules out Play — plenty of narrow professional tools ship
there. But the alternatives (direct APK distribution to known units,
**Managed Google Play** / private enterprise channel, an **unlisted** Play
listing, F-Droid) avoid public discoverability questions and some of the
policy surface entirely, at the cost of easy auto-updates and discovery by
medics who don't already know about it. Worth an explicit Owner decision,
ideally as a short ADR, before spending the week-plus of prep below.

## Content/functionality completeness

- v1.0 clinical scope is **intentionally narrow by Owner decision**
  (2026-07-15): ketamine analgesia + sedation drips, burn fluid, and their
  priming/loading boluses. Everything else in the protocol file is parked
  until M3. This is a deliberate, documented scope — not an accident — but
  worth deciding whether "narrow but verified" reads as complete enough for
  a public listing, or whether the listing should frame it explicitly as
  "v1, growing" to set expectations.
- `gate:release` currently exposes **44 verified clinical records + 2
  engineering formulas**; 8 records are still excluded (unverified / not
  archived) — expected, not a bug.
- Android-only for v1 (iOS deferred per ROADMAP) — doesn't block a Play
  submission.

## Codebase gaps found

1. **`USE_EXACT_ALARM` vs. Play's restricted-permission policy.** Play
   requires this permission's use case to be core, user-facing precise
   timing — alarm clock, timer, or calendar apps. CPP-DOSE's core function is
   a *dosing calculator*; the alarm is a supporting feature, not the app's
   reason to exist. This is a real rejection risk as declared today, not a
   hypothetical. Options: keep exact alarms only in a sideload build; fall
   back to `SCHEDULE_EXACT_ALARM` (user-grantable, different review path) for
   the Play build; or make the case in the declaration that alarm delivery
   is core enough (weaker argument). Needs a decision, probably an ADR.
2. **No release signing configured.** `android/app/build.gradle` has no
   `signingConfig` at all — only `apk:debug` exists. Play requires a signed
   release build; enrolling in **Play App Signing** (Google holds the actual
   signing key, you keep an upload key) is the standard, recommended path.
3. **Play requires `.aab` (Android App Bundle), not `.apk`**, for new app
   submissions. Nothing in the repo currently produces one — `apk:debug` is
   debug-only.
4. **App icon is still the Capacitor stock placeholder** (`ic_launcher.png`
   etc., dated March 2025, unmodified) — no custom branding exists yet.
   Needed: adaptive icon, 512×512 Play Store icon, 1024×500 feature graphic,
   phone screenshots.
5. **`minifyEnabled false`** on the release build type — not a hard
   blocker, but R8/ProGuard shrinking is recommended before a public release.
6. **`targetSdkVersion 34`** (Android 14). Current Play policy: **new
   submissions need API 36 (Android 16) starting Aug 31, 2026** (extension
   to Nov 1, 2026 available on request); existing apps need at least API 35.
   Given the prep work below will likely push submission past that date,
   plan to target at least 35, ideally 36 — and budget time to confirm the
   Capacitor/plugin stack (local-notifications, haptics) still behaves
   correctly at the new target level, especially the exact-alarm path.
7. `versionCode`/`versionName` in `build.gradle` are hardcoded (`1`/`"1.0"`),
   decoupled from `package.json`'s `0.1.0` — fine to start, but worth
   picking one versioning scheme before the first real release.
8. CI (`ci.yml`) only builds the web bundle — the Android release build has
   never been exercised end-to-end, signed or otherwise, in this repo.

## Google Play Console requirements (account + policy, not code)

1. **Developer account:** one-time $25 fee + government ID verification
   (sometimes a selfie too), name matching the payment card. Personal or
   organization account, both need ID + a verified phone number. Approval:
   hours to ~2 business days.
2. **New-account closed-testing gate:** personal accounts created after
   Nov 13, 2023 must run a closed test with **≥12 opted-in testers for 14
   consecutive days** before production access unlocks (reduced from 20 in
   Dec 2024). This is a real ~2-week minimum lead time — worth starting
   first, since your current on-phone testers could double as this cohort.
3. **Health apps declaration** — mandatory for *every* app, even ones with
   zero health features. CPP-DOSE should declare **"Clinical Decision
   Support"** under Medical (Google's own category text literally names
   "drug dosage calculators"). This is *not* the same as "Medical Device"
   (that's for diagnostic tools / hardware-interfacing / regulated
   software) — CPP-DOSE is reference/decision-support, so it should skip
   the FDA/CE regulatory-proof paperwork, but must still:
   - Post a **public, non-PDF, non-geofenced privacy policy URL**, both in
     Play Console and in-app. Doesn't exist yet — trivial content (nothing
     is collected) but needs a real hosted page (e.g. GitHub Pages).
   - Put an explicit disclaimer in the **store listing description** (not
     just in-app) — something like "not a medical device and does not
     diagnose, treat, cure, or prevent any medical condition," plus a
     reminder to consult a healthcare professional. The in-app disclaimer
     already covers this well; the store copy needs equivalent wording.
   - Only request permissions essential to core function — worth a
     deliberate re-check against this list once the exact-alarm question
     (above) is resolved.
4. **Data safety section** — must be filled out even for zero-collection
   apps ("does not collect or share user data"). Should be simple once the
   privacy policy exists and says the same thing.
5. **Content rating questionnaire (IARC)** — standard, no expected issues.
6. **Store listing assets** — title, short description (≤80 chars), full
   description, feature graphic, icon, ≥2 phone screenshots, privacy policy
   link. None of this exists yet.

## Suggested order of operations

1. Decide the distribution-channel question above — it changes several
   answers below.
2. If Play: resolve the `USE_EXACT_ALARM` conflict (ADR).
3. Bump `targetSdkVersion` to the current requirement; smoke-test
   notifications/haptics against it.
4. Design real app icon + adaptive icon + feature graphic + screenshots.
5. Write and host a privacy policy (content is simple given zero data
   collection; needs a real public URL).
6. Set up release signing (generate a keystore, enroll in Play App Signing)
   and add a real `.aab` release script.
7. Register the developer account + ID verification — start early, this
   has its own multi-day lead time, and the 12-testers/14-days clock can't
   start until the account and a testing track both exist.
8. Complete: Health apps declaration, Data safety section, content rating,
   store listing copy (with the required medical disclaimer language).
9. Run the closed-testing track for ≥14 days with ≥12 real opted-in
   testers before requesting production access.
10. Submit for review.

## Sources

- [Target API level requirements for Google Play apps](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en)
- [Google Play's target API level policy](https://support.google.com/googleplay/android-developer/answer/16561298?hl=en-GB)
- [Meet Google Play's target API level requirement](https://developer.android.com/google/play/requirements/target-sdk)
- [App testing requirements for new personal developer accounts](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en)
- [Register on Google Play Console — Android developer verification](https://developer.android.com/developer-verification/guides/google-play-console)
- [Get started with Play Console](https://support.google.com/googleplay/android-developer/answer/6112435?hl=en)
- [Health Content and Services policy](https://support.google.com/googleplay/android-developer/answer/16679511?hl=en)
- [Provide information for the Health apps declaration form](https://support.google.com/googleplay/android-developer/answer/14738291?hl=en)
- [Health app categories and additional information](https://support.google.com/googleplay/android-developer/answer/13996367)
- [Provide information for Google Play's Data safety section](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en)
- [Google Play policy on use of Exact Alarm API](https://orangeoma.zendesk.com/hc/en-us/articles/9110068699548-Google-Play-policy-on-use-of-Exact-Alarm-API)
- [Permissions and APIs that Access Sensitive Information](https://support.google.com/googleplay/android-developer/answer/9888170?hl=en)
