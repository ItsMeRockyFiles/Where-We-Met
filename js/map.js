/* =========================================================
   map.js — Leaflet initialization
   ========================================================= */

const map = L.map('map', {
  zoomControl: false,
  attributionControl: true,
}).setView([50.8503, 4.3517], 12); // Brussels — change to your city

L.tileLayer(
  `https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png?key=${CONFIG.CARTO_API_KEY}`,
  {
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    subdomains: 'abcd',
    maxZoom: 19,
  }
).addTo(map);;

L.control.zoom({ position: 'bottomright' }).addTo(map);

/* Tracks all markers currently on the map, keyed by pin ID. */
const markers = {};