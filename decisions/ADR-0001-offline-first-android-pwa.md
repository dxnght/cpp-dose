# ADR-0001 — Offline-first PWA packaged as an Android APK (Capacitor)

- **Status:** Accepted (2026-07-12)
- **Deciders:** Owner
- **Related:** Constitution Art. V; Spec 000; `plan/architecture.md`

## Context

The tool is used in the field, at night, without connectivity, and must never
transmit data. The original plan already proposed React + TS + Vite as a PWA with
a Capacitor APK wrapper. We need a decision of record for auditors.

## Decision

Build a React + TypeScript + Vite **PWA** with a service worker for full offline
operation, packaged for Android via **Capacitor** (APK). Haptics via Capacitor
Haptics; audio via Web Audio. No backend, no accounts, no telemetry. iOS is a
non-goal for the MVP.

## Consequences

- (+) One codebase, offline by default, installable APK for the Owner's device.
- (+) Web Audio gives precise metronome scheduling (see ADR-0005).
- (+) Zero-exfiltration is enforceable (CSP + CI network test).
- (−) iOS users unserved in MVP (accepted; deferred in `IDEAS.md`).
- (−) OS may suspend audio in background; mitigated + documented (ADR-0005).

## Alternatives considered

- **Native Android (Kotlin):** best platform integration, but slower to build and
  no reuse of the Goterum-style web UX pattern; rejected for MVP speed.
- **Flutter / React Native:** viable, but adds toolchain weight without a clear win
  over PWA+Capacitor for this feature set; rejected.
