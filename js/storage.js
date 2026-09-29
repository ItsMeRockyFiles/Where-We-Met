/* =========================================================
   storage.js — all localStorage read/write logic
   ========================================================= */

const STORAGE_KEY = 'where-we-met-pins';

/** Returns array of all saved pins (empty array on failure). */
function getPins() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Failed to read pins:', err);
    return [];
  }
}

/** Returns a single pin by ID, or null. */
function getPinById(id) {
  return getPins().find((p) => p.id === id) || null;
}

/**
 * Adds a pin. Returns true on success, false if storage quota exceeded.
 */
function savePin(pin) {
  const pins = getPins();
  pins.push(pin);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pins));
    return true;
  } catch (err) {
    console.error('Failed to save pin (storage full?):', err);
    return false;
  }
}

/** Removes a pin by ID. */
function deletePinById(id) {
  const pins = getPins().filter((p) => p.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pins));
  } catch (err) {
    console.error('Failed to persist deletion:', err);
  }
}

/** Generates a short unique ID for a pin. */
function generateId() {
  return 'pin_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
}