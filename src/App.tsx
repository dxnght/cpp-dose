import { useCallback, useState } from "react";
import { DisclaimerBanner } from "./components/DisclaimerBanner";
import { FirstRunDisclaimer } from "./components/FirstRunDisclaimer";
import { Navigation, type Screen } from "./components/Navigation";
import { DrugsScreen } from "./screens/DrugsScreen";
import { AboutScreen } from "./screens/AboutScreen";
import { DripScreen } from "./drip/DripScreen";
import type { DripBadgeStatus } from "./drip/types";

const DISCLAIMER_ACK_KEY = "cpp-dose.disclaimer.acknowledged.v1";

const NO_DRIPS: DripBadgeStatus = { count: 0, stage: "" };

// CSS alone (theme.css `button`) has proven insufficient on some Android
// WebViews for suppressing the native selection/copy-lookup callout a
// long/gloved press can raise — same fix SilenceToggle needed. One delegated
// handler at the app root covers every button/tab instead of wiring this to
// each one by hand.
function suppressButtonContextMenu(e: React.MouseEvent) {
  if ((e.target as HTMLElement).closest("button")) e.preventDefault();
}

export function App() {
  const [screen, setScreen] = useState<Screen>("drip");
  // Show the full disclaimer on first run (Constitution Art. IV.2).
  const [showDisclaimer, setShowDisclaimer] = useState(
    () => localStorage.getItem(DISCLAIMER_ACK_KEY) !== "1",
  );
  // Badges the nav's "Крапельниця" tab with the active-drip count (UX fix,
  // 2026-08-02) — DripScreen stays mounted-but-hidden on tab-away (see
  // below), so without this the medic loses all visibility into running
  // drips the moment they check Drugs/About. Stable identity + bail-if-
  // unchanged so DripScreen's reporting effect can't loop through App.
  const [dripStatus, setDripStatus] = useState<DripBadgeStatus>(NO_DRIPS);
  const handleDripStatusChange = useCallback((status: DripBadgeStatus) => {
    setDripStatus((prev) =>
      prev.count === status.count && prev.stage === status.stage
        ? prev
        : status,
    );
  }, []);

  const acknowledge = () => {
    localStorage.setItem(DISCLAIMER_ACK_KEY, "1");
    setShowDisclaimer(false);
  };

  return (
    <div className="app" onContextMenu={suppressButtonContextMenu}>
      <DisclaimerBanner />
      <main className="content">
        {/* DripScreen stays mounted (just hidden) instead of unmounting on
            tab-away — code-review fix. It used to fully unmount/remount on
            every nav switch, which the drip persistence/restore feature
            couldn't tell apart from a real app restart: switching to Drugs
            and back falsely re-triggered "restored after restart" for a
            drip that was never interrupted, reset the active pacing
            metronome with no explanation, and (in the notifications-disabled
            build variant, which has no OS backstop) silenced the in-app
            alarm ticker for as long as the medic was on another tab. `hidden`
            removes it from layout and the accessibility tree without
            stopping its effects/timers. */}
        <div hidden={screen !== "drip"}>
          <DripScreen onStatusChange={handleDripStatusChange} />
        </div>
        {screen === "drugs" && <DrugsScreen />}
        {screen === "about" && <AboutScreen />}
      </main>
      <Navigation
        active={screen}
        onNavigate={setScreen}
        onOpenDisclaimer={() => setShowDisclaimer(true)}
        dripStatus={dripStatus}
      />
      {showDisclaimer && <FirstRunDisclaimer onAcknowledge={acknowledge} />}
    </div>
  );
}
