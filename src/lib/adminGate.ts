export const ACCESS_CODE = '239898';

let unlocked = false;

export function isAdminUnlocked(): boolean {
  return unlocked;
}

export function unlockAdmin(): void {
  unlocked = true;
}

export function lockAdmin(): void {
  unlocked = false;
}
