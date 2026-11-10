/**
 * TAKAR BUDAYA - state aplikasi (singleton, dibagi antar komponen).
 * Dua modul yang berdiri sendiri dan boleh dikosongi:
 * 1. Hitung Penonton (Metode Herbert Jacobs: P = A x D)
 * 2. Hitung Pelaku Seni / Pendukung (Pemeran Utama, Pendukung, Pemusik)
 */
import { reactive, computed, ref, nextTick } from 'vue';
import { DENSITY_OPTIONS, DEFAULT_DENSITY, BIDANG_OPTIONS, QUICK_AREAS } from '../data/options.js';
import { buildReport } from '../utils/report.js';
import {
  formatIDRNumber,
  formatDecimalID,
  todayISO,
  parsePositive,
  parseNonNegativeInt
} from '../utils/format.js';

/** Isi form kosong (tanggal = hari ini). */
function blankState() {
  return {
    // --- Identitas acara ---
    tglAcara: todayISO(),
    tempatAcara: '',
    namaAcara: '',
    penyelenggaraAcara: '',
    bidangPelaksana: '',
    acaraInternal: null, // true = Ya, false = Tidak, null = belum dipilih

    // --- Bagian 1: Penonton ---
    areaMode: null, // 'quick' | 'custom' | null (null = tidak dihitung)
    quickAreaVal: null,
    customSubMode: 'pl', // 'pl' | 'total'
    panjangInput: '',
    lebarInput: '',
    totalLuasInput: '',
    density: DEFAULT_DENSITY,

    // --- Bagian 2: Pelaku seni ---
    pelakuInput: ''
  };
}

const state = reactive(blankState());

// --- Turunan: Penonton ---
const panjang = computed(() => parsePositive(state.panjangInput));
const lebar = computed(() => parsePositive(state.lebarInput));
const totalLuasCustom = computed(() => parsePositive(state.totalLuasInput));

const activeArea = computed(() => {
  if (state.areaMode === 'quick') return state.quickAreaVal;
  if (state.areaMode === 'custom') {
    if (state.customSubMode === 'pl') {
      return panjang.value && lebar.value ? Math.round(panjang.value * lebar.value) : null;
    }
    return totalLuasCustom.value ? Math.round(totalLuasCustom.value) : null;
  }
  return null;
});

const totalPenonton = computed(() =>
  activeArea.value !== null && activeArea.value > 0
    ? Math.round(activeArea.value * state.density)
    : null
);

// --- Turunan: Pelaku seni ---
const totalPelakuSeni = computed(() => parseNonNegativeInt(state.pelakuInput));

// --- Teks siap tampil ---
const strA = computed(() => formatIDRNumber(activeArea.value));
const strD = computed(() => formatDecimalID(state.density));
const strTotalPenonton = computed(() => formatIDRNumber(totalPenonton.value));
const strTotalPelaku = computed(() => formatIDRNumber(totalPelakuSeni.value));

/** Cara luas diukur, sesuai kolom luas_mode di database. */
const luasMode = computed(() =>
  state.areaMode === 'quick' ? 'cepat' : state.customSubMode === 'pl' ? 'panjang_lebar' : 'total'
);

/** Data pesan WhatsApp & lembar PDF dari isian kalkulator. */
const report = computed(() =>
  buildReport({
    tglAcara: state.tglAcara,
    tempatAcara: state.tempatAcara,
    namaAcara: state.namaAcara,
    penyelenggaraAcara: state.penyelenggaraAcara,
    bidangPelaksana: state.bidangPelaksana,
    luasMode: activeArea.value !== null ? luasMode.value : null,
    luasArea: activeArea.value,
    panjang: panjang.value,
    lebar: lebar.value,
    density: state.density,
    totalPelaku: totalPelakuSeni.value
  })
);

// --- Validasi sebelum Simpan ---
const REQUIRED_FIELDS = [
  { key: 'tglAcara', label: 'Tanggal', filled: () => Boolean(state.tglAcara) },
  { key: 'namaAcara', label: 'Acara', filled: () => state.namaAcara.trim() !== '' },
  { key: 'penyelenggaraAcara', label: 'Penyelenggara', filled: () => state.penyelenggaraAcara.trim() !== '' },
  { key: 'bidangPelaksana', label: 'Bidang / UPTD', filled: () => BIDANG_OPTIONS.includes(state.bidangPelaksana) },
  { key: 'acaraInternal', label: 'Acara Internal', filled: () => typeof state.acaraInternal === 'boolean' },
  { key: 'luasArea', label: 'Luas Area', filled: () => activeArea.value !== null && activeArea.value > 0 }
];

/** Daftar isian wajib yang masih kosong, urut sesuai form. */
const missingFields = computed(() =>
  REQUIRED_FIELDS.filter((f) => !f.filled()).map(({ key, label }) => ({ key, label }))
);

/** Disorot merah hanya setelah pengguna mencoba menyimpan. */
const validationShown = ref(false);

function isFieldInvalid(key) {
  return validationShown.value && missingFields.value.some((f) => f.key === key);
}

/** Baris untuk tabel public.laporan_takar (total_penonton dihitung database). */
function toRecord() {
  return {
    tgl_acara: state.tglAcara,
    tempat_acara: state.tempatAcara.trim(),
    nama_acara: state.namaAcara.trim(),
    penyelenggara: state.penyelenggaraAcara.trim(),
    bidang: state.bidangPelaksana,
    acara_internal: state.acaraInternal,
    luas_mode: luasMode.value,
    panjang: luasMode.value === 'panjang_lebar' ? panjang.value : null,
    lebar: luasMode.value === 'panjang_lebar' ? lebar.value : null,
    luas_area: activeArea.value,
    kepadatan: state.density,
    total_pelaku: totalPelakuSeni.value
  };
}

/** Isi data yang dimuat untuk diedit, untuk mendeteksi "tidak ada perubahan" saat Simpan. */
const lastSavedSnapshot = ref(null);

// --- Perubahan belum disimpan ---
const stateSnapshot = () => JSON.stringify(state);
/** Isi form saat terakhir dikosongkan, dimuat dari riwayat, atau disimpan. */
const baselineSnapshot = ref(stateSnapshot());
const isDirty = computed(() => stateSnapshot() !== baselineSnapshot.value);

function markClean() {
  baselineSnapshot.value = stateSnapshot();
}

// --- Mode edit (data dari halaman riwayat) ---
const editing = reactive({
  id: null, // id baris yang sedang diedit; null = mode isi baru
  loading: false,
  error: '',
  original: null, // baris asli dari database
  returnTo: '/history' // halaman riwayat (dengan filter) untuk kembali setelah simpan / batal
});

/** Pesan sekali tampil untuk halaman riwayat setelah edit tersimpan. */
const flash = ref(null); // { text, highlightId }

/** Kosongkan form dan keluar dari mode edit. */
function resetForm() {
  Object.assign(state, blankState());
  Object.assign(editing, { id: null, loading: false, error: '', original: null, returnTo: '/history' });
  validationShown.value = false;
  lastSavedSnapshot.value = null;
  markClean();
}

/** Isi form dari satu baris public.laporan_takar (kebalikan dari toRecord). */
function loadRecord(row) {
  const next = blankState();
  next.tglAcara = row.tgl_acara;
  next.tempatAcara = row.tempat_acara ?? '';
  next.namaAcara = row.nama_acara ?? '';
  next.penyelenggaraAcara = row.penyelenggara ?? '';
  next.bidangPelaksana = BIDANG_OPTIONS.includes(row.bidang) ? row.bidang : '';
  next.acaraInternal = typeof row.acara_internal === 'boolean' ? row.acara_internal : null;

  const luas = Number(row.luas_area);
  if (row.luas_mode === 'cepat' && QUICK_AREAS.includes(luas)) {
    next.areaMode = 'quick';
    next.quickAreaVal = luas;
  } else if (row.luas_mode === 'panjang_lebar' && row.panjang != null && row.lebar != null) {
    next.areaMode = 'custom';
    next.customSubMode = 'pl';
    next.panjangInput = String(Number(row.panjang));
    next.lebarInput = String(Number(row.lebar));
  } else if (luas > 0) {
    next.areaMode = 'custom';
    next.customSubMode = 'total';
    next.totalLuasInput = String(luas);
  }

  const density = Number(row.kepadatan);
  next.density = DENSITY_OPTIONS.some((o) => o.value === density) ? density : DEFAULT_DENSITY;
  next.pelakuInput = row.total_pelaku == null ? '' : String(row.total_pelaku);

  Object.assign(state, next);
  validationShown.value = false;
  lastSavedSnapshot.value = JSON.stringify(toRecord());
  markClean();
}

// --- Cetak PDF dari laporan yang "dibekukan" ---
/**
 * Laporan yang sedang dicetak. Dirender oleh App.vue (di luar .main-wrapper) dan
 * tidak ikut berubah saat form dikosongkan / pindah halaman, sampai dialog print ditutup.
 */
const printJob = ref(null);

async function printReport(report) {
  printJob.value = { ...report };
  await nextTick(); // lembar cetak harus sudah ada di DOM sebelum dialog print dibuka
  window.print();
}

if (typeof window !== 'undefined') {
  window.addEventListener('afterprint', () => {
    printJob.value = null;
  });
}

// --- Aksi ---
function clearCustomInputs() {
  state.panjangInput = '';
  state.lebarInput = '';
  state.totalLuasInput = '';
}

/** Pilih tombol luas cepat (angka) atau 'custom'. Klik ulang tombol aktif = batal. */
function toggleArea(choice) {
  const isActive =
    choice === 'custom'
      ? state.areaMode === 'custom'
      : state.areaMode === 'quick' && state.quickAreaVal === choice;

  if (isActive) {
    state.areaMode = null;
    state.quickAreaVal = null;
    clearCustomInputs();
    return;
  }

  if (choice === 'custom') {
    state.areaMode = 'custom';
  } else {
    state.areaMode = 'quick';
    state.quickAreaVal = choice;
  }
}

function setCustomSubMode(mode) {
  state.customSubMode = mode;
}

function setDensity(value) {
  state.density = value;
}

function stepPelaku(delta) {
  const curr = totalPelakuSeni.value ?? 0;
  state.pelakuInput = String(Math.max(0, curr + delta));
}

export function useTakarStore() {
  return {
    state,
    activeArea,
    report,
    totalPenonton,
    totalPelakuSeni,
    strA,
    strD,
    strTotalPenonton,
    strTotalPelaku,
    missingFields,
    validationShown,
    isFieldInvalid,
    toRecord,
    lastSavedSnapshot,
    isDirty,
    markClean,
    editing,
    flash,
    resetForm,
    loadRecord,
    printJob,
    printReport,
    toggleArea,
    setCustomSubMode,
    setDensity,
    stepPelaku
  };
}
