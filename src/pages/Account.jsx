import { useState } from 'react';
import { supabase } from '../supabaseClient.js';
import Alert from '../components/Alert.jsx';
import Field from '../components/Field.jsx';

export default function Account() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (password.length < 8) return setError('Use at least 8 characters.');
    if (password !== confirm) return setError('The two passwords do not match.');
    setSaving(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (err) return setError('Could not change the password. Please log in again and retry.');
    setSuccess('Password changed.');
    setPassword(''); setConfirm('');
  };

  return (
    <section className="card narrow-form">
      <h1>Change password</h1>
      <Alert>{error}</Alert>
      <Alert type="success">{success}</Alert>
      <form onSubmit={handleSubmit} noValidate>
        <Field label="New password" required name="password" type="password" autoComplete="new-password"
               value={password} onChange={(e) => setPassword(e.target.value)} />
        <Field label="Confirm new password" required name="confirm" type="password" autoComplete="new-password"
               value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        <button className="btn" type="submit" disabled={saving} aria-busy={saving}>{saving ? 'Saving…' : 'Change password'}</button>
      </form>
    </section>
  );
}
