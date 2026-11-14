/**
 * Android's `beforeinstallprompt` fires once, shortly after the page becomes
 * installable, and it can happen before the dashboard route (and its install
 * banner) is mounted. This module is imported by the root route so the event is
 * captured on the very first page and kept for the rest of the session.
 */
export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Listener = (event: BeforeInstallPromptEvent) => void;

let capturedPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<Listener>();

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    // Stop Chrome's own mini-infobar so the in-app banner can offer the install.
    event.preventDefault();
    capturedPrompt = event as BeforeInstallPromptEvent;
    listeners.forEach((listener) => listener(capturedPrompt as BeforeInstallPromptEvent));
  });
}

export function getInstallPrompt() {
  return capturedPrompt;
}

export function clearInstallPrompt() {
  capturedPrompt = null;
}

/** Subscribes to the captured event, replaying it if it already fired. */
export function onInstallPrompt(listener: Listener) {
  listeners.add(listener);
  if (capturedPrompt) listener(capturedPrompt);
  return () => {
    listeners.delete(listener);
  };
}
