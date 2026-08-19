/**
 * ============================================================
 * DAPODIK MUHFIKRA - APP LOGIC (EXCEL & PDF EXPORT READY)
 * File: app.js
 * ============================================================
 */

// URL Web App Google Apps Script
const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxXWxCZ1TnX6oxk-Vx5d7ouIZ3tbxJojHclmEVzHLp_A9_YixKPqqj9TL3OyGj89oysfw/exec";
const STORAGE_KEY = "DAPODIK_SISWA_CACHE";

// Penampung data master siswa
let DATA_SISWA = [];

// Variabel kontrol exit double-back di dashboard
let exitAppPending = false;
let exitTimeout = null;

/**
 * 1. INISIALISASI APLIKASI
 */
document.addEventListener('DOMContentLoaded', () => {
  history.replaceState({ page: 'dashboard' }, 'Dashboard', '');
  
  // 1. Muat data dari LocalStorage secara instan
  const cachedData = localStorage.getItem(STORAGE_KEY);
  if (cachedData) {
    try {
      DATA_SISWA = JSON.parse(cachedData);
      populateClassFilter(DATA_SISWA);
      renderTableScreen(DATA_SISWA);
      renderTablePrint(DATA_SISWA);
    } catch (e) {
      console.warn("Data cache lokal tidak valid, mengunduh ulang...", e);
    }
  }

  // 2. Sinkronkan data terbaru dari Google Sheets di latar belakang
  fetchDataFromGAS(false);
});

/**
 * 2. AMBIL DATA DARI GOOGLE APPS SCRIPT (GAS)
 */
async function fetchDataFromGAS(isManualRefresh = false) {
  const tbodyScreen = document.getElementById('tbody-siswa');

  if (DATA_SISWA.length === 0 || isManualRefresh) {
    tbodyScreen.innerHTML = `
      <tr>
        <td colspan="4" class="py-10 text-center text-slate-500 font-semibold">
          <i class="ph-bold ph-spinner animate-spin text-3xl mb-2 text-brand-green inline-block"></i>
          <p class="text-sm md:text-base font-medium">Menyinkronkan data Google Sheets...</p>
        </td>
      </tr>
    `;
  }

  try {
    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'GET',
      redirect: 'follow'
    });

    if (!response.ok) {
      throw new Error(`HTTP Status: ${response.status}`);
    }

    const result = await response.json();

    if (result.status === "success") {
      DATA_SISWA = result.data;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DATA_SISWA));

      populateClassFilter(DATA_SISWA);
      filterDataSiswa();
    } else {
      throw new Error(result.message || "Gagal memproses data spreadsheet.");
    }

  } catch (error) {
    console.error("Fetch GAS Error:", error);
    
    if (DATA_SISWA.length > 0) {
      console.log("Koneksi gagal sementara, tetap menggunakan data cache lokal.");
      return;
    }

    tbodyScreen.innerHTML = `
      <tr>
        <td colspan="4" class="py-8 text-center text-red-600 font-bold text-sm">
          <i class="ph-bold ph-wifi-slash text-3xl mb-2 inline-block"></i>
          <p class="mb-3 text-slate-700">Tidak dapat terhubung ke server Google Apps Script.</p>
          <button onclick="fetchDataFromGAS(true)" class="bg-brand-green hover:bg-brand-greenDark text-white px-4 py-2 rounded-xl text-xs font-bold active:scale-95 transition-transform inline-flex items-center gap-1.5 shadow">
            <i class="ph-bold ph-arrows-clockwise text-base"></i> Coba Lagi
          </button>
        </td>
      </tr>
    `;
  }
}

/**
 * 3. OTOMATISASI DAFTAR DROPDOWN KELAS SESUAI DATA SHEET
 */
function populateClassFilter(dataList) {
  const select = document.getElementById('filter-kelas');
  if (!select) return;

  const currentVal = select.value;
  const kelasList = [...new Set(dataList.map(item => item.kelas).filter(k => k && k.trim() !== ""))].sort();

  select.innerHTML = '<option value="ALL">Semua Siswa</option>';
  kelasList.forEach(kls => {
    const opt = document.createElement('option');
    opt.value = kls;
    opt.innerText = `Kelas ${kls}`;
    select.appendChild(opt);
  });

  if (currentVal && (currentVal === 'ALL' || kelasList.includes(currentVal))) {
    select.value = currentVal;
  }
}

/**
 * 4. NAVIGASI PINDAH HALAMAN (LEVEL 2)
 */
function goToPage(pageName) {
  history.pushState({ page: pageName }, pageName, '');
  applyViewState({ page: pageName });
}

/**
 * 5. BUKA DETAIL BIODATA SISWA (LEVEL 3)
 */
function openModalDetail(nisn) {
  const siswa = DATA_SISWA.find(s => s.nisn === nisn);
  if (!siswa) return;

  document.getElementById('det-nama').innerText = siswa.nama || '-';
  document.getElementById('det-nis').innerText = siswa.nis || '-';
  document.getElementById('det-nisn').innerText = siswa.nisn || '-';
  document.getElementById('det-kelas').innerText = siswa.kelas || '-';
  document.getElementById('det-ttl').innerText = siswa.ttl || '-';
  document.getElementById('det-ibu').innerText = siswa.ibu || '-';
  document.getElementById('det-alamat').innerText = siswa.alamat || '-';

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

  modalContent.classList.remove('translate-y-0', 'md:scale-100');
  modalContent.classList.add('translate-y-full', 'md:scale-95');
  modal.classList.remove('opacity-100');
  modal.classList.add('opacity-0', 'pointer-events-none');

  if (page === 'siswa') {
    viewDashboard.classList.add('hidden');
    viewSiswa.classList.remove('hidden');
    btnBack.classList.remove('hidden');

    headerTitle.innerText = "Data Siswa";
    headerSubtitle.innerText = "Dapodik Muhfikra";
    return;
  }

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

  if (!state || state.page === 'dashboard') {
    applyViewState({ page: 'dashboard' });

    if (!exitAppPending) {
      exitAppPending = true;
      showExitToast();
      
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
 * 10. RENDER TABEL CETAK PDF LANDSCAPE
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
 * 11. FILTER DATA SISWA BERDASARKAN KELAS
 */
function filterDataSiswa() {
  const filterElement = document.getElementById('filter-kelas');
  const selectedClass = filterElement ? filterElement.value : 'ALL';
  const btnPdfText = document.getElementById('btn-pdf-text');
  const btnExcelText = document.getElementById('btn-excel-text');
  const printFilterInfo = document.getElementById('print-filter-info');

  let filtered = DATA_SISWA;
  if (selectedClass !== 'ALL') {
    filtered = DATA_SISWA.filter(s => s.kelas === selectedClass);
    if (btnPdfText) btnPdfText.innerText = `Download PDF (${selectedClass})`;
    if (btnExcelText) btnExcelText.innerText = `Excel (${selectedClass})`;
    if (printFilterInfo) printFilterInfo.innerText = `Filter: Kelas ${selectedClass}`;
  } else {
    if (btnPdfText) btnPdfText.innerText = `Download PDF (Semua)`;
    if (btnExcelText) btnExcelText.innerText = `Download Excel`;
    if (printFilterInfo) printFilterInfo.innerText = `Filter: Semua Siswa`;
  }

  renderTableScreen(filtered);
  renderTablePrint(filtered);
}

/**
 * 12. FUNGSI DOWNLOAD EXCEL (.XLSX) SESUAI FILTER KELAS AKTIF
 */
function downloadExcel() {
  const filterElement = document.getElementById('filter-kelas');
  const selectedClass = filterElement ? filterElement.value : 'ALL';

  let dataToExport = DATA_SISWA;
  let fileName = "Dapodik_Muhfikra_Semua_Siswa.xlsx";

  if (selectedClass !== 'ALL') {
    dataToExport = DATA_SISWA.filter(s => s.kelas === selectedClass);
    fileName = `Dapodik_Muhfikra_Kelas_${selectedClass}.xlsx`;
  }

  if (dataToExport.length === 0) {
    alert("Tidak ada data siswa untuk di-export ke Excel.");
    return;
  }

  // Format array data untuk sheet Excel
  const excelData = dataToExport.map((siswa, idx) => ({
    "No": idx + 1,
    "NIS / NIPD": siswa.nis || "",
    "NISN": siswa.nisn || "",
    "Nama Lengkap": siswa.nama || "",
    "Kelas": siswa.kelas || "",
    "Tempat, Tanggal Lahir": siswa.ttl || "",
    "Nama Ibu Kandung": siswa.ibu || "",
    "Alamat Lengkap": siswa.alamat || ""
  }));

  // Buat worksheet dan workbook via SheetJS
  const ws = XLSX.utils.json_to_sheet(excelData);
  const wb = XLSX.utils.book_new();
  const sheetTitle = selectedClass === 'ALL' ? 'DATA_SISWA' : selectedClass;
  
  XLSX.utils.book_append_sheet(wb, ws, sheetTitle);

  // Trigger file download
  XLSX.writeFile(wb, fileName);
}

/**
 * 13. FUNGSI DOWNLOAD / CETAK PDF LANDSCAPE
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
 * 14. PLACEHOLDER UNTUK MENU TAHAP SELANJUTNYA
 */
function showUnderDevelopment(menuName) {
  alert(`Menu [${menuName}] akan dikembangkan pada tahap selanjutnya.`);
}
