
create policy "own context docs read" on storage.objects for select to authenticated
using (bucket_id = 'context-documents' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own context docs insert" on storage.objects for insert to authenticated
with check (bucket_id = 'context-documents' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own context docs update" on storage.objects for update to authenticated
using (bucket_id = 'context-documents' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own context docs delete" on storage.objects for delete to authenticated
using (bucket_id = 'context-documents' and (storage.foldername(name))[1] = auth.uid()::text);
