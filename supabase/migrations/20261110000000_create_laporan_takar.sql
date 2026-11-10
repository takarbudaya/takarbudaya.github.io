-- TAKAR BUDAYA: tabel riwayat laporan yang disimpan dari kalkulator.
-- Jalankan sekali di Supabase Dashboard -> SQL Editor (atau `supabase db push`).
--
-- Akses publik (tanpa login): siapa pun boleh MEMBACA dan MENYIMPAN data,
-- tetapi tidak ada yang bisa MENGUBAH atau MENGHAPUS lewat API publik.
-- Semua aturan isian ditegakkan di database, bukan hanya di aplikasi.

create table if not exists public.laporan_takar (
  id              bigint generated always as identity primary key,
  created_at      timestamptz not null default now(),

  -- Identitas acara
  tgl_acara       date not null,
  tempat_acara    text not null default ''
                  check (char_length(tempat_acara) <= 200),
  nama_acara      text not null
                  check (char_length(btrim(nama_acara)) between 1 and 200),
  penyelenggara   text not null
                  check (char_length(btrim(penyelenggara)) between 1 and 200),
  bidang          text not null
                  check (bidang in ('Bidang Atlas', 'Bidang SBSP', 'Bidang WB', 'UPTD MGM')),

  -- Penonton (Metode Jacobs: P = A x D)
  luas_mode       text not null
                  check (luas_mode in ('cepat', 'panjang_lebar', 'total')),
  panjang         numeric check (panjang > 0 and panjang <= 100000),
  lebar           numeric check (lebar > 0 and lebar <= 100000),
  luas_area       integer not null
                  check (luas_area > 0 and luas_area <= 100000000),
  kepadatan       numeric(2, 1) not null
                  check (kepadatan in (0.5, 1.0, 2.0, 3.0, 4.0)),
  -- Dihitung database, tidak bisa dikirim dari klien.
  total_penonton  integer generated always as (round(luas_area * kepadatan)::integer) stored,

  -- Pelaku seni / pendukung (boleh kosong)
  total_pelaku    integer check (total_pelaku >= 0 and total_pelaku <= 1000000),

  -- Panjang & lebar hanya diisi (dan wajib) untuk mode panjang x lebar.
  constraint laporan_takar_panjang_lebar check (
    (luas_mode = 'panjang_lebar') = (panjang is not null and lebar is not null)
    and (panjang is null) = (lebar is null)
  )
);

comment on table public.laporan_takar is 'Riwayat laporan Takar Budaya (penonton & pelaku seni).';

-- Urutan default halaman riwayat + filter bidang.
create index if not exists laporan_takar_tgl_idx on public.laporan_takar (tgl_acara desc, id desc);
create index if not exists laporan_takar_bidang_idx on public.laporan_takar (bidang, tgl_acara desc);

-- Row Level Security: hanya SELECT dan INSERT yang diizinkan.
alter table public.laporan_takar enable row level security;

drop policy if exists "Publik dapat membaca laporan" on public.laporan_takar;
create policy "Publik dapat membaca laporan"
  on public.laporan_takar for select
  to anon, authenticated
  using (true);

drop policy if exists "Publik dapat menyimpan laporan" on public.laporan_takar;
create policy "Publik dapat menyimpan laporan"
  on public.laporan_takar for insert
  to anon, authenticated
  with check (true);

revoke all on public.laporan_takar from anon, authenticated;
grant select, insert on public.laporan_takar to anon, authenticated;
