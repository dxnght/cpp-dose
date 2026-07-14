/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// PWA is configured to *only* precache the app shell + bundled clinical field
// data. There is no runtime caching handler and no network fallback, in line
// with Constitution Art. V (no network calls during operation, ever).
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      workbox: {
        globPatterns: ["**/*.{js,css,html,json,svg,png,woff2}"],
        // No runtimeCaching: nothing is fetched from the network at runtime.
        runtimeCaching: [],
        navigateFallback: "index.html",
      },
      manifest: {
        name: "CPP-DOSE",
        short_name: "CPP-DOSE",
        description: "Offline field dosing / drip-rate support for Prolonged Casualty Care",
        lang: "uk",
        theme_color: "#0b0b0d",
        background_color: "#0b0b0d",
        display: "standalone",
        orientation: "portrait",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
    }),
  ],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
  },
});
