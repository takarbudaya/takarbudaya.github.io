/** 1234 -> "1.234" (format angka Indonesia). */
export function formatIDRNumber(num) {
  if (num === null || num === undefined || isNaN(num)) return '-';
  return new Intl.NumberFormat('id-ID').format(num);
}

/** 1 -> "1", 0.5 -> "0,5" (desimal pakai koma). */
export function formatDecimalID(num) {
  return String(num).replace('.', ',');
}

/** "2026-11-10" -> "Selasa, 10 November 2026". */
export function formatTanggalID(dateStr) {
  if (!dateStr) return 'Belum ditentukan';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const [y, m, d] = parts.map((p) => parseInt(p, 10));
    return new Date(y, m - 1, d).toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
  return dateStr;
}

/** "2026-11-10" -> "10/11/2026" (urutan Tanggal/Bulan/Tahun). */
export function formatTanggalDMY(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const [yyyy, mm, dd] = parts;
  return `${dd}/${mm}/${yyyy}`;
}

/** Tanggal hari ini dalam format input date (YYYY-MM-DD), waktu lokal. */
export function todayISO() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/** Nilai teks diisi atau "-" jika kosong. */
export function orDash(text) {
  const trimmed = (text ?? '').toString().trim();
  return trimmed || '-';
}

/** Angka positif dari input (string/number), selain itu null. */
export function parsePositive(raw) {
  const val = parseFloat(raw);
  return !isNaN(val) && val > 0 ? val : null;
}

/** Bilangan bulat >= 0 dari input, kosong/tidak valid -> null. */
export function parseNonNegativeInt(raw) {
  const text = (raw ?? '').toString().trim();
  if (text === '') return null;
  const val = parseInt(text, 10);
  return !isNaN(val) && val >= 0 ? val : null;
}

/** "2026-11-10" -> "Sel, 10 Nov 2026" (ringkas, untuk daftar riwayat). */
export function formatTanggalSingkat(dateStr) {
  if (!dateStr) return '-';
  const [y, m, d] = dateStr.split('-').map((p) => parseInt(p, 10));
  if (!y || !m || !d) return dateStr;
  return new Date(y, m - 1, d).toLocaleDateString('id-ID', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

/** Cek string tanggal ISO (YYYY-MM-DD) yang valid. */
export function isISODate(text) {
  if (typeof text !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
  const [y, m, d] = text.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

/** "12" -> 12; selain bilangan bulat positif -> null (mis. parameter ?edit= di URL). */
export function parseId(raw) {
  if (typeof raw !== 'string' || !/^\d{1,15}$/.test(raw)) return null;
  const id = Number(raw);
  return id > 0 ? id : null;
}

/** Timestamp ISO (timestamptz) -> "10/11/2026" dalam zona waktu pengguna. */
export function formatTimestampDMY(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  if (isNaN(d)) return '';
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Timestamp ISO -> "Selasa, 10 November 2026 pukul 14.05". */
export function formatTimestampLengkap(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  if (isNaN(d)) return '';
  return d.toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' });
}
