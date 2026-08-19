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
      { id: "M1", namaMapel: "Dasar-Dasar TJKT", sheetName: "2026/2027 Dasar TJKT" },
      { id: "M2", namaMapel: "Administrasi Jaringan Komputer", sheetName: "2026/2027 Jaringan Komputer" }
    ]
  },
  {
    id: "G2",
    nama: "Sri Wahyuni, S.Pd",
    mapel: [
      { id: "M3", namaMapel: "Pemasaran & Bisnis Digital", sheetName: "2026/2027 BISNIS DIGITAL" },
      { id: "M4", namaMapel: "Ekonomi Bisnis", sheetName: "2026/2027 EKONOMI BISNIS" }
    ]
  },
  {
    id: "G3",
    nama: "Ahmad Fauzi, M.Pd",
    mapel: [
      { id: "M5", namaMapel: "Matematika Kejuruan", sheetName: "2026/2027 MATEMATIKA" }
    ]
  }
];

// State Penilaian Aktif
let activeGuru = null;
let activeMapel = null;
let DB_NILAI_STORE = {}; // key = `${guruId}_${mapelId}_${tapel}_${kelas}_${jenis}`

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
 * FUNGSI SINKRONISASI INSTAN DARI APP.JS
 * Dipanggil otomatis saat fetch data siswa selesai
 */
function onDataSiswaUpdated() {
  populateSelectKelasInput();
  const viewRapotInput = document.getElementById('view-rapot-input');
  if (viewRapotInput && !viewRapotInput.classList.contains('hidden')) {
    renderTabelInputNilai();
  }
}

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

  const currentVal = select.value;
  // Ekstrak semua nama kelas unik langsung dari data siswa master
  const kelasSiswa = [...new Set(DATA_SISWA.map(s => s.kelas).filter(k => k && k.trim() !== ""))].sort();

  if (kelasSiswa.length === 0) {
    select.innerHTML = '<option value="">Memuat data kelas...</option>';
    return;
  }

  select.innerHTML = '';
  kelasSiswa.forEach((kls, idx) => {
    const opt = document.createElement('option');
    opt.value = kls;
    opt.innerText = `Kelas ${kls}`;
    if (currentVal && currentVal === kls) {
      opt.selected = true;
    } else if (!currentVal && idx === 0) {
      opt.selected = true;
    }
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

/**
 * SANITASI & VALIDASI KETAT INPUT NILAI:
 * 1. Menolak simbol seperti koma, titik, minus, spasi.
 * 2. Mengubah warna menjadi merah jika hanya 1 digit.
 */
function handleScoreInput(el) {
  // Hanya menerima angka 0-9
  el.value = el.value.replace(/[^0-9]/g, '');

  // Batasi maksimal 2 digit
  if (el.value.length > 2) {
    el.value = el.value.slice(0, 2);
  }

  // Cek validasi visual secara real-time
  if (el.value.length === 1) {
    el.classList.add('border-red-500', 'bg-red-50', 'text-red-600');
    el.classList.remove('border-slate-200', 'bg-white', 'text-slate-900');
  } else {
    el.classList.remove('border-red-500', 'bg-red-50', 'text-red-600');
    el.classList.add('border-slate-200', 'bg-white', 'text-slate-900');
  }
}

/**
 * BLUR HANDLER: LOCK FOCUS JIKA HANYA 1 DIGIT (TIDAK BISA PINDAH KOLOM)
 */
function handleScoreBlur(el) {
  if (el.value.length === 1) {
    el.classList.add('border-red-500', 'bg-red-50', 'text-red-600');
    
    // Tampilkan notifikasi toast kecil
    showInputWarningToast("Wajib 2 digit angka! (Contoh: 85, 70, 08)");
    
    // Kunci fokus agar tidak bisa berpindah kolom
    setTimeout(() => {
      el.focus();
      el.select();
    }, 10);
  }
}

function showInputWarningToast(msg) {
  let toast = document.getElementById('toast-input-warning');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast-input-warning';
    toast.className = 'fixed top-5 left-1/2 -translate-x-1/2 bg-red-600 text-white text-xs md:text-sm font-bold px-4 py-2.5 rounded-full shadow-2xl z-50 transition-all duration-300 pointer-events-none opacity-0 flex items-center gap-1.5';
    document.body.appendChild(toast);
  }

  toast.innerHTML = `<i class="ph-bold ph-warning-circle text-base"></i> ${msg}`;
  toast.classList.remove('opacity-0', '-translate-y-4');
  toast.classList.add('opacity-100', 'translate-y-0');

  setTimeout(() => {
    toast.classList.remove('opacity-100', 'translate-y-0');
    toast.classList.add('opacity-0', '-translate-y-4');
  }, 2200);
}

function renderTabelInputNilai() {
  const tbody = document.getElementById('tbody-input-nilai');
  const emptyState = document.getElementById('empty-state-input');
  const kelasTerpilih = document.getElementById('select-rapot-kelas').value;
  const storeKey = getNilaiStoreKey();
  const savedScores = DB_NILAI_STORE[storeKey] || {};

  tbody.innerHTML = '';

  // Filter siswa berdasarkan kelas yang dipilih
  const siswaList = DATA_SISWA.filter(s => s.kelas === kelasTerpilih);

  if (siswaList.length === 0) {
    if (DATA_SISWA.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="3" class="py-8 text-center text-slate-500 font-semibold">
            <i class="ph-bold ph-spinner animate-spin text-2xl mb-1 inline-block text-brand-green"></i>
            <p class="text-xs md:text-sm">Memuat daftar siswa...</p>
          </td>
        </tr>
      `;
      return;
    }
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
        <span class="text-xs font-mono text-slate-500">NISN: ${siswa.nisn || '-'}</span>
      </td>
      <td class="py-3 px-2 text-center">
        <input type="text" 
          inputmode="numeric" 
          maxlength="2" 
          id="input-score-${siswa.nisn}" 
          value="${nilaiAwal}" 
          placeholder="--"
          oninput="handleScoreInput(this)"
          onblur="handleScoreBlur(this)"
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

  // Cek apakah masih ada inputan 1 digit
  let adaNilaiInvalid = false;
  let invalidInputEl = null;

  siswaList.forEach(siswa => {
    const inputEl = document.getElementById(`input-score-${siswa.nisn}`);
    if (inputEl) {
      const val = inputEl.value.trim();
      if (val.length === 1) {
        adaNilaiInvalid = true;
        if (!invalidInputEl) invalidInputEl = inputEl;
      }
    }
  });

  if (adaNilaiInvalid && invalidInputEl) {
    showInputWarningToast("Terdapat nilai 1 digit. Harap perbaiki menjadi 2 digit!");
    invalidInputEl.focus();
    return;
  }

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
 * 4. DOWNLOAD EXCEL REKAP NILAI
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

  // Susun baris judul atas (Kolom A & B dimerge, isian di Kolom C)
  const sheetData = [
    ["MATA PELAJARAN", "", `: ${activeMapel.namaMapel}`],
    ["GURU PENGAMPU", "", `: ${activeGuru.nama}`],
    ["TAHUN PELAJARAN", "", `: ${tapel}`],
    ["JENIS PENILAIAN", "", `: ${jenis} (Kelas ${kelas})`],
    [],
    ["NO", "NIS / NIPD", "NISN", "NAMA LENGKAP SISWA", "KELAS", "NILAI", "NILAI PRAKTEK", "STATUS KKM (75)"]
  ];

  siswaList.forEach((s, idx) => {
    const rawScore = savedScores[s.nisn];
    const hasScore = rawScore !== undefined && rawScore !== '';
    const scoreNum = hasScore ? Number(rawScore) : null;
    
    // Nilai Praktek = Nilai + 5
    const nilaiPraktek = hasScore ? (scoreNum + 5) : "-";
    const status = hasScore ? (scoreNum >= 75 ? "Tuntas" : "Belum Tuntas") : "Belum Dinilai";

    sheetData.push([
      idx + 1,
      s.nis || "-",
      s.nisn || "-",
      s.nama || "-",
      s.kelas || "-",
      hasScore ? scoreNum : "-",
      nilaiPraktek,
      status
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  // Merge Kolom A & B pada baris 1 s/d 4
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 1 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 1 } }
  ];

  // Atur lebar kolom
  ws['!cols'] = [
    { wch: 6 },  // NO
    { wch: 16 }, // NIS / NIPD
    { wch: 20 }, // NISN
    { wch: 38 }, // NAMA LENGKAP SISWA
    { wch: 12 }, // KELAS
    { wch: 10 }, // NILAI
    { wch: 16 }, // NILAI PRAKTEK
    { wch: 18 }  // STATUS KKM
  ];

  const wb = XLSX.utils.book_new();
  const safeSheetName = `${kelas}_${jenis}`.substring(0, 31);
  XLSX.utils.book_append_sheet(wb, ws, safeSheetName);

  const safeTapel = tapel.replace(/[\/\\]/g, '-');
  const safeKelas = kelas.replace(/[\/\\]/g, '-');
  const safeJenis = jenis.replace(/[\/\\]/g, '-');
  const safeMapel = activeMapel.namaMapel.replace(/[\/\\]/g, '-');

  const fileName = `${safeTapel} - ${safeKelas} - ${safeJenis} - ${safeMapel}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
