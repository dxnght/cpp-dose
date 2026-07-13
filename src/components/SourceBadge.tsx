// SourceBadge — every clinical number shown MUST display its source_version +
// verification state (Constitution Art. IV.4, Spec 000 SC-7).
import type { ClinicalRecord, Formula } from "../clinical/types";
import { isVerified } from "../clinical/guard";
import { t } from "../i18n";

export function SourceBadge({ record }: { record: ClinicalRecord }) {
  const engineering = "kind" in record && (record as Formula).kind === "engineering";
  const verified = isVerified(record.review_status);

  const label = engineering ? t("badge.engineering") : verified ? t("badge.verified") : t("badge.unverified");
  const cls = verified || engineering ? "tag verified" : "tag unverified";

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
