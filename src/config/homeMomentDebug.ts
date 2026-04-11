/**
 * Horloge de debug pour toute la logique « maintenant » de l’app (événements passés / en cours,
 * couleurs de marqueurs, filtres, paris, etc.).
 *
 * - `null` → heure réelle (`new Date()` / `Date.now()`).
 * - Chaîne ISO → cet instant est utilisé comme « maintenant » partout où le code appelle
 *   `getAppNow()` ou `getAppTimestamp()` au lieu de `new Date()` / `Date.now()`.
 *
 * Ne pas utiliser pour : timestamps Firebase `updatedAt`, IDs uniques, anti-spam, analytics.
 */
/** `null` en production. Ex. test local : `'2026-04-17T21:00:00'`. */
export const HOME_MOMENT_DEBUG_NOW: string | null = null;

export function getAppNow(): Date {
  return HOME_MOMENT_DEBUG_NOW ? new Date(HOME_MOMENT_DEBUG_NOW) : new Date();
}

export function getAppTimestamp(): number {
  return getAppNow().getTime();
}
