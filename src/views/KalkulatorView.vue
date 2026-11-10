<script setup>
import { watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import EventInfoCard from '../components/EventInfoCard.vue';
import AreaCard from '../components/AreaCard.vue';
import DensityCard from '../components/DensityCard.vue';
import PelakuCard from '../components/PelakuCard.vue';
import ResultCard from '../components/ResultCard.vue';
import PrintSheet from '../components/PrintSheet.vue';
import { useTakarStore } from '../composables/useTakarStore.js';
import { ambilLaporan } from '../services/laporan.js';
import { formatTanggalDMY, parseId } from '../utils/format.js';

const route = useRoute();
const router = useRouter();
const { editing, isDirty, loadRecord, resetForm, report, printJob } = useTakarStore();

// --- Mode edit: /?edit=<id> memuat data dari riwayat ke form ---
async function startEdit(id) {
  Object.assign(editing, { id, loading: true, error: '', original: null });
  try {
    const row = await ambilLaporan(id);
    if (editing.id !== id) return; // sudah pindah ke data lain
    if (!row) {
      editing.error = `Data #${id} tidak ditemukan. Mungkin sudah dihapus.`;
      return;
    }
    loadRecord(row);
    editing.original = row;
  } catch (err) {
    if (editing.id === id) editing.error = err.message;
  } finally {
    if (editing.id === id) editing.loading = false;
  }
}

watch(
  () => route.query.edit,
  (raw) => {
    const id = parseId(raw);
    if (id !== null) {
      if (id !== editing.id) startEdit(id);
      return;
    }
    // Masih mode edit tetapi URL tanpa ?edit (mis. klik menu Kalkulator):
    // kembalikan id ke URL agar refresh tetap membuka data yang sama.
    if (editing.id !== null) {
      router.replace({ query: { ...route.query, edit: String(editing.id) } });
    }
  },
  { immediate: true }
);

/** Keluar dari mode edit: kosongkan form dan kembali ke halaman riwayat asal. */
function leaveEdit() {
  const back = editing.returnTo;
  resetForm();
  router.push(back);
}

function cancelEdit() {
  if (isDirty.value && !window.confirm('Perubahan yang belum disimpan akan hilang. Batalkan edit?')) return;
  leaveEdit();
}

function startNew() {
  resetForm();
  router.replace({ query: {} });
}
</script>

<template>
  <!-- Banner mode edit -->
  <section v-if="editing.id !== null" class="edit-banner" :class="{ 'is-error': editing.error }" role="status">
    <template v-if="editing.loading">
      <strong>⏳ Memuat data untuk diedit…</strong>
    </template>
    <template v-else-if="editing.error">
      <div class="edit-banner-text">
        <strong>❌ {{ editing.error }}</strong>
      </div>
      <div class="edit-banner-actions">
        <button type="button" class="link-btn" @click="startEdit(editing.id)">↻ Coba lagi</button>
        <button type="button" class="link-btn" @click="startNew">＋ Isi data baru</button>
        <button type="button" class="link-btn" @click="leaveEdit">← Kembali ke Riwayat</button>
      </div>
    </template>
    <template v-else-if="editing.original">
      <div class="edit-banner-text">
        <strong>✏️ Mode Edit</strong>
        <span>
          Mengubah data <strong>“{{ editing.original.nama_acara }}”</strong>
          ({{ formatTanggalDMY(editing.original.tgl_acara) }}). Tekan <em>Simpan Perubahan</em> untuk memperbarui.
        </span>
      </div>
      <div class="edit-banner-actions">
        <button type="button" class="link-btn" @click="cancelEdit">✕ Batal edit</button>
      </div>
    </template>
  </section>

  <template v-if="!editing.loading && !editing.error">
    <EventInfoCard />

    <div class="section-divider-title">
      <span>🌳 I. HITUNG PENONTON (METODE JACOBS: P = A &times; D)</span>
    </div>
    <AreaCard />
    <DensityCard />

    <div class="section-divider-title">
      <span>🎭 II. HITUNG PELAKU SENI / PENDUKUNG</span>
    </div>
    <PelakuCard />

    <ResultCard />

    <!--
      Untuk Ctrl+P / menu Print browser: lembar cetak mengikuti isian form.
      Saat print, CSS menyembunyikan .main-wrapper (tempat halaman ini dirender),
      jadi lembar cetak dipindah ke <body>. Disembunyikan selama tombol PDF mencetak
      (printJob dirender App.vue), agar tidak tercetak dua lembar.
    -->
    <Teleport to="body">
      <PrintSheet v-if="!printJob" :report="report" />
    </Teleport>
  </template>
</template>
