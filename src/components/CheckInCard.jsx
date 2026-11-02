import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient.js';
import { useAuth } from '../context/AuthContext.jsx';
import { fmtTime, todayLocal } from '../utils.js';
import Alert from './Alert.jsx';

// Check in / check out for the person who is logged in (student, staff or admin).
export default function CheckInCard() {
  const { user } = useAuth();
  const [rec, setRec] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('attendance').select('*').eq('user_id', user.id)
      .order('check_in', { ascending: false }).limit(1).maybeSingle();
    setRec(data && data.attendance_date === todayLocal() ? data : null);
    setLoading(false);
  }, [user.id]);

  useEffect(() => { load(); }, [load]);

  const checkIn = async () => {
    setBusy(true); setError('');
    const { error: err } = await supabase.from('attendance').insert({ user_id: user.id });
    if (err) setError(err.code === '23505' ? 'You have already checked in today.' : 'Could not check in. Please try again.');
    await load();
    setBusy(false);
  };

  const checkOut = async () => {
    setBusy(true); setError('');
    const { error: err } = await supabase.from('attendance')
      .update({ check_out: new Date().toISOString() }).eq('id', rec.id);
    if (err) setError('Could not check out. Please try again.');
    await load();
    setBusy(false);
  };

  const state = !rec ? 'out' : rec.check_out ? 'done' : 'in';
  return (
    <section className={`card checkin checkin-${state}`}>
      <div>
        <h2>Today’s attendance</h2>
        {loading ? <p className="muted">Loading…</p> : (
          <p className="checkin-status">
            {state === 'out' && 'You have not checked in yet.'}
            {state === 'in' && <>Checked in at <strong>{fmtTime(rec.check_in)}</strong></>}
            {state === 'done' && <>Checked in <strong>{fmtTime(rec.check_in)}</strong> · out <strong>{fmtTime(rec.check_out)}</strong></>}
          </p>
        )}
        <Alert>{error}</Alert>
      </div>
      {!loading && state === 'out' && <button className="btn btn-lg" onClick={checkIn} disabled={busy} aria-busy={busy}>{busy ? 'Please wait…' : 'Check in'}</button>}
      {!loading && state === 'in' && <button className="btn btn-outline btn-lg" onClick={checkOut} disabled={busy} aria-busy={busy}>{busy ? 'Please wait…' : 'Check out'}</button>}
      {!loading && state === 'done' && <span className="badge badge-present">Done for today</span>}
    </section>
  );
}
