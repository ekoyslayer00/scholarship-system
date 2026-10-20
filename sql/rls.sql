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

create policy "profiles_select" on public.profiles
for select using (user_id = auth.uid() or public.current_role() = 'Scholarship Staff');

create policy "programs_read" on public.scholarship_programs
for select using (auth.uid() is not null);

create policy "assignments_select" on public.scholar_assignments
for select using (user_id = auth.uid() or public.current_role() = 'Scholarship Staff');

create policy "submissions_select" on public.semester_submissions
for select using (scholar_id = auth.uid() or public.current_role() = 'Scholarship Staff');

create policy "submissions_insert_scholar" on public.semester_submissions
for insert with check (scholar_id = auth.uid() and public.current_role() = 'Scholar');

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