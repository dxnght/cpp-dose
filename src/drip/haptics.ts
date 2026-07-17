// Vibration via Capacitor Haptics — real haptic taps on native iOS/Android; the
// plugin's web implementation falls back to navigator.vibrate (which is a no-op on
// iOS Safari, since WebKit has no Vibration API). All calls are fire-and-forget.
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
