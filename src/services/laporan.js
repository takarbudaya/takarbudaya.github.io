/**
 * Akses data riwayat laporan di Supabase (tabel public.laporan_takar).
 * Semua permintaan memakai sesi login (lihat useAuth.js); tanpa login, database menolak.
 */
import { getClient, isNetworkError } from './supabase.js';

export { isSupabaseConfigured } from './supabase.js';

const TABLE = 'laporan_takar';

/** Ubah error Supabase / jaringan jadi pesan yang bisa dibaca pengguna. */
function toUserError(error, action) {
  const raw = error?.message ?? String(error);
  const offline = isNetworkError(raw);
  const err = new Error(
    offline
      ? `Gagal ${action}: tidak dapat terhubung ke server. Periksa koneksi internet.`
      : `Gagal ${action}: ${raw}`
  );
  err.code = error?.code;
  return err;
}

/** Escape karakter wildcard LIKE agar input pengguna dicari apa adanya. */
function escapeLike(text) {
  return text.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/** Simpan satu laporan. `record` berasal dari useTakarStore().toRecord(). */
export async function simpanLaporan(record) {
  const supabase = await getClient();
  const { error } = await supabase.from(TABLE).insert(record);
  if (error) throw toUserError(error, 'menyimpan data');
}

export const RIWAYAT_COLUMNS =
  'id, created_at, updated_at, tgl_acara, tempat_acara, nama_acara, penyelenggara, bidang, acara_internal, ' +
  'luas_mode, panjang, lebar, luas_area, kepadatan, total_penonton, total_pelaku';

/**
 * Ambil satu halaman riwayat, terbaru dulu.
 * @param {{dari?: string, sampai?: string, lokasi?: string, acara?: string, bidang?: string, internal?: 'ya' | 'tidak', page: number}} filters
 * @param {number} pageSize
 * @returns {Promise<{rows: object[], total: number}>}
 */
export async function ambilRiwayat(filters, pageSize) {
  const supabase = await getClient();
  const from = (filters.page - 1) * pageSize;

  const query = applyFilters(supabase.from(TABLE).select(RIWAYAT_COLUMNS, { count: 'exact' }), filters);
  const { data, count, error } = await query
    .order('tgl_acara', { ascending: false })
    .order('id', { ascending: false })
    .range(from, from + pageSize - 1);

  if (error) throw toUserError(error, 'memuat riwayat');
  return { rows: data ?? [], total: count ?? 0 };
}

/** Filter halaman riwayat (tanggal, lokasi, acara, bidang, internal) pada query Supabase. */
function applyFilters(query, filters) {
  if (filters.dari) query = query.gte('tgl_acara', filters.dari);
  if (filters.sampai) query = query.lte('tgl_acara', filters.sampai);
  if (filters.lokasi) query = query.ilike('tempat_acara', `%${escapeLike(filters.lokasi)}%`);
  if (filters.acara) query = query.ilike('nama_acara', `%${escapeLike(filters.acara)}%`);
  if (filters.bidang) query = query.eq('bidang', filters.bidang);
  if (filters.internal) query = query.eq('acara_internal', filters.internal === 'ya');
  return query;
}

/** Batas baris per permintaan (default "Max rows" Supabase = 1000). */
const BATCH = 1000;

/**
 * Ambil SEMUA laporan yang cocok dengan filter (untuk export), urut tanggal lama -> baru.
 * Diambil per 1000 baris sampai habis.
 */
export async function ambilSemuaRiwayat(filters) {
  const supabase = await getClient();
  const all = [];
  for (let from = 0; ; from += BATCH) {
    const { data, error } = await applyFilters(supabase.from(TABLE).select(RIWAYAT_COLUMNS), filters)
      .order('tgl_acara', { ascending: true })
      .order('id', { ascending: true })
      .range(from, from + BATCH - 1);
    if (error) throw toUserError(error, 'mengambil data untuk export');
    all.push(...(data ?? []));
    if (!data || data.length < BATCH) return all;
  }
}

/** Ambil laporan berdasarkan daftar id (data terbaru, yang sudah dihapus tidak ikut). */
export async function ambilLaporanByIds(ids) {
  const supabase = await getClient();
  const all = [];
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error } = await supabase
      .from(TABLE)
      .select(RIWAYAT_COLUMNS)
      .in('id', ids.slice(i, i + 200))
      .order('tgl_acara', { ascending: true })
      .order('id', { ascending: true });
    if (error) throw toUserError(error, 'mengambil data untuk export');
    all.push(...(data ?? []));
  }
  return all.sort((a, b) => a.tgl_acara.localeCompare(b.tgl_acara) || a.id - b.id);
}

/**
 * Ambil satu laporan berdasarkan id (untuk diedit).
 * @returns {Promise<object|null>} null jika tidak ditemukan.
 */
export async function ambilLaporan(id) {
  const supabase = await getClient();
  const { data, error } = await supabase.from(TABLE).select(RIWAYAT_COLUMNS).eq('id', id).limit(1);
  if (error) throw toUserError(error, 'memuat data');
  return data?.[0] ?? null;
}

/** Perbarui laporan yang sudah ada. Gagal jika id tidak ada (mis. sudah dihapus admin). */
export async function perbaruiLaporan(id, record) {
  const supabase = await getClient();
  const { data, error } = await supabase.from(TABLE).update(record).eq('id', id).select('id');
  if (error) throw toUserError(error, 'menyimpan perubahan');
  if (!data?.length) throw new Error('Gagal menyimpan perubahan: data tidak ditemukan (mungkin sudah dihapus).');
}

/**
 * Hapus laporan (soft delete lewat fungsi database `hapus_laporan`):
 * data disembunyikan dari aplikasi, tetapi masih bisa dipulihkan admin.
 */
export async function hapusLaporan(id) {
  const supabase = await getClient();
  const { data, error } = await supabase.rpc('hapus_laporan', { p_id: id });
  if (error) throw toUserError(error, 'menghapus data');
  if (data !== true) throw new Error('Gagal menghapus: data tidak ditemukan (mungkin sudah dihapus).');
}

/**
 * Hapus beberapa laporan sekaligus (soft delete, satu transaksi).
 * @returns {Promise<number>} jumlah data yang benar-benar terhapus
 *   (bisa lebih kecil jika sebagian sudah dihapus orang lain).
 */
export async function hapusLaporanBanyak(ids) {
  const supabase = await getClient();
  const { data, error } = await supabase.rpc('hapus_laporan_banyak', { p_ids: ids });
  if (error) throw toUserError(error, 'menghapus data');
  return Number(data) || 0;
}
