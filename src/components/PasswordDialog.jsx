import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Alert from './Alert.jsx';

// Random 12-character password without look-alike characters
const generate = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  return Array.from(crypto.getRandomValues(new Uint32Array(12)), (n) => chars[n % chars.length]).join('');
};

// Popup that asks for a password and shows clear progress while the server works.
// onSubmit(password) must return a promise; throw an Error to show a message inside the popup.
export default function PasswordDialog({ title, description, confirmLabel, busyLabel, onSubmit, onClose }) {
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !busy) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  const submit = async (e) => {
    e.preventDefault();
    if (password.length < 8) return setError('Use at least 8 characters.');
    setError(''); setBusy(true);
    try {
      await onSubmit(password);
      onClose();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return createPortal(
    <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <form className="modal" role="dialog" aria-modal="true" aria-labelledby="dlg-title" onSubmit={submit} noValidate>
        {busy && <div className="progress" aria-hidden="true"><span /></div>}
        <h2 id="dlg-title">{title}</h2>
        {description && <p className="muted">{description}</p>}
        <Alert>{error}</Alert>
        <div className="field">
          <label htmlFor="dlg-password">Temporary password <span className="req" aria-hidden="true">*</span></label>
          <div className="input-group">
            <input ref={inputRef} id="dlg-password" type={show ? 'text' : 'password'} value={password}
                   autoComplete="new-password" disabled={busy} aria-invalid={Boolean(error)}
                   onChange={(e) => setPassword(e.target.value)} />
            <button type="button" className="btn btn-outline" disabled={busy} onClick={() => setShow((s) => !s)}>
              {show ? 'Hide' : 'Show'}
            </button>
          </div>
          <span className="hint">
            At least 8 characters.{' '}
            <button type="button" className="link-btn" disabled={busy}
                    onClick={() => { setPassword(generate()); setShow(true); }}>Generate one</button>
          </span>
        </div>
        {busy && <p className="busy-note" role="status"><span className="spinner" aria-hidden="true" />{busyLabel} This can take a few seconds…</p>}
        <div className="modal-actions">
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className="btn" disabled={busy} aria-busy={busy}>{busy ? busyLabel : confirmLabel}</button>
        </div>
      </form>
    </div>,
    document.body
  );
}
