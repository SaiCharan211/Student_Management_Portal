import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient.js';
import { useAuth } from '../context/AuthContext.jsx';
import { fmtDate, fmtTime } from '../utils.js';
import Alert from '../components/Alert.jsx';
import Avatar from '../components/Avatar.jsx';
import CheckInCard from '../components/CheckInCard.jsx';
import Spinner from '../components/Spinner.jsx';

// Students only ever see their own record and their own attendance (enforced by RLS).
export default function StudentDashboard() {
  const { user } = useAuth();
  const [student, setStudent] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      supabase.from('students').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('attendance').select('id, attendance_date, check_in, check_out')
        .eq('user_id', user.id).order('attendance_date', { ascending: false }).limit(30),
    ]).then(([s, a]) => {
      if (s.error || a.error) setError('Could not load your details. Please refresh.');
      setStudent(s.data);
      setHistory(a.data ?? []);
      setLoading(false);
    });
  }, [user.id]);

  if (loading) return <Spinner />;

  const thisMonth = new Date().toLocaleDateString('en-CA').slice(0, 7);
  const monthDays = history.filter((h) => h.attendance_date.startsWith(thisMonth)).length;
  const details = student && [
    ['Admission no.', student.admission_no], ['Batch', student.batch], ['Course', student.course],
    ['Email', student.email], ['Phone', student.phone], ['Date of birth', fmtDate(student.date_of_birth)],
    ['Gender', student.gender], ['Registered on', fmtDate(student.registration_date)], ['Address', student.address],
  ];

  return (
    <>
      <Alert>{error}</Alert>
      <CheckInCard />

      <section className="card section-gap">
        {student ? (
          <>
            <div className="profile-head">
              <Avatar name={student.full_name} large />
              <div className="profile-text"><h1>{student.full_name}</h1><div className="chips">{student.batch && <span className="badge">{student.batch}</span>}<span className="muted">{student.course}</span></div></div>
            </div>
            <dl className="details">
              {details.map(([k, v]) => (
                <div key={k}><dt>{k}</dt><dd>{v || '—'}</dd></div>
              ))}
            </dl>
          </>
        ) : (
          <p className="muted">Your student record is not linked to this login yet. Please contact the office.</p>
        )}
      </section>

      <section className="card">
        <div className="list-head">
          <h1>My attendance</h1>
          <span className="badge badge-present">{monthDays} day{monthDays === 1 ? '' : 's'} present this month</span>
        </div>
        {history.length === 0 ? <p className="muted empty">No attendance yet. Use the Check in button above.</p> : (
          <div className="table-wrap">
            <table className="responsive">
              <thead><tr><th>Date</th><th>Check-in</th><th>Check-out</th></tr></thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id}>
                    <td data-label="Date">{fmtDate(h.attendance_date)}</td>
                    <td data-label="Check-in">{fmtTime(h.check_in)}</td>
                    <td data-label="Check-out">{fmtTime(h.check_out)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
