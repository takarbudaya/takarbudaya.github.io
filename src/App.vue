<script setup>
import AppHeader from './components/AppHeader.vue';
import AppFooter from './components/AppFooter.vue';
import PrintSheet from './components/PrintSheet.vue';
import { useTakarStore } from './composables/useTakarStore.js';

const { printJob } = useTakarStore();
</script>

<template>
  <!-- Latar belakang tradisional Jawa (matte sogan & kayu jati) -->
  <div class="jawa-bg">
    <div class="kawung-watermark"></div>
  </div>

  <div class="main-wrapper">
    <AppHeader />

    <nav class="app-nav" aria-label="Navigasi utama">
      <RouterLink to="/" class="app-nav-link" exact-active-class="active">🧮 Kalkulator</RouterLink>
      <RouterLink to="/history" class="app-nav-link" active-class="active">🗂️ Riwayat</RouterLink>
    </nav>

    <main class="content-container">
      <RouterView />
    </main>

    <AppFooter />
  </div>

  <!-- Lembar cetak dari tombol PDF (kalkulator & riwayat). Di luar .main-wrapper agar ikut tercetak. -->
  <PrintSheet v-if="printJob" :report="printJob" />
</template>
