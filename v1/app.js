/**
 * ============================================================
 * DAPODIK MUHFIKRA - CORE ENGINE & DATA SISWA (TAHAP 1)
 * File: app.js
 * ============================================================
 */

const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxXWxCZ1TnX6oxk-Vx5d7ouIZ3tbxJojHclmEVzHLp_A9_YixKPqqj9TL3OyGj89oysfw/exec";
const STORAGE_KEY_SISWA = "DAPODIK_SISWA_CACHE";

// Data Master Siswa
let DATA_SISWA = [];

// Kontrol Double-Back
let exitAppPending = false;
let exitTimeout = null;

/**
 * 1. INISIALISASI UTAMA
 */
document.addEventListener('DOMContentLoaded', () => {
  history.replaceState({ page: 'dashboard' }, 'Dashboard', '');

  // Muat cache data siswa
  const cachedSiswa = localStorage.getItem(STORAGE_KEY_SISWA);
  if (cachedSiswa) {
    try {
      DATA_SISWA = JSON.parse(cachedSiswa);
      populateClassFilter(DATA_SISWA);
      renderTableScreen(DATA_SISWA);
      renderTablePrint(DATA_SISWA);
    } catch (e) {
      console.warn("Cache siswa rusak:", e);
    }
  }

  // Sinkronkan data siswa dari Google Sheet
  fetchDataFromGAS(false);
});

/**
 * 2. AMBIL DATA SISWA DARI GAS
 */
async function fetchDataFromGAS(isManualRefresh = false) {
  const tbodyScreen = document.getElementById('tbody-siswa');

  if (DATA_SISWA.length === 0 || isManualRefresh) {
    if (tbodyScreen) {
      tbodyScreen.innerHTML = `
        <tr>
          <td colspan="4" class="py-10 text-center text-slate-500 font-semibold">
            <i class="ph-bold ph-spinner animate-spin text-3xl mb-2 text-brand-green inline-block"></i>
            <p class="text-sm md:text-base font-medium">Menyinkronkan data Google Sheets...</p>
          </td>
        </tr>
      `;
    }
  }

  try {
    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'GET',
      redirect: 'follow'
    });

    if (!response.ok) throw new Error(`HTTP Status: ${response.status}`);

    const result = await response.json();

    if (result.status === "success") {
      DATA_SISWA = result.data;
      localStorage.setItem(STORAGE_KEY_SISWA, JSON.stringify(DATA_SISWA));

      populateClassFilter(DATA_SISWA);
      filterDataSiswa();
    }
  } catch (error) {
    console.error("Fetch GAS Error:", error);
    if (DATA_SISWA.length === 0 && tbodyScreen) {
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
}

/**
 * 3. LOGIKA DATA SISWA (TAHAP 1)
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
    if (btnPdfText) btnPdfText.innerText = `Download PDF`;
    if (btnExcelText) btnExcelText.innerText = `Download Excel`;
    if (printFilterInfo) printFilterInfo.innerText = `Filter: Semua Siswa`;
  }

  renderTableScreen(filtered);
  renderTablePrint(filtered);
}

function renderTableScreen(dataList) {
  const tbody = document.getElementById('tbody-siswa');
  const emptyState = document.getElementById('empty-state');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (!dataList || dataList.length === 0) {
    if (emptyState) emptyState.classList.remove('hidden');
    return;
  }

  if (emptyState) emptyState.classList.add('hidden');

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

function renderTablePrint(dataList) {
  const tbodyPrint = document.getElementById('tbody-print-siswa');
  if (!tbodyPrint) return;
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

function downloadExcelSiswa() {
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

  const ws = XLSX.utils.json_to_sheet(excelData);
  const wb = XLSX.utils.book_new();
  const sheetTitle = selectedClass === 'ALL' ? 'DATA_SISWA' : selectedClass;
  
  XLSX.utils.book_append_sheet(wb, ws, sheetTitle);
  XLSX.writeFile(wb, fileName);
}

/**
 * Fungsi Cetak PDF Data Siswa
 */
function cetakPDFSiswa() {
  const filterElement = document.getElementById('filter-kelas');
  const selectedClass = filterElement ? filterElement.value : 'ALL';

  // Pastikan tabel cetak sudah ter-render dengan data terbaru
  let filtered = DATA_SISWA;
  if (selectedClass !== 'ALL') {
    filtered = DATA_SISWA.filter(s => s.kelas === selectedClass);
    document.getElementById('print-filter-info').innerText = `Filter: Kelas ${selectedClass}`;
  } else {
    document.getElementById('print-filter-info').innerText = `Filter: Semua Siswa`;
  }
  renderTablePrint(filtered);

  const now = new Date();
  const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  const formattedDate = now.toLocaleDateString('id-ID', options);
  
  document.getElementById('print-date-info').innerText = `Waktu Cetak: ${formattedDate}`;
  document.getElementById('print-sign-date').innerText = `Dicetak, ${now.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}`;

  // Buka dialog cetak browser
  window.print();
}

/**
 * 4. NAVIGASI STACK VIEW & POPSTATE
 */
function goToPage(pageName) {
  history.pushState({ page: pageName }, pageName, '');
  applyViewState({ page: pageName });
}

function applyViewState(state) {
  const viewDashboard = document.getElementById('view-dashboard');
  const viewSiswa = document.getElementById('view-siswa');
  const viewRapotGuru = document.getElementById('view-rapot-guru');
  const viewRapotMapel = document.getElementById('view-rapot-mapel');
  const viewRapotInput = document.getElementById('view-rapot-input');

  const btnBack = document.getElementById('btn-header-back');
  const headerTitle = document.getElementById('header-title');
  const headerSubtitle = document.getElementById('header-subtitle');

  const modalSiswa = document.getElementById('modal-detail');
  const modalSiswaContent = document.getElementById('modal-content');

  const page = state ? state.page : 'dashboard';

  // Sembunyikan semua section utama terlebih dahulu
  viewDashboard.classList.add('hidden');
  viewSiswa.classList.add('hidden');
  viewRapotGuru.classList.add('hidden');
  viewRapotMapel.classList.add('hidden');
  viewRapotInput.classList.add('hidden');
  btnBack.classList.remove('hidden');

  // Modal Siswa Detail
  if (page === 'siswa_detail') {
    viewSiswa.classList.remove('hidden');
    modalSiswa.classList.remove('opacity-0', 'pointer-events-none');
    modalSiswa.classList.add('opacity-100');
    modalSiswaContent.classList.remove('translate-y-full', 'md:scale-95');
    modalSiswaContent.classList.add('translate-y-0', 'md:scale-100');
    return;
  }
  modalSiswaContent.classList.remove('translate-y-0', 'md:scale-100');
  modalSiswaContent.classList.add('translate-y-full', 'md:scale-95');
  modalSiswa.classList.remove('opacity-100');
  modalSiswa.classList.add('opacity-0', 'pointer-events-none');

  // Halaman: Data Siswa
  if (page === 'siswa') {
    viewSiswa.classList.remove('hidden');
    headerTitle.innerText = "Data Siswa";
    headerSubtitle.innerText = "Dapodik Muhfikra";
    return;
  }

  // Rapot Level 1: Pilih Guru
  if (page === 'rapot_guru') {
    viewRapotGuru.classList.remove('hidden');
    headerTitle.innerText = "Pilih Guru";
    headerSubtitle.innerText = "Rapot & Nilai";
    return;
  }

  // Rapot Level 2: Pilih Mapel
  if (page === 'rapot_mapel') {
    viewRapotMapel.classList.remove('hidden');
    headerTitle.innerText = "Mata Pelajaran";
    headerSubtitle.innerText = (typeof activeGuru !== 'undefined' && activeGuru) ? activeGuru.nama : "Rapot";
    return;
  }

  // Rapot Level 3: Form Input Nilai Siswa
  if (page === 'rapot_input') {
    viewRapotInput.classList.remove('hidden');
    headerTitle.innerText = "Input Nilai";
    headerSubtitle.innerText = (typeof activeMapel !== 'undefined' && activeMapel) ? activeMapel.namaMapel : "Rapot";
    return;
  }

  // Default: Dashboard Utama
  if (page === 'dashboard') {
    viewDashboard.classList.remove('hidden');
    btnBack.classList.add('hidden');
    headerTitle.innerText = "DAPODIK MUHFIKRA";
    headerSubtitle.innerText = "Sistem Informasi Akademik";
  }
}

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

function showExitToast() {
  const toast = document.getElementById('toast-exit');
  toast.classList.remove('opacity-0', 'pointer-events-none');
  toast.classList.add('opacity-100');

  setTimeout(() => {
    toast.classList.remove('opacity-100');
    toast.classList.add('opacity-0', 'pointer-events-none');
  }, 2000);
}

function handleManualRefresh() {
  fetchDataFromGAS(true);
}

function showUnderDevelopment(menuName) {
  alert(`Menu [${menuName}] akan dikembangkan pada tahap selanjutnya.`);
}
