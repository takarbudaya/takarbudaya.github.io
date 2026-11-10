<script setup>
import CardTitle from './CardTitle.vue';
import DateField from './DateField.vue';
import { useTakarStore } from '../composables/useTakarStore.js';
import { BIDANG_OPTIONS } from '../data/options.js';

const { state, isFieldInvalid } = useTakarStore();
</script>

<template>
  <section class="form-card">
    <CardTitle
      badge="1"
      title="Informasi Acara"
      desc="Identitas kegiatan untuk pesan WhatsApp & laporan resmi PDF"
    />

    <div class="form-grid-identitas">
      <div class="field-item" :class="{ 'is-invalid': isFieldInvalid('tglAcara') }">
        <label for="tglAcara">Tanggal <span class="req" aria-hidden="true">*</span></label>
        <DateField id="tglAcara" v-model="state.tglAcara" :invalid="isFieldInvalid('tglAcara')" />
        <p v-if="isFieldInvalid('tglAcara')" class="field-error">Tanggal wajib diisi.</p>
      </div>
      <div class="field-item">
        <label for="tempatAcara">Tempat / Lokasi</label>
        <input
          id="tempatAcara"
          v-model="state.tempatAcara"
          type="text"
          class="text-input"
          maxlength="200"
          placeholder="Contoh: Lapangan Denggung / Pendopo"
        >
      </div>
      <div class="field-item" :class="{ 'is-invalid': isFieldInvalid('namaAcara') }">
        <label for="namaAcara">Acara <span class="req" aria-hidden="true">*</span></label>
        <input
          id="namaAcara"
          v-model="state.namaAcara"
          type="text"
          class="text-input"
          maxlength="200"
          required
          :aria-invalid="isFieldInvalid('namaAcara') || undefined"
          placeholder="Contoh: Pentas Wayang Kulit"
        >
        <p v-if="isFieldInvalid('namaAcara')" class="field-error">Acara wajib diisi.</p>
      </div>
      <div class="field-item" :class="{ 'is-invalid': isFieldInvalid('penyelenggaraAcara') }">
        <label for="penyelenggaraAcara">Penyelenggara <span class="req" aria-hidden="true">*</span></label>
        <input
          id="penyelenggaraAcara"
          v-model="state.penyelenggaraAcara"
          type="text"
          class="text-input"
          maxlength="200"
          required
          :aria-invalid="isFieldInvalid('penyelenggaraAcara') || undefined"
          placeholder="Contoh: Dinas Kebudayaan"
        >
        <p v-if="isFieldInvalid('penyelenggaraAcara')" class="field-error">Penyelenggara wajib diisi.</p>
      </div>
      <div class="field-item" :class="{ 'is-invalid': isFieldInvalid('bidangPelaksana') }">
        <label for="bidangPelaksana">Bidang / UPTD <span class="req" aria-hidden="true">*</span></label>
        <select
          id="bidangPelaksana"
          v-model="state.bidangPelaksana"
          class="text-input select-input"
          :class="{ 'is-placeholder': !state.bidangPelaksana }"
          required
          :aria-invalid="isFieldInvalid('bidangPelaksana') || undefined"
        >
          <option value="" disabled>Pilih Bidang / UPTD</option>
          <option v-for="b in BIDANG_OPTIONS" :key="b" :value="b">{{ b }}</option>
        </select>
        <p v-if="isFieldInvalid('bidangPelaksana')" class="field-error">Pilih Bidang / UPTD.</p>
      </div>
      <div class="field-item" :class="{ 'is-invalid': isFieldInvalid('acaraInternal') }">
        <fieldset class="radio-fieldset" :aria-invalid="isFieldInvalid('acaraInternal') || undefined">
          <legend class="field-label">Acara Internal ? <span class="req" aria-hidden="true">*</span></legend>
          <div class="radio-group">
            <label class="radio-option">
              <input
                id="acaraInternal"
                v-model="state.acaraInternal"
                type="radio"
                name="acaraInternal"
                :value="true"
              >
              <span>Ya</span>
            </label>
            <label class="radio-option">
              <input v-model="state.acaraInternal" type="radio" name="acaraInternal" :value="false">
              <span>Tidak</span>
            </label>
          </div>
        </fieldset>
        <p v-if="isFieldInvalid('acaraInternal')" class="field-error">Pilih Ya atau Tidak.</p>
      </div>
    </div>
  </section>
</template>
