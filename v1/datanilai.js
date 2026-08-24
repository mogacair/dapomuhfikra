// GANTI DENGAN URL GAS MASTER PENILAIAN ANDA
const GAS_URL_MASTER = "https://script.google.com/macros/s/AKfycbz9_3YbxX5D-baoBMHoz1MykxZKxIMq1tZReLuek_gi97jVVwkbJ1WqEvnBTvAt89OV/exec";

// State Penilaian
let selectedGuru = null;
let selectedMapelObj = null;
let currentNilaiData = []; // [{ nisn, nama, pts_ganjil, sas_ganjil, pts_genap, sas_genap }]
let currentCP = "";
let activeAsesmen = "pts_ganjil"; // pts_ganjil | sas_ganjil | pts_genap | sas_genap

// Inisialisasi Tampilan Rapot / Penilaian
async function initRapotView() {
  await loadGuruOptions();
}

// 1. Ambil & Tampilkan Daftar Guru di Dropdown
async function loadGuruOptions() {
  const selectGuru = document.getElementById('selectGuruPenilai');
  if (!selectGuru) return;

  // Jika guruData di dataguru.js belum terisi, ambil via GAS
  if (!guruData || guruData.length === 0) {
    selectGuru.innerHTML = '<option value="">⏳ Memuat data guru...</option>';
    try {
      const res = await fetch(GAS_URL_MASTER);
      const result = await res.json();
      if (result.status === 'success') {
        guruData = result.data;
      }
    } catch (e) {
      console.error(e);
      selectGuru.innerHTML = '<option value="">Gagal memuat daftar guru</option>';
      return;
    }
  }

  selectGuru.innerHTML = '<option value="">-- Pilih Nama Guru --</option>';
  guruData.forEach(g => {
    selectGuru.innerHTML += `<option value="${g.idGuru}">${g.nama}</option>`;
  });
}

// 2. Saat Guru Dipilih -> Tampilkan Mapel yang Diampu
function onGuruSelected() {
  const idGuru = document.getElementById('selectGuruPenilai').value;
  const selectMapel = document.getElementById('selectMapelGuru');
  const panelKbm = document.getElementById('panelKbmNilai');
  const panelFormNilai = document.getElementById('panelFormNilai');

  panelFormNilai.classList.add('hidden');

  if (!idGuru) {
    panelKbm.classList.add('hidden');
    selectedGuru = null;
    return;
  }

  selectedGuru = guruData.find(g => String(g.idGuru) === String(idGuru));
  if (!selectedGuru) return;

  // Cek apakah guru sudah punya ID Spreadsheet di kolom H
  if (!selectedGuru.id_spreadsheet) {
    alert(`Peringatan: ID Spreadsheet untuk ${selectedGuru.nama} belum diisi pada database master data (Kolom H)!`);
  }

  selectMapel.innerHTML = '<option value="">-- Pilih Mata Pelajaran --</option>';
  (selectedGuru.listMapel || []).forEach(m => {
    selectMapel.innerHTML += `<option value="${m.idMapel}">${m.namaMapel} (${m.idMapel})</option>`;
  });

  panelKbm.classList.remove('hidden');
}

// 3. Saat Mapel atau Kelas Dipilih -> Muat Data Siswa & Nilai dari GAS
async function muatDataPenilaian() {
  const selectMapel = document.getElementById('selectMapelGuru');
  const selectKelas = document.getElementById('selectKelasNilai');
  const idMapel = selectMapel.value;
  const kelas = selectKelas.value;

  if (!selectedGuru || !idMapel || !kelas) {
    document.getElementById('panelFormNilai').classList.add('hidden');
    return;
  }

  selectedMapelObj = (selectedGuru.listMapel || []).find(m => String(m.idMapel) === String(idMapel));
  
  const panelFormNilai = document.getElementById('panelFormNilai');
  const tbody = document.getElementById('nilaiTableBody');
  panelFormNilai.classList.remove('hidden');
  tbody.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-gray-500 font-medium animate-pulse">Sedang sinkronisasi data siswa & nilai...</td></tr>`;

  // Pastikan database siswa sudah dimuat
  if (!siswaData || siswaData.length === 0) {
    if (typeof fetchDataSiswa === 'function') {
      await fetchDataSiswa();
    }
  }

  // Filter siswa sesuai kelas yang dipilih
  const filteredSiswa = siswaData.filter(s => s.kelas.toUpperCase() === kelas.toUpperCase());

  // Ambil nilai dan CP dari spreadsheet guru yang bersangkutan
  let nilaiFromSheet = [];
  currentCP = "";

  if (selectedGuru.id_spreadsheet) {
    try {
      const url = `${GAS_URL_MASTER}?action=getNilai&id_spreadsheet=${selectedGuru.id_spreadsheet}&tahun=2026_2027&id_mapel=${encodeURIComponent(idMapel)}&kelas=${encodeURIComponent(kelas)}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.status === 'success') {
        nilaiFromSheet = json.data || [];
        currentCP = json.cp || (selectedMapelObj ? selectedMapelObj.capaian : '') || '';
      }
    } catch (e) {
      console.warn("Gagal mengambil nilai tersimpan, menggunakan input baru:", e);
    }
  }

  // Set input CP
  document.getElementById('inputCP').value = currentCP;
  updateCPStatusLock();

  // Gabungkan daftar siswa kelas tersebut dengan nilai yang ada di sheet
  currentNilaiData = filteredSiswa.map(s => {
    const existing = nilaiFromSheet.find(n => String(n.nisn) === String(s.nisn));
    return {
      nisn: s.nisn,
      nama: s.nama,
      pts_ganjil: existing ? existing.pts_ganjil : '',
      sas_ganjil: existing ? existing.sas_ganjil : '',
      pts_genap: existing ? existing.pts_genap : '',
      sas_genap: existing ? existing.sas_genap : ''
    };
  });

  renderTableNilai();
}

// 4. Update Status Kunci CP (Validasi Wajib Isi CP Terlebih Dahulu)
function updateCPStatusLock() {
  const cpVal = document.getElementById('inputCP').value.trim();
  const alertLock = document.getElementById('alertLockCP');
  const isLocked = cpVal.length === 0;

  if (isLocked) {
    alertLock.classList.remove('hidden');
  } else {
    alertLock.classList.add('hidden');
  }

  // Render ulang tabel untuk enable/disable input nilai
  renderTableNilai();
}

function simpanCPManual() {
  const cpVal = document.getElementById('inputCP').value.trim();
  if (!cpVal) {
    alert("Capaian Pembelajaran (CP) tidak boleh kosong!");
    return;
  }
  currentCP = cpVal;
  updateCPStatusLock();
  alert("Capaian Pembelajaran berhasil ditetapkan! Kolom input nilai kini aktif.");
}

// 5. Ganti Tab Kategori Asesmen (PTS Ganjil / SAS Ganjil / PTS Genap / SAS Genap)
function setKategoriAsesmen(kategori) {
  activeAsesmen = kategori;
  
  // Highlight tab tombol
  const buttons = ['pts_ganjil', 'sas_ganjil', 'pts_genap', 'sas_genap'];
  buttons.forEach(b => {
    const el = document.getElementById(`btnTab_${b}`);
    if (el) {
      if (b === kategori) {
        el.className = "py-2.5 px-3 rounded-xl font-bold text-sm sm:text-base bg-[#15803d] text-white shadow";
      } else {
        el.className = "py-2.5 px-3 rounded-xl font-bold text-sm sm:text-base bg-gray-100 text-gray-700 hover:bg-gray-200";
      }
    }
  });

  renderTableNilai();
}

// 6. Render Baris Input Nilai Siswa
function renderTableNilai() {
  const tbody = document.getElementById('nilaiTableBody');
  const cpVal = document.getElementById('inputCP').value.trim();
  const isCPFilled = cpVal.length > 0;

  tbody.innerHTML = '';

  if (currentNilaiData.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-gray-500 font-medium">Tidak ada siswa terdaftar di kelas ini</td></tr>`;
    return;
  }

  currentNilaiData.forEach((s, idx) => {
    const valNilai = s[activeAsesmen] || '';
    const num = parseFloat(valNilai);
    let statusBadge = `<span class="text-xs text-gray-400 font-medium">Belum Diisi</span>`;
    
    if (!isNaN(num)) {
      if (num >= 75) {
        statusBadge = `<span class="px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-700">Tuntas</span>`;
      } else {
        statusBadge = `<span class="px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700">Remidi</span>`;
      }
    }

    const row = document.createElement('tr');
    row.className = idx % 2 === 0 ? 'bg-white' : 'bg-gray-50';
    row.innerHTML = `
      <td class="p-3 text-center font-bold text-gray-500">${idx + 1}</td>
      <td class="p-3 font-mono text-gray-700 text-sm hidden sm:table-cell">${s.nisn}</td>
      <td class="p-3 font-bold text-gray-800 text-sm sm:text-base">${s.nama}</td>
      <td class="p-2 text-center w-28">
        <input 
          type="number" 
          min="0" 
          max="100" 
          value="${valNilai}" 
          ${!isCPFilled ? 'disabled' : ''} 
          onchange="onInputNilaiChange('${s.nisn}', this.value)"
          placeholder="0-100"
          class="w-20 p-2 text-center font-bold text-base border-2 rounded-lg focus:outline-none focus:border-[#15803d] ${!isCPFilled ? 'bg-gray-200 cursor-not-allowed border-gray-300' : 'bg-white border-gray-300'}"
        />
      </td>
      <td class="p-3 text-center">${statusBadge}</td>
    `;
    tbody.appendChild(row);
  });
}

// 7. Simpan Nilai ke State Lokal saat diisi
function onInputNilaiChange(nisn, val) {
  const siswa = currentNilaiData.find(s => String(s.nisn) === String(nisn));
  if (siswa) {
    siswa[activeAsesmen] = val;
  }
}

// 8. Simpan Semua Nilai ke Google Sheets Guru (Batch Request)
async function simpanSemuaNilai() {
  const cpVal = document.getElementById('inputCP').value.trim();
  if (!cpVal) {
    alert("Harap isi Capaian Pembelajaran (CP) terlebih dahulu sebelum menyimpan!");
    return;
  }

  if (!selectedGuru || !selectedGuru.id_spreadsheet) {
    alert("Gagal: ID Spreadsheet guru tidak ditemukan!");
    return;
  }

  const btn = document.getElementById('btnSimpanNilai');
  btn.disabled = true;
  btn.innerText = "⏳ Sedang Menyimpan ke Google Sheet...";

  const payload = {
    id_spreadsheet: selectedGuru.id_spreadsheet,
    tahun: "2026_2027",
    id_mapel: selectedMapelObj.idMapel,
    nama_mapel: selectedMapelObj.namaMapel,
    kelas: document.getElementById('selectKelasNilai').value,
    cp: cpVal,
    list_nilai: currentNilaiData
  };

  try {
    const res = await fetch(GAS_URL_MASTER, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload)
    });
    const result = await res.json();

    if (result.status === 'success') {
      alert("✅ Berhasil: Seluruh nilai dan Capaian Pembelajaran tersimpan di Google Sheet pribadi guru!");
      renderTableNilai();
    } else {
      throw new Error(result.message);
    }
  } catch (err) {
    console.error(err);
    alert("❌ Terjadi kesalahan saat menyimpan ke Google Sheet: " + err.toString());
  } finally {
    btn.disabled = false;
    btn.innerText = "💾 SIMPAN SELURUH NILAI KE GOOGLE SHEET";
  }
}

// 9. Export Excel Nilai
function exportExcelNilai() {
  if (currentNilaiData.length === 0) {
    alert("Data nilai masih kosong.");
    return;
  }

  const kelas = document.getElementById('selectKelasNilai').value;
  const cpVal = document.getElementById('inputCP').value.trim();

  const worksheetData = [
    ["REKAP NILAI & CAPAIAN PEMBELAJARAN"],
    ["SMK Muhammadiyah 5 Karanganyar"],
    [`Guru Pengampu : ${selectedGuru ? selectedGuru.nama : '-'}`],
    [`Mata Pelajaran: ${selectedMapelObj ? selectedMapelObj.namaMapel : '-'} | Kelas: ${kelas}`],
    [`Capaian Pembelajaran: ${cpVal}`],
    [],
    ["NO", "NISN", "NAMA SISWA", "PTS GANJIL", "SAS GANJIL", "PTS GENAP", "SAS GENAP"]
  ];

  currentNilaiData.forEach((s, idx) => {
    worksheetData.push([
      idx + 1,
      s.nisn,
      s.nama,
      s.pts_ganjil || '',
      s.sas_ganjil || '',
      s.pts_genap || '',
      s.sas_genap || ''
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(worksheetData);
  ws['!cols'] = [{ wch: 6 }, { wch: 15 }, { wch: 28 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Nilai");
  XLSX.writeFile(wb, `Nilai_${selectedMapelObj.namaMapel}_${kelas}.xlsx`);
}

// 10. Cetak PDF Rekap Nilai
function cetakPDFNilai() {
  if (currentNilaiData.length === 0) {
    alert("Data nilai masih kosong.");
    return;
  }

  const kelas = document.getElementById('selectKelasNilai').value;
  const cpVal = document.getElementById('inputCP').value.trim();
  const tanggalSekarang = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  let tableRows = '';
  currentNilaiData.forEach((s, idx) => {
    tableRows += `
      <tr>
        <td style="text-align: center;">${idx + 1}</td>
        <td style="text-align: center; font-family: monospace;">${s.nisn}</td>
        <td style="font-weight: bold;">${s.nama}</td>
        <td style="text-align: center; font-weight: bold;">${s.pts_ganjil || '-'}</td>
        <td style="text-align: center; font-weight: bold;">${s.sas_ganjil || '-'}</td>
        <td style="text-align: center; font-weight: bold;">${s.pts_genap || '-'}</td>
        <td style="text-align: center; font-weight: bold;">${s.sas_genap || '-'}</td>
      </tr>
    `;
  });

  const printContainer = document.getElementById('printableArea');
  printContainer.innerHTML = `
    <div class="print-header">
      REKAPITULASI PENILAIAN SISWA<br>
      SMK MUHAMMADIYAH 5 KARANGANYAR<br>
      TAHUN PELAJARAN 2026/2027
    </div>

    <div style="font-size: 10pt; line-height: 1.5; margin-bottom: 12px;">
      <div><b>Guru Pengampu:</b> ${selectedGuru.nama} &nbsp;|&nbsp; <b>Mata Pelajaran:</b> ${selectedMapelObj.namaMapel} &nbsp;|&nbsp; <b>Kelas:</b> ${kelas}</div>
      <div style="margin-top: 3px;"><b>Capaian Pembelajaran:</b> ${cpVal || '-'}</div>
    </div>

    <table class="print-table">
      <thead>
        <tr>
          <th style="width: 5%;">NO</th>
          <th style="width: 15%;">NISN</th>
          <th style="width: 32%;">NAMA SISWA</th>
          <th style="width: 12%;">PTS GANJIL</th>
          <th style="width: 12%;">SAS GANJIL</th>
          <th style="width: 12%;">PTS GENAP</th>
          <th style="width: 12%;">SAS GENAP</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>

    <div class="print-ttd-wrap">
      <div class="print-ttd">
        <div>Karanganyar, ${tanggalSekarang}</div>
        <div style="margin-top: 4px;">Guru Mata Pelajaran,</div>
        <div style="height: 60px;"></div>
        <div style="font-weight: bold; text-decoration: underline;">${selectedGuru.nama}</div>
      </div>
      <div style="clear: both;"></div>
    </div>
  `;

  window.print();
}
