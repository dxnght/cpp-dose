// Vibration via Capacitor Haptics — real haptic taps on native iOS/Android; the
// plugin's web implementation falls back to navigator.vibrate.
//
// **iPhone + web build = no vibration at all, and it cannot be fixed here.**
// WebKit has never shipped the Vibration API (re-checked 2026-07-25 after an
// Owner field report that the drip didn't buzz on iPhone) — there is no flag,
// no prefixed variant, no polyfill that reaches the taptic engine from a web
// page. Where it does work:
//   • Android, web/PWA  — navigator.vibrate ✔
//   • Android, native APK — Capacitor Haptics ✔
//   • iOS, native app    — Capacitor Haptics → UIImpactFeedbackGenerator ✔
//   • iOS, web/PWA       — nothing ✘
// This matters beyond a missing nicety: on an iPhone PWA with the ring switch
// on silent, the medic has *no* non-visual alarm channel left, so the drip
// screen's hint says that outright rather than letting them assume otherwise.
//
// All calls are fire-and-forget: a platform without haptics must never throw
// into the alarm path.
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";

export function tapHaptic(): void {
  Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
}

export function warnHaptic(): void {
  Haptics.notification({ type: NotificationType.Warning }).catch(() => {});
}

export function emptyHaptic(): void {
  Haptics.notification({ type: NotificationType.Error }).catch(() => {});
}
