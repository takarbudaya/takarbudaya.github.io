<script setup>
import CardTitle from './CardTitle.vue';
import { useTakarStore } from '../composables/useTakarStore.js';
import { DENSITY_OPTIONS } from '../data/options.js';
import { formatDecimalID } from '../utils/format.js';

const { state, setDensity } = useTakarStore();
</script>

<template>
  <section class="form-card">
    <CardTitle
      badge="D"
      title="Kepadatan Penonton per m² (D)"
      desc="Perkiraan kerapatan posisi penonton di lokasi acara"
    />

    <div class="selection-grid" role="radiogroup" aria-label="Kepadatan penonton">
      <div
        v-for="opt in DENSITY_OPTIONS"
        :key="opt.value"
        class="select-card"
        :class="{ active: state.density === opt.value }"
        role="radio"
        :aria-checked="state.density === opt.value"
        tabindex="0"
        @click="setDensity(opt.value)"
        @keydown.enter.prevent="setDensity(opt.value)"
        @keydown.space.prevent="setDensity(opt.value)"
      >
        <div class="select-indicator"></div>
        <div class="select-body">
          <div class="select-header">
            <span class="select-title">{{ opt.title }}</span>
            <span class="val-pill">{{ formatDecimalID(opt.value.toFixed(1)) }} org/m&sup2;</span>
          </div>
          <p class="select-note">{{ opt.note }}</p>
        </div>
      </div>
    </div>
  </section>
</template>
