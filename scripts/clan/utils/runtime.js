import { DEBUG_PREFIX } from "../config.js";

export function subscribeIfAvailable(scope, signal, callback) {
  if (!signal || typeof signal.subscribe !== "function") {
    return false;
  }

  return runSafely(scope, () => {
    signal.subscribe(callback);
    return true;
  }) === true;
}

export function logError(scope, error) {
  if (typeof console === "undefined" || typeof console.warn !== "function") {
    return;
  }

  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.warn(`${DEBUG_PREFIX} ${scope}: ${message}`);
}

export function runSafely(scope, callback) {
  try {
    return callback();
  } catch (error) {
    logError(scope, error);
    return undefined;
  }
}
