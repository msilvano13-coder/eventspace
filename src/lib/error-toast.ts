/**
 * Global error notification system (Protocol 3: Make Silent Failures Loud).
 *
 * Any module can call `showErrorToast(msg)` to surface an error to the user.
 * The <ErrorToast /> React component subscribes to these events and renders them.
 *
 * In development (__DEV__), errors also throw so they can't be ignored.
 */

type ErrorToastListener = (message: string) => void;

const listeners = new Set<ErrorToastListener>();

export function subscribeErrorToast(listener: ErrorToastListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function showErrorToast(message: string): void {
  console.error("[ErrorToast]", message);
  listeners.forEach((l) => l(message));
}

/**
 * Dev-mode guard: throws after logging so errors can't be silently swallowed.
 * Use in catch blocks where the error was previously only console.error'd.
 */
export function devThrow(message: string, err?: unknown): void {
  if (process.env.NODE_ENV === "development") {
    throw new Error(`[DEV] ${message}: ${err instanceof Error ? err.message : String(err)}`);
  }
}
