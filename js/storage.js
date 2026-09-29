const STORAGE_KEY = 'where-we-met-places';
const LEGACY_KEY = 'where-we-met-pins';

function getPlaces() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return migrateLegacyPins();
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to read places:', err);
    return [];
  }
}

function migrateLegacyPins() {
  const legacyRaw = localStorage.getItem(LEGACY_KEY);
  if (!legacyRaw) return [];

  try {
    const oldPins = JSON.parse(legacyRaw);
    const places = oldPins.map((pin) => ({
      id: 'place_' + pin.id,
      lat: pin.lat,
      lng: pin.lng,
      createdAt: pin.createdAt || Date.now(),
      memories: [{
        id: pin.id,
        title: pin.title,
        date: pin.date,
        description: pin.description,
        photo: pin.photo,
        createdAt: pin.createdAt || Date.now(),
      }],
    }));

    localStorage.setItem(STORAGE_KEY, JSON.stringify(places));
    localStorage.removeItem(LEGACY_KEY);
    return places;
  } catch (err) {
    console.error('Migration failed:', err);
    return [];
  }
}

function savePlaces(places) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(places));
    return true;
  } catch (err) {
    console.error('Failed to save places:', err);
    return false;
  }
}

function getPlaceById(id) {
  return getPlaces().find((p) => p.id === id) || null;
}

function findNearbyPlace(lat, lng, meters = 20) {
  const target = L.latLng(lat, lng);
  for (const place of getPlaces()) {
    const dist = target.distanceTo(L.latLng(place.lat, place.lng));
    if (dist <= meters) return place;
  }
  return null;
}

function createPlaceWithMemory(lat, lng, memory) {
  const places = getPlaces();
  const place = {
    id: 'place_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7),
    lat,
    lng: normalizeLng(lng),
    createdAt: Date.now(),
    memories: [memory],
  };
  places.push(place);
  return savePlaces(places) ? place : null;
}

function addMemoryToPlace(placeId, memory) {
  const places = getPlaces();
  const place = places.find((p) => p.id === placeId);
  if (!place) return null;
  place.memories.push(memory);
  return savePlaces(places) ? place : null;
}

function deleteMemory(placeId, memoryId) {
  const places = getPlaces();
  const idx = places.findIndex((p) => p.id === placeId);
  if (idx === -1) return null;

  places[idx].memories = places[idx].memories.filter((m) => m.id !== memoryId);

  if (places[idx].memories.length === 0) {
    places.splice(idx, 1);
    savePlaces(places);
    return { place: null, removed: true };
  }

  savePlaces(places);
  return { place: places[idx], removed: false };
}

function generateMemoryId() {
  return 'mem_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
}