const modal           = document.getElementById('modal');
const form            = document.getElementById('memory-form');
const titleInput      = document.getElementById('title');
const dateInput       = document.getElementById('date');
const descriptionInput= document.getElementById('description');
const photoInput      = document.getElementById('photo');
const photoPreview    = document.getElementById('photo-preview');
const photoPreviewImg = document.getElementById('photo-preview-img');
const photoRemove     = document.getElementById('photo-remove');
const photoLabel      = document.getElementById('photo-label');
const cancelBtn       = document.getElementById('cancel-btn');
const sidebar         = document.getElementById('sidebar');
const sidebarContent  = document.getElementById('sidebar-content');
const closeSidebarBtn = document.getElementById('close-sidebar');
const locateBtn       = document.getElementById('locate-btn');
const nearbyHint      = document.getElementById('nearby-hint');

let pendingCoords = null;
let activePlaceId = null;
let nearbyPlace   = null;

window.addEventListener('DOMContentLoaded', () => {
  renderAllPins();

  const places = getPlaces();
  if (places.length > 0) {
    const latest = places.reduce((a, b) => (a.createdAt > b.createdAt ? a : b));
    map.setView([latest.lat, latest.lng], 13);
  } else {
    centerOnUser();
  }
});

map.on('click', (e) => {
  closeSidebar();
  pendingCoords = { lat: e.latlng.lat, lng: e.latlng.lng };
  nearbyPlace = findNearbyPlace(e.latlng.lat, e.latlng.lng);
  openModal();
});

locateBtn.addEventListener('click', centerOnUser);

function openModal() {
  form.reset();
  hidePhotoPreview();
  dateInput.value = new Date().toISOString().slice(0, 10);

  if (nearbyPlace) {
    const latest = nearbyPlace.memories[nearbyPlace.memories.length - 1];
    nearbyHint.textContent = 'Adding to existing pin: ' + latest.title;
    nearbyHint.classList.remove('hidden');
  } else {
    nearbyHint.classList.add('hidden');
  }

  modal.classList.remove('hidden');
  requestAnimationFrame(() => modal.classList.add('visible'));
  setTimeout(() => titleInput.focus(), 120);
}

function closeModal() {
  modal.classList.remove('visible');
  setTimeout(() => modal.classList.add('hidden'), 200);
  pendingCoords = null;
  nearbyPlace = null;
}

cancelBtn.addEventListener('click', closeModal);

modal.addEventListener('click', (e) => {
  if (e.target === modal) closeModal();
});

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (!modal.classList.contains('hidden')) closeModal();
  else closeSidebar();
});

photoInput.addEventListener('change', () => {
  const file = photoInput.files[0];
  if (!file) {
    hidePhotoPreview();
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    photoPreviewImg.src = e.target.result;
    photoPreview.classList.remove('hidden');
    photoLabel.classList.add('hidden');
  };
  reader.readAsDataURL(file);
});

photoRemove.addEventListener('click', () => {
  photoInput.value = '';
  hidePhotoPreview();
});

function hidePhotoPreview() {
  photoPreview.classList.add('hidden');
  photoPreviewImg.src = '';
  photoLabel.classList.remove('hidden');
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!pendingCoords) return;

  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Saving…';

  let photoData = null;
  const file = photoInput.files[0];
  if (file) {
    try {
      photoData = await fileToDataURL(file);
    } catch (err) {
      console.error('Image processing failed:', err);
    }
  }

  const memory = {
    id: generateMemoryId(),
    title: titleInput.value.trim(),
    date: dateInput.value || '',
    description: descriptionInput.value.trim(),
    photo: photoData,
    createdAt: Date.now(),
  };

  let place;
  if (nearbyPlace) {
    place = addMemoryToPlace(nearbyPlace.id, memory);
  } else {
    place = createPlaceWithMemory(pendingCoords.lat, pendingCoords.lng, memory);
  }

  if (!place) {
    alert('Could not save your memory — browser storage might be full.');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Save Memory';
    return;
  }

  removePlaceFromMap(place.id);
  addPlaceToMap(place);

  submitBtn.disabled = false;
  submitBtn.textContent = 'Save Memory';

  const focusMemoryId = memory.id;
  closeModal();
  setTimeout(() => openSidebar(place.id, focusMemoryId), 220);
});

document.addEventListener('place:selected', (e) => openSidebar(e.detail.id));
closeSidebarBtn.addEventListener('click', closeSidebar);

function openSidebar(placeId, focusMemoryId = null) {
  const place = getPlaceById(placeId);
  if (!place) return;

  activePlaceId = placeId;
  renderSidebar(place, focusMemoryId);
  sidebar.classList.add('open');
  sidebar.setAttribute('aria-hidden', 'false');
  highlightMarker(placeId);
  panToWithOffset(place.lat, place.lng);
}

function closeSidebar() {
  if (!sidebar.classList.contains('open')) return;
  sidebar.classList.remove('open');
  sidebar.setAttribute('aria-hidden', 'true');
  activePlaceId = null;
  highlightMarker(null);
}

function renderSidebar(place, focusMemoryId = null) {
  const count = place.memories.length;
  const header = count > 1
    ? `<div class="place-header"><span class="place-count">${count} memories</span></div>`
    : '';

  const memoriesHTML = place.memories
    .slice()
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .map((m) => renderMemoryCard(m, m.id === focusMemoryId))
    .join('');

  sidebarContent.innerHTML = `${header}${memoriesHTML}`;

  sidebarContent.querySelectorAll('.delete-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      handleDeleteMemory(place.id, btn.dataset.memoryId);
    });
  });

  sidebarContent.querySelectorAll('.memory-card').forEach((card) => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.delete-btn')) return;
      card.classList.toggle('expanded');
    });
  });
}

function renderMemoryCard(memory, expanded) {
  const dateStr = memory.date
    ? new Date(memory.date).toLocaleDateString(undefined, {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : '';

  const photoStyle = memory.photo
    ? `style="background-image:url('${memory.photo}')"`
    : '';

  const photoClass = memory.photo
    ? 'memory-photo'
    : 'memory-photo memory-photo--empty';

  const descHTML = memory.description
    ? `<p class="memory-desc">${escapeHTML(memory.description)}</p>`
    : '';

  return `
    <article class="memory-card${expanded ? ' expanded' : ''}">
      <div class="${photoClass}" ${photoStyle}></div>
      <div class="memory-body">
        <h2 class="memory-title">${escapeHTML(memory.title)}</h2>
        ${dateStr ? `<p class="memory-date">${escapeHTML(dateStr)}</p>` : ''}
        ${descHTML}
        <button class="delete-btn" data-memory-id="${memory.id}">Delete memory</button>
      </div>
    </article>
  `;
}

function handleDeleteMemory(placeId, memoryId) {
  if (!confirm('Delete this memory?')) return;

  const result = deleteMemory(placeId, memoryId);
  if (!result) return;

  if (result.removed) {
    removePlaceFromMap(placeId);
    closeSidebar();
  } else {
    removePlaceFromMap(placeId);
    addPlaceToMap(result.place);
    renderSidebar(result.place);
  }
}

function panToWithOffset(lat, lng) {
  const zoom = map.getZoom();
  const sidebarOnWideScreen = window.innerWidth > 720;
  const offsetX = sidebarOnWideScreen ? 190 : 0;

  if (offsetX === 0) {
    map.panTo([lat, lng], { animate: true, duration: 0.5 });
    return;
  }

  const point = map.project([lat, lng], zoom).add([offsetX, 0]);
  map.panTo(map.unproject(point, zoom), { animate: true, duration: 0.5 });
}

function escapeHTML(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

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