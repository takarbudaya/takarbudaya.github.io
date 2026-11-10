<script setup>
/**
 * Halaman riwayat data tersimpan (/history).
 * Filter & halaman disimpan di query URL (?dari=&sampai=&lokasi=&acara=&bidang=&internal=&page=)
 * sehingga bisa di-bookmark, dibagikan, dan tombol Back browser tetap bekerja.
 */
import { reactive, ref, computed, watch, nextTick, onBeforeUnmount } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import CardTitle from '../components/CardTitle.vue';
import DateField from '../components/DateField.vue';
import PaginationBar from '../components/PaginationBar.vue';
import { reportFromRow } from '../utils/report.js';
import { buildWhatsAppText } from '../utils/whatsapp.js';
import { copyText } from '../utils/clipboard.js';
import { BIDANG_OPTIONS } from '../data/options.js';
import {
  ambilRiwayat,
  ambilSemuaRiwayat,
  ambilLaporanByIds,
  hapusLaporan,
  hapusLaporanBanyak,
  isSupabaseConfigured
} from '../services/laporan.js';
import { downloadExcel } from '../utils/excelExport.js';
import { useTakarStore } from '../composables/useTakarStore.js';
import {
  formatIDRNumber,
  formatDecimalID,
  formatTanggalDMY,
  formatTanggalSingkat,
  formatTimestampDMY,
  formatTimestampLengkap,
  isISODate
} from '../utils/format.js';

const PAGE_SIZE = 10;
const TEXT_DEBOUNCE_MS = 350;

const FILTER_KEYS = ['dari', 'sampai', 'lokasi', 'acara', 'bidang', 'internal'];
const emptyFilters = () => Object.fromEntries(FILTER_KEYS.map((key) => [key, '']));

const route = useRoute();
const router = useRouter();

// --- Query URL <-> filter ---
function readQuery(q) {
  const str = (v) => (typeof v === 'string' ? v : '');
  return {
    dari: isISODate(str(q.dari)) ? q.dari : '',
    sampai: isISODate(str(q.sampai)) ? q.sampai : '',
    lokasi: str(q.lokasi).trim(),
    acara: str(q.acara).trim(),
    bidang: BIDANG_OPTIONS.includes(q.bidang) ? q.bidang : '',
    internal: ['ya', 'tidak'].includes(q.internal) ? q.internal : '',
    page: Math.max(1, parseInt(str(q.page), 10) || 1)
  };
}

/** Query bersih: hanya kunci yang terisi, page=1 dihilangkan. */
function buildQuery(f, page) {
  const query = {};
  for (const key of FILTER_KEYS) {
    const val = (f[key] ?? '').trim();
    if (val) query[key] = val;
  }
  if (page > 1) query.page = String(page);
  return query;
}

const form = reactive(emptyFilters());
const current = computed(() => readQuery(route.query));
const hasFilters = computed(() => FILTER_KEYS.some((key) => current.value[key]));

/** Kunci query terakhir yang dibuat halaman ini sendiri (bukan dari Back/Forward). */
let selfQueryKey = null;

function navigate(page, method = 'replace') {
  clearTimeout(textTimer);
  const query = buildQuery(form, page);
  selfQueryKey = JSON.stringify(query);
  router[method]({ query });
}

let textTimer = null;
function onTextFilterInput() {
  clearTimeout(textTimer);
  textTimer = setTimeout(() => navigate(1), TEXT_DEBOUNCE_MS);
}

function resetFilters() {
  Object.assign(form, emptyFilters());
  navigate(1);
}

function goToPage(page) {
  navigate(page, 'push');
  document.getElementById('riwayatList')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// --- Data ---
const rows = ref([]);
const total = ref(0);
/** Halaman milik `rows` yang sedang tampil (bisa tertinggal dari URL selama memuat). */
const loadedPage = ref(1);
const loading = ref(false);
const errorMessage = ref('');
let requestId = 0;

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE)));
const rangeText = computed(() => {
  if (total.value === 0) return '';
  const from = (loadedPage.value - 1) * PAGE_SIZE + 1;
  const to = from + rows.value.length - 1;
  return `Menampilkan ${formatIDRNumber(from)}–${formatIDRNumber(to)} dari ${formatIDRNumber(total.value)} data`;
});

async function load() {
  if (!isSupabaseConfigured) return;
  const filters = current.value;
  const id = ++requestId;
  loading.value = true;
  errorMessage.value = '';
  try {
    const result = await ambilRiwayat(filters, PAGE_SIZE);
    if (id !== requestId) return;
    // Halaman di luar jangkauan (mis. data berkurang / URL lama): pindah ke halaman terakhir.
    if (result.rows.length === 0 && result.total > 0 && filters.page > 1) {
      navigate(Math.ceil(result.total / PAGE_SIZE));
      return;
    }
    rows.value = result.rows;
    loadedPage.value = filters.page;
    total.value = result.total;
  } catch (err) {
    if (id !== requestId) return;
    // PGRST103: offset melebihi jumlah data.
    if (err.code === 'PGRST103' && filters.page > 1) {
      navigate(1);
      return;
    }
    errorMessage.value = err.message;
  } finally {
    if (id === requestId) loading.value = false;
  }
}

watch(
  () => route.query,
  (query) => {
    // Sinkronkan form hanya jika perubahan datang dari luar (Back/Forward, link),
    // agar teks yang sedang diketik tidak tertimpa.
    const parsed = readQuery(query);
    if (JSON.stringify(buildQuery(parsed, parsed.page)) !== selfQueryKey) {
      const { page, ...filters } = parsed;
      Object.assign(form, filters);
    }
    load();
  },
  { immediate: true }
);

onBeforeUnmount(() => clearTimeout(textTimer));

// --- Edit ---
function editRow(row) {
  // Konfirmasi "isian belum disimpan" & halaman kembali ditangani router (beforeEach).
  router.push({ name: 'kalkulator', query: { edit: String(row.id) } });
}

// Pesan setelah edit tersimpan (dikirim lewat store sekali pakai) + sorot barisnya.
const { flash, editing, resetForm, printReport } = useTakarStore();
const notice = ref(flash.value);
flash.value = null;
const highlightId = notice.value?.highlightId ?? null;
let highlightScrolled = false;

watch(rows, async () => {
  if (highlightId === null || highlightScrolled) return;
  await nextTick();
  const el = document.querySelector(`[data-row-id="${highlightId}"]`);
  if (el) {
    highlightScrolled = true;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
});

// --- Salin pesan WhatsApp & cetak PDF langsung dari riwayat ---
const toast = ref(null); // { text, variant }
let toastTimer = null;
function showToast(text, variant = 'success', duration = 3500) {
  toast.value = { text, variant };
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (toast.value = null), duration);
}

const copiedId = ref(null); // tombol yang baru saja menyalin -> ikon centang sebentar
let copiedTimer = null;

async function copyRow(row) {
  const ok = await copyText(buildWhatsAppText(reportFromRow(row)));
  if (!ok) {
    showToast('❌ Gagal menyalin pesan otomatis. Coba lagi atau salin manual dari Kalkulator.', 'error', 5000);
    return;
  }
  copiedId.value = row.id;
  clearTimeout(copiedTimer);
  copiedTimer = setTimeout(() => (copiedId.value = null), 2000);
  showToast(`✅ Pesan WhatsApp “${row.nama_acara}” disalin. Siap ditempel di WhatsApp.`);
}

function printRow(row) {
  printReport(reportFromRow(row));
}
onBeforeUnmount(() => {
  clearTimeout(toastTimer);
  clearTimeout(copiedTimer);
});

// --- Pilih banyak baris ---
/** id -> baris. Tetap tersimpan saat pindah halaman / ganti filter; dialog hapus menampilkan semuanya. */
const selected = reactive(new Map());
const selectedCount = computed(() => selected.size);
const allOnPageSelected = computed(() => rows.value.length > 0 && rows.value.every((r) => selected.has(r.id)));
const someOnPageSelected = computed(() => !allOnPageSelected.value && rows.value.some((r) => selected.has(r.id)));

function toggleRow(row, checked) {
  if (checked) selected.set(row.id, row);
  else selected.delete(row.id);
}

function togglePage(checked) {
  for (const row of rows.value) toggleRow(row, checked);
}

function clearSelection() {
  selected.clear();
}

// --- Export Excel ---
// Tanpa pilihan: semua data sesuai filter aktif (bukan hanya halaman ini). Dengan pilihan: hanya yang dipilih.
const exporting = ref(false);
const canExport = computed(() => total.value > 0 || selectedCount.value > 0);
const exportLabel = computed(() =>
  selectedCount.value > 0
    ? `${formatIDRNumber(selectedCount.value)} terpilih`
    : `${formatIDRNumber(total.value)} data`
);

async function exportExcel() {
  if (exporting.value) return;
  exporting.value = true;
  const bySelection = selectedCount.value > 0;
  try {
    const rowsToExport = bySelection
      ? await ambilLaporanByIds([...selected.keys()])
      : await ambilSemuaRiwayat(current.value);
    if (!rowsToExport.length) {
      showToast('ℹ️ Tidak ada data untuk diexport (mungkin sudah dihapus).', 'error', 5000);
      return;
    }
    let sheetNames;
    try {
      ({ sheetNames } = await downloadExcel(rowsToExport));
    } catch (err) {
      throw new Error(`Gagal membuat file Excel: ${err.message}`);
    }
    const missing = bySelection ? selectedCount.value - rowsToExport.length : 0;
    showToast(
      `✅ File Excel diunduh: ${formatIDRNumber(rowsToExport.length)} data, ` +
        `${sheetNames.length - 1} sheet Bidang/UPTD + Rekapitulasi.` +
        (missing > 0 ? ` (${formatIDRNumber(missing)} data terpilih sudah dihapus.)` : ''),
      'success',
      5000
    );
  } catch (err) {
    showToast(`❌ ${err.message}`, 'error', 6000);
  } finally {
    exporting.value = false;
  }
}

// --- Hapus satu / banyak (dengan dialog konfirmasi) ---
const deleteDialog = ref(null);
const deleteTargets = ref([]); // baris yang akan dihapus
const deleteIsBulk = ref(false); // dari pilihan (centang) atau dari tombol hapus di baris
const deleting = ref(false);
const deleteError = ref('');

async function openDeleteDialog(targets, bulk) {
  deleteTargets.value = targets;
  deleteIsBulk.value = bulk;
  deleteError.value = '';
  // Tunggu isi dialog dirender dulu, agar fokus awal jatuh ke tombol "Batal" (autofocus).
  await nextTick();
  deleteDialog.value?.showModal();
}

function askDelete(row) {
  openDeleteDialog([row], false);
}

function askBulkDelete() {
  const targets = [...selected.values()].sort(
    (a, b) => b.tgl_acara.localeCompare(a.tgl_acara) || b.id - a.id
  );
  if (targets.length) openDeleteDialog(targets, true);
}

function closeDelete() {
  if (!deleting.value) deleteDialog.value?.close();
}

function onDialogClose() {
  deleteTargets.value = [];
  deleteError.value = '';
}

/** Esc menutup dialog, kecuali saat proses hapus berjalan. */
function onDialogCancel(event) {
  if (deleting.value) event.preventDefault();
}

/** Klik di luar kotak dialog (backdrop) = Batal. */
function onDialogClick(event) {
  if (event.target === deleteDialog.value) closeDelete();
}

async function confirmDelete() {
  const targets = deleteTargets.value;
  if (!targets.length || deleting.value) return;
  const ids = targets.map((r) => r.id);
  deleting.value = true;
  deleteError.value = '';
  try {
    let deletedCount;
    if (deleteIsBulk.value) {
      deletedCount = await hapusLaporanBanyak(ids);
    } else {
      await hapusLaporan(ids[0]);
      deletedCount = 1;
    }
    // Data yang sedang dibuka di kalkulator (mode edit) ikut dikosongkan.
    if (ids.includes(editing.id)) resetForm();
    ids.forEach((id) => selected.delete(id));
    deleting.value = false;
    deleteDialog.value?.close();

    if (!deleteIsBulk.value) {
      const row = targets[0];
      notice.value = { text: `🗑️ Data “${row.nama_acara}” (${formatTanggalDMY(row.tgl_acara)}) telah dihapus.` };
    } else {
      const gone = ids.length - deletedCount;
      notice.value = {
        text: `🗑️ ${formatIDRNumber(deletedCount)} data telah dihapus.` +
          (gone > 0 ? ` (${formatIDRNumber(gone)} data sudah tidak ada sebelumnya.)` : '')
      };
    }

    // Jika halaman ini kini di luar jangkauan (PostgREST akan menolaknya), pindah ke halaman terakhir.
    const lastPage = Math.max(1, Math.ceil((total.value - deletedCount) / PAGE_SIZE));
    if (current.value.page > lastPage) {
      navigate(lastPage);
    } else {
      await load();
    }
  } catch (err) {
    deleteError.value = err.message;
  } finally {
    deleting.value = false;
  }
}

// --- Tampilan baris ---
const LUAS_MODE_LABEL = { cepat: 'Pilihan cepat', panjang_lebar: 'Panjang × lebar', total: 'Total luas' };

/** "25 × 12,5 m" untuk data yang diukur panjang × lebar, selain itu ''. */
function luasDimensi(row) {
  if (row.luas_mode !== 'panjang_lebar' || !row.panjang || !row.lebar) return '';
  return `${formatDecimalID(Number(row.panjang))} × ${formatDecimalID(Number(row.lebar))} m`;
}

/** Nomor urut lintas halaman (halaman 2 mulai dari 11). */
function rowNumber(index) {
  return (loadedPage.value - 1) * PAGE_SIZE + index + 1;
}
</script>

<template>
  <div class="section-divider-title">
    <span>🗂️ RIWAYAT DATA TERSIMPAN</span>
  </div>

  <section v-if="!isSupabaseConfigured" class="form-card notice-card notice-error">
    <strong>Penyimpanan belum dikonfigurasi.</strong>
    <p>
      Isi <code>VITE_SUPABASE_URL</code> dan <code>VITE_SUPABASE_PUBLISHABLE_KEY</code>
      (lihat <code>.env.example</code>), lalu jalankan ulang aplikasi.
    </p>
  </section>

  <template v-else>
    <!-- Filter -->
    <section class="form-card" aria-label="Filter riwayat">
      <CardTitle badge="🔍" title="Filter Data" desc="Persempit daftar berdasarkan tanggal, lokasi, acara, bidang, atau jenis acara" />

      <div class="form-grid-identitas">
        <div class="field-item field-span-full">
          <span class="field-label" id="filterTanggalLabel">Rentang Tanggal</span>
          <div class="input-duo" role="group" aria-labelledby="filterTanggalLabel">
            <div class="field-item">
              <label for="filterDari" class="sub-label">Dari</label>
              <DateField
                id="filterDari"
                v-model="form.dari"
                aria-label="Tanggal mulai"
                :max="form.sampai"
                @update:model-value="navigate(1)"
              />
            </div>
            <div class="field-item">
              <label for="filterSampai" class="sub-label">Sampai</label>
              <DateField
                id="filterSampai"
                v-model="form.sampai"
                aria-label="Tanggal akhir"
                :min="form.dari"
                @update:model-value="navigate(1)"
              />
            </div>
          </div>
        </div>
        <div class="field-item">
          <label for="filterLokasi">Tempat / Lokasi</label>
          <input
            id="filterLokasi"
            v-model="form.lokasi"
            type="search"
            class="text-input"
            placeholder="Cari lokasi…"
            @input="onTextFilterInput"
          >
        </div>
        <div class="field-item">
          <label for="filterAcara">Acara</label>
          <input
            id="filterAcara"
            v-model="form.acara"
            type="search"
            class="text-input"
            placeholder="Cari acara…"
            @input="onTextFilterInput"
          >
        </div>
        <div class="field-item">
          <label for="filterBidang">Bidang / UPTD</label>
          <select
            id="filterBidang"
            v-model="form.bidang"
            class="text-input select-input"
            @change="navigate(1)"
          >
            <option value="">Semua Bidang / UPTD</option>
            <option v-for="b in BIDANG_OPTIONS" :key="b" :value="b">{{ b }}</option>
          </select>
        </div>
        <div class="field-item">
          <label for="filterInternal">Acara Internal ?</label>
          <select
            id="filterInternal"
            v-model="form.internal"
            class="text-input select-input"
            @change="navigate(1)"
          >
            <option value="">Semua (Ya &amp; Tidak)</option>
            <option value="ya">Ya — Internal</option>
            <option value="tidak">Tidak — Eksternal</option>
          </select>
        </div>
      </div>

      <div v-if="hasFilters" class="filter-actions">
        <button type="button" class="link-btn" @click="resetFilters">✕ Hapus semua filter</button>
      </div>
    </section>

    <!-- Daftar -->
    <section id="riwayatList" class="history-section" :aria-busy="loading">
      <div v-if="notice" class="form-card notice-card notice-success" role="status">
        <strong>{{ notice.text }}</strong>
        <button type="button" class="notice-close" aria-label="Tutup pesan" @click="notice = null">✕</button>
      </div>

      <div class="history-summary">
        <span class="history-range">
          {{ loading && !rows.length ? 'Memuat data…' : rangeText }}
          <span v-if="loading && rows.length" class="loading-dot">· Memuat…</span>
        </span>
        <div v-if="canExport" class="list-actions" role="region" aria-label="Aksi daftar riwayat">
          <template v-if="selectedCount > 0">
            <span class="bulk-count">{{ formatIDRNumber(selectedCount) }} dipilih</span>
            <button type="button" class="link-btn" @click="clearSelection">Batal pilih</button>
            <button type="button" class="action-btn btn-danger btn-compact" @click="askBulkDelete">
              <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="none"
                   stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 6h18" />
                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              </svg>
              <span>Hapus {{ formatIDRNumber(selectedCount) }} data</span>
            </button>
          </template>
          <button
            type="button"
            class="action-btn btn-excel btn-compact"
            :disabled="exporting"
            :aria-busy="exporting"
            :title="selectedCount > 0
              ? 'Export hanya data yang dipilih ke Excel'
              : 'Export semua data sesuai filter ke Excel (semua halaman)'"
            @click="exportExcel"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="none"
                 stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>{{ exporting ? 'Menyiapkan…' : `Export Excel · ${exportLabel}` }}</span>
          </button>
        </div>
      </div>

      <div v-if="errorMessage" class="form-card notice-card notice-error" role="alert">
        <strong>{{ errorMessage }}</strong>
        <button type="button" class="link-btn" @click="load">↻ Coba lagi</button>
      </div>

      <div v-else-if="!loading && rows.length === 0" class="form-card notice-card">
        <template v-if="hasFilters">
          <strong>Tidak ada data yang cocok dengan filter.</strong>
          <button type="button" class="link-btn" @click="resetFilters">✕ Hapus semua filter</button>
        </template>
        <template v-else>
          <strong>Belum ada data tersimpan.</strong>
          <p>Isi kalkulator lalu tekan <em>Simpan</em> untuk menambahkan data pertama.</p>
          <RouterLink to="/" class="link-btn">← Ke Kalkulator</RouterLink>
        </template>
      </div>

      <div v-else class="table-scroll" :class="{ 'is-loading': loading }" tabindex="0" aria-labelledby="riwayatCaption">
        <table class="history-table">
          <caption id="riwayatCaption" class="visually-hidden">
            Riwayat data tersimpan{{ rangeText ? `, ${rangeText}` : '' }}
          </caption>
          <thead>
            <tr>
              <th scope="col" class="col-select">
                <input
                  type="checkbox"
                  class="row-check"
                  :checked="allOnPageSelected"
                  :indeterminate="someOnPageSelected"
                  :disabled="!rows.length"
                  aria-label="Pilih semua data di halaman ini"
                  title="Pilih semua di halaman ini"
                  @change="togglePage($event.target.checked)"
                >
              </th>
              <th scope="col" class="col-num w-no">No</th>
              <th scope="col" class="w-date">Tanggal</th>
              <th scope="col" class="col-text">Acara</th>
              <th scope="col" class="col-text">Tempat / Lokasi</th>
              <th scope="col" class="col-text">Penyeleng&shy;gara</th>
              <th scope="col" class="w-bidang">Bidang / UPTD</th>
              <th scope="col" class="w-internal">Acara Internal</th>
              <th scope="col" class="col-num w-luas">Luas (A)</th>
              <th scope="col" class="col-num w-density">Kepadatan (D)</th>
              <th scope="col" class="col-num w-penonton">Penonton</th>
              <th scope="col" class="col-num w-pelaku">Pelaku Seni</th>
              <th scope="col" class="col-action"><span class="visually-hidden">Aksi</span></th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(row, i) in rows"
              :key="row.id"
              :data-row-id="row.id"
              :class="{ 'is-highlight': row.id === highlightId, 'is-selected': selected.has(row.id) }"
            >
              <td class="col-select">
                <input
                  type="checkbox"
                  class="row-check"
                  :checked="selected.has(row.id)"
                  :aria-label="`Pilih data ${row.nama_acara} (${formatTanggalDMY(row.tgl_acara)})`"
                  @change="toggleRow(row, $event.target.checked)"
                >
              </td>
              <td class="col-num cell-dim">{{ rowNumber(i) }}</td>
              <td class="cell-nowrap" :title="formatTanggalSingkat(row.tgl_acara)">
                {{ formatTanggalDMY(row.tgl_acara) }}
                <small
                  v-if="row.updated_at"
                  class="cell-sub"
                  :title="`Terakhir diubah ${formatTimestampLengkap(row.updated_at)}`"
                >
                  diubah {{ formatTimestampDMY(row.updated_at) }}
                </small>
              </td>
              <td class="col-text cell-strong">{{ row.nama_acara }}</td>
              <td class="col-text">{{ row.tempat_acara || '-' }}</td>
              <td class="col-text">{{ row.penyelenggara }}</td>
              <td class="cell-nowrap"><span class="val-pill">{{ row.bidang }}</span></td>
              <td class="cell-nowrap">
                <span v-if="row.acara_internal === null" class="cell-dim" title="Data lama, belum dicatat">-</span>
                <span v-else class="internal-tag" :class="row.acara_internal ? 'is-internal' : 'is-external'">
                  {{ row.acara_internal ? 'Ya' : 'Tidak' }}
                </span>
              </td>
              <td class="col-num cell-nowrap" :title="LUAS_MODE_LABEL[row.luas_mode]">
                {{ row.luas_area != null ? `${formatIDRNumber(row.luas_area)} m²` : '-' }}
                <small v-if="luasDimensi(row)" class="cell-sub">{{ luasDimensi(row) }}</small>
              </td>
              <td class="col-num cell-nowrap">{{ formatDecimalID(Number(row.kepadatan)) }} org/m&sup2;</td>
              <td class="col-num cell-nowrap cell-total">{{ formatIDRNumber(row.total_penonton) }}</td>
              <td class="col-num cell-nowrap cell-total">
                {{ row.total_pelaku !== null ? formatIDRNumber(row.total_pelaku) : '-' }}
              </td>
              <td class="col-action">
                <div class="row-actions">
                  <button
                    type="button"
                    class="icon-btn is-wa"
                    :aria-label="`Salin pesan WhatsApp untuk ${row.nama_acara} (${formatTanggalDMY(row.tgl_acara)})`"
                    :title="copiedId === row.id ? 'Tersalin!' : 'Salin pesan WhatsApp'"
                    @click="copyRow(row)"
                  >
                    <svg v-if="copiedId === row.id" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"
                         fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <svg v-else viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none"
                         stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    class="icon-btn is-print"
                    :aria-label="`Cetak / simpan PDF untuk ${row.nama_acara} (${formatTanggalDMY(row.tgl_acara)})`"
                    title="Cetak / Simpan PDF"
                    @click="printRow(row)"
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none"
                         stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="6 9 6 2 18 2 18 9" />
                      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                      <rect x="6" y="14" width="12" height="8" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    class="icon-btn is-edit"
                    :aria-label="`Edit data ${row.nama_acara} (${formatTanggalDMY(row.tgl_acara)})`"
                    title="Edit data ini"
                    @click="editRow(row)"
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none"
                         stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    class="icon-btn is-danger"
                    :aria-label="`Hapus data ${row.nama_acara} (${formatTanggalDMY(row.tgl_acara)})`"
                    title="Hapus data ini"
                    @click="askDelete(row)"
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none"
                         stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M3 6h18" />
                      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6" />
                      <path d="M14 11v6" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <PaginationBar
        :page="current.page"
        :total-pages="totalPages"
        :disabled="loading"
        @go="goToPage"
      />
    </section>

    <!-- Notifikasi melayang (salin WhatsApp) -->
    <div
      class="toast-box floating-toast"
      :class="[toast ? `toast-${toast.variant}` : 'hidden']"
      role="status"
      aria-live="polite"
    >
      {{ toast?.text }}
    </div>

    <!-- Dialog konfirmasi hapus -->
    <dialog
      ref="deleteDialog"
      class="confirm-dialog"
      aria-labelledby="hapusTitle"
      aria-describedby="hapusDesc"
      @close="onDialogClose"
      @cancel="onDialogCancel"
      @click="onDialogClick"
    >
      <div v-if="deleteTargets.length" class="confirm-dialog-body">
        <template v-if="deleteTargets.length === 1">
          <h2 id="hapusTitle" class="confirm-dialog-title">🗑️ Hapus data ini?</h2>
          <dl class="confirm-dialog-detail">
            <div><dt>Acara</dt><dd>{{ deleteTargets[0].nama_acara }}</dd></div>
            <div><dt>Tanggal</dt><dd>{{ formatTanggalSingkat(deleteTargets[0].tgl_acara) }}</dd></div>
            <div><dt>Tempat / Lokasi</dt><dd>{{ deleteTargets[0].tempat_acara || '-' }}</dd></div>
            <div><dt>Bidang / UPTD</dt><dd>{{ deleteTargets[0].bidang }}</dd></div>
          </dl>
        </template>
        <template v-else>
          <h2 id="hapusTitle" class="confirm-dialog-title">
            🗑️ Hapus {{ formatIDRNumber(deleteTargets.length) }} data terpilih?
          </h2>
          <ol class="confirm-dialog-list" tabindex="0" aria-label="Data yang akan dihapus">
            <li v-for="row in deleteTargets" :key="row.id">
              <span class="list-date">{{ formatTanggalDMY(row.tgl_acara) }}</span>
              <span class="list-name">{{ row.nama_acara }}</span>
              <span class="list-meta">{{ row.bidang }}</span>
            </li>
          </ol>
        </template>
        <p id="hapusDesc" class="confirm-dialog-note">
          Data akan hilang dari riwayat dan tidak bisa diedit lagi. Hubungi Bu Esti jika perlu dipulihkan.
        </p>
        <p v-if="deleteError" class="field-error" role="alert">{{ deleteError }}</p>
        <div class="confirm-dialog-actions">
          <button type="button" class="action-btn btn-secondary" :disabled="deleting" autofocus @click="closeDelete">
            Batal
          </button>
          <button type="button" class="action-btn btn-danger" :disabled="deleting" @click="confirmDelete">
            {{ deleting ? 'Menghapus…' : deleteTargets.length > 1 ? `Hapus ${formatIDRNumber(deleteTargets.length)} data` : 'Hapus' }}
          </button>
        </div>
      </div>
    </dialog>
  </template>
</template>
