<script setup>
defineProps({
  badge: { type: String, required: true },
  title: { type: String, required: true },
  desc: { type: String, default: '' },
  required: { type: Boolean, default: false }
});
</script>

<template>
  <div class="card-title-group">
    <span class="step-badge">{{ badge }}</span>
    <div>
      <h2 class="card-title">
        {{ title }}<span v-if="required" class="req" aria-hidden="true"> *</span>
      </h2>
      <p v-if="desc" class="card-desc">{{ desc }}</p>
    </div>
  </div>
</template>
