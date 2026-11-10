-- TAKAR BUDAYA: izinkan EDIT data dari halaman riwayat.
-- Jalankan SETELAH 20261110010000_add_acara_internal.sql.
--
-- Akses tetap publik (tanpa login): siapa pun kini boleh MENGUBAH data, tetapi
-- - hanya kolom isian (bukan id, created_at, updated_at, total_penonton),
-- - semua CHECK constraint tetap berlaku (termasuk acara_internal wajib diisi),
-- - HAPUS tetap tidak diizinkan.

alter table public.laporan_takar
  add column if not exists updated_at timestamptz;

comment on column public.laporan_takar.updated_at is 'Waktu terakhir data diubah (null = belum pernah diedit). Diisi otomatis oleh trigger.';

-- updated_at selalu diisi database, tidak bisa dipalsukan klien.
create or replace function public.laporan_takar_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists laporan_takar_set_updated_at on public.laporan_takar;
create trigger laporan_takar_set_updated_at
  before update on public.laporan_takar
  for each row execute function public.laporan_takar_set_updated_at();

-- Hak UPDATE hanya pada kolom isian.
grant update (
  tgl_acara, tempat_acara, nama_acara, penyelenggara, bidang, acara_internal,
  luas_mode, panjang, lebar, luas_area, kepadatan, total_pelaku
) on public.laporan_takar to anon, authenticated;

drop policy if exists "Publik dapat mengubah laporan" on public.laporan_takar;
create policy "Publik dapat mengubah laporan"
  on public.laporan_takar for update
  to anon, authenticated
  using (true)
  with check (true);
