-- TAKAR BUDAYA: HAPUS BANYAK data sekaligus dari halaman riwayat (soft delete).
-- Jalankan SETELAH 20261110030000_soft_delete.sql.
--
-- Sama seperti hapus_laporan: baris hanya ditandai `deleted_at` (bisa dipulihkan admin),
-- dalam satu transaksi. Dibatasi 1000 id per panggilan.

create or replace function public.hapus_laporan_banyak(p_ids bigint[])
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if p_ids is null or cardinality(p_ids) = 0 then
    return 0;
  end if;
  if cardinality(p_ids) > 1000 then
    raise exception 'Maksimal 1000 data sekali hapus.' using errcode = '22023';
  end if;

  update public.laporan_takar
     set deleted_at = now()
   where id = any (p_ids)
     and deleted_at is null;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

comment on function public.hapus_laporan_banyak(bigint[]) is 'Soft delete beberapa laporan sekaligus. Mengembalikan jumlah baris yang benar-benar terhapus.';

revoke all on function public.hapus_laporan_banyak(bigint[]) from public;
grant execute on function public.hapus_laporan_banyak(bigint[]) to anon, authenticated;
