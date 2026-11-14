<script setup>
import AppHeader from './components/AppHeader.vue';
import AppFooter from './components/AppFooter.vue';
import ThemeToggle from './components/ThemeToggle.vue';
import PrintSheet from './components/PrintSheet.vue';
import { watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useTakarStore } from './composables/useTakarStore.js';
import { useAuth } from './composables/useAuth.js';

const route = useRoute();
const router = useRouter();
const { printJob, isDirty, resetForm } = useTakarStore();
const { user, isLoggedIn, signOut } = useAuth();

async function logout() {
  if (isDirty.value && !window.confirm('Isian di Kalkulator belum disimpan dan akan hilang. Tetap keluar?')) return;
  await signOut();
}

// Keluar (tombol, tab lain, atau sesi kedaluwarsa): kosongkan form dan kembali ke halaman login.
watch(isLoggedIn, (loggedIn) => {
  if (loggedIn) return;
  resetForm();
  if (!route.meta.public) router.replace({ name: 'login' });
});
</script>

<template>
  <!-- Latar belakang tradisional Jawa (matte sogan & kayu jati) -->
  <div class="jawa-bg">
    <div class="kawung-watermark"></div>
  </div>

  <div class="main-wrapper">
    <!-- Pojok kanan atas: mode gelap/terang, lalu pengguna login + tombol keluar -->
    <div class="top-bar">
      <ThemeToggle />
      <div v-if="isLoggedIn" class="session-bar">
        <span class="session-user" :title="user?.email">👤 {{ user?.email }}</span>
        <button type="button" class="session-logout" @click="logout">Keluar</button>
      </div>
    </div>
    <AppHeader />

    <nav v-if="isLoggedIn && !route.meta.public" class="app-nav" aria-label="Navigasi utama">
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
