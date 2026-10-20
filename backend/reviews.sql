-- Site-specific tables: browser roles have no direct access.
create table if not exists public.alexandra_reviews (
 id uuid primary key default gen_random_uuid(),
 submission_id uuid not null unique,
 name text not null check(char_length(btrim(name)) between 2 and 60),
 rating smallint not null check(rating between 1 and 5),
 body text not null check(char_length(btrim(body)) between 20 and 1500),
 created_at timestamptz not null default now(),
 visible boolean not null default true
);
create index if not exists alexandra_reviews_visible_created_idx on public.alexandra_reviews(created_at desc,id desc) where visible;
alter table public.alexandra_reviews enable row level security;
revoke all on public.alexandra_reviews from anon,authenticated;
grant all on public.alexandra_reviews to service_role;
create table if not exists public.alexandra_review_limits (
 fingerprint text primary key check(char_length(fingerprint)=64),
 window_start timestamptz not null default now(),
 last_at timestamptz not null default now(),
 submissions integer not null default 1
);
alter table public.alexandra_review_limits enable row level security;
revoke all on public.alexandra_review_limits from anon,authenticated;
grant all on public.alexandra_review_limits to service_role;

create or replace function public.alexandra_submit_review(
 p_name text,p_rating smallint,p_body text,p_fingerprint text,p_submission_id uuid
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_review public.alexandra_reviews; v_limit public.alexandra_review_limits;
begin
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_fingerprint,0));
 select * into v_review from public.alexandra_reviews where submission_id=p_submission_id;
 if found then
  return jsonb_build_object('id',v_review.id,'name',v_review.name,'rating',v_review.rating,'body',v_review.body,'created_at',v_review.created_at);
 end if;
 select * into v_limit from public.alexandra_review_limits where fingerprint=p_fingerprint;
 if found then
  if v_limit.last_at > now()-interval '60 seconds' or (v_limit.window_start>now()-interval '24 hours' and v_limit.submissions>=3) then
   raise exception using errcode='P0001',message='REVIEW_RATE_LIMIT';
  end if;
  update public.alexandra_review_limits set
   submissions=case when window_start<=now()-interval '24 hours' then 1 else submissions+1 end,
   window_start=case when window_start<=now()-interval '24 hours' then now() else window_start end,
   last_at=now() where fingerprint=p_fingerprint;
 else
  insert into public.alexandra_review_limits(fingerprint) values(p_fingerprint);
 end if;
 insert into public.alexandra_reviews(submission_id,name,rating,body)
 values(p_submission_id,btrim(p_name),p_rating,btrim(p_body)) returning * into v_review;
 return jsonb_build_object('id',v_review.id,'name',v_review.name,'rating',v_review.rating,'body',v_review.body,'created_at',v_review.created_at);
end;
$$;
revoke all on function public.alexandra_submit_review(text,smallint,text,text,uuid) from public,anon,authenticated;
grant execute on function public.alexandra_submit_review(text,smallint,text,text,uuid) to service_role;

create or replace function public.alexandra_reviews_page(p_before timestamptz default null)
returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object(
  'reviews',coalesce((select jsonb_agg(r order by r.created_at desc,r.id desc) from
    (select id,name,rating,body,created_at from public.alexandra_reviews
     where visible and (p_before is null or created_at<p_before) order by created_at desc,id desc limit 20) r),'[]'::jsonb),
  'total',(select count(*) from public.alexandra_reviews where visible),
  'average',(select round(avg(rating),1) from public.alexandra_reviews where visible)
 );
$$;
revoke all on function public.alexandra_reviews_page(timestamptz) from public,anon,authenticated;
grant execute on function public.alexandra_reviews_page(timestamptz) to service_role;
