export type NameCandidateCategory =
  "family_name" | "male_given_name" | "female_given_name" | "neutral_given_name";

export type NameCandidateFile = {
  schemaVersion: string;
  nameDataVersion: string;
  locale: string;
  style: string;
  encoding: "UTF-8";
  notes: string;
  category: NameCandidateCategory;
  count: number;
  names: string[];
};

export type NameManifestFileEntry = {
  path: string;
  count: number;
  sha256: string;
};

export type NameDataManifestFiles = {
  family: NameManifestFileEntry;
  male: NameManifestFileEntry;
  female: NameManifestFileEntry;
  neutral: NameManifestFileEntry;
};

export type NameDataSelectionPolicy = {
  familyNames: string;
  givenNames: string;
  duplicateLivingFullNameWithinFamily: string;
  historicalReuse: string;
  rng: string;
};

export type NameDataManifest = {
  schemaVersion: string;
  nameDataVersion: string;
  locale: string;
  style: string;
  displayFormat: "{givenName}・{familyName}";
  files: NameDataManifestFiles;
  selectionPolicy: NameDataSelectionPolicy;
  hashAlgorithm: "sha256-canonical-json-v1";
};

export type ValidatedNameData = {
  manifest: NameDataManifest;
  familyNames: NameCandidateFile;
  maleGivenNames: NameCandidateFile;
  femaleGivenNames: NameCandidateFile;
  neutralGivenNames: NameCandidateFile;
};
