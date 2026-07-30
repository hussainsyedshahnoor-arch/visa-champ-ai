create policy "Anyone can upload eligibility docs"
on storage.objects for insert to anon, authenticated
with check (bucket_id = 'eligibility-docs');

create policy "Admins can read eligibility docs"
on storage.objects for select to authenticated
using (bucket_id = 'eligibility-docs' and public.has_role(auth.uid(), 'admin'));

create table public.eligibility_document_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  full_name text,
  email text,
  whatsapp text,
  country_name text,
  visa_type_name text,
  score integer,
  document_name text not null,
  file_path text not null,
  file_size bigint,
  mime_type text,
  created_at timestamptz not null default now()
);

grant insert on public.eligibility_document_submissions to anon;
grant select, insert on public.eligibility_document_submissions to authenticated;
grant all on public.eligibility_document_submissions to service_role;

alter table public.eligibility_document_submissions enable row level security;

create policy "Anyone can submit eligibility documents"
on public.eligibility_document_submissions for insert to anon, authenticated
with check (true);

create policy "Admins can view eligibility document submissions"
on public.eligibility_document_submissions for select to authenticated
using (public.has_role(auth.uid(), 'admin'));