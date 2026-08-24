// GANTI DENGAN URL GAS MASTER ANDA
const GAS_URL_MASTER = "https://script.google.com/macros/s/AKfycbz9_3YbxX5D-baoBMHoz1MykxZKxIMq1tZReLuek_gi97jVVwkbJ1WqEvnBTvAt89OV/exec";

// State Penilaian
let selectedGuru = null;
let selectedMapelObj = null;
let currentNilaiData = [];
let isCPSaved = false; // Status apakah tombol simpan CP sudah ditekan
let activeAsesmen = "uh1"; // uh1 | uh2 | praktek1 | praktek2 | pts | sas
let currentSemester = "ganjil"; // ganjil | genap

// 1. Inisialisasi Deteksi Waktu Server / Waktu Lokal Otomatis
function initRapotView() {
  const currentMonth = new Date().getMonth(); // 0 = Jan, 6 = Jul, 11 = Des
  // Bulan 6 - 11 (Juli - Desember) = Ganjil, Bulan 0 - 5 (Januari - Juni) = Genap
  currentSemester = (currentMonth >= 6 && currentMonth <= 11) ? "ganjil" : "genap";
  
  const labelSemester = document.getElementById('labelSemesterAktif');
  if (labelSemester) {
    labelSemester.innerText = `Semester ${currentSemester.toUpperCase()} (Otomatis)`;
  }

  loadGuruOptions();
}

// 2. Muat Daftar Guru
async function loadGuruOptions() {
  const selectGuru = document.getElementById('selectGuruPenilai');
  if (!selectGuru) return;

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

// 3. Saat Guru Dipilih
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

  if (!selectedGuru.id_spreadsheet) {
    alert(`Peringatan: ID Spreadsheet untuk ${selectedGuru.nama} belum diisi pada database master data (Kolom H)!`);
  }

  selectMapel.innerHTML = '<option value="">-- Pilih Mata Pelajaran --</option>';
  (selectedGuru.listMapel || []).forEach(m => {
    selectMapel.innerHTML += `<option value="${m.idMapel}">${m.namaMapel} (${m.idMapel})</option>`;
  });

  panelKbm.classList.remove('hidden');
}

// 4. Muat Data Siswa & Nilai dari Spreadsheet Guru
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

  if (!siswaData || siswaData.length === 0) {
    if (typeof fetchDataSiswa === 'function') {
      await fetchDataSiswa();
    }
  }

  const filteredSiswa = siswaData.filter(s => s.kelas.toUpperCase() === kelas.toUpperCase());

  let nilaiFromSheet = [];
  let currentCP = "";

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
      console.warn("Gagal mengambil nilai tersimpan:", e);
    }
  }

  document.getElementById('inputCP').value = currentCP;
  // Jika CP sudah ada dari database, otomatis anggap sudah tersimpan
  isCPSaved = currentCP.trim().length > 0;
  updateCPStatusUI();

  currentNilaiData = filteredSiswa.map(s => {
    const existing = nilaiFromSheet.find(n => String(n.nisn) === String(s.nisn));
    return {
      nisn: s.nisn,
      nama: s.nama,
      uh1_ganjil: existing ? existing.uh1_ganjil : '',
      uh2_ganjil: existing ? existing.uh2_ganjil : '',
      praktek1_ganjil: existing ? existing.praktek1_ganjil : '',
      praktek2_ganjil: existing ? existing.praktek2_ganjil : '',
      pts_ganjil: existing ? existing.pts_ganjil : '',
      sas_ganjil: existing ? existing.sas_ganjil : '',
      uh1_genap: existing ? existing.uh1_genap : '',
      uh2_genap: existing ? existing.uh2_genap : '',
      praktek1_genap: existing ? existing.praktek1_genap : '',
      praktek2_genap: existing ? existing.praktek2_genap : '',
      pts_genap: existing ? existing.pts_genap : '',
      sas_genap: existing ? existing.sas_genap : ''
    };
  });

  renderTableNilai();
}

// 5. Validasi & Kunci CP (Syarat Wajib Klik Simpan)
function onCPInputChanged() {
  // Setiap guru mengedit teks CP, status kunci kembali false sampai guru klik simpan
  isCPSaved = false;
  updateCPStatusUI();
}

function simpanCPManual() {
  const cpVal = document.getElementById('inputCP').value.trim();
  if (!cpVal) {
    alert("❌ Capaian Pembelajaran (CP) tidak boleh kosong!");
    isCPSaved = false;
    updateCPStatusUI();
    return;
  }
  isCPSaved = true;
  updateCPStatusUI();
  alert("✅ Capaian Pembelajaran berhasil disimpan & dikunci! Kolom input nilai kini terbuka.");
}

function updateCPStatusUI() {
  const alertLock = document.getElementById('alertLockCP');
  const badgeCP = document.getElementById('badgeStatusCP');

  if (isCPSaved) {
    alertLock.classList.add('hidden');
    badgeCP.innerText = "Tersimpan & Terkunci";
    badgeCP.className = "text-xs font-bold text-green-700 bg-green-100 px-2.5 py-1 rounded-full border border-green-300";
  } else {
    alertLock.classList.remove('hidden');
    badgeCP.innerText = "Wajib Klik Simpan";
    badgeCP.className = "text-xs font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-full border border-red-200";
  }

  renderTableNilai();
}

// 6. Ganti Tab Kategori Asesmen
function setKategoriAsesmen(kategori) {
  activeAsesmen = kategori; // uh1 | uh2 | praktek1 | praktek2 | pts | sas
  
  const buttons = ['uh1', 'uh2', 'praktek1', 'praktek2', 'pts', 'sas'];
  buttons.forEach(b => {
    const el = document.getElementById(`btnTab_${b}`);
    if (el) {
      if (b === kategori) {
        el.className = "py-2 px-2.5 rounded-xl font-bold text-xs sm:text-sm bg-[#15803d] text-white shadow";
      } else {
        el.className = "py-2 px-2.5 rounded-xl font-bold text-xs sm:text-sm bg-gray-100 text-gray-700 hover:bg-gray-200";
      }
    }
  });

  // Tampilkan tombol isi cepat praktek jika sedang membuka tab Praktek 1 atau Praktek 2
  const panelOpsiPraktek = document.getElementById('panelOpsiPraktek');
  if (kategori === 'praktek1' || kategori === 'praktek2') {
    panelOpsiPraktek.classList.remove('hidden');
    document.getElementById('lblTargetPraktek').innerText = kategori === 'praktek1' ? 'Praktek 1 (+5 dari UH 1)' : 'Praktek 2 (+5 dari UH 2)';
  } else {
    panelOpsiPraktek.classList.add('hidden');
  }

  renderTableNilai();
}

// 7. Opsi Cepat Nilai Praktek (+5 dari Nilai Teori / UH)
function autoFillPraktekCepat() {
  if (!isCPSaved) {
    alert("❌ Harap simpan Capaian Pembelajaran (CP) terlebih dahulu!");
    return;
  }

  const fieldKey = `${activeAsesmen}_${currentSemester}`; // praktek1_ganjil / praktek2_ganjil
  const refTeoriKey = activeAsesmen === 'praktek1' ? `uh1_${currentSemester}` : `uh2_${currentSemester}`;

  let filledCount = 0;
  currentNilaiData.forEach(s => {
    const teoriVal = parseFloat(s[refTeoriKey]);
    if (!isNaN(teoriVal) && teoriVal >= 10 && teoriVal <= 100) {
      let praktekVal = Math.min(100, Math.round(teoriVal + 5));
      s[fieldKey] = praktekVal;
      filledCount++;
    }
  });

  if (filledCount === 0) {
    alert(`⚠️ Nilai teori (${activeAsesmen === 'praktek1' ? 'UH 1' : 'UH 2'}) masih kosong. Silakan isi nilai teori terlebih dahulu!`);
    return;
  }

  renderTableNilai();
  alert(`✅ Berhasil mengisi otomatis ${filledCount} nilai praktek (+5 dari nilai teori)!`);
}

// 8. Render Tabel Input Nilai dengan Validasi Range 10-100 & Blokir Simbol
function renderTableNilai() {
  const tbody = document.getElementById('nilaiTableBody');
  const fieldKey = `${activeAsesmen}_${currentSemester}`;

  tbody.innerHTML = '';

  if (currentNilaiData.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-gray-500 font-medium">Tidak ada siswa terdaftar di kelas ini</td></tr>`;
    return;
  }

  currentNilaiData.forEach((s, idx) => {
    const valNilai = s[fieldKey] !== undefined ? s[fieldKey] : '';
    const num = parseFloat(valNilai);
    
    // Status Validasi Range 10 - 100
    let isInvalid = false;
    let statusBadge = `<span class="text-xs text-gray-400 font-medium">Kosong</span>`;
    
    if (valNilai !== '' && valNilai !== null) {
      if (isNaN(num) || num < 10 || num > 100) {
        isInvalid = true;
        statusBadge = `<span class="px-2 py-0.5 rounded text-xs font-extrabold bg-red-600 text-white animate-pulse">Wajib 10-100</span>`;
      } else if (num >= 75) {
        statusBadge = `<span class="px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-700">Tuntas</span>`;
      } else {
        statusBadge = `<span class="px-2 py-0.5 rounded text-xs font-bold bg-yellow-100 text-yellow-800">Remidi</span>`;
      }
    }

    const inputBgBorder = isInvalid 
      ? 'bg-red-50 border-red-500 text-red-600 ring-2 ring-red-400' 
      : (!isCPSaved ? 'bg-gray-200 cursor-not-allowed border-gray-300' : 'bg-white border-gray-300 focus:border-[#15803d]');

    const row = document.createElement('tr');
    row.className = idx % 2 === 0 ? 'bg-white' : 'bg-gray-50';
    row.innerHTML = `
      <td class="p-3 text-center font-bold text-gray-500">${indexSiswa(idx + 1)}</td>
      <td class="p-3 font-mono text-gray-700 text-sm hidden sm:table-cell">${s.nisn}</td>
      <td class="p-3 font-bold text-gray-800 text-sm sm:text-base">${s.nama}</td>
      <td class="p-2 text-center w-28">
        <input 
          type="number" 
          min="10" 
          max="100" 
          step="1"
          value="${valNilai}" 
          ${!isCPSaved ? 'disabled' : ''} 
          onkeydown="filterHanyaAngka(event)"
          oninput="onInputNilaiChange('${s.nisn}', this.value, this)"
          placeholder="10-100"
          class="w-24 p-2 text-center font-bold text-base border-2 rounded-lg focus:outline-none ${inputBgBorder}"
        />
      </td>
      <td class="p-3 text-center">${statusBadge}</td>
    `;
    tbody.appendChild(row);
  });
}

function indexSiswa(num) {
  return num;
}

// 9. Cegah Simbol Khas Keyboard (+, -, e, E, titik, koma)
function filterHanyaAngka(e) {
  if (["e", "E", "+", "-", ".", ","].includes(e.key)) {
    e.preventDefault();
  }
}

// 10. Handler Nilai Berubah + Validasi Real-time
function onInputNilaiChange(nisn, rawVal, inputElem) {
  const cleanVal = rawVal.replace(/[^0-9]/g, '');
  const fieldKey = `${activeAsesmen}_${currentSemester}`;
  const siswa = currentNilaiData.find(s => String(s.nisn) === String(nisn));

  if (siswa) {
    siswa[fieldKey] = cleanVal !== '' ? parseInt(cleanVal, 10) : '';
  }

  // Validasi visual langsung tanpa re-render seluruh tabel agar fokus keyboard tidak lepas
  const num = parseInt(cleanVal, 10);
  if (cleanVal !== '' && (isNaN(num) || num < 10 || num > 100)) {
    inputElem.className = "w-24 p-2 text-center font-bold text-base border-2 rounded-lg focus:outline-none bg-red-50 border-red-500 text-red-600 ring-2 ring-red-400";
  } else {
    inputElem.className = "w-24 p-2 text-center font-bold text-base border-2 rounded-lg focus:outline-none bg-white border-gray-300 focus:border-[#15803d]";
  }
}

// 11. Simpan Seluruh Nilai ke Google Sheets Guru
async function simpanSemuaNilai() {
  if (!isCPSaved) {
    alert("❌ Gagal: Anda belum menyimpan dan mengunci Capaian Pembelajaran (CP)!");
    return;
  }

  const cpVal = document.getElementById('inputCP').value.trim();

  // Validasi: pastikan tidak ada nilai di luar rentang 10 - 100
  let adaNilaiInvalid = false;
  const listKategori = ['uh1', 'uh2', 'praktek1', 'praktek2', 'pts', 'sas'];
  
  for (const s of currentNilaiData) {
    for (const kat of listKategori) {
      const v = s[`${kat}_${currentSemester}`];
      if (v !== '' && v !== null && v !== undefined) {
        const num = parseFloat(v);
        if (isNaN(num) || num < 10 || num > 100) {
          adaNilaiInvalid = true;
          break;
        }
      }
    }
    if (adaNilaiInvalid) break;
  }

  if (adaNilaiInvalid) {
    alert("❌ Gagal Menyimpan: Terdapat nilai yang di luar rentang (Wajib antara 10 sampai 100). Periksa kotak bertanda merah!");
    renderTableNilai();
    return;
  }

  if (!selectedGuru || !selectedGuru.id_spreadsheet) {
    alert("❌ Gagal: ID Spreadsheet guru tidak ditemukan di database!");
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
      alert("✅ Berhasil: Seluruh nilai ulangan, praktek, PTS, SAS, dan CP tersimpan rapi di Google Sheet pribadi guru!");
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

// 12. Unduh Excel Nilai (Struktur Komprehensif Sesuai Semester Aktif)
function exportExcelNilai() {
  if (currentNilaiData.length === 0) {
    alert("Data nilai masih kosong.");
    return;
  }

  const kelas = document.getElementById('selectKelasNilai').value;
  const cpVal = document.getElementById('inputCP').value.trim();
  const sem = currentSemester.toUpperCase();

  const worksheetData = [
    ["REKAPITULASI PENILAIAN SISWA"],
    ["SMK Muhammadiyah 5 Karanganyar"],
    [`Tahun Pelajaran 2026/2027 - SEMESTER ${sem}`],
    [`Guru Pengampu : ${selectedGuru ? selectedGuru.nama : '-'}`],
    [`Mata Pelajaran: ${selectedMapelObj ? selectedMapelObj.namaMapel : '-'} | Kelas: ${kelas}`],
    [`Capaian Pembelajaran: ${cpVal || '-'}`],
    [],
    ["NO", "NISN", "NAMA SISWA", "UH 1", "UH 2", "PRAKTEK 1", "PRAKTEK 2", "PTS", "SAS"]
  ];

  currentNilaiData.forEach((s, idx) => {
    worksheetData.push([
      idx + 1,
      s.nisn,
      s.nama,
      s[`uh1_${currentSemester}`] || '',
      s[`uh2_${currentSemester}`] || '',
      s[`praktek1_${currentSemester}`] || '',
      s[`praktek2_${currentSemester}`] || '',
      s[`pts_${currentSemester}`] || '',
      s[`sas_${currentSemester}`] || ''
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(worksheetData);
  ws['!cols'] = [
    { wch: 6 }, { wch: 15 }, { wch: 28 }, { wch: 10 },
    { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 10 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `Nilai_${sem}`);
  XLSX.writeFile(wb, `Nilai_${selectedMapelObj.namaMapel}_${kelas}_Sem_${sem}.xlsx`);
}
