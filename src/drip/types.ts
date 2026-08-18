// Shared types for the drip screen. Extracted from DripScreen.tsx
// (2026-08-18) to get the main file back under control; behaviour unchanged.
import type { Drug, Formula } from "../clinical/types";

export interface ConcPreset {
  drug: Drug;
  conc: number; // mg/ml
  use: string; // "Знеболення" | "Седація"
  label: string;
}

export interface ActiveDrip {
  id: string;
  label: string;
  gtt: number;
  mlPerH: number;
  dropFactor: number;
  bagMl: number | null;
  startedAt: number;
  animStart: number; // performance.now() ms — shared phase anchor
  warned10: boolean;
  warned5: boolean;
  warnedEmpty: boolean;
  silenced: boolean; // Owner opt-out (2026-07-21): mutes all 3 alarms for this drip only.
  // Snapshot of the clinical/engineering record this drip's numbers came
  // from, taken once at addDrip() time (2026-07-22, UX review finding —
  // SourceBadge used to only show at setup, so verification status
  // disappeared the moment a drip started running, including in Focus mode,
  // the view a medic watches for the drip's whole life). null for bagtime
  // mode, which is plain arithmetic on user-entered numbers with no
  // underlying record to cite.
  sourceRecord: Drug | Formula | null;
  // Optional free-text tag (e.g. a bed/litter number) so a medic can tell
  // apart concurrent drips on different patients — 2026-07-24 Owner
  // decision, deliberately kept separate from `label`. In-app display
  // only: never read by notifications.ts / rescheduleDripAlarms() /
  // dripScheduleKey(), which continue to use `label` alone. That split is
  // the whole point — the OS notification channel is patched to
  // VISIBILITY_PUBLIC (shows on the lock screen), so anything identifying
  // must never reach it. Purely in-memory like the rest of `drips`, never
  // touches localStorage or any file; gone the moment the drip is removed
  // or the app restarts.
  displayTag?: string;
  // Restored from storage after an app restart and not yet acknowledged by
  // the medic (FR-13/AC-6f, Owner decision 2026-07-24). The drip still runs
  // its countdown and still arms its alarms — a spurious alarm is far safer
  // than a missed one — but it renders visibly un-trusted until confirmed,
  // so a stale countdown can never be read as a verified one. Undefined for
  // any drip added in this session.
  unconfirmed?: boolean;
}

export type Mode = "dose" | "bagtime" | "burn";

export interface DripFormProps {
  dripsCount: number;
  maxDrips: number;
  mode: Mode;
  onModeChange: (m: Mode) => void;
  presets: ConcPreset[];
  preset: ConcPreset | undefined;
  presetIdx: number;
  onPresetIdxChange: (i: number) => void;
  dropFactor: number;
  onDropFactorChange: (f: number) => void;
  weight: number;
  onWeightChange: (v: number) => void;
  dose: number;
  onDoseChange: (v: number) => void;
  bolus: Drug | undefined;
  tbsa: number;
  onTbsaChange: (v: number) => void;
  bagMl: number;
  onBagMlChange: (v: number) => void;
  bagGtt: number;
  onBagGttChange: (v: number) => void;
  burnGated: boolean;
  burnFormula: Formula | undefined;
  live: { mlPerH: number; gtt: number };
  spd: number;
  onCalibrate: () => void;
  onAddDrip: () => void;
}

export interface DripEngineProps {
  mode: Mode;
  preset: ConcPreset | undefined;
  burnFormula: Formula | undefined;
  dropFactor: number;
  bagMl: number;
  live: { mlPerH: number; gtt: number };
  onStatusChange?: (status: DripBadgeStatus) => void;
}

// Reported to the parent (App.tsx) so the bottom nav can badge the
// "Крапельниця" tab with the active-drip count — since DripScreen now stays
// mounted (just `hidden`) across tab navigation, a drip's clock keeps
// running while the medic is on Drugs/About with nothing on that screen to
// show it. `stage` mirrors alarmStage() in DripScreen.tsx, worst across all
// drips, so the badge can escalate the same way a card does.
export interface DripBadgeStatus {
  count: number;
  stage: "" | "warn10" | "warn5" | "empty";
}

export interface DripScreenProps {
  drip: ActiveDrip;
  isActive: boolean;
  confirmId: string | null;
  remaining: (d: ActiveDrip) => string;
  quietHint: (d: ActiveDrip) => string | null;
  alarmStage: (d: ActiveDrip) => "" | "warn10" | "warn5" | "empty";
  onConfirm: (id: string) => void;
  onEnterFocus: (id: string) => void;
  onTogglePacing: (id: string) => void;
  onRemoveClick: (id: string) => void;
  onSetSilenced: (id: string, val: boolean) => void;
}
