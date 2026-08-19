/**
 * ============================================================
 * DAPODIK MUHFIKRA - MODUL RAPOT & PENILAIAN SISWA (TAHAP 4)
 * File: rapot.js
 * ============================================================
 */

const STORAGE_KEY_NILAI = "DAPODIK_NILAI_INPUT_CACHE";

// Data Master Guru & Mapel yang Diampu
const DATA_GURU_MAPEL = [
  {
    id: "G1",
    nama: "Hendra Gunawan, S.Kom",
    mapel: [
      { id: "M1", namaMapel: "Dasar-Dasar TJKT", sheetName: "2026/2027 Dasar TJKT", kelasTarget: ["VII-A", "VII-B", "X-TJKT-1"] },
      { id: "M2", namaMapel: "Administrasi Jaringan Komputer", sheetName: "2026/2027 Jaringan Komputer", kelasTarget: ["VIII-A", "VIII-B", "XI-TJKT-2"] }
    ]
  },
  {
    id: "G2",
    nama: "Sri Wahyuni, S.Pd",
    mapel: [
      { id: "M3", namaMapel: "Pemasaran & Bisnis Digital", sheetName: "2026/2027 BISNIS DIGITAL", kelasTarget: ["VII-A", "VIII-A", "IX-A"] },
      { id: "M4", namaMapel: "Ekonomi Bisnis", sheetName: "2026/2027 EKONOMI BISNIS", kelasTarget: ["VIII-A", "VIII-B"] }
    ]
  },
  {
    id: "G3",
    nama: "Ahmad Fauzi, M.Pd",
    mapel: [
      { id: "M5", namaMapel: "Matematika Kejuruan", sheetName: "2026/2027 MATEMATIKA", kelasTarget: ["VII-A", "VII-B", "VIII-A", "VIII-B", "IX-A"] }
    ]
  }
];

// State Penilaian Aktif
let activeGuru = null;
let activeMapel = null;
let DB_NILAI_STORE = {}; // Menyimpan skor input: key = `${guruId}_${mapelId}_${tapel}_${kelas}_${jenis}`

/**
 * Inisialisasi Modul Rapot
 */
document.addEventListener('DOMContentLoaded', () => {
  const cachedNilai = localStorage.getItem(STORAGE_KEY_NILAI);
  if (cachedNilai) {
    try {
      DB_NILAI_STORE = JSON.parse(cachedNilai);
    } catch (e) {}
  }

  renderGuruCards();
});

/**
 * 1. ALUR RAPOT: LANGKAH 1 (PILIH GURU) - TAMPILAN BERSIH TANPA NIP & JUMLAH MAPEL
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
          <h4 class="font-bold text-base md:text-lg text-slate-900 leading-snug">${guru.nama}</h4>
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
 * 2. ALUR RAPOT: LANGKAH 2 (PILIH MAPEL)
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
 * 3. ALUR RAPOT: LANGKAH 3 (FORM INPUT NILAI SISWA)
 */
function populateSelectKelasInput() {
  const select = document.getElementById('select-rapot-kelas');
  if (!select) return;

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
 * 4. DOWNLOAD EXCEL REKAP NILAI DENGAN FORMAT:
 * Tahun Pelajaran - Kelas - Jenis Nilai - Nama Mapel.xlsx
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

  // 1. Susun baris metadata judul atas
  const sheetData = [
    ["MATA PELAJARAN", `: ${activeMapel.namaMapel}`],
    ["GURU PENGAMPU", `: ${activeGuru.nama}`],
    ["TAHUN PELAJARAN", `: ${tapel}`],
    ["JENIS PENILAIAN", `: ${jenis} (Kelas ${kelas})`],
    [], // Baris kosong pemisah
    ["NO", "NIS / NIPD", "NISN", "NAMA LENGKAP SISWA", "KELAS", "NILAI", "STATUS KKM (75)"]
  ];

  // 2. Masukkan data tabel siswa
  siswaList.forEach((s, idx) => {
    const score = savedScores[s.nisn] !== undefined ? savedScores[s.nisn] : '';
    const status = score !== '' ? (Number(score) >= 75 ? "Tuntas" : "Belum Tuntas") : "Belum Dinilai";

    sheetData.push([
      idx + 1,
      s.nis || "-",
      s.nisn || "-",
      s.nama || "-",
      s.kelas || "-",
      score !== '' ? Number(score) : "-",
      status
    ]);
  });

  // 3. Buat worksheet dan hitung lebar kolom otomatis
  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  ws['!cols'] = [
    { wch: 6 },  // NO
    { wch: 16 }, // NIS
    { wch: 18 }, // NISN
    { wch: 38 }, // NAMA LENGKAP (Cukup lebar agar terlihat utuh)
    { wch: 12 }, // KELAS
    { wch: 10 }, // NILAI
    { wch: 18 }  // STATUS KKM
  ];

  const wb = XLSX.utils.book_new();
  const safeSheetName = `${kelas}_${jenis}`.substring(0, 31);
  XLSX.utils.book_append_sheet(wb, ws, safeSheetName);

  // Format Nama File: Tahun Pelajaran - Kelas - Jenis Nilai - Nama Mapel.xlsx
  const safeTapel = tapel.replace(/[\/\\]/g, '-');
  const safeKelas = kelas.replace(/[\/\\]/g, '-');
  const safeJenis = jenis.replace(/[\/\\]/g, '-');
  const safeMapel = activeMapel.namaMapel.replace(/[\/\\]/g, '-');

  const fileName = `${safeTapel} - ${safeKelas} - ${safeJenis} - ${safeMapel}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
