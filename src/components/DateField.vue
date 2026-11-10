<script setup>
/**
 * Input tanggal bertampilan DD/MM/YYYY: input teks hanya-baca untuk tampilan,
 * ditutup input type="date" transparan yang membuka pemilih tanggal bawaan.
 * v-model berisi string ISO (YYYY-MM-DD) atau ''.
 */
import { computed, ref } from 'vue';
import { formatTanggalDMY } from '../utils/format.js';

const model = defineModel({ type: String, default: '' });

defineProps({
  id: { type: String, default: undefined },
  ariaLabel: { type: String, default: 'Pilih tanggal' },
  min: { type: String, default: '' },
  max: { type: String, default: '' },
  invalid: { type: Boolean, default: false }
});

const picker = ref(null);
const display = computed(() => formatTanggalDMY(model.value));

function openPicker() {
  try {
    picker.value?.showPicker?.();
  } catch {
    // showPicker tidak didukung / butuh gestur pengguna
  }
}
</script>

<template>
  <div class="date-input-wrapper">
    <input
      type="text"
      class="text-input date-display-input"
      :class="{ 'is-invalid': invalid }"
      placeholder="dd/mm/yyyy"
      readonly
      :value="display"
      @click="openPicker"
    >
    <input
      :id="id"
      ref="picker"
      v-model="model"
      type="date"
      class="date-picker-overlay"
      :aria-label="ariaLabel"
      :aria-invalid="invalid || undefined"
      :min="min || undefined"
      :max="max || undefined"
      @click="openPicker"
      @focus="openPicker"
    >
    <span class="calendar-icon">📅</span>
  </div>
</template>
