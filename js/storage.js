const STORAGE_KEY = 'where-we-met-pins';

function getPins() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Failed to read pins:', err);
    return [];
  }
}

function getPinById(id) {
  return getPins().find((p) => p.id === id) || null;
}

function savePin(pin) {
  const pins = getPins();
  pins.push(pin);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pins));
    return true;
  } catch (err) {
    console.error('Failed to save pin:', err);
    return false;
  }
}

function deletePinById(id) {
  const pins = getPins().filter((p) => p.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pins));
  } catch (err) {
    console.error('Failed to persist deletion:', err);
  }
}

function generateId() {
  return 'pin_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
}