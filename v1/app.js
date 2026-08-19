/**
 * ============================================================
 * DAPODIK MUHFIKRA - TAHAP 1 (DATA SISWA) & TAHAP 4 (RAPOT FLOW)
 * File: app.js
 * ============================================================
 */

const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxXWxCZ1TnX6oxk-Vx5d7ouIZ3tbxJojHclmEVzHLp_A9_YixKPqqj9TL3OyGj89oysfw/exec";
const STORAGE_KEY_SISWA = "DAPODIK_SISWA_CACHE";
const STORAGE_KEY_NILAI = "DAPODIK_NILAI_INPUT_CACHE";

// Data Master Siswa
let DATA_SISWA = [];

// Data Master Guru & Mapel yang Diampu (1 File Spreadsheet per Guru, Multi-Sheet Mapel)
const DATA_GURU_MAPEL = [
  {
    id: "G1",
    nama: "Hendra Gunawan, S.Kom",
    nip: "198705122011011003",
    mapel: [
      { id: "M1", namaMapel: "Dasar-Dasar TJKT", sheetName: "2026/2027 Dasar TJKT", kelasTarget: ["VII-A", "VII-B", "X-TJKT-1"] },
      { id: "M2", namaMapel: "Administrasi Jaringan Komputer", sheetName: "2026/2027 Jaringan Komputer", kelasTarget: ["VIII-A", "VIII-B", "XI-TJKT-2"] }
    ]
  },
  {
    id: "G2",
    nama: "Sri Wahyuni, S.Pd",
    nip: "199103242019022005",
    mapel: [
      { id: "M3", namaMapel: "Pemasaran & Bisnis Digital", sheetName: "2026/2027 BISNIS DIGITAL", kelasTarget: ["VII-A", "VIII-A", "IX-A"] },
      { id: "M4", namaMapel: "Ekonomi Bisnis", sheetName: "2026/2027 EKONOMI BISNIS", kelasTarget: ["VIII-A", "VIII-B"] }
    ]
  },
  {
    id: "G3",
    nama: "Ahmad Fauzi, M.Pd",
    nip: "198508172010011012",
    mapel: [
      { id: "M5", namaMapel: "Matematika Kejuruan", sheetName: "2026/2027 MATEMATIKA", kelasTarget: ["VII-A", "VII-B", "VIII-A", "VIII-B", "IX-A"] }
    ]
  }
];

// State Penilaian Aktif
let activeGuru = null;
let activeMapel = null;
let DB_NILAI_STORE = {}; // Menyimpan skor input: key = `${guruId}_${mapelId}_${tapel}_${kelas}_${jenis}`

// Kontrol Double-Back
let exitAppPending = false;
let exitTimeout = null;

/**
 * 1. INISIALISASI
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

  // Muat cache nilai input
  const cachedNilai = localStorage.getItem(STORAGE_KEY_NILAI);
  if (cachedNilai) {
    try {
      DB_NILAI_STORE = JSON.parse(cachedNilai);
    } catch (e) {}
  }

  // Render cardboard daftar guru
  renderGuruCards();

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
 * 3. ALUR RAPOT TAHAP 4: LANGKAH 1 (PILIH GURU)
 */
function renderGuruCards() {
  const container = document.getElementById('grid-guru-cards');
  if (!container) return;
  container.innerHTML = '';

  DATA_GURU_MAPEL.forEach(guru => {
    const card = document.createElement('div');
    card.className = "bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm hover:border-brand-red transition-all cursor-pointer active:scale-95 flex items-center justify-between";
    card.onclick = () => selectGuru(guru.id);

    card.innerHTML = `
      <div class="flex items-center gap-3.5">
        <div class="w-12 h-12 rounded-2xl bg-red-50 text-brand-red flex items-center justify-center text-2xl font-bold">
          <i class="ph-fill ph-chalkboard-teacher"></i>
        </div>
        <div>
          <h4 class="font-bold text-base text-slate-900 leading-snug">${guru.nama}</h4>
          <p class="text-xs text-slate-500 mt-0.5">NIP: ${guru.nip}</p>
          <span class="inline-block bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded mt-1">
            ${guru.mapel.length} Mata Pelajaran
          </span>
        </div>
      </div>
      <i class="ph-bold ph-caret-right text-slate-400 text-xl"></i>
    `;
    container.appendChild(card);
  });
}

function selectGuru(guruId) {
  const guru = DATA_GURU_MAPEL.find(g => g.id === guruId);
  if (!guru) return;

  activeGuru = guru;
  document.getElementById('label-guru-terpilih').innerText = guru.nama;

  renderMapelCards(guru);

  history.pushState({ page: 'rapot_mapel', guruId: guruId }, 'Pilih Mapel', '');
  applyViewState({ page: 'rapot_mapel', guruId: guruId });
}

/**
 * 4. ALUR RAPOT TAHAP 4: LANGKAH 2 (PILIH MAPEL)
 */
function renderMapelCards(guru) {
  const container = document.getElementById('list-mapel-cards');
  if (!container) return;
  container.innerHTML = '';

  guru.mapel.forEach(m => {
    const card = document.createElement('div');
    card.className = "bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:border-brand-green transition-all cursor-pointer active:scale-95 flex items-center justify-between";
    card.onclick = () => selectMapel(m.id);

    card.innerHTML = `
      <div class="flex items-center gap-3">
        <div class="w-11 h-11 rounded-xl bg-brand-greenLight text-brand-green flex items-center justify-center text-2xl font-bold">
          <i class="ph-fill ph-book-bookmark"></i>
        </div>
        <div>
          <h4 class="font-bold text-base text-slate-900">${m.namaMapel}</h4>
          <p class="text-xs font-mono text-emerald-700 font-medium mt-0.5">Sheet: ${m.sheetName}</p>
        </div>
      </div>
      <i class="ph-bold ph-caret-right text-slate-400 text-xl"></i>
    `;
    container.appendChild(card);
  });
}

function selectMapel(mapelId) {
  if (!activeGuru) return;
  const mapel = activeGuru.mapel.find(m => m.id === mapelId);
  if (!mapel) return;

  activeMapel = mapel;

  document.getElementById('badge-mapel-nama').innerText = mapel.namaMapel;
  document.getElementById('label-input-guru-mapel').innerText = `${activeGuru.nama} (${mapel.sheetName})`;

  populateSelectKelasInput();
  renderTabelInputNilai();

  history.pushState({ page: 'rapot_input', mapelId: mapelId }, 'Input Nilai', '');
  applyViewState({ page: 'rapot_input', mapelId: mapelId });
}

/**
 * 5. ALUR RAPOT TAHAP 4: LANGKAH 3 (FORM INPUT NILAI SISWA)
 */
function populateSelectKelasInput() {
  const select = document.getElementById('select-rapot-kelas');
  if (!select) return;

  // Ambil kelas unik dari Data Siswa
  const kelasSiswa = [...new Set(DATA_SISWA.map(s => s.kelas).filter(k => k))].sort();
  const optionsKelas = kelasSiswa.length > 0 ? kelasSiswa : ["VII-A", "VII-B", "VIII-A", "VIII-B", "IX-A"];

  select.innerHTML = '';
  optionsKelas.forEach((kls, idx) => {
    const opt = document.createElement('option');
    opt.value = kls;
    opt.innerText = `Kelas ${kls}`;
    if (idx === 0) opt.selected = true;
    select.appendChild(opt);
  });
}

function handleKelasNilaiChange() {
  renderTabelInputNilai();
}

function handleJenisNilaiChange() {
  renderTabelInputNilai();
}

function getNilaiStoreKey() {
  const tapel = document.getElementById('input-tapel').value;
  const kelas = document.getElementById('select-rapot-kelas').value;
  const jenis = document.getElementById('select-rapot-jenis').value;
  return `${activeGuru.id}_${activeMapel.id}_${tapel}_${kelas}_${jenis}`;
}

function renderTabelInputNilai() {
  const tbody = document.getElementById('tbody-input-nilai');
  const emptyState = document.getElementById('empty-state-input');
  const kelasTerpilih = document.getElementById('select-rapot-kelas').value;
  const storeKey = getNilaiStoreKey();
  const savedScores = DB_NILAI_STORE[storeKey] || {};

  tbody.innerHTML = '';

  // Filter siswa berdasarkan kelas terpilih
  const siswaList = DATA_SISWA.filter(s => s.kelas === kelasTerpilih);

  if (siswaList.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');

  siswaList.forEach((siswa, index) => {
    const nilaiAwal = savedScores[siswa.nisn] !== undefined ? savedScores[siswa.nisn] : '';
    const tr = document.createElement('tr');
    tr.className = "hover:bg-slate-50 transition-colors border-b border-slate-100";

    tr.innerHTML = `
      <td class="py-3 px-2 text-center font-bold text-slate-500">${index + 1}</td>
      <td class="py-3 px-3">
        <span class="font-bold text-slate-900 text-sm md:text-base block">${siswa.nama}</span>
        <span class="text-xs font-mono text-slate-500">NISN: ${siswa.nisn}</span>
      </td>
      <td class="py-3 px-2 text-center">
        <input type="number" min="0" max="100" 
          id="input-score-${siswa.nisn}" 
          value="${nilaiAwal}" 
          placeholder="0"
          class="w-20 text-center font-bold text-base py-2 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-brand-green focus:bg-emerald-50 transition-all bg-white"
        />
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function simpanNilaiKeState() {
  const kelasTerpilih = document.getElementById('select-rapot-kelas').value;
  const siswaList = DATA_SISWA.filter(s => s.kelas === kelasTerpilih);
  const storeKey = getNilaiStoreKey();

  if (!DB_NILAI_STORE[storeKey]) {
    DB_NILAI_STORE[storeKey] = {};
  }

  siswaList.forEach(siswa => {
    const inputEl = document.getElementById(`input-score-${siswa.nisn}`);
    if (inputEl) {
      const val = inputEl.value.trim();
      DB_NILAI_STORE[storeKey][siswa.nisn] = val !== '' ? Number(val) : '';
    }
  });

  localStorage.setItem(STORAGE_KEY_NILAI, JSON.stringify(DB_NILAI_STORE));
  alert(`Berhasil menyimpan nilai untuk kelas ${kelasTerpilih}!`);
}

/**
 * 6. EXPORT EXCEL & PDF FORM INPUT NILAI
 */
function downloadExcelRapotInput() {
  const tapel = document.getElementById('input-tapel').value;
  const kelas = document.getElementById('select-rapot-kelas').value;
  const jenis = document.getElementById('select-rapot-jenis').value;
  const storeKey = getNilaiStoreKey();
  const savedScores = DB_NILAI_STORE[storeKey] || {};

  const siswaList = DATA_SISWA.filter(s => s.kelas === kelas);

  if (siswaList.length === 0) {
    alert("Tidak ada data siswa untuk kelas ini.");
    return;
  }

  const exportRows = siswaList.map((s, idx) => {
    const score = savedScores[s.nisn] !== undefined ? savedScores[s.nisn] : '';
    return {
      "No": idx + 1,
      "Tahun Pelajaran": tapel,
      "Guru Pengampu": activeGuru.nama,
      "Mata Pelajaran": activeMapel.namaMapel,
      "Jenis Nilai": jenis,
      "Kelas": s.kelas,
      "NISN": s.nisn,
      "Nama Siswa": s.nama,
      "Nilai": score,
      "Status KKM (75)": score !== '' ? (Number(score) >= 75 ? "Tuntas" : "Belum Tuntas") : "Belum Dinilai"
    };
  });

  const ws = XLSX.utils.json_to_sheet(exportRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `${kelas}_${jenis}`);

  const fileName = `Nilai_${activeMapel.namaMapel}_${kelas}_${jenis}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

function cetakPDFRapotInput() {
  const tapel = document.getElementById('input-tapel').value;
  const kelas = document.getElementById('select-rapot-kelas').value;
  const jenis = document.getElementById('select-rapot-jenis').value;
  const storeKey = getNilaiStoreKey();
  const savedScores = DB_NILAI_STORE[storeKey] || {};

  const siswaList = DATA_SISWA.filter(s => s.kelas === kelas);
  const tbodyPrint = document.getElementById('tbody-print-input-nilai');
  tbodyPrint.innerHTML = '';

  document.getElementById('print-input-subtitle').innerText = `Tahun Pelajaran: ${tapel} | Mapel: ${activeMapel.namaMapel} | Guru: ${activeGuru.nama}`;
  document.getElementById('print-input-filter-info').innerText = `Kelas: ${kelas} | Jenis Nilai: ${jenis}`;
  document.getElementById('print-input-sign-name').innerText = `( ${activeGuru.nama} )`;

  const now = new Date();
  document.getElementById('print-input-date-info').innerText = `Waktu Cetak: ${now.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
  document.getElementById('print-input-sign-date').innerText = `Dicetak, ${now.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}`;

  let scoresOnly = [];

  siswaList.forEach((s, idx) => {
    const val = savedScores[s.nisn];
    const scoreText = val !== undefined && val !== '' ? val : '-';
    if (val !== undefined && val !== '') scoresOnly.push(Number(val));

    const isTuntas = val !== undefined && val !== '' && Number(val) >= 75;
    const tr = document.createElement('tr');
    tr.className = idx % 2 === 0 ? "bg-white" : "bg-gray-50";

    tr.innerHTML = `
      <td class="border border-black p-1.5 text-center font-bold">${idx + 1}</td>
      <td class="border border-black p-1.5 text-center font-mono">${s.nis || '-'}</td>
      <td class="border border-black p-1.5 font-bold">${s.nama}</td>
      <td class="border border-black p-1.5 text-center font-semibold">${s.kelas}</td>
      <td class="border border-black p-1.5 text-center font-bold">${scoreText}</td>
      <td class="border border-black p-1.5 text-center font-semibold ${isTuntas ? 'text-black' : 'text-red-600'}">${scoreText !== '-' ? (isTuntas ? 'Tuntas' : 'Remedial') : '-'}</td>
    `;
    tbodyPrint.appendChild(tr);
  });

  const avg = scoresOnly.length > 0 ? (scoresOnly.reduce((a, b) => a + b, 0) / scoresOnly.length).toFixed(1) : 0;
  document.getElementById('print-input-stat-summary').innerText = `Total Siswa: ${siswaList.length} | Rata-rata Nilai: ${avg}`;

  // Tampilkan hanya area print input rapot
  document.getElementById('print-section-rapot-input').classList.remove('hidden');
  document.getElementById('print-section-siswa').classList.add('hidden');

  window.print();
}

/**
 * 7. LOGIKA DATA SISWA (TAHAP 1)
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
  document.getElementById('print-section-rapot-input').classList.add('hidden');

  window.print();
}

/**
 * 8. NAVIGASI STACK VIEW & POPSTATE
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

  // Halaman 1: Data Siswa
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
    headerSubtitle.innerText = activeGuru ? activeGuru.nama : "Rapot";
    return;
  }

  // Rapot Level 3: Form Input Nilai Siswa
  if (page === 'rapot_input') {
    viewRapotInput.classList.remove('hidden');
    headerTitle.innerText = "Input Nilai";
    headerSubtitle.innerText = activeMapel ? activeMapel.namaMapel : "Rapot";
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
