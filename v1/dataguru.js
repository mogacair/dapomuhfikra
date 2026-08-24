const GAS_URL_DATAGURU = "https://script.google.com/macros/s/AKfycbz9_3YbxX5D-baoBMHoz1MykxZKxIMq1tZReLuek_gi97jVVwkbJ1WqEvnBTvAt89OV/exec";

let guruData = [];
let isDetailGuruOpen = false;
let isGuruLoaded = false;

// Parser Tanggal Lahir (Membersihkan waktu, timezone, dan teks tempat lahir)
function getHanyaTglLahir(val) {
  if (!val) return '-';
  
  // Jika formatnya teks dengan koma, ambil bagian setelah koma (Contoh: "Karanganyar, 29 November 1981")
  let cleanStr = String(val).trim();
  if (cleanStr.includes(',')) {
    const parts = cleanStr.split(',');
    cleanStr = parts.slice(1).join(',').trim();
  }

  // Coba parse jika string adalah format tanggal mentah JS / ISO / GMT
  const parsedDate = new Date(cleanStr);
  if (!isNaN(parsedDate.getTime())) {
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    return parsedDate.toLocaleDateString('id-ID', options);
  }

  return cleanStr;
}

function initGuruView() {
  if (!isGuruLoaded) {
    fetchDataGuru();
  }
}

// 1. Mengambil Data Guru dari GAS
async function fetchDataGuru() {
  const tbody = document.getElementById('guruTableBody');
  const btnRefresh = document.getElementById('btnRefreshGuru');
  
  tbody.innerHTML = `<tr><td colspan="3" class="p-8 text-center text-gray-500 font-medium animate-pulse">Sedang mengambil data Guru dari Google Sheets...</td></tr>`;
  if (btnRefresh) btnRefresh.innerText = "⏳ Memuat...";

  try {
    const res = await fetch(GAS_URL_DATAGURU);
    const result = await res.json();

    if (result.status === 'success' && Array.isArray(result.data)) {
      guruData = result.data;
      isGuruLoaded = true;
      renderTableGuru();
    } else {
      throw new Error("Format data tidak sesuai");
    }
  } catch (err) {
    console.error(err);
    tbody.innerHTML = `
      <tr>
        <td colspan="3" class="p-6 text-center text-red-600 font-bold">
          Gagal mengambil data dari Google Sheet DB_dataguru.<br>
          <span class="text-sm font-normal text-gray-500">Pastikan URL GAS aktif dan hak akses diatur ke 'Anyone'.</span>
        </td>
      </tr>`;
  } finally {
    if (btnRefresh) btnRefresh.innerText = "🔄 Muat Ulang Data";
  }
}

// 2. Render Tabel Data Guru
function renderTableGuru() {
  const tbody = document.getElementById('guruTableBody');
  tbody.innerHTML = '';

  if (guruData.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" class="p-6 text-center text-gray-500 font-medium">Tidak ada data guru</td></tr>`;
    return;
  }

  guruData.forEach((guru, index) => {
    const listMapelText = (guru.listMapel || []).map(m => m.namaMapel).join(', ') || '-';
    const row = document.createElement('tr');
    row.className = index % 2 === 0 ? 'bg-white active:bg-yellow-50' : 'bg-gray-50 active:bg-yellow-50';
    row.innerHTML = `
      <td class="p-3.5 text-center font-bold text-gray-500">${index + 1}</td>
      <td class="p-3.5 font-bold text-[#ca8a04] underline cursor-pointer hover:text-yellow-700" onclick="openDetailGuru('${guru.idGuru}')">
        ${guru.nama}
      </td>
      <td class="p-3.5 text-sm sm:text-base font-semibold text-gray-700">
        ${listMapelText}
      </td>
    `;
    tbody.appendChild(row);
  });
}

// 3. Modal Detail Guru (Hanya Tanggal Lahir)
function openDetailGuru(idGuru) {
  const g = guruData.find(item => item.idGuru === idGuru);
  if (!g) return;

  const displayJK = (g.jk.toLowerCase() === 'laki-laki' || g.jk.toLowerCase() === 'l') ? 'Laki-laki' : 'Perempuan';
  const tglLahirBersih = getHanyaTglLahir(g.ttl);

  const html = `
    <!-- Baris 1: Nama Lengkap -->
    <div class="bg-yellow-50 p-2.5 rounded-xl border border-yellow-200">
      <span class="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">NAMA LENGKAP PENDIDIK</span>
      <span class="text-base sm:text-lg font-extrabold text-[#ca8a04] block leading-tight mt-0.5">${g.nama}</span>
    </div>

    <!-- Baris 2: Jenis Kelamin & Nomor HP -->
    <div class="grid grid-cols-2 gap-2">
      <div class="bg-gray-50 p-2 rounded-xl border border-gray-200">
        <span class="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">JENIS KELAMIN</span>
        <span class="text-sm sm:text-base font-bold text-[#374151] block mt-0.5">${displayJK}</span>
      </div>
      <div class="bg-gray-50 p-2 rounded-xl border border-gray-200">
        <span class="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">NOMOR HP / WA</span>
        <span class="text-sm sm:text-base font-bold text-[#374151] block mt-0.5 font-mono">${g.noHp || '-'}</span>
      </div>
    </div>

    <!-- Baris 3: Tanggal Lahir Saja -->
    <div class="bg-gray-50 p-2 rounded-xl border border-gray-200">
      <span class="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">TANGGAL LAHIR</span>
      <span class="text-xs sm:text-sm font-semibold text-[#374151] block mt-0.5 leading-snug">${tglLahirBersih}</span>
    </div>

    <!-- Baris 4: Alamat Tinggal -->
    <div class="bg-gray-50 p-2 rounded-xl border border-gray-200">
      <span class="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">ALAMAT TINGGAL</span>
      <span class="text-xs sm:text-sm font-medium text-[#374151] block mt-0.5 leading-snug">${g.alamat || '-'}</span>
    </div>
  `;

  document.getElementById('detailGuruBody').innerHTML = html;
  document.getElementById('detailGuruBackdrop').classList.remove('hidden');
  document.getElementById('detailGuruDrawer').classList.remove('translate-y-full');
  isDetailGuruOpen = true;

  history.pushState({ view: 'guru', modal: true }, '');
}

function closeDetailGuru() {
  if (isDetailGuruOpen) history.back();
}

function hideDetailGuruDOM() {
  document.getElementById('detailGuruBackdrop').classList.add('hidden');
  document.getElementById('detailGuruDrawer').classList.add('translate-y-full');
  isDetailGuruOpen = false;
}

// 4. Unduh Excel Data Guru
function exportExcelGuru() {
  const jmlLaki = guruData.filter(g => g.jk.toLowerCase() === 'laki-laki' || g.jk.toLowerCase() === 'l').length;
  const jmlPerempuan = guruData.filter(g => g.jk.toLowerCase() === 'perempuan' || g.jk.toLowerCase() === 'p').length;
  const totalGuru = guruData.length;

  const worksheetData = [
    ["Data Guru & Tenaga Pendidik"],
    ["SMK Muhammadiyah 5 Karanganyar"],
    ["Tahun Pelajaran 2026/2027"],
    [`Laki-laki: ${jmlLaki} orang | Perempuan: ${jmlPerempuan} orang | Total: ${totalGuru} guru`],
    [],
    ["NO", "NAMA GURU", "JK", "TANGGAL LAHIR", "ALAMAT", "NOMOR HP", "MAPEL DIAMPU"]
  ];

  guruData.forEach((g, idx) => {
    const displayJK = (g.jk.toLowerCase() === 'laki-laki' || g.jk.toLowerCase() === 'l') ? 'Laki-laki' : 'Perempuan';
    const listMapelText = (g.listMapel || []).map(m => m.namaMapel).join(', ') || '-';
    worksheetData.push([
      idx + 1,
      g.nama,
      displayJK,
      getHanyaTglLahir(g.ttl),
      g.alamat,
      g.noHp,
      listMapelText
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(worksheetData);
  ws['!cols'] = [
    { wch: 6 }, { wch: 28 }, { wch: 14 },
    { wch: 20 }, { wch: 35 }, { wch: 18 }, { wch: 35 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data Guru");
  XLSX.writeFile(wb, `Data_Guru_2026_2027.xlsx`);
}

// 5. Cetak PDF Data Guru
function cetakPDFGuru() {
  const optionsDate = { day: 'numeric', month: 'long', year: 'numeric' };
  const tanggalSekarang = new Date().toLocaleDateString('id-ID', optionsDate);

  const jmlLaki = guruData.filter(g => g.jk.toLowerCase() === 'laki-laki' || g.jk.toLowerCase() === 'l').length;
  const jmlPerempuan = guruData.filter(g => g.jk.toLowerCase() === 'perempuan' || g.jk.toLowerCase() === 'p').length;
  const totalGuru = guruData.length;

  let tableRows = '';
  guruData.forEach((g, idx) => {
    const displayJK = (g.jk.toLowerCase() === 'laki-laki' || g.jk.toLowerCase() === 'l') ? 'L' : 'P';
    const listMapelText = (g.listMapel || []).map(m => m.namaMapel).join(', ') || '-';
    tableRows += `
      <tr>
        <td style="text-align: center;">${idx + 1}</td>
        <td style="font-weight: bold;">${g.nama}</td>
        <td style="text-align: center;">${displayJK}</td>
        <td>${getHanyaTglLahir(g.ttl)}</td>
        <td>${g.alamat}</td>
        <td style="text-align: center; font-family: monospace;">${g.noHp}</td>
        <td>${listMapelText}</td>
      </tr>
    `;
  });

  const printContainer = document.getElementById('printableArea');
  printContainer.innerHTML = `
    <div class="print-header">
      DATA GURU & TENAGA PENDIDIK<br>
      SMK MUHAMMADIYAH 5 KARANGANYAR<br>
      TAHUN PELAJARAN 2026/2027
    </div>

    <div class="print-rekap">
      <span><b>Laki-laki:</b> ${jmlLaki} orang</span> &nbsp;|&nbsp;
      <span><b>Perempuan:</b> ${jmlPerempuan} orang</span> &nbsp;|&nbsp;
      <span><b>Total:</b> ${totalGuru} guru</span>
    </div>

    <table class="print-table">
      <thead>
        <tr>
          <th style="width: 4%;">NO</th>
          <th style="width: 22%;">NAMA GURU</th>
          <th style="width: 4%;">JK</th>
          <th style="width: 16%;">TANGGAL LAHIR</th>
          <th style="width: 24%;">ALAMAT</th>
          <th style="width: 12%;">NO HP</th>
          <th style="width: 18%;">MAPEL DIAMPU</th>
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
