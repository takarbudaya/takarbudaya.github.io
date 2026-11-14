<script setup>
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import CardTitle from '../components/CardTitle.vue';
import { useAuth } from '../composables/useAuth.js';
import { isSupabaseConfigured } from '../services/supabase.js';

const route = useRoute();
const router = useRouter();
const { signIn } = useAuth();

const email = ref('');
const password = ref('');
const showPassword = ref(false);
const loading = ref(false);
const error = ref('');

/** Hanya izinkan kembali ke halaman di aplikasi ini (bukan URL luar). */
function safeRedirect(value) {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : '/';
}

async function submit() {
  if (loading.value) return;
  error.value = '';
  if (!email.value.trim() || !password.value) {
    error.value = 'Email dan kata sandi wajib diisi.';
    return;
  }
  loading.value = true;
  try {
    await signIn(email.value, password.value);
    password.value = '';
    await router.replace(safeRedirect(route.query.redirect));
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <section v-if="!isSupabaseConfigured" class="form-card notice-card notice-error login-card">
    <strong>Login belum dikonfigurasi.</strong>
    <p>
      Isi <code>VITE_SUPABASE_URL</code> dan <code>VITE_SUPABASE_PUBLISHABLE_KEY</code>
      (lihat <code>.env.example</code>), lalu jalankan ulang aplikasi.
    </p>
  </section>

  <section v-else class="form-card login-card">
    <CardTitle badge="🔐" title="Masuk" desc="Gunakan akun yang diberikan admin" />

    <form class="login-form" novalidate @submit.prevent="submit">
      <div class="field-item">
        <label for="loginEmail">Email</label>
        <input
          id="loginEmail"
          v-model="email"
          type="email"
          class="text-input"
          :class="{ 'is-invalid': error }"
          autocomplete="username"
          inputmode="email"
          autocapitalize="off"
          spellcheck="false"
          required
          autofocus
        >
      </div>

      <div class="field-item">
        <label for="loginPassword">Kata Sandi</label>
        <div class="password-field">
          <input
            id="loginPassword"
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            class="text-input"
            :class="{ 'is-invalid': error }"
            autocomplete="current-password"
            required
          >
          <button
            type="button"
            class="password-toggle"
            :aria-pressed="showPassword"
            :aria-label="showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'"
            @click="showPassword = !showPassword"
          >
            {{ showPassword ? 'Sembunyikan' : 'Tampilkan' }}
          </button>
        </div>
      </div>

      <p v-if="error" class="field-error" role="alert">{{ error }}</p>

      <button type="submit" class="action-btn btn-save login-submit" :disabled="loading">
        {{ loading ? 'Memproses…' : 'Masuk' }}
      </button>
    </form>
  </section>
</template>
