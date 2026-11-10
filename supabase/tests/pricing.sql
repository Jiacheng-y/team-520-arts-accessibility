-- Run after all migrations in a disposable Supabase project as postgres.
begin;
insert into auth.users(id) values ('00000000-0000-4000-8000-000000000081');
insert into public.admin_users values ('00000000-0000-4000-8000-000000000081');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000081',true);
insert into public.analytics_events(id,visitor_id,experiment,variant,pricing_experiment,pricing_variant,attribution) values
 ('00000000-0000-4000-8000-000000000082','00000000-0000-4000-8000-000000000085','product-format-v1','mobile','museum-pricing-v1','inquiry','{"campaign":"pricing_sql_fixture"}'),
 ('00000000-0000-4000-8000-000000000083','00000000-0000-4000-8000-000000000085','product-format-v1','mobile','museum-pricing-v1','inquiry','{"campaign":"pricing_sql_fixture"}'),
 ('00000000-0000-4000-8000-000000000084','00000000-0000-4000-8000-000000000086','product-format-v1','device','museum-pricing-v1','inquiry','{"campaign":"pricing_sql_fixture"}');
insert into public.waitlist_signups(email,audience,receipt_hash,consent_version,visitor_id,experiment,variant,pricing_experiment,pricing_variant,attribution) values
 ('pricing-matched@example.invalid','museum','pricing-matched','test','00000000-0000-4000-8000-000000000085','product-format-v1','mobile','museum-pricing-v1','inquiry','{"campaign":"pricing_sql_fixture"}'),
 ('pricing-untracked@example.invalid','museum','pricing-untracked','test',null,'product-format-v1','mobile','museum-pricing-v1','inquiry','{"campaign":"pricing_sql_fixture"}'),
 -- Same browser/concept but different offer cannot count as a conversion.
 ('pricing-cross-offer@example.invalid','museum','pricing-cross-offer','test','00000000-0000-4000-8000-000000000086','product-format-v1','device','museum-pricing-v1','pilot','{"campaign":"pricing_sql_fixture"}'),
 -- Historical and visitor signups must not increase museum pricing results.
 ('pricing-legacy@example.invalid','museum','pricing-legacy','test',null,'product-format-v1','mobile',null,null,'{"campaign":"pricing_sql_fixture"}'),
 ('pricing-visitor@example.invalid','visitor','pricing-visitor','test','00000000-0000-4000-8000-000000000086','product-format-v1','device','museum-pricing-v1','inquiry','{"campaign":"pricing_sql_fixture"}');
insert into public.qualification_responses(signup_id,challenge,interest,paid_pilot)
 select id,'high','very','yes' from public.waitlist_signups where receipt_hash='pricing-matched';
do $$ begin
 begin
  update public.waitlist_signups set variant='worksheet' where receipt_hash='pricing-matched';
  raise exception 'Worksheet pricing accepted';
 exception when check_violation then null;
 end;
 begin
  update public.waitlist_signups set pricing_variant=null where receipt_hash='pricing-matched';
  raise exception 'Partial pricing assignment accepted';
 exception when check_violation then null;
 end;
end $$;
set local role authenticated;
do $$ declare metrics jsonb; a jsonb; b jsonb; begin
 metrics := public.dashboard_metrics(null,null,'pricing_sql_fixture');
 if jsonb_array_length(metrics->'pricing')<>4 then raise exception 'Expected four pricing combinations'; end if;
 select value into a from jsonb_array_elements(metrics->'pricing') where value->>'variant'='mobile' and value->>'pricing_variant'='inquiry';
 select value into b from jsonb_array_elements(metrics->'pricing') where value->>'variant'='device' and value->>'pricing_variant'='pilot';
 if (a->>'visitors')::int<>1 or (a->>'museums')::int<>2 or (a->>'converted')::int<>1 or (a->>'paid')::int<>1 then raise exception 'Incorrect inquiry metrics: %',a; end if;
 if (b->>'converted')::int<>0 or (b->>'museums')::int<>1 then raise exception 'Cross-offer conversion counted: %',b; end if;
 select value into a from jsonb_array_elements(metrics->'pricing') where value->>'variant'='device' and value->>'pricing_variant'='inquiry';
 if (a->>'museums')::int<>0 or (a->>'converted')::int<>0 then raise exception 'Visitor counted as a museum'; end if;
 metrics := public.dashboard_metrics(null,null,'pricing_sql_empty');
 if exists(select 1 from jsonb_array_elements(metrics->'pricing') e where (e->>'museums')::int<>0 or (e->>'visitors')::int<>0) then raise exception 'Campaign filtering failed'; end if;
 metrics := public.dashboard_metrics(now()+interval '1 day',now()+interval '2 days','pricing_sql_fixture');
 if exists(select 1 from jsonb_array_elements(metrics->'pricing') e where (e->>'museums')::int<>0 or (e->>'visitors')::int<>0) then raise exception 'Date filtering failed'; end if;
end $$;
rollback;
