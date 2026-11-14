/** Tombol cepat luas area (m²). */
export const QUICK_AREAS = [100, 300, 500, 700, 1000];

/** Pilihan kepadatan penonton (D) dalam orang per m². */
export const DENSITY_OPTIONS = [
  {
    value: 0.5,
    title: 'Senggang / Lesehan',
    note: 'Lesehan santai, ruang gerak lega 1–2 meter antarorang.'
  },
  {
    value: 1.0,
    title: 'Sedang / Nyaman (Aman)',
    note: 'Kondisi normal wajar, penonton leluasa tanpa berdesakan.'
  },
  {
    value: 2.0,
    title: 'Cukup Padat',
    note: 'Berdiri berdekatan.'
  },
  {
    value: 3.0,
    title: 'Padat',
    note: 'Bahu sesekali bersentuhan.'
  },
  {
    value: 4.0,
    title: 'Sangat Padat',
    note: 'Kondisi berdesakan padat.'
  }
];

export const DEFAULT_DENSITY = 1.0;

/**
 * Pilihan Bidang / UPTD.
 * Harus sama dengan CHECK constraint kolom `bidang` di
 * supabase/migrations/*_create_laporan_takar.sql.
 */
export const BIDANG_OPTIONS = ['Bidang Atlas', 'Bidang SBSP', 'Bidang WB', 'UPTD MGM'];
