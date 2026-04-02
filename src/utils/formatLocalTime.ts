/**
 * Formats HH:mm in the user's local timezone from an ISO string or datetime-local value.
 */
export const formatLocalTimeHM = (isoOrLocalString: string): string => {
  const d = new Date(isoOrLocalString);
  if (Number.isNaN(d.getTime())) {
    return '';
  }
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
};
