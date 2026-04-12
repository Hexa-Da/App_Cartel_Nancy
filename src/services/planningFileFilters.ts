import type { PlanningFile, PlanningFileCategory } from '../types';
import {
  LEGACY_PARTY_NUM_TO_SLUG,
  LEGACY_PARC_EXPO_HALL_RESTAURANT_SLUG,
  LEGACY_REST_NUM_TO_SLUG,
  normalizeFilterToPartySlug,
} from '../config/planningVenueSlugs';

const PARC_EXPO_DAY_IDS = ['parc-expo-jeudi', 'parc-expo-vendredi'] as const;

const LEGACY_PARTY_NUMS = new Set(Object.keys(LEGACY_PARTY_NUM_TO_SLUG));
const LEGACY_REST_NUMS = new Set(Object.keys(LEGACY_REST_NUM_TO_SLUG));

/** When fileCategory is set, only files of that category match; legacy rows without it keep old behaviour */
export function passesCategoryGate(
  file: PlanningFile,
  filterKind: PlanningFileCategory
): boolean {
  const fc = file.fileCategory;
  if (fc === undefined || fc === null || fc === '') return true;
  return fc === filterKind;
}

export interface IFilterListItem {
  id: string;
  name: string;
  sport?: string;
}

function stripDiacritics(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '');
}

function normKey(s: string): string {
  return stripDiacritics(s.toLowerCase());
}

function getEt(file: PlanningFile): string {
  return file.eventType ?? '';
}

function planningTextBlob(file: PlanningFile): string {
  const et = getEt(file);
  return normKey(`${et} ${file.name ?? ''} ${file.description ?? ''} ${file.specificItemName ?? ''}`);
}

/**
 * For files WITHOUT fileCategory, a bare numeric eventType ('1'-'4') is ambiguous
 * between parties, restaurants and hotels. These helpers decide ownership based
 * on file content hints when no fileCategory disambiguates.
 */
function fileTextHintsAtParty(file: PlanningFile): boolean {
  const blob = normKey(`${file.name ?? ''} ${file.description ?? ''}`);
  return ['soiree', 'party', 'pompom', 'showcase', 'defile', 'dj contest', 'zenith', 'stanislas', 'gala'].some(
    (k) => blob.includes(k)
  );
}

function fileTextHintsAtRestaurant(file: PlanningFile): boolean {
  const blob = normKey(`${file.name ?? ''} ${file.description ?? ''}`);
  return ['restaurant', 'repas', 'gentilly', 'parc expo', 'hall a1', 'brunch', 'saint-marie', 'saint marie'].some(
    (k) => blob.includes(k)
  );
}

function fileTextHintsAtHotel(file: PlanningFile): boolean {
  const blob = normKey(`${file.name ?? ''} ${file.description ?? ''}`);
  return blob.includes('hotel') || blob.includes('hôtel') || blob.includes('ibis') ||
    blob.includes('nemea') || blob.includes('kyriad') || blob.includes('campanile') ||
    blob.includes('residome') || blob.includes('revotel') || blob.includes('cerise') ||
    blob.includes('greet') || blob.includes('kosy') || blob.includes('f1 nancy');
}

/** True if the numeric id is shared across categories */
function isAmbiguousNumericId(et: string): boolean {
  return LEGACY_PARTY_NUMS.has(et) || LEGACY_REST_NUMS.has(et);
}

// ── Party ────────────────────────────────────────────────────────

const ALL_KNOWN_PARTY_SLUGS = new Set([
  'parc-expo-pompom', 'parc-expo-showcase', 'defile', 'place-stanislas', 'zenith',
]);

export function matchesPartyBroad(
  file: PlanningFile,
  partyIds: readonly string[]
): boolean {
  if (!passesCategoryGate(file, 'party')) return false;
  const et = getEt(file);
  const etKey = normKey(et);

  if (partyIds.includes(et)) {
    if (!file.fileCategory && isAmbiguousNumericId(et) && !fileTextHintsAtParty(file)) return false;
    return true;
  }
  const etAsSlug = LEGACY_PARTY_NUM_TO_SLUG[et];
  if (etAsSlug && partyIds.includes(etAsSlug)) {
    if (!file.fileCategory && !fileTextHintsAtParty(file)) return false;
    return true;
  }
  if (file.specificItemId) {
    if (partyIds.includes(file.specificItemId)) return true;
    const sidAsSlug = LEGACY_PARTY_NUM_TO_SLUG[file.specificItemId];
    if (sidAsSlug && partyIds.includes(sidAsSlug)) return true;
  }

  const broadKeywords = [
    'soiree', 'gala', 'defile', 'party', 'pompom', 'navette',
    'showcase', 'dj contest', 'zenith', 'stanislas',
  ];
  if (broadKeywords.some((k) => etKey.includes(k))) return true;
  return false;
}

function partySlugKeywordMatch(etKey: string, slug: string): boolean {
  switch (slug) {
    case 'defile':
    case 'place-stanislas':
      return etKey.includes('defile') || etKey.includes('stanislas');
    case 'parc-expo-pompom':
      return etKey.includes('pompom');
    case 'parc-expo-showcase':
      return etKey.includes('showcase');
    case 'zenith':
      return etKey.includes('dj contest') || etKey.includes('zenith');
    default:
      return false;
  }
}

export function matchesPartySpecific(
  file: PlanningFile,
  specificId: string,
  _parties: readonly IFilterListItem[]
): boolean {
  if (!passesCategoryGate(file, 'party')) return false;
  const slug = normalizeFilterToPartySlug(specificId);
  const et = getEt(file);
  const etKey = normKey(et);

  if (file.specificItemId === slug || file.specificItemId === specificId) return true;
  if (et === slug || et === specificId) return true;
  if (
    (slug === 'defile' || slug === 'place-stanislas') &&
    (et === 'defile' || et === 'place-stanislas' ||
     file.specificItemId === 'place-stanislas' || file.specificItemId === 'defile')
  ) {
    return true;
  }

  const legacyNum = Object.entries(LEGACY_PARTY_NUM_TO_SLUG).find(([, s]) => s === slug)?.[0];
  if (legacyNum && (et === legacyNum || file.specificItemId === legacyNum)) {
    if (!file.fileCategory && !fileTextHintsAtParty(file)) return false;
    return true;
  }

  if (ALL_KNOWN_PARTY_SLUGS.has(et) || ALL_KNOWN_PARTY_SLUGS.has(file.specificItemId ?? '')) {
    return false;
  }

  if (partySlugKeywordMatch(etKey, slug)) return true;

  return false;
}

// ── Restaurant ───────────────────────────────────────────────────

export function matchesRestaurantBroad(
  file: PlanningFile,
  restaurantIds: readonly string[]
): boolean {
  if (!passesCategoryGate(file, 'restaurants')) return false;
  const et = getEt(file);
  const etKey = et.toLowerCase();

  if (restaurantIds.includes(et)) {
    if (!file.fileCategory && isAmbiguousNumericId(et) && !fileTextHintsAtRestaurant(file)) return false;
    return true;
  }
  const etAsSlug = LEGACY_REST_NUM_TO_SLUG[et];
  if (etAsSlug && restaurantIds.includes(etAsSlug)) {
    if (!file.fileCategory && !fileTextHintsAtRestaurant(file)) return false;
    return true;
  }
  if (
    etAsSlug === LEGACY_PARC_EXPO_HALL_RESTAURANT_SLUG &&
    PARC_EXPO_DAY_IDS.some((id) => restaurantIds.includes(id))
  ) {
    if (!file.fileCategory && !fileTextHintsAtRestaurant(file)) return false;
    return true;
  }
  if (file.specificItemId) {
    if (restaurantIds.includes(file.specificItemId)) return true;
    const sidAsSlug = LEGACY_REST_NUM_TO_SLUG[file.specificItemId];
    if (sidAsSlug && restaurantIds.includes(sidAsSlug)) return true;
    if (
      sidAsSlug === LEGACY_PARC_EXPO_HALL_RESTAURANT_SLUG &&
      PARC_EXPO_DAY_IDS.some((id) => restaurantIds.includes(id))
    ) {
      return true;
    }
  }
  if (etKey.includes('restaurant')) return true;
  if (et === 'Restaurant' || et === 'restaurant') return true;
  return false;
}

const ALL_KNOWN_RESTAURANT_SLUGS = new Set([
  'parc-expo-jeudi', 'parc-expo-vendredi', 'gentilly',
  'salle-fetes-gentilly', 'parc-saint-marie', LEGACY_PARC_EXPO_HALL_RESTAURANT_SLUG,
]);

export function matchesRestaurantSpecific(
  file: PlanningFile,
  restaurant: IFilterListItem
): boolean {
  if (!passesCategoryGate(file, 'restaurants')) return false;
  const et = getEt(file);
  const etKey = et.toLowerCase();
  const slug = restaurant.id;

  if (file.specificItemId === slug || et === slug) return true;

  if (slug === 'gentilly') {
    if (file.specificItemId === 'salle-fetes-gentilly' || et === 'salle-fetes-gentilly') return true;
  }

  if (slug === 'parc-expo-jeudi' || slug === 'parc-expo-vendredi') {
    const legacyParc =
      file.specificItemId === LEGACY_PARC_EXPO_HALL_RESTAURANT_SLUG ||
      et === LEGACY_PARC_EXPO_HALL_RESTAURANT_SLUG ||
      et === '2' ||
      file.specificItemId === '2';
    if (legacyParc) {
      const blob = planningTextBlob(file);
      const wantsJeudi = slug === 'parc-expo-jeudi';
      if (wantsJeudi) return blob.includes('jeudi') || blob.includes('thursday');
      return blob.includes('vendredi') || blob.includes('friday');
    }
  }

  const legacyNum = Object.entries(LEGACY_REST_NUM_TO_SLUG).find(([, s]) => s === slug)?.[0];
  if (legacyNum && (et === legacyNum || file.specificItemId === legacyNum)) {
    if (!file.fileCategory && !fileTextHintsAtRestaurant(file)) return false;
    return true;
  }

  if (ALL_KNOWN_RESTAURANT_SLUGS.has(et) || ALL_KNOWN_RESTAURANT_SLUGS.has(file.specificItemId ?? '')) {
    return false;
  }

  if (slug === 'gentilly') {
    return etKey.includes('gentilly') || etKey.includes('salle des fetes') || etKey.includes('salle des fêtes');
  }

  if (slug === 'parc-expo-jeudi' || slug === 'parc-expo-vendredi') {
    const blob = planningTextBlob(file);
    const venueOk = blob.includes('parc expo') || blob.includes('hall a1') || blob.includes('hall b');
    if (!venueOk) return false;
    if (slug === 'parc-expo-jeudi') return blob.includes('jeudi') || blob.includes('thursday');
    return blob.includes('vendredi') || blob.includes('friday');
  }

  if (slug === 'parc-saint-marie') {
    return etKey.includes('saint-marie') || etKey.includes('saint marie') ||
      etKey.includes('parc saint') || etKey.includes('boffrand') || etKey.includes('brunch');
  }

  return false;
}

// ── Hotel ────────────────────────────────────────────────────────

export function matchesHotelBroad(file: PlanningFile, hotelIds: readonly string[]): boolean {
  if (!passesCategoryGate(file, 'hotel')) return false;
  const et = getEt(file);
  const etKey = et.toLowerCase();

  if (hotelIds.includes(et)) {
    if (!file.fileCategory && isAmbiguousNumericId(et) && !fileTextHintsAtHotel(file)) return false;
    return true;
  }
  if (file.specificItemId && hotelIds.includes(file.specificItemId)) return true;
  if (etKey.includes('hôtel') || etKey.includes('hotel')) return true;
  if (et === 'Hotel' || et === 'hotel') return true;
  return false;
}

export function matchesHotelSpecific(
  file: PlanningFile,
  hotel: IFilterListItem
): boolean {
  if (!passesCategoryGate(file, 'hotel')) return false;
  const et = getEt(file);

  if (file.specificItemId === hotel.id) return true;

  if (et === hotel.id) {
    if (!file.fileCategory && isAmbiguousNumericId(et) && !fileTextHintsAtHotel(file)) return false;
    return true;
  }

  return false;
}
