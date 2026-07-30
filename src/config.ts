// Build-time variant switch — replaces the old `variant/play-store` git
// branch (2026-07-24).
//
// Why this exists. The Play Store build must not ship the OS-level
// notification subsystem: it needs USE_EXACT_ALARM, a Play-restricted
// permission reserved for apps whose *core* function is precise timing
// (alarm clocks, timers, calendars). CPP-DOSE's core function is a dosing
// calculator, so declaring it is a real rejection risk — see
// `reports/PLAY-STORE-READINESS-2026-07-22.md`.
//
// That used to live on a separate branch, which rotted exactly as you'd
// expect: by 2026-07-24 `variant/play-store` was 20 commits behind and was
// missing every bug fix from the preceding two days — including the mute
// text-selection fix, the short-bag false alarm, the orphaned-notification
// sweep, and drip persistence. A release cut from it would have shipped
// known-broken. One codebase with a build flag means a fix lands in both
// variants by default instead of by remembering to cherry-pick.
//
// Set at build time:
//   VITE_VARIANT=play  → Play Store build: in-app alarm only, no OS
//                        notifications, no USE_EXACT_ALARM in the manifest.
//   VITE_VARIANT=apk   → direct-APK build for medics who ask for it
//                        (default): full alarm stack including the
//                        locked-screen notification backstop.

export type Variant = "play" | "apk";

export const VARIANT: Variant =
  import.meta.env.VITE_VARIANT === "play" ? "play" : "apk";

/**
 * Whether the OS-level local-notification backstop (Spec 001 FR-12) is part
 * of this build. When false the in-app AudioContext alarm is the only alarm
 * channel — reliable while the app is foregrounded and the screen is on, and
 * the UI says so plainly rather than implying a guarantee it can't keep.
 */
export const NOTIFICATIONS_ENABLED = VARIANT !== "play";
