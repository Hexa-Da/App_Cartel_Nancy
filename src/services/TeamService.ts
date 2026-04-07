/**
 * @fileoverview Service centralisé pour le parsing, la normalisation
 * et le filtrage des équipes/délégations.
 */

interface VenueWithMatches {
  matches?: { teams?: string }[];
}

const EXCLUDED_KEYWORDS = ['poule', 'perdant', 'vainqueur', 'gagnant'];

/** Allowed chess board player slots: A1–A4 … D1–D4 */
const ECHECS_ROWS = ['A', 'B', 'C', 'D'] as const;
const ECHECS_COLS = [1, 2, 3, 4] as const;

export const ECHECS_PLAYER_IDS: readonly string[] = ECHECS_ROWS.flatMap(row =>
  ECHECS_COLS.map(col => `${row}${col}`)
);

const ECHECS_PLAYER_ID_SET = new Set(ECHECS_PLAYER_IDS);

/**
 * Normalise un nom d'équipe vers son nom canonique (minuscule).
 * Ex: "nancy" → "mines nancy", "sainté" → "mines sainté"
 */
export function normalizeDelegation(name: string): string {
  const lower = name.toLowerCase().trim();
  if (lower === 'nancy' || lower === 'mines nancy') return 'mines nancy';
  if (lower === 'sainté' || lower === 'sainte' || lower === 'mines sainté') return 'mines sainté';
  return lower;
}

/**
 * Retourne le nom d'affichage d'une délégation.
 * Ex: "nancy" → "Mines Nancy"
 */
export function getDisplayName(name: string): string {
  const lower = name.toLowerCase().trim();
  if (lower === 'nancy' || lower === 'mines nancy') return 'Mines Nancy';
  if (lower === 'sainté' || lower === 'sainte' || lower === 'mines sainté') return 'Mines Sainté';
  return name.trim();
}

/**
 * Parse une chaîne "teams" en sous-équipes individuelles.
 * 1) Split sur "vs" (séparateur adversaire)
 * 2) Split sur " x " (équipes composites)
 */
export function parseTeams(teamsString: string): string[] {
  if (!teamsString) return [];
  return teamsString
    .split(/\svs\s/i)
    .flatMap(side => side.split(/\sx\s/i))
    .map(t => t.trim())
    .filter(Boolean);
}

function isShortCode(name: string): boolean {
  return /^[A-Za-z][0-9A-Za-z]$/.test(name.replace(/\s+/g, ''));
}

function isExcludedTeam(name: string): boolean {
  if (!name || name === '...' || name === '…') return true;
  const lower = name.toLowerCase();
  return EXCLUDED_KEYWORDS.some(kw => lower.includes(kw));
}

/** Exclut les équipes type "1er/2ème ...", "... 1er/2ème" (réserves / secondes). */
function isSecondOrReserveTeam(name: string): boolean {
  const t = (name || '').trim();
  return /^\d+(?:er|ème)(\s|$)/i.test(t) || /\s+\d+(?:er|ème)$/i.test(t);
}

/**
 * Vérifie si une délégation est présente dans une chaîne de teams.
 * Gère les composites ("Nancy x Sainté") et la normalisation.
 */
export function delegationMatches(teamsString: string, delegation: string): boolean {
  if (!teamsString || !delegation) return false;
  const target = normalizeDelegation(delegation);
  return parseTeams(teamsString).some(t => normalizeDelegation(t) === target);
}

/**
 * Extrait les IDs joueurs (ex: "A1", "B2") depuis une chaîne teams.
 * Uniquement les cases autorisées A1–A4 … D1–D4.
 */
export function extractPlayerIds(teamsString: string): string[] {
  if (!teamsString) return [];

  const playerIds = new Set<string>();

  parseTeams(teamsString).forEach(team => {
    const cleaned = team.trim().toUpperCase();
    const matches = cleaned.match(/\b[A-Z][0-9]+\b/g);
    matches?.forEach(match => {
      if (ECHECS_PLAYER_ID_SET.has(match)) playerIds.add(match);
    });
  });

  return Array.from(playerIds).sort(compareEchecsPlayerIds);
}

function compareEchecsPlayerIds(a: string, b: string): number {
  const letterCompare = a[0].localeCompare(b[0]);
  if (letterCompare !== 0) return letterCompare;
  return Number(a.slice(1)) - Number(b.slice(1));
}

/**
 * Vérifie si un ID joueur est présent dans une chaîne teams.
 */
export function playerIdMatches(teamsString: string, playerId: string): boolean {
  if (!teamsString || !playerId) return false;
  const target = playerId.trim().toUpperCase();
  return extractPlayerIds(teamsString).includes(target);
}

/**
 * Extrait toutes les délégations uniques depuis une liste de venues.
 * Éclate les composites, filtre les codes courts et mots-clés de phases.
 */
export function getAllDelegationsFromVenues(venues: VenueWithMatches[]): string[] {
  const delegations = new Set<string>();

  venues.forEach(venue => {
    if (!venue.matches) return;
    venue.matches.forEach((match: any) => {
      if (!match.teams) return;
      for (const team of parseTeams(match.teams)) {
        if (isExcludedTeam(team) || isShortCode(team) || isSecondOrReserveTeam(team)) continue;
        delegations.add(getDisplayName(team));
      }
    });
  });

  return Array.from(delegations).sort();
}

/**
 * Liste des IDs joueurs pour le filtre Échecs (grille fixe A1–D4).
 * Le paramètre `venues` est conservé pour compatibilité d’API.
 */
export function getAllPlayerIdsFromVenues(_venues: VenueWithMatches[]): string[] {
  return [...ECHECS_PLAYER_IDS];
}
