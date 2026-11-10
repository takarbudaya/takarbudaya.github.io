<script setup>
import { ref, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { useTakarStore } from '../composables/useTakarStore.js';
import { buildWhatsAppText } from '../utils/whatsapp.js';
import { copyText } from '../utils/clipboard.js';
import { simpanLaporan, perbaruiLaporan } from '../services/laporan.js';

const store = useTakarStore();
const {
  totalPenonton,
  totalPelakuSeni,
  strA,
  strD,
  strTotalPenonton,
  strTotalPelaku,
  missingFields,
  validationShown,
  toRecord,
  lastSavedSnapshot,
  editing,
  flash,
  resetForm,
  printReport
} = store;
const router = useRouter();

// --- Toast: { text, variant: 'success' | 'error' | 'info', link?: boolean } ---
const toast = ref(null);
let toastTimer = null;

function showToast(text, variant = 'success', { link = false, duration = 2800 } = {}) {
  toast.value = { text, variant, link };
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.value = null;
  }, duration);
}

// --- Simpan ke Supabase ---
const saving = ref(false);

/**
 * Gulir ke isian yang kosong. Ditaruh di atas layar (bukan tengah) karena kartu
 * hasil yang sticky menutupi bagian bawah layar HP.
 */
function focusField(key) {
  const target = document.getElementById(key);
  if (!target) return;
  (target.closest('.field-item') ?? target).scrollIntoView({ behavior: 'smooth', block: 'start' });
  // Input tanggal membuka kalender saat fokus, jadi tidak difokuskan otomatis.
  if (target.matches('input:not([type="date"]), select')) target.focus({ preventScroll: true });
}

/** Pesan per tombol: 'save' = Simpan, 'wa' = Salin WA + Simpan, 'pdf' = Cetak PDF + Simpan. */
const MESSAGES = {
  save: {
    saved: '✅ Data berhasil disimpan.',
    updated: (nama) => `✅ Perubahan pada “${nama}” berhasil disimpan.`,
    unchanged: 'ℹ️ Tidak ada perubahan untuk disimpan.',
    failed: '❌'
  },
  wa: {
    saved: '✅ Pesan WhatsApp disalin & data berhasil disimpan.',
    updated: (nama) => `✅ Pesan WhatsApp disalin & perubahan pada “${nama}” berhasil disimpan.`,
    unchanged: '✅ Pesan WhatsApp disalin. Tidak ada perubahan untuk disimpan.',
    failed: '⚠️ Pesan WhatsApp sudah disalin, tetapi data GAGAL disimpan.'
  },
  pdf: {
    saved: '✅ PDF dibuat & data berhasil disimpan.',
    updated: (nama) => `✅ PDF dibuat & perubahan pada “${nama}” berhasil disimpan.`,
    unchanged: '✅ PDF dibuat. Tidak ada perubahan untuk disimpan.',
    failed: '⚠️ PDF sudah dibuat, tetapi data GAGAL disimpan.'
  }
};

/**
 * Satu alur untuk ketiga tombol:
 * 1. validasi isian wajib (gagal = tidak menyalin / mencetak / menyimpan),
 * 2. salin / cetak DULU, selagi masih dalam klik pengguna (clipboard butuh gestur;
 *    lembar cetak memakai salinan laporan sehingga aman saat form dikosongkan),
 * 3. simpan (data baru = insert, mode edit = update).
 */
async function runAction(kind) {
  if (saving.value) return;

  validationShown.value = true;
  if (missingFields.value.length > 0) {
    const labels = missingFields.value.map((f) => f.label).join(', ');
    showToast(`⚠️ Lengkapi dulu: ${labels}.`, 'error', { duration: 4500 });
    focusField(missingFields.value[0].key);
    return;
  }

  // Sibuk sejak sini (termasuk salin / cetak) agar klik ganda tidak menyimpan dua kali.
  saving.value = true;
  try {
    const record = toRecord();
    const report = { ...store.report.value };

    if (kind === 'wa') {
      const copied = await copyText(buildWhatsAppText(report));
      if (!copied) {
        showToast('❌ Gagal menyalin pesan otomatis, data belum disimpan. Coba lagi.', 'error', { duration: 5000 });
        return;
      }
    } else if (kind === 'pdf') {
      await printReport(report);
    }

    // Mode edit tanpa perubahan: cukup salin / cetak, tidak perlu menyimpan.
    if (editing.id !== null && JSON.stringify(record) === lastSavedSnapshot.value) {
      showToast(MESSAGES[kind].unchanged, 'info', { duration: 3500 });
      return;
    }

    if (editing.id !== null) {
      // Mode edit: perbarui baris asli, lalu kembali ke halaman riwayat asal.
      const id = editing.id;
      await perbaruiLaporan(id, record);
      flash.value = { text: MESSAGES[kind].updated(record.nama_acara), highlightId: id };
      const back = editing.returnTo;
      resetForm();
      router.push(back);
      return;
    }
    await simpanLaporan(record);
    // Data baru tersimpan: kosongkan form untuk entri berikutnya (ini juga mencegah simpan ganda).
    resetForm();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast(`${MESSAGES[kind].saved} Form dikosongkan untuk data berikutnya.`, 'success', {
      link: true,
      duration: 5000
    });
  } catch (err) {
    // Gagal simpan: isian tetap di form agar bisa dicoba lagi.
    showToast(`${MESSAGES[kind].failed} ${err.message}`, 'error', { duration: 7000 });
  } finally {
    saving.value = false;
  }
}

onBeforeUnmount(() => clearTimeout(toastTimer));
</script>

<template>
  <section class="result-sticky-card">
    <div class="result-inner">
      <div class="dual-result-grid">
        <!-- Hasil Penonton -->
        <div class="result-sub-box">
          <div class="result-header-text">ESTIMASI PENONTON</div>
          <div class="result-big-number">{{ totalPenonton !== null ? strTotalPenonton : '-' }}</div>
          <div class="result-unit-label">{{ totalPenonton !== null ? 'ORANG' : '(TIDAK DIHITUNG)' }}</div>
          <div class="calc-proof-box">
            <span class="proof-label">Metode Jacobs: P = A &times; D</span>
            <div class="proof-math">
              {{ totalPenonton !== null
                ? `${strA} m² × ${strD} = ${strTotalPenonton} orang`
                : 'Penonton tidak dihitung / tidak ada' }}
            </div>
          </div>
        </div>

        <!-- Hasil Pelaku Seni / Pendukung -->
        <div class="result-sub-box">
          <div class="result-header-text">PELAKU SENI / PENDUKUNG</div>
          <div class="result-big-number">{{ totalPelakuSeni !== null ? strTotalPelaku : '-' }}</div>
          <div class="result-unit-label">{{ totalPelakuSeni !== null ? 'ORANG' : '(TIDAK DIHITUNG)' }}</div>
          <div class="calc-proof-box">
            <span class="proof-label">Kategori Peran (Clustering)</span>
            <div class="proof-math">
              {{ totalPelakuSeni !== null
                ? 'Pemeran Utama, Pendukung, Pemusik'
                : 'Pelaku seni tidak dihitung / tidak ada' }}
            </div>
          </div>
        </div>
      </div>

      <!-- Tombol aksi -->
      <div class="action-btn-row">
        <button
          type="button"
          class="action-btn btn-wa"
          :disabled="saving"
          @click="runAction('wa')"
        >
          <span class="btn-icon">📋</span>
          <span>Salin Pesan WhatsApp dan Simpan</span>
        </button>
        <button
          type="button"
          class="action-btn btn-print"
          :disabled="saving"
          @click="runAction('pdf')"
        >
          <span class="btn-icon">🖨️</span>
          <span>Cetak / Generate PDF dan Simpan</span>
        </button>
        <button
          type="button"
          class="action-btn btn-save"
          :disabled="saving"
          :aria-busy="saving"
          @click="runAction('save')"
        >
          <span class="btn-icon">💾</span>
          <span>{{ saving ? 'Menyimpan…' : editing.id !== null ? 'Simpan Perubahan' : 'Simpan' }}</span>
        </button>
      </div>

      <!-- Toast notifikasi -->
      <div
        class="toast-box"
        :class="[toast ? `toast-${toast.variant}` : 'hidden']"
        role="status"
        aria-live="polite"
      >
        <template v-if="toast">
          {{ toast.text }}
          <RouterLink v-if="toast.link" to="/history" class="toast-link">Lihat riwayat →</RouterLink>
        </template>
      </div>
    </div>
  </section>
</template>
