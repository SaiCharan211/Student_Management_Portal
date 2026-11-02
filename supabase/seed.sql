-- DUMMY TEST DATA ONLY. All names, emails and numbers are fictional.
-- Run after schema.sql. (These students have no login until you create one.)
insert into public.students
  (admission_no, full_name, email, phone, date_of_birth, gender, course, address, registration_date, batch)
values
  ('ADM-1001', 'Test Student One',   'student1@example.com', '555-0101', '2005-03-14', 'Female', 'Computer Science',       '1 Sample Street, Testville', '2026-06-01', 'Batch 24'),
  ('ADM-1002', 'Test Student Two',   'student2@example.com', '555-0102', '2004-11-02', 'Male',   'Business Studies',       '2 Sample Street, Testville', '2026-06-01', 'Batch 24'),
  ('ADM-1003', 'Test Student Three', 'student3@example.com', '555-0103', '2005-07-21', 'Other',  'Mechanical Engineering', '3 Sample Street, Testville', '2026-06-02', 'Batch 25'),
  ('ADM-1004', 'Test Student Four',  'student4@example.com', '555-0104', '2003-12-09', 'Female', 'Biology',                '4 Sample Street, Testville', '2026-06-02', 'Batch 25'),
  ('ADM-1005', 'Test Student Five',  'student5@example.com', '555-0105', '2004-05-30', 'Male',   'Computer Science',       '5 Sample Street, Testville', '2026-06-03', 'Batch 26'),
  ('ADM-1006', 'Test Student Six',   'student6@example.com', '555-0106', '2005-01-18', 'Female', 'Business Studies',       '6 Sample Street, Testville', '2026-06-03', 'Batch 26'),
  ('ADM-1007', 'Test Student Seven', 'student7@example.com', '555-0107', '2004-09-25', 'Male',   'Mathematics',            '7 Sample Street, Testville', '2026-06-04', 'Batch 27'),
  ('ADM-1008', 'Test Student Eight', 'student8@example.com', '555-0108', '2005-08-11', 'Other',  'Biology',                '8 Sample Street, Testville', '2026-06-04', 'Batch 27')
on conflict (admission_no) do nothing;
