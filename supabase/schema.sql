create table if not exists public.ex3d_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.ex3d_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create or replace function public.prevent_last_ex3d_category_delete()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select count(*) from public.ex3d_categories) <= 1 then
    raise exception 'At least one EX3D category must remain';
  end if;
  return old;
end;
$$;

drop trigger if exists ex3d_categories_keep_one on public.ex3d_categories;
create trigger ex3d_categories_keep_one
before delete on public.ex3d_categories
for each row execute function public.prevent_last_ex3d_category_delete();

insert into public.ex3d_categories (name, sort_order)
values
  ('Design & Visuel', 1),
  ('Audio & Prod', 2),
  ('Vidéo & Cinéma', 3),
  ('Web & Tech', 4),
  ('Pâtisserie 63 Food', 5)
on conflict (name) do nothing;

create table if not exists public.ex3d_items (
  id text primary key,
  title text not null,
  category text not null,
  description text not null default '',
  price text not null default 'Sur devis',
  visual text not null default 'branding',
  deliverables text not null default '',
  notes text,
  image_url text,
  kind text not null default 'service' check (kind in ('creation', 'service')),
  status text not null default 'Disponible' check (status in ('Disponible', 'Sur devis')),
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.ex3d_items drop constraint if exists ex3d_items_category_check;

insert into public.ex3d_categories (name, sort_order)
select distinct category, 100
from public.ex3d_items
where category is not null
on conflict (name) do nothing;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'ex3d_items_category_fkey'
      and conrelid = 'public.ex3d_items'::regclass
  ) then
    alter table public.ex3d_items
      add constraint ex3d_items_category_fkey
      foreign key (category) references public.ex3d_categories (name)
      on update cascade on delete restrict;
  end if;
end;
$$;

alter table public.ex3d_admins enable row level security;
alter table public.ex3d_categories enable row level security;
alter table public.ex3d_items enable row level security;

grant select on public.ex3d_categories to anon, authenticated;
grant insert, update, delete on public.ex3d_categories to authenticated;
grant select on public.ex3d_items to anon, authenticated;
grant insert, update, delete on public.ex3d_items to authenticated;
grant select on public.ex3d_admins to authenticated;

create or replace function public.is_ex3d_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.ex3d_admins
    where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_ex3d_admin() from public;
grant execute on function public.is_ex3d_admin() to authenticated, anon;

drop policy if exists "Owner can read own admin membership" on public.ex3d_admins;
drop policy if exists "Public can read catalog categories" on public.ex3d_categories;
drop policy if exists "Owner can insert catalog categories" on public.ex3d_categories;
drop policy if exists "Owner can update catalog categories" on public.ex3d_categories;
drop policy if exists "Owner can delete catalog categories" on public.ex3d_categories;
drop policy if exists "Public can read catalog" on public.ex3d_items;
drop policy if exists "Owner can insert catalog items" on public.ex3d_items;
drop policy if exists "Owner can update catalog items" on public.ex3d_items;
drop policy if exists "Owner can delete catalog items" on public.ex3d_items;
drop policy if exists "Public can view EX3D catalog images" on storage.objects;
drop policy if exists "Owner can upload EX3D catalog images" on storage.objects;
drop policy if exists "Owner can update EX3D catalog images" on storage.objects;
drop policy if exists "Owner can delete EX3D catalog images" on storage.objects;

create policy "Owner can read own admin membership"
  on public.ex3d_admins for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Public can read catalog categories"
  on public.ex3d_categories for select to anon, authenticated
  using (true);

create policy "Owner can insert catalog categories"
  on public.ex3d_categories for insert to authenticated
  with check ((select public.is_ex3d_admin()));

create policy "Owner can update catalog categories"
  on public.ex3d_categories for update to authenticated
  using ((select public.is_ex3d_admin()))
  with check ((select public.is_ex3d_admin()));

create policy "Owner can delete catalog categories"
  on public.ex3d_categories for delete to authenticated
  using ((select public.is_ex3d_admin()));

create policy "Public can read catalog"
  on public.ex3d_items for select to anon, authenticated
  using (true);

create policy "Owner can insert catalog items"
  on public.ex3d_items for insert to authenticated
  with check ((select public.is_ex3d_admin()));

create policy "Owner can update catalog items"
  on public.ex3d_items for update to authenticated
  using ((select public.is_ex3d_admin()))
  with check ((select public.is_ex3d_admin()));

create policy "Owner can delete catalog items"
  on public.ex3d_items for delete to authenticated
  using ((select public.is_ex3d_admin()));

insert into storage.buckets (id, name, public)
values ('ex3d-assets', 'ex3d-assets', true)
on conflict (id) do nothing;

create policy "Public can view EX3D catalog images"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'ex3d-assets');

create policy "Owner can upload EX3D catalog images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'ex3d-assets' and (select public.is_ex3d_admin()));

create policy "Owner can update EX3D catalog images"
  on storage.objects for update to authenticated
  using (bucket_id = 'ex3d-assets' and (select public.is_ex3d_admin()))
  with check (bucket_id = 'ex3d-assets' and (select public.is_ex3d_admin()));

create policy "Owner can delete EX3D catalog images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'ex3d-assets' and (select public.is_ex3d_admin()));

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'ex3d_items'
  ) then
    alter publication supabase_realtime add table public.ex3d_items;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'ex3d_categories'
  ) then
    alter publication supabase_realtime add table public.ex3d_categories;
  end if;
end;
$$;