<script setup>
import { computed } from 'vue';
import { useTheme } from '../composables/useTheme.js';

const { theme, toggleTheme } = useTheme();
const isDark = computed(() => theme.value === 'dark');
const label = computed(() => (isDark.value ? 'Ganti ke mode terang' : 'Ganti ke mode gelap'));
</script>

<template>
  <button type="button" class="theme-toggle" :aria-label="label" :title="label" @click="toggleTheme">
    <!-- Mode gelap aktif: tampilkan matahari (klik untuk terang) -->
    <svg v-if="isDark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
    <!-- Mode terang aktif: tampilkan bulan (klik untuk gelap) -->
    <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  </button>
</template>
