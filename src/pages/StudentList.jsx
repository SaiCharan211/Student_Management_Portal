import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient.js';
import { manageStaff } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { BATCHES } from '../utils.js';
import Alert from '../components/Alert.jsx';
import Avatar from '../components/Avatar.jsx';
import PasswordDialog from '../components/PasswordDialog.jsx';
import Skeleton from '../components/Skeleton.jsx';

export default function StudentList() {
  const { isAdmin } = useAuth();
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [batch, setBatch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dialogFor, setDialogFor] = useState(null); // student whose login/password is being set
  const [working, setWorking] = useState(null);     // { id, label } while the server is busy
  const [flashId, setFlashId] = useState(null);     // row highlighted after success
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const request = ++requestId.current;
    setRefreshing(true);
    setError('');
    let query = supabase
      .from('students')
      .select('id, full_name, admission_no, email, phone, course, batch, user_id')
      .order('created_at', { ascending: false });
    if (batch) query = query.eq('batch', batch);
    const q = search.trim().replace(/[,()%*]/g, '');
    if (q) query = query.or(`full_name.ilike.%${q}%,admission_no.ilike.%${q}%`);
    const { data, error: err } = await query;
    if (request !== requestId.current) return;
    if (err) setError('Could not load students. Please try again.');
    else setStudents(data);
    setLoading(false);
    setRefreshing(false);
  }, [search, batch]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const saveLogin = async (s, password) => {
    const hasLogin = Boolean(s.user_id);
    setError(''); setSuccess('');
    setWorking({ id: s.id, label: hasLogin ? 'Updating…' : 'Creating…' });
    try {
      await manageStaff(hasLogin
        ? { action: 'reset_password', id: s.user_id, password }
        : { action: 'create_student_login', student_id: s.id, password });
    } finally {
      setWorking(null);
    }
    setSuccess(hasLogin ? `Password updated for ${s.full_name}.` : `Login created. ${s.full_name} can now log in with ${s.email}.`);
    setFlashId(s.id);
    setTimeout(() => setFlashId(null), 2500);
    load();
  };

  const handleDelete = async (s) => {
    if (!window.confirm(`Delete ${s.full_name} (${s.admission_no})? This cannot be undone.`)) return;
    setError(''); setSuccess('');
    const { data, error: err } = await supabase.from('students').delete().eq('id', s.id).select();
    if (err || !data?.length) return setError('Could not delete this student. Only admins can delete records.');
    if (s.user_id) { try { await manageStaff({ action: 'delete', id: s.user_id }); } catch { /* login already unlinked */ } }
    setStudents((list) => list.filter((x) => x.id !== s.id));
  };

  return (
    <section className="card">
      <div className="list-head">
        <div>
          <h1>Student records</h1>
          <p className="muted count">{loading ? ' ' : `${students.length} student${students.length === 1 ? '' : 's'}`}</p>
        </div>
        <Link className="btn" to="/register">+ Register student</Link>
      </div>

      <div className="filters">
        <label className="filter-field search-filter">
          Search students
          <input type="search" placeholder="Name or admission number" aria-label="Search students"
                 value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
        <label className="filter-field">
          Batch
          <select value={batch} onChange={(e) => setBatch(e.target.value)} aria-label="Filter by batch">
            <option value="">All batches</option>
            {BATCHES.map((b) => <option key={b}>{b}</option>)}
          </select>
        </label>
        <button className="btn btn-outline student-refresh" onClick={load} disabled={refreshing} aria-busy={refreshing}
                aria-label={refreshing ? 'Refreshing students' : 'Refresh students'}>
          Refresh students
        </button>
      </div>

      <Alert>{error}</Alert>
      <Alert type="success">{success}</Alert>

      {loading ? <Skeleton /> : students.length === 0 ? (
        <p className="muted empty">{search || batch ? 'No students match your filters.' : 'No students yet. Register the first student.'}</p>
      ) : (
        <div className="table-wrap" aria-busy={refreshing}>
          <table className="responsive student-table">
            <thead>
              <tr><th>Name</th><th>Admission no.</th><th>Batch</th><th>Email</th><th>Phone</th><th>Course</th><th>Login</th><th aria-label="Actions" /></tr>
            </thead>
            <tbody>
              {students.map((s) => {
                const busy = working?.id === s.id;
                return (
                  <tr key={s.id} className={`${flashId === s.id ? 'row-flash' : ''} ${busy ? 'row-busy' : ''}`}>
                    <td data-label="Name"><span className="name-cell"><Avatar name={s.full_name} />{s.full_name}</span></td>
                    <td data-label="Admission no.">{s.admission_no}</td>
                    <td data-label="Batch">{s.batch ? <span className="badge">{s.batch}</span> : '—'}</td>
                    <td data-label="Email">{s.email}</td>
                    <td data-label="Phone">{s.phone}</td>
                    <td data-label="Course">{s.course}</td>
                    <td data-label="Login">
                      {busy ? <span className="badge badge-working"><span className="mini-spinner" />{working.label}</span>
                        : s.user_id ? <span className="badge badge-present">Active</span>
                        : <span className="badge badge-absent">None</span>}
                    </td>
                    <td className="actions student-actions">
                      <Link className="btn btn-outline btn-sm" to={`/students/${s.id}/edit`}>Edit</Link>
                      <button className="btn btn-outline btn-sm" disabled={busy} onClick={() => setDialogFor(s)}>
                        {s.user_id ? 'Reset password' : 'Create login'}
                      </button>
                      {isAdmin && <button className="btn btn-danger btn-sm" disabled={busy} onClick={() => handleDelete(s)}>Delete</button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {dialogFor && (
        <PasswordDialog
          title={dialogFor.user_id ? 'Reset password' : 'Create student login'}
          description={dialogFor.user_id
            ? `Set a new password for ${dialogFor.full_name}.`
            : `${dialogFor.full_name} will log in with ${dialogFor.email} and this password.`}
          confirmLabel={dialogFor.user_id ? 'Update password' : 'Create login'}
          busyLabel={dialogFor.user_id ? 'Updating password…' : 'Creating login…'}
          onSubmit={(password) => saveLogin(dialogFor, password)}
          onClose={() => setDialogFor(null)}
        />
      )}
    </section>
  );
}
