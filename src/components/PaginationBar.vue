<script setup>
import { computed } from 'vue';

const props = defineProps({
  page: { type: Number, required: true },
  totalPages: { type: Number, required: true },
  disabled: { type: Boolean, default: false }
});

const emit = defineEmits(['go']);

/** Nomor halaman yang ditampilkan: 1 … (sekitar halaman aktif) … terakhir. */
const items = computed(() => {
  const { page, totalPages } = props;
  const pages = new Set([1, totalPages, page - 1, page, page + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);

  const result = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) {
      // Celah satu halaman: tampilkan nomornya saja, bukan "…".
      if (p - sorted[i - 1] === 2) result.push({ type: 'page', value: p - 1 });
      else result.push({ type: 'gap', value: `gap-${p}` });
    }
    result.push({ type: 'page', value: p });
  });
  return result;
});

function go(p) {
  if (props.disabled || p < 1 || p > props.totalPages || p === props.page) return;
  emit('go', p);
}
</script>

<template>
  <nav v-if="totalPages > 1" class="pagination" aria-label="Navigasi halaman riwayat">
    <button
      type="button"
      class="page-btn"
      :disabled="disabled || page <= 1"
      aria-label="Halaman sebelumnya"
      @click="go(page - 1)"
    >
      ‹
    </button>
    <template v-for="item in items" :key="item.value">
      <span v-if="item.type === 'gap'" class="page-gap" aria-hidden="true">…</span>
      <button
        v-else
        type="button"
        class="page-btn"
        :class="{ active: item.value === page }"
        :aria-current="item.value === page ? 'page' : undefined"
        :disabled="disabled"
        @click="go(item.value)"
      >
        {{ item.value }}
      </button>
    </template>
    <button
      type="button"
      class="page-btn"
      :disabled="disabled || page >= totalPages"
      aria-label="Halaman berikutnya"
      @click="go(page + 1)"
    >
      ›
    </button>
  </nav>
</template>
