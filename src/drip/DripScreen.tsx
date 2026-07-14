// Drip engine screen (Spec 001). Drop-factor selector + weight/dose steppers +
// gtt/min hero, up to 3 concurrent drips each with its own timer + 5-min pre-end
// alarm; one audible metronome at a time (FR-9). All math is engineering; drug
// concentrations come from VERIFIED records only (fail-closed).
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
  TIME_MIN,
  DROP_FACTORS,
  doseToMlPerH,
  mlPerHToGtt,
  volumeTimeToGtt,
  secPerDrop,
  bagRunHours,
  parseConcentrationMgPerMl,
} from "./calc";

interface ConcPreset {
  drug: Drug;
  conc: number; // mg/ml
  use: string; // "Знеболення" | "Седація"
  label: string;
}

function fmtHours(h: number): string {
  if (!isFinite(h) || h <= 0) return "—";
  const totalMin = Math.round(h * 60);
  const hh = Math.floor(totalMin / 60);
  const mm = totalMin % 60;
  return hh > 0 ? `${hh} год ${mm} хв` : `${mm} хв`;
}

interface ActiveDrip {
  id: string;
  label: string;
  gtt: number;
  mlPerH: number;
  dropFactor: number;
  bagMl: number | null;
  startedAt: number;
  sourceId?: string;
  warned5: boolean;
  warnedEmpty: boolean;
}

type Mode = "dose" | "volume";

function beep(): void {
  try {
    const Ctor = (window as unknown as { AudioContext?: typeof AudioContext }).AudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = 660;
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.25);
  } catch {
    /* audio unavailable */
  }
  if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate([120, 60, 120]);
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
    list.sort((a, b) => a.conc - b.conc); // analgesia (1 mg/ml) on the left / default
    return list;
  }, []);

  const [dropFactor, setDropFactor] = useState(20);
  const [mode, setMode] = useState<Mode>(presets.length ? "dose" : "volume");
  const [presetIdx, setPresetIdx] = useState(0);
  const [weight, setWeight] = useState(80);
  const [dose, setDose] = useState(0.2);
  const [volumeMl, setVolumeMl] = useState(500);
  const [timeMin, setTimeMin] = useState(240);
  const [bagMl, setBagMl] = useState(100);

  const [drips, setDrips] = useState<ActiveDrip[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [audio, setAudio] = useState(true);
  const [haptic, setHaptic] = useState(true);
  const metronome = useRef<Metronome | null>(null);

  const preset = presets[presetIdx];
  const conc = preset?.conc ?? 1;

  const live = useMemo(() => {
    if (mode === "dose") {
      const mlPerH = doseToMlPerH(dose, weight, conc);
      const gttF = mlPerHToGtt(mlPerH, dropFactor);
      return { mlPerH, gtt: Math.round(gttF), gttF };
    }
    const gtt = volumeTimeToGtt(volumeMl, timeMin, dropFactor);
    const mlPerH = (volumeMl / timeMin) * 60;
    return { mlPerH, gtt, gttF: gtt };
  }, [mode, dose, weight, conc, dropFactor, volumeMl, timeMin]);

  // one metronome instance
  useEffect(() => {
    metronome.current = new Metronome();
    return () => metronome.current?.stop();
  }, []);

  // drive the metronome from the active drip
  useEffect(() => {
    const m = metronome.current;
    if (!m) return;
    m.setChannels({ audio, haptic, animation: true });
    const d = drips.find((x) => x.id === activeId);
    if (d && d.gtt > 0) {
      m.setRate(d.gtt);
      m.start(d.gtt);
    } else {
      m.stop();
    }
  }, [activeId, drips, audio, haptic]);

  // 1 s tick: update countdowns + fire alarms
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    setDrips((prev) => {
      let changed = false;
      const next = prev.map((d) => {
        if (d.bagMl == null || d.mlPerH <= 0) return d;
        const totalMs = bagRunHours(d.bagMl, d.mlPerH) * 3600_000;
        const remMs = d.startedAt + totalMs - now;
        if (!d.warned5 && remMs <= 5 * 60_000 && remMs > 0) {
          beep();
          changed = true;
          return { ...d, warned5: true };
        }
        if (!d.warnedEmpty && remMs <= 0) {
          beep();
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
    const label = mode === "dose" ? preset?.drug.drug.split(" ")[0] ?? "Дріп" : "Крапельниця";
    const d: ActiveDrip = {
      id,
      label,
      gtt: live.gtt,
      mlPerH: live.mlPerH,
      dropFactor,
      bagMl: mode === "dose" ? bagMl : volumeMl,
      startedAt: Date.now(),
      sourceId: mode === "dose" ? preset?.drug.source_document : undefined,
      warned5: false,
      warnedEmpty: false,
    };
    setDrips((p) => [...p, d]);
    if (!activeId) setActiveId(id);
  }

  function removeDrip(id: string) {
    setDrips((p) => p.filter((d) => d.id !== id));
    if (activeId === id) setActiveId(null);
  }

  function remaining(d: ActiveDrip): string {
    if (d.bagMl == null || d.mlPerH <= 0) return "—";
    const remMs = d.startedAt + bagRunHours(d.bagMl, d.mlPerH) * 3600_000 - now;
    if (remMs <= 0) return "порожньо";
    const min = Math.floor(remMs / 60_000);
    const h = Math.floor(min / 60);
    return h > 0 ? `${h} год ${min % 60} хв` : `${min} хв`;
  }

  const spd = live.gtt > 0 ? Math.round(secPerDrop(live.gtt)) : 0;

  return (
    <section>
      <h1>Крапельниця</h1>

      <div className="seg" role="tablist" aria-label="режим">
        {presets.length > 0 && (
          <button className={mode === "dose" ? "on" : ""} onClick={() => setMode("dose")}>
            За препаратом
          </button>
        )}
        <button className={mode === "volume" ? "on" : ""} onClick={() => setMode("volume")}>
          Об'єм / час
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
          <Stepper label="Об'єм мішка, мл" value={bagMl} display={`${bagMl} мл`} step={50} min={VOLUME.min} max={VOLUME.max} onChange={setBagMl} />
          <div className="runtime">Мішка вистачить на ~{fmtHours(live.mlPerH > 0 ? bagMl / live.mlPerH : Infinity)}</div>
        </>
      )}

      {mode === "volume" && (
        <>
          <Stepper label="Об'єм, мл" value={volumeMl} display={`${volumeMl} мл`} step={50} min={VOLUME.min} max={VOLUME.max} onChange={setVolumeMl} />
          <Stepper label="Час інфузії" value={timeMin} display={fmtHours(timeMin / 60)} step={15} min={TIME_MIN.min} max={TIME_MIN.max} onChange={setTimeMin} />
        </>
      )}

      <div className="hero">
        <div className="hero-label">Крапель / хв</div>
        <div className="hero-num">{live.gtt}</div>
        <div className="hero-sub">{live.gtt > 0 ? `1 крапля / ${spd} с · ${live.mlPerH.toFixed(1)} мл/год` : "перевір параметри"}</div>
      </div>

      {mode === "dose" && preset && <SourceBadge record={preset.drug} />}

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
                <div className="drip-row">
                  <span className="drip-label">{d.label}</span>
                  <span className="drip-gtt">{d.gtt} кр/хв</span>
                </div>
                <div className="drip-row small">
                  <span>{d.dropFactor} gtt/ml · {d.mlPerH.toFixed(1)} мл/год</span>
                  <span>{remaining(d)}</span>
                </div>
                <div className="drop-anim" aria-hidden="true">
                  <span className="drop" style={{ animationDuration: `${(60 / Math.max(1, d.gtt)).toFixed(2)}s` }} />
                </div>
                <div className="drip-actions">
                  <button className={isActive ? "on" : ""} onClick={() => setActiveId(isActive ? null : d.id)}>
                    {isActive ? "◼ Метроном" : "▶ Метроном"}
                  </button>
                  <button onClick={() => removeDrip(d.id)}>Прибрати</button>
                </div>
              </article>
            );
          })}
          <div className="toggles">
            <label><input type="checkbox" checked={audio} onChange={(e) => setAudio(e.target.checked)} /> Звук</label>
            <label><input type="checkbox" checked={haptic} onChange={(e) => setHaptic(e.target.checked)} /> Вібрація</label>
          </div>
        </>
      )}
    </section>
  );
}
