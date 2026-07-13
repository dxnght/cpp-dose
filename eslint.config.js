import js from "@eslint/js";
import tseslint from "typescript-eslint";

// Constitution Art. V (no runtime network) and Art. II (agents may never write a
// VERIFIED status) are enforced here as lint rules so a violation fails CI.
const noNetwork = {
  rules: {
    // fetch / XMLHttpRequest are globals — ban referencing them at all.
    "no-restricted-globals": [
      "error",
      { name: "fetch", message: "No network at runtime (Constitution Art. V). Do not use fetch." },
      { name: "XMLHttpRequest", message: "No network at runtime (Constitution Art. V). Do not use XMLHttpRequest." },
    ],
    // navigator.sendBeacon + window.fetch + EventSource + WebSocket.
    "no-restricted-properties": [
      "error",
      { object: "navigator", property: "sendBeacon", message: "No telemetry/beacons (Constitution Art. V)." },
      { object: "window", property: "fetch", message: "No network at runtime (Constitution Art. V)." },
    ],
    "no-restricted-syntax": [
      "error",
      {
        selector: "NewExpression[callee.name='WebSocket']",
        message: "No network at runtime (Constitution Art. V). WebSocket is banned.",
      },
      {
        selector: "NewExpression[callee.name='EventSource']",
        message: "No network at runtime (Constitution Art. V). EventSource is banned.",
      },
      {
        // Constitution Art. II: agents/app code may never hard-code a VERIFIED status.
        selector: "Literal[value=/^VERIFIED:/]",
        message: "Only the Owner writes VERIFIED: statuses, in clinical data — never in code (Constitution Art. II).",
      },
    ],
  },
};

export default tseslint.config(
  { ignores: ["dist", "dev-dist", "android", "node_modules", "clinical", "coverage"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}"],
    ...noNetwork,
    languageOptions: {
      globals: {
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        localStorage: "readonly",
        console: "readonly",
        AudioContext: "readonly",
      },
    },
  },
  {
    // Build/pipeline scripts run in Node and legitimately read files; they must
    // still never touch the network. The VERIFIED literal ban does not apply here
    // because the compile/gate scripts must *match* the VERIFIED pattern.
    files: ["scripts/**/*.mjs"],
    languageOptions: { globals: { process: "readonly", console: "readonly", URL: "readonly" } },
    rules: {
      "no-restricted-globals": noNetwork.rules["no-restricted-globals"],
    },
  },
);
