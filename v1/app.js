/**
 * ============================================================
 * DAPODIK MUHFIKRA - APLIKASI WEB AKADEMIK
 * File: app.js
 * ============================================================
 */

/**
 * 1. VARIABEL GLOBAL & STATE KONTROL EXIT
 */
let exitAppPending = false;
let exitTimeout = null;

/**
 * 2. DATA SISWA DUMMY (TAHAP 1)
 * Format objek JSON ini siap digantikan dari response Google Apps Script (GAS)
 */
const DATA_SISWA_DUMMY = [
  {
    nis: '21220701',
    nisn: '0081234561',
    nama: 'Ahmad Faiz Al-Ghifari',
    kelas: 'VII-A',
    ttl: 'Surabaya, 12 Mei 2011',
    ibu: 'Siti Aminah',
    alamat: 'Jl. Melati No. 14, RT 02/RW 03, Sukolilo'
  },
  {
    nis: '21220702',
    nisn: '0081234562',
    nama: 'Aisyah Putri Azzahra',
    kelas: 'VII-A',
    ttl: 'Malang, 23 Agustus 2011',
    ibu: 'Nurul Hidayati',
    alamat: 'Perumahan Griya Indah Blok C-5'
  },
  {
    nis: '21220703',
    nisn: '0081234563',
    nama: 'Bagas Pratama Wicaksono',
    kelas: 'VII-B',
    ttl: 'Sidoarjo, 04 Januari 2011',
    ibu: 'Endang Sulastri',
    alamat: 'Desa Karangploso RT 01/RW 01'
  },
  {
    nis: '20210801',
    nisn: '0071234564',
    nama: 'Fatimah Zahra Rahmawati',
    kelas: 'VIII-A',
    ttl: 'Gresik, 19 Oktober 2010',
    ibu: 'Rina Wahyuni',
    alamat: 'Jl. KH. Agus Salim No. 88'
  },
  {
    nis: '20210802',
    nisn: '0071234565',
    nama: 'Muhammad Rizky Ramadhan',
    kelas: 'VIII-B',
    ttl: 'Surabaya, 01 September 2010',
    ibu: 'Dewi Kartika',
    alamat: 'Dukuh Kupang Timur Gg. 6 No. 2'
  },
  {
    nis: '19200901',
    nisn: '0061234566',
    nama: 'Zaskia Nur Azizah',
    kelas: 'IX-A',
    ttl: 'Mojokerto, 15 Juli 2009',
    ibu: 'Tri Wahyuningrum',
    alamat: 'Jl. Pahlawan Kusuma Bangsa No. 45'
  }
];

/**
 * 3. INISIALISASI HALAMAN PERTAMA KALI
 */
document.addEventListener('DOMContentLoaded', () => {
  // Set riwayat awal browser ke level 1 (Dashboard)
  history.replaceState({ page: 'dashboard' }, 'Dashboard', '');
  
  // Render data tabel layar & tabel print
  renderTableScreen(DATA_SISWA_DUMMY);
  renderTablePrint(DATA_SISWA_DUMMY);
});

/**
 * 4. FUNGSI NAVIGASI PINDAH HALAMAN (LEVEL 2)
 * @param {string} pageName - Nama section/halaman tujuan
 */
function goToPage(pageName) {
  history.pushState({ page: pageName }, pageName, '');
  applyViewState({ page: pageName });
}

/**
 * 5. BUKA MODAL DETAIL BIODATA SISWA (LEVEL 3)
 * @param {string} nisn - Nomor Induk Siswa Nasional yang dipilih
 */
function openModalDetail(nisn) {
  const siswa = DATA_SISWA_DUMMY.find(s => s.nisn === nisn);
  if (!siswa) return;

  // Masukkan data siswa ke elemen modal
  document.getElementById('det-nama').innerText = siswa.nama;
  document.getElementById('det-nis').innerText = siswa.nis;
  document.getElementById('det-nisn').innerText = siswa.nisn;
  document.getElementById('det-kelas').innerText = siswa.kelas;
  document.getElementById('det-ttl').innerText = siswa.ttl;
  document.getElementById('det-ibu').innerText = siswa.ibu;
  document.getElementById('det-alamat').innerText = siswa.alamat;

  // Daftarkan riwayat Level 3 di browser
  history.pushState({ page: 'siswa_detail', nisn: nisn }, 'Detail Siswa', '');
  applyViewState({ page: 'siswa_detail', nisn: nisn });
}

/**
 * 6. ENGINE UTAMA PENGATUR STATE TAMPILAN VIEW
 * Menjaga sinkronisasi visual terhadap riwayat history browser
 * @param {object} state - Objek history state saat ini
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

  // KONDISI LEVEL 3: Modal Detail Siswa Terbuka
  if (page === 'siswa_detail') {
    viewDashboard.classList.add('hidden');
    viewSiswa.classList.remove('hidden');
    btnBack.classList.remove('hidden');
    
    headerTitle.innerText = "Detail Siswa";
    headerSubtitle.innerText = "Dapodik Muhfikra";

    // Efek Slide-Up Modal
    modal.classList.remove('opacity-0', 'pointer-events-none');
    modal.classList.add('opacity-100');
    modalContent.classList.remove('translate-y-full', 'md:scale-95');
    modalContent.classList.add('translate-y-0', 'md:scale-100');
    return;
  }

  // Tutup Modal jika kembali ke level di bawahnya
  modalContent.classList.remove('translate-y-0', 'md:scale-100');
  modalContent.classList.add('translate-y-full', 'md:scale-95');
  modal.classList.remove('opacity-100');
  modal.classList.add('opacity-0', 'pointer-events-none');

  // KONDISI LEVEL 2: Section Data Siswa
  if (page === 'siswa') {
    viewDashboard.classList.add('hidden');
    viewSiswa.classList.remove('hidden');
    btnBack.classList.remove('hidden');

    headerTitle.innerText = "Data Siswa";
    headerSubtitle.innerText = "Dapodik Muhfikra";
    return;
  }

  // KONDISI LEVEL 1: Dashboard Utama
  if (page === 'dashboard') {
    viewSiswa.classList.add('hidden');
    viewDashboard.classList.remove('hidden');
    btnBack.classList.add('hidden');

    headerTitle.innerText = "DAPODIK MUHFIKRA";
    headerSubtitle.innerText = "Sistem Informasi Akademik";
  }
}

/**
 * 7. PENANGANAN GESTURE/TOMBOL BACK PADA BROWSER / HP (POPSTATE)
 */
window.addEventListener('popstate', (event) => {
  const state = event.state;

  // Jika kembali ke Dashboard Utama (Level 1)
  if (!state || state.page === 'dashboard') {
    applyViewState({ page: 'dashboard' });

    // Proteksi double-back sebelum menutup tab browser
    if (!exitAppPending) {
      exitAppPending = true;
      showExitToast();
      
      // Dorong kembali state agar tetap di dashboard
      history.pushState({ page: 'dashboard' }, 'Dashboard', '');

      clearTimeout(exitTimeout);
      exitTimeout = setTimeout(() => {
        exitAppPending = false;
      }, 2500);
    } else {
      history.back();
    }
  } else {
    // Jalankan navigasi stack Level 2 / Level 3
    applyViewState(state);
  }
});

/**
 * 8. MENAMPILKAN TOAST PESAN KONFIRMASI KELUAR
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
 * 9. RENDER DATA KE TABEL TAMPILAN LAYAR (RINGKAS)
 * @param {Array} dataList - List data siswa
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
      <td class="py-3.5 px-3 font-mono text-xs md:text-sm text-slate-600">${siswa.nisn}</td>
      <td class="py-3.5 px-3">
        <button onclick="openModalDetail('${siswa.nisn}')" class="text-left font-bold text-brand-green hover:underline focus:outline-none text-base md:text-lg block">
          ${siswa.nama}
        </button>
      </td>
      <td class="py-3.5 px-3 text-center">
        <span class="inline-block bg-slate-200 text-slate-800 text-xs md:text-sm font-bold px-2.5 py-1 rounded-lg">
          ${siswa.kelas}
        </span>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

/**
 * 10. RENDER DATA KE TABEL CETAK PDF LANDSCAPE (LENGKAP)
 * @param {Array} dataList - List data siswa
 */
function renderTablePrint(dataList) {
  const tbodyPrint = document.getElementById('tbody-print-siswa');
  tbodyPrint.innerHTML = '';

  dataList.forEach((siswa, index) => {
    const tr = document.createElement('tr');
    tr.className = index % 2 === 0 ? "bg-white" : "bg-gray-50";

    tr.innerHTML = `
      <td class="border border-black p-1.5 text-center font-bold">${index + 1}</td>
      <td class="border border-black p-1.5 text-center font-mono">${siswa.nis}</td>
      <td class="border border-black p-1.5 text-center font-mono">${siswa.nisn}</td>
      <td class="border border-black p-1.5 font-bold">${siswa.nama}</td>
      <td class="border border-black p-1.5 text-center font-semibold">${siswa.kelas}</td>
      <td class="border border-black p-1.5">${siswa.ttl}</td>
      <td class="border border-black p-1.5">${siswa.ibu}</td>
      <td class="border border-black p-1.5 leading-snug">${siswa.alamat}</td>
    `;
    tbodyPrint.appendChild(tr);
  });
}

/**
 * 11. FILTER DATA BERDASARKAN KELAS
 */
function filterDataSiswa() {
  const selectedClass = document.getElementById('filter-kelas').value;
  const btnCetakText = document.getElementById('btn-cetak-text');
  const printFilterInfo = document.getElementById('print-filter-info');

  let filtered = DATA_SISWA_DUMMY;
  if (selectedClass !== 'ALL') {
    filtered = DATA_SISWA_DUMMY.filter(s => s.kelas === selectedClass);
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
 * 13. PLACEHOLDER UNTUK MENU YANG MASIH DALAM PENGEMBANGAN
 * @param {string} menuName - Nama menu yang diklik
 */
function showUnderDevelopment(menuName) {
  alert(`Menu [${menuName}] akan dikembangkan pada tahap selanjutnya.`);
}

/**
 * 14. INTEGRASI GOOGLE APPS SCRIPT (GAS)
 * Fungsi ini dipersiapkan untuk menarik data live dari Google Sheet via Apps Script Web App URL
 */
async function loadDataFromGAS() {
  const GAS_WEB_APP_URL = "URL_GOOGLE_APPS_SCRIPT_ANDA_DISINI";
  try {
    /*
    const response = await fetch(GAS_WEB_APP_URL);
    const result = await response.json();
    renderTableScreen(result.data);
    renderTablePrint(result.data);
    */
    console.log("Endpoint GAS siap dihubungkan.");
  } catch (error) {
    console.error("Gagal memuat data dari Google Apps Script:", error);
  }
}