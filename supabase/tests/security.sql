-- Run against a disposable/test Supabase project after the migration.
-- Rolls back all fixtures. SQL editor must execute as postgres.
begin;
do $$ begin
 if has_table_privilege('anon','public.waitlist_signups','SELECT') then raise exception 'Anonymous signup read granted'; end if;
 if has_table_privilege('authenticated','public.waitlist_signups','SELECT') then raise exception 'Authenticated signup read granted'; end if;
 if has_function_privilege('anon','public.dashboard_metrics(timestamptz,timestamptz,text)','EXECUTE') then raise exception 'Anonymous dashboard granted'; end if;
 if has_function_privilege('authenticated','public.delete_signup_by_receipt(text)','EXECUTE') then raise exception 'Direct deletion granted'; end if;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
do $$ begin
 begin
  perform public.dashboard_metrics();
  raise exception 'Non-admin accessed metrics';
 exception when insufficient_privilege then null;
 end;
 begin
  insert into public.outreach_contacts values('unauthorized','email','test',current_date,'sent');
  raise exception 'Non-admin wrote outreach';
 exception when insufficient_privilege then null;
 end;
end $$;
reset role;
-- Add the auth fixture and allowlist only inside this rollback transaction.
insert into auth.users(id) values('00000000-0000-4000-8000-000000000001');
insert into public.admin_users values('00000000-0000-4000-8000-000000000001');
insert into public.analytics_events(id,visitor_id,attribution) values
 ('00000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000021','{"campaign":"sql_test_unique"}'),
 ('00000000-0000-4000-8000-000000000012','00000000-0000-4000-8000-000000000021','{"campaign":"sql_test_unique"}');
insert into public.waitlist_signups(email,audience,receipt_hash,consent_version,visitor_id,attribution)
 values('sql-test@example.invalid','visitor','test-hash','test','00000000-0000-4000-8000-000000000021','{"campaign":"sql_test_unique"}');
set local role authenticated;
do $$ declare metrics jsonb; begin
 metrics:=public.dashboard_metrics(null,null,'sql_test_unique');
 if (metrics->>'visitors')::int<>1 or (metrics->>'signups')::int<>1 or (metrics->>'converted')::int<>1 then raise exception 'Bad aggregates: %',metrics; end if;
 if jsonb_array_length(metrics->'trend')<>1
    or metrics->'trend'->0->>'day' <> (now() at time zone 'UTC')::date::text
    or (metrics->'trend'->0->>'count')::int<>1 then
   raise exception 'Bad trend response: %',metrics->'trend';
 end if;
end $$;
reset role;
select public.delete_signup_by_receipt('test-hash');
do $$ begin
 if exists(select 1 from public.waitlist_signups where email='sql-test@example.invalid') then raise exception 'Deletion failed'; end if;
 if exists(select 1 from public.analytics_events where visitor_id='00000000-0000-4000-8000-000000000021') then raise exception 'Linked visit deletion failed'; end if;
end $$;
rollback;
