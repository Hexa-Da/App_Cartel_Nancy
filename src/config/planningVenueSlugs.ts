/**
 * Slugs for parties / restaurants (aligned with map filters & planning uploads).
 * Legacy Firebase rows may still use numeric ids '1', '2', … — use maps below to normalize.
 */

export const LEGACY_PARTY_NUM_TO_SLUG: Readonly<Record<string, string>> = {
  '1': 'place-stanislas',
  '2': 'parc-expo-pompom',
  '3': 'parc-expo-showcase',
  '4': 'zenith'
};

export const LEGACY_REST_NUM_TO_SLUG: Readonly<Record<string, string>> = {
  '1': 'salle-fetes-gentilly',
  '2': 'parc-expo-hall-a1',
  '3': 'parc-saint-marie'
};

/** Map numeric or legacy filter prop → canonical party slug */
export function normalizeFilterToPartySlug(id: string): string {
  return LEGACY_PARTY_NUM_TO_SLUG[id] ?? id;
}

/** Map numeric or legacy filter prop → canonical restaurant slug */
export function normalizeFilterToRestaurantSlug(id: string): string {
  return LEGACY_REST_NUM_TO_SLUG[id] ?? id;
}
