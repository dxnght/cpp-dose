// Metronome — AudioContext look-ahead scheduler (ADR-0005 / Spec 001 FR-4/5).
// One clock (the AudioContext timeline) drives all channels: the audio tick is
// scheduled on the timeline; the haptic pulse and the animation callback are fired
// at the same tick time, so the three channels cannot drift apart.
//
// No network, no persistence. Audio uses a short synthesized click (no asset).
import { getAudioContext, resumeAudio } from "./audio";

export interface MetronomeChannels {
  audio: boolean;
  haptic: boolean;
  animation: boolean;
}

type TickHandler = () => void;

export class Metronome {
  private ctx: AudioContext | null = null;
  private readonly tickMs = 25; // scheduler wake interval
  private readonly lookahead = 0.2; // seconds scheduled ahead
  private nextTickTime = 0;
  private timer: number | null = null;
  private gttPerMin = 0;
  private channels: MetronomeChannels = {
    audio: true,
    haptic: true,
    animation: true,
  };
  private onTick: TickHandler | null = null;
  private onHaptic: (() => void) | null = null;

  setTickHandler(cb: TickHandler | null): void {
    this.onTick = cb;
  }

  // Platform-agnostic: the app injects the haptic (Capacitor Haptics on native).
  setHapticHandler(cb: (() => void) | null): void {
    this.onHaptic = cb;
  }

  setChannels(c: MetronomeChannels): void {
    this.channels = c;
  }

  setRate(gttPerMin: number): void {
    this.gttPerMin = gttPerMin;
  }

  get running(): boolean {
    return this.timer !== null;
  }

  start(gttPerMin: number, anchorWallSec?: number): void {
    if (gttPerMin <= 0) return;
    this.gttPerMin = gttPerMin;
    // Shared with the alarm (see audio.ts) — one context for the whole app.
    // Two separate contexts is how the alarm ended up silent on iOS: the
    // metronome's got unlocked by the tap that started it, the alarm's never
    // did.
    if (!this.ctx) {
      this.ctx = getAudioContext();
      if (!this.ctx) return; // no Web Audio (e.g. jsdom) — silently no-op
    }
    resumeAudio();
    const period = 60 / gttPerMin;
    if (anchorWallSec != null && typeof performance !== "undefined") {
      // Align ticks to the visual chamber's phase (anchorWallSec + n·period) so the
      // audio tick, the screen flash and the drop animation share one phase.
      const wallNow = performance.now() / 1000;
      const off = wallNow - this.ctx.currentTime; // wall = audio + off
      const k = Math.ceil((wallNow + 0.08 - anchorWallSec) / period);
      this.nextTickTime = anchorWallSec + k * period - off;
    } else {
      this.nextTickTime = this.ctx.currentTime + 0.1;
    }
    if (this.timer === null) {
      this.timer = window.setInterval(() => this.schedule(), this.tickMs);
    }
  }

  stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private intervalSec(): number {
    return this.gttPerMin > 0 ? 60 / this.gttPerMin : 1;
  }

  private schedule(): void {
    if (!this.ctx) return;
    // Re-anchor if the OS suspended/resumed audio (never replay missed ticks).
    if (this.nextTickTime < this.ctx.currentTime) {
      this.nextTickTime = this.ctx.currentTime + 0.05;
    }
    while (this.nextTickTime < this.ctx.currentTime + this.lookahead) {
      const tickTime = this.nextTickTime;
      if (this.channels.audio) this.click(tickTime);
      const delayMs = Math.max(0, (tickTime - this.ctx.currentTime) * 1000);
      window.setTimeout(() => {
        if (this.channels.haptic) this.onHaptic?.();
        if (this.channels.animation) this.onTick?.();
      }, delayMs);
      this.nextTickTime += this.intervalSec();
    }
  }

  private click(time: number): void {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(0.3, time + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(time);
    osc.stop(time + 0.06);
  }
}
