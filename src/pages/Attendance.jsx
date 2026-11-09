import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient.js';
import { useAuth } from '../context/AuthContext.jsx';
import { BATCHES, fmtTime, todayLocal } from '../utils.js';
import Alert from '../components/Alert.jsx';
import Avatar from '../components/Avatar.jsx';
import CheckInCard from '../components/CheckInCard.jsx';
import Skeleton from '../components/Skeleton.jsx';

export default function Attendance() {
  const { isAdmin } = useAuth();
  const [tab, setTab] = useState('students'); // 'students' | 'staff' (staff tab is admin only)
  const [date, setDate] = useState(todayLocal());
  const [batch, setBatch] = useState('');
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    const isStudents = tab === 'students';
    const [recs, people] = await Promise.all([
      supabase.from('attendance').select('user_id, check_in, check_out').eq('attendance_date', date),
      isStudents
        ? supabase.from('students').select('user_id, full_name, admission_no, batch').not('user_id', 'is', null)
        : supabase.from('profiles').select('id, full_name, email, role').in('role', ['admin', 'staff']),
    ]);
    if (recs.error || people.error) { setError('Could not load attendance.'); setLoading(false); return; }
    const byUser = new Map(recs.data.map((r) => [r.user_id, r]));
    setRows(
      people.data
        .map((p) => {
          const key = isStudents ? p.user_id : p.id;
          return { key, name: p.full_name || '', sub: isStudents ? p.admission_no : p.role, batch: p.batch, rec: byUser.get(key) };
        })
        .sort((a, b) => a.name.localeCompare(b.name))
    );
    setLoading(false);
  }, [tab, date]);

  useEffect(() => { load(); }, [load]);

  const q = search.trim().toLowerCase();
  const shown = rows.filter((r) => (!batch || r.batch === batch) && (!q || r.name.toLowerCase().includes(q)));
  const present = shown.filter((r) => r.rec).length;

  const switchTab = (t) => { setTab(t); setBatch(''); };

  return (
    <>
      <CheckInCard />

      <section className="card">
        <div className="list-head">
          <h1>Attendance</h1>
          {isAdmin && (
            <div className="attendance-view-switch">
              <span className="attendance-view-label">Show attendance for</span>
              <div className="tabs attendance-tabs" role="group" aria-label="Show attendance for">
                <button type="button" aria-pressed={tab === 'students'} className={tab === 'students' ? 'tab active' : 'tab'} onClick={() => switchTab('students')}>Students</button>
                <button type="button" aria-pressed={tab === 'staff'} className={tab === 'staff' ? 'tab active' : 'tab'} onClick={() => switchTab('staff')}>Staff</button>
              </div>
            </div>
          )}
        </div>

        <div className="filters">
          <label className="filter-field">
            Attendance date
            <input type="date" value={date} max={todayLocal()} aria-label="Attendance date"
                   onChange={(e) => setDate(e.target.value || todayLocal())} />
          </label>
          {tab === 'students' && (
            <label className="filter-field">
              Batch
              <select value={batch} onChange={(e) => setBatch(e.target.value)} aria-label="Filter by batch">
                <option value="">All batches</option>
                {BATCHES.map((b) => <option key={b}>{b}</option>)}
              </select>
            </label>
          )}
          <label className="filter-field search-filter">
            Search by name
            <input type="search" placeholder="Enter a name" aria-label="Search by name"
                   value={search} onChange={(e) => setSearch(e.target.value)} />
          </label>
          <button className="btn btn-outline" onClick={load} disabled={loading}>Refresh attendance</button>
        </div>

        <div className="stats">
          <div className="stat"><span>{shown.length}</span>Total</div>
          <div className="stat stat-good"><span>{present}</span>Present</div>
          <div className="stat stat-bad"><span>{shown.length - present}</span>Absent</div>
        </div>

        <Alert>{error}</Alert>
        {loading ? <Skeleton /> : shown.length === 0 ? (
          <p className="muted empty">
            {tab === 'students' ? 'No students with a login match these filters. Create student logins from Student records.' : 'No staff found.'}
          </p>
        ) : (
          <div className="table-wrap">
            <table className="responsive">
              <thead>
                <tr><th>Name</th><th>{tab === 'students' ? 'Admission no.' : 'Role'}</th>{tab === 'students' && <th>Batch</th>}<th>Status</th><th>Check-in</th><th>Check-out</th></tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.key}>
                    <td data-label="Name"><span className="name-cell"><Avatar name={r.name} />{r.name}</span></td>
                    <td data-label={tab === 'students' ? 'Admission no.' : 'Role'}>{r.sub}</td>
                    {tab === 'students' && <td data-label="Batch">{r.batch || '—'}</td>}
                    <td data-label="Status"><span className={`badge ${r.rec ? 'badge-present' : 'badge-absent'}`}>{r.rec ? 'Present' : 'Absent'}</span></td>
                    <td data-label="Check-in">{fmtTime(r.rec?.check_in)}</td>
                    <td data-label="Check-out">{fmtTime(r.rec?.check_out)}</td>
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
