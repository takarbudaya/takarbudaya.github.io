-- TAKAR BUDAYA: fitur HAPUS dari halaman riwayat (soft delete).
-- Jalankan SETELAH 20261110020000_allow_update.sql.
--
-- Akses publik tanpa login, jadi data TIDAK benar-benar dihapus: baris hanya
-- ditandai `deleted_at`, lalu disembunyikan dari aplikasi (tidak tampil, tidak bisa
-- diedit). Admin dapat memulihkannya lewat SQL Editor:
--   update public.laporan_takar set deleted_at = null where id = <id>;
-- Melihat data yang terhapus:
--   select * from public.laporan_takar where deleted_at is not null order by deleted_at desc;

alter table public.laporan_takar
  add column if not exists deleted_at timestamptz;

comment on column public.laporan_takar.deleted_at is 'Waktu data dihapus dari aplikasi (soft delete). null = aktif.';

-- Data terhapus tidak terlihat & tidak bisa diedit lewat API publik.
drop policy if exists "Publik dapat membaca laporan" on public.laporan_takar;
create policy "Publik dapat membaca laporan"
  on public.laporan_takar for select
  to anon, authenticated
  using (deleted_at is null);

drop policy if exists "Publik dapat mengubah laporan" on public.laporan_takar;
create policy "Publik dapat mengubah laporan"
  on public.laporan_takar for update
  to anon, authenticated
  using (deleted_at is null)
  with check (deleted_at is null);

-- Menghapus / memulihkan bukan "edit": jangan ubah updated_at.
create or replace function public.laporan_takar_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.deleted_at is distinct from old.deleted_at then
    return new;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

-- Hapus lewat fungsi: klien tidak punya hak UPDATE pada kolom deleted_at, dan
-- PostgREST memakai RETURNING sehingga UPDATE biasa akan ditolak RLS
-- (baris baru tidak lagi lolos kebijakan SELECT). Fungsi ini HANYA bisa
-- menandai satu baris sebagai terhapus.
create or replace function public.hapus_laporan(p_id bigint)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.laporan_takar
     set deleted_at = now()
   where id = p_id
     and deleted_at is null;
  return found;
end;
$$;

comment on function public.hapus_laporan(bigint) is 'Soft delete satu laporan. true = terhapus, false = tidak ditemukan / sudah terhapus.';

revoke all on function public.hapus_laporan(bigint) from public;
grant execute on function public.hapus_laporan(bigint) to anon, authenticated;
