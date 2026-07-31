import { useState } from "react";
import { DisclaimerBanner } from "./components/DisclaimerBanner";
import { FirstRunDisclaimer } from "./components/FirstRunDisclaimer";
import { Navigation, type Screen } from "./components/Navigation";
import { DrugsScreen } from "./screens/DrugsScreen";
import { AboutScreen } from "./screens/AboutScreen";
import { DripScreen } from "./drip/DripScreen";

const DISCLAIMER_ACK_KEY = "cpp-dose.disclaimer.acknowledged.v1";

export function App() {
  const [screen, setScreen] = useState<Screen>("drip");
  // Show the full disclaimer on first run (Constitution Art. IV.2).
  const [showDisclaimer, setShowDisclaimer] = useState(
    () => localStorage.getItem(DISCLAIMER_ACK_KEY) !== "1",
  );

  const acknowledge = () => {
    localStorage.setItem(DISCLAIMER_ACK_KEY, "1");
    setShowDisclaimer(false);
  };

  return (
    <div className="app">
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
          <DripScreen />
        </div>
        {screen === "drugs" && <DrugsScreen />}
        {screen === "about" && <AboutScreen />}
      </main>
      <Navigation active={screen} onNavigate={setScreen} onOpenDisclaimer={() => setShowDisclaimer(true)} />
      {showDisclaimer && <FirstRunDisclaimer onAcknowledge={acknowledge} />}
    </div>
  );
}
