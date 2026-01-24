/// <reference types="vite/client" />

// Google Analytics types
declare global {
  interface Window {
    dataLayer?: unknown[][];
    gtag?: (...args: unknown[]) => void;
  }
}

export {};
