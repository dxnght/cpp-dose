import { useState } from "react";
import { DisclaimerBanner } from "./components/DisclaimerBanner";
import { FirstRunDisclaimer } from "./components/FirstRunDisclaimer";
import { Navigation, type Screen } from "./components/Navigation";
import { HomeScreen } from "./screens/HomeScreen";
import { DrugsScreen } from "./screens/DrugsScreen";
import { AboutScreen } from "./screens/AboutScreen";

const DISCLAIMER_ACK_KEY = "cpp-dose.disclaimer.acknowledged.v1";

export function App() {
  const [screen, setScreen] = useState<Screen>("home");
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
        {screen === "home" && <HomeScreen />}
        {screen === "drugs" && <DrugsScreen />}
        {screen === "about" && <AboutScreen />}
      </main>
      <Navigation active={screen} onNavigate={setScreen} onOpenDisclaimer={() => setShowDisclaimer(true)} />
      {showDisclaimer && <FirstRunDisclaimer onAcknowledge={acknowledge} />}
    </div>
  );
}
