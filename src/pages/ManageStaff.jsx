import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient.js';
import { manageStaff } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import Alert from '../components/Alert.jsx';
import Field from '../components/Field.jsx';
import PasswordDialog from '../components/PasswordDialog.jsx';
import Skeleton from '../components/Skeleton.jsx';

const EMPTY = { full_name: '', email: '', password: '', role: 'staff' };

export default function ManageStaff() {
  const { user } = useAuth();
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updatingRoleId, setUpdatingRoleId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [resetFor, setResetFor] = useState(null);

  const load = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('profiles').select('id, full_name, email, role').in('role', ['admin', 'staff']).order('email');
    if (err) setError('Could not load staff.');
    else setPeople(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Runs one action, then shows the result and reloads the list
  const run = async (body, doneMessage) => {
    setBusy(true); setError(''); setSuccess('');
    try {
      await manageStaff(body);
      setSuccess(doneMessage);
      await load();
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleCreate = async (e) => {
    e.preventDefault();
    const found = {};
    if (!form.full_name.trim()) found.full_name = 'Enter a name.';
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) found.email = 'Enter a valid email address.';
    if (form.password.length < 8) found.password = 'Use at least 8 characters.';
    setErrors(found);
    if (Object.keys(found).length) return;
    setCreating(true);
    const ok = await run(
      { action: 'create', ...form, email: form.email.trim().toLowerCase(), full_name: form.full_name.trim() },
      `${form.full_name.trim()} was added as ${form.role}.`
    );
    setCreating(false);
    if (ok) setForm(EMPTY);
  };

  const handleRemove = (p) => {
    if (window.confirm(`Remove ${p.email}? They will no longer be able to log in.`))
      run({ action: 'delete', id: p.id }, `${p.email} was removed.`);
  };

  const handleRoleChange = async (person, role) => {
    setUpdatingRoleId(person.id);
    try {
      await run(
        { action: 'set_role', id: person.id, role },
        `${person.email} is now ${role}.`
      );
    } finally {
      setUpdatingRoleId(null);
    }
  };

  const f = (name) => ({ name, value: form[name], onChange: handleChange, error: errors[name] });

  return (
    <>
      <section className="card section-gap">
        <h1>Add staff member</h1>
        <Alert>{error}</Alert>
        <Alert type="success">{success}</Alert>
        <form onSubmit={handleCreate} noValidate>
          <p className="muted req-note"><span className="req">*</span> Required field</p>
          <div className="grid">
            <Field label="Full name" required {...f('full_name')} />
            <Field label="Email" type="email" required {...f('email')} />
            <Field label="Temporary password" type="password" required autoComplete="new-password" {...f('password')} />
            <Field label="Role" as="select" required {...f('role')}>
              <option value="staff">Staff (add and edit students)</option>
              <option value="admin">Admin (full access)</option>
            </Field>
          </div>
          <button className="btn" type="submit" disabled={busy} aria-busy={creating}>{creating ? 'Working…' : 'Add account'}</button>
        </form>
      </section>

      <section className="card">
        <h1>Staff and admin accounts</h1>
        {loading ? <Skeleton rows={3} /> : (
          <div className="table-wrap">
            <table className="responsive">
              <thead>
                <tr><th>Name</th><th>Email</th><th>Role</th><th aria-label="Actions" /></tr>
              </thead>
              <tbody>
                {people.map((p) => {
                  const isMe = p.id === user.id;
                  return (
                    <tr key={p.id}>
                      <td data-label="Name">{p.full_name} {isMe && <small className="muted">(you)</small>}</td>
                      <td data-label="Email">{p.email}</td>
                      <td data-label="Role">
                        <span className="role-control">
                          <select className="inline-select" value={p.role} disabled={isMe || busy}
                                  aria-label={`Role for ${p.email}`}
                                  onChange={(e) => handleRoleChange(p, e.target.value)}>
                            <option value="staff">Staff</option>
                            <option value="admin">Admin</option>
                          </select>
                          {updatingRoleId === p.id && (
                            <span className="role-saving" role="status">
                              <span className="mini-spinner" aria-hidden="true" />
                              Saving…
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="actions">
                        <button className="btn btn-outline btn-sm" disabled={busy} onClick={() => setResetFor(p)}>
                          Reset password
                        </button>
                        {!isMe && (
                          <button className="btn btn-danger btn-sm" disabled={busy} onClick={() => handleRemove(p)}>
                            Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {resetFor && (
        <PasswordDialog
          title="Reset password"
          description={`Set a new password for ${resetFor.email}.`}
          confirmLabel="Update password"
          busyLabel="Updating password…"
          onSubmit={async (password) => {
            await manageStaff({ action: 'reset_password', id: resetFor.id, password });
            setError('');
            setSuccess(`Password updated for ${resetFor.email}.`);
          }}
          onClose={() => setResetFor(null)}
        />
      )}
    </>
  );
}
