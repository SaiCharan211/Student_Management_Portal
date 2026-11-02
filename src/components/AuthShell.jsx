// Split-screen layout used by both login pages.
export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="auth">
      <aside className="auth-hero">
        <div className="logo logo-lg">SM</div>
        <h2>Student Management</h2>
        <p>Registrations, records and daily attendance, all in one place.</p>
      </aside>
      <main className="auth-panel">
        <div className="auth-box">
          <h1>{title}</h1>
          <p className="muted">{subtitle}</p>
          {children}
          {footer && <p className="switch-link">{footer}</p>}
        </div>
      </main>
    </div>
  );
}
