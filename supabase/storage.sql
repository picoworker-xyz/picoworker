-- ============================================================================
-- PicoWorker — Storage policies for the `proofs` bucket (screenshot proofs).
-- The proof upload uses upsert, which needs an UPDATE policy too; public read
-- lets the task giver and admins view the screenshot.
-- ============================================================================

update storage.buckets set public = true where id = 'proofs';

drop policy if exists "proofs read" on storage.objects;
drop policy if exists "proofs upload" on storage.objects;
drop policy if exists "proofs update" on storage.objects;

create policy "proofs read"   on storage.objects
  for select using (bucket_id = 'proofs');

create policy "proofs upload" on storage.objects
  for insert to authenticated with check (bucket_id = 'proofs');

create policy "proofs update" on storage.objects
  for update to authenticated using (bucket_id = 'proofs') with check (bucket_id = 'proofs');
