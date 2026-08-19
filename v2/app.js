/**
 * ============================================================
 * DAPODIK MUHFIKRA - TAHAP 1 (DATA SISWA) & TAHAP 4 (RAPOT)
 * File: app.js
 SUDAH ADA MENU RAPOT
 * ============================================================
 */

// URL Web App Google Apps Script Data Siswa
const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxXWxCZ1TnX6oxk-Vx5d7ouIZ3tbxJojHclmEVzHLp_A9_YixKPqqj9TL3OyGj89oysfw/exec";
const STORAGE_KEY_SISWA = "DAPODIK_SISWA_CACHE";
const STORAGE_KEY_RAPOT = "DAPODIK_RAPOT_CACHE";

// Penampung data master
let DATA_SISWA = [];
let DATA_RAPOT_MASTER = []; // Database rapot seluruh guru & sheet

// Variabel kontrol exit double-back di dashboard
let exitAppPending = false;
let exitTimeout = null;

/**
 * STRUKTUR DUMMY DATA RAPOT (TAHAP 4)
 * Meniru konsep: 1 File Spreadsheet per Guru, Multi-Sheet Rombel per File
 */
const DUMMY_RAPOT_DATABASE = [
  // Spreadsheet Guru: Bpk. Hendra Gunawan, S.Kom
  {
    guru: "Hendra Gunawan, S.Kom",
    sheet: "2026/2027 Dasar TJKT",
    data: [
      { id: "R1", jenis: "PTS Ganjil", nama: "Ahmad Faiz Al-Ghifari", kelas: "X-TJKT-1", mapel: "Dasar-Dasar TJKT", nilai: 88 },
      { id: "R2", jenis: "PTS Ganjil", nama: "Aisyah Putri Azzahra", kelas: "X-TJKT-1", mapel: "Dasar-Dasar TJKT", nilai: 92 },
      { id: "R3", jenis: "PTS Ganjil", nama: "Bagas Pratama Wicaksono", kelas: "X-TJKT-1", mapel: "Dasar-Dasar TJKT", nilai: 70 },
      { id: "R4", jenis: "SAS Ganjil", nama: "Ahmad Faiz Al-Ghifari", kelas: "X-TJKT-1", mapel: "Dasar-Dasar TJKT", nilai: 85 },
      { id: "R5", jenis: "SAS Ganjil", nama: "Aisyah Putri Azzahra", kelas: "X-TJKT-1", mapel: "Dasar-Dasar TJKT", nilai: 95 },
      { id: "R6", jenis: "SAS Ganjil", nama: "Bagas Pratama Wicaksono", kelas: "X-TJKT-1", mapel: "Dasar-Dasar TJKT", nilai: 78 },
      { id: "R7", jenis: "PTS Genap", nama: "Ahmad Faiz Al-Ghifari", kelas: "X-TJKT-1", mapel: "Dasar-Dasar TJKT", nilai: 90 },
      { id: "R8", jenis: "SAS Genap", nama: "Ahmad Faiz Al-Ghifari", kelas: "X-TJKT-1", mapel: "Dasar-Dasar TJKT", nilai: 91 }
    ]
  },
  {
    guru: "Hendra Gunawan, S.Kom",
    sheet: "2026/2027 Jaringan Komputer",
    data: [
      { id: "R9", jenis: "PTS Ganjil", nama: "Fatimah Zahra Rahmawati", kelas: "XI-TJKT-2", mapel: "Administrasi Jaringan", nilai: 84 },
      { id: "R10", jenis: "PTS Ganjil", nama: "Muhammad Rizky Ramadhan", kelas: "XI-TJKT-2", mapel: "Administrasi Jaringan", nilai: 68 },
      { id: "R11", jenis: "SAS Ganjil", nama: "Fatimah Zahra Rahmawati", kelas: "XI-TJKT-2", mapel: "Administrasi Jaringan", nilai: 88 },
      { id: "R12", jenis: "SAS Ganjil", nama: "Muhammad Rizky Ramadhan", kelas: "XI-TJKT-2", mapel: "Administrasi Jaringan", nilai: 76 }
    ]
  },
  // Spreadsheet Guru: Ibu Sri Wahyuni, S.Pd
  {
    guru: "Sri Wahyuni, S.Pd",
    sheet: "2026/2027 BISNIS DIGITAL",
    data: [
      { id: "R13", jenis: "PTS Ganjil", nama: "Zaskia Nur Azizah", kelas: "X-BD-1", mapel: "Pemasaran Digital", nilai: 94 },
      { id: "R14", jenis: "PTS Ganjil", nama: "Dimas Aditya Pratama", kelas: "X-BD-1", mapel: "Pemasaran Digital", nilai: 72 },
      { id: "R15", jenis: "SAS Ganjil", nama: "Zaskia Nur Azizah", kelas: "X-BD-1", mapel: "Pemasaran Digital", nilai: 96 },
      { id: "R16", jenis: "SAS Ganjil", nama: "Dimas Aditya Pratama", kelas: "X-BD-1", mapel: "Pemasaran Digital", nilai: 80 }
    ]
  }
];

/**
 * 1. INISIALISASI APLIKASI
 */
document.addEventListener('DOMContentLoaded', () => {
  history.replaceState({ page: 'dashboard' }, 'Dashboard', '');
  
  // 1. Muat Cache Data Siswa
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

  // 2. Inisialisasi Data Rapot
  DATA_RAPOT_MASTER = DUMMY_RAPOT_DATABASE;
  initRapotView();

  // 3. Sinkronkan Data Siswa dari GAS
  fetchDataFromGAS(false);
});

/**
 * 2. AMBIL DATA SISWA DARI GOOGLE APPS SCRIPT (GAS)
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
 * 3. LOGIKA MENU RAPOT / NILAI (TAHAP 4)
 */
function initRapotView() {
  const selectGuru = document.getElementById('filter-rapot-guru');
  if (!selectGuru) return;

  // Dapatkan daftar nama guru unik
  const guruList = [...new Set(DATA_RAPOT_MASTER.map(item => item.guru))];

  selectGuru.innerHTML = '';
  guruList.forEach((guru, idx) => {
    const opt = document.createElement('option');
    opt.value = guru;
    opt.innerText = guru;
    if (idx === 0) opt.selected = true;
    selectGuru.appendChild(opt);
  });

  handleGuruChange();
}

/**
 * Saat Guru dipilih, perbarui daftar Sheet Rombel
 */
function handleGuruChange() {
  const selectedGuru = document.getElementById('filter-rapot-guru').value;
  const selectSheet = document.getElementById('filter-rapot-sheet');
  if (!selectSheet) return;

  // Filter sheets milik guru terpilih
  const sheetsMilikoGuru = DATA_RAPOT_MASTER.filter(item => item.guru === selectedGuru);

  selectSheet.innerHTML = '<option value="ALL">Semua Sheet Rombel</option>';
  sheetsMilikoGuru.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item.sheet;
    opt.innerText = item.sheet;
    selectSheet.appendChild(opt);
  });

  // Perbarui juga pilihan kelas unik untuk guru ini
  populateRapotKelasFilter(sheetsMilikoGuru);
  filterDataRapot();
}

/**
 * Mengisi dropdown kelas khusus rapot
 */
function populateRapotKelasFilter(sheetsList) {
  const selectKelas = document.getElementById('filter-rapot-kelas');
  if (!selectKelas) return;

  let allRows = [];
  sheetsList.forEach(s => {
    allRows = allRows.concat(s.data);
  });

  const kelasList = [...new Set(allRows.map(r => r.kelas).filter(k => k))].sort();

  selectKelas.innerHTML = '<option value="ALL">Semua Kelas</option>';
  kelasList.forEach(kls => {
    const opt = document.createElement('option');
    opt.value = kls;
    opt.innerText = `Kelas ${kls}`;
    selectKelas.appendChild(opt);
  });
}

/**
 * Filter dan Render Tabel Rapot
 */
function filterDataRapot() {
  const selectedGuru = document.getElementById('filter-rapot-guru').value;
  const selectedSheet = document.getElementById('filter-rapot-sheet').value;
  const selectedJenis = document.getElementById('filter-rapot-jenis').value;
  const selectedKelas = document.getElementById('filter-rapot-kelas').value;

  // Kumpulkan baris nilai sesuai guru & sheet
  let filteredRows = [];
  const sheetsGuru = DATA_RAPOT_MASTER.filter(item => item.guru === selectedGuru);

  sheetsGuru.forEach(s => {
    if (selectedSheet === 'ALL' || s.sheet === selectedSheet) {
      s.data.forEach(row => {
        filteredRows.push({
          ...row,
          guru: s.guru,
          sheet: s.sheet
        });
      });
    }
  });

  // Filter jenis nilai
  if (selectedJenis !== 'ALL') {
    filteredRows = filteredRows.filter(r => r.jenis === selectedJenis);
  }

  // Filter kelas
  if (selectedKelas !== 'ALL') {
    filteredRows = filteredRows.filter(r => r.kelas === selectedKelas);
  }

  // Update Badge Count
  const badgeCount = document.getElementById('rapot-count-badge');
  if (badgeCount) badgeCount.innerText = `${filteredRows.length} Nilai`;

  // Update Statistik Nilai
  calculateRapotStats(filteredRows);

  // Render ke tabel layar & cetak
  renderTableRapotScreen(filteredRows);
  renderTableRapotPrint(filteredRows, selectedGuru, selectedSheet, selectedJenis, selectedKelas);
}

/**
 * Hitung Rata-Rata, Nilai Tertinggi, Nilai Terendah
 */
function calculateRapotStats(rows) {
  const avgEl = document.getElementById('stat-rapot-avg');
  const maxEl = document.getElementById('stat-rapot-max');
  const minEl = document.getElementById('stat-rapot-min');

  if (rows.length === 0) {
    avgEl.innerText = "0";
    maxEl.innerText = "0";
    minEl.innerText = "0";
    return;
  }

  const scores = rows.map(r => Number(r.nilai) || 0);
  const sum = scores.reduce((a, b) => a + b, 0);
  const avg = (sum / scores.length).toFixed(1);
  const max = Math.max(...scores);
  const min = Math.min(...scores);

  avgEl.innerText = avg;
  maxEl.innerText = max;
  minEl.innerText = min;
}

/**
 * Render Tabel Rapot di Layar HP / Komputer
 */
function renderTableRapotScreen(rows) {
  const tbody = document.getElementById('tbody-rapot');
  const emptyState = document.getElementById('empty-state-rapot');
  tbody.innerHTML = '';

  if (rows.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');

  rows.forEach((item, index) => {
    const isTuntas = item.nilai >= 75;
    const badgeColor = isTuntas ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700';

    const tr = document.createElement('tr');
    tr.className = "hover:bg-slate-50 transition-colors border-b border-slate-100 cursor-pointer";
    tr.onclick = () => openModalDetailRapot(item.id);

    tr.innerHTML = `
      <td class="py-3 px-2 text-center font-bold text-slate-500">${index + 1}</td>
      <td class="py-3 px-2.5">
        <span class="font-bold text-slate-900 text-sm md:text-base block leading-snug">${item.nama}</span>
        <span class="text-[11px] text-slate-500 font-medium block">${item.mapel} (${item.kelas})</span>
      </td>
      <td class="py-3 px-2 text-center">
        <span class="inline-block bg-slate-100 text-slate-700 text-[11px] font-bold px-2 py-0.5 rounded-md">
          ${item.jenis}
        </span>
      </td>
      <td class="py-3 px-2 text-center">
        <span class="inline-block ${badgeColor} text-xs md:text-sm font-extrabold px-2.5 py-1 rounded-lg">
          ${item.nilai}
        </span>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

/**
 * Render Tabel Dokumen Cetak Rapot Landscape
 */
function renderTableRapotPrint(rows, guru, sheet, jenis, kelas) {
  const tbodyPrint = document.getElementById('tbody-print-rapot');
  if (!tbodyPrint) return;
  tbodyPrint.innerHTML = '';

  document.getElementById('print-rapot-subtitle').innerText = `Guru Pengampu: ${guru} | Rombel: ${sheet}`;
  document.getElementById('print-rapot-filter-info').innerText = `Filter Jenis: ${jenis} | Kelas: ${kelas}`;
  document.getElementById('print-rapot-sign-name').innerText = `( ${guru} )`;

  const scores = rows.map(r => Number(r.nilai) || 0);
  const avg = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : 0;
  document.getElementById('print-rapot-stat-summary').innerText = `Total Nilai Siswa: ${rows.length} | Rata-rata Kelas: ${avg}`;

  rows.forEach((item, index) => {
    const isTuntas = item.nilai >= 75;
    const tr = document.createElement('tr');
    tr.className = index % 2 === 0 ? "bg-white" : "bg-gray-50";

    tr.innerHTML = `
      <td class="border border-black p-1.5 text-center font-bold">${index + 1}</td>
      <td class="border border-black p-1.5 text-center font-semibold">${item.jenis}</td>
      <td class="border border-black p-1.5 font-bold">${item.nama}</td>
      <td class="border border-black p-1.5 text-center font-semibold">${item.kelas}</td>
      <td class="border border-black p-1.5">${item.mapel}</td>
      <td class="border border-black p-1.5 text-center font-bold">${item.nilai}</td>
      <td class="border border-black p-1.5 text-center font-medium ${isTuntas ? 'text-black' : 'text-red-600 font-bold'}">${isTuntas ? 'Tuntas' : 'Remedial'}</td>
    `;
    tbodyPrint.appendChild(tr);
  });
}

/**
 * Buka Popup Modal Detail Nilai Rapot (Level 3)
 */
function openModalDetailRapot(id) {
  // Cari data nilai rapot berdasarkan ID
  let item = null;
  DATA_RAPOT_MASTER.forEach(g => {
    const found = g.data.find(d => d.id === id);
    if (found) {
      item = { ...found, guru: g.guru, sheet: g.sheet };
    }
  });

  if (!item) return;

  const isTuntas = item.nilai >= 75;
  const statusBadge = document.getElementById('det-rapot-status-badge');

  document.getElementById('det-rapot-nama').innerText = item.nama;
  document.getElementById('det-rapot-kelas').innerText = item.kelas;
  document.getElementById('det-rapot-jenis').innerText = item.jenis;
  document.getElementById('det-rapot-mapel').innerText = item.mapel;
  document.getElementById('det-rapot-nilai').innerText = item.nilai;
  document.getElementById('det-rapot-guru').innerText = `${item.guru} (${item.sheet})`;

  if (isTuntas) {
    statusBadge.innerText = "TUNTAS (Memenuhi KKM)";
    statusBadge.className = "inline-block px-3 py-1 rounded-full text-xs font-extrabold mt-1 bg-emerald-100 text-emerald-800";
  } else {
    statusBadge.innerText = "BELUM TUNTAS (Remedial)";
    statusBadge.className = "inline-block px-3 py-1 rounded-full text-xs font-extrabold mt-1 bg-red-100 text-red-700";
  }

  history.pushState({ page: 'rapot_detail', id: id }, 'Detail Rapot', '');
  applyViewState({ page: 'rapot_detail', id: id });
}

/**
 * Download Excel Nilai Rapot (.xlsx)
 */
function downloadExcelRapot() {
  const selectedGuru = document.getElementById('filter-rapot-guru').value;
  const selectedSheet = document.getElementById('filter-rapot-sheet').value;
  const selectedJenis = document.getElementById('filter-rapot-jenis').value;
  const selectedKelas = document.getElementById('filter-rapot-kelas').value;

  let rowsToExport = [];
  const sheetsGuru = DATA_RAPOT_MASTER.filter(item => item.guru === selectedGuru);

  sheetsGuru.forEach(s => {
    if (selectedSheet === 'ALL' || s.sheet === selectedSheet) {
      s.data.forEach(r => {
        if ((selectedJenis === 'ALL' || r.jenis === selectedJenis) && (selectedKelas === 'ALL' || r.kelas === selectedKelas)) {
          rowsToExport.push({
            "No": rowsToExport.length + 1,
            "Jenis Nilai": r.jenis,
            "Nama Siswa": r.nama,
            "Kelas": r.kelas,
            "Mata Pelajaran": r.mapel,
            "Nilai": r.nilai,
            "Status KKM (75)": r.nilai >= 75 ? "Tuntas" : "Belum Tuntas",
            "Guru Pengampu": s.guru,
            "Rombel / Sheet": s.sheet
          });
        }
      });
    }
  });

  if (rowsToExport.length === 0) {
    alert("Tidak ada data nilai rapot untuk di-export.");
    return;
  }

  const ws = XLSX.utils.json_to_sheet(rowsToExport);
  const wb = XLSX.utils.book_new();
  const safeSheetName = selectedSheet === 'ALL' ? 'Rekap Nilai' : selectedSheet.substring(0, 30);
  XLSX.utils.book_append_sheet(wb, ws, safeSheetName);

  const fileName = `Rapot_${selectedGuru.replace(/[^a-zA-Z0-9]/g, '_')}_${selectedSheet.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * Download / Cetak PDF Dokumen Rapot
 */
function cetakPDFRapot() {
  const now = new Date();
  const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  
  document.getElementById('print-rapot-date-info').innerText = `Waktu Cetak: ${now.toLocaleDateString('id-ID', options)}`;
  document.getElementById('print-rapot-sign-date').innerText = `Dicetak, ${now.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}`;

  // Tampilkan hanya area print rapot
  document.getElementById('print-section-rapot').classList.remove('hidden');
  document.getElementById('print-section-siswa').classList.add('hidden');

  window.print();
}

/**
 * 4. LOGIKA EXPORT & CETAK DATA SISWA (TAHAP 1)
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

function cetakPDFSiswa() {
  const now = new Date();
  const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  const formattedDate = now.toLocaleDateString('id-ID', options);
  
  document.getElementById('print-date-info').innerText = `Waktu Cetak: ${formattedDate}`;
  document.getElementById('print-sign-date').innerText = `Dicetak, ${now.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}`;

  document.getElementById('print-section-siswa').classList.remove('hidden');
  document.getElementById('print-section-rapot').classList.add('hidden');

  window.print();
}

/**
 * 5. NAVIGASI STACK & HISTORY BROWSER
 */
function goToPage(pageName) {
  history.pushState({ page: pageName }, pageName, '');
  applyViewState({ page: pageName });
}

function applyViewState(state) {
  const viewDashboard = document.getElementById('view-dashboard');
  const viewSiswa = document.getElementById('view-siswa');
  const viewRapot = document.getElementById('view-rapot');
  const btnBack = document.getElementById('btn-header-back');
  const headerTitle = document.getElementById('header-title');
  const headerSubtitle = document.getElementById('header-subtitle');

  const modalSiswa = document.getElementById('modal-detail');
  const modalSiswaContent = document.getElementById('modal-content');
  const modalRapot = document.getElementById('modal-detail-rapot');
  const modalRapotContent = document.getElementById('modal-content-rapot');

  const page = state ? state.page : 'dashboard';

  // Modal Level 3 (Siswa)
  if (page === 'siswa_detail') {
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

  // Modal Level 3 (Rapot)
  if (page === 'rapot_detail') {
    modalRapot.classList.remove('opacity-0', 'pointer-events-none');
    modalRapot.classList.add('opacity-100');
    modalRapotContent.classList.remove('translate-y-full', 'md:scale-95');
    modalRapotContent.classList.add('translate-y-0', 'md:scale-100');
    return;
  }
  modalRapotContent.classList.remove('translate-y-0', 'md:scale-100');
  modalRapotContent.classList.add('translate-y-full', 'md:scale-95');
  modalRapot.classList.remove('opacity-100');
  modalRapot.classList.add('opacity-0', 'pointer-events-none');

  // Level 2 (Data Siswa)
  if (page === 'siswa') {
    viewDashboard.classList.add('hidden');
    viewRapot.classList.add('hidden');
    viewSiswa.classList.remove('hidden');
    btnBack.classList.remove('hidden');

    headerTitle.innerText = "Data Siswa";
    headerSubtitle.innerText = "Dapodik Muhfikra";
    return;
  }

  // Level 2 (Rapot)
  if (page === 'rapot') {
    viewDashboard.classList.add('hidden');
    viewSiswa.classList.add('hidden');
    viewRapot.classList.remove('hidden');
    btnBack.classList.remove('hidden');

    headerTitle.innerText = "Rapot & Nilai";
    headerSubtitle.innerText = "Dapodik Muhfikra";
    return;
  }

  // Level 1 (Dashboard Utama)
  if (page === 'dashboard') {
    viewSiswa.classList.add('hidden');
    viewRapot.classList.add('hidden');
    viewDashboard.classList.remove('hidden');
    btnBack.classList.add('hidden');

    headerTitle.innerText = "DAPODIK MUHFIKRA";
    headerSubtitle.innerText = "Sistem Informasi Akademik";
  }
}

/**
 * Penanganan Tombol / Gesture Back
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
