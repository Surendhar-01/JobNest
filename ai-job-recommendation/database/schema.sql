-- Apply in the Supabase SQL editor. Safe to re-run for existing installations.
create extension if not exists pgcrypto;
create table if not exists public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 full_name text not null default '', email text, role text not null default 'student' check(role in ('student','admin')),
 phone text, photo_url text, department text, degree text,
 college text not null default 'K S Rangasamy College of Technology (Autonomous)',
 graduation_year integer,
 current_location text not null default 'KSR Kalvi Nagar, Tiruchengode',
 preferred_location text, preferred_job_type text, expected_salary numeric,
 technical_skills text[] not null default '{}', soft_skills text[] not null default '{}',
 certifications text[] not null default '{}', projects text[] not null default '{}',
 internship_experience text, work_experience text, experience_years numeric check(experience_years >= 0),
 is_active boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.profiles add column if not exists is_active boolean not null default true;
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.profiles where id=auth.uid() and role='admin'); $$;
create or replace function public.protect_role() returns trigger language plpgsql set search_path=public as $$
begin
 if new.role is distinct from old.role and coalesce(auth.role(),'') <> 'service_role' and current_user not in ('postgres','supabase_admin') then
  raise exception 'Role updates require privileged administration';
 end if;
 return new;
end $$;
drop trigger if exists profiles_protect_role on public.profiles;
create trigger profiles_protect_role before update on public.profiles for each row execute function public.protect_role();
create or replace function public.handle_signup() returns trigger language plpgsql security definer set search_path=public as $$
begin
 insert into public.profiles(id,email,full_name,department,degree,college,current_location,graduation_year)
 values(new.id,new.email,coalesce(new.raw_user_meta_data->>'full_name',''),
 new.raw_user_meta_data->>'department',new.raw_user_meta_data->>'qualification',
 coalesce(new.raw_user_meta_data->>'college', 'K S Rangasamy College of Technology (Autonomous)'),
 coalesce(new.raw_user_meta_data->>'current_location', 'KSR Kalvi Nagar, Tiruchengode'),
 case when (new.raw_user_meta_data->>'graduation_year') ~ '^\d{4}$' then (new.raw_user_meta_data->>'graduation_year')::integer else null end)
 on conflict(id) do nothing;
 return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_signup();
insert into public.profiles(id,email,full_name) select id,email,coalesce(raw_user_meta_data->>'full_name','') from auth.users on conflict(id) do nothing;

create table if not exists public.jobs (
 id uuid primary key, source_job_id text, title text, company text, location text, description text, skills text[],
 experience text, salary text, job_type text, posted_date date, application_url text, source text not null,
 collected_at timestamptz not null default now(), unique(source,source_job_id)
);
alter table public.jobs add column if not exists qualification text;
alter table public.jobs add column if not exists department text;
alter table public.jobs add column if not exists work_mode text;
alter table public.jobs add column if not exists experience_min numeric;
alter table public.jobs add column if not exists salary_min numeric;
alter table public.jobs add column if not exists salary_max numeric;
alter table public.jobs add column if not exists is_active boolean not null default true;
alter table public.jobs add column if not exists is_demo boolean not null default false;
alter table public.jobs add column if not exists created_at timestamptz not null default now();
alter table public.jobs add column if not exists updated_at timestamptz not null default now();
update public.jobs set is_demo=true where source='https://realpython.github.io/fake-jobs/';

create table if not exists public.user_skills (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
 skill text not null, category text not null default 'technical', created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(), unique(user_id,skill)
);
create table if not exists public.resumes (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
 file_name text not null, storage_path text not null unique, mime_type text not null, size_bytes integer not null,
 sha256 text not null, status text not null default 'uploaded' check(status in ('uploaded','analyzing','analyzed','failed')),
 extracted_text text, analysis jsonb, reviewed boolean not null default false, error text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.job_skills (
 id uuid primary key default gen_random_uuid(), job_id uuid not null references public.jobs(id) on delete cascade,
 skill text not null, mandatory boolean not null default false, evidence text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(job_id,skill)
);
create table if not exists public.saved_jobs (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
 job_id uuid not null references public.jobs(id) on delete cascade,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(user_id,job_id)
);
create table if not exists public.applications (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
 job_id uuid not null references public.jobs(id) on delete cascade,
 status text not null default 'Applied' check(status in ('Saved','Applied','Interview','Offer','Rejected')),
 notes text not null default '', history jsonb not null default '[]',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(user_id,job_id)
);
create table if not exists public.recommendations (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
 job_id uuid not null references public.jobs(id) on delete cascade,
 score numeric not null check(score between 0 and 100), explanation jsonb not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(user_id,job_id)
);
create table if not exists public.scraping_sources (
 id text primary key, name text not null, url text not null unique, permission_url text not null,
 adapter text not null check(adapter in ('practice','json_api')), enabled boolean not null default false,
 permitted boolean not null default false, interval_seconds integer not null default 3600 check(interval_seconds >= 3600),
 config jsonb not null default '{}', access_denied boolean not null default false,
 last_attempt timestamptz, last_success timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
insert into public.scraping_sources(id,name,url,permission_url,adapter,enabled,permitted)
values('fake-jobs','Real Python practice jobs','https://realpython.github.io/fake-jobs/',
'https://realpython.com/beautiful-soup-web-scraper-python/','practice',true,true) on conflict(id) do nothing;
create table if not exists public.scraping_logs (
 id uuid primary key default gen_random_uuid(), source_id text references public.scraping_sources(id),
 status text not null check(status in ('running','success','failed')), job_count integer not null default 0,
 inserted_count integer not null default 0, updated_count integer not null default 0,
 error text, started_at timestamptz not null default now(), finished_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.scraping_logs add column if not exists inserted_count integer not null default 0;
alter table public.scraping_logs add column if not exists updated_count integer not null default 0;
create table if not exists public.admin_activity_logs (
 id uuid primary key default gen_random_uuid(), admin_id uuid references public.profiles(id), action text not null,
 details jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at=now(); return new; end $$;
do $$ declare t text; begin
 foreach t in array array['profiles','user_skills','jobs','job_skills','resumes','saved_jobs','applications','recommendations','scraping_sources','scraping_logs','admin_activity_logs'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('drop trigger if exists touch_updated_at on public.%I',t);
  execute format('create trigger touch_updated_at before update on public.%I for each row execute function public.touch_updated_at()',t);
 end loop;
end $$;

drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select to authenticated using(id=auth.uid() or public.is_admin());
drop policy if exists profiles_edit on public.profiles;
create policy profiles_edit on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
grant select on public.profiles to authenticated;
grant update(full_name,phone,photo_url,department,degree,college,graduation_year,current_location,preferred_location,preferred_job_type,expected_salary,technical_skills,soft_skills,certifications,projects,internship_experience,work_experience,experience_years) on public.profiles to authenticated;

drop policy if exists jobs_read on public.jobs;
create policy jobs_read on public.jobs for select to anon,authenticated using(is_active or public.is_admin());
drop policy if exists jobs_admin on public.jobs;
create policy jobs_admin on public.jobs for all to authenticated using(public.is_admin()) with check(public.is_admin());
grant select on public.jobs to anon,authenticated;
grant insert,update,delete on public.jobs to authenticated;
drop policy if exists job_skills_read on public.job_skills;
create policy job_skills_read on public.job_skills for select to anon,authenticated using(exists(select 1 from public.jobs j where j.id=job_id and j.is_active));
grant select on public.job_skills to anon,authenticated;

do $$ declare t text; begin
 foreach t in array array['user_skills','resumes','saved_jobs','applications','recommendations'] loop
  execute format('drop policy if exists owner_access on public.%I',t);
  execute format('create policy owner_access on public.%I for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid())',t);
  execute format('grant select,insert,update,delete on public.%I to authenticated',t);
 end loop;
 foreach t in array array['scraping_sources','scraping_logs','admin_activity_logs'] loop
  execute format('drop policy if exists admin_access on public.%I',t);
  execute format('create policy admin_access on public.%I for all to authenticated using(public.is_admin()) with check(public.is_admin())',t);
  execute format('grant select,insert,update,delete on public.%I to authenticated',t);
 end loop;
end $$;
grant all on all tables in schema public to service_role;

create index if not exists jobs_location_idx on public.jobs(location);
create index if not exists jobs_department_idx on public.jobs(department);
create index if not exists jobs_date_idx on public.jobs(posted_date desc);
create index if not exists jobs_skills_idx on public.jobs using gin(skills);
create index if not exists jobs_search_idx on public.jobs using gin(to_tsvector('english',coalesce(title,'') || ' ' || coalesce(description,'')));
create index if not exists resumes_user_idx on public.resumes(user_id,created_at desc);
create index if not exists saved_user_idx on public.saved_jobs(user_id);
create index if not exists applications_user_idx on public.applications(user_id);
create index if not exists recommendations_user_idx on public.recommendations(user_id,score desc);
create index if not exists scraping_logs_source_idx on public.scraping_logs(source_id,started_at desc);

-- Atomic claim enforces cooldown across API workers and the scheduler.
create or replace function public.claim_scrape_source(source_key text) returns jsonb
language plpgsql security definer set search_path=public as $$
declare s public.scraping_sources; begin
 select * into s from public.scraping_sources where id=source_key for update;
 if not found or not s.enabled or not s.permitted or s.access_denied then raise exception 'Source disabled or access denied'; end if;
 if s.last_attempt is not null and s.last_attempt + make_interval(secs => s.interval_seconds) > now() then raise exception 'Source cooldown has not expired'; end if;
 update public.scraping_sources set last_attempt=now() where id=source_key;
 return to_jsonb(s);
end $$;
revoke all on function public.claim_scrape_source(text) from public,anon,authenticated;
grant execute on function public.claim_scrape_source(text) to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('resumes','resumes',false,10485760,array['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict(id) do update set public=false,file_size_limit=10485760;
drop policy if exists resume_owner on storage.objects;
create policy resume_owner on storage.objects for all to authenticated
using(bucket_id='resumes' and (storage.foldername(name))[1]=auth.uid()::text)
with check(bucket_id='resumes' and (storage.foldername(name))[1]=auth.uid()::text);

-- Promote an existing, verified user only from the SQL editor:
-- update public.profiles set role='admin' where id='<verified user UUID>';
