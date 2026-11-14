/**
 * Login dengan akun yang sudah dibuat admin (Supabase Auth, email + kata sandi).
 * Tidak ada pendaftaran: akun dibuat di Supabase Dashboard -> Authentication -> Users.
 */
import { ref, computed } from 'vue';
import { getClient, isSupabaseConfigured, isNetworkError, NOT_CONFIGURED_MESSAGE } from '../services/supabase.js';

// Satu state bersama untuk seluruh aplikasi.
const user = ref(null);
const isLoggedIn = computed(() => user.value !== null);

let readyPromise = null;

/**
 * Baca sesi tersimpan (sekali) dan pantau perubahan login/logout,
 * termasuk logout dari tab lain atau sesi yang kedaluwarsa.
 */
function ensureAuthReady() {
  readyPromise ??= (async () => {
    if (!isSupabaseConfigured) return;
    const supabase = await getClient();
    const { data } = await supabase.auth.getSession();
    user.value = data.session?.user ?? null;
    supabase.auth.onAuthStateChange((_event, session) => {
      user.value = session?.user ?? null;
    });
  })().catch((err) => {
    readyPromise = null; // coba lagi pada navigasi berikutnya
    throw err;
  });
  return readyPromise;
}

function toLoginError(error) {
  const raw = error?.message ?? String(error);
  if (/invalid login credentials/i.test(raw)) return 'Email atau kata sandi salah.';
  if (/email not confirmed/i.test(raw)) return 'Akun belum dikonfirmasi. Hubungi admin.';
  if (/rate limit|too many/i.test(raw)) return 'Terlalu banyak percobaan. Tunggu beberapa saat lalu coba lagi.';
  if (isNetworkError(raw)) return 'Tidak dapat terhubung ke server. Periksa koneksi internet.';
  return `Gagal masuk: ${raw}`;
}

async function signIn(email, password) {
  if (!isSupabaseConfigured) throw new Error(NOT_CONFIGURED_MESSAGE);
  try {
    await ensureAuthReady();
    const supabase = await getClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw error;
    user.value = data.user;
  } catch (err) {
    throw new Error(toLoginError(err));
  }
}

async function signOut() {
  const supabase = await getClient();
  // scope 'local': keluar dari perangkat ini saja, tetap berhasil walau offline.
  await supabase.auth.signOut({ scope: 'local' });
  user.value = null;
}

export function useAuth() {
  return { user, isLoggedIn, ensureAuthReady, signIn, signOut };
}
