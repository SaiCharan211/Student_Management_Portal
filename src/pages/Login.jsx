import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { supabase } from '../supabaseClient.js';
import { useAuth } from '../context/AuthContext.jsx';
import { homePath } from '../utils.js';
import Alert from '../components/Alert.jsx';
import AuthShell from '../components/AuthShell.jsx';
import Field from '../components/Field.jsx';
import Spinner from '../components/Spinner.jsx';

// <Login /> is for everyone. <Login adminOnly /> only lets admin accounts in.
export default function Login({ adminOnly = false }) {
  const { session, role, loading, signIn, signOut } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <Spinner />;
  // Already logged in? Go to your own home page (this also stops non-admins using the admin page).
  if (session && !submitting) return <Navigate to={homePath(role)} replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) return setError('Enter your email and password.');
    setSubmitting(true);
    const { data, error: err } = await signIn(email.trim(), password);
    if (err) {
      setSubmitting(false);
      return setError('Login failed. Check your email and password.');
    }
    if (adminOnly) {
      const { data: p } = await supabase.from('profiles').select('role').eq('id', data.user.id).maybeSingle();
      if (p?.role !== 'admin') {
        await signOut();
        setSubmitting(false);
        return setError('This account is not an admin. Use the regular login instead.');
      }
    }
    setSubmitting(false); // the redirect above takes over
  };

  return (
    <AuthShell
      title={adminOnly ? 'Admin login' : 'Welcome back'}
      subtitle={adminOnly ? 'For administrators only.' : 'Log in as a student or staff member.'}
      footer={adminOnly
        ? <Link to="/login">Student / staff login</Link>
        : <><Link to="/activate">New student? Set up your account</Link><br /><Link to="/admin-login">Admin login</Link></>}
    >
      <form onSubmit={handleSubmit} noValidate>
        <Alert>{error}</Alert>
        <Field label="Email" name="email" type="email" required autoComplete="email"
               value={email} onChange={(e) => setEmail(e.target.value)} />
        <Field label="Password" name="password" type="password" required autoComplete="current-password"
               value={password} onChange={(e) => setPassword(e.target.value)} />
        <button className="btn btn-block btn-lg" type="submit" disabled={submitting} aria-busy={submitting}>
          {submitting ? 'Signing in…' : adminOnly ? 'Log in as admin' : 'Log in'}
        </button>
      </form>
    </AuthShell>
  );
}
