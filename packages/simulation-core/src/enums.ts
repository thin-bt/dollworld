export const RANKS = ["F", "E", "D", "C", "B", "A", "S"] as const;

export type Rank = (typeof RANKS)[number];

export type Sex = "male" | "female";

export type LifeStatus = "living" | "deceased";

export type ParticipationStatus = "waiting" | "active" | "stopped";

export type CareerStatus = "child" | "trainee" | "active_competitor" | "retired";

export type FamilyStatus = "active" | "at_risk" | "extinct" | "revived";

export type LineageStatus = "active" | "extinct" | "revived";

export type LineageFocus = "unarmed" | "sword" | "magic" | "mixed";

export type ParentRole = "father" | "mother";
