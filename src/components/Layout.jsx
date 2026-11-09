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
  const [sidebarHidden, setSidebarHidden] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false); // profile dropdown
  const menuRef = useRef(null);
  const name = profile?.full_name || profile?.email;
  const closeSidebar = () => {
    if (isCompact) setNavOpen(false);
    else setSidebarHidden(true);
  };

  const items = role === 'student'
    ? [{ to: '/me', label: 'My dashboard', icon: 'home' }]
    : [
        { to: '/students', label: 'Student records', icon: 'users' },
        { to: '/register', label: 'Register student', icon: 'userPlus' },
        { to: '/attendance', label: 'Attendance', icon: 'calendar' },
        ...(role === 'admin' ? [{ to: '/staff', label: 'Manage staff', icon: 'shield' }] : []),
      ];

  // Close menus and start each page at the top after navigation.
  useEffect(() => {
    setNavOpen(false);
    setMenuOpen(false);
    window.scrollTo(0, 0);
  }, [pathname]);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 1024px)');
    const update = () => {
      setIsCompact(media.matches);
      if (!media.matches) setNavOpen(false);
    };
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

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
    <div className={`shell${sidebarHidden ? ' sidebar-hidden' : ''}`}>
      <aside id="sidebar" className={`sidebar${navOpen ? ' open' : ''}`} aria-label="Main navigation">
        <div className="sidebar-head">
          <span className="brand"><span className="logo">SM</span><span className="brand-name">Student Management</span></span>
          <button className="icon-btn sidebar-close" onClick={closeSidebar} aria-label="Collapse sidebar">
            <Icon name="sidebarCollapse" />
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
          {(isCompact ? !navOpen : sidebarHidden) && (
            <button
              className="icon-btn menu-btn"
              onClick={() => isCompact ? setNavOpen(true) : setSidebarHidden(false)}
              aria-label={isCompact ? 'Open navigation' : 'Show sidebar'}
              aria-expanded="false"
              aria-controls="sidebar"
            >
              <Icon name="menu" />
            </button>
          )}
          <h2 className="top-title">{titleFor(pathname)}</h2>

          <div className="profile" ref={menuRef}>
            <button className="profile-btn" onClick={() => setMenuOpen((o) => !o)}
                    aria-haspopup="menu" aria-expanded={menuOpen}
                    aria-label={menuOpen ? 'Close profile menu' : 'Open profile menu'}>
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
                  <Avatar name={name} large />
                  <div>
                    <strong>{profile?.full_name || profile?.email || 'Signed in'}</strong>
                    {profile?.full_name && profile?.email && <small>{profile.email}</small>}
                    <span className={`profile-role role-${role}`}>{role}</span>
                  </div>
                </div>
                <p className="menu-section-label">Account</p>
                <Link className="menu-item account-action" role="menuitem" to="/account"><Icon name="key" />Change password</Link>
                <button className="menu-item danger" role="menuitem" onClick={signOut}><Icon name="logout" />Sign out</button>
              </div>
            )}
          </div>
        </header>
        <main className="container"><Outlet /></main>
      </div>
    </div>
  );
}
