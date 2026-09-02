select count(*) = 3 as user_types_ok from public.user_types;
select count(*) = 4 as bill_statuses_ok from public.bill_statuses;
select count(*) = 1 as settings_ok from public.organization_settings where id = true;
select (default_bill_status_id = (select id from public.bill_statuses where key = 'pending')) as default_status_ok
from public.organization_settings where id = true;
