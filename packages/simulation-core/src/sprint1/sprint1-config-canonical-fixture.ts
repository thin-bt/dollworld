/**
 * Fixed canonical SHA-256 fixture for `sprint1-balance-0.2.0` (14 mini-spec §1.1 / §8).
 *
 * Digest of the **basis-points-normalized** default Sprint1Config canonical JSON.
 * Update this literal together with configVersion whenever the normalized default
 * body or canonical JSON algorithm would change the digest. Tests must compare
 * against this constant — never regenerate the expected hash from the live default
 * at assertion time.
 */
export const SPRINT1_BALANCE_0_2_0_CONFIG_VERSION = "sprint1-balance-0.2.0" as const;

/**
 * SHA-256 (hex, lowercase) of `toCanonicalJson` of the normalized default
 * Sprint1Config for `sprint1-balance-0.2.0` (factor/ratio/weight as ×10000 integers).
 */
export const SPRINT1_BALANCE_0_2_0_CANONICAL_SHA256 =
  "3d3fdfe204d146046630e23c6439ab49769c9d1644a5f072da5d0a19273621c9" as const;

/** Canonical JSON UTF-8 byte length of the normalized default (informational fixture). */
export const SPRINT1_BALANCE_0_2_0_CANONICAL_BYTE_LENGTH = 9593 as const;
