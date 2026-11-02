// Supabase Edge Function. Runs on Supabase's servers, so the service-role key never reaches the browser.
//  - Admin:  create staff/admin, change roles, reset any password, remove accounts, create student logins
//  - Staff:  create student logins and reset STUDENT passwords only
//  - Anyone (no login): student_signup, so students can set their own password
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const goodPassword = (p?: string) => typeof p === 'string' && p.length >= 8;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const caller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    });

    const { action, id, email, password, full_name, role, student_id, admission_no, date_of_birth } = await req.json();

    // --- PUBLIC (no login needed): a student sets up their own login ---
    // They must match an existing student record on email + admission number + date of birth.
    if (action === 'student_signup') {
      const generic = 'We could not match those details to a student record, or the account is already set up. Check the details or ask the office.';
      if (!email || !admission_no || !date_of_birth || !goodPassword(password))
        return json({ error: 'Fill in every field. The password needs 8+ characters.' }, 400);
      const mail = String(email).trim().toLowerCase();
      const adm = String(admission_no).trim().toLowerCase();
      const { data: rows } = await admin.from('students')
        .select('id, email, full_name, user_id, admission_no, date_of_birth').eq('email', mail);
      const st = (rows ?? []).find((r) => r.admission_no.trim().toLowerCase() === adm && r.date_of_birth === date_of_birth);
      if (!st || st.user_id) return json({ error: generic }, 400);
      const { data, error } = await admin.auth.admin.createUser({
        email: mail, password, email_confirm: true, user_metadata: { full_name: st.full_name },
      });
      if (error) return json({ error: generic }, 400);
      await admin.from('profiles').upsert({ id: data.user.id, email: mail, full_name: st.full_name, role: 'student' });
      await admin.from('students').update({ user_id: data.user.id }).eq('id', st.id);
      return json({ ok: true });
    }

    // Who is calling?
    const { data: { user } } = await caller.auth.getUser();
    if (!user) return json({ error: 'Not signed in.' }, 401);
    const { data: me } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle();
    const isAdmin = me?.role === 'admin';
    if (!isAdmin && me?.role !== 'staff') return json({ error: 'Not allowed.' }, 403);

    // --- Admin or staff: give a student a login ---
    if (action === 'create_student_login') {
      if (!student_id || !goodPassword(password)) return json({ error: 'A password of 8+ characters is required.' }, 400);
      const { data: st } = await admin.from('students').select('id, email, full_name, user_id').eq('id', student_id).maybeSingle();
      if (!st) return json({ error: 'Student not found.' }, 404);
      if (st.user_id) return json({ error: 'This student already has a login.' }, 400);
      if (!st.email) return json({ error: 'This student has no email address.' }, 400);
      const { data, error } = await admin.auth.admin.createUser({
        email: st.email, password, email_confirm: true, user_metadata: { full_name: st.full_name },
      });
      if (error) return json({ error: error.message }, 400);
      await admin.from('profiles').upsert({ id: data.user.id, email: st.email, full_name: st.full_name, role: 'student' });
      await admin.from('students').update({ user_id: data.user.id }).eq('id', st.id);
      return json({ ok: true });
    }

    if (!id && action !== 'create') return json({ error: 'Missing user id.' }, 400);

    // --- Admin or staff: reset a password (staff: students only) ---
    if (action === 'reset_password') {
      if (!goodPassword(password)) return json({ error: 'Password must be at least 8 characters.' }, 400);
      const { data: target } = await admin.from('profiles').select('role').eq('id', id).maybeSingle();
      if (!target) return json({ error: 'User not found.' }, 404);
      if (!isAdmin && target.role !== 'student') return json({ error: 'Staff can only reset student passwords.' }, 403);
      const { error } = await admin.auth.admin.updateUserById(id, { password });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    // --- Everything below is admin only ---
    if (!isAdmin) return json({ error: 'Only admins can do this.' }, 403);
    const staffRole = (r: string) => r === 'admin' || r === 'staff';

    if (action === 'create') {
      if (!email || !goodPassword(password)) return json({ error: 'Email and a password of 8+ characters are required.' }, 400);
      if (!staffRole(role)) return json({ error: 'Invalid role.' }, 400);
      const { data, error } = await admin.auth.admin.createUser({
        email, password, email_confirm: true, user_metadata: { full_name: full_name || email },
      });
      if (error) return json({ error: error.message }, 400);
      await admin.from('profiles').upsert({ id: data.user.id, email, full_name: full_name || email, role });
      return json({ ok: true });
    }

    if (id === user.id) return json({ error: 'You cannot change or remove your own account here.' }, 400);

    if (action === 'set_role') {
      if (!staffRole(role)) return json({ error: 'Invalid role.' }, 400);
      const { data: target } = await admin.from('profiles').select('role').eq('id', id).maybeSingle();
      if (!target || !staffRole(target.role)) return json({ error: 'Only staff and admin roles can be changed here.' }, 400);
      const { error } = await admin.from('profiles').update({ role }).eq('id', id);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    if (action === 'delete') {
      const { error } = await admin.auth.admin.deleteUser(id);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    return json({ error: 'Unknown action.' }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
