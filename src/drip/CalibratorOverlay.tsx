// Tap-to-calibrate overlay (bagtime mode). Extracted from DripScreen.tsx
// (2026-08-18) to get the main file back under control; behaviour unchanged.
import { fmtHM } from "./format";

export function CalibratorOverlay({
  calRate,
  taps,
  bagMl,
  dropFactor,
  onTap,
  onReset,
  onApply,
  onClose,
}: {
  calRate: number | null;
  taps: number[];
  bagMl: number;
  dropFactor: number;
  onTap: () => void;
  onReset: () => void;
  onApply: () => void;
  onClose: () => void;
}) {
  return (
    <div className="focus-overlay" role="dialog" aria-label="калібратор">
      <div className="focus-label">Стукай у такт краплям</div>
      <div className="focus-gtt">
        {calRate ?? "—"}
        <span> кр/хв</span>
      </div>
      <button className="calib-tap" onClick={onTap}>
        ТАП
      </button>
      <div className="focus-rem">
        {taps.length} тапів
        {calRate
          ? ` · ${bagMl} мл ~ ${fmtHM(bagMl / ((calRate * 60) / dropFactor))}`
          : ""}
      </div>
      <div className="calib-actions" onClick={(e) => e.stopPropagation()}>
        <button onClick={onReset}>Скинути</button>
        <button className="primary" disabled={!calRate} onClick={onApply}>
          Застосувати
        </button>
        <button onClick={onClose}>Закрити</button>
      </div>
    </div>
  );
}
