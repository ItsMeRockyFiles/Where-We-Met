function createMarkerIcon(place, isActive = false) {
  const count = place.memories.length;
  const hasMultiple = count > 1;

  const baseSize = hasMultiple ? 52 : 44;
  const size = isActive ? baseSize + 8 : baseSize;

  let inner;
  if (count === 1) {
    const m = place.memories[0];
    inner = m.photo
      ? `<div class="marker-inner" style="background-image:url('${m.photo}')"></div>`
      : `<div class="marker-inner marker-inner--dot"></div>`;
  } else {
    const recent = place.memories.slice(-4).reverse();
    const tiles = recent.map((m) =>
      m.photo
        ? `<div class="marker-tile" style="background-image:url('${m.photo}')"></div>`
        : `<div class="marker-tile marker-tile--empty"></div>`
    ).join('');
    inner = `<div class="marker-grid marker-grid--${recent.length}">${tiles}</div>`;
  }

  const badge = count > 1 ? `<span class="marker-badge">${count}</span>` : '';

  return L.divIcon({
    className: isActive ? 'custom-marker active' : 'custom-marker',
    html: `<div class="marker-pin">${inner}</div>${badge}`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

function addPlaceToMap(place) {
  const latest = place.memories[place.memories.length - 1];

  const marker = L.marker([place.lat, place.lng], {
    icon: createMarkerIcon(place),
    riseOnHover: true,
    keyboard: true,
    title: latest.title,
  }).addTo(map);

  marker.on('click', () => {
    document.dispatchEvent(
      new CustomEvent('place:selected', { detail: { id: place.id } })
    );
  });

  markers[place.id] = marker;
}

function removePlaceFromMap(id) {
  if (markers[id]) {
    map.removeLayer(markers[id]);
    delete markers[id];
  }
}

function renderAllPins() {
  Object.values(markers).forEach((m) => map.removeLayer(m));
  Object.keys(markers).forEach((k) => delete markers[k]);
  getPlaces().forEach(addPlaceToMap);
}

function highlightMarker(id) {
  Object.entries(markers).forEach(([placeId, marker]) => {
    const place = getPlaceById(placeId);
    if (!place) return;
    marker.setIcon(createMarkerIcon(place, placeId === id));
  });
}