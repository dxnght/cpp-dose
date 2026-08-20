// Drip engine screen (Spec 001 + Spec 003 burn mode). Drop-factor selector +
// steppers + gtt/min hero, up to 5 concurrent drips each with its own timer +
// two-stage pre-end alarm — 10 min and 5 min remaining (Owner decision
// 2026-07-21, expanding the single 5→10 min change from 2026-07-18); one
// audible metronome at a time (FR-9). Focus mode with
// live retitration, a phase-synced drip-chamber animation shared with the audio
// metronome, confirm-to-remove, tap-to-calibrate, and
// remembered last drop-factor/drug. All math is engineering; drug concentrations
// and the burn Rule of Ten come from VERIFIED records only (fail-closed).
import { useEffect, useMemo, useState } from "react";
import { fieldBundle } from "../clinical/loader";
import { isRenderable } from "../clinical/guard";
import {
  DROP_FACTORS,
  doseToMlPerH,
  mlPerHToGtt,
  secPerDrop,
  burnRuleOfTenMlPerH,
  parseConcentrationMgPerMl,
} from "./calc";
import { NOTIFICATIONS_ENABLED } from "../config";
import { nowMs } from "./format";
import { PaceToggles } from "./components";
import { FocusOverlay } from "./FocusOverlay";
import { CalibratorOverlay } from "./CalibratorOverlay";
import { DripCard } from "./DripCard";
import { NewDripForm } from "./NewDripForm";
import { LS } from "./local-storage";
import { useDripEngine, MAX_DRIPS } from "./useDripEngine";
import type { ConcPreset, Mode, DripBadgeStatus } from "./types";
// PROTOTYPE — active-drips density exploration (throwaway, dev build only).
// See src/drip/prototype-density/NOTES.md. Delete this import block + every
// `PROTO_DENSITY &&` branch below once a direction is picked.
import { VariantA } from "./prototype-density/VariantA";
import { VariantB } from "./prototype-density/VariantB";
import { VariantC } from "./prototype-density/VariantC";
import {
  ProtoDensitySwitcher,
  getVariantFromUrl,
  type VariantKey,
} from "./prototype-density/Switcher";

const PROTO_DENSITY = import.meta.env.DEV;

export function DripScreen({
  onStatusChange,
}: {
  onStatusChange?: (status: DripBadgeStatus) => void;
} = {}) {
  const presets: ConcPreset[] = useMemo(() => {
    const list = fieldBundle.drugs
      // Fail-closed (Art. III), quietly excluding rather than throwing
      // (2026-07-22 UX review): this feeds a bulk useMemo, not a per-card
      // render, so a throw here (the old assertRenderable(d) call) would
      // abort the *whole* list construction, not just one entry — an
      // ErrorBoundary can't help since the throw happens inside this
      // component's own render, not a child's. compile:field already
      // guarantees only VERIFIED/engineering drugs reach the bundle; this is
      // defense in depth with zero blast radius instead of a contained one.
      .filter((d) => isRenderable(d))
      .map((d) => {
        const c = parseConcentrationMgPerMl(d.infusion?.concentration);
        if (!c) return null;
        const ind = d.indication.toLowerCase();
        const use = ind.includes("analges")
          ? "Знеболення"
          : ind.includes("sedation")
            ? "Седація"
            : "Інфузія";
        // Drug name included (2026-07-22 UX review) — the selector and the
        // running-drip card used to show only category+concentration
        // ("Знеболення · 1 мг/мл"), never which drug, so a medic had to infer
        // it from the concentration number alone.
        return {
          drug: d,
          conc: c,
          use,
          label: `${d.drug} · ${use} · ${c} мг/мл`,
        };
      })
      .filter((x): x is ConcPreset => x !== null);
    list.sort((a, b) => a.conc - b.conc); // analgesia (1 mg/ml) default / left
    return list;
  }, []);

  const burnFormula = useMemo(
    () => fieldBundle.formulas.find((f) => f.id === "burn_rule_of_ten"),
    [],
  );

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
  const [customConc, setCustomConc] = useState(1);
  const [tbsa, setTbsa] = useState(30);
  const [bagGtt, setBagGtt] = useState(5);
  const [bagMl, setBagMl] = useState(100);
  const [calib, setCalib] = useState(false);
  const [taps, setTaps] = useState<number[]>([]);
  // PROTOTYPE — see NOTES.md above the imports.
  const [protoVariant, setProtoVariant] = useState<VariantKey>(() =>
    PROTO_DENSITY ? getVariantFromUrl() : "A",
  );
  const [protoCompact, setProtoCompact] = useState(false);

  const preset = presets[presetIdx];
  // presetIdx === presets.length selects "Інший препарат" (no VERIFIED
  // record) — preset is undefined and the medic supplies the concentration
  // themselves via customConc, same "explicit medic input" path calc.ts
  // already documents as legitimate alongside a record.
  const conc = preset?.conc ?? customConc;
  const burnGated = mode === "burn" && !burnFormula;
  const calRate =
    taps.length >= 3
      ? Math.round(
          (60000 * (taps.length - 1)) / (taps[taps.length - 1] - taps[0]),
        )
      : null;

  const bolus = useMemo(
    () =>
      preset
        ? fieldBundle.drugs.find((d) => d.bolus_for === preset.drug.id)
        : undefined,
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

  useEffect(
    () => LS.set("cpp-dose.dropFactor", String(dropFactor)),
    [dropFactor],
  );
  useEffect(() => {
    if (preset) LS.set("cpp-dose.drugId", preset.drug.id);
  }, [preset]);

  const {
    drips,
    activeId,
    focusDrip,
    confirmId,
    notifDenied,
    audio,
    setAudio,
    haptic,
    setHaptic,
    addDrip,
    onRemoveClick,
    retitrate,
    enterFocus,
    closeFocus,
    togglePacing,
    setSilenced,
    confirmDrip,
    setDisplayTag,
    remaining,
    quietHint,
    alarmStage,
  } = useDripEngine({
    mode,
    preset,
    burnFormula,
    dropFactor,
    bagMl,
    live,
    onStatusChange,
  });

  function applyCalib() {
    if (calRate) setBagGtt(Math.max(1, Math.min(600, calRate)));
    setCalib(false);
  }

  const spd = live.gtt > 0 ? Math.round(secPerDrop(live.gtt)) : 0;

  return (
    <section>
      {focusDrip && (
        <FocusOverlay
          drip={focusDrip}
          activeId={activeId}
          audio={audio}
          haptic={haptic}
          onAudioChange={setAudio}
          onHapticChange={setHaptic}
          onClose={closeFocus}
          onDisplayTagChange={setDisplayTag}
          onRetitrate={retitrate}
          onTogglePacing={togglePacing}
          remaining={remaining}
          alarmStage={alarmStage}
        />
      )}

      {calib && (
        <CalibratorOverlay
          calRate={calRate}
          taps={taps}
          bagMl={bagMl}
          dropFactor={dropFactor}
          onTap={() => setTaps((t) => [...t, nowMs()].slice(-20))}
          onReset={() => setTaps([])}
          onApply={applyCalib}
          onClose={() => setCalib(false)}
        />
      )}

      <h1>Крапельниця</h1>

      {/* Active drips render above the calculator once any exist
          (2026-07-22 UX review — checking/muting a running drip used to
          require scrolling past the whole setup panel every time). */}
      {drips.length > 0 && (
        <>
          <h2>
            Активні дріпи ({drips.length}/{MAX_DRIPS})
          </h2>
          {/* PROTOTYPE — variant B's manual density control. */}
          {PROTO_DENSITY && protoVariant === "B" && (
            <div className="proto-density-toggle">
              <button
                className={!protoCompact ? "on" : ""}
                onClick={() => setProtoCompact(false)}
              >
                Детально
              </button>
              <button
                className={protoCompact ? "on" : ""}
                onClick={() => setProtoCompact(true)}
              >
                Компактно
              </button>
            </div>
          )}
          {drips.some((d) => d.unconfirmed) && (
            <div className="banner banner--warn" role="alert">
              ⚠ Ці дріпи відновлено після перезапуску застосунку. Звір із
              реальними крапельницями: підтверди ті, що ще крапають, і прибери
              решту. Відлік показано з попередньої сесії — не покладайся на
              нього, доки не підтвердиш.
            </div>
          )}
          {/* Play build has no OS-notification backstop (see src/config.ts),
              so it says plainly what the alarm can and can't do instead of
              showing permission/battery advice that doesn't apply to it. */}
          {!NOTIFICATIONS_ENABLED && drips.some((d) => d.bagMl != null) && (
            <div className="banner banner--hint">
              Будильник працює, поки застосунок відкритий і екран увімкнений.
              Тримай телефон розблокованим під час дріпу.
              <br />
              <strong>На iPhone у веб-версії:</strong> вібрації немає (Safari її
              не підтримує), а бічний перемикач «без звуку» глушить сигнал.
              Тобто з вимкненим звуком лишиться <em>лише</em> підсвітка картки —
              перевір, що перемикач у положенні дзвінка. Для вібрації потрібна
              Android-збірка (APK).
            </div>
          )}
          {NOTIFICATIONS_ENABLED &&
            notifDenied &&
            drips.some((d) => d.bagMl != null) && (
              <div className="banner banner--warn" role="alert">
                ⚠ Сповіщення вимкнено або обмежені — будильник може не
                спрацювати при заблокованому екрані. Перевір дозволи сповіщень
                для CPP-DOSE в налаштуваннях телефону.
              </div>
            )}
          {NOTIFICATIONS_ENABLED &&
            !notifDenied &&
            drips.some((d) => d.bagMl != null) && (
              <div className="banner banner--hint">
                Порада: додай CPP-DOSE у виключення з оптимізації батареї
                (Налаштування → Застосунки → CPP-DOSE → Батарея) — інакше
                телефон може відкладати будильник при заблокованому екрані,
                навіть якщо сповіщення дозволені.
              </div>
            )}
          {drips.map((d) => {
            const cardProps = {
              drip: d,
              isActive: d.id === activeId,
              confirmId,
              remaining,
              quietHint,
              alarmStage,
              onConfirm: confirmDrip,
              onEnterFocus: enterFocus,
              onTogglePacing: togglePacing,
              onRemoveClick,
              onSetSilenced: setSilenced,
            };
            // PROTOTYPE — pick the density variant under test; falls through
            // to the real DripCard in production builds.
            if (PROTO_DENSITY && protoVariant === "A")
              return <VariantA key={d.id} {...cardProps} />;
            if (PROTO_DENSITY && protoVariant === "B")
              return <VariantB key={d.id} {...cardProps} compact={protoCompact} />;
            if (PROTO_DENSITY && protoVariant === "C")
              return <VariantC key={d.id} {...cardProps} total={drips.length} />;
            return <DripCard key={d.id} {...cardProps} />;
          })}
          {activeId != null && (
            <PaceToggles
              audio={audio}
              haptic={haptic}
              onAudioChange={setAudio}
              onHapticChange={setHaptic}
            />
          )}
          <p className="runtime left">
            {activeId != null
              ? "Тап по дріпу — фокус-режим."
              : "Тап по дріпу — фокус-режим. Запусти метроном (▶), щоб задати темп."}
          </p>
        </>
      )}

      <NewDripForm
        dripsCount={drips.length}
        maxDrips={MAX_DRIPS}
        mode={mode}
        onModeChange={setMode}
        presets={presets}
        preset={preset}
        presetIdx={presetIdx}
        onPresetIdxChange={setPresetIdx}
        dropFactor={dropFactor}
        onDropFactorChange={setDropFactor}
        weight={weight}
        onWeightChange={setWeight}
        dose={dose}
        onDoseChange={setDose}
        customConc={customConc}
        onCustomConcChange={setCustomConc}
        bolus={bolus}
        tbsa={tbsa}
        onTbsaChange={setTbsa}
        bagMl={bagMl}
        onBagMlChange={setBagMl}
        bagGtt={bagGtt}
        onBagGttChange={setBagGtt}
        burnGated={burnGated}
        burnFormula={burnFormula}
        live={live}
        spd={spd}
        onCalibrate={() => {
          setTaps([]);
          setCalib(true);
        }}
        onAddDrip={addDrip}
      />

      {/* PROTOTYPE — active-drips density switcher, dev build only. */}
      {PROTO_DENSITY && (
        <ProtoDensitySwitcher current={protoVariant} onChange={setProtoVariant} />
      )}
    </section>
  );
}
