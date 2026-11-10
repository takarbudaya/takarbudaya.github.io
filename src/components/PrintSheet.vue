<script setup>
import { computed } from 'vue';
import { formatTanggalID, orDash } from '../utils/format.js';

const props = defineProps({
  /** @type {import('../utils/report.js').Report} dari store.report (kalkulator) atau reportFromRow (riwayat) */
  report: { type: Object, required: true }
});

const infoRows = computed(() => [
  { label: 'Tanggal Pelaksanaan', value: formatTanggalID(props.report.tglAcara) },
  { label: 'Tempat / Lokasi', value: orDash(props.report.tempatAcara) },
  { label: 'Acara', value: orDash(props.report.namaAcara) },
  { label: 'Penyelenggara', value: orDash(props.report.penyelenggaraAcara) },
  { label: 'Bidang / UPTD', value: orDash(props.report.bidangPelaksana) }
]);
</script>

<template>
  <!-- Dokumen cetak PDF laporan resmi (A4) — hanya tampil saat print -->
  <div class="print-only">
    <div class="pdf-header">
      <div class="pdf-title">TAKAR BUDAYA</div>
      <div class="pdf-subtitle">Penonton &amp; Pelaku Seni / Pendukung</div>
      <div class="pdf-meta-method">
        Metode Ilmiah: Herbert Jacobs (1967) &bull; Kategori Peran Pelaku Seni / Pendukung
      </div>
      <div class="pdf-divider"></div>
    </div>

    <!-- Identitas acara -->
    <table class="pdf-table-info">
      <tr v-for="(row, i) in infoRows" :key="row.label">
        <td :style="i === 0 ? 'width: 25%;' : null"><strong>{{ row.label }}</strong></td>
        <td :style="i === 0 ? 'width: 2%;' : null">:</td>
        <td :style="i === 0 ? 'width: 73%;' : null">{{ row.value }}</td>
      </tr>
    </table>

    <!-- I. Penonton -->
    <div class="pdf-section-title">I. PENONTON &mdash; METODE HERBERT JACOBS (P = A &times; D)</div>
    <template v-if="report.totalPenonton !== null">
      <table class="pdf-table-data">
        <thead>
          <tr>
            <th style="width: 6%; text-align: center;">No</th>
            <th style="width: 32%;">Parameter Penghitungan</th>
            <th style="width: 12%; text-align: center;">Simbol</th>
            <th style="width: 20%; text-align: right;">Nilai Terukur</th>
            <th style="width: 30%;">Keterangan Lapangan</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="text-align: center;">1</td>
            <td><strong>Luas Area Efektif</strong></td>
            <td style="text-align: center;"><code>A</code></td>
            <td style="text-align: right; font-weight: bold;">{{ report.strA }} m&sup2;</td>
            <td>{{ report.descArea }}</td>
          </tr>
          <tr>
            <td style="text-align: center;">2</td>
            <td><strong>Kepadatan Penonton</strong></td>
            <td style="text-align: center;"><code>D</code></td>
            <td style="text-align: right; font-weight: bold;">{{ report.strD }} org/m&sup2;</td>
            <td>{{ report.densityTitle }} &mdash; {{ report.densityNote }}</td>
          </tr>
        </tbody>
      </table>
      <div class="pdf-result-card">
        <div class="pdf-calc-line">
          <strong>Perhitungan Rumus (P = A &times; D):</strong>
          {{ report.strA }} m&sup2; &times; {{ report.strD }} = {{ report.strTotalPenonton }} Orang
        </div>
        <div class="pdf-banner-total">
          <span>Estimasi Jumlah Penonton Pertunjukan Seni / Kebudayaan:</span>
          <strong>{{ report.strTotalPenonton }} ORANG</strong>
        </div>
      </div>
    </template>
    <template v-else>
      <table class="pdf-table-data">
        <tbody>
          <tr>
            <td style="padding: 10pt; color: #555555; font-style: italic;">
              Penonton tidak dihitung pada kegiatan ini (misalnya kegiatan pelatihan, workshop, sarasehan
              internal, atau tidak terdapat massa penonton terbuka).
            </td>
          </tr>
        </tbody>
      </table>
      <div class="pdf-result-card">
        <div class="pdf-banner-total" style="border-top: none; padding-top: 0;">
          <span>Estimasi Jumlah Penonton Pertunjukan Seni / Kebudayaan:</span>
          <strong style="color: #666666;">-</strong>
        </div>
      </div>
    </template>

    <!-- II. Pelaku Seni / Pendukung -->
    <div class="pdf-section-title">II. PELAKU SENI / PENDUKUNG &mdash; KATEGORI PERAN (CLUSTERING)</div>
    <template v-if="report.totalPelaku !== null">
      <table class="pdf-table-data">
        <thead>
          <tr>
            <th style="width: 6%; text-align: center;">No</th>
            <th style="width: 44%;">Komposisi Peran Terlibat</th>
            <th style="width: 20%; text-align: right;">Jumlah Terdata</th>
            <th style="width: 30%;">Keterangan</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="text-align: center;">1</td>
            <td><strong>Pemeran Utama, Pemain Pendukung, &amp; Pemusik</strong></td>
            <td style="text-align: right; font-weight: bold;">{{ report.strTotalPelaku }} Orang</td>
            <td>Akumulasi pelaku seni di panggung / acara</td>
          </tr>
        </tbody>
      </table>
      <div class="pdf-result-card">
        <div class="pdf-banner-total" style="border-top: none; padding-top: 0;">
          <span>Jumlah Pelaku / Pendukung Pertunjukan Seni:</span>
          <strong>{{ report.strTotalPelaku }} ORANG</strong>
        </div>
      </div>
    </template>
    <template v-else>
      <table class="pdf-table-data">
        <tbody>
          <tr>
            <td style="padding: 10pt; color: #555555; font-style: italic;">
              Pelaku seni / pendukung tidak dihitung pada kegiatan ini (misalnya acara pameran umum atau
              kegiatan tanpa pementasan seniman).
            </td>
          </tr>
        </tbody>
      </table>
      <div class="pdf-result-card">
        <div class="pdf-banner-total" style="border-top: none; padding-top: 0;">
          <span>Jumlah Pelaku / Pendukung Pertunjukan Seni:</span>
          <strong style="color: #666666;">-</strong>
        </div>
      </div>
    </template>

    <div class="pdf-footer-note">
      <div><strong>Rujukan Metodologi:</strong></div>
      <div>
        1. Penonton (Metode Jacobs): Herbert Jacobs (1967), <em>To Count a Crowd</em>, UC Berkeley
        (Rumus: P = A &times; D).
      </div>
      <div>2. Penghitungan Pelaku Seni / Pendukung: Akumulasi Pemeran Utama, Pemain Pendukung, dan Pemusik.</div>
      <div style="margin-top: 4pt; color: #555555; font-size: 8.5pt;">
        Dokumen ini merupakan hasil ekspor instrumen bantu kalkulator <strong>Takar Budaya</strong>.
      </div>
    </div>
  </div>
</template>
