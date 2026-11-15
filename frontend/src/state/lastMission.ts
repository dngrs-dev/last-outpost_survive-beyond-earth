/** A resume bookmark only. The backend remains authoritative for every game. */
export const LAST_MISSION_KEY = 'last-outpost:last-mission';
const validId = (value: string) => /^[a-zA-Z0-9_-]{1,128}$/.test(value);

export function readLastMission(): string | null {
  try {
    const value = localStorage.getItem(LAST_MISSION_KEY);
    return value && validId(value) ? value : null;
  } catch {
    return null;
  }
}

export function rememberMission(gameId: string): void {
  if (!validId(gameId)) return;
  try {
    localStorage.setItem(LAST_MISSION_KEY, gameId);
  } catch {
    // Storage restrictions must not prevent a mission from being played.
  }
}

export function forgetMission(gameId: string): void {
  try {
    if (localStorage.getItem(LAST_MISSION_KEY) === gameId)
      localStorage.removeItem(LAST_MISSION_KEY);
  } catch {
    // The menu can still offer a new game when browser storage is unavailable.
  }
}
