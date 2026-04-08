/**
 * Mirrors critical user preferences to Capacitor Preferences on native so they
 * survive app termination (WKWebView localStorage can be cleared on iOS).
 */

import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import logger from './Logger';

/** Keys persisted natively in addition to localStorage */
export const NATIVE_PERSISTENCE_KEYS = [
  'preferredDelegation',
  'preferredChessDelegation',
] as const;

export type NativePersistedPreferenceKey = (typeof NATIVE_PERSISTENCE_KEYS)[number];

function shouldMirrorToNative(key: string): key is NativePersistedPreferenceKey {
  return (NATIVE_PERSISTENCE_KEYS as readonly string[]).includes(key);
}

function emitPreferenceEvents(key: string, newValue: string, oldValue: string | null): void {
  window.dispatchEvent(
    new StorageEvent('storage', {
      key,
      newValue,
      oldValue,
      storageArea: localStorage,
      url: window.location.href,
    })
  );
  window.dispatchEvent(
    new CustomEvent('preferenceChange', {
      detail: { key, value: newValue },
    })
  );
}

/**
 * Call after Capacitor setup, before React render. Reconciles native store and localStorage.
 */
export async function syncNativeDelegationPreferencesWithLocalStorage(): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  for (const key of NATIVE_PERSISTENCE_KEYS) {
    try {
      const { value: nativeVal } = await Preferences.get({ key });
      const localVal = localStorage.getItem(key);

      if (nativeVal != null && nativeVal !== '') {
        localStorage.setItem(key, nativeVal);
      } else if (localVal != null) {
        await Preferences.set({ key, value: localVal });
      }
    } catch (err) {
      logger.warn(`[UserPreferencesStorage] sync failed for ${key}:`, err);
    }
  }
}

/**
 * Persist to localStorage and mirror to native when applicable; fires the same events as legacy code.
 */
export function persistPreference(key: string, value: string): void {
  const oldValue = localStorage.getItem(key);
  localStorage.setItem(key, value);

  if (Capacitor.isNativePlatform() && shouldMirrorToNative(key)) {
    void Preferences.set({ key, value }).catch((err) => {
      logger.warn(`[UserPreferencesStorage] native set failed for ${key}:`, err);
    });
  }

  emitPreferenceEvents(key, value, oldValue);
}
