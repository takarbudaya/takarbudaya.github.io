<script setup>
import CardTitle from './CardTitle.vue';
import { useTakarStore } from '../composables/useTakarStore.js';
import { QUICK_AREAS } from '../data/options.js';
import { formatIDRNumber } from '../utils/format.js';

const { state, activeArea, strA, toggleArea, setCustomSubMode, isFieldInvalid } = useTakarStore();

const isQuickActive = (val) => state.areaMode === 'quick' && state.quickAreaVal === val;
</script>

<template>
  <section id="luasArea" class="form-card" :class="{ 'is-invalid': isFieldInvalid('luasArea') }">
    <CardTitle
      badge="A"
      required
      title="Luas Area Penonton (A)"
      desc="Pilih ukuran cepat atau masukkan ukuran luas area efektif"
    />

    <!-- Tombol cepat luas (klik untuk pilih, klik lagi untuk batal) -->
    <div class="quick-buttons-row">
      <button
        v-for="val in QUICK_AREAS"
        :key="val"
        type="button"
        class="quick-btn"
        :class="{ active: isQuickActive(val) }"
        @click="toggleArea(val)"
      >
        {{ formatIDRNumber(val) }} m&sup2;
      </button>
      <button
        type="button"
        class="quick-btn"
        :class="{ active: state.areaMode === 'custom' }"
        @click="toggleArea('custom')"
      >
        Ketik Sendiri &hellip;
      </button>
    </div>

    <!-- Input manual luas (.custom-area-box tersembunyi secara default di CSS) -->
    <div class="custom-area-box" :style="{ display: state.areaMode === 'custom' ? 'block' : 'none' }">
      <div class="sub-toggle-tabs">
        <button
          type="button"
          class="sub-tab"
          :class="{ active: state.customSubMode === 'pl' }"
          @click="setCustomSubMode('pl')"
        >
          Panjang &times; Lebar
        </button>
        <button
          type="button"
          class="sub-tab"
          :class="{ active: state.customSubMode === 'total' }"
          @click="setCustomSubMode('total')"
        >
          Total Luas (m&sup2;)
        </button>
      </div>

      <div v-if="state.customSubMode === 'pl'" class="input-duo">
        <div class="field-item">
          <label for="inputPanjang">Panjang (meter)</label>
          <input
            id="inputPanjang"
            v-model="state.panjangInput"
            type="number"
            class="text-input"
            placeholder="0"
            min="1"
            step="1"
          >
        </div>
        <div class="field-item">
          <label for="inputLebar">Lebar (meter)</label>
          <input
            id="inputLebar"
            v-model="state.lebarInput"
            type="number"
            class="text-input"
            placeholder="0"
            min="1"
            step="1"
          >
        </div>
      </div>

      <div v-else class="input-single">
        <div class="field-item">
          <label for="inputTotalLuas">Total Luas Lokasi (m&sup2;)</label>
          <input
            id="inputTotalLuas"
            v-model="state.totalLuasInput"
            type="number"
            class="text-input"
            placeholder="0"
            min="1"
            step="10"
          >
        </div>
      </div>
    </div>

    <!-- Indikator luas terpilih -->
    <div class="active-val-banner">
      <span>Luas Lokasi Terhitung (A):</span>
      <strong>{{ activeArea !== null ? `${strA} m²` : 'Tidak dihitung / belum diisi' }}</strong>
    </div>
    <p v-if="isFieldInvalid('luasArea')" class="field-error">
      Luas area wajib diisi untuk menyimpan data. Pilih ukuran cepat atau ketik sendiri.
    </p>
  </section>
</template>
