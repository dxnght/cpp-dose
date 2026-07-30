// About / sources screen — the auditor entry point (plan/data-model.md § Versioning).
import { fieldBundle } from "../clinical/loader";
import { t } from "../i18n";

export function AboutScreen() {
  const clinicalSources = fieldBundle.sources.filter((s) => /^[a-f0-9]{64}$/.test(s.checksum_sha256));
  return (
    <section>
      <h1>{t("about.heading")}</h1>
      <p>
        {t("about.protocolVersion")}: <strong>{fieldBundle.meta.protocol_version}</strong>
      </p>
      <h2>{t("about.sources")}</h2>
      {clinicalSources.length === 0 ? (
        <p>{t("about.noVerifiedSources")}</p>
      ) : (
        <ul>
          {clinicalSources.map((s) => (
            <li key={s.id}>
              {s.title} — {s.version}
            </li>
          ))}
        </ul>
      )}
      <h2>{t("about.credits")}</h2>
      <p className="about-credits">{t("about.creditsBody")}</p>
    </section>
  );
}
