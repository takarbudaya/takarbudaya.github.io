-- TAKAR BUDAYA: tandai acara internal / eksternal ("Acara Internal ?" Ya / Tidak).
-- Jalankan SETELAH 20261110000000_create_laporan_takar.sql.
--
-- Kolom dibuat nullable agar baris lama (sebelum kolom ini ada) tetap sah dan
-- tampil "-" di riwayat. Constraint NOT VALID tidak memeriksa baris lama, tetapi
-- WAJIB untuk setiap baris baru, jadi semua data yang disimpan sejak sekarang terisi.

alter table public.laporan_takar
  add column if not exists acara_internal boolean;

comment on column public.laporan_takar.acara_internal is 'true = acara internal, false = eksternal, null = data lama (belum dicatat)';

alter table public.laporan_takar
  drop constraint if exists laporan_takar_acara_internal_wajib;

alter table public.laporan_takar
  add constraint laporan_takar_acara_internal_wajib check (acara_internal is not null) not valid;

create index if not exists laporan_takar_internal_idx
  on public.laporan_takar (acara_internal, tgl_acara desc);
