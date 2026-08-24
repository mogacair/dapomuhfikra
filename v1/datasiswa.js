// GANTI URL DI BAWAH INI DENGAN URL DEPLOYMENT WEB APP GAS ANDA
const GAS_URL_DATASIWA = "https://script.google.com/macros/s/AKfycbwN1NV5lFBmNfQP4mVu4c80-KQGneRYFtWegtYkmB0cT-hdLQQBLuHAcigEPFvJe9Kx/exec";


let siswaData = [];
let isDetailOpen = false;
let isSiswaLoaded = false;

function initSiswaView() {
  if (!isSiswaLoaded) {
    fetchDataSiswa();
  }
}

// 1. Mengambil Data dari Google Sheets via GAS
async function fetchDataSiswa() {
  const tbody = document.getElementById('siswaTableBody');
  const btnRefresh = document.getElementById('btnRefreshSiswa');
  
  tbody.innerHTML = `<tr><td colspan="4" class="p-8 text-center text-gray-500 font-medium animate-pulse">Sedang mengambil data dari Google Sheets...</td></tr>`;
  if (btnRefresh) btnRefresh.innerText = "⏳ Memuat...";

  try {
    const res = await fetch(GAS_URL_DATASIWA);
    const result = await res.json();

    if (result.status === 'success' && Array.isArray(result.data)) {
      siswaData = result.data;
      isSiswaLoaded = true;
      renderTableSiswa();
    } else {
      throw new Error("Format data tidak sesuai");
    }
  } catch (err) {
    console.error(err);
    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="p-6 text-center text-red-600 font-bold">
          Gagal mengambil data dari Google Sheet.<br>
          <span class="text-sm font-normal text-gray-500">Pastikan URL GAS sudah benar dan hak akses Web App diatur ke 'Anyone'.</span>
        </td>
      </tr>`;
  } finally {
    if (btnRefresh) btnRefresh.innerText = "🔄 Muat Ulang Data";
  }
}

// 2. Filter Berdasarkan Pilihan Kelas
function getFilteredDataSiswa() {
  const filter = document.getElementById('filterKelasSiswa').value;
  if (filter === 'ALL') return siswaData;
  return siswaData.filter(s => s.kelas.toUpperCase() === filter.toUpperCase());
}

// 3. Render Tabel Siswa di Halaman
function renderTableSiswa() {
  const tbody = document.getElementById('siswaTableBody');
  const data = getFilteredDataSiswa();
  tbody.innerHTML = '';

  if (data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="p-6 text-center text-gray-500 font-medium">Tidak ada data untuk kelas ini</td></tr>`;
    return;
  }

  data.forEach((siswa, index) => {
    const row = document.createElement('tr');
    row.className = index % 2 === 0 ? 'bg-white active:bg-green-50' : 'bg-gray-50 active:bg-green-50';
    row.innerHTML = `
      <td class="p-3.5 text-center font-bold text-gray-500">${index + 1}</td>
      <td class="p-3.5 font-mono text-gray-700 text-sm sm:text-base">${siswa.nisn}</td>
      <td class="p-3.5 font-bold text-[#15803d] underline cursor-pointer hover:text-[#166534]" onclick="openDetailSiswa('${siswa.nisn}')">
        ${siswa.nama}
      </td>
      <td class="p-3.5 text-center">
        <span class="px-2.5 py-1 bg-gray-200 text-gray-800 rounded-md font-bold text-xs sm:text-sm">${siswa.kelas}</span>
      </td>
    `;
    tbody.appendChild(row);
  });
}

// 4. Modal Detail Siswa (Grid 2 Kolom Compact Tanpa Scroll)
function openDetailSiswa(nisn) {
  const s = siswaData.find(item => item.nisn === nisn);
  if (!s) return;

  const displayJK = (s.jk.toLowerCase() === 'laki-laki' || s.jk.toLowerCase() === 'l') ? 'Laki-laki' : 'Perempuan';

  const html = `
    <!-- Baris 1: Nama Lengkap (Full Width) -->
    <div class="bg-green-50 p-2.5 rounded-xl border border-green-200">
      <span class="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">NAMA LENGKAP</span>
      <span class="text-base sm:text-lg font-extrabold text-[#15803d] block leading-tight mt-0.5">${s.nama}</span>
    </div>

    <!-- Baris 2: NIS/NIPD & NISN (2 Kolom) -->
    <div class="grid grid-cols-2 gap-2">
      <div class="bg-gray-50 p-2 rounded-xl border border-gray-200">
        <span class="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">NIS / NIPD</span>
        <span class="text-sm sm:text-base font-bold text-[#374151] block mt-0.5 font-mono">${s.nis}</span>
      </div>
      <div class="bg-gray-50 p-2 rounded-xl border border-gray-200">
        <span class="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">NISN</span>
        <span class="text-sm sm:text-base font-bold text-[#374151] block mt-0.5 font-mono">${s.nisn}</span>
      </div>
    </div>

    <!-- Baris 3: Kelas & Jenis Kelamin (2 Kolom) -->
    <div class="grid grid-cols-2 gap-2">
      <div class="bg-gray-50 p-2 rounded-xl border border-gray-200">
        <span class="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">KELAS</span>
        <span class="text-sm sm:text-base font-bold text-[#374151] block mt-0.5">${s.kelas}</span>
      </div>
      <div class="bg-gray-50 p-2 rounded-xl border border-gray-200">
        <span class="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">JENIS KELAMIN</span>
        <span class="text-sm sm:text-base font-bold text-[#374151] block mt-0.5">${displayJK}</span>
      </div>
    </div>

    <!-- Baris 4: TTL & Nama Ibu (2 Kolom) -->
    <div class="grid grid-cols-2 gap-2">
      <div class="bg-gray-50 p-2 rounded-xl border border-gray-200">
        <span class="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">TEMPAT, TGL LAHIR</span>
        <span class="text-xs sm:text-sm font-semibold text-[#374151] block mt-0.5 leading-snug">${s.ttl}</span>
      </div>
      <div class="bg-gray-50 p-2 rounded-xl border border-gray-200">
        <span class="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">NAMA IBU KANDUNG</span>
        <span class="text-xs sm:text-sm font-semibold text-[#374151] block mt-0.5 leading-snug">${s.ibu}</span>
      </div>
    </div>

    <!-- Baris 5: Alamat Tinggal (Full Width) -->
    <div class="bg-gray-50 p-2 rounded-xl border border-gray-200">
      <span class="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">ALAMAT TINGGAL</span>
      <span class="text-xs sm:text-sm font-medium text-[#374151] block mt-0.5 leading-snug">${s.alamat}</span>
    </div>
  `;

  document.getElementById('detailBody').innerHTML = html;
  document.getElementById('detailBackdrop').classList.remove('hidden');
  document.getElementById('detailDrawer').classList.remove('translate-y-full');
  isDetailOpen = true;

  history.pushState({ view: 'siswa', modal: true }, '');
}

function closeDetailSiswa() {
  if (isDetailOpen) history.back();
}

function hideDetailDOM() {
  document.getElementById('detailBackdrop').classList.add('hidden');
  document.getElementById('detailDrawer').classList.add('translate-y-full');
  isDetailOpen = false;
}

// 5. Unduh Excel dengan Header & Rekap
function exportExcelSiswa() {
  const filter = document.getElementById('filterKelasSiswa').value;
  const data = getFilteredDataSiswa();

  const jmlLaki = data.filter(s => s.jk.toLowerCase() === 'laki-laki' || s.jk.toLowerCase() === 'l').length;
  const jmlPerempuan = data.filter(s => s.jk.toLowerCase() === 'perempuan' || s.jk.toLowerCase() === 'p').length;
  const totalSiswa = data.length;

  const worksheetData = [
    ["Data Siswa"],
    ["SMK Muhammadiyah 5 Karanganyar"],
    ["Tahun Pelajaran 2026/2027"]
  ];

  if (filter !== 'ALL') {
    worksheetData.push([`Kelas : ${filter}`]);
  }

  worksheetData.push([`Laki-laki: ${jmlLaki} orang | Perempuan: ${jmlPerempuan} orang | Total: ${totalSiswa} siswa`]);
  worksheetData.push([]);
  worksheetData.push(["NO", "NIS/NIPD", "NISN", "NAMA SISWA", "JK", "TEMPAT, TGL LAHIR", "ALAMAT", "NAMA IBU", "KELAS"]);

  data.forEach((s, idx) => {
    const displayJK = (s.jk.toLowerCase() === 'laki-laki' || s.jk.toLowerCase() === 'l') ? 'Laki-laki' : 'Perempuan';
    worksheetData.push([
      idx + 1,
      s.nis,
      s.nisn,
      s.nama,
      displayJK,
      s.ttl,
      s.alamat,
      s.ibu,
      s.kelas
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(worksheetData);
  ws['!cols'] = [
    { wch: 6 }, { wch: 12 }, { wch: 15 }, { wch: 28 },
    { wch: 14 }, { wch: 26 }, { wch: 35 }, { wch: 22 }, { wch: 10 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data Siswa");
  XLSX.writeFile(wb, `Data_Siswa_${filter}_2026_2027.xlsx`);
}

// 6. Cetak PDF Langsung (A4 Landscape)
function cetakPDFSiswa() {
  const filter = document.getElementById('filterKelasSiswa').value;
  const data = getFilteredDataSiswa();

  const optionsDate = { day: 'numeric', month: 'long', year: 'numeric' };
  const tanggalSekarang = new Date().toLocaleDateString('id-ID', optionsDate);
  const barisKelasHTML = filter !== 'ALL' ? `<br>KELAS : ${filter}` : '';

  const jmlLaki = data.filter(s => s.jk.toLowerCase() === 'laki-laki' || s.jk.toLowerCase() === 'l').length;
  const jmlPerempuan = data.filter(s => s.jk.toLowerCase() === 'perempuan' || s.jk.toLowerCase() === 'p').length;
  const totalSiswa = data.length;

  let tableRows = '';
  data.forEach((s, idx) => {
    const displayJK = (s.jk.toLowerCase() === 'laki-laki' || s.jk.toLowerCase() === 'l') ? 'L' : 'P';
    tableRows += `
      <tr>
        <td style="text-align: center;">${idx + 1}</td>
        <td style="text-align: center; font-family: monospace;">${s.nis}</td>
        <td style="text-align: center; font-family: monospace;">${s.nisn}</td>
        <td style="font-weight: bold;">${s.nama}</td>
        <td style="text-align: center;">${displayJK}</td>
        <td>${s.ttl}</td>
        <td>${s.alamat}</td>
        <td>${s.ibu}</td>
        <td style="text-align: center;">${s.kelas}</td>
      </tr>
    `;
  });

  const printContainer = document.getElementById('printableArea');
  printContainer.innerHTML = `
    <div class="print-header">
      DATA SISWA<br>
      SMK MUHAMMADIYAH 5 KARANGANYAR<br>
      TAHUN PELAJARAN 2026/2027${barisKelasHTML}
    </div>

    <div class="print-rekap">
      <span><b>Laki-laki:</b> ${jmlLaki} orang</span> &nbsp;|&nbsp;
      <span><b>Perempuan:</b> ${jmlPerempuan} orang</span> &nbsp;|&nbsp;
      <span><b>Total:</b> ${totalSiswa} siswa</span>
    </div>

    <table class="print-table">
      <thead>
        <tr>
          <th style="width: 3%;">NO</th>
          <th style="width: 8%;">NIS/NIPD</th>
          <th style="width: 9%;">NISN</th>
          <th style="width: 17%;">NAMA SISWA</th>
          <th style="width: 4%;">JK</th>
          <th style="width: 17%;">TEMPAT, TGL LAHIR</th>
          <th style="width: 19%;">ALAMAT</th>
          <th style="width: 15%;">NAMA IBU</th>
          <th style="width: 8%;">KELAS</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>

    <div class="print-ttd-wrap">
      <div class="print-ttd">
        <div>Karanganyar, ${tanggalSekarang}</div>
        <div style="margin-top: 4px;">Kepala Sekolah,</div>
        <div style="height: 60px;"></div>
        <div style="font-weight: bold; text-decoration: underline;">Ninik Setya Utami, S.T.</div>
        <div>NBM. -</div>
      </div>
      <div style="clear: both;"></div>
    </div>
  `;

  window.print();
}
