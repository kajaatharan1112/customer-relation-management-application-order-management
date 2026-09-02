-- ONEVO Phase 4 — enable Realtime and add reporting views.

alter publication supabase_realtime add table
  public.bills,
  public.bill_rows,
  public.order_status_history,
  public.bill_comments,
  public.attachments;

create view public.bill_history with (security_invoker = true) as
select
  h.id,
  r.bill_id,
  h.bill_row_id,
  r.detail as row_detail,
  fs.name as from_stage,
  ts.name as to_stage,
  h.note,
  h.created_at,
  p.full_name as changed_by_name
from public.order_status_history h
join public.bill_rows r on r.id = h.bill_row_id
left join public.workflow_stages fs on fs.id = h.from_stage_id
join public.workflow_stages ts on ts.id = h.to_stage_id
left join public.profiles p on p.id = h.changed_by;

create view public.bill_stage_summary with (security_invoker = true) as
select
  b.id as bill_id,
  count(r.id) filter (where r.order_type_id is not null) as tracked_rows,
  count(r.id) filter (where s.is_final) as completed_rows
from public.bills b
left join public.bill_rows r on r.bill_id = b.id and r.deleted_at is null
left join public.workflow_stages s on s.id = r.current_stage_id
group by b.id;

grant select on public.bill_history to authenticated;
grant select on public.bill_stage_summary to authenticated;
