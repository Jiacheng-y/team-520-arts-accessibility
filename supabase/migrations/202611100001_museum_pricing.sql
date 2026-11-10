-- Keep historical rows outside the pricing experiment. Apply before deploying collect.
alter table public.waitlist_signups
 add column pricing_experiment text,
 add column pricing_variant text,
 add constraint waitlist_signups_pricing_valid check (
  (pricing_experiment is null and pricing_variant is null) or
  (pricing_experiment is not null and pricing_variant is not null and
   pricing_experiment='museum-pricing-v1' and pricing_variant in ('inquiry','pilot') and
   experiment is not null and experiment='product-format-v1' and variant is not null and variant in ('mobile','device'))
 );
alter table public.analytics_events
 add column pricing_experiment text,
 add column pricing_variant text,
 add constraint analytics_events_pricing_valid check (
  (pricing_experiment is null and pricing_variant is null) or
  (pricing_experiment is not null and pricing_variant is not null and
   pricing_experiment='museum-pricing-v1' and pricing_variant in ('inquiry','pilot') and
   experiment is not null and experiment='product-format-v1' and variant is not null and variant in ('mobile','device'))
 );
create index analytics_pricing_visitor on public.analytics_events(pricing_experiment,variant,pricing_variant,visitor_id);

create or replace function public.dashboard_metrics(date_from timestamptz default null,date_to timestamptz default null,campaign_filter text default null)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if not public.is_admin() then raise exception 'Administrator access required' using errcode='42501'; end if;
 if date_from is not null and date_to is not null and date_from >= date_to then raise exception 'Invalid date range'; end if;
 with signups as (
  select * from public.waitlist_signups s where (date_from is null or s.created_at>=date_from) and (date_to is null or s.created_at<date_to) and (campaign_filter is null or s.attribution->>'campaign'=campaign_filter)
 ), pricing_signups as (
  select * from signups where audience='museum' and pricing_experiment='museum-pricing-v1'
 ), pricing_visits as (
  select distinct visitor_id,variant,pricing_variant from public.analytics_events e
  where pricing_experiment='museum-pricing-v1'
  and (date_from is null or e.created_at>=date_from) and (date_to is null or e.created_at<date_to)
  and (campaign_filter is null or e.attribution->>'campaign'=campaign_filter)
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
 'experiments',(select coalesce(jsonb_agg(result_row), '[]'::jsonb) from (
 select variant,
 (select count(distinct visitor_id) from public.analytics_events e where e.experiment='product-format-v1' and e.variant=k.variant and (date_from is null or e.created_at>=date_from) and (date_to is null or e.created_at<date_to) and (campaign_filter is null or e.attribution->>'campaign'=campaign_filter)) as visitors,
 (select count(*) from signups s where s.experiment='product-format-v1' and s.variant=k.variant) as signups,
 (select count(*) from signups s where s.experiment='product-format-v1' and s.variant=k.variant and s.audience='museum') as museums,
 (select count(*) from signups s where s.experiment='product-format-v1' and s.variant=k.variant and s.audience='visitor') as visitor_signups,
 (select count(*) from signups s where s.experiment='product-format-v1' and s.variant=k.variant and s.audience='educator') as educators,
 (select count(*) from signups s where s.experiment='product-format-v1' and s.variant=k.variant and s.audience='other') as other,
 (select count(*) from qualified q join signups s on s.id=q.signup_id where s.experiment='product-format-v1' and s.variant=k.variant and q.paid_pilot='yes') as paid,
 (select count(*) from qualified q join signups s on s.id=q.signup_id where s.experiment='product-format-v1' and s.variant=k.variant and q.interest='very') as very_interested,
 (select count(distinct s.visitor_id) from signups s where s.experiment='product-format-v1' and s.variant=k.variant and exists (select 1 from public.analytics_events e where e.visitor_id=s.visitor_id and e.experiment=s.experiment and e.variant=s.variant and (date_from is null or e.created_at>=date_from) and (date_to is null or e.created_at<date_to) and (campaign_filter is null or e.attribution->>'campaign'=campaign_filter))) as converted
 from (values ('worksheet'),('mobile'),('device')) as k(variant)
 ) result_row),
 'pricing',(select coalesce(jsonb_agg(result_row), '[]'::jsonb) from (
 select k.variant,k.pricing_variant,
 (select count(distinct visitor_id) from pricing_visits e where e.variant=k.variant and e.pricing_variant=k.pricing_variant) as visitors,
 (select count(*) from pricing_signups s where s.variant=k.variant and s.pricing_variant=k.pricing_variant) as museums,
 (select count(*) from qualified q join pricing_signups s on s.id=q.signup_id where s.variant=k.variant and s.pricing_variant=k.pricing_variant and q.paid_pilot='yes') as paid,
 (select count(distinct s.visitor_id) from pricing_signups s where s.variant=k.variant and s.pricing_variant=k.pricing_variant and exists(select 1 from pricing_visits e where e.visitor_id=s.visitor_id and e.variant=s.variant and e.pricing_variant=s.pricing_variant)) as converted
 from (values ('mobile'),('device')) as kconcept(variant)
 cross join (values ('inquiry'),('pilot')) as koffer(pricing_variant)
 cross join lateral (select kconcept.variant,koffer.pricing_variant) k
 ) result_row),
 'preferences',coalesce((select jsonb_object_agg(preference,n) from (select preference,count(*) n from qualified where preference is not null group by preference) p),'{}'::jsonb),
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
