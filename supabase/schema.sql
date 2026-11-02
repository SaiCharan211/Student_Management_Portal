-- =====================================================================
-- Student Management: tables, triggers and Row Level Security (RLS)
-- Safe to run again on an existing database (it upgrades in place).
-- Run the whole file in: Supabase Dashboard > SQL Editor
-- Roles: admin | staff | student
-- =====================================================================

-- ---------- Profiles ----------
create table if not exists public.profiles (
  id        uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email     text,
  role      text not null default 'student'
);
alter table public.profiles alter column role set default 'student';
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('admin', 'staff', 'student'));

-- ---------- Students ----------
create table if not exists public.students (
  id                uuid primary key default gen_random_uuid(),
  admission_no      text not null unique,
  full_name         text not null,
  email             text,
  phone             text,
  date_of_birth     date,
  gender            text check (gender in ('Male', 'Female', 'Other')),
  course            text,
  address           text,
  registration_date date not null default current_date,
  created_by        uuid references public.profiles(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
alter table public.students add column if not exists batch   text;                                    -- e.g. 'Batch 24'
alter table public.students add column if not exists user_id uuid references auth.users(id) on delete set null; -- the student's login
create unique index if not exists students_user_id_key on public.students (user_id) where user_id is not null;
create index if not exists students_full_name_idx on public.students (lower(full_name));
create index if not exists students_batch_idx on public.students (batch);

-- ---------- Helper functions (SECURITY DEFINER avoids RLS recursion) ----------
create or replace function public.user_role(uid uuid)
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = uid;
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- "staff" here means admin OR staff (never student)
create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'staff'));
$$;

-- Today's date for attendance. Change the time zone here if you are not in India.
create or replace function public.today_local()
returns date language sql stable as $$
  select (now() at time zone 'Asia/Kolkata')::date;
$$;

-- ---------- Attendance ----------
create table if not exists public.attendance (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  full_name       text,
  role            text,
  batch           text,
  attendance_date date not null default public.today_local(),
  check_in        timestamptz not null default now(),
  check_out       timestamptz,
  unique (user_id, attendance_date)
);
create index if not exists attendance_date_idx on public.attendance (attendance_date);

-- ---------- Triggers ----------
-- New auth user -> profile with the least-privileged role ("student").
-- Real roles are set by the manage-staff Edge Function or by an admin.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.email), new.email, 'student')
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Students: keep updated_at fresh; created_by / created_at never change;
-- only the server (service role) may change which login a student is linked to.
create or replace function public.students_before_update()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  new.created_by := old.created_by;
  new.created_at := old.created_at;
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    new.user_id := old.user_id;
  end if;
  return new;
end;
$$;
drop trigger if exists students_set_updated on public.students;
create trigger students_set_updated before update on public.students
  for each row execute function public.students_before_update();

-- Attendance: the server fills in name, role, batch, date and time (the browser cannot fake them)
create or replace function public.attendance_before_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  select p.full_name, p.role into new.full_name, new.role from public.profiles p where p.id = new.user_id;
  select s.batch into new.batch from public.students s where s.user_id = new.user_id;
  new.attendance_date := public.today_local();
  new.check_in := now();
  new.check_out := null;
  return new;
end;
$$;
drop trigger if exists attendance_set_fields on public.attendance;
create trigger attendance_set_fields before insert on public.attendance
  for each row execute function public.attendance_before_insert();

-- Attendance: only check_out can ever change, and only once (stamped with server time)
create or replace function public.attendance_before_update()
returns trigger language plpgsql as $$
begin
  new.user_id := old.user_id;
  new.full_name := old.full_name;
  new.role := old.role;
  new.batch := old.batch;
  new.attendance_date := old.attendance_date;
  new.check_in := old.check_in;
  if old.check_out is not null then
    new.check_out := old.check_out;
  elsif new.check_out is not null then
    new.check_out := now();
  end if;
  return new;
end;
$$;
drop trigger if exists attendance_guard on public.attendance;
create trigger attendance_guard before update on public.attendance
  for each row execute function public.attendance_before_update();

-- ---------- Row Level Security ----------
alter table public.profiles   enable row level security;
alter table public.students   enable row level security;
alter table public.attendance enable row level security;

-- profiles: read your own; admins read and update all
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
drop policy if exists "profiles_admin_update" on public.profiles;
create policy "profiles_admin_update" on public.profiles for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- students: admin/staff see all; a student sees only their own record
drop policy if exists "students_select" on public.students;
create policy "students_select" on public.students for select to authenticated
  using (public.is_staff() or user_id = auth.uid());
drop policy if exists "students_insert" on public.students;
create policy "students_insert" on public.students for insert to authenticated
  with check (public.is_staff() and created_by = auth.uid());
drop policy if exists "students_update" on public.students;
create policy "students_update" on public.students for update to authenticated
  using (public.is_staff()) with check (public.is_staff());
drop policy if exists "students_delete_admin" on public.students;
create policy "students_delete_admin" on public.students for delete to authenticated
  using (public.is_admin());

-- attendance: you see your own; staff also see students'; admin sees everyone's
drop policy if exists "attendance_select" on public.attendance;
create policy "attendance_select" on public.attendance for select to authenticated
  using (user_id = auth.uid() or public.is_admin() or (public.is_staff() and role = 'student'));
drop policy if exists "attendance_insert" on public.attendance;
create policy "attendance_insert" on public.attendance for insert to authenticated
  with check (user_id = auth.uid() and public.user_role(auth.uid()) is not null);
drop policy if exists "attendance_update" on public.attendance;
create policy "attendance_update" on public.attendance for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "attendance_delete_admin" on public.attendance;
create policy "attendance_delete_admin" on public.attendance for delete to authenticated
  using (public.is_admin());

revoke all on public.students   from anon;
revoke all on public.profiles   from anon;
revoke all on public.attendance from anon;
