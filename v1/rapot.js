/**
 * ============================================================
 * DAPODIK MUHFIKRA - MODUL RAPOT & WALI KELAS (TAHAP 4)
 * File: rapot.js
 * ============================================================
 */

const STORAGE_KEY_NILAI = "DAPODIK_NILAI_INPUT_CACHE";

// ============================================================
// KONFIGURASI LOGO WATERMARK RAPOR (BISA DIGANTI URL/FILE ANDA)
// ============================================================
const WATERMARK_LOGO_URL = "Asset12.png";

// Data Master Guru & Mapel yang Diampu
const DATA_GURU_MAPEL = [
  {
    id: "G1",
    nama: "Hendra Gunawan, S.Kom",
    mapel: [
      { id: "M1", namaMapel: "Dasar-Dasar Kejuruan", sheetName: "2026/2027 Dasar Kejuruan" },
      { id: "M2", namaMapel: "Administrasi Sistem & Jaringan", sheetName: "2026/2027 Jaringan Komputer" }
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
      { id: "M5", namaMapel: "Matematika Kejuruan", sheetName: "2026/2027 MATEMATIKA" },
      { id: "M6", namaMapel: "Pendidikan Pancasila", sheetName: "2026/2027 PANCASILA" }
    ]
  }
];

// State Penilaian Aktif
let activeGuru = null;
let activeMapel = null;
let activeKelasWali = null;
let DB_NILAI_STORE = {};

document.addEventListener('DOMContentLoaded', () => {
  const cachedNilai = localStorage.getItem(STORAGE_KEY_NILAI);
  if (cachedNilai) {
    try {
      DB_NILAI_STORE = JSON.parse(cachedNilai);
    } catch (e) {}
  }

  renderGuruCards();

  // Reset tampilan setelah dialog print selesai agar DOM kembali bersih
  window.addEventListener("afterprint", () => {
    const printContainer = document.getElementById('print-section-rapor-lengkap');
    if (printContainer) {
      printContainer.innerHTML = '';
      printContainer.classList.add('hidden');
    }
  });
});

function onDataSiswaUpdated() {
  populateSelectKelasInput();
  renderKelasWaliCards();
  const viewRapotInput = document.getElementById('view-rapot-input');
  if (viewRapotInput && !viewRapotInput.classList.contains('hidden')) {
    renderTabelInputNilai();
  }
}

/**
 * 1. ALUR GURU PENGAMPU
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

function populateSelectKelasInput() {
  const select = document.getElementById('select-rapot-kelas');
  if (!select) return;

  const currentVal = select.value;
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

function handleScoreInput(el) {
  el.value = el.value.replace(/[^0-9]/g, '');
  if (el.value.length > 2) el.value = el.value.slice(0, 2);

  if (el.value.length === 1) {
    el.classList.add('border-red-500', 'bg-red-50', 'text-red-600');
    el.classList.remove('border-slate-200', 'bg-white', 'text-slate-900');
  } else {
    el.classList.remove('border-red-500', 'bg-red-50', 'text-red-600');
    el.classList.add('border-slate-200', 'bg-white', 'text-slate-900');
  }
}

function handleScoreBlur(el) {
  if (el.value.length === 1) {
    el.classList.add('border-red-500', 'bg-red-50', 'text-red-600');
    showInputWarningToast("Wajib 2 digit angka! (Contoh: 85, 70, 08)");
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

  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 1 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 1 } }
  ];

  ws['!cols'] = [
    { wch: 6 },
    { wch: 16 },
    { wch: 20 },
    { wch: 38 },
    { wch: 12 },
    { wch: 10 },
    { wch: 16 },
    { wch: 18 }
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

/**
 * ============================================================
 * 2. ALUR MENU WALI KELAS & CETAK RAPOR SISWA (PDF & EXCEL)
 * ============================================================
 */

function renderKelasWaliCards() {
  const container = document.getElementById('list-kelas-wali');
  if (!container) return;
  container.innerHTML = '';

  const kelasList = [...new Set(DATA_SISWA.map(s => s.kelas).filter(k => k && k.trim() !== ""))].sort();

  if (kelasList.length === 0) {
    container.innerHTML = `
      <div class="p-8 text-center bg-white rounded-2xl border border-slate-200">
        <i class="ph-duotone ph-chalkboard text-4xl text-slate-400 mb-2"></i>
        <p class="font-bold text-slate-700">Data kelas belum tersedia</p>
      </div>
    `;
    return;
  }

  kelasList.forEach(kls => {
    const jumlahSiswa = DATA_SISWA.filter(s => s.kelas === kls).length;
    const card = document.createElement('div');
    card.className = "bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:border-brand-green transition-all cursor-pointer active:scale-95 flex items-center justify-between";
    card.onclick = () => selectKelasWali(kls);

    card.innerHTML = `
      <div class="flex items-center gap-3.5">
        <div class="w-12 h-12 rounded-2xl bg-brand-greenLight text-brand-green flex items-center justify-center text-2xl font-bold">
          <i class="ph-fill ph-chalkboard"></i>
        </div>
        <div>
          <h4 class="font-bold text-base md:text-lg text-slate-900 leading-snug">Kelas ${kls}</h4>
          <span class="inline-block bg-slate-100 text-slate-700 text-xs font-semibold px-2 py-0.5 rounded mt-1">
            ${jumlahSiswa} Peserta Didik
          </span>
        </div>
      </div>
      <i class="ph-bold ph-caret-right text-slate-400 text-xl"></i>
    `;
    container.appendChild(card);
  });
}

function selectKelasWali(kelasName) {
  activeKelasWali = kelasName;

  document.getElementById('label-wali-kelas-nama').innerText = `Kelas ${kelasName}`;
  const siswaList = DATA_SISWA.filter(s => s.kelas === kelasName);
  document.getElementById('badge-total-siswa-wali').innerText = `${siswaList.length} Siswa`;

  const tbody = document.getElementById('tbody-wali-siswa');
  if (tbody) {
    tbody.innerHTML = '';
    siswaList.forEach((s, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="py-2.5 px-3 text-center font-bold text-slate-500">${idx + 1}</td>
        <td class="py-2.5 px-3 font-bold text-slate-800">${s.nama}</td>
        <td class="py-2.5 px-3 font-mono text-slate-600 text-xs">${s.nisn || '-'}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  history.pushState({ page: 'rapot_cetak_wali', kelas: kelasName }, 'Cetak Rapor', '');
  applyViewState({ page: 'rapot_cetak_wali', kelas: kelasName });
}

function getKonsentrasiKeahlian(kelasName) {
  const klsUpper = (kelasName || "").toUpperCase();
  if (klsUpper.includes("TKJ") || klsUpper.includes("TJKT")) {
    return "Teknik Komputer dan Jaringan";
  }
  if (klsUpper.includes("TKR") || klsUpper.includes("OTO")) {
    return "Teknik Kendaraan Ringan";
  }
  if (klsUpper.includes("BD") || klsUpper.includes("BISNIS")) {
    return "Bisnis Digital";
  }
  return "Teknik Komputer dan Jaringan";
}

function getFaseKelas(kelasName) {
  const klsUpper = (kelasName || "").toUpperCase();
  if (klsUpper.startsWith("X-") || klsUpper.startsWith("X ") || klsUpper === "X") {
    return "E";
  }
  return "F";
}

function getNilaiTeoriSiswa(guruId, mapelId, kelas, nisn) {
  const tapel = "2026/2027";
  const jenis = "PTS Ganjil";
  const storeKey = `${guruId}_${mapelId}_${tapel}_${kelas}_${jenis}`;
  const store = DB_NILAI_STORE[storeKey];
  if (store && store[nisn] !== undefined && store[nisn] !== '') {
    return Number(store[nisn]);
  }
  return 78;
}

/**
 * 3. CETAK RAPOR PDF WALI KELAS (REVISI: HEADER SEKOLAH, WATERMARK & TABEL TAMBAHAN)
 */
function cetakPDFRaporSiswa() {
  const container = document.getElementById('print-section-rapor-lengkap');
  if (!container) return;
  container.innerHTML = '';

  const siswaList = DATA_SISWA.filter(s => s.kelas === activeKelasWali);

  if (siswaList.length === 0) {
    alert("Tidak ada siswa di kelas ini untuk dicetak rapornya.");
    return;
  }

  const tapel = "2026/2027";
  const semester = "Ganjil";
  const konsentrasi = getKonsentrasiKeahlian(activeKelasWali);
  const fase = getFaseKelas(activeKelasWali);

  let allMapelList = [];
  DATA_GURU_MAPEL.forEach(guru => {
    guru.mapel.forEach(m => {
      allMapelList.push({
        guruId: guru.id,
        guruNama: guru.nama,
        mapelId: m.id,
        namaMapel: m.namaMapel
      });
    });
  });

  // Susun lembar rapor per siswa
  siswaList.forEach((siswa, sIdx) => {
    const pageWrapper = document.createElement('div');
    pageWrapper.className = sIdx < siswaList.length - 1 ? "page-break watermark-container p-4 text-black relative" : "watermark-container p-4 text-black relative";

    let rowsHtml = "";
    allMapelList.forEach((m, mIdx) => {
      const nilaiTeori = getNilaiTeoriSiswa(m.guruId, m.mapelId, siswa.kelas, siswa.nisn);
      const nilaiPraktek = nilaiTeori + 5;
      
      // FORMULA NILAI AKHIR (Tanpa dibagi 2): 75% Nilai Praktek + 25% Nilai Teori
      const nilaiAkhir = Math.round((0.75 * nilaiPraktek) + (0.25 * nilaiTeori));

      rowsHtml += `
        <tr>
          <td style="border: 1px solid black; padding: 5px; text-align: center;">${mIdx + 1}</td>
          <td style="border: 1px solid black; padding: 5px; font-weight: 600;">${m.namaMapel}</td>
          <td style="border: 1px solid black; padding: 5px; text-align: center;">${nilaiTeori}</td>
          <td style="border: 1px solid black; padding: 5px; text-align: center;">${nilaiPraktek}</td>
          <td style="border: 1px solid black; padding: 5px; text-align: center; font-weight: bold;">${nilaiAkhir}</td>
          <td style="border: 1px solid black; padding: 5px; text-align: center;">-</td>
        </tr>
      `;
    });

    pageWrapper.innerHTML = `
      <!-- WATERMARK LOGO SEKOLAH (TRANSPARANSI 25%) -->
      <div class="watermark-bg" style="background-image: url('${WATERMARK_LOGO_URL}');"></div>

      <div style="position: relative; z-index: 1;">
        <!-- JUDUL RAPOR & NAMA SEKOLAH (Center, Bold, 14pt) -->
        <div style="text-align: center; font-weight: bold; font-size: 14pt; margin-bottom: 14px; line-height: 1.3;">
          <div>LAPORAN HASIL BELAJAR (RAPOR)</div>
          <div>SMK Muhammadiyah 5 Karanganyar</div>
          <div style="font-size: 11pt; font-weight: bold; margin-top: 4px;">Tahun Pelajaran : ${tapel}</div>
          <div style="font-size: 11pt; font-weight: 600; margin-top: 2px;">Kelas / Fase : ${siswa.kelas} / ${fase}, Semester : ${semester}</div>
        </div>

        <!-- IDENTITAS SISWA (Left, Bold, 11pt) -->
        <div style="font-size: 11pt; font-weight: bold; margin-bottom: 12px; line-height: 1.4;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="width: 200px; vertical-align: top;">Nama Peserta Didik</td>
              <td style="width: 15px; vertical-align: top;">:</td>
              <td style="vertical-align: top; text-transform: uppercase;">${siswa.nama}</td>
            </tr>
            <tr>
              <td style="vertical-align: top;">NISN</td>
              <td style="vertical-align: top;">:</td>
              <td style="vertical-align: top; font-family: monospace;">${siswa.nisn || '-'}</td>
            </tr>
            <tr>
              <td style="vertical-align: top;">Alamat</td>
              <td style="vertical-align: top;">:</td>
              <td style="vertical-align: top; font-weight: 500;">${siswa.alamat || '-'}</td>
            </tr>
            <tr>
              <td style="vertical-align: top;">Konsentrasi Keahlian</td>
              <td style="vertical-align: top;">:</td>
              <td style="vertical-align: top;">${konsentrasi}</td>
            </tr>
          </table>
        </div>

        <!-- TABEL 1: DAFTAR NILAI MAPEL -->
        <table style="width: 100%; border-collapse: collapse; font-size: 9.5pt; margin-bottom: 14px;">
          <thead>
            <tr style="background-color: #f3f4f6;">
              <th style="border: 1px solid black; padding: 6px 4px; text-align: center; width: 30px;">No</th>
              <th style="border: 1px solid black; padding: 6px 8px; text-align: left;">Mata Pelajaran</th>
              <th style="border: 1px solid black; padding: 6px 4px; text-align: center; width: 75px;">Nilai Teori</th>
              <th style="border: 1px solid black; padding: 6px 4px; text-align: center; width: 80px;">Nilai Praktek</th>
              <th style="border: 1px solid black; padding: 6px 4px; text-align: center; width: 75px;">Nilai Akhir</th>
              <th style="border: 1px solid black; padding: 6px 4px; text-align: center; width: 120px;">Capaian Kompetensi</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <!-- TABEL 2 & 3 BERDAMPINGAN: EKSTRAKURIKULER & KETIDAKHADIRAN -->
        <div style="display: flex; gap: 14px; margin-bottom: 20px;">
          <!-- TABEL 2: EKSTRAKURIKULER -->
          <div style="flex: 1;">
            <table style="width: 100%; border-collapse: collapse; font-size: 9.5pt;">
              <thead>
                <tr style="background-color: #f3f4f6;">
                  <th style="border: 1px solid black; padding: 5px; text-align: center; width: 30px;">No</th>
                  <th style="border: 1px solid black; padding: 5px; text-align: left;">Kegiatan Ekstrakurikuler</th>
                  <th style="border: 1px solid black; padding: 5px; text-align: center; width: 80px;">Keterangan</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="border: 1px solid black; padding: 5px; text-align: center;">1</td>
                  <td style="border: 1px solid black; padding: 5px; font-weight: 500;">Hizbul Wathon</td>
                  <td style="border: 1px solid black; padding: 5px; text-align: center; font-weight: bold;">Baik</td>
                </tr>
                <tr>
                  <td style="border: 1px solid black; padding: 5px; text-align: center;">2</td>
                  <td style="border: 1px solid black; padding: 5px; font-weight: 500;">Tapak Suci</td>
                  <td style="border: 1px solid black; padding: 5px; text-align: center; font-weight: bold;">Baik</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- TABEL 3: KETIDAKHADIRAN -->
          <div style="flex: 1;">
            <table style="width: 100%; border-collapse: collapse; font-size: 9.5pt;">
              <thead>
                <tr style="background-color: #f3f4f6;">
                  <th style="border: 1px solid black; padding: 5px; text-align: left;">Ketidakhadiran</th>
                  <th style="border: 1px solid black; padding: 5px; text-align: center; width: 100px;">Jumlah</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="border: 1px solid black; padding: 5px;">Sakit</td>
                  <td style="border: 1px solid black; padding: 5px; text-align: center;">...... Hari</td>
                </tr>
                <tr>
                  <td style="border: 1px solid black; padding: 5px;">Izin</td>
                  <td style="border: 1px solid black; padding: 5px; text-align: center;">...... Hari</td>
                </tr>
                <tr>
                  <td style="border: 1px solid black; padding: 5px;">Tanpa Keterangan</td>
                  <td style="border: 1px solid black; padding: 5px; text-align: center;">...... Hari</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- TANDA TANGAN RAPOR -->
        <div style="display: flex; justify-content: space-between; font-size: 10pt; margin-top: 15px;">
          <div style="text-align: center; width: 200px;">
            <div>Mengetahui,</div>
            <div style="margin-top: 2px;">Orang Tua / Wali Siswa</div>
            <div style="height: 55px;"></div>
            <div style="font-weight: bold; text-decoration: underline;">( ......................................... )</div>
          </div>

          <div style="text-align: center; width: 220px;">
            <div>Karanganyar, 19 Agustus 2026</div>
            <div style="margin-top: 2px; font-weight: bold;">Wali Kelas</div>
            <div style="height: 55px;"></div>
            <div style="font-weight: bold; text-decoration: underline;">( _________________________ )</div>
            <div style="font-size: 9pt;">NIP. .........................................</div>
          </div>
        </div>
      </div>
    `;

    container.appendChild(pageWrapper);
  });

  container.classList.remove('hidden');
  window.print();
}

/**
 * 4. CETAK RAPOR EXCEL WALI KELAS FORMAT LEGGER (REVISI: NT, NP, NA & KOLOM RINGKAS)
 */
function downloadExcelRaporWali() {
  const siswaList = DATA_SISWA.filter(s => s.kelas === activeKelasWali);

  if (siswaList.length === 0) {
    alert("Tidak ada data siswa untuk di-export.");
    return;
  }

  const tapel = "2026/2027";
  const semester = "Ganjil";
  const fase = getFaseKelas(activeKelasWali);

  let allMapelList = [];
  DATA_GURU_MAPEL.forEach(guru => {
    guru.mapel.forEach(m => {
      allMapelList.push({
        guruId: guru.id,
        mapelId: m.id,
        namaMapel: m.namaMapel
      });
    });
  });

  // Susun Baris Judul Atas
  const sheetData = [
    ["LEGGER RAPOR"],
    [`Tahun Pelajaran: ${tapel}`],
    [`Kelas / Fase: ${activeKelasWali} / ${fase}, Semester: ${semester}`],
    []
  ];

  // Baris Header 1 & 2 (Header Singkat: NT, NP, NA)
  const headerRow1 = ["NO", "NISN", "NAMA PESERTA DIDIK"];
  const headerRow2 = ["", "", ""];

  allMapelList.forEach(m => {
    headerRow1.push(m.namaMapel, "", "");
    headerRow2.push("NT", "NP", "NA");
  });

  headerRow1.push("TOTAL NILAI", "PERINGKAT");
  headerRow2.push("", "");

  sheetData.push(headerRow1);
  sheetData.push(headerRow2);

  // Hitung total nilai & peringkat siswa
  const calculatedRows = siswaList.map((s, sIdx) => {
    let totalScore = 0;
    const scores = [];

    allMapelList.forEach(m => {
      const nilaiTeori = getNilaiTeoriSiswa(m.guruId, m.mapelId, s.kelas, s.nisn);
      const nilaiPraktek = nilaiTeori + 5;
      const nilaiAkhir = Math.round((0.75 * nilaiPraktek) + (0.25 * nilaiTeori));

      scores.push(nilaiTeori, nilaiPraktek, nilaiAkhir);
      totalScore += nilaiAkhir;
    });

    return {
      index: sIdx + 1,
      nisn: s.nisn || "-",
      nama: s.nama,
      scores: scores,
      totalScore: totalScore
    };
  });

  const sortedByScore = [...calculatedRows].sort((a, b) => b.totalScore - a.totalScore);
  const rankMap = {};
  sortedByScore.forEach((item, rIdx) => {
    rankMap[item.nisn] = rIdx + 1;
  });

  calculatedRows.forEach(row => {
    sheetData.push([
      row.index,
      row.nisn,
      row.nama,
      ...row.scores,
      row.totalScore,
      rankMap[row.nisn]
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  // Merge Cells Header
  const merges = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 2 } },
    { s: { r: 4, c: 0 }, e: { r: 5, c: 0 } },
    { s: { r: 4, c: 1 }, e: { r: 5, c: 1 } },
    { s: { r: 4, c: 2 }, e: { r: 5, c: 2 } }
  ];

  let colOffset = 3;
  allMapelList.forEach(() => {
    merges.push({
      s: { r: 4, c: colOffset },
      e: { r: 4, c: colOffset + 2 }
    });
    colOffset += 3;
  });

  merges.push(
    { s: { r: 4, c: colOffset }, e: { r: 5, c: colOffset } },
    { s: { r: 4, c: colOffset + 1 }, e: { r: 5, c: colOffset + 1 } }
  );

  ws['!merges'] = merges;

  // Lebar kolom ringkas (kolom angka NT, NP, NA hanya 5 karakter)
  const cols = [
    { wch: 5 },  // NO
    { wch: 16 }, // NISN
    { wch: 28 }  // NAMA
  ];

  allMapelList.forEach(() => {
    cols.push({ wch: 5 }, { wch: 5 }, { wch: 5 }); // NT, NP, NA ringkas
  });

  cols.push({ wch: 11 }, { wch: 10 }); // TOTAL NILAI, PERINGKAT
  ws['!cols'] = cols;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `Legger_${activeKelasWali}`);

  const fileName = `Legger_Rapor_Kelas_${activeKelasWali}_${tapel.replace(/[\/\\]/g, '-')}_Semester_${semester}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
