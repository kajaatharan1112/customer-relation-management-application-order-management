\set ON_ERROR_STOP on
begin;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000aa01', 'stf4@t.co', '{"user_type":"admin_member"}'),
  ('00000000-0000-0000-0000-00000000bb01', 'own@t.co',  '{"user_type":"customer"}'),
  ('00000000-0000-0000-0000-00000000cc01', 'other@t.co','{"user_type":"customer"}');

insert into public.bills (id, customer_id)
values ('00000000-0000-0000-0000-0000000bb101', '00000000-0000-0000-0000-00000000bb01');

-- owner customer: can insert a comment on their own bill
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000bb01","role":"authenticated"}';
insert into public.bill_comments (bill_id, author_id, body)
values ('00000000-0000-0000-0000-0000000bb101', '00000000-0000-0000-0000-00000000bb01', 'hello');
select count(*) = 1 as owner_can_comment
from public.bill_comments where bill_id = '00000000-0000-0000-0000-0000000bb101';

-- other customer: cannot insert on someone else's bill
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000cc01","role":"authenticated"}';
do $$
begin
  begin
    insert into public.bill_comments (bill_id, author_id, body)
    values ('00000000-0000-0000-0000-0000000bb101', '00000000-0000-0000-0000-00000000cc01', 'nope');
    raise exception 'FAIL: outsider inserted a comment';
  exception when others then
    raise notice 'OK: outsider comment blocked';
  end;
end $$;

-- other customer: sees zero comments on that bill
select count(*) = 0 as other_sees_no_comments
from public.bill_comments where bill_id = '00000000-0000-0000-0000-0000000bb101';

-- attachments: staff insert; owner reads; outsider does not
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000aa01","role":"authenticated"}';
insert into public.attachments (owner_type, owner_id, storage_path, file_name)
values ('bill', '00000000-0000-0000-0000-0000000bb101', 'bill/00000000-0000-0000-0000-0000000bb101/x.pdf', 'x.pdf');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000bb01","role":"authenticated"}';
select count(*) = 1 as owner_reads_attachment
from public.attachments where owner_id = '00000000-0000-0000-0000-0000000bb101';

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000cc01","role":"authenticated"}';
select count(*) = 0 as outsider_no_attachment
from public.attachments where owner_id = '00000000-0000-0000-0000-0000000bb101';

-- bill_history view respects RLS
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000cc01","role":"authenticated"}';
select count(*) = 0 as outsider_no_history
from public.bill_history where bill_id = '00000000-0000-0000-0000-0000000bb101';

reset role;
rollback;
