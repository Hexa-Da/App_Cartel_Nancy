/**
 * Map indication types that use a custom image in /public (see marker build logic).
 */

export const ISSUE_DE_SECOURS_INDICATION_TYPE = 'Issue de secours';

/** Path served from `public/markers/` (Vite base is `/`). */
export const ISSUE_DE_SECOURS_MARKER_PUBLIC_PATH = '/markers/issue-de-secours.png';

export const isIssueDeSecoursIndication = (indicationType: string | undefined | null): boolean =>
  indicationType === ISSUE_DE_SECOURS_INDICATION_TYPE;
