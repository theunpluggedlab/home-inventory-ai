-- FIX RLS POLICIES FOR PUBLIC/ANON ACCESS
-- Run this in the Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)

-- 1. STORAGE POLICIES (Fixes "Upload failed: new row violates row-level security policy")
-- We allow ANYONE to upload and view images in the 'inventory-images' bucket.

drop policy if exists "Allow Public Upload" on storage.objects;
create policy "Allow Public Upload" 
on storage.objects for insert 
with check ( bucket_id = 'inventory-images' );

drop policy if exists "Allow Public Select" on storage.objects;
create policy "Allow Public Select" 
on storage.objects for select 
using ( bucket_id = 'inventory-images' );


-- 2. DATABASE TABLE POLICIES (Fixes potential "Save" permission errors)
-- Since we are not using User Login yet (Anon mode), we should disable strict RLS 
-- or add public policies. Disabling is easiest for now.

alter table rooms disable row level security;
alter table storage_units disable row level security;
alter table items disable row level security;

-- NOTE: If you receive a "referenced table constraint" error later when adding a Room,
-- it is because the 'rooms' table requires a logged-in user_id. 
-- For this prototype, you might want to make user_id nullable:
-- alter table rooms alter column user_id drop not null;
