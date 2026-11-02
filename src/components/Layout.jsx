import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Avatar from './Avatar.jsx';
import Icon from './Icon.jsx';

const TITLES = {
  '/me': 'My dashboard', '/students': 'Student records', '/register': 'Register student',
  '/attendance': 'Attendance', '/staff': 'Manage staff', '/account': 'Change password',
};
const titleFor = (path) => (path.startsWith('/students/') ? 'Edit student' : TITLES[path] || 'Student Management');

export default function Layout() {
  const { profile, role, signOut } = useAuth();
  const { pathname } = useLocation();
  const [navOpen, setNavOpen] = useState(false);   // sidebar drawer (phones and tablets)
  const [menuOpen, setMenuOpen] = useState(false); // profile dropdown
  const menuRef = useRef(null);
  const name = profile?.full_name || profile?.email;

  const items = role === 'student'
    ? [{ to: '/me', label: 'My dashboard', icon: 'home' }]
    : [
        { to: '/students', label: 'Student records', icon: 'users' },
        { to: '/register', label: 'Register student', icon: 'userPlus' },
        { to: '/attendance', label: 'Attendance', icon: 'calendar' },
        ...(role === 'admin' ? [{ to: '/staff', label: 'Manage staff', icon: 'shield' }] : []),
      ];

  // Close menus when the page changes
  useEffect(() => { setNavOpen(false); setMenuOpen(false); }, [pathname]);

  // Esc closes whatever is open; the page behind a drawer does not scroll
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') { setNavOpen(false); setMenuOpen(false); } };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
  useEffect(() => {
    document.body.style.overflow = navOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [navOpen]);

  // Click outside the profile menu closes it
  useEffect(() => {
    if (!menuOpen) return;
    const close = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('touchstart', close);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('touchstart', close); };
  }, [menuOpen]);

  return (
    <div className="shell">
      <aside id="sidebar" className={navOpen ? 'sidebar open' : 'sidebar'} aria-label="Main navigation">
        <div className="sidebar-head">
          <span className="brand"><span className="logo">SM</span>Student Management</span>
          <button className="icon-btn sidebar-close" onClick={() => setNavOpen(false)} aria-label="Close menu">
            <Icon name="close" />
          </button>
        </div>
        <p className="side-label">Menu</p>
        <nav className="side-nav">
          {items.map((i) => (
            <NavLink key={i.to} to={i.to}><Icon name={i.icon} />{i.label}</NavLink>
          ))}
        </nav>
      </aside>
      {navOpen && <div className="scrim" onClick={() => setNavOpen(false)} aria-hidden="true" />}

      <div className="main-col">
        <header className="topbar">
          <button className="icon-btn menu-btn" onClick={() => setNavOpen(true)}
                  aria-label="Open menu" aria-expanded={navOpen} aria-controls="sidebar">
            <Icon name="menu" />
          </button>
          <h2 className="top-title">{titleFor(pathname)}</h2>

          <div className="profile" ref={menuRef}>
            <button className="profile-btn" onClick={() => setMenuOpen((o) => !o)}
                    aria-haspopup="menu" aria-expanded={menuOpen} aria-label="Open profile menu">
              <Avatar name={name} />
              <span className="profile-text">
                <span className="profile-name">{name}</span>
                <span className={`profile-role role-${role}`}>{role}</span>
              </span>
              <Icon name="chevron" className="icon chev" />
            </button>

            {menuOpen && (
              <div className="menu" role="menu">
                <div className="menu-head">
                  <Avatar name={name} />
                  <div>
                    <strong>{profile?.full_name || 'Signed in'}</strong>
                    <small>{profile?.email}</small>
                    <span className={`profile-role role-${role}`}>{role}</span>
                  </div>
                </div>
                <Link className="menu-item" role="menuitem" to="/account"><Icon name="key" />Change password</Link>
                <button className="menu-item danger" role="menuitem" onClick={signOut}><Icon name="logout" />Log out</button>
              </div>
            )}
          </div>
        </header>
        <main className="container"><Outlet /></main>
      </div>
    </div>
  );
}
