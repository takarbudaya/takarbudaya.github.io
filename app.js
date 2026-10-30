/**
 * TAKAR BUDAYA - Tata Kalkulasi Partisipasi Budaya
 * Terintegrasi dalam 1 Halaman (Masing-masing berdiri sendiri):
 * 1. Hitung Penonton (Metode Herbert Jacobs: P = A x D)
 * 2. Hitung Pelaku Seni / Kebudayaan (Akumulasi: Pemeran Utama, Pendukung, Pemusik)
 * Catatan: Keduanya fleksibel dan bisa dikosongi jika tidak ada.
 */

(function () {
  'use strict';

  // --- STATE APLIKASI ---
  const state = {
    tglAcara: '',
    tempatAcara: '',
    namaAcara: '',
    penyelenggaraAcara: '',
    bidangPelaksana: '',

    // --- BAGIAN 1: HITUNG PENONTON (Metode Jacobs: P = A x D) ---
    areaMode: null, // 'quick' | 'custom' | null
    quickAreaVal: null,
    customSubMode: 'pl', // 'pl' | 'total'
    panjang: null,
    lebar: null,
    totalLuasCustom: null,
    activeArea: null, // null = tidak dihitung
    descArea: 'Tidak dihitung / belum diisi',

    density: 1.0,
    densityTitle: 'Sedang / Nyaman (Aman)',
    densityDesc: 'Kondisi normal wajar, penonton leluasa tanpa berdesakan',
    totalPenonton: null, // null = tidak dihitung

    // --- BAGIAN 2: HITUNG PELAKU SENI / KEBUDAYAAN ---
    totalPelakuSeni: null // null = tidak dihitung
  };

  // Helper Elements
  const el = (id) => document.getElementById(id);

  function setElText(id, text) {
    const target = el(id);
    if (target) target.textContent = text;
  }

  function formatIDRNumber(num) {
    if (num === null || num === undefined || isNaN(num)) return '-';
    return new Intl.NumberFormat('id-ID').format(num);
  }

  function formatTanggalID(dateStr) {
    if (!dateStr) return 'Belum ditentukan';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        return d.toLocaleDateString('id-ID', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      }
    } catch (e) {
      console.warn('Format tanggal gagal:', e);
    }
    return dateStr;
  }

  // --- INISIALISASI ---
  function initApp() {
    initDefaultDate();
    bindEventInputs();
    bindAreaControls();
    bindPelakuControls();
    bindActionButtons();
    recalculateAll();
  }

  // Set default tanggal hari ini
  function initDefaultDate() {
    const inputTgl = el('tglAcara');
    if (inputTgl) {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const todayStr = `${yyyy}-${mm}-${dd}`;
      inputTgl.value = todayStr;
      state.tglAcara = todayStr;
    }
  }

  // Bind input tanggal, tempat, acara, penyelenggara, bidang pelaksana
  function bindEventInputs() {
    const inputTgl = el('tglAcara');
    const inputTempat = el('tempatAcara');
    const inputNama = el('namaAcara');
    const inputPenyelenggara = el('penyelenggaraAcara');
    const inputBidang = el('bidangPelaksana');

    if (inputTgl) {
      inputTgl.addEventListener('change', (e) => {
        state.tglAcara = e.target.value;
      });
    }

    if (inputTempat) {
      inputTempat.addEventListener('input', (e) => {
        state.tempatAcara = e.target.value.trim();
      });
    }

    if (inputNama) {
      inputNama.addEventListener('input', (e) => {
        state.namaAcara = e.target.value.trim();
      });
    }

    if (inputPenyelenggara) {
      inputPenyelenggara.addEventListener('input', (e) => {
        state.penyelenggaraAcara = e.target.value.trim();
      });
    }

    if (inputBidang) {
      inputBidang.addEventListener('input', (e) => {
        state.bidangPelaksana = e.target.value.trim();
      });
    }
  }

  // --- KONTROL HITUNG PENONTON (A & D) ---
  function bindAreaControls() {
    const quickBtns = document.querySelectorAll('#quickAreaGroup .quick-btn');
    const customBox = el('customAreaBox');
    const tabPL = el('tabModePL');
    const tabTotal = el('tabModeTotal');
    const panelPL = el('panelPL');
    const panelTotal = el('panelTotal');
    const inputPanjang = el('inputPanjang');
    const inputLebar = el('inputLebar');
    const inputTotalLuas = el('inputTotalLuas');

    quickBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const isAlreadyActive = btn.classList.contains('active');

        // Jika tombol sudah aktif, klik sekali lagi untuk UNCHECK / BATALKAN
        if (isAlreadyActive) {
          btn.classList.remove('active');
          state.areaMode = null;
          state.quickAreaVal = null;
          state.activeArea = null;
          state.descArea = 'Tidak dihitung / belum diisi';
          if (customBox) customBox.style.display = 'none';
          if (inputPanjang) inputPanjang.value = '';
          if (inputLebar) inputLebar.value = '';
          if (inputTotalLuas) inputTotalLuas.value = '';
          recalculateAll();
          return;
        }

        // Jika belum aktif, aktifkan tombol ini dan nonaktifkan yang lain
        quickBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');

        const areaAttr = btn.getAttribute('data-area');
        if (areaAttr === 'custom') {
          state.areaMode = 'custom';
          if (customBox) customBox.style.display = 'block';
          updateCustomArea();
        } else {
          state.areaMode = 'quick';
          if (customBox) customBox.style.display = 'none';
          state.quickAreaVal = parseFloat(areaAttr) || null;
          state.activeArea = state.quickAreaVal;
          state.descArea = `Pilihan luas wilayah ${formatIDRNumber(state.activeArea)} m²`;
          recalculateAll();
        }
      });
    });

    if (tabPL && tabTotal) {
      tabPL.addEventListener('click', () => {
        state.customSubMode = 'pl';
        tabPL.classList.add('active');
        tabTotal.classList.remove('active');
        if (panelPL) panelPL.classList.remove('hidden');
        if (panelTotal) panelTotal.classList.add('hidden');
        updateCustomArea();
      });

      tabTotal.addEventListener('click', () => {
        state.customSubMode = 'total';
        tabTotal.classList.add('active');
        tabPL.classList.remove('active');
        if (panelTotal) panelTotal.classList.remove('hidden');
        if (panelPL) panelPL.classList.add('hidden');
        updateCustomArea();
      });
    }

    if (inputPanjang) {
      inputPanjang.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        state.panjang = !isNaN(val) && val > 0 ? val : null;
        if (state.areaMode === 'custom' && state.customSubMode === 'pl') {
          updateCustomArea();
        }
      });
    }

    if (inputLebar) {
      inputLebar.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        state.lebar = !isNaN(val) && val > 0 ? val : null;
        if (state.areaMode === 'custom' && state.customSubMode === 'pl') {
          updateCustomArea();
        }
      });
    }

    if (inputTotalLuas) {
      inputTotalLuas.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        state.totalLuasCustom = !isNaN(val) && val > 0 ? val : null;
        if (state.areaMode === 'custom' && state.customSubMode === 'total') {
          updateCustomArea();
        }
      });
    }

    function updateCustomArea() {
      if (state.customSubMode === 'pl') {
        if (state.panjang && state.lebar) {
          state.activeArea = Math.round(state.panjang * state.lebar);
          state.descArea = `Ukuran lapangan: ${state.panjang} m × ${state.lebar} m = ${formatIDRNumber(state.activeArea)} m²`;
        } else {
          state.activeArea = null;
          state.descArea = 'Menunggu input panjang & lebar...';
        }
      } else {
        if (state.totalLuasCustom) {
          state.activeArea = Math.round(state.totalLuasCustom);
          state.descArea = `Total luas wilayah: ${formatIDRNumber(state.activeArea)} m²`;
        } else {
          state.activeArea = null;
          state.descArea = 'Menunggu input total luas...';
        }
      }
      recalculateAll();
    }

    // Pilihan Kepadatan (D)
    const groupDensity = el('groupDensity');
    if (groupDensity) {
      const cards = groupDensity.querySelectorAll('.select-card');
      cards.forEach((card) => {
        card.addEventListener('click', () => {
          cards.forEach((c) => c.classList.remove('active'));
          card.classList.add('active');
          state.density = parseFloat(card.getAttribute('data-val')) || 1.0;
          const titleEl = card.querySelector('.select-title');
          const noteEl = card.querySelector('.select-note');
          state.densityTitle = titleEl ? titleEl.textContent.trim() : `${state.density} org/m²`;
          state.densityDesc = noteEl ? noteEl.textContent.trim() : '';
          recalculateAll();
        });
      });
    }
  }

  // --- KONTROL HITUNG PELAKU SENI / KEBUDAYAAN ---
  function bindPelakuControls() {
    const quickBtns = document.querySelectorAll('#quickPelakuGroup .quick-btn');
    const inputPelaku = el('inputPelakuSeni');
    const btnMinus = el('btnPelakuMinus');
    const btnPlus = el('btnPelakuPlus');

    quickBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const isAlreadyActive = btn.classList.contains('active');

        // Jika tombol sudah aktif, klik sekali lagi untuk UNCHECK / BATALKAN
        if (isAlreadyActive) {
          btn.classList.remove('active');
          state.totalPelakuSeni = null;
          if (inputPelaku) inputPelaku.value = '';
          recalculateAll();
          return;
        }

        // Jika belum aktif, aktifkan tombol ini dan nonaktifkan yang lain
        quickBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');

        const count = parseInt(btn.getAttribute('data-count'), 10) || 0;
        state.totalPelakuSeni = count;
        if (inputPelaku) inputPelaku.value = count;
        recalculateAll();
      });
    });

    if (inputPelaku) {
      inputPelaku.addEventListener('input', (e) => {
        const text = e.target.value.trim();
        if (text === '') {
          state.totalPelakuSeni = null;
        } else {
          const val = parseInt(text, 10);
          state.totalPelakuSeni = !isNaN(val) && val >= 0 ? val : null;
        }
        syncQuickPelakuButtons(state.totalPelakuSeni);
        recalculateAll();
      });
    }

    if (btnMinus) {
      btnMinus.addEventListener('click', () => {
        const curr = state.totalPelakuSeni === null ? 0 : state.totalPelakuSeni;
        const next = Math.max(0, curr - 1);
        state.totalPelakuSeni = next;
        if (inputPelaku) inputPelaku.value = next;
        syncQuickPelakuButtons(next);
        recalculateAll();
      });
    }

    if (btnPlus) {
      btnPlus.addEventListener('click', () => {
        const curr = state.totalPelakuSeni === null ? 0 : state.totalPelakuSeni;
        const next = curr + 1;
        state.totalPelakuSeni = next;
        if (inputPelaku) inputPelaku.value = next;
        syncQuickPelakuButtons(next);
        recalculateAll();
      });
    }

    function syncQuickPelakuButtons(val) {
      quickBtns.forEach((b) => {
        if (val === null || val === undefined || val === 0) {
          b.classList.remove('active');
        } else {
          const btnVal = parseInt(b.getAttribute('data-count'), 10);
          b.classList.toggle('active', btnVal === val);
        }
      });
    }
  }

  // --- KALKULASI & UPDATE TAMPILAN ---
  function recalculateAll() {
    // 1. Hitung Penonton (Jacobs: P = A x D)
    const badgeLuasEl = el('badgeLuas');
    const txtTotalPenontonEl = el('txtTotalPenonton');
    const txtUnitPenontonEl = el('txtUnitPenonton');
    const txtFormulaProofEl = el('txtFormulaProof');

    if (state.activeArea !== null && state.activeArea > 0) {
      const A = state.activeArea;
      const D = state.density;
      state.totalPenonton = Math.round(A * D);

      const strA = formatIDRNumber(A);
      const strD = D.toString().replace('.', ',');
      const strTotalPenonton = formatIDRNumber(state.totalPenonton);

      if (badgeLuasEl) badgeLuasEl.textContent = `${strA} m²`;
      if (txtTotalPenontonEl) txtTotalPenontonEl.textContent = strTotalPenonton;
      if (txtUnitPenontonEl) txtUnitPenontonEl.textContent = 'ORANG';
      if (txtFormulaProofEl) txtFormulaProofEl.textContent = `${strA} m² × ${strD} = ${strTotalPenonton} orang`;
    } else {
      state.totalPenonton = null;
      if (badgeLuasEl) badgeLuasEl.textContent = 'Tidak dihitung / belum diisi';
      if (txtTotalPenontonEl) txtTotalPenontonEl.textContent = '-';
      if (txtUnitPenontonEl) txtUnitPenontonEl.textContent = '(TIDAK DIHITUNG)';
      if (txtFormulaProofEl) txtFormulaProofEl.textContent = 'Penonton tidak dihitung / tidak ada';
    }

    // 2. Pelaku Seni / Kebudayaan
    const txtTotalPelakuEl = el('txtTotalPelaku');
    const txtUnitPelakuEl = el('txtUnitPelaku');
    const txtDescPelakuEl = el('txtDescPelaku');

    if (state.totalPelakuSeni !== null && state.totalPelakuSeni >= 0) {
      const strTotalPelaku = formatIDRNumber(state.totalPelakuSeni);
      if (txtTotalPelakuEl) txtTotalPelakuEl.textContent = strTotalPelaku;
      if (txtUnitPelakuEl) txtUnitPelakuEl.textContent = 'ORANG';
      if (txtDescPelakuEl) txtDescPelakuEl.textContent = 'Pemeran Utama, Pendukung, Pemusik';
    } else {
      if (txtTotalPelakuEl) txtTotalPelakuEl.textContent = '-';
      if (txtUnitPelakuEl) txtUnitPelakuEl.textContent = '(TIDAK DIHITUNG)';
      if (txtDescPelakuEl) txtDescPelakuEl.textContent = 'Pelaku seni tidak dihitung / tidak ada';
    }
  }

  // --- TOMBOL AKSI: SALIN WHATSAPP & CETAK PDF ---
  function bindActionButtons() {
    const btnWA = el('btnSalinWA');
    const btnPDF = el('btnCetakPDF');

    if (btnWA) {
      btnWA.addEventListener('click', copyWhatsAppSummary);
    }

    if (btnPDF) {
      btnPDF.addEventListener('click', prepareAndPrintPDF);
    }
  }

  function copyWhatsAppSummary() {
    const strTgl = formatTanggalID(state.tglAcara);

    // Format Blok Penonton
    let blokPenonton = '';
    if (state.totalPenonton !== null) {
      const strA = formatIDRNumber(state.activeArea);
      const strD = state.density.toString().replace('.', ',');
      const strTotalPenonton = formatIDRNumber(state.totalPenonton);
      blokPenonton =
`🌳 *I. ESTIMASI PENONTON (Metode Jacobs: P = A × D)*
• Luas Area Efektif (A) : ${strA} m²
• Kepadatan Penonton (D): ${strD} orang/m² (${state.densityTitle})
• Perhitungan Rumus     : ${strA} m² × ${strD} = *${strTotalPenonton} Orang*
👉 *Estimasi Jumlah Penonton Pertunjukan Seni / Kebudayaan: ${strTotalPenonton} Orang*`;
    } else {
      blokPenonton =
`🌳 *I. ESTIMASI PENONTON (Metode Jacobs: P = A × D)*
👉 *Estimasi Jumlah Penonton Pertunjukan Seni / Kebudayaan: - *`;
    }

    // Format Blok Pelaku Seni
    let blokPelaku = '';
    if (state.totalPelakuSeni !== null) {
      const strTotalPelaku = formatIDRNumber(state.totalPelakuSeni);
      blokPelaku =
`🎭 *II. PELAKU SENI / KEBUDAYAAN*
• Komposisi Peran: Pemeran Utama, Pemain Pendukung, dan Pemusik
👉 *Estimasi Jumlah Pelaku / Pendukung Pertunjukan Seni: ${strTotalPelaku} Orang*`;
    } else {
      blokPelaku =
`🎭 *II. PELAKU SENI / KEBUDAYAAN*
👉 *Estimasi Jumlah Pelaku / Pendukung Pertunjukan Seni: - *`;
    }

    const waText =
`*LAPORAN PENGHITUNGAN PENONTON & PELAKU SENI / KEBUDAYAAN*
🏛️ *TAKAR BUDAYA*
---------------------------------------------
📅 *Tanggal:* ${strTgl}
📍 *Tempat:* ${state.tempatAcara || '-'}
🎪 *Acara:* ${state.namaAcara || '-'}
🏛️ *Penyelenggara:* ${state.penyelenggaraAcara || '-'}
🏢 *Bidang/UPTD:* ${state.bidangPelaksana || '-'}
---------------------------------------------

${blokPenonton}

${blokPelaku}
---------------------------------------------
_Dihitung melalui instrumen bantu Takar Budaya._`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(waText).then(() => {
        showToast();
      }).catch(() => {
        fallbackCopyText(waText);
      });
    } else {
      fallbackCopyText(waText);
    }
  }

  function fallbackCopyText(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      showToast();
    } catch (err) {
      alert('Gagal menyalin pesan otomatis. Silakan salin manual.');
    }
    document.body.removeChild(textarea);
  }

  function showToast() {
    const toast = el('toastCopy');
    if (!toast) return;
    toast.classList.remove('hidden');
    setTimeout(() => {
      toast.classList.add('hidden');
    }, 2800);
  }

  // --- CETAK PDF LAPORAN A4 GABUNGAN ---
  function prepareAndPrintPDF() {
    setElText('pdfTglAcara', formatTanggalID(state.tglAcara));
    setElText('pdfTempatAcara', state.tempatAcara || '-');
    setElText('pdfNamaAcara', state.namaAcara || '-');
    setElText('pdfPenyelenggaraAcara', state.penyelenggaraAcara || '-');
    setElText('pdfBidangPelaksana', state.bidangPelaksana || '-');

    const container = el('pdfDynamicContent');
    if (!container) return;

    // Bagian I: Penonton HTML
    let sectionPenontonHtml = '';
    if (state.totalPenonton !== null) {
      const strA = formatIDRNumber(state.activeArea);
      const strD = state.density.toString().replace('.', ',');
      const strTotalPenonton = formatIDRNumber(state.totalPenonton);

      sectionPenontonHtml = `
        <div class="pdf-section-title">I. ESTIMASI PENONTON &mdash; METODE HERBERT JACOBS (P = A &times; D)</div>
        <table class="pdf-table-data">
          <thead>
            <tr>
              <th style="width: 6%; text-align: center;">No</th>
              <th style="width: 32%;">Parameter Penghitungan</th>
              <th style="width: 12%; text-align: center;">Simbol</th>
              <th style="width: 20%; text-align: right;">Nilai Terukur</th>
              <th style="width: 30%;">Keterangan Lapangan</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="text-align: center;">1</td>
              <td><strong>Luas Area Efektif</strong></td>
              <td style="text-align: center;"><code>A</code></td>
              <td style="text-align: right; font-weight: bold;">${strA} m&sup2;</td>
              <td>${state.descArea}</td>
            </tr>
            <tr>
              <td style="text-align: center;">2</td>
              <td><strong>Kepadatan Penonton</strong></td>
              <td style="text-align: center;"><code>D</code></td>
              <td style="text-align: right; font-weight: bold;">${strD} org/m&sup2;</td>
              <td>${state.densityTitle} &mdash; ${state.densityDesc}</td>
            </tr>
          </tbody>
        </table>
        <div class="pdf-result-card">
          <div class="pdf-calc-line">
            <strong>Perhitungan Rumus (P = A &times; D):</strong> ${strA} m&sup2; &times; ${strD} = ${strTotalPenonton} Orang
          </div>
          <div class="pdf-banner-total">
            <span>Estimasi Jumlah Penonton Pertunjukan Seni / Kebudayaan:</span>
            <strong>${strTotalPenonton} ORANG</strong>
          </div>
        </div>
      `;
    } else {
      sectionPenontonHtml = `
        <div class="pdf-section-title">I. ESTIMASI PENONTON &mdash; METODE HERBERT JACOBS (P = A &times; D)</div>
        <table class="pdf-table-data">
          <tbody>
            <tr>
              <td style="padding: 10pt; color: #555555; font-style: italic;">
                Penonton tidak dihitung pada kegiatan ini (misalnya kegiatan pelatihan, workshop, sarasehan internal, atau tidak terdapat massa penonton terbuka).
              </td>
            </tr>
          </tbody>
        </table>
        <div class="pdf-result-card">
          <div class="pdf-banner-total" style="border-top: none; padding-top: 0;">
            <span>Estimasi Jumlah Penonton Pertunjukan Seni / Kebudayaan:</span>
            <strong style="color: #666666;">-</strong>
          </div>
        </div>
      `;
    }

    // Bagian II: Pelaku Seni HTML
    let sectionPelakuHtml = '';
    if (state.totalPelakuSeni !== null) {
      const strTotalPelaku = formatIDRNumber(state.totalPelakuSeni);

      sectionPelakuHtml = `
        <div class="pdf-section-title">II. PELAKU SENI / KEBUDAYAAN &mdash; KATEGORI PERAN (CLUSTERING)</div>
        <table class="pdf-table-data">
          <thead>
            <tr>
              <th style="width: 6%; text-align: center;">No</th>
              <th style="width: 44%;">Komposisi Peran Terlibat</th>
              <th style="width: 20%; text-align: right;">Jumlah Terdata</th>
              <th style="width: 30%;">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="text-align: center;">1</td>
              <td><strong>Pemeran Utama, Pemain Pendukung, &amp; Pemusik</strong></td>
              <td style="text-align: right; font-weight: bold;">${strTotalPelaku} Orang</td>
              <td>Akumulasi pelaku seni di panggung / acara</td>
            </tr>
          </tbody>
        </table>
        <div class="pdf-result-card">
          <div class="pdf-banner-total" style="border-top: none; padding-top: 0;">
            <span>Estimasi Jumlah Pelaku / Pendukung Pertunjukan Seni:</span>
            <strong>${strTotalPelaku} ORANG</strong>
          </div>
        </div>
      `;
    } else {
      sectionPelakuHtml = `
        <div class="pdf-section-title">II. PELAKU SENI / KEBUDAYAAN &mdash; KATEGORI PERAN (CLUSTERING)</div>
        <table class="pdf-table-data">
          <tbody>
            <tr>
              <td style="padding: 10pt; color: #555555; font-style: italic;">
                Pelaku seni / kebudayaan tidak dihitung pada kegiatan ini (misalnya acara pameran umum atau kegiatan tanpa pementasan seniman).
              </td>
            </tr>
          </tbody>
        </table>
        <div class="pdf-result-card">
          <div class="pdf-banner-total" style="border-top: none; padding-top: 0;">
            <span>Estimasi Jumlah Pelaku / Pendukung Pertunjukan Seni:</span>
            <strong style="color: #666666;">-</strong>
          </div>
        </div>
      `;
    }

    container.innerHTML = sectionPenontonHtml + sectionPelakuHtml;

    setTimeout(() => {
      window.print();
    }, 150);
  }

  // Mulai saat DOM siap
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
})();
