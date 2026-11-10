/**
 * Export riwayat ke Excel, mengikuti format
 * "FORM PERMOHONAN DATA UNTUK PEMENUHAN TARGET DAERAH":
 * - satu sheet per Bidang / UPTD (urut seperti BIDANG_OPTIONS), tiap kegiatan 4 baris
 *   (Tanggal / Tempat / Penyelenggaran / Acara),
 * - kegiatan internal -> kolom C & D, undangan luar dinas -> kolom E & F,
 * - baris JUMLAH (rumus SUM),
 * - sheet "Rekapitulasi": jumlah per Bidang / UPTD (rumus yang merujuk baris JUMLAH tiap sheet).
 *
 * ExcelJS dimuat lazy (besar) dan dioper sebagai parameter ke buildWorkbook
 * agar fungsi ini juga bisa diuji di Node.
 */
import { BIDANG_OPTIONS } from '../data/options.js';
import { formatTanggalID, todayISO } from './format.js';

const TITLE = 'DATA PARTISIPASI MASYARAKAT GUNA MENDUKUNG INDIKATOR PROGRAM KEBUDAYAAN URUSAN KEISTIMEWAAN';
const REKAP_SHEET = 'Rekapitulasi';
const FONT_NAME = 'Aptos Display';
const NUM_FMT = '#,##0';
const FIRST_DATA_ROW = 6;
const ROWS_PER_EVENT = 4;

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const thin = { style: 'thin' };
const thick = { style: 'thick' };
const font = (extra = {}) => ({ name: FONT_NAME, size: 11, ...extra });
const BOLD = font({ bold: true });
const REGULAR = font();

/** "November 2026", "Oktober – November 2026", atau "Desember 2025 – Januari 2026". */
export function bulanLabel(rows) {
  if (!rows.length) return '-';
  const dates = rows.map((r) => r.tgl_acara).sort();
  const [y1, m1] = dates[0].split('-').map(Number);
  const [y2, m2] = dates[dates.length - 1].split('-').map(Number);
  if (y1 === y2 && m1 === m2) return `${MONTHS[m1 - 1]} ${y1}`;
  if (y1 === y2) return `${MONTHS[m1 - 1]} – ${MONTHS[m2 - 1]} ${y1}`;
  return `${MONTHS[m1 - 1]} ${y1} – ${MONTHS[m2 - 1]} ${y2}`;
}

/** Nilai kolom C–F untuk satu kegiatan (pelaku kosong ditulis 0). */
function eventValues(row) {
  const pengunjung = Number(row.total_penonton) || 0;
  const seniman = row.total_pelaku == null ? 0 : Number(row.total_pelaku);
  if (row.acara_internal === true) return { C: pengunjung, D: seniman, E: null, F: null };
  if (row.acara_internal === false) return { C: null, D: null, E: pengunjung, F: seniman };
  return { C: null, D: null, E: null, F: null }; // data lama: jenis acara belum diisi
}

/**
 * Bingkai satu sel atau satu rentang yang di-merge.
 * ExcelJS memakai SATU style untuk semua sel dalam rentang merge, jadi bingkai harus lengkap
 * (atas, bawah, kiri, kanan) sekaligus. Kalau ditulis per sel, tulisan terakhir menimpa yang lain
 * (mis. garis atas A4:A5 hilang karena tertimpa style A5).
 */
function setBorder(ws, range, { top, bottom, left = thick, right = thick }) {
  const [start, end] = range.split(':');
  const s = ws.getCell(start);
  const e = ws.getCell(end ?? start);
  const box = { top, bottom, left, right };
  for (let r = s.row; r <= e.row; r++) {
    for (let c = s.col; c <= e.col; c++) {
      ws.getCell(r, c).border = { ...box };
    }
  }
}

function headerCell(ws, address, text) {
  const cell = ws.getCell(address);
  cell.value = text;
  cell.font = BOLD;
  cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
}

function pageSetup() {
  return {
    paperSize: 9, // A4
    orientation: 'portrait',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    printTitlesRow: '4:5',
    margins: { left: 0.5, right: 0.5, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 }
  };
}

/** Satu sheet Bidang / UPTD. Mengembalikan posisi baris JUMLAH & totalnya (untuk Rekapitulasi). */
function addBidangSheet(wb, bidang, rows) {
  const ws = wb.addWorksheet(bidang, {
    views: [{ state: 'frozen', ySplit: 5 }],
    pageSetup: pageSetup()
  });
  ws.columns = [
    { width: 8.73 }, // A No.
    { width: 48 }, // B Nama Kegiatan/Acara (lebih lebar dari template karena berisi nilai)
    { width: 25.18 }, // C Internal: pengunjung
    { width: 20 }, // D Internal: seniman
    { width: 24.91 }, // E Luar dinas: pengunjung
    { width: 20.27 } // F Luar dinas: seniman
  ];

  // Judul & identitas
  ws.mergeCells('A1:F1');
  headerCell(ws, 'A1', TITLE);
  ['A1', 'B1', 'C1', 'D1', 'E1', 'F1'].forEach((a) => (ws.getCell(a).border = { bottom: thin }));
  ws.getCell('A2').value = `Bidang / UPTD : ${bidang}`;
  ws.getCell('A3').value = `Bulan : ${bulanLabel(rows)}`;
  ['A2', 'A3'].forEach((a) => {
    ws.getCell(a).font = BOLD;
    ws.getCell(a).alignment = { horizontal: 'left' };
  });

  // Header tabel (baris 4–5)
  ws.mergeCells('A4:A5');
  ws.mergeCells('B4:B5');
  ws.mergeCells('C4:D4');
  ws.mergeCells('E4:F4');
  headerCell(ws, 'A4', 'No.');
  headerCell(ws, 'B4', 'Nama Kegiatan/Acara');
  headerCell(ws, 'C4', 'Kegiatan Internal Dinas');
  headerCell(ws, 'E4', 'Acara Eksternal Dinas');
  headerCell(ws, 'C5', 'Estimasi Jumlah Penonton Pertunjukan Seni/Kebudayaan (Orang)');
  headerCell(ws, 'D5', 'Jumlah Pelaku/Pendukung Pertunjukan Seni/Budaya (Orang)');
  headerCell(ws, 'E5', 'Estimasi Jumlah Penonton Pertunjukan Seni/Kebudayaan (Orang)');
  headerCell(ws, 'F5', 'Jumlah Pelaku/Pendukung Pertunjukan Seni/Budaya (Orang)');
  ws.getRow(4).height = 20; // judul kelompok muat 1 baris
  ws.getRow(5).height = 80; // judul kolom C–F terbungkus hingga 5 baris
  for (const range of ['A4:A5', 'B4:B5', 'C4:D4', 'E4:F4', 'C5', 'D5', 'E5', 'F5']) {
    setBorder(ws, range, { top: thick, bottom: thick });
  }

  // Satu blok 4 baris per kegiatan
  const sums = { C: 0, D: 0, E: 0, F: 0 };
  rows.forEach((row, i) => {
    const top = FIRST_DATA_ROW + i * ROWS_PER_EVENT;
    const bottom = top + ROWS_PER_EVENT - 1;

    ws.mergeCells(`A${top}:A${bottom}`);
    const no = ws.getCell(`A${top}`);
    no.value = i + 1;
    no.font = BOLD;
    no.alignment = { horizontal: 'center', vertical: 'middle' };
    setBorder(ws, `A${top}:A${bottom}`, { top: thick, bottom: thick });

    const lines = [
      ['Tanggal : ', formatTanggalID(row.tgl_acara)],
      ['Tempat : ', row.tempat_acara || '-'],
      ['Penyelenggaran : ', row.penyelenggara || '-'],
      [
        'Acara : ',
        (row.nama_acara || '-') + (row.acara_internal == null ? ' (jenis acara internal/luar belum diisi)' : '')
      ]
    ];
    lines.forEach(([label, value], k) => {
      const cell = ws.getCell(`B${top + k}`);
      cell.value = { richText: [{ text: label, font: BOLD }, { text: value, font: REGULAR }] };
      cell.alignment = { vertical: 'top', wrapText: true };
      cell.border = {
        left: thick,
        right: thick,
        top: k === 0 ? thick : thin,
        bottom: k === ROWS_PER_EVENT - 1 ? thick : thin
      };
    });

    const values = eventValues(row);
    for (const col of ['C', 'D', 'E', 'F']) {
      ws.mergeCells(`${col}${top}:${col}${bottom}`);
      const cell = ws.getCell(`${col}${top}`);
      cell.value = values[col];
      cell.numFmt = NUM_FMT;
      cell.font = REGULAR;
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      setBorder(ws, `${col}${top}:${col}${bottom}`, { top: thick, bottom: thick });
      sums[col] += values[col] ?? 0;
    }
  });

  // Baris JUMLAH
  const lastDataRow = FIRST_DATA_ROW + rows.length * ROWS_PER_EVENT - 1;
  const jumlahRow = lastDataRow + 1;
  ws.getCell(`B${jumlahRow}`).value = 'JUMLAH';
  ws.getCell(`B${jumlahRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
  for (const col of ['C', 'D', 'E', 'F']) {
    const cell = ws.getCell(`${col}${jumlahRow}`);
    cell.value = { formula: `SUM(${col}${FIRST_DATA_ROW}:${col}${lastDataRow})`, result: sums[col] };
    cell.numFmt = NUM_FMT;
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  }
  for (const col of ['A', 'B', 'C', 'D', 'E', 'F']) {
    ws.getCell(`${col}${jumlahRow}`).font = BOLD;
    setBorder(ws, `${col}${jumlahRow}`, { top: thick, bottom: thick });
  }
  ws.getRow(jumlahRow).height = 18;

  return { bidang, count: rows.length, lastDataRow, jumlahRow, sums };
}

/** Sheet ringkasan: jumlah per Bidang / UPTD, dirujuk lewat rumus ke baris JUMLAH tiap sheet. */
function addRekapSheet(wb, sheets, allRows) {
  const ws = wb.addWorksheet(REKAP_SHEET, {
    views: [{ state: 'frozen', ySplit: 5 }],
    pageSetup: { ...pageSetup(), orientation: 'landscape' }
  });
  ws.columns = [
    { width: 6 }, // A No.
    { width: 22 }, // B Bidang / UPTD
    { width: 13 }, // C Jumlah kegiatan
    { width: 20 }, // D Internal pengunjung
    { width: 21 }, // E Internal seniman
    { width: 20 }, // F Luar pengunjung
    { width: 21 }, // G Luar seniman
    { width: 20 }, // H Total pengunjung
    { width: 21 } // I Total seniman
  ];

  ws.mergeCells('A1:I1');
  headerCell(ws, 'A1', `REKAPITULASI ${TITLE}`);
  ['A1', 'B1', 'C1', 'D1', 'E1', 'F1', 'G1', 'H1', 'I1'].forEach((a) => (ws.getCell(a).border = { bottom: thin }));
  ws.getRow(1).height = 32;
  ws.getCell('A2').value = `Bulan : ${bulanLabel(allRows)}`;
  ws.getCell('A2').font = BOLD;

  for (const m of ['A4:A5', 'B4:B5', 'C4:C5', 'D4:E4', 'F4:G4', 'H4:I4']) ws.mergeCells(m);
  headerCell(ws, 'A4', 'No.');
  headerCell(ws, 'B4', 'Bidang / UPTD');
  headerCell(ws, 'C4', 'Jumlah Kegiatan');
  headerCell(ws, 'D4', 'Kegiatan Internal Dinas');
  headerCell(ws, 'F4', 'Acara Eksternal Dinas');
  headerCell(ws, 'H4', 'Total');
  for (const col of ['D', 'F', 'H']) headerCell(ws, `${col}5`, 'Penonton Pertunjukan Seni/Kebudayaan (Orang)');
  for (const col of ['E', 'G', 'I']) headerCell(ws, `${col}5`, 'Pelaku/Pendukung Pertunjukan Seni/Budaya (Orang)');
  ws.getRow(4).height = 20; // judul kelompok muat 1 baris
  ws.getRow(5).height = 64; // judul kolom D–I terbungkus hingga 4 baris
  for (const range of ['A4:A5', 'B4:B5', 'C4:C5', 'D4:E4', 'F4:G4', 'H4:I4', 'D5', 'E5', 'F5', 'G5', 'H5', 'I5']) {
    setBorder(ws, range, { top: thick, bottom: thick });
  }

  const ref = (name, cell) => `'${name.replace(/'/g, "''")}'!${cell}`;
  const first = 6;
  sheets.forEach((s, i) => {
    const r = first + i;
    const internalP = s.sums.C;
    const internalS = s.sums.D;
    const luarP = s.sums.E;
    const luarS = s.sums.F;
    ws.getCell(`A${r}`).value = i + 1;
    ws.getCell(`B${r}`).value = s.bidang;
    ws.getCell(`C${r}`).value = {
      formula: `COUNT(${ref(s.bidang, `A${FIRST_DATA_ROW}:A${s.lastDataRow}`)})`,
      result: s.count
    };
    ws.getCell(`D${r}`).value = { formula: ref(s.bidang, `C${s.jumlahRow}`), result: internalP };
    ws.getCell(`E${r}`).value = { formula: ref(s.bidang, `D${s.jumlahRow}`), result: internalS };
    ws.getCell(`F${r}`).value = { formula: ref(s.bidang, `E${s.jumlahRow}`), result: luarP };
    ws.getCell(`G${r}`).value = { formula: ref(s.bidang, `F${s.jumlahRow}`), result: luarS };
    ws.getCell(`H${r}`).value = { formula: `D${r}+F${r}`, result: internalP + luarP };
    ws.getCell(`I${r}`).value = { formula: `E${r}+G${r}`, result: internalS + luarS };
  });

  const last = first + sheets.length - 1;
  const totalRow = last + 1;
  ws.getCell(`B${totalRow}`).value = 'TOTAL';
  const col = (c) => sheets.reduce((sum, s) => sum + ({ C: s.count, D: s.sums.C, E: s.sums.D, F: s.sums.E, G: s.sums.F, H: s.sums.C + s.sums.E, I: s.sums.D + s.sums.F })[c], 0);
  for (const c of ['C', 'D', 'E', 'F', 'G', 'H', 'I']) {
    ws.getCell(`${c}${totalRow}`).value = { formula: `SUM(${c}${first}:${c}${last})`, result: col(c) };
  }

  for (let r = first; r <= totalRow; r++) {
    const isTotal = r === totalRow;
    for (const c of ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']) {
      const cell = ws.getCell(`${c}${r}`);
      cell.font = isTotal || c === 'B' ? BOLD : REGULAR;
      cell.alignment = { horizontal: c === 'B' ? (isTotal ? 'center' : 'left') : 'center', vertical: 'middle' };
      if (c !== 'A' && c !== 'B') cell.numFmt = NUM_FMT;
      cell.border = {
        left: thick,
        right: thick,
        top: r === first || isTotal ? thick : thin,
        bottom: isTotal ? thick : thin
      };
    }
    ws.getRow(r).height = 20;
  }

  return ws;
}

/**
 * Bangun workbook dari baris public.laporan_takar (urutan dalam tiap sheet mengikuti `rows`).
 * @param {typeof import('exceljs')} ExcelJS
 * @param {object[]} rows
 */
export function buildWorkbook(ExcelJS, rows) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Takar Budaya';
  wb.created = new Date();
  wb.calcProperties = { fullCalcOnLoad: true };

  const groups = BIDANG_OPTIONS.map((b) => [b, rows.filter((r) => r.bidang === b)]).filter(([, g]) => g.length);
  // Bidang di luar daftar (tidak semestinya terjadi; dijaga CHECK constraint) tetap diexport.
  const others = [...new Set(rows.map((r) => r.bidang).filter((b) => !BIDANG_OPTIONS.includes(b)))];
  for (const b of others) groups.push([b || 'Tanpa Bidang', rows.filter((r) => r.bidang === b)]);

  const sheets = groups.map(([bidang, group]) => addBidangSheet(wb, bidang, group));
  addRekapSheet(wb, sheets, rows);
  return { workbook: wb, sheetNames: [...sheets.map((s) => s.bidang), REKAP_SHEET] };
}

/** Nama file: "Data Partisipasi Takar Budaya 2026-11-10.xlsx". */
export function exportFilename() {
  return `Data Partisipasi Takar Budaya ${todayISO()}.xlsx`;
}

/**
 * Buat file Excel dan unduh di browser.
 * @returns {Promise<{ sheetNames: string[] }>}
 */
export async function downloadExcel(rows, filename = exportFilename()) {
  const { default: ExcelJS } = await import('exceljs');
  const { workbook, sheetNames } = buildWorkbook(ExcelJS, rows);
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return { sheetNames };
}
