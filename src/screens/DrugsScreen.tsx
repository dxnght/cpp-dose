// Drugs screen. In field mode it lists only VERIFIED records from the bundle.
// At seed the bundle has none → the "no verified content" state (AC-0.2 / SC-4).
import { fieldBundle, hasNoVerifiedClinicalContent } from "../clinical/loader";
import { assertRenderable } from "../clinical/guard";
import { SourceBadge } from "../components/SourceBadge";
import { t } from "../i18n";

export function DrugsScreen() {
  if (hasNoVerifiedClinicalContent()) {
    return (
      <section>
        <h1>{t("drugs.heading")}</h1>
        <div className="empty-state" role="status">
          <h2>{t("noContent.title")}</h2>
          <p>{t("noContent.body")}</p>
        </div>
      </section>
    );
  }

  return (
    <section>
      <h1>{t("drugs.heading")}</h1>
      {fieldBundle.drugs.map((d) => {
        assertRenderable(d); // fail-closed: unreachable for non-VERIFIED (Art. III)
        return (
          <article key={d.id}>
            <h2>
              {d.drug} — {d.route}
            </h2>
            <p>{d.indication}</p>
            <p>{d.fixed_dose ?? d.dose_per_kg}</p>
            <SourceBadge record={d} />
          </article>
        );
      })}
    </section>
  );
}
