-- TAKAR BUDAYA: WAJIB LOGIN.
-- Jalankan SETELAH 20261110050000_optional_luas_area.sql.
--
-- Sebelumnya siapa pun yang memegang publishable key (ada di bundle JS publik) bisa
-- membaca, menambah, mengubah, dan menghapus data. Mulai sekarang hanya pengguna yang
-- sudah LOGIN (role `authenticated`) yang punya akses; role `anon` tidak punya hak apa pun.
--
-- Akun dibuat admin (tidak ada halaman daftar):
--   Dashboard -> Authentication -> Users -> Add user -> Create new user
--   (isi email + kata sandi, centang "Auto Confirm User").
-- WAJIB juga di Dashboard -> Authentication -> Sign In / Providers:
--   - matikan "Allow new users to sign up"   (kalau tidak, siapa pun bisa membuat akun sendiri lewat API)
--   - biarkan "Allow anonymous sign-ins" mati (pengguna anonim juga ber-role `authenticated`)

-- 1. Cabut semua hak `anon` (termasuk hak UPDATE per kolom) dan fungsi hapus.
revoke all on public.laporan_takar from anon;
revoke all on function public.hapus_laporan(bigint) from anon;
revoke all on function public.hapus_laporan_banyak(bigint[]) from anon;

-- Hak `authenticated` tetap seperti sebelumnya (SELECT, INSERT, UPDATE kolom isian,
-- EXECUTE fungsi hapus); ditulis ulang di sini agar file ini lengkap dengan sendirinya.
grant select, insert on public.laporan_takar to authenticated;
grant update (
  tgl_acara, tempat_acara, nama_acara, penyelenggara, bidang, acara_internal,
  luas_mode, panjang, lebar, luas_area, kepadatan, total_pelaku
) on public.laporan_takar to authenticated;
grant execute on function public.hapus_laporan(bigint) to authenticated;
grant execute on function public.hapus_laporan_banyak(bigint[]) to authenticated;

-- 2. Kebijakan RLS hanya untuk pengguna login.
drop policy if exists "Publik dapat membaca laporan" on public.laporan_takar;
drop policy if exists "Publik dapat menyimpan laporan" on public.laporan_takar;
drop policy if exists "Publik dapat mengubah laporan" on public.laporan_takar;

drop policy if exists "Pengguna login dapat membaca laporan" on public.laporan_takar;
create policy "Pengguna login dapat membaca laporan"
  on public.laporan_takar for select
  to authenticated
  using (deleted_at is null);

drop policy if exists "Pengguna login dapat menyimpan laporan" on public.laporan_takar;
create policy "Pengguna login dapat menyimpan laporan"
  on public.laporan_takar for insert
  to authenticated
  with check (true);

drop policy if exists "Pengguna login dapat mengubah laporan" on public.laporan_takar;
create policy "Pengguna login dapat mengubah laporan"
  on public.laporan_takar for update
  to authenticated
  using (deleted_at is null)
  with check (deleted_at is null);

-- Cek setelah dijalankan (harus kosong untuk anon):
--   select grantee, privilege_type from information_schema.role_table_grants
--    where table_name = 'laporan_takar' and grantee = 'anon';
