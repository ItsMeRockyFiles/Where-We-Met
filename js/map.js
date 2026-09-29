const FALLBACK_VIEW = { lat: 50.8503, lng: 4.3517, zoom: 4 };

const map = L.map('map', {
  zoomControl: false,
  attributionControl: true,
  worldCopyJump: true,
  minZoom: 2,
  maxZoom: 19,
}).setView([FALLBACK_VIEW.lat, FALLBACK_VIEW.lng], FALLBACK_VIEW.zoom);

L.tileLayer(
  `https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png?key=${CONFIG.CARTO_API_KEY}`,
  {
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    subdomains: 'abcd',
    maxZoom: 19,
  }
).addTo(map);

L.control.zoom({ position: 'bottomright' }).addTo(map);

const markers = {};

function normalizeLng(lng) {
  while (lng > 180) lng -= 360;
  while (lng < -180) lng += 360;
  return lng;
}

let userLocationLayer = null;

function showUserLocation(lat, lng, accuracy) {
  if (userLocationLayer) {
    map.removeLayer(userLocationLayer);
  }

  userLocationLayer = L.layerGroup();

  const accuracyCircle = L.circle([lat, lng], {
    radius: accuracy,
    color: '#007AFF',
    weight: 1,
    opacity: 0.4,
    fillColor: '#007AFF',
    fillOpacity: 0.15,
    interactive: false,
  });

  const pulse = L.circleMarker([lat, lng], {
    radius: 8,
    color: '#007AFF',
    weight: 0,
    fillColor: '#007AFF',
    fillOpacity: 0.4,
    interactive: false,
    className: 'user-pulse',
  });

  const dot = L.circleMarker([lat, lng], {
    radius: 8,
    color: '#fff',
    weight: 3,
    fillColor: '#007AFF',
    fillOpacity: 1,
    interactive: false,
  });

  accuracyCircle.addTo(userLocationLayer);
  pulse.addTo(userLocationLayer);
  dot.addTo(userLocationLayer);

  userLocationLayer.addTo(map);
}

function centerOnUser() {
  if (!navigator.geolocation) return;

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude, accuracy } = position.coords;
      showUserLocation(latitude, longitude, accuracy);
      map.flyTo([latitude, longitude], 15, { duration: 1.2 });
    },
    (err) => {
      console.warn('Geolocation unavailable:', err.message);
    },
    {
      enableHighAccuracy: true,
      timeout: 8000,
      maximumAge: 60000,
    }
  );
}