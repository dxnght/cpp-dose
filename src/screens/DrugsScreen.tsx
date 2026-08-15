// Drugs screen ("Препарати"). In field mode it renders only VERIFIED records
// from the compiled bundle — that bundle is produced by `compile:field`, which
// already strips everything non-VERIFIED (Constitution Art. III); `assertRenderable`
// here is defense in depth, not the primary filter.
//
// Organized into three source-separated sections (Spec 004 / ADR-0007):
//   1. TCCC 2026 general combat-wound antibiotics
//   2. MOZ 2023 antibiotic prophylaxis, by injury type
//   3. everything else (ketamine, TXA, etc.) — unchanged flat list
// Each section has its own empty state, independent of the "nothing at all
// verified" seed state (AC-0.2 / SC-4), so a medic isn't confused when e.g. the
// drip content is verified but antibiotics aren't yet.
import { useState } from "react";
import { fieldBundle, hasNoVerifiedClinicalContent } from "../clinical/loader";
import { assertRenderable, isRenderable } from "../clinical/guard";
import { SourceBadge } from "../components/SourceBadge";
import { ClinicalRecordBoundary } from "../components/ClinicalRecordBoundary";
import { t } from "../i18n";
import type { Drug, Prophylaxis } from "../clinical/types";

// TCCC 2026 §12 general combat-wound antibiotics — explicit ID allowlist rather
// than a schema `category` field, to keep this pass minimal (ADR-0007 §4).
// Revisit as a schema field if the antibiotic set grows past a hand-picked list.
const TCCC_ANTIBIOTIC_IDS = [
  "tccc_cefadroxil_po",
  "tccc_cephalexin_po",
  "tccc_ceftriaxone_unable_po",
  "tccc_ceftriaxone_eye",
];

function drugById(id: string): Drug | undefined {
  return fieldBundle.drugs.find((d) => d.id === id);
}

// Free-text search across name, description and (for prophylaxis) the
// body-part/injury-type label — a query like "нога" or "око" should surface
// the matching MOZ by-injury-type card even though "нога" never appears in
// any drug name.
function drugMatches(d: Drug, q: string): boolean {
  return d.drug.toLowerCase().includes(q) || d.indication.toLowerCase().includes(q);
}

function prophylaxisMatches(p: Prophylaxis, q: string): boolean {
  if (p.injury_type.toLowerCase().includes(q)) return true;
  const ids = [...p.drug_of_choice, ...(p.alternative ?? [])];
  return ids.some((id) => {
    const d = drugById(id);
    return d != null && drugMatches(d, q);
  });
}

function DrugCard({ d }: { d: Drug }) {
  assertRenderable(d);
  return (
    <article className="drug-card">
      <h3>
        {d.drug} — {d.route}
      </h3>
      <p>{d.indication}</p>
      <p>
        {d.fixed_dose ?? d.dose_per_kg}
        {d.rate ? ` · ${d.rate}` : ""}
      </p>
      <SourceBadge record={d} />
    </article>
  );
}

// A drug referenced by id from a prophylaxis record's drug_of_choice/alternative
// array. Fail closed at the *field* level: if that particular drug isn't
// resolvable/verified, show a pending note rather than throwing the whole card
// (Spec 004 §6 edge case).
function DrugRef({ id }: { id: string }) {
  const d = drugById(id);
  if (!d || !isRenderable(d)) {
    return <li className="drugref-pending">{t("drugs.detailPending")}</li>;
  }
  return (
    <li>
      <strong>{d.drug}</strong> {d.route} — {d.fixed_dose ?? d.dose_per_kg}
      {d.rate ? ` · ${d.rate}` : ""}
    </li>
  );
}

function ProphylaxisCard({ p }: { p: Prophylaxis }) {
  assertRenderable(p);
  return (
    <article className="drug-card">
      <h3>{p.injury_type}</h3>
      <p className="fieldlabel">{t("drugs.moz.drugOfChoice")}</p>
      <ul className="card-list">
        {p.drug_of_choice.map((id) => (
          <DrugRef key={id} id={id} />
        ))}
      </ul>
      {p.alternative && p.alternative.length > 0 && (
        <>
          <p className="fieldlabel">{t("drugs.moz.alternative")}</p>
          <ul className="card-list">
            {p.alternative.map((id) => (
              <DrugRef key={id} id={id} />
            ))}
          </ul>
        </>
      )}
      <p className="drugs-duration">
        {t("drugs.moz.duration")}: {p.duration}
      </p>
      <SourceBadge record={p} />
    </article>
  );
}

export function DrugsScreen() {
  const [query, setQuery] = useState("");

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

  const allTccc = fieldBundle.drugs.filter((d) => TCCC_ANTIBIOTIC_IDS.includes(d.id));
  const allOther = fieldBundle.drugs.filter((d) => !TCCC_ANTIBIOTIC_IDS.includes(d.id));
  const allMoz = fieldBundle.antibiotic_prophylaxis;

  const q = query.trim().toLowerCase();

  const tcccAntibiotics = q ? allTccc.filter((d) => drugMatches(d, q)) : allTccc;
  const otherDrugs = q ? allOther.filter((d) => drugMatches(d, q)) : allOther;
  const mozGroups = q ? allMoz.filter((p) => prophylaxisMatches(p, q)) : allMoz;

  return (
    <section>
      <h1>{t("drugs.heading")}</h1>

      <input
        type="search"
        className="drugs-search"
        placeholder={t("drugs.search.placeholder")}
        aria-label={t("drugs.search.placeholder")}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <h2>{t("drugs.tccc.heading")}</h2>
      {allTccc.length === 0 ? (
        <div className="empty-state" role="status">
          <p>{t("drugs.tccc.empty")}</p>
        </div>
      ) : tcccAntibiotics.length === 0 ? (
        <div className="empty-state" role="status">
          <p>{t("drugs.search.noMatches")}</p>
        </div>
      ) : (
        tcccAntibiotics.map((d) => (
          <ClinicalRecordBoundary key={d.id}>
            <DrugCard d={d} />
          </ClinicalRecordBoundary>
        ))
      )}

      <h2>{t("drugs.moz.heading")}</h2>
      {allMoz.length === 0 ? (
        <div className="empty-state" role="status">
          <p>{t("drugs.moz.empty")}</p>
        </div>
      ) : mozGroups.length === 0 ? (
        <div className="empty-state" role="status">
          <p>{t("drugs.search.noMatches")}</p>
        </div>
      ) : (
        mozGroups.map((p) => (
          <ClinicalRecordBoundary key={p.id}>
            <ProphylaxisCard p={p} />
          </ClinicalRecordBoundary>
        ))
      )}

      <h2>{t("drugs.other.heading")}</h2>
      {allOther.length === 0 ? (
        <div className="empty-state" role="status">
          <p>{t("drugs.other.empty")}</p>
        </div>
      ) : otherDrugs.length === 0 ? (
        <div className="empty-state" role="status">
          <p>{t("drugs.search.noMatches")}</p>
        </div>
      ) : (
        otherDrugs.map((d) => (
          <ClinicalRecordBoundary key={d.id}>
            <DrugCard d={d} />
          </ClinicalRecordBoundary>
        ))
      )}
    </section>
  );
}
