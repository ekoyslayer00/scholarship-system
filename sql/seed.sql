-- Replace <SCHOLAR_UUID> and <STAFF_UUID> with the UUIDs from
-- Supabase → Authentication → Users

insert into public.profiles (user_id, full_name, email, role) values
  ('<SCHOLAR_UUID>', 'Maria Santos',   'scholar@example.edu', 'Scholar'),
  ('<STAFF_UUID>',   'Juan Dela Cruz', 'staff@example.edu',   'Scholarship Staff');

insert into public.scholarship_programs
  (program_name, gwa_threshold, max_failed, max_incomplete, max_dropped) values
  ('Merit Scholar',     1.75, 0, 0, 0),
  ('Community Scholar', 2.50, 1, 1, 2);

insert into public.scholar_assignments (user_id, program_id, academic_year, status)
values (
  '<SCHOLAR_UUID>',
  (select program_id from public.scholarship_programs where program_name = 'Merit Scholar'),
  '2025-2026',
  'Active'
);