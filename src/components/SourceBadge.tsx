// SourceBadge — every clinical number shown MUST display its source_version +
// verification state (Constitution Art. IV.4, Spec 000 SC-7).
import type { ClinicalRecord, Formula } from "../clinical/types";
import { isVerified } from "../clinical/guard";
import { t } from "../i18n";

export function SourceBadge({
  record,
  compact,
}: {
  record: ClinicalRecord;
  /** Compact form (2026-07-22, UX review): status tag + version only, no full
   * citation text — for showing provenance on a running drip card / Focus
   * mode for the drip's whole lifetime, where the full 3-tag badge would be
   * too much clutter next to the pacing UI. */
  compact?: boolean;
}) {
  const engineering = "kind" in record && (record as Formula).kind === "engineering";
  const verified = isVerified(record.review_status);

  const label = engineering ? t("badge.engineering") : verified ? t("badge.verified") : t("badge.unverified");
  const cls = verified || engineering ? "tag verified" : "tag unverified";

  if (compact) {
    return (
      <span className="source-badge source-badge-compact">
        <span className={cls}>{label}</span>
        <span className="tag">{record.source_version}</span>
      </span>
    );
  }

  return (
    <span className="source-badge">
      <span className={cls}>{label}</span>
      <span className="tag">
        {t("badge.source")}: {record.source_document} · {record.source_version}
      </span>
      <span className="tag">{record.source_citation}</span>
    </span>
  );
}
