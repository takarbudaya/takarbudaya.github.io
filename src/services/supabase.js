/**
 * Satu klien Supabase untuk seluruh aplikasi (data + login).
 * SDK dimuat lazy (dynamic import) agar tidak masuk bundle awal.
 */
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY);

export const NOT_CONFIGURED_MESSAGE =
  'Penyimpanan belum dikonfigurasi (VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY kosong).';

let clientPromise = null;

export function getClient() {
  if (!isSupabaseConfigured) {
    return Promise.reject(new Error(NOT_CONFIGURED_MESSAGE));
  }
  clientPromise ??= import('@supabase/supabase-js')
    .then(({ createClient }) =>
      createClient(SUPABASE_URL, SUPABASE_KEY, {
        // Sesi login disimpan di localStorage dan diperbarui otomatis.
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
      })
    )
    .catch((err) => {
      clientPromise = null; // izinkan coba lagi (mis. gagal memuat chunk saat offline)
      throw err;
    });
  return clientPromise;
}

/** Pesan galat jaringan dari fetch di berbagai browser. */
export function isNetworkError(raw) {
  return /failed to fetch|networkerror|load failed|network request failed|dynamically imported module/i.test(raw);
}
