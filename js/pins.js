/* =========================================================
   pins.js — marker rendering + map/sidebar communication
   ========================================================= */

/**
 * Builds a Leaflet divIcon for a pin.
 * If the pin has a photo, the marker shows it inside a circle.
 * Otherwise it renders a colored dot.
 */
function createMarkerIcon(pin, isActive = false) {
  const size = isActive ? 52 : 44;

  const inner = pin.photo
    ? `<div class="marker-inner" style="background-image:url('${pin.photo}')"></div>`
    : `<div class="marker-inner marker-inner--dot"></div>`;

  return L.divIcon({
    className: isActive ? 'custom-marker active' : 'custom-marker',
    html: `<div class="marker-pin">${inner}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

/** Adds a single pin's marker to the map and wires its click handler. */
function addPinToMap(pin) {
  const marker = L.marker([pin.lat, pin.lng], {
    icon: createMarkerIcon(pin),
    riseOnHover: true,
    keyboard: true,
    title: pin.title,
  }).addTo(map);

  // Leaflet stops propagation on marker clicks, so this
  // won't accidentally trigger the "add new pin" map handler.
  marker.on('click', () => {
    document.dispatchEvent(
      new CustomEvent('pin:selected', { detail: { id: pin.id } })
    );
  });

  markers[pin.id] = marker;
}

/** Removes a pin's marker from the map. */
function removePinFromMap(id) {
  if (markers[id]) {
    map.removeLayer(markers[id]);
    delete markers[id];
  }
}

/** Clears every marker and redraws from storage. */
function renderAllPins() {
  Object.values(markers).forEach((m) => map.removeLayer(m));
  Object.keys(markers).forEach((k) => delete markers[k]);
  getPins().forEach(addPinToMap);
}

/**
 * Enlarges the marker matching `id` and resets all others.
 * Pass null to reset all markers.
 */
function highlightMarker(id) {
  Object.entries(markers).forEach(([pinId, marker]) => {
    const pin = getPinById(pinId);
    if (!pin) return;
    marker.setIcon(createMarkerIcon(pin, pinId === id));
  });
}