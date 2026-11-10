-- Creation guards support retrying this initial migration after a partial failure.
-- No anonymous table access. Public writes go through the validated Edge Function.
create table if not exists public.admin_users (user_id uuid primary key references auth.users(id) on delete cascade);
alter table public.admin_users enable row level security;
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.admin_users where user_id=(select auth.uid()));
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

create table if not exists public.waitlist_signups (
 id uuid primary key default gen_random_uuid(),
 email text not null unique check (email=lower(trim(email)) and length(email)<=254),
 audience text not null check(audience in ('museum','educator','visitor','other')),
 organization text not null default '', role text not null default '',
 visitor_id uuid, attribution jsonb not null default '{}',
 receipt_hash text not null unique,
 consent_version text not null,
 consent_at timestamptz not null default now(),
 created_at timestamptz not null default now()
);
create table if not exists public.qualification_responses (
 signup_id uuid primary key references public.waitlist_signups(id) on delete cascade,
 challenge text not null check(challenge in ('high','medium','low','unknown')),
 preference text not null check(preference in ('layer','audio','both','unsure')),
 paid_pilot text not null check(paid_pilot in ('yes','maybe','no')),
 budget text not null default '' check(length(budget)<=1000),
 created_at timestamptz not null default now()
);
create table if not exists public.analytics_events (
 id uuid primary key, visitor_id uuid not null,
 attribution jsonb not null default '{}', created_at timestamptz not null default now()
);
create index if not exists analytics_visitor_date on public.analytics_events(visitor_id,created_at);
create index if not exists signup_date on public.waitlist_signups(created_at);
create table if not exists public.outreach_contacts (
 contact_code text primary key check(contact_code ~ '^[a-zA-Z0-9_-]{1,40}$'),
 channel text not null check(channel in ('email','linkedin')),
 campaign text not null check(length(campaign) between 1 and 200),
 sent_at date not null,
 outcome text not null check(outcome in ('sent','replied','meeting','bounced'))
);
create table if not exists public.rate_limits (bucket text primary key, window_start timestamptz not null, hits integer not null);
alter table public.waitlist_signups enable row level security;
alter table public.qualification_responses enable row level security;
alter table public.analytics_events enable row level security;
alter table public.outreach_contacts enable row level security;
alter table public.rate_limits enable row level security;
revoke all on public.admin_users, public.waitlist_signups, public.qualification_responses, public.analytics_events, public.outreach_contacts, public.rate_limits from anon, authenticated;
grant select,insert,update on public.outreach_contacts to authenticated;
do $$ begin
 if not exists (
   select 1 from pg_catalog.pg_policies
   where schemaname='public' and tablename='outreach_contacts' and policyname='admin_outreach'
 ) then
   create policy admin_outreach on public.outreach_contacts for all to authenticated
     using(public.is_admin()) with check(public.is_admin());
 end if;
end $$;
grant all on public.admin_users, public.waitlist_signups, public.qualification_responses, public.analytics_events, public.outreach_contacts, public.rate_limits to service_role;

create or replace function public.consume_rate_limit(bucket_key text, request_limit integer) returns boolean language plpgsql security definer set search_path='' as $$
declare count_now integer;
begin
 delete from public.rate_limits where window_start < now()-interval '1 day';
 insert into public.rate_limits(bucket,window_start,hits) values(bucket_key,now(),1)
 on conflict(bucket) do update set
 hits=case when public.rate_limits.window_start < now()-interval '10 minutes' then 1 else public.rate_limits.hits+1 end,
 window_start=case when public.rate_limits.window_start < now()-interval '10 minutes' then now() else public.rate_limits.window_start end
 returning hits into count_now;
 return count_now <= request_limit;
end $$;
revoke all on function public.consume_rate_limit(text,integer) from public,anon,authenticated;
grant execute on function public.consume_rate_limit(text,integer) to service_role;

create or replace function public.delete_signup_by_receipt(receipt_digest text) returns void language plpgsql security definer set search_path='' as $$
declare browser uuid;
begin
 select visitor_id into browser from public.waitlist_signups where receipt_hash=receipt_digest;
 delete from public.analytics_events where visitor_id=browser;
 delete from public.waitlist_signups where receipt_hash=receipt_digest;
end $$;
revoke all on function public.delete_signup_by_receipt(text) from public,anon,authenticated;
grant execute on function public.delete_signup_by_receipt(text) to service_role;

create or replace function public.dashboard_metrics(date_from timestamptz default null,date_to timestamptz default null,campaign_filter text default null)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if not public.is_admin() then raise exception 'Administrator access required' using errcode='42501'; end if;
 if date_from is not null and date_to is not null and date_from >= date_to then raise exception 'Invalid date range'; end if;
 with signups as (
  select * from public.waitlist_signups s where (date_from is null or s.created_at>=date_from) and (date_to is null or s.created_at<date_to) and (campaign_filter is null or s.attribution->>'campaign'=campaign_filter)
 ), visitors as (
  select distinct visitor_id from public.analytics_events e where (date_from is null or e.created_at>=date_from) and (date_to is null or e.created_at<date_to) and (campaign_filter is null or e.attribution->>'campaign'=campaign_filter)
 ), qualified as (
  select q.* from public.qualification_responses q join signups s on s.id=q.signup_id where s.audience='museum'
 ), outreach as (
  select * from public.outreach_contacts o where (date_from is null or o.sent_at >= (date_from at time zone 'UTC')::date) and (date_to is null or o.sent_at < (date_to at time zone 'UTC')::date) and (campaign_filter is null or o.campaign=campaign_filter)
 )
 select jsonb_build_object(
 'signups',(select count(*) from signups),
 'visitors',(select count(*) from visitors),
 'museums',(select count(*) from signups where audience='museum'),
 'paid',(select count(*) from qualified where paid_pilot='yes'),
 'converted',(select count(distinct s.visitor_id) from signups s join visitors v on s.visitor_id=v.visitor_id),
 'unattributed',(select count(*) from signups s where not exists(select 1 from visitors v where v.visitor_id=s.visitor_id)),
 'audiences',coalesce((select jsonb_object_agg(audience,n) from (select audience,count(*) n from signups group by audience) a),'{}'::jsonb),
 'preferences',coalesce((select jsonb_object_agg(preference,n) from (select preference,count(*) n from qualified group by preference) p),'{}'::jsonb),
 'trend',coalesce((
   select jsonb_agg(
     jsonb_build_object('day', t.signup_day, 'count', t.signup_count)
     order by t.signup_day
   )
   from (
     select (created_at at time zone 'UTC')::date as signup_day,
            count(*) as signup_count
     from signups
     group by 1
     order by 1 desc
     limit 14
   ) as t
 ),'[]'::jsonb),
 'outreach',jsonb_build_object('sent',(select count(*) from outreach),'replied',(select count(*) from outreach where outcome in ('replied','meeting')),'meeting',(select count(*) from outreach where outcome='meeting'),'bounced',(select count(*) from outreach where outcome='bounced'))
 ) into result;
 return result;
end $$;
revoke all on function public.dashboard_metrics(timestamptz,timestamptz,text) from public,anon;
grant execute on function public.dashboard_metrics(timestamptz,timestamptz,text) to authenticated;
