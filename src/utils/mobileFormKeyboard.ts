/**
 * Mobile keyboard UX: enterKeyHint + Enter to dismiss (blur + Capacitor Keyboard.hide).
 * Used by modal forms and VSSForm.
 */

import type { KeyboardEvent } from 'react';
import { Capacitor } from '@capacitor/core';

export const blurActiveFieldAndHideKeyboard = (): void => {
  const active = document.activeElement as HTMLElement | null;
  if (active && ['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName)) {
    active.blur();
  }
  if (Capacitor.isNativePlatform()) {
    void import('@capacitor/keyboard').then(({ Keyboard }) => Keyboard.hide()).catch(() => {});
  }
};

export const onModalSingleLineInputEnterKey = (e: KeyboardEvent<HTMLInputElement>): void => {
  if (e.key !== 'Enter') return;
  e.preventDefault();
  blurActiveFieldAndHideKeyboard();
};

export const onModalTextareaEnterKeyDone = (e: KeyboardEvent<HTMLTextAreaElement>): void => {
  if (e.key !== 'Enter' || e.shiftKey) return;
  e.preventDefault();
  blurActiveFieldAndHideKeyboard();
};
