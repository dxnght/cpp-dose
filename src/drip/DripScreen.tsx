// Drip engine screen (Spec 001 + Spec 003 burn mode). Drop-factor selector +
// steppers + gtt/min hero, up to 3 concurrent drips each with its own timer +
// 5-min pre-end alarm; one audible metronome at a time (FR-9). Focus mode with
// live retitration, a phase-synced drip-chamber animation shared with a silent
// screen-flash and the audio metronome, confirm-to-remove, tap-to-calibrate, and
// remembered last drop-factor/drug. All math is engineering; drug concentrations
// and the burn Rule of Ten come from VERIFIED records only (fail-closed).
import { useEffect, useMemo, useRef, useState } from "react";
import { fieldBundle } from "../clinical/loader";
import { assertRenderable } from "../clinical/guard";
import { SourceBadge } from "../components/SourceBadge";
import type { Drug } from "../clinical/types";
import { Metronome } from "./metronome";
import {
  clamp,
  DOSE,
  WEIGHT,
  VOLUME,
  DROP_FACTORS,
  doseToMlPerH,
  mlPerHToGtt,
  secPerDrop,
  bagRunHours,
  burnRuleOfTenMlPerH,
  doseRangeMg,
  parseConcentrationMgPerMl,
} from "./calc";

interface ConcPreset {
  drug: Drug;
  conc: number; // mg/ml
  use: string; // "Знеболення" | "Седація"
  label: string;
}

interface ActiveDrip {
  id: string;
  label: string;
  gtt: number;
  mlPerH: number;
  dropFactor: number;
  bagMl: number | null;
  startedAt: number;
  animStart: number; // performance.now() ms — shared phase anchor
  warned5: boolean;
  warnedEmpty: boolean;
}

type Mode = "dose" | "bagtime" | "burn";

const LS = {
  get(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, val: string): void {
    try {
      localStorage.setItem(key, val);
    } catch {
      /* storage unavailable */
    }
  },
};

const nowMs = (): number => (typeof performance !== "undefined" ? performance.now() : Date.now());

function fmtHours(h: number): string {
  if (!isFinite(h) || h <= 0) return "—";
  const totalMin = Math.round(h * 60);
  const hh = Math.floor(totalMin / 60);
  const mm = totalMin % 60;
  return hh > 0 ? `${hh} год ${mm} хв` : `${mm} хв`;
}

function fmtHM(h: number): string {
  if (!isFinite(h) || h <= 0) return "—";
  const totalMin = Math.round(h * 60);
  return `${Math.floor(totalMin / 60)}:${String(totalMin % 60).padStart(2, "0")}`;
}

function dur(gtt: number): string {
  return `${(60 / Math.max(1, gtt)).toFixed(2)}s`;
}

// Distinct alarm feel: a short double for the 5-min warning, a long triple at empty.
function alarm(kind: "warn" | "empty"): void {
  try {
    const Ctor = (window as unknown as { AudioContext?: typeof AudioContext }).AudioContext;
    if (Ctor) {
      const ctx = new Ctor();
      const beeps = kind === "warn" ? 2 : 3;
      for (let i = 0; i < beeps; i++) {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.frequency.value = kind === "warn" ? 660 : 520;
        const t = ctx.currentTime + i * 0.22;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.3, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
        o.connect(g);
        g.connect(ctx.destination);
        o.start(t);
        o.stop(t + 0.2);
      }
    }
  } catch {
    /* audio unavailable */
  }
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(kind === "warn" ? [80, 60, 80] : [220, 90, 220, 90, 220]);
  }
}

function Stepper(props: {
  label: string;
  value: number;
  display: string;
  step: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="stepper">
      <button aria-label={`${props.label} −`} onClick={() => props.onChange(Math.max(props.min, props.value - props.step))}>
        −
      </button>
      <div className="stepper-value">
        <span className="stepper-label">{props.label}</span>
        <span className="stepper-num">{props.display}</span>
      </div>
      <button aria-label={`${props.label} +`} onClick={() => props.onChange(Math.min(props.max, props.value + props.step))}>
        +
      </button>
    </div>
  );
}

// The chamber picks up the shared phase (animStart) at mount via a negative delay,
// so a freshly-opened focus chamber continues the card's phase (never restarts).
function Chamber({ gtt, animStart }: { gtt: number; animStart: number }) {
  const delayRef = useRef(-((nowMs() - animStart) / 1000));
  return (
    <div className="chamber" aria-hidden="true">
      <span className="chamber-pool" />
      <span className="chamber-drop" style={{ animationDuration: dur(gtt), animationDelay: `${delayRef.current}s` }} />
    </div>
  );
}

export function DripScreen() {
  const presets: ConcPreset[] = useMemo(() => {
    const list = fieldBundle.drugs
      .map((d) => {
        assertRenderable(d); // fail-closed
        const c = parseConcentrationMgPerMl(d.infusion?.concentration);
        if (!c) return null;
        const ind = d.indication.toLowerCase();
        const use = ind.includes("analges") ? "Знеболення" : ind.includes("sedation") ? "Седація" : "Інфузія";
        return { drug: d, conc: c, use, label: `${use} · ${c} мг/мл` };
      })
      .filter((x): x is ConcPreset => x !== null);
    list.sort((a, b) => a.conc - b.conc); // analgesia (1 mg/ml) default / left
    return list;
  }, []);

  const burnFormula = useMemo(() => fieldBundle.formulas.find((f) => f.id === "burn_rule_of_ten"), []);

  const [dropFactor, setDropFactor] = useState(() => {
    const v = Number(LS.get("cpp-dose.dropFactor"));
    return (DROP_FACTORS as readonly number[]).includes(v) ? v : 20;
  });
  const [mode, setMode] = useState<Mode>(presets.length ? "dose" : "bagtime");
  const [presetIdx, setPresetIdx] = useState(() => {
    const id = LS.get("cpp-dose.drugId");
    const i = presets.findIndex((p) => p.drug.id === id);
    return i >= 0 ? i : 0;
  });
  const [weight, setWeight] = useState(80);
  const [dose, setDose] = useState(0.2);
  const [tbsa, setTbsa] = useState(30);
  const [bagGtt, setBagGtt] = useState(5);
  const [bagMl, setBagMl] = useState(100);

  const [drips, setDrips] = useState<ActiveDrip[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [audio, setAudio] = useState(true);
  const [haptic, setHaptic] = useState(true);
  const [flashOn, setFlashOn] = useState(false);
  const [calib, setCalib] = useState(false);
  const [taps, setTaps] = useState<number[]>([]);

  const metronome = useRef<Metronome | null>(null);
  const flashElRef = useRef<HTMLDivElement>(null);
  const wantFlashRef = useRef(false);
  const confirmTimer = useRef<number | null>(null);
  const startedRef = useRef<string | null>(null);

  const preset = presets[presetIdx];
  const conc = preset?.conc ?? 1;
  const burnGated = mode === "burn" && !burnFormula;
  const focusDrip = drips.find((d) => d.id === focusId) ?? null;
  const calRate =
    taps.length >= 3 ? Math.round((60000 * (taps.length - 1)) / (taps[taps.length - 1] - taps[0])) : null;

  const bolus = useMemo(
    () => (preset ? fieldBundle.drugs.find((d) => d.bolus_for === preset.drug.id) : undefined),
    [preset],
  );

  const live = useMemo(() => {
    if (mode === "dose") {
      const mlPerH = doseToMlPerH(dose, weight, conc);
      return { mlPerH, gtt: Math.round(mlPerHToGtt(mlPerH, dropFactor)) };
    }
    if (mode === "burn") {
      if (!burnFormula) return { mlPerH: 0, gtt: 0 };
      const mlPerH = burnRuleOfTenMlPerH(tbsa, weight);
      return { mlPerH, gtt: Math.round(mlPerHToGtt(mlPerH, dropFactor)) };
    }
    return { mlPerH: (bagGtt * 60) / dropFactor, gtt: bagGtt };
  }, [mode, dose, weight, conc, dropFactor, tbsa, burnFormula, bagGtt]);

  useEffect(() => LS.set("cpp-dose.dropFactor", String(dropFactor)), [dropFactor]);
  useEffect(() => {
    if (preset) LS.set("cpp-dose.drugId", preset.drug.id);
  }, [preset]);
  useEffect(() => {
    wantFlashRef.current = flashOn;
  }, [flashOn]);

  useEffect(() => {
    const m = new Metronome();
    m.setTickHandler(() => {
      if (!wantFlashRef.current) return;
      const el = flashElRef.current;
      if (!el) return;
      el.style.opacity = "0.5";
      window.setTimeout(() => {
        if (el) el.style.opacity = "0";
      }, 90);
    });
    metronome.current = m;
    return () => m.stop();
  }, []);

  // (Re)start the metronome only when the active drip or its rate changes, anchored
  // to that drip's animStart so audio, flash and animation share one phase.
  useEffect(() => {
    const m = metronome.current;
    if (!m) return;
    m.setChannels({ audio, haptic, animation: true });
    const d = drips.find((x) => x.id === activeId);
    const key = d && d.gtt > 0 ? `${d.id}:${d.gtt}` : null;
    if (key !== startedRef.current) {
      startedRef.current = key;
      if (d && d.gtt > 0) m.start(d.gtt, d.animStart / 1000);
      else m.stop();
    }
  }, [activeId, drips, audio, haptic]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (drips.length === 0) return;
    const nav = navigator as unknown as {
      wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> };
    };
    let lock: { release: () => Promise<void> } | null = null;
    let cancelled = false;
    const acquire = () => {
      nav.wakeLock
        ?.request("screen")
        .then((l) => {
          if (cancelled) void l.release();
          else lock = l;
        })
        .catch(() => {});
    };
    acquire();
    const onVis = () => {
      if (document.visibilityState === "visible" && !lock) acquire();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVis);
      void lock?.release().catch(() => {});
    };
  }, [drips.length]);

  useEffect(() => {
    setDrips((prev) => {
      let changed = false;
      const next = prev.map((d) => {
        if (d.bagMl == null || d.mlPerH <= 0) return d;
        const remMs = d.startedAt + bagRunHours(d.bagMl, d.mlPerH) * 3600_000 - now;
        if (!d.warned5 && remMs <= 5 * 60_000 && remMs > 0) {
          alarm("warn");
          changed = true;
          return { ...d, warned5: true };
        }
        if (!d.warnedEmpty && remMs <= 0) {
          alarm("empty");
          changed = true;
          return { ...d, warnedEmpty: true };
        }
        return d;
      });
      return changed ? next : prev;
    });
  }, [now]);

  function addDrip() {
    if (drips.length >= 3 || live.gtt <= 0) return;
    const id = `d${Date.now()}`;
    const label = mode === "dose" ? preset?.use ?? "Дріп" : mode === "burn" ? "Опікова рідина" : "Крапельниця";
    setDrips((p) => [
      ...p,
      {
        id,
        label,
        gtt: live.gtt,
        mlPerH: live.mlPerH,
        dropFactor,
        bagMl,
        startedAt: Date.now(),
        animStart: nowMs(),
        warned5: false,
        warnedEmpty: false,
      },
    ]);
    if (!activeId) setActiveId(id);
  }

  function removeDrip(id: string) {
    setDrips((p) => p.filter((d) => d.id !== id));
    if (activeId === id) setActiveId(null);
    if (focusId === id) setFocusId(null);
  }

  function onRemoveClick(id: string) {
    if (confirmId === id) {
      removeDrip(id);
      setConfirmId(null);
      return;
    }
    setConfirmId(id);
    if (confirmTimer.current) clearTimeout(confirmTimer.current);
    confirmTimer.current = window.setTimeout(() => setConfirmId(null), 3000);
  }

  function retitrate(id: string, delta: number) {
    setDrips((p) =>
      p.map((d) => {
        if (d.id !== id) return d;
        const gtt = Math.max(1, Math.min(600, d.gtt + delta));
        return { ...d, gtt, mlPerH: (gtt * 60) / d.dropFactor };
      }),
    );
  }

  function enterFocus(id: string) {
    setActiveId(id);
    setFocusId(id);
  }

  function applyCalib() {
    if (calRate) setBagGtt(Math.max(1, Math.min(600, calRate)));
    setCalib(false);
  }

  function remaining(d: ActiveDrip): string {
    if (d.bagMl == null || d.mlPerH <= 0) return "—";
    const remMs = d.startedAt + bagRunHours(d.bagMl, d.mlPerH) * 3600_000 - now;
    if (remMs <= 0) return "порожньо";
    const min = Math.floor(remMs / 60_000);
    return min >= 60 ? `${Math.floor(min / 60)} год ${min % 60} хв` : `${min} хв`;
  }

  const spd = live.gtt > 0 ? Math.round(secPerDrop(live.gtt)) : 0;

  return (
    <section>
      <div ref={flashElRef} className="flash-layer" aria-hidden="true" />

      {focusDrip && (
        <div className="focus-overlay" role="dialog" aria-label="фокус-режим" onClick={() => setFocusId(null)}>
          <div className="focus-label">{focusDrip.label}</div>
          <div className="focus-retit" onClick={(e) => e.stopPropagation()}>
            <button aria-label="повільніше" onClick={() => retitrate(focusDrip.id, -1)}>
              −
            </button>
            <div className="focus-gtt">
              {focusDrip.gtt}
              <span> кр/хв</span>
            </div>
            <button aria-label="швидше" onClick={() => retitrate(focusDrip.id, 1)}>
              +
            </button>
          </div>
          <div className="focus-chamber-scale">
            <Chamber gtt={focusDrip.gtt} animStart={focusDrip.animStart} />
          </div>
          <div className="focus-rem">Залишок: {remaining(focusDrip)}</div>
          <div className="focus-hint">Торкніться фону, щоб вийти</div>
        </div>
      )}

      {calib && (
        <div className="focus-overlay" role="dialog" aria-label="калібратор">
          <div className="focus-label">Стукай у такт краплям</div>
          <div className="focus-gtt">
            {calRate ?? "—"}
            <span> кр/хв</span>
          </div>
          <button className="calib-tap" onClick={() => setTaps((t) => [...t, nowMs()].slice(-20))}>
            ТАП
          </button>
          <div className="focus-rem">
            {taps.length} тапів
            {calRate ? ` · ${bagMl} мл ~ ${fmtHM(bagMl / ((calRate * 60) / dropFactor))}` : ""}
          </div>
          <div className="calib-actions" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setTaps([])}>Скинути</button>
            <button className="primary" disabled={!calRate} onClick={applyCalib}>
              Застосувати
            </button>
            <button onClick={() => setCalib(false)}>Закрити</button>
          </div>
        </div>
      )}

      <h1>Крапельниця</h1>

      <div className="seg" role="tablist" aria-label="режим">
        {presets.length > 0 && (
          <button className={mode === "dose" ? "on" : ""} onClick={() => setMode("dose")}>
            Препарат
          </button>
        )}
        <button className={mode === "bagtime" ? "on" : ""} onClick={() => setMode("bagtime")}>
          Час мішка
        </button>
        <button className={mode === "burn" ? "on" : ""} onClick={() => setMode("burn")}>
          Опіки
        </button>
      </div>

      <p className="fieldlabel">Крапель у мл (набір)</p>
      <div className="df-grid">
        {DROP_FACTORS.map((f) => (
          <button key={f} className={f === dropFactor ? "on" : ""} onClick={() => setDropFactor(f)}>
            {f} gtt/ml
          </button>
        ))}
      </div>

      {mode === "dose" && preset && (
        <>
          <p className="fieldlabel">Препарат / концентрація</p>
          <select
            className="conc-select"
            aria-label="препарат і концентрація"
            value={presetIdx}
            onChange={(e) => setPresetIdx(Number(e.target.value))}
          >
            {presets.map((p, i) => (
              <option key={p.drug.id} value={i}>
                {p.label}
              </option>
            ))}
          </select>
          {preset.use === "Седація" && (
            <div className="caution">⚠ Седація — складний процес. Без телемедичної консультації краще не застосовувати.</div>
          )}
          <Stepper label="Вага" value={weight} display={`${weight} кг`} step={5} min={WEIGHT.min} max={WEIGHT.max} onChange={setWeight} />
          <Stepper
            label="Доза, мг/кг/год"
            value={dose}
            display={dose.toFixed(2)}
            step={0.05}
            min={DOSE.min}
            max={DOSE.max}
            onChange={(v) => setDose(clamp(Math.round(v * 100) / 100, DOSE))}
          />
          {bolus?.dose_per_kg && (
            <div className="bolus">
              Болюс перед дріпом: <b>{doseRangeMg(bolus.dose_per_kg, weight) ?? bolus.dose_per_kg}</b>
              <span className="bolus-sub"> {bolus.dose_per_kg} {bolus.route}</span>
            </div>
          )}
          <Stepper label="Об'єм мішка, мл" value={bagMl} display={`${bagMl} мл`} step={50} min={VOLUME.min} max={VOLUME.max} onChange={setBagMl} />
          <div className="runtime">Мішка вистачить на ~{fmtHours(live.mlPerH > 0 ? bagMl / live.mlPerH : Infinity)}</div>
        </>
      )}

      {mode === "burn" && (
        <>
          <Stepper label="% опіків (TBSA)" value={tbsa} display={`${tbsa} %`} step={5} min={0} max={100} onChange={setTbsa} />
          <Stepper label="Вага" value={weight} display={`${weight} кг`} step={5} min={WEIGHT.min} max={WEIGHT.max} onChange={setWeight} />
          <Stepper label="Об'єм мішка, мл" value={bagMl} display={`${bagMl} мл`} step={50} min={VOLUME.min} max={VOLUME.max} onChange={setBagMl} />
          {!burnGated && <div className="runtime">Мішка вистачить на ~{fmtHours(live.mlPerH > 0 ? bagMl / live.mlPerH : Infinity)}</div>}
        </>
      )}

      {mode === "bagtime" && (
        <>
          <p className="runtime" style={{ textAlign: "left" }}>Скільки ще протримається мішок при поточній швидкості.</p>
          <Stepper label="Об'єм мішка, мл" value={bagMl} display={`${bagMl} мл`} step={50} min={VOLUME.min} max={VOLUME.max} onChange={setBagMl} />
          <Stepper label="Крапель/хв (зараз)" value={bagGtt} display={`${bagGtt} кр/хв`} step={1} min={1} max={600} onChange={setBagGtt} />
          <button
            style={{ width: "100%", marginTop: 10 }}
            onClick={() => {
              setTaps([]);
              setCalib(true);
            }}
          >
            ⊙ Калібрувати постукуванням
          </button>
        </>
      )}

      <div className="hero">
        {burnGated ? (
          <>
            <div className="hero-label">Опіки — правило десяток</div>
            <div className="hero-sub">Формула ще не підтверджена. Підтвердьте запис burn_rule_of_ten, щоб рахувати.</div>
          </>
        ) : mode === "bagtime" ? (
          <>
            <div className="hero-label">Мішка вистачить на</div>
            <div className="hero-num">{fmtHM(live.mlPerH > 0 ? bagMl / live.mlPerH : Infinity)}</div>
            <div className="hero-sub">год:хв · {live.mlPerH.toFixed(0)} мл/год</div>
          </>
        ) : (
          <>
            <div className="hero-label">{mode === "burn" ? "Швидкість → крапель/хв" : "Крапель / хв"}</div>
            <div className="hero-num">{live.gtt}</div>
            <div className="hero-sub">
              {live.gtt > 0 ? `1 крапля / ${spd} с · ${live.mlPerH.toFixed(0)} мл/год` : "перевір параметри"}
            </div>
          </>
        )}
      </div>

      {mode === "dose" && preset && <SourceBadge record={preset.drug} />}
      {mode === "burn" && burnFormula && <SourceBadge record={burnFormula} />}

      <button className="primary add-btn" disabled={drips.length >= 3 || live.gtt <= 0} onClick={addDrip}>
        {drips.length >= 3 ? "Максимум 3 дріпи" : "＋ Додати дріп"}
      </button>

      {drips.length > 0 && (
        <>
          <h2>Активні дріпи ({drips.length}/3)</h2>
          {drips.map((d) => {
            const isActive = d.id === activeId;
            return (
              <article key={d.id} className={`drip-card${isActive ? " active" : ""}`}>
                <div className="drip-tap" onClick={() => enterFocus(d.id)}>
                  <div className="drip-mini-top">
                    <span className="drip-mini-name">{d.label}</span>
                    <span className="expand" aria-hidden="true">⤢</span>
                  </div>
                  <div className="drip-mini-gtt">
                    {d.gtt}
                    <span> кр/хв</span>
                  </div>
                  <Chamber gtt={d.gtt} animStart={d.animStart} />
                  <div className="drip-mini-meta">
                    {d.dropFactor} gtt/ml · {d.mlPerH.toFixed(0)} мл/год · {remaining(d)}
                  </div>
                  <div className="tap-hint">Тап — на весь екран</div>
                </div>
                <div className="drip-actions">
                  <button className={isActive ? "on" : ""} onClick={() => setActiveId(isActive ? null : d.id)}>
                    {isActive ? "◼ Метроном" : "▶ Метроном"}
                  </button>
                  <button className={confirmId === d.id ? "danger" : ""} onClick={() => onRemoveClick(d.id)}>
                    {confirmId === d.id ? "Точно прибрати?" : "Прибрати"}
                  </button>
                </div>
              </article>
            );
          })}
          <div className="toggles">
            <label>
              <input type="checkbox" checked={audio} onChange={(e) => setAudio(e.target.checked)} /> Звук
            </label>
            <label>
              <input type="checkbox" checked={haptic} onChange={(e) => setHaptic(e.target.checked)} /> Вібрація
            </label>
            <label>
              <input type="checkbox" checked={flashOn} onChange={(e) => setFlashOn(e.target.checked)} /> Спалах
            </label>
          </div>
          <p className="runtime" style={{ textAlign: "left" }}>Тап по дріпу — фокус-режим. «Спалах» — беззвучний темп світлом.</p>
        </>
      )}
    </section>
  );
}
