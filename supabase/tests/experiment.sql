-- Run after both migrations in a disposable Supabase project as postgres.
-- Fixtures roll back; also run security.sql to check existing access controls.
begin;
insert into auth.users(id) values ('00000000-0000-4000-8000-000000000091');
insert into public.admin_users values ('00000000-0000-4000-8000-000000000091');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000091',true);
insert into public.analytics_events(id,visitor_id,experiment,variant,attribution) values
 ('00000000-0000-4000-8000-000000000092','00000000-0000-4000-8000-000000000095','product-format-v1','worksheet','{"campaign":"experiment_sql_fixture"}'),
 ('00000000-0000-4000-8000-000000000093','00000000-0000-4000-8000-000000000095','product-format-v1','worksheet','{"campaign":"experiment_sql_fixture"}'),
 ('00000000-0000-4000-8000-000000000094','00000000-0000-4000-8000-000000000096','product-format-v1','mobile','{"campaign":"experiment_sql_fixture"}');
insert into public.waitlist_signups(email,audience,receipt_hash,consent_version,visitor_id,experiment,variant,attribution) values
 ('experiment-museum@example.invalid','museum','experiment-museum-hash','test','00000000-0000-4000-8000-000000000095','product-format-v1','worksheet','{"campaign":"experiment_sql_fixture"}'),
 ('experiment-untracked@example.invalid','visitor','experiment-untracked-hash','test',null,'product-format-v1','worksheet','{"campaign":"experiment_sql_fixture"}'),
 -- A signup from a different concept must not count as a tracked conversion.
 ('experiment-mismatch@example.invalid','visitor','experiment-mismatch-hash','test','00000000-0000-4000-8000-000000000096','product-format-v1','device','{"campaign":"experiment_sql_fixture"}'),
 ('experiment-legacy@example.invalid','visitor','experiment-legacy-hash','test',null,null,null,'{"campaign":"experiment_sql_fixture"}');
insert into public.qualification_responses(signup_id,challenge,interest,paid_pilot)
 select id,'high','very','yes' from public.waitlist_signups where receipt_hash='experiment-museum-hash';
set local role authenticated;
do $$ declare metrics jsonb; worksheet jsonb; device jsonb; begin
 metrics := public.dashboard_metrics(null,null,'experiment_sql_fixture');
 if (metrics->>'signups')::int <> 4 then raise exception 'Overall totals lost legacy data'; end if;
 select value into worksheet from jsonb_array_elements(metrics->'experiments') where value->>'variant'='worksheet';
 select value into device from jsonb_array_elements(metrics->'experiments') where value->>'variant'='device';
 if (worksheet->>'visitors')::int <> 1 or (worksheet->>'signups')::int <> 2 or (worksheet->>'converted')::int <> 1
    or (worksheet->>'museums')::int <> 1 or (worksheet->>'visitor_signups')::int <> 1
    or (worksheet->>'paid')::int <> 1 or (worksheet->>'very_interested')::int <> 1 then
   raise exception 'Incorrect worksheet results: %',worksheet;
 end if;
 if (device->>'converted')::int <> 0 then raise exception 'Cross-concept conversion counted'; end if;
 metrics := public.dashboard_metrics(null,null,'experiment_sql_empty');
 if exists(select 1 from jsonb_array_elements(metrics->'experiments') e where (e->>'signups')::int<>0 or (e->>'visitors')::int<>0) then
   raise exception 'Campaign filtering failed';
 end if;
 metrics := public.dashboard_metrics(now()+interval '1 day',now()+interval '2 days','experiment_sql_fixture');
 if exists(select 1 from jsonb_array_elements(metrics->'experiments') e where (e->>'signups')::int<>0 or (e->>'visitors')::int<>0) then
   raise exception 'Date filtering failed';
 end if;
end $$;
rollback;
