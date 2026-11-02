# Student Management Portal

A role-based student records and attendance application built with React, Vite, and Supabase. Administrators and staff manage student records; students can set up their own login and view their profile and attendance history. Supabase Authentication, PostgreSQL Row Level Security (RLS), database triggers, and an Edge Function provide the backend.

## Contents

- [Features and permissions](#features-and-permissions)
- [Technology](#technology)
- [Run locally](#run-locally)
- [Configure Supabase](#configure-supabase)
- [Use the portal](#use-the-portal)
- [Routes](#routes)
- [Database and security](#database-and-security)
- [Build and deploy](#build-and-deploy)
- [Troubleshooting](#troubleshooting)
- [Project structure](#project-structure)

## Features and permissions

| Capability | Admin | Staff | Student |
|---|:---:|:---:|:---:|
| Register and edit student records | Yes | Yes | No |
| Search student records and filter by batch | Yes | Yes | No |
| Delete student records | Yes | No | No |
| Create student logins and reset student passwords | Yes | Yes | No |
| Create staff/admin accounts, change staff roles, remove accounts | Yes | No | No |
| Check in and check out | Yes | Yes | Yes |
| View student attendance by date, batch, and name | Yes | Yes | Own records only |
| View staff/admin attendance | Yes | No | No |
| View own account and attendance history | Yes | Yes | Yes |
| Change own password | Yes | Yes | Yes |

Permissions are enforced in the database with RLS and, for privileged account operations, in the `manage-staff` Edge Function. Hiding a page or button is not the security boundary.

Student records include name, admission number, email, phone, date of birth, gender, batch, course, address, and registration date. The form requires all of those except address and the optional temporary password. Admission numbers must be unique.

## Technology

- React 18 and React Router 6
- Vite 5
- Supabase JavaScript client 2
- Supabase Auth, PostgreSQL, RLS, triggers, and Edge Functions

Prerequisites: Node.js with npm, and a Supabase project. The project currently defines `dev`, `build`, and `preview` scripts; it does not define a test or lint script.

## Run locally

1. Open a terminal in the `student-management1` project folder.
2. Install dependencies:

   ```powershell
   npm install
   ```

3. Copy `.env.example` to `.env`. In PowerShell:

   ```powershell
   Copy-Item .env.example .env
   ```

   In `.env`, set the Supabase project URL and **anon/public** key:

   ```dotenv
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-public-key
   ```

4. Start the development server:

   ```powershell
   npm run dev
   ```

   Open the local URL printed by Vite, usually `http://localhost:5173`.

5. To verify a production build locally, run:

   ```powershell
   npm run build
   npm run preview
   ```

Vite reads `VITE_` variables at startup and bundles them into browser code. Only use the Supabase anon/public key here. **Never put a Supabase service-role key in `.env`, frontend code, or any `VITE_` variable.** Restart the dev server after changing environment variables.

## Configure Supabase

### 1. Create the database schema

Create a Supabase project, open **SQL Editor**, and run the complete `supabase/schema.sql` file. It creates the `profiles`, `students`, and `attendance` tables, role helper functions, triggers, indexes, and RLS policies. The script is designed to be safe to run again when upgrading this project's schema.

Optional: run `supabase/seed.sql` after the schema to insert eight fictional sample students. They do not have student logins. Do not treat the sample records as real student information.

### 2. Configure authentication

In Supabase Authentication settings, turn off **Allow new users to sign up**. Students are created through the portal's controlled activation flow, and staff/admin accounts are provisioned by an administrator. Accounts created directly in the Supabase dashboard get the default `student` role from the database trigger.

### 3. Deploy the Edge Function

Deploy `supabase/functions/manage-staff/index.ts` as an Edge Function named exactly `manage-staff` (Dashboard: **Edge Functions** → deploy a function → editor). In the function's settings, turn **Verify JWT** off. The unauthenticated student activation screen must be able to call this function before the student has a session. The function itself validates student activation fields and checks the caller's Supabase identity and role before performing privileged actions. Do not add a service-role key to the frontend or manually expose it as a client secret; Supabase provides its standard environment variables to Edge Functions.

After deploying, check the function logs if account creation or password management reports a function error.

### 4. Create the first administrator

In **Authentication → Users**, add the administrator's account and enable **Auto Confirm User**. The database trigger creates a matching `profiles` row with the `student` role. Promote that account in **SQL Editor**, replacing the email with the administrator account's email:

```sql
update public.profiles
set role = 'admin'
where email = 'admin@example.com';
```

Confirm that exactly the intended account has the admin role:

```sql
select id, full_name, email, role
from public.profiles
where email = 'admin@example.com';
```

If the update affects zero rows, first verify the email and that the Auth user was created. The `handle_new_user` trigger normally creates the profile automatically.

### 5. Connect the frontend

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env` using the values from the Supabase project's API settings, then run `npm run dev`. These same two public configuration values must be set in the environment of any production frontend build.

## Use the portal

### Sign in and accounts

- `/login` accepts student, staff, and admin accounts.
- `/admin-login` is an admin-only entry point. Non-admin users are signed out if they try to use it.
- A student without a password can choose **New student? Set up your account** on the login page. Their email, admission number, and date of birth must match an existing student record, and the new password must be at least eight characters. A student record can only be linked to one login.
- An admin or staff member can create a login for a student from the registration form or Student records. They can also reset student passwords. Admins can add staff/admin accounts, change their roles, reset their passwords, and remove their accounts under **Manage staff**.
- Signed-in users can change their own password from **Account**. Passwords must be at least eight characters.

### Student records

Admins and staff can register and edit students, search by name or admission number, and filter by batch. Admins alone can delete student records. The registration form can optionally create a student login with a temporary password; if skipped, create one later from the student list or let the student activate it themselves.

The batch dropdown and filters use the `BATCHES` list in `src/utils.js`. Add or rename batch labels there. Existing student records can be updated with **Edit** to assign a batch after a batch list change or schema upgrade.

### Attendance

All signed-in users can check in once per day and check out once. Attendance names, role, batch, date, and timestamps are set or guarded by database triggers. Admins and staff can view student attendance; only admins can view staff/admin attendance. Students see their own history and the most recent 30 records on their dashboard.

The database stamps the attendance date using `Asia/Kolkata`, configured in `public.today_local()` in `supabase/schema.sql`. The frontend's date selection uses the browser's local date; deployments should use browsers configured for the same timezone, or update the frontend date helper and SQL function together when using another timezone.

## Routes

| Path | Access | Page |
|---|---|---|
| `/login` | Public | Student, staff, and admin sign-in |
| `/admin-login` | Public; admin account required | Admin sign-in |
| `/activate` | Public | Student account activation |
| `/me` | Student | Student profile, check-in/out, and attendance history |
| `/students` | Admin or staff | Student records, search, filters, and login actions |
| `/register` | Admin or staff | Register a student |
| `/students/:id/edit` | Admin or staff | Edit a student |
| `/attendance` | Admin, staff, or student | Attendance page; role-based data visibility |
| `/staff` | Admin | Manage staff/admin accounts |
| `/account` | Signed-in user | Change own password |

Unknown paths redirect to `/login`. Route restrictions complement, but do not replace, database authorization.

## Database and security

- `profiles` associates each Auth user with a name, email, and one of the `admin`, `staff`, or `student` roles. New Auth users default to `student`.
- `students` stores student profile and enrollment details. `user_id` links an optional student login to its student record.
- `attendance` stores one row per user and attendance date, including check-in and optional check-out timestamps.
- RLS lets students read only their own linked record and attendance. Staff can read/manage student records and view student attendance. Admins have broader access, including staff attendance and student deletion.
- The `manage-staff` Edge Function uses the server-side service role for Auth administration. It authenticates and authorizes staff/admin requests and restricts staff to student login creation and student password resets. Its public `student_signup` action checks the submitted details against an unlinked student record before creating an account.
- The service-role key must remain server-side. Do not commit `.env`; `.gitignore` excludes it. Share student personal data only with authorized personnel.

## Build and deploy

Create a production bundle with:

```sh
npm run build
```

Vite writes the static site to `dist/`. Deploy that directory to a static hosting provider and configure the host to serve `index.html` for client-side routes, so direct navigation to paths such as `/students` works. Add the two `VITE_SUPABASE_*` public values to the host's build environment and rebuild after changing them. Deploy the Supabase schema and `manage-staff` function separately; the frontend build does not deploy backend resources.

For a local production preview, run `npm run preview` after building.

## Troubleshooting

- **Setup needed screen:** confirm both `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set in `.env`, then restart Vite.
- **Cannot reach `manage-staff`:** confirm the Edge Function is deployed with the exact name `manage-staff`, then inspect its Supabase logs.
- **Function authorization errors:** ensure the caller is signed in and has the expected profile role. Staff cannot manage staff/admin accounts.
- **Student activation does not match:** verify email, admission number, and date of birth exactly match the student record, and confirm the record is not already linked to a login.
- **Student cannot see their profile:** verify the Auth account is linked by `students.user_id`; creating an Auth user alone does not link a student record.
- **Student login creation fails:** confirm the student has an email and no existing linked login, and that the Edge Function is available.
- **Unexpected permissions:** verify that `supabase/schema.sql` has been run and that the account's role in `public.profiles` is correct. RLS policies remain authoritative even when a page is accessible.
- **Build or install issues:** use a supported Node.js release, run `npm install`, and check the output of `npm run build`.

## Project structure

```text
student-management1/
├── index.html
├── package.json
├── vite.config.js
├── .env.example
├── src/
│   ├── App.jsx                 # Routes and role gates
│   ├── api.js                  # Edge Function client helper
│   ├── main.jsx                # React entry point
│   ├── styles.css              # Application styles
│   ├── supabaseClient.js       # Browser Supabase client
│   ├── utils.js                # Batch list, dates, and display helpers
│   ├── context/AuthContext.jsx # Session and profile role
│   ├── components/             # Forms, layout, alerts, attendance, and UI
│   └── pages/                  # Login, student, attendance, account, and staff pages
└── supabase/
    ├── schema.sql              # Tables, functions, triggers, and RLS policies
    ├── seed.sql                # Optional fictional student records
    └── functions/
        └── manage-staff/index.ts # Privileged account operations and student activation
```
