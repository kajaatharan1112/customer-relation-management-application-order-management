-- Expect exactly these 14 tables in public.
select count(*) = 14 as table_count_ok
from pg_tables
where schemaname = 'public'
  and tablename in (
    'user_types','bill_statuses','organization_settings','profiles','customers',
    'workflow_templates','workflow_stages','order_types','bills','bill_rows',
    'order_status_history','bill_comments','attachments','audit_logs'
  );

-- Sequence for bill numbers exists.
select exists (
  select 1 from pg_class where relkind = 'S' and relname = 'bill_number_seq'
) as bill_number_seq_ok;
