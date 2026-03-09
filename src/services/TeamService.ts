/**
 * @fileoverview Service centralisé pour le parsing, la normalisation
 * et le filtrage des équipes/délégations.
 */

interface VenueWithMatches {
  matches?: { teams?: string }[];
}

const EXCLUDED_KEYWORDS = ['poule', 'perdant', 'vainqueur', 'gagnant'];

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
