alter table public.profiles enable row level security;
alter table public.scholarship_programs enable row level security;
alter table public.scholar_assignments enable row level security;
alter table public.semester_submissions enable row level security;
alter table public.evaluation_history enable row level security;

create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where user_id = (select auth.uid()) limit 1;
$$;
grant execute on function public.current_role() to authenticated;

drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
for select to authenticated
using (
  (select auth.uid()) = user_id
  or (select public.current_role()) = 'Scholarship Staff'
);

create policy "programs_read" on public.scholarship_programs
for select using (auth.uid() is not null);

grant select on public.scholar_assignments to authenticated;
drop policy if exists "assignments_select" on public.scholar_assignments;
create policy "assignments_select" on public.scholar_assignments
for select to authenticated
using (
  user_id = (select auth.uid())
  or (select public.current_role()) = 'Scholarship Staff'
);

grant select on public.semester_submissions to authenticated;
drop policy if exists "submissions_select" on public.semester_submissions;
create policy "submissions_select" on public.semester_submissions
for select to authenticated
using (
  scholar_id = (select auth.uid())
  or (select public.current_role()) = 'Scholarship Staff'
);

grant insert on public.semester_submissions to authenticated;
drop policy if exists "submissions_insert_scholar" on public.semester_submissions;
create policy "submissions_insert_scholar" on public.semester_submissions
for insert to authenticated
with check (
  scholar_id = (select auth.uid())
  and exists (
    select 1 from public.profiles p
    where p.user_id = (select auth.uid())
      and p.role = 'Scholar'
  )
  and exists (
    select 1 from public.scholar_assignments a
    where a.assignment_id = semester_submissions.assignment_id
      and a.user_id = (select auth.uid())
      and a.status = 'Active'
  )
);

create policy "submissions_update_scholar" on public.semester_submissions
for update using (
  scholar_id = auth.uid()
  and public.current_role() = 'Scholar'
  and verification_status = 'Submitted'
);

create policy "submissions_update_staff" on public.semester_submissions
for update using (public.current_role() = 'Scholarship Staff');

create policy "evaluations_select" on public.evaluation_history
for select using (
  public.current_role() = 'Scholarship Staff'
  or exists (
    select 1 from public.semester_submissions s
    where s.submission_id = evaluation_history.submission_id
    and s.scholar_id = auth.uid()
  )
);

create policy "evaluations_insert_staff" on public.evaluation_history
for insert with check (public.current_role() = 'Scholarship Staff');