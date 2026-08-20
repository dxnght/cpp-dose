# PROTOTYPE — active-drips density

**Question:** "Активні дріпи" cards are tall (chamber animation + meta line +
actions row + optional silence row, ~200-260px each); with up to 5 concurrent
drips the setup form gets pushed far down. What's a laconic way to condense
the list without losing anything spec-mandated?

**Constraint carried into every variant** (specs/001-drip-rate-core/spec.md
FR-8): name/label + gtt/min + time-remaining must stay visible for every drip
at once, no expansion needed. Silence control (SilenceToggle, the hold-to-mute
gesture) also stays reachable on every drip with a bag alarm — there's no
other way to reach it (FocusOverlay doesn't expose it).

**Variants** — open `npm run dev`, go to the Крапельниця tab, add a couple of
drips, then use the floating switcher (bottom-center, dev build only) or
`?variant=A|B|C` in the URL:

- **A — Active stays rich, others slim.** The paced drip (`isActive`) keeps
  today's full card; every other drip collapses to a single-line row
  (`.proto-row`) automatically. No user action.
- **B — Manual compact toggle.** A "Детально/Компактно" segmented control in
  the section header switches every card at once, including the paced one
  (`.proto-strip`).
- **C — Scales with count.** 1 drip → full card, 2 → trimmed card (drops
  chamber animation/tap-hint/badge), 3+ → every card is a slim row
  (`.proto-strip` + a shrunk `Chamber` via `.proto-chamber-mini`), paced one
  picked out by a thicker accent border instead of size.

**Open tradeoff to flag, not yet resolved:** the compact icon buttons
(`.proto-row-icon`, 34px) are below the app's own 48px (`--touch`) minimum
tap-target rule used everywhere else. Worth deciding explicitly — bump them to
48px (costs some of the density win) or accept smaller targets for secondary
actions (metronome/remove) on non-focused rows.

**Verdict (2026-08-20):** going with **A**. Two refinements requested and
applied: the collapsed row is a bit roomier (bigger gtt readout, taller tap
area, 38px icon buttons instead of 34px), and the row + SilenceToggle are now
one bordered `.proto-row-card` instead of two separately-bordered siblings —
matches DripCard's own banner/tap/silence nesting, just shorter. The
idle SilenceToggle blends into the card (hairline divider, no box of its
own); holding/silenced still pop out with their full background so the loud
states stay loud.

Still open: not yet folded into `DripCard.tsx` — B/C are still here for
reference in case A needs more iteration first.

**Cleanup:** delete `src/drip/prototype-density/`, remove the `?variant=`
wiring + `protoCompact` state + `ProtoDensitySwitcher` render in
`DripScreen.tsx`, and strip the `.proto-*` block from `src/theme.css` — fold
whichever variant wins into `DripCard.tsx` / `theme.css` for real.
