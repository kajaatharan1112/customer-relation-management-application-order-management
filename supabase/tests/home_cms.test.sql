-- Run against a freshly reset + seeded DB (0011 applied).
-- Seed profiles: admin 1111…, employee 2222…, customer 3333….
\set ON_ERROR_STOP on
begin;

-- the 4 singleton blocks exist.
select count(*) = 4 as four_blocks from public.home_blocks;
select exists (select 1 from public.home_blocks where type = 'products') as has_products_block;

-- organization_settings has the new company fields.
select exists (
  select 1 from information_schema.columns
  where table_schema = 'public' and table_name = 'organization_settings' and column_name = 'tagline'
) as org_has_tagline;

set local role authenticated;

-- customer: can READ products / promotions / gallery / blocks, cannot write.
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';
select count(*) >= 0 as customer_reads_products from public.products;
select count(*) = 4 as customer_reads_blocks from public.home_blocks;
do $$
begin
  begin
    insert into public.products (name, price) values ('hack', 1);
    raise exception 'FAIL: a customer inserted a product';
  exception when others then
    if sqlerrm like '%row-level security%' or sqlerrm like '%violates%' then
      raise notice 'OK: customer cannot write products';
    else raise; end if;
  end;
end $$;

-- employee: same — read yes, write no. (album is seeded is_visible=false; an
-- update under RLS matches 0 rows and does not error, so assert the value is
-- unchanged rather than expecting an exception.)
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
update public.home_blocks set is_visible = true where type = 'album';
select (select is_visible from public.home_blocks where type = 'album') = false
       as employee_cannot_show_album;

-- admin: can write.
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
insert into public.products (name, category, price) values ('Business cards', 'Print', 1500);
select count(*) = 1 as admin_inserted_product from public.products where name = 'Business cards';
update public.home_blocks set is_visible = true where type = 'album';
select (select is_visible from public.home_blocks where type = 'album') as admin_toggled_block;

reset role;
rollback;
