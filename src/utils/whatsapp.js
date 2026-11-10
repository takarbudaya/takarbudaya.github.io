import { formatTanggalID, orDash } from './format.js';

/**
 * Susun teks ringkasan laporan untuk ditempel di WhatsApp.
 * @param {import('./report.js').Report} report dari kalkulator (store.report) atau riwayat (reportFromRow)
 */
export function buildWhatsAppText(report) {
  let blokPenonton;
  if (report.totalPenonton !== null) {
    const { strA, strD, strTotalPenonton } = report;
    blokPenonton =
`🌳 *I. PENONTON (Metode Jacobs: P = A × D)*
• Luas Area Efektif (A) : ${strA} m²
• Kepadatan Penonton (D): ${strD} orang/m² (${report.densityTitle})
• Perhitungan Rumus     : ${strA} m² × ${strD} = *${strTotalPenonton} Orang*
👉 *Estimasi Jumlah Penonton Pertunjukan Seni / Kebudayaan: ${strTotalPenonton} Orang*`;
  } else {
    blokPenonton =
`🌳 *I. PENONTON (Metode Jacobs: P = A × D)*
👉 *Estimasi Jumlah Penonton Pertunjukan Seni / Kebudayaan: - *`;
  }

  let blokPelaku;
  if (report.totalPelaku !== null) {
    blokPelaku =
`🎭 *II. PELAKU SENI / PENDUKUNG*
• Komposisi Peran: Pemeran Utama, Pemain Pendukung, dan Pemusik
👉 *Jumlah Pelaku / Pendukung Pertunjukan Seni: ${report.strTotalPelaku} Orang*`;
  } else {
    blokPelaku =
`🎭 *II. PELAKU SENI / PENDUKUNG*
👉 *Jumlah Pelaku / Pendukung Pertunjukan Seni: - *`;
  }

  return `*LAPORAN PENGHITUNGAN PENONTON & PELAKU SENI / PENDUKUNG*
🏛️ *TAKAR BUDAYA*
---------------------------------------------
📅 *Tanggal:* ${formatTanggalID(report.tglAcara)}
📍 *Tempat:* ${orDash(report.tempatAcara)}
🎪 *Acara:* ${orDash(report.namaAcara)}
🏛️ *Penyelenggara:* ${orDash(report.penyelenggaraAcara)}
🏢 *Bidang/UPTD:* ${orDash(report.bidangPelaksana)}
---------------------------------------------

${blokPenonton}

${blokPelaku}
---------------------------------------------
_Dihitung melalui instrumen bantu Takar Budaya._`;
}
