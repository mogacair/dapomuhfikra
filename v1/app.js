/**
 * ============================================================
 * DAPODIK MUHFIKRA - BACKEND INTEGRATION & LOGIC
 * File: app.js
 * ============================================================
 */

// URL Web App Google Apps Script
const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxXWxCZ1TnX6oxk-Vx5d7ouIZ3tbxJojHclmEVzHLp_A9_YixKPqqj9TL3OyGj89oysfw/exec";

// Penampung data master siswa dari Google Sheets
let DATA_SISWA = [];

// Variabel kontrol exit double-back di dashboard
let exitAppPending = false;
let exitTimeout = null;

/**
 * 1. INISIALISASI APLIKASI
 */
document.addEventListener('DOMContentLoaded', () => {
  // Pasang Level 1 (Dashboard) pada riwayat browser
  history.replaceState({ page: 'dashboard' }, 'Dashboard', '');
  
  // Ambil data live dari Google Sheet saat aplikasi dibuka
  fetchDataFromGAS();
});

/**
 * 2. AMBIL DATA DARI GOOGLE APPS SCRIPT (GAS)
 */
async function fetchDataFromGAS() {
  const tbodyScreen = document.getElementById('tbody-siswa');
  const emptyState = document.getElementById('empty-state');

  // Tampilan Loading di Tabel
  tbodyScreen.innerHTML = `
    <tr>
      <td colspan="4" class="py-10 text-center text-slate-500 font-semibold">
        <i class="ph-bold ph-spinner animate-spin text-3xl mb-2 text-brand-green inline-block"></i>
        <p class="text-sm md:text-base font-medium">Sedang memuat data dari Google Sheets...</p>
      </td>
    </tr>
  `;

  try {
    const response = await fetch(GAS_WEB_APP_URL);
    const result = await response.json();

    if (result.status === "success") {
      DATA_SISWA = result.data;

      // Buat pilihan dropdown kelas otomatis sesuai data yang ada di sheet
      populateClassFilter(DATA_SISWA);

      // Render data ke tabel layar dan tabel cetak
      renderTableScreen(DATA_SISWA);
      renderTablePrint(DATA_SISWA);
    } else {
      console.error("Error dari GAS:", result.message);
      tbodyScreen.innerHTML = `
        <tr>
          <td colspan="4" class="py-8 text-center text-red-600 font-bold text-sm">
            <i class="ph-bold ph-warning text-3xl mb-1 inline-block"></i>
            <p>Gagal memuat: ${result.message}</p>
          </td>
        </tr>
      `;
    }
  } catch (error) {
    console.error("Gagal terhubung ke Google Apps Script:", error);
    tbodyScreen.innerHTML = `
      <tr>
        <td colspan="4" class="py-8 text-center text-red-600 font-bold text-sm">
          <i class="ph-bold ph-wifi-slash text-3xl mb-1 inline-block"></i>
          <p>Terjadi kendala koneksi atau deployment URL belum diset ke 'Anyone'.</p>
        </td>
      </tr>
    `;
  }
}

/**
 * 3. OTOMATISASI DAFTAR DROPDOWN KELAS SESUAI SHEET
 */
function populateClassFilter(dataList) {
  const select = document.getElementById('filter-kelas');
  if (!select) return;

  // Ekstrak nama kelas unik dan urutkan
  const kelasList = [...new Set(dataList.map(item => item.kelas).filter(k => k && k.trim() !== ""))].sort();

  select.innerHTML = '<option value="ALL">Semua Siswa</option>';
  kelasList.forEach(kls => {
    const opt = document.createElement('option');
    opt.value = kls;
    opt.innerText = `Kelas ${kls}`;
    select.appendChild(opt);
  });
}

/**
 * 4. NAVIGASI PINDAH HALAMAN (LEVEL 2)
 */
function goToPage(pageName) {
  history.pushState({ page: pageName }, pageName, '');
  applyViewState({ page: pageName });
}

/**
 * 5. BUKA DETAIL SISWA (LEVEL 3)
 */
function openModalDetail(nisn) {
  const siswa = DATA_SISWA.find(s => s.nisn === nisn);
  if (!siswa) return;

  // Masukkan data siswa ke komponen modal detail
  document.getElementById('det-nama').innerText = siswa.nama || '-';
  document.getElementById('det-nis').innerText = siswa.nis || '-';
  document.getElementById('det-nisn').innerText = siswa.nisn || '-';
  document.getElementById('det-kelas').innerText = siswa.kelas || '-';
  document.getElementById('det-ttl').innerText = siswa.ttl || '-';
  document.getElementById('det-ibu').innerText = siswa.ibu || '-';
  document.getElementById('det-alamat').innerText = siswa.alamat || '-';

  // Catat state level 3 di browser
  history.pushState({ page: 'siswa_detail', nisn: nisn }, 'Detail Siswa', '');
  applyViewState({ page: 'siswa_detail', nisn: nisn });
}

/**
 * 6. SINKRONISASI TAMPILAN VIEW TERHADAP STATE RIWAYAT BROWSER
 */
function applyViewState(state) {
  const viewDashboard = document.getElementById('view-dashboard');
  const viewSiswa = document.getElementById('view-siswa');
  const btnBack = document.getElementById('btn-header-back');
  const headerTitle = document.getElementById('header-title');
  const headerSubtitle = document.getElementById('header-subtitle');

  const modal = document.getElementById('modal-detail');
  const modalContent = document.getElementById('modal-content');

  const page = state ? state.page : 'dashboard';

  // LEVEL 3: Modal Detail Terbuka
  if (page === 'siswa_detail') {
    viewDashboard.classList.add('hidden');
    viewSiswa.classList.remove('hidden');
    btnBack.classList.remove('hidden');
    
    headerTitle.innerText = "Detail Siswa";
    headerSubtitle.innerText = "Dapodik Muhfikra";

    modal.classList.remove('opacity-0', 'pointer-events-none');
    modal.classList.add('opacity-100');
    modalContent.classList.remove('translate-y-full', 'md:scale-95');
    modalContent.classList.add('translate-y-0', 'md:scale-100');
    return;
  }

  // Tutup Modal saat kembali ke level 2 atau level 1
  modalContent.classList.remove('translate-y-0', 'md:scale-100');
  modalContent.classList.add('translate-y-full', 'md:scale-95');
  modal.classList.remove('opacity-100');
  modal.classList.add('opacity-0', 'pointer-events-none');

  // LEVEL 2: Halaman Data Siswa
  if (page === 'siswa') {
    viewDashboard.classList.add('hidden');
    viewSiswa.classList.remove('hidden');
    btnBack.classList.remove('hidden');

    headerTitle.innerText = "Data Siswa";
    headerSubtitle.innerText = "Dapodik Muhfikra";
    return;
  }

  // LEVEL 1: Dashboard Utama
  if (page === 'dashboard') {
    viewSiswa.classList.add('hidden');
    viewDashboard.classList.remove('hidden');
    btnBack.classList.add('hidden');

    headerTitle.innerText = "DAPODIK MUHFIKRA";
    headerSubtitle.innerText = "Sistem Informasi Akademik";
  }
}

/**
 * 7. PENANGANAN GESTURE / TOMBOL BACK (POPSTATE)
 */
window.addEventListener('popstate', (event) => {
  const state = event.state;

  // Jika kembali ke Level 1 (Dashboard Utama)
  if (!state || state.page === 'dashboard') {
    applyViewState({ page: 'dashboard' });

    if (!exitAppPending) {
      exitAppPending = true;
      showExitToast();
      
      // Dorong kembali state agar tetap di dashboard jika belum double-back
      history.pushState({ page: 'dashboard' }, 'Dashboard', '');

      clearTimeout(exitTimeout);
      exitTimeout = setTimeout(() => {
        exitAppPending = false;
      }, 2500);
    } else {
      history.back();
    }
  } else {
    applyViewState(state);
  }
});

/**
 * 8. NOTIFIKASI TOAST KONFIRMASI KELUAR
 */
function showExitToast() {
  const toast = document.getElementById('toast-exit');
  toast.classList.remove('opacity-0', 'pointer-events-none');
  toast.classList.add('opacity-100');

  setTimeout(() => {
    toast.classList.remove('opacity-100');
    toast.classList.add('opacity-0', 'pointer-events-none');
  }, 2000);
}

/**
 * 9. RENDER TABEL LAYAR HP / MONITOR
 */
function renderTableScreen(dataList) {
  const tbody = document.getElementById('tbody-siswa');
  const emptyState = document.getElementById('empty-state');
  tbody.innerHTML = '';

  if (!dataList || dataList.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');

  dataList.forEach((siswa, index) => {
    const tr = document.createElement('tr');
    tr.className = "hover:bg-brand-greenLight/30 transition-colors border-b border-slate-100";
    
    tr.innerHTML = `
      <td class="py-3.5 px-3 text-center font-bold text-slate-500">${index + 1}</td>
      <td class="py-3.5 px-3 font-mono text-xs md:text-sm text-slate-600">${siswa.nisn || '-'}</td>
      <td class="py-3.5 px-3">
        <button onclick="openModalDetail('${siswa.nisn}')" class="text-left font-bold text-brand-green hover:underline focus:outline-none text-base md:text-lg block">
          ${siswa.nama}
        </button>
      </td>
      <td class="py-3.5 px-3 text-center">
        <span class="inline-block bg-slate-200 text-slate-800 text-xs md:text-sm font-bold px-2.5 py-1 rounded-lg">
          ${siswa.kelas || '-'}
        </span>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

/**
 * 10. RENDER TABEL CETAK PDF LANDSCAPE LENGKAP
 */
function renderTablePrint(dataList) {
  const tbodyPrint = document.getElementById('tbody-print-siswa');
  tbodyPrint.innerHTML = '';

  dataList.forEach((siswa, index) => {
    const tr = document.createElement('tr');
    tr.className = index % 2 === 0 ? "bg-white" : "bg-gray-50";

    tr.innerHTML = `
      <td class="border border-black p-1.5 text-center font-bold">${index + 1}</td>
      <td class="border border-black p-1.5 text-center font-mono">${siswa.nis || '-'}</td>
      <td class="border border-black p-1.5 text-center font-mono">${siswa.nisn || '-'}</td>
      <td class="border border-black p-1.5 font-bold">${siswa.nama || '-'}</td>
      <td class="border border-black p-1.5 text-center font-semibold">${siswa.kelas || '-'}</td>
      <td class="border border-black p-1.5">${siswa.ttl || '-'}</td>
      <td class="border border-black p-1.5">${siswa.ibu || '-'}</td>
      <td class="border border-black p-1.5 leading-snug">${siswa.alamat || '-'}</td>
    `;
    tbodyPrint.appendChild(tr);
  });
}

/**
 * 11. FILTER BERDASARKAN KELAS
 */
function filterDataSiswa() {
  const selectedClass = document.getElementById('filter-kelas').value;
  const btnCetakText = document.getElementById('btn-cetak-text');
  const printFilterInfo = document.getElementById('print-filter-info');

  let filtered = DATA_SISWA;
  if (selectedClass !== 'ALL') {
    filtered = DATA_SISWA.filter(s => s.kelas === selectedClass);
    btnCetakText.innerText = `Cetak PDF Landscape (Kelas ${selectedClass})`;
    printFilterInfo.innerText = `Filter: Kelas ${selectedClass}`;
  } else {
    btnCetakText.innerText = `Cetak PDF Landscape (Semua Siswa)`;
    printFilterInfo.innerText = `Filter: Semua Siswa`;
  }

  renderTableScreen(filtered);
  renderTablePrint(filtered);
}

/**
 * 12. FUNGSI CETAK DOKUMEN KE PDF LANDSCAPE
 */
function cetakPDF() {
  const now = new Date();
  const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  const formattedDate = now.toLocaleDateString('id-ID', options);
  
  document.getElementById('print-date-info').innerText = `Waktu Cetak: ${formattedDate}`;
  document.getElementById('print-sign-date').innerText = `Dicetak, ${now.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}`;

  window.print();
}

/**
 * 13. PLACEHOLDER UNTUK MENU TAHAP SELANJUTNYA
 */
function showUnderDevelopment(menuName) {
  alert(`Menu [${menuName}] akan dikembangkan pada tahap selanjutnya.`);
}
