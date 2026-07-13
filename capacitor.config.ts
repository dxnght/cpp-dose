import type { CapacitorConfig } from "@capacitor/cli";

// Android packaging per ADR-0001. No server block → the WebView loads only the
// bundled offline build; there is no live-reload server and no network origin.
const config: CapacitorConfig = {
  appId: "ua.cpp.dose",
  appName: "CPP-DOSE",
  webDir: "dist",
  android: {
    allowMixedContent: false,
  },
};

export default config;
