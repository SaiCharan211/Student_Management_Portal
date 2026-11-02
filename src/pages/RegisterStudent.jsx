import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient.js';
import { manageStaff } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import Alert from '../components/Alert.jsx';
import Spinner from '../components/Spinner.jsx';
import StudentForm from '../components/StudentForm.jsx';

// One page for both "register" (no id) and "edit" (/students/:id/edit).
export default function RegisterStudent() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { user } = useAuth();
  const navigate = useNavigate();

  const [initial, setInitial] = useState(null);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (!isEdit) return;
    setLoading(true);
    supabase.from('students').select('*').eq('id', id).maybeSingle().then(({ data, error: err }) => {
      if (err) setError('Could not load this student.');
      else if (!data) setError('Student not found.');
      else setInitial({ ...data, address: data.address ?? '', batch: data.batch ?? '' });
      setLoading(false);
    });
  }, [id, isEdit]);

  const handleSubmit = async (v) => {
    setError(''); setSuccess(''); setSaving(true);
    const payload = {
      full_name: v.full_name.trim(),
      admission_no: v.admission_no.trim(),
      email: v.email.trim().toLowerCase(),
      phone: v.phone.trim(),
      date_of_birth: v.date_of_birth,
      gender: v.gender,
      batch: v.batch,
      course: v.course.trim(),
      address: v.address.trim() || null,
      registration_date: v.registration_date,
    };

    if (isEdit) {
      const { error: err } = await supabase.from('students').update(payload).eq('id', id);
      setSaving(false);
      if (err) return setError(err.code === '23505' ? 'This admission number is already registered.' : 'Could not save changes. Please try again.');
      return navigate('/students');
    }

    const { data, error: err } = await supabase
      .from('students').insert({ ...payload, created_by: user.id }).select('id').single();
    if (err) {
      setSaving(false);
      return setError(err.code === '23505' ? 'This admission number is already registered.' : 'Could not save the student. Please try again.');
    }

    let message = `${payload.full_name} was registered.`;
    if (v.login_password) {
      try {
        await manageStaff({ action: 'create_student_login', student_id: data.id, password: v.login_password });
        message += ' A student login was created.';
      } catch (e) {
        setError(`Student saved, but the login could not be created: ${e.message} You can add it later from Student records.`);
      }
    }
    setSaving(false);
    setSuccess(message);
    setFormKey((k) => k + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) return <Spinner />;
  return (
    <section className="card">
      <h1>{isEdit ? 'Edit student' : 'Register student'}</h1>
      <Alert>{error}</Alert>
      <Alert type="success">{success}</Alert>
      {(!isEdit || initial) && (
        <StudentForm key={formKey} initial={initial} onSubmit={handleSubmit} saving={saving}
                     allowLogin={!isEdit} submitLabel={isEdit ? 'Save changes' : 'Save student'} />
      )}
    </section>
  );
}
