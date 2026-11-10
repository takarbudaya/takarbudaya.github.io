-- TAKAR BUDAYA: Luas Area Penonton (A) menjadi OPSIONAL.
-- Jalankan SETELAH 20261110040000_bulk_delete.sql.
--
-- Bila luas tidak diisi: luas_mode, luas_area, panjang, lebar semuanya null,
-- dan total_penonton (kolom generated) otomatis ikut null.
-- Cek lama (luas_area > 0, luas_mode in (...)) tetap berlaku bila diisi.

alter table public.laporan_takar
  alter column luas_mode drop not null,
  alter column luas_area drop not null;

-- Luas diisi lengkap (mode + angka) atau kosong sama sekali (termasuk panjang & lebar).
alter table public.laporan_takar
  drop constraint if exists laporan_takar_luas_opsional;
alter table public.laporan_takar
  add constraint laporan_takar_luas_opsional check (
    (luas_mode is null) = (luas_area is null)
    and (luas_mode is not null or (panjang is null and lebar is null))
  );
