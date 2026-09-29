/* =========================================================
   app.js — main app orchestration, event wiring, UI logic
   ========================================================= */

/* ---------- DOM references ---------- */
const modal           = document.getElementById('modal');
const form            = document.getElementById('memory-form');
const titleInput      = document.getElementById('title');
const dateInput       = document.getElementById('date');
const descriptionInput= document.getElementById('description');
const photoInput      = document.getElementById('photo');
const cancelBtn       = document.getElementById('cancel-btn');
const sidebar         = document.getElementById('sidebar');
const sidebarContent  = document.getElementById('sidebar-content');
const closeSidebarBtn = document.getElementById('close-sidebar');
const emptyState      = document.getElementById('empty-state');

/* ---------- App state ---------- */
let pendingCoords = null;   // { lat, lng } where the new pin will go
let activePinId   = null;   // currently open pin in the sidebar

/* ---------- Init ---------- */
window.addEventListener('DOMContentLoaded', () => {
  renderAllPins();
  updateEmptyState();

  // Center on the most recently added pin, if any exist
  const pins = getPins();
  if (pins.length > 0) {
    const latest = pins.reduce((a, b) => (a.createdAt > b.createdAt ? a : b));
    map.setView([latest.lat, latest.lng], 13);
  }
});

/* ---------- Empty state ---------- */
function updateEmptyState() {
  const hasPins = getPins().length > 0;
  emptyState.classList.toggle('hidden', hasPins);
}

/* ---------- Map click → open modal ---------- */
map.on('click', (e) => {
  closeSidebar(); // collapse sidebar if it's open
  pendingCoords = { lat: e.latlng.lat, lng: e.latlng.lng };
  openModal();
});

/* ---------- Modal ---------- */
function openModal() {
  form.reset();
  // Pre-fill the date field with today
  dateInput.value = new Date().toISOString().slice(0, 10);

  modal.classList.remove('hidden');
  // Defer to next frame so the CSS transition plays
  requestAnimationFrame(() => modal.classList.add('visible'));

  setTimeout(() => titleInput.focus(), 120);
}

function closeModal() {
  modal.classList.remove('visible');
  // Wait for fade-out before hiding completely
  setTimeout(() => modal.classList.add('hidden'), 200);
  pendingCoords = null;
}

cancelBtn.addEventListener('click', closeModal);

// Click on the dark backdrop (but not the form itself) closes the modal
modal.addEventListener('click', (e) => {
  if (e.target === modal) closeModal();
});

/* ---------- Global keyboard shortcuts ---------- */
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (!modal.classList.contains('hidden')) closeModal();
  else closeSidebar();
});

/* ---------- Form submit ---------- */
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!pendingCoords) return;

  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Saving…';

  // Process photo (if any) → compressed base64 data URL
  let photoData = null;
  const file = photoInput.files[0];
  if (file) {
    try {
      photoData = await fileToDataURL(file);
    } catch (err) {
      console.error('Image processing failed:', err);
    }
  }

  const pin = {
    id:          generateId(),
    lat:         pendingCoords.lat,
    lng:         pendingCoords.lng,
    title:       titleInput.value.trim(),
    date:        dateInput.value || '',
    description: descriptionInput.value.trim(),
    photo:       photoData,
    createdAt:   Date.now(),
  };

  const saved = savePin(pin);
  if (!saved) {
    alert(
      'Could not save your memory — browser storage is full. ' +
      'Try deleting an old memory or using a smaller photo.'
    );
    submitBtn.disabled = false;
    submitBtn.textContent = 'Save Memory';
    return;
  }

  // Update UI
  addPinToMap(pin);
  updateEmptyState();

  submitBtn.disabled = false;
  submitBtn.textContent = 'Save Memory';
  closeModal();

  // Show the new memory once the modal close animation finishes
  setTimeout(() => openSidebar(pin.id), 220);
});

/* ---------- Sidebar ---------- */
document.addEventListener('pin:selected', (e) => openSidebar(e.detail.id));
closeSidebarBtn.addEventListener('click', closeSidebar);

function openSidebar(id) {
  const pin = getPinById(id);
  if (!pin) return;

  activePinId = id;
  renderSidebar(pin);
  sidebar.classList.add('open');
  sidebar.setAttribute('aria-hidden', 'false');
  highlightMarker(id);

  // Pan the map so the pin sits in the visible (left) area
  panToWithOffset(pin.lat, pin.lng);
}

function closeSidebar() {
  if (!sidebar.classList.contains('open')) return;
  sidebar.classList.remove('open');
  sidebar.setAttribute('aria-hidden', 'true');
  activePinId = null;
  highlightMarker(null);
}

function renderSidebar(pin) {
  const dateStr = pin.date
    ? new Date(pin.date).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  const photoHTML = pin.photo
    ? `<div class="memory-photo" style="background-image:url('${pin.photo}')"></div>`
    : '';

  const descHTML = pin.description
    ? `<p class="memory-desc">${escapeHTML(pin.description)}</p>`
    : '';

  sidebarContent.innerHTML = `
    ${photoHTML}
    <div class="memory-body">
      <h2 class="memory-title">${escapeHTML(pin.title)}</h2>
      ${dateStr ? `<p class="memory-date">${escapeHTML(dateStr)}</p>` : ''}
      ${descHTML}
      <button class="delete-btn" data-id="${pin.id}">Delete memory</button>
    </div>
  `;

  sidebarContent
    .querySelector('.delete-btn')
    .addEventListener('click', () => handleDelete(pin));
}

function handleDelete(pin) {
  if (!confirm('Delete this memory?')) return;
  deletePinById(pin.id);
  removePinFromMap(pin.id);
  closeSidebar();
  updateEmptyState();
}

/* ---------- Map panning with sidebar offset ---------- */
function panToWithOffset(lat, lng) {
  const zoom = map.getZoom();
  const sidebarOnWideScreen = window.innerWidth > 720;

  // If the sidebar is taking up space, shift the pan target
  // so the pin lands in the visible (left) half of the map.
  const offsetX = sidebarOnWideScreen ? 190 : 0;

  if (offsetX === 0) {
    map.panTo([lat, lng], { animate: true, duration: 0.5 });
    return;
  }

  const point = map.project([lat, lng], zoom).add([offsetX, 0]);
  map.panTo(map.unproject(point, zoom), { animate: true, duration: 0.5 });
}

/* ---------- Helpers ---------- */

/** Escapes user-provided strings before injecting into innerHTML. */
function escapeHTML(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));
}

/**
 * Reads a File, resizes it to fit `maxWidth`, and returns a
 * compressed JPEG data URL. Keeps photos well under the
 * localStorage quota.
 */
function fileToDataURL(file, maxWidth = 800, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        if (width > maxWidth) {
          height = Math.round((maxWidth / width) * height);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}