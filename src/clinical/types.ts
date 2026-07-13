// Types mirror clinical/protocol.schema.json. The app only ever loads the
// compiled field bundle (src/clinical/field-bundle.json), never the authoring file.

export interface Source {
  id: string;
  title: string;
  publisher: string;
  version: string;
  checksum_sha256: string;
  archived_path: string;
  url?: string;
}

export type ReviewStatus = string; // "UNVERIFIED" | "TODO(clinical-review)" | "VERIFIED:<name>:<date>"

interface Sourced {
  review_status: ReviewStatus;
  source_document: string;
  source_version: string;
  source_citation: string;
}

export interface Drug extends Sourced {
  id: string;
  drug: string;
  indication: string;
  route: string;
  fixed_dose?: string;
  dose_per_kg?: string;
  max_dose?: string;
  dilution?: string;
  rate?: string;
  min_max?: { min?: string; max?: string };
  notes?: string;
}

export interface Prophylaxis extends Sourced {
  id: string;
  injury_type: string;
  drug_of_choice: string[];
  alternative?: string[];
  duration: string;
  notes?: string;
}

export interface Formula extends Sourced {
  id: string;
  name: string;
  kind: "clinical" | "engineering";
  expression: string;
  inputs?: string[];
  applicability?: string;
  notes?: string;
}

export type ClinicalRecord = Drug | Prophylaxis | Formula;

export interface FieldBundle {
  meta: {
    schema_version: string;
    protocol_version: string;
    disclaimer_uk: string;
    compiled_note: string;
  };
  sources: Source[];
  drugs: Drug[];
  antibiotic_prophylaxis: Prophylaxis[];
  formulas: Formula[];
}
