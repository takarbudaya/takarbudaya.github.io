import { createRouter, createWebHistory } from 'vue-router';
import KalkulatorView from '../views/KalkulatorView.vue';
import { useTakarStore } from '../composables/useTakarStore.js';
import { parseId } from '../utils/format.js';

const APP_NAME = 'TAKAR BUDAYA';

const routes = [
  {
    path: '/',
    name: 'kalkulator',
    component: KalkulatorView,
    meta: { title: `${APP_NAME} - Tata Kalkulasi Partisipasi Budaya` }
  },
  {
    path: '/history',
    name: 'riwayat',
    component: () => import('../views/HistoryView.vue'),
    meta: { title: `Riwayat - ${APP_NAME}` }
  },
  // Halaman baru: tambahkan di sini dengan import() (lazy) agar bundle awal tetap kecil.

  // URL tidak dikenal -> kembali ke beranda
  { path: '/:pathMatch(.*)*', redirect: { name: 'kalkulator' } }
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition;
    if (to.path === from.path) return false; // hanya query berubah (filter / halaman)
    if (to.hash) return { el: to.hash, behavior: 'smooth' };
    return { top: 0 };
  }
});

/**
 * Membuka data untuk diedit (/?edit=<id>):
 * - minta konfirmasi jika isian kalkulator belum disimpan dan akan tertimpa,
 * - ingat halaman riwayat asal (beserta filter & halaman) untuk kembali setelah simpan / batal.
 */
router.beforeEach((to, from) => {
  const editId = to.name === 'kalkulator' ? parseId(to.query.edit) : null;
  const { editing, isDirty } = useTakarStore();
  if (editId === null || editId === editing.id) return true;

  if (
    isDirty.value &&
    !window.confirm('Isian di Kalkulator belum disimpan dan akan diganti dengan data yang dipilih. Lanjutkan?')
  ) {
    return false;
  }
  editing.returnTo = from.name === 'riwayat' ? from.fullPath : '/history';
  return true;
});

router.afterEach((to) => {
  document.title = to.meta.title ?? APP_NAME;
});

export default router;
