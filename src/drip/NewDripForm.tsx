// New-drip setup form: mode tabs, drop-factor grid, per-mode fields, live
// hero, and the add-drip button. Extracted from DripScreen.tsx (2026-08-18)
// to get the main file back under control; behaviour unchanged.
import { Stepper } from "./components";
import { SourceBadge } from "../components/SourceBadge";
import { clamp, CONC, DOSE, WEIGHT, VOLUME, DROP_FACTORS, doseRangeMg } from "./calc";
import { fmtHours, fmtHM } from "./format";
import { DripFormProps } from "./types";

export function NewDripForm({
  dripsCount,
  maxDrips,
  mode,
  onModeChange,
  presets,
  preset,
  presetIdx,
  onPresetIdxChange,
  dropFactor,
  onDropFactorChange,
  weight,
  onWeightChange,
  dose,
  onDoseChange,
  customConc,
  onCustomConcChange,
  bolus,
  tbsa,
  onTbsaChange,
  bagMl,
  onBagMlChange,
  bagGtt,
  onBagGttChange,
  burnGated,
  burnFormula,
  live,
  spd,
  onCalibrate,
  onAddDrip,
}: DripFormProps) {
  return (
    <>
      {dripsCount > 0 && <h2>Новий дріп</h2>}
      <div className="seg" role="tablist" aria-label="режим">
        {presets.length > 0 && (
          <button
            className={mode === "dose" ? "on" : ""}
            onClick={() => onModeChange("dose")}
          >
            За дозою
          </button>
        )}
        <button
          className={mode === "bagtime" ? "on" : ""}
          onClick={() => onModeChange("bagtime")}
        >
          Час мішка
        </button>
        <button
          className={mode === "burn" ? "on" : ""}
          onClick={() => onModeChange("burn")}
        >
          Опіки
        </button>
      </div>

      <p className="fieldlabel">Крапель у мл (набір)</p>
      <div className="df-grid">
        {DROP_FACTORS.map((f) => (
          <button
            key={f}
            className={f === dropFactor ? "on" : ""}
            onClick={() => onDropFactorChange(f)}
          >
            {f} gtt/ml
          </button>
        ))}
      </div>

      {mode === "dose" && (
        <>
          <p className="fieldlabel">Препарат / концентрація</p>
          <select
            className="conc-select"
            aria-label="препарат і концентрація"
            value={presetIdx}
            onChange={(e) => onPresetIdxChange(Number(e.target.value))}
          >
            {presets.map((p, i) => (
              <option key={p.drug.id} value={i}>
                {p.label}
              </option>
            ))}
            <option key="custom" value={presets.length}>
              Інший препарат
            </option>
          </select>
          {preset?.use === "Седація" && (
            <div className="banner banner--warn">
              ⚠ Седація — складний процес. Без телемедичної консультації краще
              не застосовувати.
            </div>
          )}
          {!preset && (
            <Stepper
              label="Концентрація, мг/мл"
              value={customConc}
              display={customConc.toFixed(1)}
              step={0.1}
              min={CONC.min}
              max={CONC.max}
              onChange={(v) =>
                onCustomConcChange(clamp(Math.round(v * 10) / 10, CONC))
              }
            />
          )}
          <Stepper
            label="Вага"
            value={weight}
            display={`${weight} кг`}
            step={5}
            min={WEIGHT.min}
            max={WEIGHT.max}
            onChange={onWeightChange}
          />
          <Stepper
            label="Доза, мг/кг/год"
            value={dose}
            display={dose.toFixed(2)}
            step={0.05}
            min={DOSE.min}
            max={DOSE.max}
            onChange={(v) =>
              onDoseChange(clamp(Math.round(v * 100) / 100, DOSE))
            }
          />
          {bolus?.dose_per_kg && (
            <div className="banner banner--info bolus">
              Болюс перед дріпом:{" "}
              <b>
                {doseRangeMg(bolus.dose_per_kg, weight) ?? bolus.dose_per_kg}
              </b>
              <span className="bolus-sub">
                {" "}
                <div>{"\n"}</div>
                або <b>{bolus.dose_per_kg}</b> - {bolus.route}
              </span>
            </div>
          )}
          <Stepper
            label="Об'єм мішка, мл"
            value={bagMl}
            display={`${bagMl} мл`}
            step={50}
            min={VOLUME.min}
            max={VOLUME.max}
            onChange={onBagMlChange}
          />
          <div className="runtime">
            Мішка вистачить на ~
            {fmtHours(live.mlPerH > 0 ? bagMl / live.mlPerH : Infinity)}
          </div>
        </>
      )}

      {mode === "burn" && (
        <>
          <Stepper
            label="% опіків (TBSA)"
            value={tbsa}
            display={`${tbsa} %`}
            step={5}
            min={0}
            max={100}
            onChange={onTbsaChange}
          />
          <Stepper
            label="Вага"
            value={weight}
            display={`${weight} кг`}
            step={5}
            min={WEIGHT.min}
            max={WEIGHT.max}
            onChange={onWeightChange}
          />
          <Stepper
            label="Об'єм мішка, мл"
            value={bagMl}
            display={`${bagMl} мл`}
            step={50}
            min={VOLUME.min}
            max={VOLUME.max}
            onChange={onBagMlChange}
          />
          {!burnGated && (
            <div className="runtime">
              Мішка вистачить на ~
              {fmtHours(live.mlPerH > 0 ? bagMl / live.mlPerH : Infinity)}
            </div>
          )}
        </>
      )}

      {mode === "bagtime" && (
        <>
          <p className="runtime left">
            Скільки ще протримається мішок при поточній швидкості.
          </p>
          <Stepper
            label="Об'єм мішка, мл"
            value={bagMl}
            display={`${bagMl} мл`}
            step={50}
            min={VOLUME.min}
            max={VOLUME.max}
            onChange={onBagMlChange}
          />
          <Stepper
            label="Крапель/хв (зараз)"
            value={bagGtt}
            display={`${bagGtt} кр/хв`}
            step={1}
            min={1}
            max={600}
            onChange={onBagGttChange}
          />
          <button className="add-btn" onClick={onCalibrate}>
            ⊙ Калібрувати постукуванням
          </button>
        </>
      )}

      <div className="hero">
        {burnGated ? (
          <>
            <div className="hero-label">Опіки — правило десяток</div>
            <div className="hero-sub">
              Формула ще не підтверджена. Підтвердьте запис burn_rule_of_ten,
              щоб рахувати.
            </div>
          </>
        ) : mode === "bagtime" ? (
          <>
            <div className="hero-label">Мішка вистачить на</div>
            <div className="hero-num">
              {fmtHM(live.mlPerH > 0 ? bagMl / live.mlPerH : Infinity)}
            </div>
            <div className="hero-sub">
              год:хв · {live.mlPerH.toFixed(0)} мл/год
            </div>
          </>
        ) : (
          <>
            <div className="hero-label">
              {mode === "burn" ? "Швидкість → крапель/хв" : "Крапель / хв"}
            </div>
            <div className="hero-num">{live.gtt}</div>
            <div className="hero-sub">
              {live.gtt > 0
                ? `1 крапля / ${spd} с · ${live.mlPerH.toFixed(0)} мл/год`
                : "перевір параметри"}
            </div>
          </>
        )}
      </div>

      {mode === "dose" && preset && <SourceBadge record={preset.drug} />}
      {mode === "burn" && burnFormula && <SourceBadge record={burnFormula} />}

      <button
        className="primary add-btn"
        disabled={dripsCount >= maxDrips || live.gtt <= 0}
        onClick={onAddDrip}
        onContextMenu={(e) => e.preventDefault()}
      >
        {dripsCount >= maxDrips
          ? `Максимум ${maxDrips} дріпів`
          : "＋ Додати дріп"}
      </button>
    </>
  );
}
