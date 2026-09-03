-- 0011_home_cms.sql — the customisable "Home" page.
-- home_blocks: which of the 4 blocks show, and in what order (one row per type).
-- products / promotions / gallery_images: the block contents.
-- organization_settings gains the company-detail fields.
-- Public `content` Storage bucket for product / promo / gallery / logo images.
-- RLS: any authenticated user reads; only an admin writes.

-- ---------- company detail (extend the singleton) ----------
alter table public.organization_settings
  add column tagline text not null default '',
  add column about   text not null default '',
  add column address text not null default '',
  add column phone   text not null default '',
  add column email   text not null default '',
  add column hours   text not null default '',
  add column socials jsonb not null default '{}';

-- ---------- home_blocks ----------
create table public.home_blocks (
  id uuid primary key default gen_random_uuid(),
  type text not null unique check (type in ('company','album','products','promotions')),
  sort_order int not null,
  is_visible boolean not null default true
);
alter table public.home_blocks enable row level security;
create policy home_blocks_read on public.home_blocks for select to authenticated using (true);
create policy home_blocks_admin_write on public.home_blocks for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

insert into public.home_blocks (type, sort_order, is_visible) values
  ('company',    0, true),
  ('products',   1, true),
  ('promotions', 2, true),
  ('album',      3, false);

-- ---------- products ----------
create table public.products (
  id uuid primary key default gen_random_uuid(),
  category text not null default '',
  name text not null,
  description text,
  price numeric(12,2) not null default 0,
  image_path text,
  is_active boolean not null default true,
  sort_order int not null default 0,
  deleted_at timestamptz
);
alter table public.products enable row level security;
create policy products_read on public.products for select to authenticated using (true);
create policy products_admin_write on public.products for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------- promotions ----------
create table public.promotions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text,
  image_path text,
  discount_kind text not null default 'text' check (discount_kind in ('percent','amount','text')),
  discount_value text,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  sort_order int not null default 0,
  deleted_at timestamptz
);
alter table public.promotions enable row level security;
create policy promotions_read on public.promotions for select to authenticated using (true);
create policy promotions_admin_write on public.promotions for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------- gallery_images ----------
create table public.gallery_images (
  id uuid primary key default gen_random_uuid(),
  caption text,
  image_path text not null,
  sort_order int not null default 0,
  deleted_at timestamptz
);
alter table public.gallery_images enable row level security;
create policy gallery_images_read on public.gallery_images for select to authenticated using (true);
create policy gallery_images_admin_write on public.gallery_images for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------- content Storage bucket (public read, admin write) ----------
insert into storage.buckets (id, name, public)
values ('content', 'content', true)
on conflict (id) do nothing;

create policy "content public read" on storage.objects for select to authenticated
  using (bucket_id = 'content');
create policy "content admin write" on storage.objects for all to authenticated
  using (bucket_id = 'content' and public.is_admin())
  with check (bucket_id = 'content' and public.is_admin());
