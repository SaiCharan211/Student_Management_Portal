import { useState } from 'react';
import Field from './Field.jsx';
import { BATCHES, todayLocal } from '../utils.js';

const EMPTY = {
  full_name: '', admission_no: '', email: '', phone: '', date_of_birth: '', gender: '',
  batch: '', course: '', address: '', registration_date: todayLocal(), login_password: '',
};

function validate(v) {
  const e = {};
  if (!v.full_name.trim()) e.full_name = 'Enter the student’s full name.';
  if (!v.admission_no.trim()) e.admission_no = 'Enter an admission number.';
  if (!/^\S+@\S+\.\S+$/.test(v.email.trim())) e.email = 'Enter a valid email address.';
  if (!/^[0-9+\-\s()]{7,20}$/.test(v.phone.trim())) e.phone = 'Enter a valid phone number.';
  if (!v.date_of_birth) e.date_of_birth = 'Select a date of birth.';
  else if (v.date_of_birth > todayLocal()) e.date_of_birth = 'Date of birth cannot be in the future.';
  if (!v.gender) e.gender = 'Select a gender.';
  if (!v.batch) e.batch = 'Select a batch.';
  if (!v.course.trim()) e.course = 'Enter a course.';
  if (!v.registration_date) e.registration_date = 'Select a registration date.';
  if (v.login_password && v.login_password.length < 8) e.login_password = 'Use at least 8 characters.';
  return e;
}

export default function StudentForm({ initial, onSubmit, saving, submitLabel = 'Save student', allowLogin = false }) {
  const [values, setValues] = useState({ ...EMPTY, ...initial });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => setValues((v) => ({ ...v, [e.target.name]: e.target.value }));
  const handleSubmit = (e) => {
    e.preventDefault();
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length === 0) onSubmit(values);
  };
  const f = (name) => ({ name, value: values[name] ?? '', onChange: handleChange, error: errors[name] });

  return (
    <form onSubmit={handleSubmit} noValidate>
      <p className="muted req-note"><span className="req">*</span> Required field</p>

      <h2 className="form-section">Student details</h2>
      <div className="grid">
        <Field label="Full name" required {...f('full_name')} />
        <Field label="Admission number" required {...f('admission_no')} />
        <Field label="Email" type="email" required {...f('email')} />
        <Field label="Phone number" type="tel" required {...f('phone')} />
        <Field label="Date of birth" type="date" required {...f('date_of_birth')} />
        <Field label="Gender" as="select" required {...f('gender')}>
          <option value="">Select…</option>
          <option>Male</option><option>Female</option><option>Other</option>
        </Field>
      </div>

      <h2 className="form-section">Course and registration</h2>
      <div className="grid">
        <Field label="Batch" as="select" required {...f('batch')}>
          <option value="">Select batch…</option>
          {BATCHES.map((b) => <option key={b}>{b}</option>)}
        </Field>
        <Field label="Course" required {...f('course')} />
        <Field label="Registration date" type="date" required {...f('registration_date')} />
      </div>
      <Field label="Address" as="textarea" rows={3} {...f('address')} />

      {allowLogin && (
        <>
          <h2 className="form-section">Student login <span className="muted">(optional)</span></h2>
          <div className="grid">
            <Field label="Temporary password" type="password" autoComplete="new-password"
                   hint="Optional. If you leave it empty, the student can create their own password from the login page (“New student? Set up your account”)."
                   {...f('login_password')} />
          </div>
        </>
      )}

      <div className="form-actions">
        <button className="btn btn-lg" type="submit" disabled={saving} aria-busy={saving}>{saving ? 'Saving…' : submitLabel}</button>
      </div>
    </form>
  );
}
