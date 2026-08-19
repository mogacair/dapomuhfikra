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

/**
 * Inisialisasi Modul Rapot
 */
document.addEventListener('DOMContentLoaded', () => {
  // Muat cache nilai yang pernah disimpan
  const cachedNilai = localStorage.getItem(STORAGE_KEY_NILAI);
  if (cachedNilai) {
    try {
      DB_NILAI_STORE = JSON.parse(cachedNilai);
    } catch (e) {}
  }

  // Render Cardboard Guru di awal
  renderGuruCards();
});

/**
 * 1. ALUR RAPOT: LANGKAH 1 (PILIH GURU)
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

  // Mengambil data kelas unik dari DATA_SISWA yang ada di app.js
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

  // Filter siswa berdasarkan kelas terpilih dari data master DATA_SISWA
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
 * 4. EXPORT EXCEL & PDF FORM INPUT NILAI
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

  document.getElementById('print-section-rapot-input').classList.remove('hidden');
  document.getElementById('print-section-siswa').classList.add('hidden');

  window.print();
}
