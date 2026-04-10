import type { PlanningFile, PlanningFileCategory } from '../types';
import {
  LEGACY_PARTY_NUM_TO_SLUG,
  LEGACY_REST_NUM_TO_SLUG,
  normalizeFilterToPartySlug,
} from '../config/planningVenueSlugs';

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

/** Lowercase + accent-insensitive for substring checks */
function normKey(s: string): string {
  return stripDiacritics(s.toLowerCase());
}

function getEt(file: PlanningFile): string {
  return file.eventType ?? '';
}

export function matchesPartyBroad(
  file: PlanningFile,
  partyIds: readonly string[]
): boolean {
  if (!passesCategoryGate(file, 'party')) return false;
  const et = getEt(file);
  const etKey = normKey(et);
  if (partyIds.includes(et)) return true;
  const etAsSlug = LEGACY_PARTY_NUM_TO_SLUG[et];
  if (etAsSlug && partyIds.includes(etAsSlug)) return true;
  if (file.specificItemId) {
    if (partyIds.includes(file.specificItemId)) return true;
    const sidAsSlug = LEGACY_PARTY_NUM_TO_SLUG[file.specificItemId];
    if (sidAsSlug && partyIds.includes(sidAsSlug)) return true;
  }

  const broadKeywords = [
    'soiree',
    'gala',
    'defile',
    'party',
    'pompom',
    'navette',
    'showcase',
    'dj contest',
    'zenith',
    'stanislas'
  ];
  if (broadKeywords.some((k) => etKey.includes(k))) return true;
  return false;
}

function partySlugKeywordMatch(etKey: string, slug: string): boolean {
  switch (slug) {
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

/** When user picks a precise party by slug (or legacy numeric id) */
export function matchesPartySpecific(
  file: PlanningFile,
  specificId: string,
  parties: readonly IFilterListItem[]
): boolean {
  if (!passesCategoryGate(file, 'party')) return false;
  const slug = normalizeFilterToPartySlug(specificId);
  const et = getEt(file);
  const etKey = normKey(et);

  if (file.specificItemId === slug || file.specificItemId === specificId) return true;
  if (et === slug || et === specificId) return true;

  const legacyNum = Object.entries(LEGACY_PARTY_NUM_TO_SLUG).find(([, s]) => s === slug)?.[0];
  if (legacyNum && (et === legacyNum || file.specificItemId === legacyNum)) return true;

  if (partySlugKeywordMatch(etKey, slug)) return true;
  if (['1', '2', '3', '4'].includes(specificId) && partySlugKeywordMatch(etKey, LEGACY_PARTY_NUM_TO_SLUG[specificId] ?? '')) {
    return true;
  }

  const party = parties.find((p) => p.id === slug);
  if (!party) return false;
  const fileNameLower = file.name?.toLowerCase() ?? '';
  const partyNameLower = party.name.toLowerCase();
  const nameMatch =
    file.specificItemName?.toLowerCase() === partyNameLower ||
    fileNameLower.includes(partyNameLower) ||
    partyNameLower.includes(fileNameLower) ||
    fileNameLower.includes(party.id) ||
    (party.sport !== undefined && fileNameLower.includes(party.sport.toLowerCase()));
  if (!nameMatch) return false;
  return matchesPartyBroad(file, parties.map((p) => p.id));
}

export function matchesRestaurantBroad(
  file: PlanningFile,
  restaurantIds: readonly string[]
): boolean {
  if (!passesCategoryGate(file, 'restaurants')) return false;
  const et = getEt(file);
  const etKey = et.toLowerCase();
  if (restaurantIds.includes(et)) return true;
  const etAsSlug = LEGACY_REST_NUM_TO_SLUG[et];
  if (etAsSlug && restaurantIds.includes(etAsSlug)) return true;
  if (file.specificItemId) {
    if (restaurantIds.includes(file.specificItemId)) return true;
    const sidAsSlug = LEGACY_REST_NUM_TO_SLUG[file.specificItemId];
    if (sidAsSlug && restaurantIds.includes(sidAsSlug)) return true;
  }
  if (etKey.includes('restaurant')) return true;
  if (et === 'Restaurant' || et === 'restaurant') return true;
  return false;
}

export function matchesRestaurantSpecific(
  file: PlanningFile,
  restaurant: IFilterListItem
): boolean {
  if (!passesCategoryGate(file, 'restaurants')) return false;
  const et = getEt(file);
  const etKey = et.toLowerCase();
  const slug = restaurant.id;

  if (file.specificItemId === slug) return true;
  if (et === slug) return true;

  const legacyNum = Object.entries(LEGACY_REST_NUM_TO_SLUG).find(([, s]) => s === slug)?.[0];
  if (legacyNum && (et === legacyNum || file.specificItemId === legacyNum)) return true;

  if (slug === 'salle-fetes-gentilly') {
    return (
      etKey.includes('gentilly') ||
      etKey.includes('salle des fetes') ||
      etKey.includes('salle des fêtes')
    );
  }
  if (slug === 'parc-expo-hall-a1') {
    return etKey.includes('parc expo') || etKey.includes('hall a1') || etKey.includes('hall b');
  }
  if (slug === 'parc-saint-marie') {
    return (
      etKey.includes('saint-marie') ||
      etKey.includes('saint marie') ||
      etKey.includes('parc saint') ||
      etKey.includes('boffrand') ||
      etKey.includes('brunch')
    );
  }

  const fileNameLower = file.name?.toLowerCase() ?? '';
  const restaurantNameLower = restaurant.name.toLowerCase();
  return (
    (et === 'Restaurant' ||
      etKey.includes('restaurant') ||
      et === 'restaurant') &&
    (file.specificItemName?.toLowerCase() === restaurantNameLower ||
      fileNameLower.includes(restaurantNameLower) ||
      restaurantNameLower.includes(fileNameLower) ||
      fileNameLower.includes(restaurant.id))
  );
}

export function matchesHotelBroad(file: PlanningFile, hotelIds: readonly string[]): boolean {
  if (!passesCategoryGate(file, 'hotel')) return false;
  const et = getEt(file);
  const etKey = et.toLowerCase();
  if (hotelIds.includes(et)) return true;
  if (file.specificItemId && hotelIds.includes(file.specificItemId)) return true;
  if (etKey.includes('hôtel') || etKey.includes('hotel')) return true;
  if (et === 'Hotel' || et === 'hotel') return true;
  return false;
}

export function matchesHotelSpecific(file: PlanningFile, hotel: IFilterListItem): boolean {
  if (!passesCategoryGate(file, 'hotel')) return false;
  const et = getEt(file);
  const etKey = et.toLowerCase();
  const fileNameLower = file.name?.toLowerCase() ?? '';
  const hotelNameLower = hotel.name.toLowerCase();

  if (file.specificItemId === hotel.id) return true;
  if (et === hotel.id) return true;
  if (etKey.includes(hotelNameLower)) return true;

  const isHotelType =
    et === 'Hotel' || etKey.includes('hôtel') || etKey.includes('hotel');
  if (!isHotelType) return false;

  return (
    file.specificItemName?.toLowerCase() === hotelNameLower ||
    fileNameLower.includes(hotelNameLower) ||
    hotelNameLower.includes(fileNameLower) ||
    fileNameLower.includes(hotel.id)
  );
}
