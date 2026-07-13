// Minimal i18n scaffold. The MVP UI is Ukrainian only (Spec 000 non-goal: no
// English UI). Strings live in uk.json; t() looks them up with a dev-time fallback.
import uk from "./uk.json";

export type Locale = "uk";
export const locale: Locale = "uk";

const strings: Record<string, string> = uk;

export function t(key: keyof typeof uk | string): string {
  return strings[key] ?? key;
}
