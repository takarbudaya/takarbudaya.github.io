/**
 * Data laporan (pesan WhatsApp & lembar cetak PDF) dalam satu bentuk,
 * dipakai dari dua sumber: isian kalkulator dan baris riwayat (database).
 */
import { DENSITY_OPTIONS } from '../data/options.js';
import { formatIDRNumber, formatDecimalID } from './format.js';

/**
 * @typedef {object} Report
 * @property {string} tglAcara            YYYY-MM-DD
 * @property {string} tempatAcara
 * @property {string} namaAcara
 * @property {string} penyelenggaraAcara
 * @property {string} bidangPelaksana
 * @property {number|null} totalPenonton  null = penonton tidak dihitung
 * @property {string} strA                "1.000"
 * @property {string} strD                "0,5"
 * @property {string} strTotalPenonton
 * @property {string} descArea            keterangan cara mengukur luas
 * @property {string} densityTitle
 * @property {string} densityNote
 * @property {number|null} totalPelaku    null = pelaku tidak dihitung
 * @property {string} strTotalPelaku
 */

function describeArea(luasMode, luasArea, panjang, lebar) {
  if (luasArea === null) return 'Tidak dihitung / belum diisi';
  const strA = formatIDRNumber(luasArea);
  if (luasMode === 'panjang_lebar') return `Ukuran lapangan: ${panjang} m × ${lebar} m = ${strA} m²`;
  if (luasMode === 'total') return `Total luas wilayah: ${strA} m²`;
  return `Pilihan luas wilayah ${strA} m²`;
}

/**
 * @param {{tglAcara: string, tempatAcara: string, namaAcara: string, penyelenggaraAcara: string,
 *   bidangPelaksana: string, luasMode: 'cepat'|'panjang_lebar'|'total'|null, luasArea: number|null,
 *   panjang: number|null, lebar: number|null, density: number, totalPelaku: number|null}} src
 * @returns {Report}
 */
export function buildReport(src) {
  const luasArea = src.luasArea > 0 ? src.luasArea : null;
  const density = Number(src.density);
  const option = DENSITY_OPTIONS.find((o) => o.value === density);
  const totalPenonton = luasArea !== null ? Math.round(luasArea * density) : null;
  const totalPelaku = src.totalPelaku ?? null;

  return {
    tglAcara: src.tglAcara,
    tempatAcara: src.tempatAcara,
    namaAcara: src.namaAcara,
    penyelenggaraAcara: src.penyelenggaraAcara,
    bidangPelaksana: src.bidangPelaksana,
    totalPenonton,
    strA: formatIDRNumber(luasArea),
    strD: formatDecimalID(density),
    strTotalPenonton: formatIDRNumber(totalPenonton),
    descArea: describeArea(src.luasMode, luasArea, src.panjang, src.lebar),
    densityTitle: option?.title ?? `${formatDecimalID(density)} org/m²`,
    densityNote: option?.note ?? '',
    totalPelaku,
    strTotalPelaku: formatIDRNumber(totalPelaku)
  };
}

/** Laporan dari satu baris public.laporan_takar (halaman riwayat). */
export function reportFromRow(row) {
  const num = (v) => (v === null || v === undefined ? null : Number(v));
  return buildReport({
    tglAcara: row.tgl_acara,
    tempatAcara: row.tempat_acara ?? '',
    namaAcara: row.nama_acara ?? '',
    penyelenggaraAcara: row.penyelenggara ?? '',
    bidangPelaksana: row.bidang ?? '',
    luasMode: row.luas_mode,
    luasArea: num(row.luas_area),
    panjang: num(row.panjang),
    lebar: num(row.lebar),
    density: num(row.kepadatan),
    totalPelaku: num(row.total_pelaku)
  });
}
