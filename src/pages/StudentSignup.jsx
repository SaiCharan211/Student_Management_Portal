import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { manageStaff } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { homePath, todayLocal } from '../utils.js';
import Alert from '../components/Alert.jsx';
import AuthShell from '../components/AuthShell.jsx';
import Field from '../components/Field.jsx';
import Spinner from '../components/Spinner.jsx';

const EMPTY = { email: '', admission_no: '', date_of_birth: '', password: '', confirm: '' };

// Lets a registered student create their own password when staff didn't set one.
export default function StudentSignup() {
  const { session, role, loading, signIn } = useAuth();
  const [v, setV] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <Spinner />;
  if (session && !submitting) return <Navigate to={homePath(role)} replace />;

  const handleChange = (e) => setV((x) => ({ ...x, [e.target.name]: e.target.value }));
  const f = (name) => ({ name, value: v[name], onChange: handleChange, error: errors[name] });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const found = {};
    if (!/^\S+@\S+\.\S+$/.test(v.email.trim())) found.email = 'Enter the email you gave the office.';
    if (!v.admission_no.trim()) found.admission_no = 'Enter your admission number.';
    if (!v.date_of_birth) found.date_of_birth = 'Select your date of birth.';
    else if (v.date_of_birth > todayLocal()) found.date_of_birth = 'Date of birth cannot be in the future.';
    if (v.password.length < 8) found.password = 'Use at least 8 characters.';
    if (v.confirm !== v.password) found.confirm = 'The two passwords do not match.';
    setErrors(found);
    if (Object.keys(found).length) return;

    setSubmitting(true);
    try {
      await manageStaff({
        action: 'student_signup',
        email: v.email.trim(),
        admission_no: v.admission_no.trim(),
        date_of_birth: v.date_of_birth,
        password: v.password,
      });
      const { error: err } = await signIn(v.email.trim(), v.password);
      if (err) setError('Account created. Please go back and log in.');
    } catch (e2) {
      setError(e2.message);
    }
    setSubmitting(false); // on success the redirect above takes over
  };

  return (
    <AuthShell
      title="Set up your account"
      subtitle="Use the details the office has on file for you."
      footer={<Link to="/login">Already have a password? Log in</Link>}
    >
      <form onSubmit={handleSubmit} noValidate>
        <p className="muted req-note"><span className="req">*</span> Required field</p>
        <Alert>{error}</Alert>
        <Field label="Email" type="email" required autoComplete="email" {...f('email')} />
        <Field label="Admission number" required {...f('admission_no')} />
        <Field label="Date of birth" type="date" required {...f('date_of_birth')} />
        <Field label="Choose a password" type="password" required autoComplete="new-password" {...f('password')} />
        <Field label="Confirm password" type="password" required autoComplete="new-password" {...f('confirm')} />
        <button className="btn btn-block btn-lg" type="submit" disabled={submitting} aria-busy={submitting}>
          {submitting ? 'Creating account…' : 'Create my account'}
        </button>
      </form>
    </AuthShell>
  );
}
