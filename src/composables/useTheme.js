import { ref, watch } from 'vue';

// Kunci localStorage; harus sama dengan skrip pra-render di index.html.
const STORAGE_KEY = 'takar-theme';
const THEMES = ['dark', 'light'];

function readStoredTheme() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (THEMES.includes(saved)) return saved;
  } catch {
    // localStorage bisa diblokir (mode privat); pakai bawaan.
  }
  return 'dark';
}

// Satu state bersama untuk seluruh aplikasi.
const theme = ref(readStoredTheme());

function applyTheme(value) {
  document.documentElement.dataset.theme = value;
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // Abaikan: pilihan tetap berlaku untuk sesi ini.
  }
}

applyTheme(theme.value);
watch(theme, applyTheme);

export function useTheme() {
  const toggleTheme = () => {
    theme.value = theme.value === 'dark' ? 'light' : 'dark';
  };
  return { theme, toggleTheme };
}
