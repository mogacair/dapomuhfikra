// Konfigurasi PWA Manifest Otomatis
(function initPWA() {
  const manifestData = {
    "name": "Dapodik SMK Muhammadiyah 5 Karanganyar",
    "short_name": "Dapodik",
    "start_url": "./",
    "display": "standalone",
    "background_color": "#f3f4f6",
    "theme_color": "#15803d"
  };
  const blob = new Blob([JSON.stringify(manifestData)], {type: 'application/json'});
  const linkTag = document.createElement('link');
  linkTag.rel = 'manifest';
  linkTag.href = URL.createObjectURL(blob);
  document.head.appendChild(linkTag);
})();

// Pengaturan State & History Back Button
window.addEventListener('DOMContentLoaded', () => {
  history.replaceState({ view: 'dashboard', modal: false }, '');
});

window.addEventListener('popstate', (e) => {
  const state = e.state;
  
  // Tutup modal detail siswa jika sedang terbuka
  if (typeof isDetailOpen !== 'undefined' && isDetailOpen) {
    if (typeof hideDetailDOM === 'function') hideDetailDOM();
    return;
  }

  // Tutup modal detail guru jika sedang terbuka
  if (typeof isDetailGuruOpen !== 'undefined' && isDetailGuruOpen) {
    if (typeof hideDetailGuruDOM === 'function') hideDetailGuruDOM();
    return;
  }

  if (state && state.view) {
    showView(state.view);
  } else {
    showView('dashboard');
  }
});

function navigateTo(viewName) {
  history.pushState({ view: viewName, modal: false }, '');
  showView(viewName);
}

function goBack() {
  history.back();
}

function showView(viewName) {
  const views = ['dashboard', 'siswa', 'guru', 'alumni', 'rapot'];
  views.forEach(v => {
    const el = document.getElementById(`view-${v}`);
    if (el) el.classList.toggle('hidden', v !== viewName);
  });

  if (typeof hideDetailDOM === 'function') hideDetailDOM();
  if (typeof hideDetailGuruDOM === 'function') hideDetailGuruDOM();

  // Trigger data saat navigasi
  if (viewName === 'siswa' && typeof initSiswaView === 'function') {
    initSiswaView();
  } else if (viewName === 'guru' && typeof initGuruView === 'function') {
    initGuruView();
  }
}
