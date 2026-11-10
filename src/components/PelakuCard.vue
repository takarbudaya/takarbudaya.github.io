<script setup>
import CardTitle from './CardTitle.vue';
import { useTakarStore } from '../composables/useTakarStore.js';

const { state, stepPelaku } = useTakarStore();
</script>

<template>
  <section class="form-card">
    <CardTitle
      badge="2"
      title="Jumlah Pelaku Seni / Pendukung"
      desc="Akumulasi jumlah pemeran utama, pemain pendukung, dan pemusik"
    />

    <div class="pelaku-input-wrap">
      <label for="inputPelakuSeni" class="pelaku-label">Masukkan Jumlah Pelaku Seni / Pendukung:</label>
      <div class="pelaku-counter-box">
        <button
          type="button"
          class="counter-btn"
          aria-label="Kurangi 1 pelaku seni"
          @click="stepPelaku(-1)"
        >
          &minus;
        </button>
        <div class="counter-input-group">
          <input
            id="inputPelakuSeni"
            v-model="state.pelakuInput"
            type="number"
            class="counter-field"
            placeholder="0"
            min="0"
            step="1"
          >
          <span class="counter-unit">Orang</span>
        </div>
        <button
          type="button"
          class="counter-btn"
          aria-label="Tambah 1 pelaku seni"
          @click="stepPelaku(1)"
        >
          &plus;
        </button>
      </div>
      <p class="pelaku-subtext">
        Akumulasi terdata dari Pemeran Utama, Pemain Pendukung, dan Pemusik (Dapat dikosongi jika tidak ada)
      </p>
    </div>
  </section>
</template>
